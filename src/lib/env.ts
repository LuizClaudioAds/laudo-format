function readPositiveInteger(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const env = {
  aiProvider: process.env.AI_PROVIDER?.trim() || "google",
  aiModel: process.env.AI_MODEL?.trim() || "gemini-3.8-flash",
  allowMockAi: process.env.ALLOW_MOCK_AI === "true",
  googleApiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() || "",
  upstashUrl: process.env.UPSTASH_REDIS_REST_URL?.trim() || "",
  upstashToken: process.env.UPSTASH_REDIS_REST_TOKEN?.trim() || "",
  ipHashSalt: process.env.IP_HASH_SALT?.trim() || "laudo-format-dev-salt",
  rateLimitFormat: readPositiveInteger(process.env.RATE_LIMIT_FORMAT, 10),
  rateLimitSpell: readPositiveInteger(process.env.RATE_LIMIT_SPELL, 5),
  appUrl: process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000",
} as const;

export function isMockMode(): boolean {
  return env.aiProvider === "mock" && env.allowMockAi;
}

export function isUpstashConfigured(): boolean {
  return Boolean(env.upstashUrl && env.upstashToken);
}

export function isGoogleConfigured(): boolean {
  return Boolean(env.googleApiKey);
}
