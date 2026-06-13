import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, LayersControl, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  Navigation, AlertTriangle, Info, Users, Play, Pause, 
  Layers, RotateCcw, Activity, ShieldAlert, Wind, Flame, Compass
} from 'lucide-react';
import { messagesApi, recipientsApi, nasaApi, usgsApi } from '../api';
import { useLanguage } from '../i18n/LanguageContext';
import { ZONE_COORDS, EAPS } from '../constants';
import ShockwaveCircle from '../components/ShockwaveCircle';

const { BaseLayer } = LayersControl;

// Fix Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const ZONE_COORDS_MAP = new Map(Object.entries(ZONE_COORDS));
const getZoneCoords = (zoneName) => {
  if (zoneName && ZONE_COORDS_MAP.has(zoneName)) {
    return ZONE_COORDS_MAP.get(zoneName);
  }
  return ZONE_COORDS_MAP.get('General') || [20.5937, 78.9629];
};

const getLayerValue = (layersObj, key) => {
  if (key === 'uacsAlerts') return layersObj.uacsAlerts;
  if (key === 'earthquakes') return layersObj.earthquakes;
  if (key === 'nasaEonet') return layersObj.nasaEonet;
  if (key === 'safetyPoints') return layersObj.safetyPoints;
  if (key === 'trajectories') return layersObj.trajectories;
  if (key === 'heatmap') return layersObj.heatmap;
  return false;
};

const toggleLayerValue = (layersObj, key) => {
  return {
    uacsAlerts: key === 'uacsAlerts' ? !layersObj.uacsAlerts : layersObj.uacsAlerts,
    earthquakes: key === 'earthquakes' ? !layersObj.earthquakes : layersObj.earthquakes,
    nasaEonet: key === 'nasaEonet' ? !layersObj.nasaEonet : layersObj.nasaEonet,
    safetyPoints: key === 'safetyPoints' ? !layersObj.safetyPoints : layersObj.safetyPoints,
    trajectories: key === 'trajectories' ? !layersObj.trajectories : layersObj.trajectories,
    heatmap: key === 'heatmap' ? !layersObj.heatmap : layersObj.heatmap,
  };
};

const MAP_SUBTITLE = 'Live feeds from USGS, NASA EONET, and local UACS emergency dispatches.';
const LIVE_CRITICAL_RESPONSE = 'LIVE CRITICAL RESPONSE';
const CITIZENS_WARNING = 'citizens in warning zone';
const SHOCKWAVE_NOTICE = 'Radius shows estimated shock/wave propagation.';
const TIMEZONE_NOTICE = 'Timestamps auto-adjusted to local timezone.';
const SAFETY_HAVEN = 'Safety Evacuation Haven';
const LABEL_CAPACITY = 'Capacity: ';
const LABEL_TYPE = 'Type: ';
const UACS_DISPATCH = 'UACS DISPATCH';
const LABEL_ZONE = 'Zone: ';
const USGS_ALERT = 'USGS SEISMIC ALERT';
const LABEL_MAGNITUDE = 'Magnitude: ';
const LABEL_DEPTH = 'Depth: ';
const USGS_SOURCE = 'USGS SOURCE';
const NASA_DATA = 'NASA OBSERVATORY DATA';
const LABEL_CATEGORY = 'Category: ';
const NASA_EONET = 'NASA EONET';

// Haversine formula to compute distance in km
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function SetViewOnClick({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (coords) map.setView(coords, 10);
  }, [coords, map]);
  return null;
}

export default function MapPage() {
  const { t } = useLanguage();
  const [user] = useState(() => JSON.parse(localStorage.getItem('uacs_user') || '{}'));
  const isAdmin = user.role === 'admin';

  // Live Data states
  const [alerts, setAlerts] = useState([]);
  const [earthquakes, setEarthquakes] = useState([]);
  const [nasaEvents, setNasaEvents] = useState([]);
  const [recipients, setRecipients] = useState([]);
  const [loading, setLoading] = useState(true);

  // Selected Zone view focus
  const [selectedZone, setSelectedZone] = useState(null);

  // Layers Toggles
  const [layers, setLayers] = useState({
    uacsAlerts: true,
    earthquakes: true,
    nasaEonet: true,
    safetyPoints: true,
    trajectories: true,
    heatmap: false,
  });

  // Timeline Scrubber states
  const [timeRange, setTimeRange] = useState({ min: Date.now() - 24 * 3600 * 1000, max: Date.now() });
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(1); // 1x, 5x, 15x
  const timerRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [msgRes, recRes, nasaRes, eqRes] = await Promise.all([
          messagesApi.getAll('active'),
          recipientsApi.getAll().catch(() => ({ data: [] })),
          nasaApi.getEvents(45).catch(() => ({ data: { events: [] } })),
          usgsApi.getEarthquakes('day').catch(() => ({ data: { features: [] } }))
        ]);

        const uacsData = msgRes.data || [];
        const nasaData = nasaRes.data.events || [];
        const eqData = eqRes.data.features || [];
        const recData = recRes.data || [];

        setAlerts(uacsData);
        setNasaEvents(nasaData);
        setEarthquakes(eqData);
        setRecipients(recData);

        // Compute timeframe bounds based on all events
        const timestamps = [
          ...uacsData.map(a => new Date(a.created_at).getTime()),
          ...nasaData.flatMap(e => e.geometry.map(g => new Date(g.date).getTime())),
          ...eqData.map(f => f.properties.time)
        ];

        if (timestamps.length > 0) {
          const minTime = Math.min(...timestamps);
          const maxTime = Math.max(...timestamps);
          setTimeRange({ min: minTime, max: maxTime });
          setCurrentTime(maxTime);
        }
      } catch (err) {
        console.error('Failed to fetch disaster map data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Timeline Auto-play Loop
  useEffect(() => {
    if (isPlaying) {
      const step = 15 * 60 * 1000 * playSpeed; // 15 minutes step dependent on speed
      timerRef.current = setInterval(() => {
        setCurrentTime(prev => {
          if (prev >= timeRange.max) {
            setIsPlaying(false);
            return timeRange.max;
          }
          return Math.min(prev + step, timeRange.max);
        });
      }, 200);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, playSpeed, timeRange.max]);

  // Filter helper functions based on scrubber timeline selection
  const filterAlerts = alerts.filter(a => new Date(a.created_at).getTime() <= currentTime);
  
  const filterEarthquakes = earthquakes.filter(f => f.properties.time <= currentTime);

  const filterNasaEvents = nasaEvents.map(e => {
    // Only keep geometries up to the currentTime
    const validGeoms = e.geometry.filter(g => new Date(g.date).getTime() <= currentTime);
    if (validGeoms.length === 0) return null;
    return { ...e, geometry: validGeoms };
  }).filter(Boolean);

  // Compute live statistics of affected citizens
  // Sum up all recipients who fall within 80km of an active alert or earthquake epicenter
  const affectedRecipients = recipients.filter(rec => {
    if (!rec.lat || !rec.lng) return false;

    // Check UACS Alerts
    const inAlertZone = filterAlerts.some(a => {
      const pos = a.lat && a.lng ? [a.lat, a.lng] : getZoneCoords(a.target_zone);
      if (!pos) return false;
      const distance = getDistance(rec.lat, rec.lng, pos[0], pos[1]);
      return distance <= 80; // 80 km alert radius
    });

    if (inAlertZone) return true;

    // Check Earthquake Epicenters
    const inQuakeZone = filterEarthquakes.some(eq => {
      const geom = eq.geometry;
      if (!geom || geom.type !== 'Point') return false;
      const [lng, lat] = geom.coordinates;
      const mag = eq.properties.mag || 4;
      const distance = getDistance(rec.lat, rec.lng, lat, lng);
      return distance <= mag * 25; // radius proportional to magnitude
    });

    return inQuakeZone;
  });

  // Unique marker creators
  const alertIcon = (urgency) => {
    const el = document.createElement('div');
    el.className = `map-alert-icon ${urgency}`;
    el.textContent = urgency === 'critical' ? '🚨' : '⚠️';
    return L.divIcon({
      html: el,
      className: 'custom-div-icon',
      iconSize: [30, 30],
    });
  };

  const earthquakeIcon = (mag) => {
    let colorClass = 'bg-yellow-500';
    if (mag >= 5.0) colorClass = 'bg-orange-500 animate-pulse';
    if (mag >= 6.5) colorClass = 'bg-red-600 animate-ping';

    const el = document.createElement('div');
    el.className = `w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-black text-white shadow-lg ${colorClass}`;
    el.textContent = '🫨';

    return L.divIcon({
      html: el,
      className: 'custom-div-icon',
      iconSize: [24, 24],
    });
  };

  const eapIcon = L.divIcon({
    html: (() => {
      const el = document.createElement('div');
      el.className = 'map-eap-icon';
      el.textContent = '🏥';
      return el;
    })(),
    className: 'custom-div-icon',
    iconSize: [24, 24],
  });

  const nasaIcon = (categories) => {
    const catId = categories[0]?.id?.toLowerCase() || '';
    let emoji = '🌍';
    if (catId.includes('fire')) emoji = '🔥';
    if (catId.includes('storm')) emoji = '🌪️';
    if (catId.includes('flood')) emoji = '🌊';
    if (catId.includes('volcano')) emoji = '🌋';

    const el = document.createElement('div');
    el.className = 'map-nasa-icon shadow-lg';
    el.textContent = emoji;

    return L.divIcon({
      html: el,
      className: 'custom-div-icon',
      iconSize: [26, 26],
    });
  };

  return (
    <div className="flex flex-col gap-4 animate-fade-in" style={{ minHeight: '650px' }}>
      
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-1">
        <div>
          <h1 className="text-xl md:text-2xl font-black flex items-center gap-2 md:gap-3">
            <Navigation className="w-5 h-5 md:w-6 md:h-6 text-accent animate-bounce-slow" />
            Interactive Disaster Response Map
          </h1>
          <p className="text-xs md:text-sm text-theme-muted">
            {MAP_SUBTITLE}
          </p>
        </div>
        
        {/* Dynamic Warning Stats Bar */}
        <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl p-3 shadow-lg backdrop-blur-sm self-start md:self-center">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[10px] md:text-xs font-bold text-slate-300">{LIVE_CRITICAL_RESPONSE}</span>
          </div>
          <div className="h-4 w-px bg-white/10" />
          <div className="flex items-center gap-1.5">
            <Users className="w-4 h-4 text-accent" />
            <span className="text-xs font-black text-white">
              {affectedRecipients.length}
            </span>
            <span className="text-[10px] text-slate-400">{CITIZENS_WARNING}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-stretch">
        
        {/* Sidebar Controls - Layers & Focus */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          
          {/* Layer Control Card */}
          <div className="glass-card p-4 flex flex-col gap-3 rounded-2xl border-white/5 shadow-xl">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2 mb-1">
              <Layers className="w-4 h-4 text-accent" /> Active Layers
            </h3>
            
            <div className="space-y-3">
              {[
                { id: 'uacsAlerts', label: 'UACS Active Alerts', color: 'bg-red-500' },
                { id: 'earthquakes', label: 'USGS Live Earthquakes', color: 'bg-amber-500' },
                { id: 'nasaEonet', label: 'NASA Wildfires & Storms', color: 'bg-blue-500' },
                { id: 'safetyPoints', label: 'Evacuation Points (EAPs)', color: 'bg-emerald-500' },
                { id: 'trajectories', label: 'Storm Trajectory Paths', color: 'bg-purple-500' },
                { id: 'heatmap', label: 'Risk Heatmap Overlay', color: 'bg-pink-500' },
              ].map(layer => (
                <label key={layer.id} className="flex items-center justify-between cursor-pointer group">
                  <div className="flex items-center gap-2.5 text-xs font-bold text-slate-300 group-hover:text-white transition-colors">
                    <div className={`w-2.5 h-2.5 rounded-full ${layer.color}`} />
                    {layer.label}
                  </div>
                  <input
                    type="checkbox"
                    checked={getLayerValue(layers, layer.id)}
                    onChange={() => setLayers(prev => toggleLayerValue(prev, layer.id))}
                    className="w-4 h-4 rounded accent-accent cursor-pointer"
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Quick Zone Focus Card */}
          <div className="glass-card p-4 rounded-2xl border-white/5 shadow-xl flex-1 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2 mb-3">
                <Compass className="w-4 h-4 text-accent" /> Zone Quick-Focus
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {Object.keys(ZONE_COORDS).slice(0, 6).map(name => (
                  <button
                    key={name}
                    onClick={() => setSelectedZone(selectedZone === name ? null : name)}
                    className={`px-2 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider text-center border transition-all ${
                      selectedZone === name
                        ? 'bg-accent text-white border-accent shadow-md shadow-accent/25'
                        : 'bg-white/5 border-white/10 hover:border-accent text-slate-300'
                    }`}
                  >
                    {name.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-white/5 text-[10px] text-theme-muted space-y-2">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
                <span>{SHOCKWAVE_NOTICE}</span>
              </div>
              <div className="flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                <span>{TIMEZONE_NOTICE}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Map Container */}
        <div className="lg:col-span-3 rounded-3xl border border-theme-border shadow-2xl overflow-hidden relative" style={{ height: '550px' }}>
          <MapContainer center={[20.5937, 78.9629]} zoom={5} style={{ height: '100%', width: '100%', zIndex: 1 }}>
            
            <LayersControl position="topright">
              <BaseLayer checked name="World Voyager (Clean Dark)">
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                  url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png"
                />
              </BaseLayer>
              <BaseLayer name="Satellite Imagery (Live Terrain)">
                <TileLayer
                  attribution='&copy; Esri &mdash; Community Maps'
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                />
              </BaseLayer>
            </LayersControl>

            <SetViewOnClick coords={selectedZone ? getZoneCoords(selectedZone) : null} />

            {/* Heatmap Risk Overlays */}
            {layers.heatmap && (
              <>
                {/* Aggregate UACS and Earthquakes to show Risk Overlay */}
                {filterAlerts.map((a, i) => (
                  <Circle
                    key={`hm-a-${i}`}
                    center={a.lat && a.lng ? [a.lat, a.lng] : getZoneCoords(a.target_zone)}
                    radius={120000}
                    pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.08, weight: 0 }}
                  />
                ))}
                {filterEarthquakes.map((eq, i) => {
                  const [lng, lat] = eq.geometry.coordinates;
                  return (
                    <Circle
                      key={`hm-eq-${i}`}
                      center={[lat, lng]}
                      radius={180000}
                      pathOptions={{ color: '#f59e0b', fillColor: '#f59e0b', fillOpacity: 0.08, weight: 0 }}
                    />
                  );
                })}
              </>
            )}

            {/* Evacuation points */}
            {layers.safetyPoints && EAPS.map((eap, i) => (
              <Marker key={`eap-${i}`} position={eap.pos} icon={eapIcon}>
                <Popup>
                  <div className="p-1 text-xs">
                    <h4 className="font-bold text-sm text-accent mb-1">{eap.name}</h4>
                    <p className="font-semibold text-slate-200">{SAFETY_HAVEN}</p>
                    <div className="mt-1.5 space-y-1 text-[11px] text-slate-400">
                      <div>{LABEL_CAPACITY}{eap.capacity} beds</div>
                      <div>{LABEL_TYPE}{eap.type}</div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* UACS Live emergency dispatches & animated shockwave propagation */}
            {layers.uacsAlerts && filterAlerts.map(alert => {
              const pos = alert.lat && alert.lng ? [alert.lat, alert.lng] : getZoneCoords(alert.target_zone);
              if (!pos) return null;
              const color = alert.urgency === 'critical' ? '#ef4444' : '#f97316';
              return (
                <div key={`uacs-${alert.id}`}>
                  {/* Animated propagating shockwaves */}
                  <ShockwaveCircle center={pos} color={color} maxRadius={alert.urgency === 'critical' ? 220000 : 120000} />
                  <Marker position={pos} icon={alertIcon(alert.urgency)}>
                    <Popup className="custom-popup">
                      <div className="p-1 text-xs">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <span className="bg-red-500/20 text-red-400 px-2 py-0.5 rounded text-[8px] font-black uppercase">{UACS_DISPATCH}</span>
                          <h4 className="font-black text-white m-0 text-xs truncate max-w-[120px]">{alert.title}</h4>
                        </div>
                        <p className="text-[11px] text-slate-300 leading-relaxed mb-2">{alert.master_content}</p>
                        <div className="flex items-center justify-between text-[9px] text-slate-400 border-t border-white/5 pt-1.5">
                          <span>{LABEL_ZONE}{alert.target_zone}</span>
                          <span>{new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                </div>
              );
            })}

            {/* USGS Live Earthquakes */}
            {layers.earthquakes && filterEarthquakes.map(eq => {
              const geom = eq.geometry;
              if (!geom || geom.type !== 'Point') return null;
              const [lng, lat] = geom.coordinates;
              const mag = eq.properties.mag || 4.0;
              const color = mag >= 6.0 ? '#dc2626' : mag >= 5.0 ? '#f97316' : '#eab308';
              return (
                <div key={`eq-${eq.id}`}>
                  {/* Propagating seismic rings */}
                  <ShockwaveCircle center={[lat, lng]} color={color} maxRadius={mag * 40000} duration={3500} />
                  <Marker position={[lat, lng]} icon={earthquakeIcon(mag)}>
                    <Popup className="custom-popup">
                      <div className="p-1 text-xs">
                        <div className="flex flex-col gap-0.5 mb-1.5">
                          <span className="text-amber-400 text-[8px] font-black uppercase">{USGS_ALERT}</span>
                          <h4 className="font-black text-white text-xs m-0">{eq.properties.place}</h4>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-300 my-2">
                          <div className="bg-white/5 p-1 rounded">{LABEL_MAGNITUDE}<strong>{mag} M</strong></div>
                          <div className="bg-white/5 p-1 rounded">{LABEL_DEPTH}<strong>{geom.coordinates.at(2)} km</strong></div>
                        </div>
                        <div className="flex items-center justify-between text-[9px] text-slate-400 border-t border-white/5 pt-1.5">
                          <span>{new Date(eq.properties.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          <a href={eq.properties.url} target="_blank" rel="noreferrer" className="text-accent font-bold hover:underline">{USGS_SOURCE}</a>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                </div>
              );
            })}

            {/* NASA EONET Disasters with trajectories */}
            {layers.nasaEonet && filterNasaEvents.map(event => {
              const geoms = event.geometry;
              if (geoms.length === 0) return null;
              const latestGeom = geoms.at(-1);
              const pos = [latestGeom.coordinates.at(1), latestGeom.coordinates.at(0)];

              // Draw path trajectory
              const pathCoords = layers.trajectories && geoms.length > 1
                ? geoms.map(g => [g.coordinates.at(1), g.coordinates.at(0)])
                : null;

              return (
                <div key={`nasa-${event.id}`}>
                  {pathCoords && (
                    <Polyline 
                      positions={pathCoords} 
                      pathOptions={{ color: '#8b5cf6', weight: 2.5, dashArray: '5, 5', opacity: 0.8 }} 
                    />
                  )}
                  <Marker position={pos} icon={nasaIcon(event.categories)}>
                    <Popup className="custom-popup">
                      <div className="p-1 text-xs">
                        <div className="flex flex-col gap-0.5 mb-1.5">
                          <span className="text-blue-400 text-[8px] font-black uppercase">{NASA_DATA}</span>
                          <h4 className="font-black text-white text-xs m-0 leading-tight">{event.title}</h4>
                        </div>
                        <p className="text-[10px] text-slate-300 mt-1 mb-2">{LABEL_CATEGORY}{event.categories.at(0)?.title || 'Natural Event'}</p>
                        {geoms.length > 1 && (
                          <div className="text-[9px] text-purple-300 font-semibold mb-1">
                            ⚠️ Trajectory: {geoms.length} tracking coordinates mapped
                          </div>
                        )}
                        <div className="flex items-center justify-between text-[9px] text-slate-400 border-t border-white/5 pt-1.5">
                          <span>{new Date(latestGeom.date).toLocaleDateString()}</span>
                          <a href={event.sources.at(0)?.url} target="_blank" rel="noreferrer" className="text-accent font-bold hover:underline font-semibold">{NASA_EONET}</a>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                </div>
              );
            })}
          </MapContainer>

          {/* Timeline Playback Overlay */}
          <div className="absolute bottom-4 left-4 right-4 z-[999] glass-card p-3 rounded-2xl border-white/5 shadow-2xl flex flex-col md:flex-row items-center gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-10 h-10 rounded-full bg-accent hover:bg-accent-hover text-white flex items-center justify-center transition-all cursor-pointer shadow-lg shadow-accent/20"
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white translate-x-0.5" />}
              </button>
              
              <button
                onClick={() => { setCurrentTime(timeRange.min); setIsPlaying(false); }}
                title="Reset Timeline"
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 flex items-center justify-center transition-all cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Time Slider */}
            <div className="flex-1 w-full flex flex-col gap-1">
              <input
                type="range"
                min={timeRange.min}
                max={timeRange.max}
                value={currentTime}
                onChange={e => { setCurrentTime(Number(e.target.value)); setIsPlaying(false); }}
                className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-accent"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider px-1 mt-0.5">
                <span>{new Date(timeRange.min).toLocaleDateString()}</span>
                <span className="text-white bg-accent/25 px-2.5 py-0.5 rounded-full border border-accent/20 font-black">
                  {new Date(currentTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                </span>
                <span>{new Date(timeRange.max).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Playback speed selector */}
            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
              {[1, 5, 15].map(speed => (
                <button
                  key={speed}
                  onClick={() => setPlaySpeed(speed)}
                  className={`px-2 py-1 rounded-lg text-[9px] font-black transition-all ${
                    playSpeed === speed
                      ? 'bg-accent text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Embedded Map styles */}
      <style>{`
        .map-alert-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          filter: drop-shadow(0 0 4px rgba(0,0,0,0.3));
          animation: bounce 2s infinite;
        }
        .map-alert-icon.critical {
          background: #ef4444;
          border-radius: 50%;
          width: 30px;
          height: 30px;
          border: 2px solid white;
        }
        .map-eap-icon {
          background: white;
          border-radius: 6px;
          padding: 2px;
          border: 2px solid var(--accent);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .map-nasa-icon {
          background: #1e3a8a;
          border-radius: 50%;
          width: 26px;
          height: 26px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid #60a5fa;
          font-size: 14px;
          box-shadow: 0 0 15px rgba(37, 99, 235, 0.4);
          animation: pulse-nasa 3s infinite;
        }
        @keyframes pulse-nasa {
          0%, 100% { transform: scale(1); box-shadow: 0 0 15px rgba(37, 99, 235, 0.4); }
          50% { transform: scale(1.1); box-shadow: 0 0 25px rgba(37, 99, 235, 0.6); }
        }
        .custom-popup .leaflet-popup-content-wrapper {
          border-radius: 16px;
          background: rgba(15, 23, 42, 0.95);
          backdrop-blur: 8px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: white;
          padding: 0;
          overflow: hidden;
        }
        .custom-popup .leaflet-popup-content {
          margin: 12px;
          width: 220px !important;
        }
        .custom-popup .leaflet-popup-tip {
          background: rgba(15, 23, 42, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        .animate-bounce-slow {
          animation: bounce 3s infinite;
        }
      `}</style>
    </div>
  );
}
