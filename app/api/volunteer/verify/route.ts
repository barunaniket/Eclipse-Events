import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireRole } from '@/lib/server-auth';
import { hashToken } from '@/lib/security';

type ScanMode = 'is_present' | 'lunch_received' | 'snacks_received';

const MODE_LABELS: Record<ScanMode, string> = {
  is_present: 'Checked In',
  lunch_received: 'Lunch Distributed',
  snacks_received: 'Snacks Distributed',
};

const isValidMode = (value: unknown): value is ScanMode => {
  return value === 'is_present' || value === 'lunch_received' || value === 'snacks_received';
};

const MODE_BY_CODE: Record<string, ScanMode> = {
  C: 'is_present',
  L: 'lunch_received',
  S: 'snacks_received',
};

const clearTeamToken = async (teamId: string) => {
  await supabaseAdmin.from('teams').update({ qr_token: null, qr_expires_at: null }).eq('id', teamId);
};

export async function POST(request: Request) {
  const auth = await requireRole(request, ['admin', 'volunteer']);
  if (auth.error) {
    return auth.error;
  }

  try {
    const body = await request.json();
    const action = body?.action;
    const activeMode = body?.activeMode;

    if (!isValidMode(activeMode)) {
      return NextResponse.json({ error: 'Invalid scan mode.' }, { status: 400 });
    }

    if (action === 'scan') {
      const input = typeof body?.input === 'string' ? body.input.trim() : '';
      if (!input) {
        return NextResponse.json({ error: 'Missing scan input.' }, { status: 400 });
      }

      let teamIdToSearch = input;
      let providedToken: string | null = null;
      let providedUserId: string | null = null;
      let providedMode: ScanMode | null = null;
      const isNumeric = /^\d+$/.test(input);

      if (!isNumeric) {
        try {
          if (input.includes('|')) {
            const [teamId, userId, token, modeCode] = input.split('|');
            teamIdToSearch = teamId;
            providedUserId = userId;
            providedToken = token;
            providedMode = MODE_BY_CODE[modeCode] || null;
          } else {
            const payload = JSON.parse(input);
            teamIdToSearch = payload.teamId || payload.id;
            providedToken = typeof payload.token === 'string' ? payload.token : null;
            providedUserId = typeof payload.userId === 'string' ? payload.userId : null;
            providedMode = isValidMode(payload.mode) ? payload.mode : null;
          }
        } catch {
          if (input.length > 20) {
            return NextResponse.json({ error: "Invalid QR Format. Ask candidate to regenerate." }, { status: 400 });
          }
        }
      }

      let query = supabaseAdmin
        .from('teams')
        .select(`
          id,
          team_name,
          team_number,
          qr_token,
          qr_expires_at,
          tracks (title),
          candidates (id, full_name, srn, is_leader, is_present, lunch_received, snacks_received)
        `)
        .eq('payment_status', 'approved');

      query = isNumeric
        ? query.eq('team_number', parseInt(input, 10))
        : query.eq('id', teamIdToSearch);

      const { data: team, error: fetchError } = await query.single();
      if (fetchError || !team) {
        return NextResponse.json({ error: "Invalid Code or Team not found." }, { status: 404 });
      }

      if (!isNumeric) {
        if (providedMode && providedMode !== activeMode) {
          await clearTeamToken(team.id);
          const modeNames: Record<ScanMode, string> = {
            is_present: "Check-In",
            lunch_received: "Lunch",
            snacks_received: "Snacks"
          };
          return NextResponse.json({ error: `Pass Mismatch! Candidate presented a ${modeNames[providedMode]} pass, but you are scanning for ${modeNames[activeMode]}.` }, { status: 400 });
        }

        if (!providedToken || !team.qr_token || hashToken(providedToken) !== team.qr_token) {
          await clearTeamToken(team.id);
          return NextResponse.json({ error: "Invalid Security Token. Pass has already been used or manipulated." }, { status: 400 });
        }

        const expiresAt = team.qr_expires_at ? new Date(team.qr_expires_at) : null;
        if (!expiresAt || Date.now() > expiresAt.getTime() + 5000) {
          await clearTeamToken(team.id);
          return NextResponse.json({ error: "QR Code Expired. Ask candidate to tap 'Reveal' again." }, { status: 400 });
        }
      }

      if (activeMode === 'is_present' || isNumeric || !providedUserId) {
        if (!isNumeric) {
          await clearTeamToken(team.id);
        }

        return NextResponse.json({
          action: 'verify_team',
          team,
        });
      }

      const candidate = team.candidates.find((entry: any) => entry.id === providedUserId);
      if (!candidate) {
        await clearTeamToken(team.id);
        return NextResponse.json({ error: "Candidate not found in this team." }, { status: 404 });
      }

      if (candidate[activeMode]) {
        await clearTeamToken(team.id);
        return NextResponse.json({ error: `Already Claimed: ${candidate.full_name} has already received this.` }, { status: 400 });
      }

      const { error: updateError } = await supabaseAdmin
        .from('candidates')
        .update({ [activeMode]: true })
        .eq('id', providedUserId)
        .eq('team_id', team.id);

      if (updateError) {
        throw updateError;
      }

      await clearTeamToken(team.id);

      return NextResponse.json({
        action: 'success',
        message: `Verified: ${candidate.full_name} (${MODE_LABELS[activeMode]})`,
      });
    }

    if (action === 'confirm') {
      const teamId = typeof body?.teamId === 'string' ? body.teamId.trim() : '';
      const selectedMemberIds = Array.isArray(body?.selectedMemberIds)
        ? body.selectedMemberIds.filter((value: unknown): value is string => typeof value === 'string' && value.trim().length > 0)
        : [];

      if (!teamId || selectedMemberIds.length === 0) {
        return NextResponse.json({ error: 'Missing team verification details.' }, { status: 400 });
      }

      const { data: team, error: fetchError } = await supabaseAdmin
        .from('teams')
        .select('id, payment_status, candidates(id)')
        .eq('id', teamId)
        .single();

      if (fetchError || !team || team.payment_status !== 'approved') {
        return NextResponse.json({ error: 'Team not found or not approved.' }, { status: 404 });
      }

      const teamCandidateIds = new Set(team.candidates.map((candidate: any) => candidate.id));
      if (selectedMemberIds.some((candidateId) => !teamCandidateIds.has(candidateId))) {
        return NextResponse.json({ error: 'Selected members do not belong to this team.' }, { status: 400 });
      }

      const { error: updateError } = await supabaseAdmin
        .from('candidates')
        .update({ [activeMode]: true })
        .in('id', selectedMemberIds)
        .eq('team_id', teamId);

      if (updateError) {
        throw updateError;
      }

      await clearTeamToken(teamId);

      return NextResponse.json({
        action: 'success',
        message: `Successfully recorded: ${MODE_LABELS[activeMode]} for ${selectedMemberIds.length} member(s).`,
      });
    }

    return NextResponse.json({ error: 'Invalid verification action.' }, { status: 400 });
  } catch (error: any) {
    console.error('Volunteer verification failed:', error);
    return NextResponse.json({ error: error.message || 'Verification failed.' }, { status: 500 });
  }
}
