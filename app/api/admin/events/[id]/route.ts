// app/api/admin/events/[id]/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase-admin';

async function verifyAdmin(request: Request) {
  const authHeader = request.headers.get('authorization');
  const accessToken = authHeader?.replace('Bearer ', '');
  if (!accessToken) return null;

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
  if (error || !user || user.user_metadata?.role !== 'admin') return null;
  return user;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const body = await request.json();

    // Map camelCase input to snake_case DB columns
    const updateFields: Record<string, any> = {};
    if (body.name !== undefined) updateFields.name = body.name.trim();
    if (body.slug !== undefined) updateFields.slug = body.slug;
    if (body.description !== undefined) updateFields.description = body.description.trim();
    if (body.location !== undefined) updateFields.location = body.location.trim();
    if (body.eventDate !== undefined) updateFields.event_date = body.eventDate || null;
    if (body.startTime !== undefined) updateFields.start_time = body.startTime.trim();
    if (body.endTime !== undefined) updateFields.end_time = body.endTime.trim();
    if (body.prizePool !== undefined) updateFields.prize_pool = body.prizePool.trim();
    if (body.sponsors !== undefined) updateFields.sponsors = body.sponsors.trim();
    if (body.maxTeamSize !== undefined) updateFields.max_team_size = body.maxTeamSize;
    if (body.minTeamSize !== undefined) updateFields.min_team_size = body.minTeamSize;
    if (body.bannerText !== undefined) updateFields.banner_text = body.bannerText.trim();
    if (body.isActive !== undefined) updateFields.is_active = body.isActive;
    if (body.registrationOpen !== undefined) updateFields.registration_open = body.registrationOpen;
    updateFields.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('events')
      .update(updateFields)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Slug already in use by another event.' }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ event: data });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to update event.' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;

    // Safety: count teams for this event before deleting
    // (events table doesn't link to teams yet — this is for future-proofing)
    const { error } = await supabaseAdmin
      .from('events')
      .delete()
      .eq('id', id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to delete event.' }, { status: 500 });
  }
}
