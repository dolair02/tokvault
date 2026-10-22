import { createClient } from '@supabase/supabase-js';

const env = (import.meta as ImportMeta & { env: Record<string, string | undefined> }).env;
const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const authClient = url && key ? createClient(url, key) : null;
export const authRedirect = () => window.location.origin + window.location.pathname;

export const googleAuthEnabled = env.VITE_GOOGLE_AUTH_ENABLED === 'true';
export const appleAuthEnabled = env.VITE_APPLE_AUTH_ENABLED === 'true';
