// app/api/admin/events/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase-admin';
import { validateEventInput, slugify } from '../../../lib/events';

async function verifyAdmin(request: Request) {
  const authHeader = request.headers.get('authorization');
  const accessToken = authHeader?.replace('Bearer ', '');
  if (!accessToken) return null;

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
  if (error || !user || user.user_metadata?.role !== 'admin') return null;
  return user;
}

export async function GET(request: Request) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { data, error } = await supabaseAdmin
      .from('events')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ events: data ?? [] });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to fetch events.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const {
      name, description, location, eventDate, startTime, endTime,
      prizePool, sponsors, maxTeamSize, minTeamSize, bannerText
    } = body;

    const slug = body.slug || slugify(name || '');
    const input = { name, slug, description, location, eventDate, startTime, endTime, prizePool, sponsors, maxTeamSize, minTeamSize, bannerText };
    const errors = validateEventInput(input);
    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join(' ') }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('events')
      .insert({
        name: name.trim(),
        slug,
        description: description?.trim() ?? '',
        location: location?.trim() ?? '',
        event_date: eventDate || null,
        start_time: startTime?.trim() ?? '',
        end_time: endTime?.trim() ?? '',
        prize_pool: prizePool?.trim() ?? '',
        sponsors: sponsors?.trim() ?? '',
        max_team_size: maxTeamSize ?? 4,
        min_team_size: minTeamSize ?? 2,
        banner_text: bannerText?.trim() ?? '',
        is_active: false,
        registration_open: true,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'An event with this slug already exists. Choose a different name.' }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ event: data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to create event.' }, { status: 500 });
  }
}
