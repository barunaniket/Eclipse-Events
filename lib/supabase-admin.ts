// lib/supabase-admin.ts
import { createClient } from '@supabase/supabase-js';
import { serverEnv } from '@/lib/env';

const supabaseUrl = serverEnv.supabaseUrl;
const supabaseServiceKey = serverEnv.supabaseServiceRoleKey;

// This client bypasses Row Level Security (RLS). 
// NEVER use this on the frontend.
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
