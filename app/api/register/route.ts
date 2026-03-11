// app/api/register/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { teamName, trackId, teamSize, receiptUrl, members } = body;

    // 1. Insert the Team Record using the Admin Client
    const { data: teamData, error: teamError } = await supabaseAdmin
      .from('teams')
      .insert({
        team_name: teamName,
        track_id: trackId,
        team_size: teamSize,
        receipt_url: receiptUrl
      })
      .select('id, team_number')
      .single();

    if (teamError) {
      console.error("Team Insert Error:", teamError);
      return NextResponse.json({ error: "Failed to create team." }, { status: 400 });
    }

    const teamId = teamData.id;
    const teamNumber = teamData.team_number;

    // 2. Process Each Candidate (Create Auth Account & DB Record)
    const candidatesData = [];
    const generatedCredentials = [];

    for (let i = 0; i < members.length; i++) {
      const member = members[i];
      const isLeader = i === 0;

      // Generate a random, secure password (e.g., Eclipse-4B9X2!)
      const randomString = Math.random().toString(36).substring(2, 8).toUpperCase();
      const generatedPassword = `Eclipse-${randomString}!`;

      // Create the user in Supabase Auth
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: member.email,
        password: generatedPassword,
        email_confirm: true, // Auto-confirm so they don't need to click a link
        user_metadata: { 
          full_name: member.name, 
          srn: member.srn, 
          team_id: teamId 
        }
      });

      if (authError) {
        console.error(`Auth Creation Error for ${member.email}:`, authError);
        // If an email is already registered, you might want to handle that specifically, 
        // but for now we will throw an error to halt the process.
        throw new Error(`Failed to create account for ${member.email}: ${authError.message}`);
      }

      // Store the credentials to send via email later
      generatedCredentials.push({
        name: member.name,
        email: member.email,
        password: generatedPassword
      });

      // Prepare the candidate database record
      candidatesData.push({
        team_id: teamId,
        is_leader: isLeader,
        full_name: member.name,
        srn: member.srn,
        email: member.email,
        phone: member.phone,
        is_present: false,
        lunch_received: false,
        snacks_received: false
      });
    }

    // 3. Insert Candidates into the Database
    const { error: candidatesError } = await supabaseAdmin
      .from('candidates')
      .insert(candidatesData);

    if (candidatesError) {
      console.error("Candidates Insert Error:", candidatesError);
      throw new Error("Failed to insert candidates into the database.");
    }

    // 4. TODO: Nodemailer Integration
    // We will loop through `generatedCredentials` here and blast out the emails
    console.log("Credentials to email later:", generatedCredentials);

    // 5. Return success to the frontend
    return NextResponse.json({ 
      success: true, 
      teamNumber, 
      teamName,
      credentials: generatedCredentials
    });

  } catch (error: any) {
    console.error("API Route Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}