// ═══════════════════════════════════════
// UACS API Service Layer
// JWT-authenticated axios instance
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
      // Don't redirect if this is a login request failing
      if (!error.config?.url?.includes('/auth/login')) {
        localStorage.removeItem('uacs_token');
        localStorage.removeItem('uacs_user');
        const msg = code === 'TOKEN_EXPIRED'
          ? '?expired=1'
          : '';
        window.location.href = `/login${msg}`;
      }
    }
    return Promise.reject(error);
  }
);

// ─── Auth API ───
export const authApi = {
  login:         (phone, password) => api.post('/auth/login', { phone, password }),
  demo:          ()                => api.post('/auth/demo'),
  sendOtp:       (phone)           => api.post('/auth/otp/send', { phone }),
  register:      (data)            => api.post('/auth/register', data),
  logout:        ()                => api.post('/auth/logout'),
  me:            ()                => api.get('/auth/me'),
  updateProfile: (data)            => api.put('/auth/profile', data),
  changePassword:(data)            => api.put('/auth/password', data),
  getPreferences:()                => api.get('/auth/preferences'),
  updatePreferences:(data)         => api.put('/auth/preferences', data),
  setEmergencyContact:(data)       => api.post('/auth/emergency-contact', data),
};

// ─── Messages API ───
export const messagesApi = {
  getAll:   (status) => api.get('/messages', { params: { status } }),
  getById:  (id)     => api.get(`/messages/${id}`),
  getStats: ()       => api.get('/messages/stats'),
  create:   (data)   => api.post('/messages', data),
  update:   (id, data) => api.put(`/messages/${id}`, data),
  approve:  (id)     => api.put(`/messages/${id}/approve`),
  reject:   (id, reason) => api.put(`/messages/${id}/reject`, { reason }),
  expire:   (id, reason) => api.put(`/messages/${id}/expire`, { reason }),
  extend:   (id, expires_at) => api.put(`/messages/${id}/extend`, { expires_at }),
  delete:   (id)     => api.delete(`/messages/${id}`),
  emergency: (data)  => api.post('/messages/emergency', data),
  submitSafety: (id, status, extra = {}) => api.post(`/messages/${id}/safety`, { status, ...extra }),
  submitDirectSafety: (data = {}) => api.post('/messages/safety/direct', data),
  getSafetyStats: () => api.get('/messages/safety/stats'),
  getRecentSafety: () => api.get('/messages/safety/recent'),
  assistCitizen: (reportId) => api.put(`/messages/safety/${reportId}/assist`),
  getPerformanceReport: (msgId) => api.get(`/messages/${msgId}/performance`),
};

// ─── Translation API ───
export const translateApi = {
  translate: (text, languages) => api.post('/translate', { text, languages }),
};

// ─── Dispatch API ───
export const dispatchApi = {
  dispatch: (id) => api.post(`/dispatch/${id}`),
};

// ─── Audit API ───
export const auditApi = {
  getAll:   (params) => api.get('/audit', { params }),
  exportCsv: (params) => api.get('/audit/export', { params, responseType: 'blob' }),
  clearOld:  (days)  => api.delete(`/audit/clear`, { params: { days } }),
};

// ─── Users API ───
export const usersApi = {
  getAll: () => api.get('/users'),
};

// ─── Recipients API ───
export const recipientsApi = {
  getAll: (zone) => api.get('/recipients', { params: zone ? { zone } : {} }),
  create: (data) => api.post('/recipients', data),
  update: (id, data) => api.put(`/recipients/${id}`, data),
  delete: (id) => api.delete(`/recipients/${id}`),
  sendTest: (id) => api.post(`/recipients/${id}/test`),
};

// ─── NASA Disaster API (EONET) ───
export const nasaApi = {
  getEvents: (days = 30) => axios.get('https://eonet.gsfc.nasa.gov/api/v3/events', { params: { status: 'open', days } }),
};

// ─── USGS Earthquake API ───
export const usgsApi = {
  getEarthquakes: (timeframe = 'day') => axios.get(`https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_${timeframe}.geojson`),
};

export default api;
