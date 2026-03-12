// app/api/register/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { sendPendingRegistrationEmail } from '@/lib/mailer'; // We will create this in the next step

export async function POST(request: Request) {
  let createdTeamId: string | null = null;

  try {
    const body = await request.json();
    const { teamName, trackId, teamSize, receiptUrl, members } = body;

    const emails = members.map((m: any) => m.email.trim().toLowerCase());
    const srns = members.map((m: any) => m.srn.trim().toUpperCase());

    // 1. PRE-CHECK: Ensure Emails are Unique
    const { data: existingEmails } = await supabaseAdmin
      .from('candidates')
      .select('email')
      .in('email', emails);

    if (existingEmails && existingEmails.length > 0) {
      return NextResponse.json({ error: `Duplicate entry: Email ${existingEmails[0].email} is already registered.` }, { status: 400 });
    }

    // 2. PRE-CHECK: Ensure SRNs are Unique
    const { data: existingSrns } = await supabaseAdmin
      .from('candidates')
      .select('srn')
      .in('srn', srns);

    if (existingSrns && existingSrns.length > 0) {
      return NextResponse.json({ error: `Duplicate entry: SRN ${existingSrns[0].srn} is already registered.` }, { status: 400 });
    }

    // 3. ATOMIC CAPACITY CHECK & INSERTION (RPC)
    const { data: teamData, error: teamError } = await supabaseAdmin.rpc(
      'register_team_with_capacity_check', 
      {
        p_team_name: teamName,
        p_track_id: trackId,
        p_team_size: teamSize,
        p_receipt_url: receiptUrl
      }
    );

    if (teamError) {
      if (teamError.message.includes('TRACK_FULL')) {
        return NextResponse.json({ error: "Registration failed. This track just reached its maximum capacity." }, { status: 400 });
      }
      if (teamError.message.includes('INVALID_TRACK')) {
        return NextResponse.json({ error: "Invalid track selected." }, { status: 400 });
      }
      return NextResponse.json({ error: "Failed to create team. The team name might already be taken." }, { status: 400 });
    }

    createdTeamId = teamData[0].new_team_id;
    const teamId = teamData[0].new_team_id;
    const teamNumber = teamData[0].new_team_number;

    // 4. Process Each Candidate (Database Record ONLY - NO Auth Creation Yet)
    const candidatesData = members.map((member: any, index: number) => ({
      team_id: teamId,
      is_leader: index === 0,
      full_name: member.name,
      srn: member.srn.trim().toUpperCase(),
      email: member.email.trim().toLowerCase(),
      phone: member.phone,
      is_present: false,
      lunch_received: false,
      snacks_received: false
    }));

    // 5. Insert Candidates into the Database
    const { error: candidatesError } = await supabaseAdmin
      .from('candidates')
      .insert(candidatesData);

    if (candidatesError) {
      throw new Error("Failed to insert candidates into the database.");
    }

    // 6. Send "Pending Approval" Email to the Team Leader (Asynchronously)
    const leader = members[0];
    sendPendingRegistrationEmail(leader.name, leader.email, teamName).catch((err) => {
      console.warn("Failed to send pending email to leader, but registration succeeded.", err);
    });

    // 7. Return Success without credentials
    return NextResponse.json({ 
      success: true, 
      teamNumber, 
      teamName,
      status: 'pending' // Tell the frontend to show the pending screen
    });

  } catch (error: any) {
    console.error("API Route Error. Executing Rollback...", error);

    // ROLLBACK MECHANISM: Only need to delete the team now
    if (createdTeamId) {
      await supabaseAdmin.from('teams').delete().eq('id', createdTeamId).catch(console.error);
    }

    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}