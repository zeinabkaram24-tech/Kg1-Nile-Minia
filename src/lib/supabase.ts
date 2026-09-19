import { createClient, SupabaseClient } from '@supabase/supabase-js';

// The server handles credentials safely. The frontend always routes to the Express DB API.
export const isSupabaseConfigured = true;

export const MATERIALS_BUCKET = 'materials';

let rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://dummy-project.supabase.co';
// Robust cleanup in case the user pasted the /rest/v1/ endpoint URL
rawSupabaseUrl = rawSupabaseUrl.trim();
if (rawSupabaseUrl.endsWith('/rest/v1/')) {
  rawSupabaseUrl = rawSupabaseUrl.substring(0, rawSupabaseUrl.length - 9);
} else if (rawSupabaseUrl.endsWith('/rest/v1')) {
  rawSupabaseUrl = rawSupabaseUrl.substring(0, rawSupabaseUrl.length - 8);
}
const supabaseUrl = rawSupabaseUrl;
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || 'dummy-anon-key-prevent-crash').trim();

export const supabase: SupabaseClient = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

export default supabase;
