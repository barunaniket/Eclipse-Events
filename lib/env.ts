const getRequiredEnv = (key: string) => {
  const value = process.env[key];

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
};

export const publicEnv = {
  supabaseUrl: getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: getRequiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  turnstileSiteKey: getRequiredEnv('NEXT_PUBLIC_TURNSTILE_SITE_KEY'),
};

export const serverEnv = {
  get supabaseUrl() {
    return publicEnv.supabaseUrl;
  },
  get supabaseAnonKey() {
    return publicEnv.supabaseAnonKey;
  },
  get supabaseServiceRoleKey() {
    return getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY');
  },
  get emailUser() {
    return getRequiredEnv('EMAIL_USER');
  },
  get turnstileSecretKey() {
    return getRequiredEnv('TURNSTILE_SECRET_KEY');
  },
  get resendApiKey() {
    return getRequiredEnv('RESEND_API_KEY');
  },
  get emailFrom() {
    return getRequiredEnv('EMAIL_FROM');
  },
};
