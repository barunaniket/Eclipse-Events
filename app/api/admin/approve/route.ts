// app/api/admin/approve/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { sendCredentialEmail } from '@/lib/mailer';
import { requireRole } from '@/lib/server-auth';
import { generateSecurePassword } from '@/lib/security';
import { logAdminAction } from '@/lib/admin-actions';

export async function POST(request: Request) {
  const createdAuthIds: string[] = [];

  try {
    const auth = await requireRole(request, ['admin']);
    if (auth.error) {
      return auth.error;
    }

    const body = await request.json();
    const teamId = typeof body?.teamId === 'string' ? body.teamId.trim() : '';

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

    console.info('Admin approval requested', {
      adminId: auth.user.id,
      adminEmail: auth.user.email,
      teamId,
    });

    const candidates = team.candidates;
    const generatedCredentials = [];
    const siteOrigin = request.headers.get('origin') || `${request.headers.get('x-forwarded-proto') || 'https'}://${request.headers.get('x-forwarded-host') || request.headers.get('host')}`;

    // 2. Create Auth Accounts for each candidate securely
    for (const candidate of candidates) {
      const generatedPassword = generateSecurePassword();
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

      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email: candidate.email.trim().toLowerCase(),
        options: {
          redirectTo: `${siteOrigin}/candidate/login`,
        },
      });

      if (linkError) {
        throw new Error(`Failed to generate onboarding link for ${candidate.email}: ${linkError.message}`);
      }

      if (!linkData.properties?.action_link) {
        throw new Error(`Failed to generate onboarding link for ${candidate.email}.`);
      }

      generatedCredentials.push({
        name: candidate.full_name,
        email: candidate.email,
        onboardingLink: linkData.properties.action_link,
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
          cred.onboardingLink, 
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

    await logAdminAction({
      action: 'approve',
      adminId: auth.user.id,
      adminEmail: auth.user.email,
      teamId,
      metadata: { emailsSent: generatedCredentials.length },
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
