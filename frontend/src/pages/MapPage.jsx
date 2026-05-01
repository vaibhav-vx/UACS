import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, LayersControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Map, Navigation, AlertTriangle, Info, Users } from 'lucide-react';
import { messagesApi, recipientsApi, nasaApi } from '../api';
import { useLanguage } from '../i18n/LanguageContext';
import { ZONE_COORDS, EAPS } from '../constants';

const { BaseLayer } = LayersControl;

// Fix Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});


function SetViewOnClick({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (coords) map.setView(coords, 13);
  }, [coords, map]);
  return null;
}

export default function MapPage() {
  const [alerts, setAlerts] = useState([]);
  const [zoneStats, setZoneStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [user] = useState(() => JSON.parse(localStorage.getItem('uacs_user') || '{}'));
  const isAdmin = user.role === 'admin';
  const { t } = useLanguage();
  const [selectedZone, setSelectedZone] = useState(null);
  const [nasaEvents, setNasaEvents] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [msgRes, recRes, nasaRes] = await Promise.all([
          messagesApi.getAll('active'),
          isAdmin ? recipientsApi.getAll() : Promise.resolve({ data: [] }),
          nasaApi.getEvents(45).catch(err => {
            console.error('NASA API Error:', err);
            return { data: { events: [] } };
          })
        ]);
        
        setAlerts(msgRes.data);
        setNasaEvents(nasaRes.data.events || []);
        
        if (isAdmin) {
          const stats = { recipientsList: recRes.data };
          recRes.data.forEach(r => {
            const z = r.zone || 'General';
            stats[z] = (stats[z] || 0) + 1;
          });
          setZoneStats(stats);
        }
      } catch (err) {
        console.error('Failed to fetch map data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [isAdmin]);

  const alertIcon = (urgency) => L.divIcon({
    html: `<div class="map-alert-icon ${urgency}">${urgency === 'critical' ? '🚨' : '⚠️'}</div>`,
    className: 'custom-div-icon',
    iconSize: [30, 30],
  });

  const eapIcon = L.divIcon({
    html: `<div class="map-eap-icon">🏥</div>`,
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
    if (catId.includes('iceberg')) emoji = '🧊';
    if (catId.includes('earthquake')) emoji = '🫨';
    if (catId.includes('snow')) emoji = '❄️';

    return L.divIcon({
      html: `<div class="map-nasa-icon shadow-lg">${emoji}</div>`,
      className: 'custom-div-icon',
      iconSize: [26, 26],
    });
  };

  return (
    <div className="flex flex-col gap-4 animate-fade-in" style={{ height: 'calc(100vh - 120px)', minHeight: '500px' }}>
      <div className="flex items-center justify-between flex-wrap gap-2 px-1">
        <div>
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2 md:gap-3">
            <Navigation className="w-5 h-5 md:w-6 md:h-6 text-accent" />
            {t('interactiveMap') || 'Interactive Situation Map'}
          </h1>
          <p className="text-[10px] md:text-sm text-theme-muted">{t('mapSubtitle') || 'Visualizing active alerts and evacuation points.'}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full bg-theme-hover border border-theme-border">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            LIVE
          </div>
        </div>
      </div>

      <div className="rounded-2xl md:rounded-3xl border border-theme-border shadow-2xl relative map-card-resizable" style={{ height: '500px', minHeight: '300px' }}>
        <MapContainer center={[20.5937, 78.9629]} zoom={5} style={{ height: '100%', width: '100%' }}>
          <LayersControl position="topright">
            <BaseLayer checked name="World Labels (Professional)">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              />
            </BaseLayer>
            
            <BaseLayer name="Standard Map (Street Detail)">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
            </BaseLayer>

            <BaseLayer name="Satellite Imagery (Live Look)">
              <TileLayer
                attribution='&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, GetMapg, Aerogrid, IGN, IGP, UPR-EBP, and the GIS User Community'
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              />
            </BaseLayer>

            <BaseLayer name="Detailed Terrain (Geographic)">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
              />
            </BaseLayer>
          </LayersControl>
          
          <SetViewOnClick coords={selectedZone ? ZONE_COORDS[selectedZone] : null} />

          {/* Active Alerts */}
          {alerts.map(alert => {
            const pos = alert.lat && alert.lng ? [alert.lat, alert.lng] : (ZONE_COORDS[alert.target_zone] || [20.5937, 78.9629]);
            const color = alert.urgency === 'critical' ? '#ef4444' : '#f97316';
            return (
              <div key={alert.id}>
                <Circle 
                  center={pos} 
                  radius={1000} 
                  pathOptions={{ color, fillColor: color, fillOpacity: 0.2, weight: 2 }} 
                />
                <Marker position={pos} icon={alertIcon(alert.urgency)}>
                  <Popup className="custom-popup">
                    <div className="p-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${alert.urgency === 'critical' ? 'bg-red-500 text-white' : 'bg-orange-500 text-white'}`}>
                          {alert.urgency}
                        </span>
                        <h4 className="font-bold text-sm m-0">{alert.title}</h4>
                      </div>
                      <p className="text-xs text-theme-secondary mb-2">{alert.master_content.substring(0, 100)}...</p>
                      <div className="text-[10px] text-theme-muted flex items-center justify-between">
                        <span>Zone: {alert.target_zone || 'All'}</span>
                        <span>{new Date(alert.created_at).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              </div>
            );
          })}

          {/* NASA Disaster Events */}
          {nasaEvents.map(event => {
            const geometry = event.geometry[event.geometry.length - 1]; // Get latest point
            if (!geometry || (geometry.type !== 'Point' && !Array.isArray(geometry.coordinates))) return null;
            // EONET coords are [lng, lat]
            const pos = [geometry.coordinates[1], geometry.coordinates[0]];
            
            return (
              <Marker key={event.id} position={pos} icon={nasaIcon(event.categories)}>
                <Popup className="custom-popup">
                  <div className="p-1">
                    <div className="flex flex-col gap-1 mb-2">
                       <span className="w-fit bg-blue-600 text-white px-1.5 py-0.5 rounded text-[8px] font-black uppercase">NASA EONET ACTIVE</span>
                       <h4 className="font-bold text-xs m-0 leading-tight">{event.title}</h4>
                    </div>
                    <p className="text-[10px] text-theme-secondary mb-2">Type: {event.categories[0]?.title}</p>
                    <div className="text-[9px] text-theme-muted flex items-center justify-between border-t border-theme-border pt-2">
                       <span>{new Date(geometry.date).toLocaleDateString()}</span>
                       <a href={event.sources[0]?.url} target="_blank" rel="noreferrer" className="text-accent hover:underline font-bold">SOURCE API</a>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* EAPs */}
          {EAPS.map((eap, i) => (
            <Marker key={i} position={eap.pos} icon={eapIcon}>
              <Popup>
                <div className="p-1">
                  <h4 className="font-bold text-sm text-accent mb-1">{eap.name}</h4>
                  <p className="text-xs font-medium text-theme-secondary mb-1">Type: {eap.type}</p>
                  <p className="text-[10px] text-theme-muted mb-2">Capacity: {eap.capacity} people</p>
                  <button className="w-full py-1.5 bg-accent text-white text-[10px] font-bold rounded-md flex items-center justify-center gap-1">
                    <Navigation className="w-3 h-3" /> GET DIRECTIONS
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Recipients (Admin only) */}
          {isAdmin && zoneStats.recipientsList?.map((rec, idx) => (
            rec.lat && rec.lng && (
              <Marker key={rec.id || idx} position={[rec.lat, rec.lng]} icon={L.divIcon({
                html: `<div class="map-recipient-icon">👤</div>`,
                className: 'custom-div-icon',
                iconSize: [20, 20]
              })}>
                <Popup>
                  <div className="p-1 text-xs">
                    <div className="font-bold text-accent">{rec.name}</div>
                    <div className="text-theme-muted">{rec.phone}</div>
                    <div className="mt-1 font-medium">Zone: {rec.zone}</div>
                  </div>
                </Popup>
              </Marker>
            )
          ))}

          {/* Admin Stats Overlay on Map (Heatmap markers) */}
          {isAdmin && Object.entries(ZONE_COORDS).map(([name, pos]) => (
            <div key={name}>
              {zoneStats[name] > 0 && (
                 <Marker position={[pos[0] + 0.005, pos[1] + 0.005]} icon={L.divIcon({
                   html: `<div class="zone-count-badge">${zoneStats[name]}</div>`,
                   className: 'custom-div-icon',
                   iconSize: [20, 20]
                 })}>
                   <Popup>
                     <div className="text-xs font-bold">{name}: {zoneStats[name]} Recipients</div>
                   </Popup>
                 </Marker>
              )}
            </div>
          ))}
        </MapContainer>

        {/* Legend / Overlay UI */}
        <div className="absolute bottom-4 left-4 md:bottom-6 md:left-6 z-[1000] flex flex-col gap-2 max-w-[calc(100vw-2rem)]">
          <div className="glass-card p-3 md:p-4 rounded-xl md:rounded-2xl border border-theme-border shadow-xl min-w-[140px] md:min-w-[180px]">
             <h4 className="text-[10px] md:text-xs font-bold mb-2 md:mb-3 border-b border-theme-border pb-2 uppercase tracking-wider">Map Legend</h4>
             <div className="space-y-1.5 md:space-y-2">
                <div className="flex items-center gap-2 text-[10px] md:text-xs">
                  <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-red-500" />
                  <span>Critical Alert</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] md:text-xs">
                  <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-orange-500" />
                  <span>High Alert</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] md:text-xs">
                  <span className="text-xs md:text-base">🏥</span>
                  <span>Safety Point</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] md:text-xs">
                  <span className="text-xs md:text-base">🌍</span>
                  <span>NASA Global Event</span>
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-2 text-[10px] md:text-xs">
                    <div className="w-3 h-3 md:w-4 md:h-4 rounded bg-accent text-white text-[8px] md:text-[10px] flex items-center justify-center font-bold">12</div>
                    <span>Heatmap</span>
                  </div>
                )}
             </div>
          </div>
        </div>

      </div>

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
        .zone-count-badge {
          background: var(--accent);
          color: white;
          font-size: 10px;
          font-weight: 800;
          border-radius: 50%;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        .map-recipient-icon {
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
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
          border-radius: 12px;
          padding: 0;
          overflow: hidden;
        }
        .custom-popup .leaflet-popup-content {
          margin: 8px;
          width: 200px !important;
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        .animate-pulse-slow {
          animation: pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}
