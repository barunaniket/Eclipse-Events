// app/api/ping/route.ts
// Lightweight keep-alive endpoint — called by Cloudflare Cron Trigger every 5 minutes
// to prevent Supabase free tier from going cold.
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET() {
  const start = Date.now();
  await supabaseAdmin.from('tracks').select('id').limit(1);
  return NextResponse.json({ ok: true, latency: Date.now() - start });
}
