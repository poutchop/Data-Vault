import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../utils/api';

// Generic fetch hook
export function useFetch(fetchFn, deps = [], options = {}) {
  const { pollInterval = 0 } = options;
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const intervalRef           = useRef(null);

  const load = useCallback(async () => {
    try {
      const result = await fetchFn();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    load();
    if (pollInterval > 0) {
      intervalRef.current = setInterval(load, pollInterval);
    }
    return () => clearInterval(intervalRef.current);
  }, [load, pollInterval]);

  return { data, loading, error, refetch: load };
}

// Stats for metric cards — polls every 15s
export function useScanStats() {
  return useFetch(() => api.getScanStats(), [], { pollInterval: 15_000 });
}

// Live hardening feed — polls every 8s
export function useScans(params = {}) {
  const key = JSON.stringify(params);
  return useFetch(() => api.getScans(params), [key], { pollInterval: 8_000 });
}

// Leaderboard — polls every 30s
export function useLeaderboard(params = {}) {
  const key = JSON.stringify(params);
  return useFetch(() => api.getLeaderboard(params), [key], { pollInterval: 30_000 });
}

// Nutrition logs
export function useNutrition(params = {}) {
  const key = JSON.stringify(params);
  return useFetch(() => api.getNutrition(params), [key]);
}

// Nutrition weekly aggregate for charts
export function useNutritionAggregate() {
  return useFetch(() => api.getNutritionAggregate(), []);
}

// Payouts
export function usePayouts(params = {}) {
  const key = JSON.stringify(params);
  return useFetch(() => api.getPayouts(params), [key], { pollInterval: 20_000 });
}
