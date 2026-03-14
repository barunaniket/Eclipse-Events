// app/api/register/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { sendPendingRegistrationEmail } from '@/lib/mailer';
import { checkRateLimit } from '@/lib/rate-limit';
import { serverEnv } from '@/lib/env';
import { assertPrivateReceiptsBucket, getClientIp, normalizeReceiptPath, verifyTurnstileToken } from '@/lib/security';

export async function POST(request: Request) {
  let createdTeamId: string | null = null;
  let normalizedReceiptPath: string | null = null;

  try {
    const clientIp = getClientIp(request.headers.get('x-forwarded-for'));
    const rateLimit = checkRateLimit(`register:${clientIp}`, 5, 60 * 60 * 1000);
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: "Too many registration attempts. Please try again later." }, { status: 429 });
    }

    const body = await request.json();
    const { teamName, trackId, teamSize, receiptUrl, members, captchaToken } = body;
    const normalizedTeamName = typeof teamName === 'string' ? teamName.trim() : '';
    const normalizedTrackId = typeof trackId === 'string' ? trackId.trim() : '';
    const normalizedTeamSize = Number(teamSize);
    normalizedReceiptPath = normalizeReceiptPath(String(receiptUrl || ''), serverEnv.supabaseUrl);
    const normalizedCaptchaToken = typeof captchaToken === 'string' ? captchaToken.trim() : '';

    if (!normalizedCaptchaToken) {
      return NextResponse.json({ error: "CAPTCHA verification is required." }, { status: 400 });
    }

    const captchaValid = await verifyTurnstileToken(normalizedCaptchaToken, clientIp);
    if (!captchaValid) {
      return NextResponse.json({ error: "CAPTCHA verification failed." }, { status: 400 });
    }

    await assertPrivateReceiptsBucket();

    if (!normalizedTeamName || !normalizedTrackId || !Number.isInteger(normalizedTeamSize) || normalizedTeamSize < 1 || normalizedTeamSize > 4 || !Array.isArray(members) || members.length !== normalizedTeamSize) {
      return NextResponse.json({ error: "Invalid registration payload." }, { status: 400 });
    }

    const normalizedMembers = members.map((member: any) => ({
      name: typeof member?.name === 'string' ? member.name.trim() : '',
      email: typeof member?.email === 'string' ? member.email.trim().toLowerCase() : '',
      phone: typeof member?.phone === 'string' ? member.phone.trim() : '',
      srn: typeof member?.srn === 'string' ? member.srn.trim().toUpperCase() : '',
    }));

    if (normalizedMembers.some((member) => !member.name || !member.email || !member.phone || !member.srn)) {
      return NextResponse.json({ error: "All team member details are required." }, { status: 400 });
    }

    const emails = normalizedMembers.map((member) => member.email);
    const srns = normalizedMembers.map((member) => member.srn);

    if (new Set(emails).size !== emails.length) {
      return NextResponse.json({ error: "Duplicate entry: Team member emails must be unique." }, { status: 400 });
    }

    if (new Set(srns).size !== srns.length) {
      return NextResponse.json({ error: "Duplicate entry: Team member SRNs must be unique." }, { status: 400 });
    }

    const { data: existingCandidates, error: duplicateLookupError } = await supabaseAdmin
      .from('candidates')
      .select('email, srn')
      .or(`email.in.(${emails.map((email) => `"${email}"`).join(',')}),srn.in.(${srns.map((srn) => `"${srn}"`).join(',')})`);

    if (duplicateLookupError) {
      throw duplicateLookupError;
    }

    const duplicateEmail = existingCandidates?.find((candidate) => emails.includes(candidate.email));
    if (duplicateEmail) {
      return NextResponse.json({ error: `Duplicate entry: Email ${duplicateEmail.email} is already registered.` }, { status: 400 });
    }

    const duplicateSrn = existingCandidates?.find((candidate) => srns.includes(candidate.srn));
    if (duplicateSrn) {
      return NextResponse.json({ error: `Duplicate entry: SRN ${duplicateSrn.srn} is already registered.` }, { status: 400 });
    }

    // 3. ATOMIC CAPACITY CHECK & INSERTION (RPC)
    const { data: teamData, error: teamError } = await supabaseAdmin.rpc(
      'register_team_with_capacity_check', 
      {
        p_team_name: normalizedTeamName,
        p_track_id: normalizedTrackId,
        p_team_size: normalizedTeamSize,
        p_receipt_url: normalizedReceiptPath
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
    const candidatesData = normalizedMembers.map((member, index: number) => ({
      team_id: teamId,
      is_leader: index === 0,
      full_name: member.name,
      srn: member.srn,
      email: member.email,
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
      if (candidatesError.code === '23505') {
        const duplicateField = candidatesError.message.includes('srn') ? 'SRN' : 'Email';
        throw new Error(`Duplicate entry: ${duplicateField} is already registered.`);
      }
      throw new Error("Failed to insert candidates into the database.");
    }

    // 6. Send "Pending Approval" Email to the Team Leader (Asynchronously)
    const leader = normalizedMembers[0];
    sendPendingRegistrationEmail(leader.name, leader.email, normalizedTeamName).catch((err) => {
      console.warn("Failed to send pending email to leader, but registration succeeded.", err);
    });

    // 7. Return Success without credentials
    return NextResponse.json({ 
      success: true, 
      teamNumber, 
      teamName: normalizedTeamName,
      status: 'pending' // Tell the frontend to show the pending screen
    });

  } catch (error: any) {
    console.error("API Route Error. Executing Rollback...", error);

    // ROLLBACK MECHANISM: Only need to delete the team now
    if (createdTeamId) {
      await supabaseAdmin.from('teams').delete().eq('id', createdTeamId).catch(console.error);
    }

    if (normalizedReceiptPath) {
      await supabaseAdmin.storage.from('receipts').remove([normalizedReceiptPath]).catch(console.error);
    }

    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
