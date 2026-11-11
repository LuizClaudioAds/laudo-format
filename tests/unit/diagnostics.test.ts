import { describe, expect, it } from "vitest";

import { describeProviderError } from "@/lib/ai/diagnostics";

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
