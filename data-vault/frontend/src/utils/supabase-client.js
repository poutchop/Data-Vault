import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import SafeStore from './safeStore';

const safeStorage = {
  getItem: (k) => SafeStore.get(k),
  setItem: (k, v) => SafeStore.set(k, v),
  removeItem: (k) => SafeStore.remove(k),
};

export const supabase = createClient(
  'YOUR_SUPABASE_URL', // <-- replace with your Supabase project URL
  'YOUR_SUPABASE_ANON_KEY', // <-- replace with your anon public key
  {
    auth: {
      storage: safeStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
      // Disable the problematic lock that caused deadlock
      lock: 'none',
    },
    realtime: { params: { eventsPerSecond: 10 } },
  }
);
