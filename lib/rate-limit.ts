type Entry = {
  count: number;
  resetAt: number;
};

const registrations = new Map<string, Entry>();

export const checkRateLimit = (key: string, limit: number, windowMs: number) => {
  const now = Date.now();
  const existing = registrations.get(key);

  if (!existing || existing.resetAt <= now) {
    registrations.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  if (existing.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  registrations.set(key, existing);
  return { allowed: true, remaining: limit - existing.count };
};
