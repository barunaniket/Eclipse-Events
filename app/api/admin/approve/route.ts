// app/api/admin/approve/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { sendCredentialEmail } from '@/lib/mailer';

export async function POST(request: Request) {
  const createdAuthIds: string[] = [];

  try {
    const body = await request.json();
    const { teamId } = body;

    if (!teamId) {
      return NextResponse.json({ error: "Team ID is required" }, { status: 400 });
    }

    // 1. Fetch the Team and Candidates
    const { data: team, error: fetchError } = await supabaseAdmin
      .from('teams')
      .select(`
        id,
        team_name,
        team_number,
        payment_status,
        candidates (id, full_name, email, srn, is_leader)
      `)
      .eq('id', teamId)
      .single();

    if (fetchError || !team) {
      return NextResponse.json({ error: "Team not found in the database." }, { status: 404 });
    }

    if (team.payment_status === 'approved') {
      return NextResponse.json({ error: "This team has already been approved." }, { status: 400 });
    }

    const candidates = team.candidates;
    const generatedCredentials = [];

    // 2. Create Auth Accounts for each candidate securely
    for (const candidate of candidates) {
      // Generate secure 8-character password
      const randomString = Math.random().toString(36).substring(2, 8).toUpperCase();
      const generatedPassword = `Eclipse-${randomString}!`;
      const roleLabel = candidate.is_leader ? 'Team Leader' : 'Team Member';

      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: candidate.email.trim().toLowerCase(),
        password: generatedPassword,
        email_confirm: true,
        user_metadata: { 
          full_name: candidate.full_name, 
          srn: candidate.srn.trim().toUpperCase(), 
          team_id: team.id,
          role: 'candidate' 
        }
      });

      if (authError) {
        throw new Error(`Auth creation failed for ${candidate.email}: ${authError.message}`);
      }

      // Track created IDs in case we need to rollback
      if (authData.user) {
        createdAuthIds.push(authData.user.id);
      }

      generatedCredentials.push({
        name: candidate.full_name,
        email: candidate.email,
        password: generatedPassword,
        role: roleLabel
      });
    }

    // 3. Update the Team Status to 'approved'
    const { error: updateError } = await supabaseAdmin
      .from('teams')
      .update({ payment_status: 'approved' })
      .eq('id', teamId);

    if (updateError) {
      throw new Error("Failed to update team status to approved in the database.");
    }

    // 4. Dispatch Emails Asynchronously
    // We pass the team_number here so it renders in the email!
    Promise.allSettled(
      generatedCredentials.map(cred => 
        sendCredentialEmail(
          cred.name, 
          cred.email, 
          cred.password, 
          team.team_name,
          team.team_number, 
          cred.role
        )
      )
    ).then(results => {
      const failures = results.filter(r => r.status === 'rejected');
      if (failures.length > 0) {
        console.warn(`${failures.length} approval emails failed to send for team ${team.team_name}.`);
      }
    });

    return NextResponse.json({ 
      success: true, 
      emailsSent: generatedCredentials.length
    });

  } catch (error: any) {
    console.error("Admin Approve Error:", error);

    // ROLLBACK: If it fails halfway, delete any Auth accounts we just made so they aren't stranded
    for (const uid of createdAuthIds) {
      await supabaseAdmin.auth.admin.deleteUser(uid).catch(console.error);
    }

    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}