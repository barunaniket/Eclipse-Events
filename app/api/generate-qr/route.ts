// app/api/generate-qr/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { randomBytes } from 'crypto';

export async function POST(request: Request) {
  try {
    // Verify caller is authenticated
    const authHeader = request.headers.get('authorization');
    const accessToken = authHeader?.replace('Bearer ', '');
    if (!accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(accessToken);
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { teamId } = await request.json();

    if (!teamId || typeof teamId !== 'string') {
      return NextResponse.json({ error: "Missing team ID" }, { status: 400 });
    }

    // Ensure the authenticated user belongs to this team
    if (user.user_metadata?.team_id !== teamId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Generate a cryptographically secure 6-character alphanumeric token
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const bytes = randomBytes(6);
    const token = Array.from(bytes).map(b => chars[b % chars.length]).join('');

    // Set expiry to exactly 30 seconds from right now
    const expiresAt = new Date(Date.now() + 30 * 1000).toISOString();

    // Securely update the database
    const { error } = await supabaseAdmin
      .from('teams')
      .update({ qr_token: token, qr_expires_at: expiresAt })
      .eq('id', teamId);

    if (error) throw error;

    return NextResponse.json({ success: true, token, expiresAt });

  } catch (error: any) {
    console.error("QR Generation Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate token" },
      { status: 500 }
    );
  }
}