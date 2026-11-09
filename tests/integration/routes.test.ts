import { afterEach, describe, expect, it, vi } from "vitest";

import { isContentPreserved, onlyAllowedTags } from "@/lib/format/invariants";
import type { FormatResult, SpellCheckResult } from "@/lib/format/types";

const FORMAT_URL = "http://localhost/api/format";
const SPELL_URL = "http://localhost/api/spellcheck";
const CLIENT_IP = "198.51.100.10";
const REPORT = ["Paciente: Maria das Gracas", "Idade: 42 anos"].join("\n");
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

type FormatPost = typeof import("@/app/api/format/route").POST;
type SpellPost = typeof import("@/app/api/spellcheck/route").POST;

interface Routes {
  format: FormatPost;
  spell: SpellPost;
}

interface ErrorPayload {
  error: { code: string; message: string; requestId: string };
}

async function loadRoutes(overrides: Record<string, string> = {}): Promise<Routes> {
  vi.stubEnv("AI_PROVIDER", "mock");
  vi.stubEnv("ALLOW_MOCK_AI", "true");
  vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "");
  vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
  vi.stubEnv("IP_HASH_SALT", "integration-test-salt");
  vi.stubEnv("RATE_LIMIT_FORMAT", "10");
  vi.stubEnv("RATE_LIMIT_SPELL", "5");

  for (const [key, value] of Object.entries(overrides)) {
    vi.stubEnv(key, value);
  }

  vi.resetModules();

  const [formatRoute, spellRoute] = await Promise.all([
    import("@/app/api/format/route"),
    import("@/app/api/spellcheck/route"),
  ]);

  return { format: formatRoute.POST, spell: spellRoute.POST };
}

function postRequest(
  url: string,
  rawBody: string,
  options: { ip?: string; contentType?: string | null } = {},
): Request {
  const headers: Record<string, string> = {
    "x-forwarded-for": options.ip ?? CLIENT_IP,
  };

  if (options.contentType !== null) {
    headers["content-type"] = options.contentType ?? "application/json";
  }

  return new Request(url, { method: "POST", headers, body: rawBody });
}

function jsonRequest(url: string, body: unknown, ip?: string): Request {
  return postRequest(url, JSON.stringify(body), ip ? { ip } : {});
}

async function expectError(
  response: Response,
  status: number,
  code: string,
): Promise<ErrorPayload> {
  expect(response.status).toBe(status);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(response.headers.get("content-type")).toContain("application/json");

  const requestId = response.headers.get("x-request-id");
  expect(requestId).toMatch(UUID_PATTERN);

  const payload = (await response.json()) as ErrorPayload;
  expect(payload.error.code).toBe(code);
  expect(payload.error.message.length).toBeGreaterThan(0);
  expect(payload.error.requestId).toBe(requestId);

  return payload;
}

function expectRateLimitHeaders(response: Response, limit: number, remaining: number): void {
  expect(response.headers.get("x-ratelimit-limit")).toBe(String(limit));
  expect(response.headers.get("x-ratelimit-remaining")).toBe(String(remaining));
  expect(response.headers.get("x-ratelimit-reset")).toMatch(/^\d+$/);
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("POST /api/format", () => {
  it("formata com mock e devolve metadados, conteúdo preservado e headers", async () => {
    const routes = await loadRoutes();
    const response = await routes.format(jsonRequest(FORMAT_URL, { text: REPORT }));

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-request-id")).toMatch(UUID_PATTERN);
    expect(response.headers.get("content-type")).toContain("application/json");
    expectRateLimitHeaders(response, 10, 9);

    const payload = (await response.json()) as FormatResult;

    expect(payload.html.length).toBeGreaterThan(0);
    expect(onlyAllowedTags(payload.html)).toBe(true);
    expect(isContentPreserved(REPORT, payload.html)).toBe(true);
    expect(payload.warnings).toContain(
      "Modo mock ativo: classificação heurística aplicada sem chamada de IA.",
    );
    expect(payload.meta.provider).toBe("mock");
    expect(payload.meta.model).toBe("gemini-2.5-flash");
    expect(payload.meta.usedFallback).toBe(true);
    expect(payload.meta.durationMs).toBeGreaterThanOrEqual(0);
    expect(payload.meta.characters).toBe(REPORT.length);
    expect(payload.meta.lines).toBe(2);
    expect(payload.meta.blocks).toBeGreaterThan(0);
  });

  it("recusa mídia não JSON e JSON inválido", async () => {
    const routes = await loadRoutes();

    const unsupported = await routes.format(
      postRequest(FORMAT_URL, REPORT, { contentType: "text/plain" }),
    );
    await expectError(unsupported, 415, "UNSUPPORTED_MEDIA_TYPE");

    const invalidJson = await routes.format(postRequest(FORMAT_URL, "{sem fechamento"));
    await expectError(invalidJson, 400, "INVALID_JSON");
  });

  it("recusa corpo não objeto, text ausente e preset inválido", async () => {
    const routes = await loadRoutes();

    const arrayBody = await routes.format(jsonRequest(FORMAT_URL, []));
    await expectError(arrayBody, 400, "INVALID_INPUT");

    const missingText = await routes.format(jsonRequest(FORMAT_URL, {}));
    await expectError(missingText, 400, "INVALID_INPUT");

    const invalidPreset = await routes.format(
      jsonRequest(FORMAT_URL, { text: REPORT, preset: "desconhecido" }),
    );
    await expectError(invalidPreset, 400, "INVALID_INPUT");
  });

  it("devolve erros de limite de entrada", async () => {
    const routes = await loadRoutes();

    const emptyInput = await routes.format(jsonRequest(FORMAT_URL, { text: "   \n " }));
    await expectError(emptyInput, 400, "EMPTY_INPUT");

    const tooManyCharacters = await routes.format(
      jsonRequest(FORMAT_URL, { text: "x".repeat(20_001) }),
    );
    await expectError(tooManyCharacters, 413, "INPUT_TOO_LARGE");

    const tooManyLines = await routes.format(
      jsonRequest(FORMAT_URL, {
        text: Array.from({ length: 501 }, () => "x").join("\n"),
      }),
    );
    await expectError(tooManyLines, 413, "TOO_MANY_LINES");

    const tooManyBytes = await routes.format(jsonRequest(FORMAT_URL, { text: "x".repeat(70_000) }));
    await expectError(tooManyBytes, 413, "INPUT_TOO_LARGE");
  });

  it("aplica o limite de 10 requisições por minuto com Retry-After", async () => {
    const routes = await loadRoutes();

    for (let index = 0; index < 10; index += 1) {
      const response = await routes.format(jsonRequest(FORMAT_URL, { text: REPORT }));
      expect(response.status).toBe(200);
      expectRateLimitHeaders(response, 10, 9 - index);
    }

    const limited = await routes.format(jsonRequest(FORMAT_URL, { text: REPORT }));

    await expectError(limited, 429, "RATE_LIMITED");
    expect(limited.headers.get("retry-after")).toMatch(/^\d+$/);
    expect(Number(limited.headers.get("retry-after"))).toBeGreaterThanOrEqual(1);
    expectRateLimitHeaders(limited, 10, 0);
  });
});

describe("POST /api/spellcheck", () => {
  it("devolve sugestões vazias em modo mock com metadados e headers", async () => {
    const routes = await loadRoutes();
    const response = await routes.spell(jsonRequest(SPELL_URL, { text: REPORT }));

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-request-id")).toMatch(UUID_PATTERN);
    expect(response.headers.get("content-type")).toContain("application/json");
    expectRateLimitHeaders(response, 5, 4);

    const payload = (await response.json()) as SpellCheckResult;

    expect(payload.suggestions).toEqual([]);
    expect(payload.warnings).toContain("Modo mock ativo: nenhuma sugestão ortográfica foi gerada.");
    expect(payload.meta.provider).toBe("mock");
    expect(payload.meta.usedFallback).toBe(true);
    expect(payload.meta.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("recusa mídia não JSON, JSON inválido, corpo não objeto e text ausente", async () => {
    const routes = await loadRoutes();

    const unsupported = await routes.spell(
      postRequest(SPELL_URL, REPORT, { contentType: "text/plain" }),
    );
    await expectError(unsupported, 415, "UNSUPPORTED_MEDIA_TYPE");

    const invalidJson = await routes.spell(postRequest(SPELL_URL, "{sem fechamento"));
    await expectError(invalidJson, 400, "INVALID_JSON");

    const arrayBody = await routes.spell(jsonRequest(SPELL_URL, []));
    await expectError(arrayBody, 400, "INVALID_INPUT");

    const missingText = await routes.spell(jsonRequest(SPELL_URL, {}));
    await expectError(missingText, 400, "INVALID_INPUT");
  });

  it("devolve erros de limite de entrada", async () => {
    const routes = await loadRoutes();

    const emptyInput = await routes.spell(jsonRequest(SPELL_URL, { text: "   \n " }));
    await expectError(emptyInput, 400, "EMPTY_INPUT");

    const tooManyCharacters = await routes.spell(
      jsonRequest(SPELL_URL, { text: "x".repeat(20_001) }),
    );
    await expectError(tooManyCharacters, 413, "INPUT_TOO_LARGE");

    const tooManyLines = await routes.spell(
      jsonRequest(SPELL_URL, {
        text: Array.from({ length: 501 }, () => "x").join("\n"),
      }),
    );
    await expectError(tooManyLines, 413, "TOO_MANY_LINES");
  });

  it("aplica o limite de 5 requisições por minuto com Retry-After", async () => {
    const routes = await loadRoutes();

    for (let index = 0; index < 5; index += 1) {
      const response = await routes.spell(jsonRequest(SPELL_URL, { text: REPORT }));
      expect(response.status).toBe(200);
      expectRateLimitHeaders(response, 5, 4 - index);
    }

    const limited = await routes.spell(jsonRequest(SPELL_URL, { text: REPORT }));

    await expectError(limited, 429, "RATE_LIMITED");
    expect(limited.headers.get("retry-after")).toMatch(/^\d+$/);
    expect(Number(limited.headers.get("retry-after"))).toBeGreaterThanOrEqual(1);
    expectRateLimitHeaders(limited, 5, 0);
  });
});

describe("fallback sem chave Google", () => {
  it("responde 200 com fallback nas duas rotas", async () => {
    const routes = await loadRoutes({ AI_PROVIDER: "google", ALLOW_MOCK_AI: "false" });

    const formatResponse = await routes.format(jsonRequest(FORMAT_URL, { text: REPORT }));
    expect(formatResponse.status).toBe(200);

    const formatPayload = (await formatResponse.json()) as FormatResult;
    expect(formatPayload.meta.provider).toBe("google");
    expect(formatPayload.meta.usedFallback).toBe(true);
    expect(formatPayload.warnings).toContain(
      "IA indisponível no momento. A formatação básica foi aplicada.",
    );

    const spellResponse = await routes.spell(jsonRequest(SPELL_URL, { text: REPORT }));
    expect(spellResponse.status).toBe(200);

    const spellPayload = (await spellResponse.json()) as SpellCheckResult;
    expect(spellPayload.meta.provider).toBe("google");
    expect(spellPayload.meta.usedFallback).toBe(true);
    expect(spellPayload.suggestions).toEqual([]);
    expect(spellPayload.warnings).toContain(
      "IA indisponível no momento. Nenhuma sugestão ortográfica foi gerada.",
    );
  });
});
