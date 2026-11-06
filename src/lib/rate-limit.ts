import { createHash } from "node:crypto";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

import { env, isUpstashConfigured } from "@/lib/env";

export type RateLimitKind = "format" | "spell";

export interface RateLimitResult {
  ok: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfter: number;
}

const WINDOW_MS = 60_000;

interface UpstashLimiter {
  limit: (
    identifier: string,
  ) => Promise<{ success: boolean; limit: number; remaining: number; reset: number }>;
}

interface MemoryBucket {
  count: number;
  resetAt: number;
}

const upstashLimiters = new Map<RateLimitKind, UpstashLimiter>();
const memoryBuckets = new Map<string, MemoryBucket>();

export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    const [firstAddress] = forwardedFor.split(",");
    const address = firstAddress?.trim();

    if (address) {
      return address;
    }
  }

  const realIp = request.headers.get("x-real-ip")?.trim();

  if (realIp) {
    return realIp;
  }

  return "unknown";
}

export function hashClientIp(ip: string): string {
  return createHash("sha256").update(`${ip}${env.ipHashSalt}`).digest("hex");
}

export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
  };
}

function limitFor(kind: RateLimitKind): number {
  return kind === "format" ? env.rateLimitFormat : env.rateLimitSpell;
}

function secondsUntil(resetAt: number, now: number): number {
  return Math.max(1, Math.ceil((resetAt - now) / 1000));
}

function getUpstashLimiter(kind: RateLimitKind): UpstashLimiter {
  const existing = upstashLimiters.get(kind);

  if (existing) {
    return existing;
  }

  const redis = new Redis({ url: env.upstashUrl, token: env.upstashToken });
  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.fixedWindow(limitFor(kind), "60 s"),
    prefix: "laudo-format",
  });

  upstashLimiters.set(kind, limiter);
  return limiter;
}

function memoryLimit(identifier: string, limit: number, now: number): RateLimitResult {
  for (const [key, bucket] of memoryBuckets) {
    if (bucket.resetAt <= now) {
      memoryBuckets.delete(key);
    }
  }

  const bucket = memoryBuckets.get(identifier);

  if (!bucket || bucket.resetAt <= now) {
    const resetAt = now + WINDOW_MS;
    memoryBuckets.set(identifier, { count: 1, resetAt });
    return { ok: true, limit, remaining: limit - 1, resetAt, retryAfter: 0 };
  }

  if (bucket.count >= limit) {
    return {
      ok: false,
      limit,
      remaining: 0,
      resetAt: bucket.resetAt,
      retryAfter: secondsUntil(bucket.resetAt, now),
    };
  }

  bucket.count += 1;
  return {
    ok: true,
    limit,
    remaining: limit - bucket.count,
    resetAt: bucket.resetAt,
    retryAfter: 0,
  };
}

export async function checkRateLimit(
  kind: RateLimitKind,
  request: Request,
): Promise<RateLimitResult> {
  const limit = limitFor(kind);
  const now = Date.now();
  const identifier = `${kind}:${hashClientIp(getClientIp(request))}`;

  if (isUpstashConfigured()) {
    try {
      const result = await getUpstashLimiter(kind).limit(identifier);

      return {
        ok: result.success,
        limit: result.limit,
        remaining: result.remaining,
        resetAt: result.reset,
        retryAfter: result.success ? 0 : secondsUntil(result.reset, now),
      };
    } catch {
      return memoryLimit(identifier, limit, now);
    }
  }

  return memoryLimit(identifier, limit, now);
}
