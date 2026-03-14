// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import { publicEnv } from '@/lib/env';

const supabaseUrl = publicEnv.supabaseUrl;
const supabaseKey = publicEnv.supabaseAnonKey;

export const supabase = createClient(supabaseUrl, supabaseKey);
export { publicEnv };

export const getAuthHeaders = async () => {
  const { data, error } = await supabase.auth.getSession();

  if (error || !data.session?.access_token) {
    throw new Error('Authentication required.');
  }

  return {
    Authorization: `Bearer ${data.session.access_token}`,
  };
};
