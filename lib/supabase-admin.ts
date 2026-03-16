// lib/supabase-admin.ts
import { createClient } from '@supabase/supabase-js';

// Fallback to placeholder strings so Next.js build doesn't crash when env vars
// aren't present at build time. The real values are injected at runtime.
// NEVER import this in client components.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'placeholder-key',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);
