import { createHash, randomBytes } from 'crypto';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { serverEnv } from '@/lib/env';

export const RECEIPTS_BUCKET = 'receipts';
export const RECEIPT_URL_TTL_SECONDS = 60 * 10;
export const QR_TTL_SECONDS = 30;

export const generateSecureToken = (size = 16) => {
  return randomBytes(size).toString('hex').toUpperCase();
};

export const generateSecurePassword = () => {
  return `Eclipse-${randomBytes(6).toString('base64url')}!`;
};

export const hashToken = (value: string) => {
  return createHash('sha256').update(value).digest('hex');
};

const SUPPORTED_RECEIPT_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'pdf']);
const STORAGE_PATH_PATTERN = /^[a-zA-Z0-9/_-]+\.[a-zA-Z0-9]+$/;

export const normalizeReceiptPath = (value: string, supabaseUrl: string) => {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new Error('Payment receipt is missing.');
  }

  if (/^https?:\/\//i.test(trimmed)) {
    const parsed = new URL(trimmed);
    const expectedPrefix = `/storage/v1/object/${RECEIPTS_BUCKET}/`;
    const publicPrefix = `/storage/v1/object/public/${RECEIPTS_BUCKET}/`;
    const signPrefix = `/storage/v1/object/sign/${RECEIPTS_BUCKET}/`;
    const host = new URL(supabaseUrl).host;

    if (parsed.host !== host) {
      throw new Error('Receipt URL must point to project storage.');
    }

    const matchedPrefix = [expectedPrefix, publicPrefix, signPrefix].find((prefix) => parsed.pathname.startsWith(prefix));
    if (!matchedPrefix) {
      throw new Error('Receipt URL must point to the receipts bucket.');
    }

    return decodeURIComponent(parsed.pathname.slice(matchedPrefix.length));
  }

  if (!STORAGE_PATH_PATTERN.test(trimmed) || trimmed.includes('..')) {
    throw new Error('Invalid receipt path.');
  }

  const extension = trimmed.split('.').pop()?.toLowerCase() || '';
  if (!SUPPORTED_RECEIPT_EXTENSIONS.has(extension)) {
    throw new Error('Invalid receipt file type.');
  }

  return trimmed.replace(/^\/+/, '');
};

export const getClientIp = (headerValue: string | null) => {
  if (!headerValue) {
    return 'unknown';
  }

  return headerValue.split(',')[0]?.trim() || 'unknown';
};

export const verifyTurnstileToken = async (token: string, remoteip: string) => {
  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      secret: serverEnv.turnstileSecretKey,
      response: token,
      remoteip,
    }),
  });

  if (!response.ok) {
    throw new Error('CAPTCHA verification failed.');
  }

  const data = await response.json() as { success?: boolean };
  return Boolean(data.success);
};

export const assertPrivateReceiptsBucket = async () => {
  const { data, error } = await supabaseAdmin.storage.getBucket(RECEIPTS_BUCKET);

  if (error) {
    throw error;
  }

  if (data?.public) {
    throw new Error('The receipts bucket must be private.');
  }
};
