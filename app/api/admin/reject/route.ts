// app/api/admin/reject/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { sendRejectionEmail } from '@/lib/mailer';

export async function POST(request: Request) {
  try {
    // Verify caller is an admin
    const authHeader = request.headers.get('authorization');
    const accessToken = authHeader?.replace('Bearer ', '');
    if (!accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { data: { user: adminUser }, error: authError } = await supabaseAdmin.auth.getUser(accessToken);
    if (authError || !adminUser || adminUser.user_metadata?.role !== 'admin') {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const { teamId, reason } = body;

    if (!teamId || typeof teamId !== 'string' || !reason || typeof reason !== 'string') {
      return NextResponse.json({ error: "Team ID and Rejection Reason are required" }, { status: 400 });
    }

    if (reason.trim().length > 500) {
      return NextResponse.json({ error: "Rejection reason is too long." }, { status: 400 });
    }

    // 1. Fetch the Team and the Leader's details before we delete them
    const { data: team, error: fetchError } = await supabaseAdmin
      .from('teams')
      .select(`
        id,
        team_name,
        payment_status,
        candidates (full_name, email, is_leader)
      `)
      .eq('id', teamId)
      .single();

    if (fetchError || !team) {
      return NextResponse.json({ error: "Team not found in the database." }, { status: 404 });
    }

    if (team.payment_status === 'approved') {
      return NextResponse.json({ error: "Cannot reject an already approved team. You must manually delete them if needed." }, { status: 400 });
    }

    const leader = team.candidates.find((c: any) => c.is_leader) || team.candidates[0];

    // 2. Delete the Team from the database
    // Assuming you have CASCADE DELETE set up on your foreign keys, 
    // deleting the team will automatically delete the linked candidates.
    const { error: deleteError } = await supabaseAdmin
      .from('teams')
      .delete()
      .eq('id', teamId);

    if (deleteError) {
      throw new Error(`Failed to delete team: ${deleteError.message}`);
    }

    // 3. Dispatch the Rejection Email asynchronously
    if (leader) {
      sendRejectionEmail(leader.full_name, leader.email, team.team_name, reason).catch(err => {
        console.warn(`Failed to send rejection email to ${leader.email}`, err);
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: "Team successfully rejected and deleted."
    });

  } catch (error: any) {
    console.error("Admin Reject Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}