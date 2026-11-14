import { describe, expect, it } from "vitest";

import { describeProviderError, isRetryableProviderError } from "@/lib/ai/diagnostics";

describe("describeProviderError", () => {
  it("extrai apenas tipo, status e código, sem a mensagem", () => {
    const error = Object.assign(new Error("detalhe sensível do provedor"), {
      statusCode: 404,
      code: "NOT_FOUND",
    });

    const details = describeProviderError(error);

    expect(details).toEqual({ type: "Error", status: 404, code: "NOT_FOUND" });
    expect(JSON.stringify(details)).not.toContain("sensível");
  });

  it("ignora campos desconhecidos e tipos inválidos", () => {
    const error = Object.assign(new Error("x"), {
      statusCode: "404",
      code: 42,
      responseBody: "conteúdo que não deve ser logado",
    });

    expect(describeProviderError(error)).toEqual({ type: "Error" });
  });

  it("lida com valores que não são Error", () => {
    expect(describeProviderError("falha")).toEqual({ type: "string" });
    expect(describeProviderError(null)).toEqual({ type: "object" });
  });
});

describe("isRetryableProviderError", () => {
  it("aceita status transitórios e timeout", () => {
    for (const status of [404, 408, 429, 500, 502, 503, 504]) {
      expect(isRetryableProviderError(Object.assign(new Error("x"), { statusCode: status }))).toBe(
        true,
      );
    }

    expect(isRetryableProviderError(Object.assign(new Error("x"), { name: "TimeoutError" }))).toBe(
      true,
    );
  });

  it("recusa erros de configuração e valores desconhecidos", () => {
    expect(isRetryableProviderError(Object.assign(new Error("x"), { statusCode: 400 }))).toBe(
      false,
    );
    expect(isRetryableProviderError(Object.assign(new Error("x"), { statusCode: 403 }))).toBe(
      false,
    );
    expect(isRetryableProviderError("falha")).toBe(false);
    expect(isRetryableProviderError(null)).toBe(false);
  });
});
