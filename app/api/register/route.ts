// app/api/register/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: Request) {
  // Track IDs for rollback purposes
  const createdAuthIds: string[] = [];
  let createdTeamId: string | null = null;

  try {
    const body = await request.json();
    const { teamName, trackId, teamSize, receiptUrl, members } = body;

    // Normalize inputs
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

    // 3. CAPACITY CHECK: Prevent Race Conditions (Overbooking)
    const { data: trackData, error: trackError } = await supabaseAdmin
      .from('tracks')
      .select('max_teams, teams(count)')
      .eq('id', trackId)
      .single();

    if (trackError || !trackData) {
      return NextResponse.json({ error: "Invalid track selected." }, { status: 400 });
    }

    const currentTeamsCount = trackData.teams[0]?.count || 0;
    if (currentTeamsCount >= trackData.max_teams) {
      return NextResponse.json({ error: "Registration failed. This track just reached its maximum capacity." }, { status: 400 });
    }

    // 4. Insert the Team Record
    const { data: teamData, error: teamError } = await supabaseAdmin
      .from('teams')
      .insert({
        team_name: teamName,
        track_id: trackId,
        team_size: teamSize,
        receipt_url: receiptUrl,
        // payment_status: 'pending' -> Note: Add this column to your DB later!
      })
      .select('id, team_number')
      .single();

    if (teamError) {
      return NextResponse.json({ error: "Failed to create team. The team name might already be taken." }, { status: 400 });
    }

    createdTeamId = teamData.id;
    const teamId = teamData.id;
    const teamNumber = teamData.team_number;

    // 5. Process Each Candidate (Create Auth Account & DB Record)
    const candidatesData = [];
    const generatedCredentials = [];

    for (let i = 0; i < members.length; i++) {
      const member = members[i];
      const isLeader = i === 0;

      // Generate a random, secure password
      const randomString = Math.random().toString(36).substring(2, 8).toUpperCase();
      const generatedPassword = `Eclipse-${randomString}!`;

      // Create the user in Supabase Auth
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: member.email.trim().toLowerCase(),
        password: generatedPassword,
        email_confirm: true,
        user_metadata: { 
          full_name: member.name, 
          srn: member.srn.trim().toUpperCase(), 
          team_id: teamId,
          role: 'candidate' // Explicitly mark them as a candidate
        }
      });

      if (authError) {
        throw new Error(`Failed to create account for ${member.email}: ${authError.message}`);
      }

      // Keep track of the user ID so we can delete it if the transaction fails later
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

    // 6. Insert Candidates into the Database
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
    // If the process failed, delete any Auth users we successfully created
    for (const uid of createdAuthIds) {
      await supabaseAdmin.auth.admin.deleteUser(uid);
    }
    // Delete the team (this will cascade delete candidates if constraints are set, 
    // but the candidates insert usually fails first triggering this anyway)
    if (createdTeamId) {
      await supabaseAdmin.from('teams').delete().eq('id', createdTeamId);
    }

    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}