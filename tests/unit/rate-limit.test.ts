import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const upstash = vi.hoisted(() => ({
  limit: vi.fn(),
  fixedWindow: vi.fn(() => "fixed-window"),
}));

vi.mock("@upstash/redis", () => ({
  Redis: class {},
}));

vi.mock("@upstash/ratelimit", () => ({
  Ratelimit: class {
    static fixedWindow = upstash.fixedWindow;
    limit = upstash.limit;
  },
}));

function requestWithIp(ip?: string): Request {
  return new Request("http://localhost/api/format", {
    method: "POST",
    headers: ip ? { "x-forwarded-for": ip } : {},
    body: "{}",
  });
}

describe("sem Upstash: fallback em memória", () => {
  let rateLimit: typeof import("@/lib/rate-limit");
  let env: typeof import("@/lib/env").env;

  beforeAll(async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    vi.resetModules();
    ({ env } = await import("@/lib/env"));
    rateLimit = await import("@/lib/rate-limit");
  });

  afterAll(() => {
    vi.unstubAllEnvs();
  });

  it("lê o IP do primeiro endereço de x-forwarded-for", () => {
    const request = new Request("http://localhost", {
      headers: { "x-forwarded-for": "203.0.113.9, 198.51.100.7" },
    });

    expect(rateLimit.getClientIp(request)).toBe("203.0.113.9");
  });

  it("usa x-real-ip quando não há encaminhamento", () => {
    const request = new Request("http://localhost", { headers: { "x-real-ip": "198.51.100.7" } });

    expect(rateLimit.getClientIp(request)).toBe("198.51.100.7");
  });

  it("retorna unknown sem cabeçalhos de IP", () => {
    expect(rateLimit.getClientIp(new Request("http://localhost"))).toBe("unknown");
  });

  it("gera hash estável, opaco e por IP", () => {
    const hashA = rateLimit.hashClientIp("203.0.113.10");
    const hashB = rateLimit.hashClientIp("203.0.113.11");

    expect(hashA).toMatch(/^[0-9a-f]{64}$/);
    expect(hashA).toBe(rateLimit.hashClientIp("203.0.113.10"));
    expect(hashA).not.toBe(hashB);
    expect(hashA).not.toContain("203.0.113.10");
  });

  it("expõe os headers X-RateLimit-*", () => {
    const headers = rateLimit.rateLimitHeaders({
      ok: true,
      limit: 10,
      remaining: 7,
      resetAt: 1_800_000_000_000,
      retryAfter: 0,
    });

    expect(headers).toEqual({
      "X-RateLimit-Limit": "10",
      "X-RateLimit-Remaining": "7",
      "X-RateLimit-Reset": "1800000000",
    });
  });

  it("libera as requisições até o limite e depois nega com Retry-After", async () => {
    const limit = env.rateLimitFormat;

    for (let index = 0; index < limit; index += 1) {
      const result = await rateLimit.checkRateLimit("format", requestWithIp("203.0.113.20"));

      expect(result.ok).toBe(true);
      expect(result.remaining).toBe(limit - index - 1);
    }

    const denied = await rateLimit.checkRateLimit("format", requestWithIp("203.0.113.20"));

    expect(denied.ok).toBe(false);
    expect(denied.limit).toBe(limit);
    expect(denied.remaining).toBe(0);
    expect(denied.retryAfter).toBeGreaterThanOrEqual(1);
    expect(denied.resetAt).toBeGreaterThan(Date.now());
  });

  it("isola o limite por IP", async () => {
    for (let index = 0; index < env.rateLimitFormat; index += 1) {
      await rateLimit.checkRateLimit("format", requestWithIp("203.0.113.30"));
    }

    const denied = await rateLimit.checkRateLimit("format", requestWithIp("203.0.113.30"));
    const allowed = await rateLimit.checkRateLimit("format", requestWithIp("203.0.113.31"));

    expect(denied.ok).toBe(false);
    expect(allowed.ok).toBe(true);
    expect(allowed.remaining).toBe(env.rateLimitFormat - 1);
  });

  it("mantém janelas separadas por tipo de requisição", async () => {
    for (let index = 0; index < env.rateLimitFormat; index += 1) {
      await rateLimit.checkRateLimit("format", requestWithIp("203.0.113.40"));
    }

    const spell = await rateLimit.checkRateLimit("spell", requestWithIp("203.0.113.40"));

    expect(spell.ok).toBe(true);
    expect(spell.limit).toBe(env.rateLimitSpell);
  });
});

describe("com Upstash configurado", () => {
  let rateLimit: typeof import("@/lib/rate-limit");
  let env: typeof import("@/lib/env").env;

  beforeAll(async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "token-example");
    vi.resetModules();
    upstash.limit.mockReset();
    ({ env } = await import("@/lib/env"));
    rateLimit = await import("@/lib/rate-limit");
  });

  afterAll(() => {
    vi.unstubAllEnvs();
  });

  it("usa a resposta do Upstash quando liberada", async () => {
    upstash.limit.mockResolvedValueOnce({
      success: true,
      limit: 10,
      remaining: 9,
      reset: Date.now() + 60_000,
    });

    const result = await rateLimit.checkRateLimit("format", requestWithIp("203.0.113.50"));

    expect(result.ok).toBe(true);
    expect(result.limit).toBe(10);
    expect(result.remaining).toBe(9);
    expect(result.retryAfter).toBe(0);
    expect(upstash.limit).toHaveBeenCalledWith(expect.stringMatching(/^format:[0-9a-f]{64}$/));
  });

  it("propaga a negação do Upstash com retryAfter", async () => {
    upstash.limit.mockResolvedValueOnce({
      success: false,
      limit: 10,
      remaining: 0,
      reset: Date.now() + 30_000,
    });

    const result = await rateLimit.checkRateLimit("format", requestWithIp("203.0.113.51"));

    expect(result.ok).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfter).toBeGreaterThanOrEqual(1);
    expect(result.retryAfter).toBeLessThanOrEqual(30);
  });

  it("cai para o limite em memória quando o Upstash falha", async () => {
    upstash.limit.mockRejectedValue(new Error("rede indisponível"));

    const first = await rateLimit.checkRateLimit("spell", requestWithIp("203.0.113.52"));
    const second = await rateLimit.checkRateLimit("spell", requestWithIp("203.0.113.52"));

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(second.remaining).toBe(env.rateLimitSpell - 2);
  });
});
