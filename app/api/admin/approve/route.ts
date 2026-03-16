// app/api/admin/approve/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { sendCredentialEmail } from '@/lib/mailer';
export async function POST(request: Request) {
  const createdAuthIds: string[] = [];

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
    const { teamId } = body;

    if (!teamId || typeof teamId !== 'string') {
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

    const candidates = team.candidates as Array<{
      id: string;
      full_name: string;
      email: string;
      srn: string;
      is_leader: boolean;
    }>;
    const generatedCredentials: Array<{
      name: string;
      email: string;
      password: string;
      role: string;
    }> = [];

    // 2. Create Auth Accounts for each candidate securely
    for (const candidate of candidates) {
      // Generate cryptographically secure 8-character password
      const buf = new Uint8Array(4);
      crypto.getRandomValues(buf);
      const randomString = Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
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

    // 4. Dispatch Emails (await so Workers don't drop the tasks)
    // We pass the team_number here so it renders in the email!
    const emailResults = await Promise.allSettled(
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
    );

    const emailFailures = emailResults
      .map((result, idx) => {
        if (result.status === 'rejected') {
          const reason = (result.reason && (result.reason.message || String(result.reason))) || 'Unknown error';
          return { email: generatedCredentials[idx].email, reason };
        }
        return null;
      })
      .filter(Boolean) as Array<{ email: string; reason: string }>;

    if (emailFailures.length > 0) {
      console.warn(`${emailFailures.length} approval emails failed to send for team ${team.team_name}.`, emailFailures);
    }

    return NextResponse.json({
      success: true,
      emailsSent: generatedCredentials.length - emailFailures.length,
      emailsFailed: emailFailures.length,
      emailFailures
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
