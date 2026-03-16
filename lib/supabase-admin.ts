// lib/supabase-admin.ts
import { createClient } from '@supabase/supabase-js';

// Use SUPABASE_URL (no NEXT_PUBLIC prefix) so it resolves at runtime, not baked
// in at build time. Next.js statically replaces NEXT_PUBLIC_* at build — if those
// vars weren't set when the build ran, every admin call hits the placeholder URL.
// Add SUPABASE_URL to Cloudflare env vars with the same value as NEXT_PUBLIC_SUPABASE_URL.
// NEVER import this in client components.
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'placeholder-key',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);
