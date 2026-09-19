import { createClient, SupabaseClient } from '@supabase/supabase-js';

// The server handles credentials safely. The frontend always routes to the Express DB API.
export const isSupabaseConfigured = true;

export const MATERIALS_BUCKET = 'materials';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://dummy-project.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'dummy-anon-key-prevent-crash';

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
