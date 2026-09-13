interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) store.delete(key);
  }
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  windowMs: number;
  max: number;
}

export function rateLimit(key: string, config: RateLimitConfig): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true, retryAfterMs: 0 };
  }

  entry.count++;
  if (entry.count > config.max) {
    return { allowed: false, retryAfterMs: entry.resetAt - now };
  }

  return { allowed: true, retryAfterMs: 0 };
}

export function rateLimitHeaders(config: RateLimitConfig, remaining: number, resetMs: number) {
  return {
    "X-RateLimit-Limit": String(config.max),
    "X-RateLimit-Remaining": String(Math.max(0, remaining)),
    "X-RateLimit-Reset": String(Math.ceil((Date.now() + resetMs) / 1000)),
  };
}
