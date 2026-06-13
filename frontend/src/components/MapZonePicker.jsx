import { useState, useEffect, useRef, useCallback } from 'react';
import { MapIcon, X, Search, Check } from 'lucide-react';

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const LABEL_SEARCH_LOCATION = 'Search Location';
const LABEL_ZONE_LABEL = 'Zone Label';
const LABEL_ALERT_RADIUS = 'Alert Radius: ';
const LABEL_QUICK_SELECT = 'Quick Select City';
const LABEL_LATITUDE = 'Latitude';
const LABEL_LONGITUDE = 'Longitude';
const LABEL_CANCEL = 'Cancel';

const PRESET_ZONES = [
  { name: 'North Delhi', lat: 28.7041, lng: 77.1025 },
  { name: 'South Mumbai', lat: 18.9388, lng: 72.8354 },
  { name: 'Central Kolkata', lat: 22.5726, lng: 88.3639 },
  { name: 'East Chennai', lat: 13.0827, lng: 80.2707 },
  { name: 'West Bengaluru', lat: 12.9716, lng: 77.5946 },
  { name: 'Pune City', lat: 18.5204, lng: 73.8567 },
  { name: 'Hyderabad Central', lat: 17.3850, lng: 78.4867 },
  { name: 'Ahmedabad North', lat: 23.0225, lng: 72.5714 },
];

export default function MapZonePicker({ value, onChange, onClose }) {
  const mapRef = useRef(null);
  const leafletMapIcon = useRef(null);
  const markerRef = useRef(null);
  const circleRef = useRef(null);
  const [selectedCoords, setSelectedCoords] = useState(null);
  const [zoneName, setZoneName] = useState(value || '');
  const [radius, setRadius] = useState(5); // km
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);

  const updateMapIconOverlay = useCallback((lat, lng, km) => {
    if (!leafletMapIcon.current) return;

    // Remove old overlays
    if (markerRef.current) markerRef.current.remove();
    if (circleRef.current) circleRef.current.remove();

    // Custom marker icon
    const el = document.createElement('div');
    el.style.width = '28px';
    el.style.height = '28px';
    el.style.background = 'var(--accent,#0ea5e9)';
    el.style.borderRadius = '50% 50% 50% 0';
    el.style.transform = 'rotate(-45deg)';
    el.style.border = '3px solid white';
    el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.4)';

    const icon = L.divIcon({
      className: '',
      html: el,
      iconSize: [28, 28],
      iconAnchor: [14, 28],
    });

    markerRef.current = L.marker([lat, lng], { icon }).addTo(leafletMapIcon.current);
    circleRef.current = L.circle([lat, lng], {
      radius: km * 1000,
      color: 'var(--accent, #0ea5e9)',
      fillColor: '#0ea5e9',
      fillOpacity: 0.15,
      weight: 2,
    }).addTo(leafletMapIcon.current);

    leafletMapIcon.current.flyTo([lat, lng], 11, { duration: 0.8 });
  }, []);

  useEffect(() => {
    if (!mapRef.current || leafletMapIcon.current) return;

      // Fix default icon path issue with webpack/vite
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      leafletMapIcon.current = L.map(mapRef.current, {
        center: [20.5937, 78.9629], // India center
        zoom: 5,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMapIcon contributors',
        maxZoom: 18,
      }).addTo(leafletMapIcon.current);

    // Click on map to select zone
      leafletMapIcon.current.on('click', async (e) => {
        const { lat, lng } = e.latlng;
        setSelectedCoords({ lat, lng });
        updateMapIconOverlay(lat, lng, radius);
        
        // Reverse geocode to get zone name
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
          const data = await res.json();
          if (data && data.display_name) {
            const shortName = data.display_name.split(',').slice(0, 2).join(',').trim();
            setZoneName(shortName);
          }
        } catch (err) {
          console.error("Reverse geocode failed", err);
        }
      });

    return () => {
      if (leafletMapIcon.current) {
        leafletMapIcon.current.remove();
        leafletMapIcon.current = null;
      }
    };
  }, []);

  // Update circle when radius changes
  useEffect(() => {
    if (!selectedCoords) return;
    updateMapIconOverlay(selectedCoords.lat, selectedCoords.lng, radius);
  }, [radius]);

  const handlePreset = (zone) => {
    setSelectedCoords({ lat: zone.lat, lng: zone.lng });
    setZoneName(zone.name);
    updateMapIconOverlay(zone.lat, zone.lng, radius);
  };

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery + ', India')}&limit=1`);
      const data = await res.json();
      if (data.length > 0) {
        const { lat, lon, display_name } = data[0];
        const parsed = { lat: parseFloat(lat), lng: parseFloat(lon) };
        setSelectedCoords(parsed);
        // Use just first 2 parts of the display name for clarity
        const shortName = display_name.split(',').slice(0, 2).join(',').trim();
        setZoneName(shortName);
        updateMapIconOverlay(parsed.lat, parsed.lng, radius);
      } else {
        alert('Location not found. Try a different search term.');
      }
    } catch (e) {
      alert('Search failed. Check your internet connection.');
    } finally {
      setSearching(false);
    }
  };

  const handleConfirm = (e) => {
    if (e) e.preventDefault();
    const finalZone = zoneName.trim() || (selectedCoords ? `Zone (${selectedCoords.lat.toFixed(3)}, ${selectedCoords.lng.toFixed(3)})` : '');
    onChange(finalZone, selectedCoords, radius);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[20000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="glass-card w-full max-w-3xl shadow-2xl flex flex-col" style={{ maxHeight: '90vh', background: 'var(--bg-base)' }}>
        {/* Header */}
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between shrink-0">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <MapIcon className="w-5 h-5" style={{ color: 'var(--accent)' }} />
            Select Target Zone on MapIcon
          </h2>
          <button onClick={onClose} className="text-theme-muted hover:text-theme-primary transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col md:flex-row flex-1 overflow-hidden" style={{ minHeight: 0 }}>
          {/* Sidebar / Controls */}
          <div className="w-full md:w-72 shrink-0 p-4 border-b md:border-b-0 md:border-r border-[var(--border)] space-y-4 overflow-y-auto bg-theme-surface/30">
            {/* Search */}
            <div>
              <label className="text-[10px] md:text-xs font-bold text-theme-muted uppercase tracking-widest">{LABEL_SEARCH_LOCATION}</label>
              <div className="flex gap-2 mt-1.5">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch(e)}
                  placeholder="e.g. Dharavi, Mumbai"
                  className="input-field flex-1 text-sm py-1.5"
                />
                <button type="button" onClick={handleSearch} disabled={searching} className="btn-primary px-3 py-1.5">
                  <Search className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Zone name override */}
            <div>
              <label className="text-xs font-semibold text-theme-muted uppercase tracking-wider">{LABEL_ZONE_LABEL}</label>
              <input
                type="text"
                value={zoneName}
                onChange={e => setZoneName(e.target.value)}
                placeholder="e.g. Ward 5-12, North Delhi"
                className="input-field w-full text-sm mt-1.5"
              />
            </div>

            {/* Radius */}
            <div>
              <label className="text-xs font-semibold text-theme-muted uppercase tracking-wider">{LABEL_ALERT_RADIUS}{radius} km</label>
              <input
                type="range" min={1} max={50} value={radius}
                onChange={e => setRadius(Number(e.target.value))}
                className="w-full mt-1.5 accent-[var(--accent)]"
              />
            </div>

            {/* Presets */}
            <div>
              <label className="text-xs font-semibold text-theme-muted uppercase tracking-wider">{LABEL_QUICK_SELECT}</label>
              <div className="mt-1.5 space-y-1">
                {PRESET_ZONES.map(z => (
                  <button key={z.name} onClick={() => handlePreset(z)}
                    className="w-full text-left text-sm px-3 py-2 rounded-lg transition-colors"
                    style={{
                      background: zoneName === z.name ? 'var(--accent-bg)' : 'var(--bg-input)',
                      color: zoneName === z.name ? 'var(--accent)' : 'var(--text-secondary)',
                      border: `1px solid ${zoneName === z.name ? 'var(--accent-border)' : 'var(--border)'}`,
                    }}>
                    {z.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Manual Lat/Lng Entry */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold text-theme-muted uppercase">{LABEL_LATITUDE}</label>
                <input
                  type="number"
                  step="0.000001"
                  value={selectedCoords?.lat || ''}
                  onChange={e => {
                    const lat = parseFloat(e.target.value);
                    const lng = selectedCoords?.lng || 78.9629;
                    setSelectedCoords({ lat, lng });
                    updateMapIconOverlay(lat, lng, radius);
                  }}
                  className="input-field w-full text-xs py-1"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-theme-muted uppercase">{LABEL_LONGITUDE}</label>
                <input
                  type="number"
                  step="0.000001"
                  value={selectedCoords?.lng || ''}
                  onChange={e => {
                    const lng = parseFloat(e.target.value);
                    const lat = selectedCoords?.lat || 20.5937;
                    setSelectedCoords({ lat, lng });
                    updateMapIconOverlay(lat, lng, radius);
                  }}
                  className="input-field w-full text-xs py-1"
                />
              </div>
            </div>

            <p className="text-xs text-theme-dim">💡 Click anywhere on the map to pin a custom zone or type coordinates manually above.</p>
          </div>

          {/* MapIcon */}
          <div className="flex-1 relative min-h-[250px] md:min-h-[400px]">
            <div ref={mapRef} className="w-full h-full" />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--border)] flex gap-3 justify-end shrink-0" style={{ background: 'var(--bg-surface)' }}>
          <button type="button" onClick={onClose} className="btn-secondary">{LABEL_CANCEL}</button>
          <button type="button" onClick={handleConfirm} disabled={!zoneName.trim() && !selectedCoords} className="btn-primary">
            <Check className="w-4 h-4" /> Confirm Zone: {zoneName || '(click map first)'}
          </button>
        </div>
      </div>
    </div>
  );
}
