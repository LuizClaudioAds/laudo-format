import { describe, expect, it } from "vitest";

import { AppError, isAppError } from "@/lib/errors";
import {
  appErrorResponse,
  createRequestId,
  errorResponse,
  jsonResponse,
  readJsonBody,
} from "@/lib/http";

const ENDPOINT = "http://localhost/api/format";

function postRequest(body: string, headers: Record<string, string> = {}): Request {
  return new Request(ENDPOINT, { method: "POST", body, headers });
}

async function expectAppError(promise: Promise<unknown>, code: string, status: number) {
  try {
    await promise;
    expect.unreachable("a promise deveria ter sido rejeitada");
  } catch (error) {
    expect(isAppError(error)).toBe(true);
    expect(error).toMatchObject({ code, status });
  }
}

describe("createRequestId", () => {
  it("gera um identificador único por chamada", () => {
    expect(createRequestId()).not.toBe(createRequestId());
    expect(createRequestId()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });
});

describe("jsonResponse", () => {
  it("marca no-store e devolve o x-request-id", async () => {
    const response = jsonResponse({ ok: true }, 200, "req-1");

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-request-id")).toBe("req-1");
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it("aceita headers adicionais", () => {
    const response = jsonResponse({ ok: true }, 200, "req-2", { "Retry-After": "30" });

    expect(response.headers.get("retry-after")).toBe("30");
    expect(response.headers.get("x-request-id")).toBe("req-2");
  });
});

describe("errorResponse", () => {
  it("monta o envelope { error: { code, message, requestId } }", async () => {
    const response = errorResponse("RATE_LIMITED", 429, "Limite atingido.", "req-3", {
      "Retry-After": "12",
    });

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("12");
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      error: { code: "RATE_LIMITED", message: "Limite atingido.", requestId: "req-3" },
    });
  });
});

describe("appErrorResponse", () => {
  it("converte AppError no status e código originais", async () => {
    const error = new AppError("INPUT_TOO_LARGE", 413, "Corpo muito grande.");
    const response = appErrorResponse(error, "req-4");

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toEqual({
      error: { code: "INPUT_TOO_LARGE", message: "Corpo muito grande.", requestId: "req-4" },
    });
  });

  it("responde 500 com mensagem genérica para erro desconhecido", async () => {
    const response = appErrorResponse(new Error("segredo interno"), "req-5");

    expect(response.status).toBe(500);
    const payload = (await response.json()) as { error: { code: string; message: string } };
    expect(payload.error.code).toBe("INTERNAL_ERROR");
    expect(payload.error.message).toBe("Não foi possível processar a requisição.");
    expect(payload.error.message).not.toContain("segredo interno");
  });

  it("usa a mensagem de fallback informada pela rota", async () => {
    const response = appErrorResponse(new Error("x"), "req-6", {
      fallbackMessage: "Não foi possível formatar o laudo.",
    });

    const payload = (await response.json()) as { error: { message: string } };
    expect(payload.error.message).toBe("Não foi possível formatar o laudo.");
  });
});

describe("readJsonBody", () => {
  it("parseia um corpo JSON válido", async () => {
    const body = await readJsonBody(postRequest('{"text":"LAUDO","preset":"generico"}'), 1024);

    expect(body).toEqual({ text: "LAUDO", preset: "generico" });
  });

  it("aceita um corpo com exatamente o limite de bytes", async () => {
    const raw = '{"a":1}';
    const body = await readJsonBody(postRequest(raw), raw.length);

    expect(body).toEqual({ a: 1 });
  });

  it("recusa content-length acima do limite antes de ler o corpo", async () => {
    await expectAppError(
      readJsonBody(postRequest("{}", { "content-length": "999999" }), 100),
      "INPUT_TOO_LARGE",
      413,
    );
  });

  it("recusa o corpo durante a leitura quando excede o limite", async () => {
    const raw = JSON.stringify({ text: "x".repeat(500) });

    await expectAppError(readJsonBody(postRequest(raw), 64), "INPUT_TOO_LARGE", 413);
  });

  it("rejeita JSON inválido", async () => {
    await expectAppError(readJsonBody(postRequest("{sem fechamento"), 1024), "INVALID_JSON", 400);
  });

  it("rejeita corpo ausente", async () => {
    const request = new Request(ENDPOINT, { method: "POST" });

    await expectAppError(readJsonBody(request, 1024), "INVALID_JSON", 400);
  });
});
