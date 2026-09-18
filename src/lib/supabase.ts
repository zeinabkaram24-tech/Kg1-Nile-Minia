import { createClient, SupabaseClient } from '@supabase/supabase-js';

// The server handles credentials safely. The frontend always routes to the Express DB API.
export const isSupabaseConfigured = true;

export const MATERIALS_BUCKET = 'materials';

export const supabase: SupabaseClient = createClient(
  'https://dummy-project.supabase.co',
  'dummy-anon-key-prevent-crash',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

export default supabase;
