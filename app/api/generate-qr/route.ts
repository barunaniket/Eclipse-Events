// app/api/generate-qr/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAuthenticatedUser } from '@/lib/server-auth';
import { generateSecureToken, hashToken, QR_TTL_SECONDS } from '@/lib/security';

export async function POST(request: Request) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if (auth.error) {
      return auth.error;
    }

    const { teamId } = await request.json();

    if (!teamId) {
      return NextResponse.json({ error: "Missing team ID" }, { status: 400 });
    }

    const userTeamId = auth.user.user_metadata?.team_id;
    const userRole = auth.user.user_metadata?.role;

    if (userRole !== 'candidate' || !userTeamId || userTeamId !== teamId) {
      return NextResponse.json({ error: "You are not allowed to generate a pass for this team." }, { status: 403 });
    }

    const token = generateSecureToken(8);
    const tokenHash = hashToken(token);
    
    // Set expiry to exactly 30 seconds from right now
    const expiresAt = new Date(Date.now() + QR_TTL_SECONDS * 1000).toISOString();

    const { error, count } = await supabaseAdmin
      .from('teams')
      .update({ qr_token: tokenHash, qr_expires_at: expiresAt }, { count: 'exact' })
      .eq('id', teamId)
      .eq('payment_status', 'approved');

    if (error) throw error;
    if (!count) {
      return NextResponse.json({ error: "Team not found or not approved." }, { status: 404 });
    }

    return NextResponse.json({ success: true, token, expiresAt });

  } catch (error: any) {
    console.error("QR Generation Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate token" },
      { status: 500 }
    );
  }
}
