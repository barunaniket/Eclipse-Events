// app/api/register/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { sendPendingRegistrationEmail } from '@/lib/mailer'; // We will create this in the next step

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let createdTeamId: string | null = null;

  try {
    const body = await request.json();
    const { teamName, trackId, teamSize, receiptUrl, members } = body;

    // Input validation
    if (!teamName || typeof teamName !== 'string' || teamName.trim().length === 0 || teamName.trim().length > 100) {
      return NextResponse.json({ error: "Invalid team name." }, { status: 400 });
    }
    if (!trackId || typeof trackId !== 'string') {
      return NextResponse.json({ error: "Invalid track selection." }, { status: 400 });
    }
    if (typeof teamSize !== 'number' || teamSize < 1 || teamSize > 4) {
      return NextResponse.json({ error: "Team size must be between 1 and 4." }, { status: 400 });
    }
    if (!receiptUrl || typeof receiptUrl !== 'string' || !receiptUrl.startsWith('https://')) {
      return NextResponse.json({ error: "Invalid receipt URL." }, { status: 400 });
    }
    if (!Array.isArray(members) || members.length !== teamSize) {
      return NextResponse.json({ error: "Member data is invalid." }, { status: 400 });
    }
    for (const member of members) {
      if (!member.name || !member.email || !member.phone || !member.srn) {
        return NextResponse.json({ error: "All member fields are required." }, { status: 400 });
      }
      if (!EMAIL_REGEX.test(member.email.trim())) {
        return NextResponse.json({ error: `Invalid email format: ${member.email}` }, { status: 400 });
      }
      if (typeof member.name !== 'string' || member.name.trim().length > 100) {
        return NextResponse.json({ error: "Invalid member name." }, { status: 400 });
      }
      if (typeof member.srn !== 'string' || member.srn.trim().length > 20) {
        return NextResponse.json({ error: "Invalid SRN format." }, { status: 400 });
      }
    }

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
        return NextResponse.json(
          { error: "Registration failed. This track just reached its maximum capacity.", dbError: teamError.message },
          { status: 400 }
        );
      }
      if (teamError.message.includes('INVALID_TRACK')) {
        return NextResponse.json(
          { error: "Invalid track selected.", dbError: teamError.message },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: teamError.message || "Failed to create team.", dbError: teamError.message },
        { status: 400 }
      );
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
      console.error("Candidate insertion failed. Rolling back team record...", candidatesError);
      if (createdTeamId) {
        const { error: rollbackError } = await supabaseAdmin.from('teams').delete().eq('id', createdTeamId);
        if (rollbackError) {
          console.error("Failed to rollback team after candidate insert error.", rollbackError);
        }
      }
      return NextResponse.json(
        { error: candidatesError.message || "Failed to insert candidates into the database." },
        { status: 500 }
      );
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
      supabaseAdmin.from('teams').delete().eq('id', createdTeamId).then(null, console.error);
    }

    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
