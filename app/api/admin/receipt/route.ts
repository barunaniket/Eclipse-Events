import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireRole } from '@/lib/server-auth';
import { assertPrivateReceiptsBucket, normalizeReceiptPath, RECEIPT_URL_TTL_SECONDS } from '@/lib/security';
import { serverEnv } from '@/lib/env';

export async function GET(request: Request) {
  const auth = await requireRole(request, ['admin']);
  if (auth.error) {
    return auth.error;
  }

  try {
    const url = new URL(request.url);
    const rawPath = url.searchParams.get('path') || '';
    const receiptPath = normalizeReceiptPath(rawPath, serverEnv.supabaseUrl);
    await assertPrivateReceiptsBucket();

    const { data, error } = await supabaseAdmin.storage
      .from('receipts')
      .createSignedUrl(receiptPath, RECEIPT_URL_TTL_SECONDS);

    if (error) {
      throw error;
    }

    return NextResponse.json({ signedUrl: data.signedUrl });
  } catch (error: any) {
    console.error('Receipt URL generation failed:', error);
    return NextResponse.json({ error: error.message || 'Failed to load receipt.' }, { status: 400 });
  }
}
