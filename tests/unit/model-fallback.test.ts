import { afterEach, describe, expect, it, vi } from "vitest";

function providerError(name: string, statusCode?: number): Error {
  return Object.assign(new Error("provider detail"), { name, statusCode });
}

async function loadModels(overrides: Record<string, string> = {}) {
  vi.stubEnv("AI_MODEL", "primary-model");
  vi.stubEnv("AI_FALLBACK_MODELS", "fallback-a, fallback-b, primary-model");

  for (const [key, value] of Object.entries(overrides)) {
    vi.stubEnv(key, value);
  }

  vi.resetModules();

  return import("@/lib/ai/models");
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  vi.restoreAllMocks();
});

describe("modelCandidates", () => {
  it("mantém a ordem, remove vazios e duplicatas", async () => {
    const { modelCandidates } = await loadModels();

    expect(modelCandidates()).toEqual(["primary-model", "fallback-a", "fallback-b"]);
  });

  it("permite desligar o fallback com AI_FALLBACK_MODELS vazio", async () => {
    const { modelCandidates } = await loadModels({ AI_FALLBACK_MODELS: "" });

    expect(modelCandidates()).toEqual(["primary-model"]);
  });
});

describe("runWithModelFallback", () => {
  it("tenta o próximo modelo em erro 503", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { runWithModelFallback } = await loadModels();
    const tried: string[] = [];

    const result = await runWithModelFallback(async (modelId) => {
      tried.push(modelId);
      if (modelId === "primary-model") {
        throw providerError("AI_APICallError", 503);
      }
      return `ok:${modelId}`;
    });

    expect(tried).toEqual(["primary-model", "fallback-a"]);
    expect(result).toEqual({ value: "ok:fallback-a", modelId: "fallback-a" });
  });

  it("trata TimeoutError como retryable", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { runWithModelFallback } = await loadModels();
    const tried: string[] = [];

    const result = await runWithModelFallback(async (modelId) => {
      tried.push(modelId);
      if (modelId === "primary-model") {
        throw providerError("TimeoutError");
      }
      return modelId;
    });

    expect(tried).toEqual(["primary-model", "fallback-a"]);
    expect(result?.modelId).toBe("fallback-a");
  });

  it("não insiste em erro não retryable (400)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { runWithModelFallback } = await loadModels();
    const attempt = vi.fn(async () => {
      throw providerError("AI_APICallError", 400);
    });

    const result = await runWithModelFallback(attempt);

    expect(result).toBeNull();
    expect(attempt).toHaveBeenCalledTimes(1);
  });

  it("retorna null quando todos os modelos falham", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { runWithModelFallback } = await loadModels();
    const tried: string[] = [];

    const result = await runWithModelFallback(async (modelId) => {
      tried.push(modelId);
      throw providerError("AI_APICallError", 503);
    });

    expect(result).toBeNull();
    expect(tried).toEqual(["primary-model", "fallback-a", "fallback-b"]);
  });

  it("não loga a mensagem do erro do provedor", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { runWithModelFallback } = await loadModels();

    await runWithModelFallback(async () => {
      throw providerError("AI_APICallError", 503);
    });

    const serialized = JSON.stringify(errorSpy.mock.calls);
    expect(serialized).not.toContain("provider detail");
    expect(serialized).toContain("503");
  });
});
