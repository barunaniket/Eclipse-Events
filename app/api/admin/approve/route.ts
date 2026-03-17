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
    console.log(`[approve] Fetching team ${teamId}...`);
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
      console.error('[approve] Team fetch failed:', fetchError);
      return NextResponse.json({ error: "Team not found in the database." }, { status: 404 });
    }

    if (team.payment_status === 'approved') {
      return NextResponse.json({ error: "This team has already been approved." }, { status: 400 });
    }

    const candidates = (team.candidates ?? []) as Array<{
      id: string;
      full_name: string;
      email: string;
      srn: string;
      is_leader: boolean;
    }>;

    console.log(`[approve] Team "${team.team_name}" fetched with ${candidates.length} candidate(s).`);

    if (candidates.length === 0) {
      console.error('[approve] No candidates found for team — aborting.');
      return NextResponse.json({ error: "No candidates found for this team. Cannot approve." }, { status: 400 });
    }

    const generatedCredentials: Array<{
      name: string;
      email: string;
      password: string;
      role: string;
    }> = [];

    // 2. Create Auth Accounts for each candidate securely
    for (const candidate of candidates) {
      console.log(`[approve] Creating auth account for ${candidate.email}...`);
      const buf = new Uint8Array(4);
      crypto.getRandomValues(buf);
      const randomString = Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
      const generatedPassword = `Eclipse-${randomString}!`;
      const roleLabel = candidate.is_leader ? 'Team Leader' : 'Team Member';

      const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
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

      if (createError) {
        console.error(`[approve] Auth creation FAILED for ${candidate.email}:`, createError.message);
        throw new Error(`Auth creation failed for ${candidate.email}: ${createError.message}`);
      }

      console.log(`[approve] Auth account created for ${candidate.email} (uid: ${authData.user?.id})`);

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
    console.log(`[approve] Updating team status to approved...`);
    const { error: updateError } = await supabaseAdmin
      .from('teams')
      .update({ payment_status: 'approved' })
      .eq('id', teamId);

    if (updateError) {
      console.error('[approve] Status update failed:', updateError.message);
      throw new Error("Failed to update team status to approved in the database.");
    }

    // 4. Dispatch credential emails (await so Workers don't drop the tasks)
    const teamNumber = team.team_number;
    if (teamNumber == null) {
      console.error(`[approve] team_number is null for team ${team.team_name} — cannot send credential emails.`);
      return NextResponse.json({ error: "Team number is missing in the database. Cannot send credentials." }, { status: 500 });
    }

    console.log(`[approve] Sending ${generatedCredentials.length} credential email(s) for team #${teamNumber}...`);
    const emailResults = await Promise.allSettled(
      generatedCredentials.map(cred => {
        console.log(`[approve] Calling sendCredentialEmail → to: ${cred.email}, team: ${team.team_name}, number: ${teamNumber}`);
        return sendCredentialEmail(
          cred.name,
          cred.email,
          cred.password,
          team.team_name,
          teamNumber,
          cred.role
        );
      })
    );

    console.log(`[approve] emailResults (${emailResults.length} total):`, JSON.stringify(emailResults.map((r, i) => ({
      email: generatedCredentials[i]?.email,
      status: r.status,
      reason: r.status === 'rejected' ? String((r as any).reason) : undefined,
    }))));

    const emailFailures = emailResults
      .map((result, idx) => {
        if (result.status === 'rejected') {
          const reason = (result.reason && (result.reason.message || String(result.reason))) || 'Unknown error';
          console.error(`[approve] Email FAILED for ${generatedCredentials[idx].email}: ${reason}`);
          return { email: generatedCredentials[idx].email, reason };
        }
        console.log(`[approve] Email sent OK to ${generatedCredentials[idx].email}`);
        return null;
      })
      .filter(Boolean) as Array<{ email: string; reason: string }>;

    return NextResponse.json({
      success: true,
      emailsSent: generatedCredentials.length - emailFailures.length,
      emailsFailed: emailFailures.length,
      emailFailures
    });

  } catch (error: any) {
    console.error('[approve] Fatal error:', error.message ?? error);

    // ROLLBACK: delete any Auth accounts we just created so they aren't stranded
    for (const uid of createdAuthIds) {
      await supabaseAdmin.auth.admin.deleteUser(uid).catch(console.error);
    }

    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
