// ═══════════════════════════════════════
// UACS CGA API Service Layer
// ═══════════════════════════════════════

import api from './api';

export const cgaApi = {
  // Citizen: verify a text claim
  verifyClaim: (claimText) =>
    api.post('/cga/verify', { claim_text: claimText }),

  // Citizen: verify with image upload
  verifyImage: (formData) =>
    api.post('/cga/verify', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  // Admin: get all claims (paginated)
  getClaims: (params = {}) =>
    api.get('/cga/claims', { params }),

  // Admin: get human review queue
  getQueue: () =>
    api.get('/cga/claims/queue'),

  // Admin: virality leaderboard
  getLeaderboard: () =>
    api.get('/cga/claims/leaderboard'),

  // Admin: update verdict after review
  reviewClaim: (id, data) =>
    api.put(`/cga/claims/${id}/review`, data),

  // Admin: dispatch Truth Card via UACS channels
  dispatchTruthCard: (claim_id, channels, zone) =>
    api.post('/cga/dispatch', { claim_id, channels, zone }),

  // Admin: overall CGA stats
  getStats: () =>
    api.get('/cga/stats'),
};
