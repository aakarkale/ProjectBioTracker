/**
 * Environment helpers. The app runs in "demo mode" (static sample data, no
 * auth) until Supabase env vars are present — this keeps the dashboard
 * viewable before a backend is wired up.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** True when the public Supabase client can be constructed. */
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/** Server-only service-role key (used by the ingest webhook). */
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
