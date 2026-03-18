// app/api/admin/teams/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: Request) {
  try {
    // Verify caller is an admin
    const authHeader = request.headers.get('authorization');
    const accessToken = authHeader?.replace('Bearer ', '');
    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: { user: adminUser }, error: authError } = await supabaseAdmin.auth.getUser(accessToken);
    if (authError || !adminUser || adminUser.user_metadata?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from('teams')
      .select(`
        id,
        team_name,
        team_number,
        team_size,
        payment_status,
        receipt_url,
        tracks (title),
        payment_receipts (id, member_index, receipt_url),
        candidates (id, full_name, email, phone, srn, cycle, is_leader, member_index)
      `)
      .order('team_number', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ teams: data ?? [] }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to load teams.' }, { status: 500 });
  }
}
