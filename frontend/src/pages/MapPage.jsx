import { useState, useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { 
  Navigation, AlertTriangle, Users, Play, Pause, 
  Layers, RotateCcw, Activity, ShieldAlert, Wind, Flame, Compass,
  Waves, Mountain, CloudRain, Zap, Globe, BarChart2
} from 'lucide-react';
import { messagesApi, recipientsApi, nasaApi, usgsApi, gdacsApi, emscApi, cycloneApi, firmsApi, ndmaApi, airQualityApi, floodApi, volcanoApi } from '../api';
import { useLanguage } from '../i18n/LanguageContext';
import { ZONE_COORDS, EAPS } from '../constants';

const MAP_SUBTITLE = 'Live WebGL feed: USGS - EMSC - GDACS - NASA EONET - NOAA NHC - NASA FIRMS - GloFAS - NDMA SACHET - Open-Meteo AQI';

const MAP_STYLES = {
  dark: {
    name: 'Dark Command (CARTO)',
    style: {
      version: 8,
      sources: {
        'carto-dark': {
          type: 'raster',
          tiles: ['https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'],
          tileSize: 256,
          attribution: '&copy; OpenStreetMap &copy; CARTO'
        }
      },
      layers: [{
        id: 'carto-dark-layer',
        type: 'raster',
        source: 'carto-dark',
        minzoom: 0,
        maxzoom: 20
      }]
    }
  },
  light: {
    name: 'Voyager Light (CARTO)',
    style: {
      version: 8,
      sources: {
        'carto-voyager': {
          type: 'raster',
          tiles: ['https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'],
          tileSize: 256,
          attribution: '&copy; OpenStreetMap &copy; CARTO'
        }
      },
      layers: [{
        id: 'carto-voyager-layer',
        type: 'raster',
        source: 'carto-voyager',
        minzoom: 0,
        maxzoom: 20
      }]
    }
  },
  satellite: {
    name: 'Satellite Imagery (Esri)',
    style: {
      version: 8,
      sources: {
        'esri-satellite': {
          type: 'raster',
          tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
          tileSize: 256,
          attribution: '&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS'
        }
      },
      layers: [{
        id: 'esri-satellite-layer',
        type: 'raster',
        source: 'esri-satellite',
        minzoom: 0,
        maxzoom: 20
      }]
    }
  }
};

const getZoneCoords = (zoneName) => {
  const ZONE_COORDS_MAP = new Map(Object.entries(ZONE_COORDS));
  if (zoneName && ZONE_COORDS_MAP.has(zoneName)) {
    return ZONE_COORDS_MAP.get(zoneName);
  }
  return [20.5937, 78.9629];
};

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

// ── SVG Icons ──────────────────────────────────────────────────────────────
const SVG_ICONS = {
  uacs: `<svg viewBox="0 0 24 24" width="16" height="16" stroke="#ef4444" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
  quake: `<svg viewBox="0 0 24 24" width="14" height="14" stroke="#f59e0b" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M18.8 4A10 10 0 0 0 2 12h3a7 7 0 0 1 12.8-4ZM5.2 20A10 10 0 0 0 22 12h-3a7 7 0 0 1-13.8 4Z"/><circle cx="12" cy="12" r="2"/></svg>`,
  fire: `<svg viewBox="0 0 24 24" width="14" height="14" stroke="#ff5722" stroke-width="2" fill="#ff5722" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path></svg>`,
  storm: `<svg viewBox="0 0 24 24" width="16" height="16" stroke="#06b6d4" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>`,
  flood: `<svg viewBox="0 0 24 24" width="14" height="14" stroke="#3b82f6" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>`,
  eap: `<svg viewBox="0 0 24 24" width="14" height="14" stroke="#10b981" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>`,
  volcano: `<svg viewBox="0 0 24 24" width="16" height="16" stroke="#f97316" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M2 22h20M7 22l5-12 5 12M12 10a3 3 0 0 1 0-6 3 3 0 0 1 0 6z"/></svg>`,
  ndma: `<svg viewBox="0 0 24 24" width="14" height="14" stroke="#22c55e" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>`
};

export default function MapPage() {
  const { t } = useLanguage();
  const [user] = useState(() => JSON.parse(localStorage.getItem('uacs_user') || '{}'));
  const isAdmin = user.role === 'admin';

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);

  // Base map style
  const [currentBaseStyle, setCurrentBaseStyle] = useState('dark');

  // Live Data states — Core
  const [alerts, setAlerts] = useState([]);
  const [earthquakes, setEarthquakes] = useState([]);
  const [nasaEvents, setNasaEvents] = useState([]);
  const [recipients, setRecipients] = useState([]);
  const [loading, setLoading] = useState(true);

  // Live Data states — New APIs
  const [gdacsEvents, setGdacsEvents] = useState([]);
  const [emscQuakes, setEmscQuakes] = useState([]);
  const [cyclones, setCyclones] = useState([]);
  const [wildfires, setWildfires] = useState([]);
  const [floods, setFloods] = useState([]);
  const [volcanoes, setVolcanoes] = useState([]);
  const [ndmaAlerts, setNdmaAlerts] = useState([]);
  const [userAqi, setUserAqi] = useState(null);

  // Selected Zone view focus
  const [selectedZone, setSelectedZone] = useState(null);

  // Layers Toggles
  const [layers, setLayers] = useState({
    uacsAlerts:   true,
    earthquakes:  true,
    emsc:         false,
    gdacs:        true,
    nasaEonet:    true,
    cyclones:     true,
    wildfires:    true,
    floods:       false,
    volcanoes:    true,
    ndma:         true,
    aqi:          false,
    safetyPoints: true,
  });

  // Timeline scrubber
  const [timeRange, setTimeRange] = useState({ min: Date.now() - 24 * 3600 * 1000, max: Date.now() });
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(1);
  const timerRef = useRef(null);

  // ── Primary data fetch ─────────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [msgRes, recRes, nasaRes, eqRes] = await Promise.all([
          messagesApi.getAll('active'),
          recipientsApi.getAll().catch(() => ({ data: [] })),
          nasaApi.getEvents(45).catch(() => ({ data: { events: [] } })),
          usgsApi.getEarthquakes('day').catch(() => ({ data: { features: [] } }))
        ]);
        setAlerts(msgRes.data || []);
        setNasaEvents(nasaRes.data?.events || []);
        setEarthquakes(eqRes.data?.features || []);
        setRecipients(recRes.data || []);

        const uacsData  = msgRes.data || [];
        const nasaData  = nasaRes.data?.events || [];
        const eqData    = eqRes.data?.features || [];
        const timestamps = [
          ...uacsData.map(a => new Date(a.created_at).getTime()),
          ...nasaData.flatMap(e => (e.geometry || []).map(g => new Date(g.date).getTime())),
          ...eqData.map(f => f.properties.time)
        ].filter(Boolean);

        if (timestamps.length > 0) {
          const minTime = Math.min(...timestamps);
          const maxTime = Math.max(...timestamps);
          setTimeRange({ min: minTime, max: maxTime });
          setCurrentTime(maxTime);
        }
      } catch (err) {
        console.error('Failed to fetch primary disaster map data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // ── External data fetch ────────────────────────────────────
  useEffect(() => {
    const fetchExternal = async () => {
      const results = await Promise.allSettled([
        gdacsApi.getEvents(),
        emscApi.getEarthquakes(),
        cycloneApi.getActiveStorms(),
        firmsApi.getHotspots(20.5937, 78.9629, 3),
        floodApi.getWarnings(),
        volcanoApi.getWeeklyReport(),
        ndmaApi.getAlerts(),
        airQualityApi.getAQI(20.5937, 78.9629),
      ]);

      if (results[0].status === 'fulfilled') setGdacsEvents(results[0].value?.data?.events || []);
      if (results[1].status === 'fulfilled') setEmscQuakes(results[1].value?.data?.earthquakes || []);
      if (results[2].status === 'fulfilled') setCyclones(results[2].value?.data?.storms || []);
      if (results[3].status === 'fulfilled') setWildfires(results[3].value?.data?.hotspots || []);
      if (results[4].status === 'fulfilled') setFloods(results[4].value?.data?.floods || []);
      if (results[5].status === 'fulfilled') setVolcanoes(results[5].value?.data?.volcanoes || []);
      if (results[6].status === 'fulfilled') setNdmaAlerts(results[6].value?.data?.alerts || []);
      if (results[7].status === 'fulfilled') setUserAqi(results[7].value?.data || null);
    };
    fetchExternal();
    const interval = setInterval(fetchExternal, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // ── Timeline Auto-play Loop ────────────────────────────────
  useEffect(() => {
    if (isPlaying) {
      const step = 15 * 60 * 1000 * playSpeed;
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

  // Filter helper functions based on timeline selection
  const filterAlerts = alerts.filter(a => new Date(a.created_at).getTime() <= currentTime);
  const filterEarthquakes = earthquakes.filter(f => f.properties.time <= currentTime);
  const filterNasaEvents = nasaEvents.map(e => {
    const validGeoms = (e.geometry || []).filter(g => new Date(g.date).getTime() <= currentTime);
    if (validGeoms.length === 0) return null;
    return { ...e, geometry: validGeoms };
  }).filter(Boolean);

  // Compute live statistics of affected citizens
  const affectedRecipients = recipients.filter(rec => {
    if (!rec.lat || !rec.lng) return false;
    const inAlertZone = filterAlerts.some(a => {
      const pos = a.lat && a.lng ? [a.lat, a.lng] : getZoneCoords(a.target_zone);
      return getDistance(rec.lat, rec.lng, pos[0], pos[1]) <= 80;
    });
    if (inAlertZone) return true;

    const inQuakeZone = filterEarthquakes.some(eq => {
      const geom = eq.geometry;
      if (!geom || geom.type !== 'Point') return false;
      const [lng, lat] = geom.coordinates;
      const mag = eq.properties.mag || 4;
      return getDistance(rec.lat, rec.lng, lat, lng) <= mag * 25;
    });
    return inQuakeZone;
  });

  // ── Initialize MapLibre GL ────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: MAP_STYLES[currentBaseStyle].style,
      center: [78.9629, 20.5937], // Center of India
      zoom: 4.8,
      pitch: 35, // Premium tilt perspective
      bearing: -5,
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-left');
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [currentBaseStyle]);

  // ── Render Markers and Layers ──────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // Helper to create and push custom HTML marker
    const createMarker = (lat, lng, className, svgIcon, popupHTML) => {
      const el = document.createElement('div');
      el.className = `glow-marker ${className}`;
      el.innerHTML = svgIcon;

      const popup = new maplibregl.Popup({ offset: 15 }).setHTML(popupHTML);
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(map);

      markersRef.current.push(marker);
    };

    // 1. UACS Alerts Layer
    if (layers.uacsAlerts) {
      filterAlerts.forEach(a => {
        const pos = a.lat && a.lng ? [a.lat, a.lng] : getZoneCoords(a.target_zone);
        createMarker(
          pos[0], pos[1],
          'glow-marker-uacs',
          SVG_ICONS.uacs,
          `<div class="p-1">
            <div class="font-black text-red-500 text-xs tracking-wider uppercase mb-1">🚨 UACS DISPATCH</div>
            <div class="font-bold text-white text-sm">${a.title}</div>
            <div class="text-slate-300 mt-1">${a.body}</div>
            <div class="text-slate-400 mt-2 text-[10px]">Zone: ${a.target_zone} · Severity: ${a.urgency}</div>
          </div>`
        );
      });
    }

    // 2. USGS Earthquakes Layer
    if (layers.earthquakes) {
      filterEarthquakes.forEach(eq => {
        const geom = eq.geometry;
        if (!geom || geom.type !== 'Point') return;
        const [lng, lat] = geom.coordinates;
        const mag = eq.properties.mag;
        createMarker(
          lat, lng,
          'glow-marker-quake',
          SVG_ICONS.quake,
          `<div class="p-1">
            <div class="font-black text-amber-500 text-xs tracking-wider uppercase mb-1">🫨 USGS SEISMIC ALERT</div>
            <div class="font-bold text-white text-sm">${eq.properties.place}</div>
            <div class="text-slate-300 mt-1">Magnitude: <strong>${mag}</strong> · Depth: ${eq.properties.depth || '--'} km</div>
            <div class="text-slate-400 mt-1.5 text-[10px]">${new Date(eq.properties.time).toLocaleString()}</div>
          </div>`
        );
      });
    }

    // 3. EMSC Earthquakes Layer
    if (layers.emsc) {
      emscQuakes.forEach(eq => {
        if (!eq.lat || !eq.lng) return;
        createMarker(
          eq.lat, eq.lng,
          'glow-marker-quake',
          SVG_ICONS.quake,
          `<div class="p-1">
            <div class="font-black text-yellow-500 text-xs tracking-wider uppercase mb-1">🔴 EMSC SEISMIC EVENT</div>
            <div class="font-bold text-white text-sm">${eq.place}</div>
            <div class="text-slate-300 mt-1">Magnitude: <strong>${eq.magnitude}</strong> · Depth: ${Math.round(eq.depth || 0)} km</div>
            <div class="text-slate-400 mt-1.5 text-[10px]">${new Date(eq.time).toLocaleString()}</div>
          </div>`
        );
      });
    }

    // 4. GDACS Multi-Hazard Layer
    if (layers.gdacs) {
      gdacsEvents.forEach(ev => {
        if (!ev.lat || !ev.lng) return;
        const typeIcon = SVG_ICONS[ev.type.toLowerCase()] || SVG_ICONS.uacs;
        createMarker(
          ev.lat, ev.lng,
          'glow-marker-volcano',
          typeIcon,
          `<div class="p-1">
            <div class="font-black text-orange-500 text-xs tracking-wider uppercase mb-1">🌐 GDACS - ${ev.typeName}</div>
            <div class="font-bold text-white text-sm">${ev.title}</div>
            <div class="text-slate-300 mt-1">${ev.country || 'Global'}</div>
            <div class="text-slate-400 mt-1 text-[10px]">Alert level: <span class="font-black uppercase">${ev.alertLevel}</span></div>
          </div>`
        );
      });
    }

    // 5. NASA EONET Layer
    if (layers.nasaEonet) {
      filterNasaEvents.forEach(e => {
        const catId = e.categories?.[0]?.id?.toLowerCase() || '';
        const iconType = catId.includes('fire') ? SVG_ICONS.fire : catId.includes('storm') ? SVG_ICONS.storm : SVG_ICONS.flood;
        (e.geometry || []).forEach(g => {
          createMarker(
            g.coordinates[1], g.coordinates[0],
            'glow-marker-fire',
            iconType,
            `<div class="p-1">
              <div class="font-black text-red-400 text-xs tracking-wider uppercase mb-1">🌍 NASA EONET</div>
              <div class="font-bold text-white text-sm">${e.title}</div>
              <div class="text-slate-400 mt-1 text-[10px]">Date: ${new Date(g.date).toLocaleString()}</div>
            </div>`
          );
        });
      });
    }

    // 6. NOAA NHC Cyclones
    if (layers.cyclones) {
      cyclones.forEach(storm => {
        if (!storm.lat || !storm.lng) return;
        createMarker(
          storm.lat, storm.lng,
          'glow-marker-storm',
          SVG_ICONS.storm,
          `<div class="p-1">
            <div class="font-black text-cyan-400 text-xs tracking-wider uppercase mb-1">🌀 NOAA NHC CYCLONE</div>
            <div class="font-bold text-white text-sm">${storm.name}</div>
            <div class="text-slate-300 mt-1">Category ${storm.category || 'Storm'} · Max wind: ${storm.wind} mph</div>
            <div class="text-slate-400 mt-1 text-[10px]">Moving ${storm.movement} at ${storm.speed} mph</div>
          </div>`
        );
      });
    }

    // 7. NASA FIRMS Wildfires
    if (layers.wildfires) {
      wildfires.forEach(h => {
        if (!h.lat || !h.lng) return;
        createMarker(
          h.lat, h.lng,
          'glow-marker-fire',
          SVG_ICONS.fire,
          `<div class="p-1">
            <div class="font-black text-red-500 text-xs tracking-wider uppercase mb-1">🔥 NASA FIRMS WILDFIRE</div>
            <div class="text-slate-300 mt-1">Satellite: ${h.satellite || 'VIIRS'}</div>
            {h.frp && <div class="text-orange-400 font-bold mt-1">Radiative power: ${h.frp} MW</div>}
            <div class="text-slate-400 mt-1 text-[10px]">Date: ${h.acqDate} · Confidence: ${h.confidence}</div>
          </div>`
        );
      });
    }

    // 8. GloFAS Floods
    if (layers.floods) {
      floods.forEach(fl => {
        if (!fl.lat || !fl.lng) return;
        createMarker(
          fl.lat, fl.lng,
          'glow-marker-flood',
          SVG_ICONS.flood,
          `<div class="p-1">
            <div class="font-black text-blue-500 text-xs tracking-wider uppercase mb-1">🌊 GLOFAS FLOOD WARNING</div>
            <div class="font-bold text-white text-sm">${fl.title}</div>
            <div class="text-slate-300 mt-1">${fl.country}</div>
            <div class="text-slate-400 mt-1 text-[10px]">Affected pop: ${Number(fl.affectedPop || 0).toLocaleString()}</div>
          </div>`
        );
      });
    }

    // 9. Smithsonian Volcanoes
    if (layers.volcanoes) {
      volcanoes.forEach(v => {
        const indiaVolcano = [12.278, 93.858]; // Barren Island
        createMarker(
          indiaVolcano[0], indiaVolcano[1],
          'glow-marker-volcano',
          SVG_ICONS.volcano,
          `<div class="p-1">
            <div class="font-black text-orange-500 text-xs tracking-wider uppercase mb-1">🌋 Smithsonian Volcano Report</div>
            <div class="font-bold text-white text-sm">${v.name}</div>
            <div class="text-slate-300 mt-1">Activity: ${v.activity}</div>
            <div class="text-slate-400 mt-1 text-[10px]">Report date: ${new Date(v.date).toLocaleDateString()}</div>
          </div>`
        );
      });
    }

    // 10. NDMA India Alerts
    if (layers.ndma) {
      ndmaAlerts.forEach((alert, i) => {
        const indiaPos = [20.5937 + (i * 0.8 - ndmaAlerts.length * 0.4), 78.9629 + (i % 3 - 1) * 2];
        createMarker(
          indiaPos[0], indiaPos[1],
          'glow-marker-ndma',
          SVG_ICONS.ndma,
          `<div class="p-1">
            <div class="font-black text-green-500 text-xs tracking-wider uppercase mb-1">🇮🇳 NDMA India CAP Alert</div>
            <div class="font-bold text-white text-sm">${alert.title}</div>
            <div class="text-slate-300 mt-1">${alert.summary}</div>
            <div class="text-slate-400 mt-1.5 text-[10px]">Area: ${alert.area} · Severity: ${alert.severity}</div>
          </div>`
        );
      });
    }

    // 11. Safety Evacuation Points (EAP)
    if (layers.safetyPoints) {
      EAPS.forEach(eap => {
        createMarker(
          eap.pos[0], eap.pos[1],
          'glow-marker-eap',
          SVG_ICONS.eap,
          `<div class="p-1">
            <div class="font-black text-emerald-500 text-xs tracking-wider uppercase mb-1">🏥 EVACUATION HAVEN</div>
            <div class="font-bold text-white text-sm">${eap.name}</div>
            <div class="text-slate-300 mt-1">Capacity: ${eap.capacity} beds</div>
            <div class="text-slate-400 mt-1 text-[10px]">Type: ${eap.type}</div>
          </div>`
        );
      });
    }

    // 12. Air Quality Circle (AQI)
    if (layers.aqi && userAqi) {
      const lat = userAqi.lat || 20.5937;
      const lng = userAqi.lng || 78.9629;
      const el = document.createElement('div');
      el.style.cssText = `width:50px;height:50px;border-radius:50%;background:${userAqi.current?.aqi_color || '#888'}22;border:2px dashed ${userAqi.current?.aqi_color || '#888'};display:flex;align-items:center;justify-content:center;`;
      el.innerHTML = `<span style="font-size:10px;font-weight:900;color:${userAqi.current?.aqi_color || '#fff'}">${userAqi.current?.european_aqi}</span>`;

      const popup = new maplibregl.Popup({ offset: 15 }).setHTML(`
        <div class="p-1">
          <div class="font-black text-xs uppercase mb-1" style="color:${userAqi.current?.aqi_color}">💨 Live Air Quality</div>
          <div class="font-bold text-white text-sm">AQI Score: ${userAqi.current?.european_aqi} (${userAqi.current?.aqi_label})</div>
          <div class="text-slate-300 mt-1">PM2.5: ${userAqi.current?.pm2_5} µg/m³ · PM10: ${userAqi.current?.pm10} µg/m³</div>
          <div class="text-slate-400 mt-1.5 text-[10px]">Source: Open-Meteo AQI</div>
        </div>
      `);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(map);

      markersRef.current.push(marker);
    }
  }, [
    layers, filterAlerts, filterEarthquakes, filterNasaEvents,
    emscQuakes, gdacsEvents, cyclones, wildfires, floods, volcanoes, ndmaAlerts, userAqi
  ]);

  // ── Camera Fly-to for selected zone focus ──────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedZone) return;

    const coords = getZoneCoords(selectedZone);
    map.flyTo({
      center: [coords[1], coords[0]],
      zoom: 8.5,
      essential: true,
      duration: 2000
    });
  }, [selectedZone]);

  return (
    <div className="flex flex-col gap-4 animate-fade-in animate-scale-up" style={{ minHeight: '650px' }}>
      
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-1">
        <div>
          <h1 className="text-xl md:text-2xl font-black flex items-center gap-2 md:gap-3">
            <Navigation className="w-5 h-5 md:w-6 md:h-6 text-accent" />
            Interactive WebGL Response Map
          </h1>
          <p className="text-xs md:text-sm text-theme-muted">
            {MAP_SUBTITLE}
          </p>
        </div>
        
        {/* Dynamic Warning Stats Bar */}
        <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl p-3 shadow-lg backdrop-blur-sm self-start md:self-center">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[10px] md:text-xs font-bold text-slate-300">LIVE CRITICAL RESPONSE</span>
          </div>
          <div className="h-4 w-px bg-white/10" />
          <div className="flex items-center gap-1.5">
            <Users className="w-4 h-4 text-accent" />
            <span className="text-xs font-black text-white">
              {affectedRecipients.length}
            </span>
            <span className="text-[10px] text-slate-400">citizens in warning zone</span>
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
            
            <div className="space-y-2">
              {[
                { id: 'uacsAlerts',   label: 'UACS Active Alerts',          color: 'bg-red-500' },
                { id: 'earthquakes',  label: 'USGS Earthquakes',             color: 'bg-amber-500' },
                { id: 'emsc',         label: 'EMSC Earthquakes (EU)',        color: 'bg-yellow-400' },
                { id: 'gdacs',        label: 'GDACS Multi-Hazard (UN)',      color: 'bg-orange-500' },
                { id: 'nasaEonet',    label: 'NASA EONET Events',            color: 'bg-blue-500' },
                { id: 'cyclones',     label: 'NOAA NHC Cyclones',            color: 'bg-cyan-400' },
                { id: 'wildfires',    label: 'NASA FIRMS Wildfires',         color: 'bg-red-400' },
                { id: 'floods',       label: 'GloFAS Flood Warnings',        color: 'bg-blue-400' },
                { id: 'volcanoes',    label: 'Smithsonian Volcanoes',        color: 'bg-orange-400' },
                { id: 'ndma',         label: 'NDMA India Alerts',            color: 'bg-green-500' },
                { id: 'aqi',          label: 'Air Quality (AQI)',             color: 'bg-purple-400' },
                { id: 'safetyPoints', label: 'Evacuation Points (EAPs)',     color: 'bg-emerald-500' },
              ].map(layer => (
                <label key={layer.id} className="flex items-center justify-between cursor-pointer group">
                  <div className="flex items-center gap-2.5 text-xs font-bold text-slate-300 group-hover:text-white transition-colors">
                    <div className={`w-2.5 h-2.5 rounded-full ${layer.color}`} />
                    {layer.label}
                  </div>
                  <input
                    type="checkbox"
                    checked={layers[layer.id]}
                    onChange={() => setLayers(prev => ({ ...prev, [layer.id]: !prev[layer.id] }))}
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
                <span>Camera tilt adds realistic depth grid perspective.</span>
              </div>
              <div className="flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                <span>Timestamps automatically adjusted to local timezone.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Map Container */}
        <div className="lg:col-span-3 rounded-3xl border border-theme-border shadow-2xl overflow-hidden relative" style={{ height: '550px' }}>
          
          {/* Base Layer Switcher */}
          <div className="absolute top-4 right-4 z-[999] bg-slate-900/90 border border-white/10 rounded-xl p-1.5 shadow-xl backdrop-blur-md flex gap-1">
            {Object.entries(MAP_STYLES).map(([key, styleObj]) => (
              <button
                key={key}
                onClick={() => setCurrentBaseStyle(key)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                  currentBaseStyle === key
                    ? 'bg-accent text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {styleObj.name.split(' ')[0]}
              </button>
            ))}
          </div>

          <div ref={mapContainerRef} style={{ height: '100%', width: '100%' }} />
        </div>
      </div>

      {/* Timeline Scrubber */}
      <div className="glass-card p-5 rounded-3xl border-white/5 shadow-2xl flex flex-col md:flex-row items-center gap-4 bg-gradient-to-r from-theme-surface to-accent/5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`w-10 h-10 rounded-full flex items-center justify-center text-white transition-all hover:scale-105 shadow-md ${
              isPlaying ? 'bg-red-600 shadow-red-500/20' : 'bg-accent shadow-accent/20'
            }`}
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
          </button>
          
          <div className="flex items-center bg-white/5 border border-white/10 rounded-xl p-1 shrink-0">
            {[1, 5, 15].map(speed => (
              <button
                key={speed}
                onClick={() => setPlaySpeed(speed)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all ${
                  playSpeed === speed ? 'bg-accent text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              setIsPlaying(false);
              setCurrentTime(timeRange.max);
            }}
            className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:border-white/20 transition-all"
            title="Reset Timeline to Present"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 w-full flex flex-col gap-2">
          <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400 tracking-wider">
            <span>{new Date(timeRange.min).toLocaleString()}</span>
            <span className="text-accent text-xs font-black bg-accent/10 border border-accent/20 px-3 py-1 rounded-full animate-pulse">
              ⏱️ {new Date(currentTime).toLocaleString()}
            </span>
            <span>Present</span>
          </div>
          <input
            type="range"
            min={timeRange.min}
            max={timeRange.max}
            value={currentTime}
            onChange={e => {
              setIsPlaying(false);
              setCurrentTime(Number(e.target.value));
            }}
            className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-accent transition-all focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
}
