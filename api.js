const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Scans
  getScans:      (params = {}) => request(`/api/v1/scans?${new URLSearchParams(params)}`),
  getScanStats:  ()            => request('/api/v1/scans/stats'),
  postVerify:    (body)        => request('/api/v1/verify', { method: 'POST', body: JSON.stringify(body) }),

  // Leaderboard
  getLeaderboard: (params = {}) => request(`/api/v1/leaderboard?${new URLSearchParams(params)}`),

  // Nutrition
  getNutrition:          (params = {}) => request(`/api/v1/nutrition?${new URLSearchParams(params)}`),
  getNutritionAggregate: ()            => request('/api/v1/nutrition/aggregate'),
  getNutritionCsv:       (params = {}) => {
    const qs = new URLSearchParams({ ...params, format: 'csv' });
    window.open(`${BASE}/api/v1/nutrition?${qs}`, '_blank');
  },

  // Payouts
  getPayouts: (params = {}) => request(`/api/v1/payouts?${new URLSearchParams(params)}`),

  // Health
  health: () => request('/health'),
};

export default api;
