// ═══════════════════════════════════════
// UACS API Service Layer
// JWT-authenticated axios instance
// All 12 disaster/weather API categories
// ═══════════════════════════════════════

import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT Bearer token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('uacs_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses — redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const code = error.response?.data?.code;
      if (!error.config?.url?.includes('/auth/login')) {
        localStorage.removeItem('uacs_token');
        localStorage.removeItem('uacs_user');
        const msg = code === 'TOKEN_EXPIRED' ? '?expired=1' : '';
        window.location.href = `/login${msg}`;
      }
    }
    return Promise.reject(error);
  }
);

// ─── Auth API ───────────────────────────────────────────────────────────────
export const authApi = {
  login:              (phone, password) => api.post('/auth/login', { phone, password }),
  demo:               ()                => api.post('/auth/demo'),
  sendOtp:            (phone)           => api.post('/auth/otp/send', { phone }),
  register:           (data)            => api.post('/auth/register', data),
  logout:             ()                => api.post('/auth/logout'),
  me:                 ()                => api.get('/auth/me'),
  updateProfile:      (data)            => api.put('/auth/profile', data),
  changePassword:     (data)            => api.put('/auth/password', data),
  getPreferences:     ()                => api.get('/auth/preferences'),
  updatePreferences:  (data)            => api.put('/auth/preferences', data),
  setEmergencyContact:(data)            => api.post('/auth/emergency-contact', data),
};

// ─── Messages API ───────────────────────────────────────────────────────────
export const messagesApi = {
  getAll:              (status)        => api.get('/messages', { params: { status } }),
  getById:             (id)            => api.get(`/messages/${id}`),
  getStats:            ()              => api.get('/messages/stats'),
  create:              (data)          => api.post('/messages', data),
  update:              (id, data)      => api.put(`/messages/${id}`, data),
  approve:             (id)            => api.put(`/messages/${id}/approve`),
  reject:              (id, reason)    => api.put(`/messages/${id}/reject`, { reason }),
  expire:              (id, reason)    => api.put(`/messages/${id}/expire`, { reason }),
  extend:              (id, expires_at)=> api.put(`/messages/${id}/extend`, { expires_at }),
  delete:              (id)            => api.delete(`/messages/${id}`),
  emergency:           (data)          => api.post('/messages/emergency', data),
  submitSafety:        (id, status, extra = {}) => api.post(`/messages/${id}/safety`, { status, ...extra }),
  submitDirectSafety:  (data = {})     => api.post('/messages/safety/direct', data),
  getSafetyStats:      ()              => api.get('/messages/safety/stats'),
  getRecentSafety:     ()              => api.get('/messages/safety/recent'),
  assistCitizen:       (reportId)      => api.put(`/messages/safety/${reportId}/assist`),
  getPerformanceReport:(msgId)         => api.get(`/messages/${msgId}/performance`),
};

// ─── Translation API ────────────────────────────────────────────────────────
export const translateApi = {
  translate: (text, languages) => api.post('/translate', { text, languages }),
};

// ─── Dispatch API ───────────────────────────────────────────────────────────
export const dispatchApi = {
  dispatch: (id) => api.post(`/dispatch/${id}`),
};

// ─── Audit API ──────────────────────────────────────────────────────────────
export const auditApi = {
  getAll:    (params) => api.get('/audit', { params }),
  exportCsv: (params) => api.get('/audit/export', { params, responseType: 'blob' }),
  clearOld:  (days)   => api.delete('/audit/clear', { params: { days } }),
};

// ─── Users API ──────────────────────────────────────────────────────────────
export const usersApi = {
  getAll: () => api.get('/users'),
};

// ─── Recipients API ─────────────────────────────────────────────────────────
export const recipientsApi = {
  getAll:   (zone) => api.get('/recipients', { params: zone ? { zone } : {} }),
  create:   (data) => api.post('/recipients', data),
  update:   (id, data) => api.put(`/recipients/${id}`, data),
  delete:   (id)   => api.delete(`/recipients/${id}`),
  sendTest: (id)   => api.post(`/recipients/${id}/test`),
};

// ════════════════════════════════════════════════════════════════════════════
// EXTERNAL DATA SOURCES — All 12 Categories
// All routed through /api/external backend proxy
// ════════════════════════════════════════════════════════════════════════════

// ─── CAT 1: Earthquake & Seismic ────────────────────────────────────────────

// USGS — Real-time global earthquakes (frontend direct, no CORS issue)
export const usgsApi = {
  getEarthquakes: (timeframe = 'day') =>
    axios.get(`https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_${timeframe}.geojson`),
  // Historical query: by date range and min magnitude
  queryHistorical: (params) =>
    axios.get('https://earthquake.usgs.gov/fdsnws/event/1/query', {
      params: { format: 'geojson', ...params },
    }),
};

// EMSC — Euro-Mediterranean Seismological Centre (via backend proxy)
export const emscApi = {
  getEarthquakes: () => api.get('/external/emsc'),
};

// ─── CAT 2: Multi-Hazard Disaster Alerts ────────────────────────────────────

// GDACS — UN: cyclones, floods, volcanoes, tsunamis, wildfires, earthquakes
export const gdacsApi = {
  getEvents:  ()         => api.get('/external/gdacs'),
  byType:     (type)     => api.get('/external/gdacs', { params: { type } }),
};

// NASA EONET — wildfire, volcano, flood, storm (frontend direct)
export const nasaApi = {
  getEvents: (days = 30) =>
    axios.get('https://eonet.gsfc.nasa.gov/api/v3/events', {
      params: { status: 'open', days },
    }),
  getByCategory: (category, days = 30) =>
    axios.get('https://eonet.gsfc.nasa.gov/api/v3/events', {
      params: { status: 'open', days, category },
    }),
};

// ReliefWeb — UN OCHA humanitarian situation reports
export const reliefWebApi = {
  getReports: () => api.get('/external/reliefweb'),
};

// ─── CAT 3: Weather & Storms ─────────────────────────────────────────────────

// Open-Meteo — primary weather (frontend direct, no CORS)
export const weatherApi = {
  getCurrent: (lat, lng) =>
    axios.get('https://api.open-meteo.com/v1/forecast', {
      params: {
        latitude: lat, longitude: lng,
        current: 'temperature_2m,relative_humidity_2m,weather_code,uv_index,precipitation,snowfall',
        forecast_days: 1,
      },
    }),
  getForecast: (lat, lng) =>
    axios.get('https://api.open-meteo.com/v1/forecast', {
      params: {
        latitude: lat, longitude: lng,
        hourly: 'temperature_2m,precipitation_probability,weather_code',
        forecast_days: 3,
      },
    }),
};

// OpenWeatherMap — wind speed, storm pressure (via backend, uses OWM_API_KEY if set)
export const owmApi = {
  getWind: (lat, lng) => api.get('/external/owm', { params: { lat, lng } }),
};

// ─── CAT 4: Cyclone / Tropical Storm ─────────────────────────────────────────

// NOAA NHC — live Atlantic + Pacific cyclone tracks
export const cycloneApi = {
  getActiveStorms: () => api.get('/external/nhc'),
};

// ─── CAT 5: Wildfire ──────────────────────────────────────────────────────────

// NASA FIRMS — satellite wildfire hotspots (VIIRS/MODIS)
export const firmsApi = {
  getHotspots: (lat, lng, days = 1) =>
    api.get('/external/firms', { params: { lat, lng, days } }),
};

// ─── CAT 6: Flood ─────────────────────────────────────────────────────────────

// GloFAS + GDACS flood events
export const floodApi = {
  getWarnings: () => api.get('/external/glofas'),
};

// ─── CAT 7: Tsunami (covered by GDACS above — type TS) ──────────────────────
// Filter GDACS events by type: 'TS' for tsunamis

// ─── CAT 8: Volcano ──────────────────────────────────────────────────────────

// Smithsonian GVP — weekly volcano activity report
export const volcanoApi = {
  getWeeklyReport: () => api.get('/external/gvp'),
  // VAAC volcanic ash advisories for aviation
  getVaac:         () => api.get('/external/vaac'),
};

// ─── CAT 9: Air Quality ───────────────────────────────────────────────────────

// Open-Meteo AQI + optional WAQI augmentation (via backend)
export const airQualityApi = {
  getAQI: (lat, lng) => api.get('/external/aqi', { params: { lat, lng } }),
};

// ─── CAT 10: India Specific ───────────────────────────────────────────────────

// NDMA SACHET — India government CAP disaster alerts
export const ndmaApi = {
  getAlerts: () => api.get('/external/ndma'),
};

// ─── CAT 11: Geocoding & Maps ─────────────────────────────────────────────────

// Nominatim — reverse geocoding (frontend direct)
export const geocodeApi = {
  reverse: (lat, lng) =>
    axios.get('https://nominatim.openstreetmap.org/reverse', {
      params: { format: 'json', lat, lon: lng },
      headers: { 'User-Agent': 'UACS-Platform/1.0' },
    }),
  search: (query) =>
    axios.get('https://nominatim.openstreetmap.org/search', {
      params: { format: 'json', q: query, limit: 5 },
      headers: { 'User-Agent': 'UACS-Platform/1.0' },
    }),
};

// ─── CAT 12: Satellite & Climate ─────────────────────────────────────────────

// NASA POWER — satellite-derived climate metrics (7-day)
export const nasaPowerApi = {
  getClimate: (lat, lng) =>
    api.get('/external/nasa-power', { params: { lat, lng } }),
};

// ─── External API Status ─────────────────────────────────────────────────────
export const externalStatusApi = {
  getStatus: () => api.get('/external/status'),
};

export default api;
