// app/api/admin/toggle-event/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  const accessToken = authHeader?.replace('Bearer ', '');
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(accessToken);
  if (authError || !user || user.user_metadata?.role !== 'admin') {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
  }

  const { data: settings, error: fetchError } = await supabaseAdmin
    .from('event_settings')
    .select('is_live')
    .eq('id', 1)
    .single();

  if (fetchError || !settings) {
    return NextResponse.json({ error: "Could not read event settings." }, { status: 500 });
  }

  const newState = !settings.is_live;

  const { error: updateError } = await supabaseAdmin
    .from('event_settings')
    .update({ is_live: newState })
    .eq('id', 1);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ is_live: newState });
}
