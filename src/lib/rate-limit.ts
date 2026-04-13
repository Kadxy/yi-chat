import { NextRequest, NextResponse } from "next/server";

type RateLimitEntry = { count: number; resetAt: number };

const stores = new Map<string, Map<string, RateLimitEntry>>();

function getStore(category: string): Map<string, RateLimitEntry> {
  let store = stores.get(category);
  if (!store) {
    store = new Map();
    stores.set(category, store);
  }
  return store;
}

/**
 * Check if a key is rate limited within a category.
 * Returns remaining requests, or -1 if limited.
 */
export function checkRateLimit(
  category: string,
  key: string,
  limit: number,
  windowMs: number,
): { limited: boolean; remaining: number } {
  const store = getStore(category);
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { limited: false, remaining: limit - 1 };
  }

  entry.count++;
  if (entry.count > limit) {
    return { limited: true, remaining: 0 };
  }
  return { limited: false, remaining: limit - entry.count };
}

/**
 * Extract client IP from request.
 */
export function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "127.0.0.1"
  );
}

/**
 * Rate limit middleware helper. Returns a 429 Response if limited, or null if OK.
 *
 * Usage:
 * ```ts
 * const limited = rateLimit(request, "captcha", { limit: 10, windowMs: 60_000 });
 * if (limited) return limited;
 * ```
 */
export function rateLimit(
  request: NextRequest,
  category: string,
  opts: { limit: number; windowMs: number; key?: string },
): NextResponse | null {
  const key = opts.key ?? getClientIp(request);
  const result = checkRateLimit(category, key, opts.limit, opts.windowMs);

  if (result.limited) {
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(opts.windowMs / 1000)) },
      },
    );
  }
  return null;
}

// Cleanup stale entries every 5 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const store of stores.values()) {
    for (const [key, entry] of store) {
      if (now > entry.resetAt) store.delete(key);
    }
  }
}, 5 * 60_000).unref();
