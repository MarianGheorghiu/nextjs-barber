import { createClient } from '@supabase/supabase-js';
const env = import.meta.env;
export const demoMode = env.VITE_DEMO_MODE === 'true' || (env.DEV && !env.VITE_SUPABASE_URL);
export const configured = !!env.VITE_SUPABASE_URL && !!env.VITE_SUPABASE_ANON_KEY;
export const supabase = configured && !demoMode ? createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'atelier.auth' }
}) : null;
export { BARBER_ID } from './constants';
