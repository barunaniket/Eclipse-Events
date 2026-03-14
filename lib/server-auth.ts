import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

const getBearerToken = (request: Request) => {
  const authHeader = request.headers.get('authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.slice('Bearer '.length).trim();
};

const isSameOriginRequest = (request: Request) => {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  const protocol = request.headers.get('x-forwarded-proto') || 'https';
  const expectedOrigin = host ? `${protocol}://${host}` : null;

  if (request.method === 'GET' || request.method === 'HEAD') {
    if (!origin) {
      return true;
    }
  }

  if (!expectedOrigin) {
    return false;
  }

  if (origin) {
    return origin === expectedOrigin;
  }

  return referer?.startsWith(expectedOrigin) ?? false;
};

export const rejectUnauthorized = (message = 'Authentication required') => {
  return NextResponse.json({ error: message }, { status: 401 });
};

export const rejectForbidden = (message = 'Forbidden') => {
  return NextResponse.json({ error: message }, { status: 403 });
};

export const requireAuthenticatedUser = async (request: Request) => {
  if (!isSameOriginRequest(request)) {
    return { error: rejectForbidden('Invalid request origin') };
  }

  const accessToken = getBearerToken(request);
  if (!accessToken) {
    return { error: rejectUnauthorized() };
  }

  const { data, error } = await supabaseAdmin.auth.getUser(accessToken);

  if (error || !data.user) {
    return { error: rejectUnauthorized() };
  }

  return { user: data.user, accessToken };
};

export const requireRole = async (request: Request, roles: string[]) => {
  const auth = await requireAuthenticatedUser(request);
  if (auth.error) {
    return auth;
  }

  const role = auth.user.user_metadata?.role;
  if (!roles.includes(role)) {
    return { error: rejectForbidden('Insufficient privileges') };
  }

  return auth;
};
