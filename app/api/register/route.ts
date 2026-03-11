// app/api/register/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: Request) {
  const createdAuthIds: string[] = [];
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
    // This entirely eliminates the race condition
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

    // RPC returns an array, we grab the first object
    createdTeamId = teamData[0].new_team_id;
    const teamId = teamData[0].new_team_id;
    const teamNumber = teamData[0].new_team_number;

    // 4. Process Each Candidate (Create Auth Account & DB Record)
    const candidatesData = [];
    const generatedCredentials = [];

    for (let i = 0; i < members.length; i++) {
      const member = members[i];
      const isLeader = i === 0;

      const randomString = Math.random().toString(36).substring(2, 8).toUpperCase();
      const generatedPassword = `Eclipse-${randomString}!`;

      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: member.email.trim().toLowerCase(),
        password: generatedPassword,
        email_confirm: true,
        user_metadata: { 
          full_name: member.name, 
          srn: member.srn.trim().toUpperCase(), 
          team_id: teamId,
          role: 'candidate' 
        }
      });

      if (authError) {
        throw new Error(`Failed to create account for ${member.email}: ${authError.message}`);
      }

      if (authData.user) {
        createdAuthIds.push(authData.user.id);
      }

      generatedCredentials.push({
        name: member.name,
        email: member.email,
        password: generatedPassword
      });

      candidatesData.push({
        team_id: teamId,
        is_leader: isLeader,
        full_name: member.name,
        srn: member.srn.trim().toUpperCase(),
        email: member.email.trim().toLowerCase(),
        phone: member.phone,
        is_present: false,
        lunch_received: false,
        snacks_received: false
      });
    }

    // 5. Insert Candidates into the Database
    const { error: candidatesError } = await supabaseAdmin
      .from('candidates')
      .insert(candidatesData);

    if (candidatesError) {
      throw new Error("Failed to insert candidates into the database.");
    }

    // TODO: Nodemailer Integration here later

    return NextResponse.json({ 
      success: true, 
      teamNumber, 
      teamName,
      credentials: generatedCredentials
    });

  } catch (error: any) {
    console.error("API Route Error. Executing Rollback...", error);

    // ROLLBACK MECHANISM
    for (const uid of createdAuthIds) {
      await supabaseAdmin.auth.admin.deleteUser(uid);
    }
    
    if (createdTeamId) {
      await supabaseAdmin.from('teams').delete().eq('id', createdTeamId);
    }

    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}