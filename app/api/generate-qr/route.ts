// app/api/generate-qr/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: Request) {
  try {
    const { teamId } = await request.json();

    if (!teamId) {
      return NextResponse.json({ error: "Missing team ID" }, { status: 400 });
    }

    // Generate a random 6-character alphanumeric token
    const token = Math.random().toString(36).substring(2, 8).toUpperCase();
    
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