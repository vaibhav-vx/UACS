import { useState, useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Maximize2, Minimize2, Map as MapIcon, Layers, X, Send, AlertTriangle, RefreshCw } from 'lucide-react';
import { messagesApi, nasaApi, recipientsApi, gdacsApi } from '../api';
import toast from 'react-hot-toast';
import { ZONE_COORDS } from '../constants';

const ZONE_COORDS_MAP = new Map(Object.entries(ZONE_COORDS));
const getZoneCoords = (zoneName) => {
  if (zoneName && ZONE_COORDS_MAP.has(zoneName)) {
    return ZONE_COORDS_MAP.get(zoneName);
  }
  return [20.5937, 78.9629];
};

const getMapSizeClass = (size) => {
  if (size === 'small') return 'map-card-small';
  if (size === 'large') return 'map-card-large';
  return 'map-card-medium';
};

const SVG_ICONS = {
  uacs: `<svg viewBox="0 0 24 24" width="16" height="16" stroke="#ef4444" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
  recipient: `<svg viewBox="0 0 24 24" width="12" height="12" stroke="#fff" stroke-width="2" fill="#3b82f6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM6 20v-1a5 5 0 0 1 10 0v1"/></svg>`,
  nasa: `<svg viewBox="0 0 24 24" width="14" height="14" stroke="#ff5722" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>`
};

export default function SituationMapCard() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mapSize, setMapSize] = useState('medium'); // small, medium, large
  const [nasaEvents, setNasaEvents] = useState([]);
  const [gdacsEvents, setGdacsEvents] = useState([]);
  const [recipients, setRecipients] = useState([]);

  // Pin details
  const [clickPos, setClickPos] = useState(null);
  const [pinTitle, setPinTitle] = useState('');
  const [pinDesc, setPinDesc] = useState('');
  const [pinZone, setPinZone] = useState('');
  const [pinRadius, setPinRadius] = useState(5);
  const [pinUrgency, setPinUrgency] = useState('critical');
  const [submitting, setSubmitting] = useState(false);

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const activePinMarkerRef = useRef(null);

  // Fetch all map data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [msgRes, nasaRes, recRes] = await Promise.allSettled([
          messagesApi.getAll('active'),
          nasaApi.getEvents(14),
          recipientsApi.getAll(),
        ]);
        if (msgRes.status === 'fulfilled') setAlerts(msgRes.value?.data || []);
        if (nasaRes.status === 'fulfilled') setNasaEvents(nasaRes.value?.data?.events || []);
        if (recRes.status === 'fulfilled') setRecipients(recRes.value?.data || []);
      } catch (err) {
        console.error('SituationMapCard fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();

    // Fetch GDACS separately (non-blocking)
    gdacsApi.getEvents()
      .then(res => setGdacsEvents(res?.data?.events || []))
      .catch(() => {});
  }, []);

  // Initialize MapLibre GL
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
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
      },
      center: [78.9629, 20.5937], // Center of India
      zoom: 4.8,
      pitch: 30,
    });

    mapRef.current = map;

    // Click handler for Rapid Pin placement
    map.on('click', (e) => {
      const { lng, lat } = e.lngLat;
      setClickPos({ lat, lng });

      // Reverse geocode to fetch zone name
      fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.display_name) {
            setPinZone(data.display_name.split(',').slice(0, 2).join(',').trim());
          }
        }).catch(() => {});
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Render and update markers on data changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear previous dashboard layer markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // Helper marker creator
    const addMarker = (lat, lng, className, svgIcon, popupHTML) => {
      const el = document.createElement('div');
      el.className = `glow-marker ${className}`;
      el.innerHTML = svgIcon;

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([lng, lat])
        .setPopup(new maplibregl.Popup({ offset: 15 }).setHTML(popupHTML))
        .addTo(map);

      markersRef.current.push(marker);
    };

    // 1. Render active alerts
    alerts.forEach(alert => {
      const pos = alert.lat && alert.lng ? [alert.lat, alert.lng] : getZoneCoords(alert.target_zone);
      addMarker(
        pos[0], pos[1],
        'glow-marker-uacs',
        SVG_ICONS.uacs,
        `<div class="p-1">
          <div class="font-black text-red-500 text-xs tracking-wider uppercase mb-1">🚨 ACTIVE ALERT</div>
          <div class="font-bold text-white text-sm">${alert.title}</div>
          <div class="text-slate-300 mt-1">${alert.master_content}</div>
        </div>`
      );
    });

    // 2. Render recipients
    recipients.forEach(r => {
      if (!r.lat || !r.lng) return;
      addMarker(
        r.lat, r.lng,
        'glow-marker-eap',
        SVG_ICONS.recipient,
        `<div class="p-1 text-xs">
          <div class="font-bold text-white">${r.name}</div>
          <div class="text-slate-300">${r.phone}</div>
          <div class="text-slate-400 mt-1 uppercase text-[10px]">${r.zone}</div>
        </div>`
      );
    });

    // 3. Render NASA EONET
    nasaEvents.forEach(e => {
      const geom = e.geometry?.at(-1);
      if (!geom || !Array.isArray(geom.coordinates)) return;
      addMarker(
        geom.coordinates[1], geom.coordinates[0],
        'glow-marker-fire',
        SVG_ICONS.nasa,
        `<div class="p-1">
          <div class="font-bold text-xs text-orange-400 mb-1">NASA: ${e.categories?.[0]?.title}</div>
          <div class="text-white text-xs font-bold">${e.title}</div>
        </div>`
      );
    });
  }, [alerts, recipients, nasaEvents]);

  // Handle active pins (clickPos changes)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (activePinMarkerRef.current) {
      activePinMarkerRef.current.remove();
      activePinMarkerRef.current = null;
    }

    if (!clickPos) return;

    const el = document.createElement('div');
    el.style.fontSize = '24px';
    el.textContent = '📍';

    // Show popup immediately upon pinning
    const popupContent = document.getElementById('rapid-pin-popup-root');
    const popup = new maplibregl.Popup({ offset: 15, closeOnClick: false })
      .setDOMContent(popupContent)
      .setLngLat([clickPos.lng, clickPos.lat])
      .addTo(map);

    const marker = new maplibregl.Marker({ element: el })
      .setLngLat([clickPos.lng, clickPos.lat])
      .addTo(map);

    activePinMarkerRef.current = marker;

    return () => {
      popup.remove();
      marker.remove();
    };
  }, [clickPos]);

  const handlePinSubmit = async () => {
    if (!pinTitle || !pinDesc) return toast.error('Please fill all fields');
    setSubmitting(true);
    try {
      await messagesApi.create({
        title: `[PIN] ${pinTitle}`,
        master_content: pinDesc,
        urgency: pinUrgency,
        target_zone: pinZone || 'General',
        radius: pinRadius,
        channels: ['website', 'sms'],
        languages: ['en'],
        lat: clickPos.lat,
        lng: clickPos.lng,
        status: 'active'
      });
      toast.success('Location alert pinned & broadcasted!');
      setClickPos(null);
      setPinTitle('');
      setPinDesc('');
      setPinZone('');
      
      const msgRes = await messagesApi.getAll('active');
      setAlerts(msgRes.data);
    } catch (err) {
      toast.error('Failed to pin alert');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`glass-card transition-all duration-500 map-card-resizable ${getMapSizeClass(mapSize)} relative shadow-2xl border-0 overflow-hidden`}>
      {/* Map Resize Controls */}
      <div className="absolute bottom-6 right-6 z-[999] pointer-events-none">
        <div className="flex items-center gap-1 p-1.5 rounded-2xl bg-theme-surface/90 backdrop-blur-xl border border-theme-border shadow-2xl pointer-events-auto hover:border-accent/50 transition-colors">
          <button 
            onClick={() => setMapSize('small')}
            className={`p-2 rounded-xl transition-all ${mapSize === 'small' ? 'bg-accent text-white shadow-lg' : 'text-theme-muted hover:bg-theme-hover'}`}
            title="Small View"
          >
            <Minimize2 className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setMapSize('medium')}
            className={`p-2 rounded-xl transition-all ${mapSize === 'medium' ? 'bg-accent text-white shadow-lg' : 'text-theme-muted hover:bg-theme-hover'}`}
            title="Medium View"
          >
            <Layers className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setMapSize('large')}
            className={`p-2 rounded-xl transition-all ${mapSize === 'large' ? 'bg-accent text-white shadow-lg' : 'text-theme-muted hover:bg-theme-hover'}`}
            title="Large View"
          >
            <Maximize2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div ref={mapContainerRef} style={{ height: '100%', width: '100%' }} />

      {/* Hidden DOM element for the map popup form */}
      <div style={{ display: 'none' }}>
        <div id="rapid-pin-popup-root" className="p-2 space-y-2 text-slate-100 min-w-[240px]">
          <div className="flex items-center gap-2 text-red-500 font-bold text-xs uppercase">
            <AlertTriangle className="w-4 h-4" /> Rapid Alert Pin
          </div>
          <input 
            placeholder="Alert Title (e.g. Flood)" 
            className="w-full bg-slate-800 text-white p-2 rounded-lg text-xs border border-white/10"
            value={pinTitle}
            onChange={e => setPinTitle(e.target.value)}
          />
          <textarea 
            placeholder="Alert description..." 
            className="w-full bg-slate-800 text-white p-2 rounded-lg text-xs h-16 border border-white/10"
            value={pinDesc}
            onChange={e => setPinDesc(e.target.value)}
          />
          <div className="flex gap-1.5">
            <input 
              placeholder="Zone Name" 
              className="flex-1 bg-slate-800 text-white p-2 rounded-lg text-xs border border-white/10"
              value={pinZone}
              onChange={e => setPinZone(e.target.value)}
            />
            <button 
              onClick={async () => {
                if (!pinZone.trim()) return;
                try {
                  const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(pinZone)}`);
                  const data = await res.json();
                  if (data && data.length > 0) {
                    setClickPos({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
                    toast.success(`Marker moved to ${pinZone}`);
                  }
                } catch (_) {}
              }}
              className="px-2 bg-accent/20 border border-accent/40 text-accent text-[10px] font-bold rounded-lg"
            >
              Move
            </button>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold">
            Radius: 
            <input 
              type="number" 
              min="1" 
              max="50" 
              value={pinRadius} 
              onChange={e => setPinRadius(e.target.value)} 
              className="w-12 bg-slate-800 text-white border border-white/10 text-center rounded" 
            /> km
          </div>
          <div className="flex gap-2 text-[10px] font-bold mt-1">
            <button 
              onClick={() => setPinUrgency('critical')}
              className={`flex-1 py-1 rounded ${pinUrgency === 'critical' ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-400'}`}
            >
              CRITICAL
            </button>
            <button 
              onClick={() => setPinUrgency('high')}
              className={`flex-1 py-1 rounded ${pinUrgency === 'high' ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-400'}`}
            >
              HIGH
            </button>
          </div>
          <div className="flex gap-2 pt-1.5 border-t border-white/10">
            <button 
              onClick={() => setClickPos(null)} 
              className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 rounded text-[10px] font-bold"
            >
              CANCEL
            </button>
            <button 
              onClick={handlePinSubmit} 
              disabled={submitting} 
              className="flex-1 py-1.5 bg-accent hover:bg-accent-hover text-white rounded text-[10px] font-bold flex items-center justify-center gap-1"
            >
              {submitting ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
              DISPATCH
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
