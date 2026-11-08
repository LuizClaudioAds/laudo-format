import { afterEach, describe, expect, it, vi } from "vitest";

import { segmentInput } from "@/lib/format/segment";
import { repairSuggestions } from "@/lib/spell/suggest";

const RAW = ["Paciente: Maria das Gracas", "Idade: 42 anos", "Exame sem alteracao."].join("\n");

function validSuggestion() {
  const { lines } = segmentInput(RAW);
  const line = lines[0];
  const start = line.text.indexOf("Gracas");

  return {
    lines,
    suggestion: {
      lineId: line.id,
      start,
      end: start + "Gracas".length,
      original: "Gracas",
      suggestion: "Graças",
      reason: "Acentuação",
      confidence: 0.9,
    },
  };
}

describe("repairSuggestions", () => {
  it("mantém sugestões válidas", () => {
    const { lines, suggestion } = validSuggestion();
    const result = repairSuggestions(lines, [suggestion]);

    expect(result.suggestions).toEqual([suggestion]);
    expect(result.warnings).toEqual([]);
  });

  it("descarta lineId inexistente", () => {
    const { lines, suggestion } = validSuggestion();
    const result = repairSuggestions(lines, [{ ...suggestion, lineId: 99 }]);

    expect(result.suggestions).toEqual([]);
    expect(result.warnings).toContain(
      "Algumas sugestões ortográficas inválidas foram descartadas.",
    );
  });

  it("descarta offsets inválidos", () => {
    const { lines, suggestion } = validSuggestion();
    const result = repairSuggestions(lines, [
      { ...suggestion, start: -1 },
      { ...suggestion, end: 0 },
      { ...suggestion, end: suggestion.start + 1_000 },
      { ...suggestion, start: 1.5 },
    ]);

    expect(result.suggestions).toEqual([]);
  });

  it("descarta original que não coincide com a linha", () => {
    const { lines, suggestion } = validSuggestion();
    const result = repairSuggestions(lines, [{ ...suggestion, original: "Gráças" }]);

    expect(result.suggestions).toEqual([]);
  });

  it("descarta sugestão igual ao original", () => {
    const { lines, suggestion } = validSuggestion();
    const result = repairSuggestions(lines, [{ ...suggestion, suggestion: suggestion.original }]);

    expect(result.suggestions).toEqual([]);
  });

  it("descarta trecho em branco e suggestion vazia", () => {
    const { lines } = segmentInput("a  b");
    const result = repairSuggestions(lines, [
      { lineId: 0, start: 1, end: 3, original: "  ", suggestion: "x" },
      { lineId: 0, start: 0, end: 1, original: "a", suggestion: "" },
    ]);

    expect(result.suggestions).toEqual([]);
  });

  it("descarta sugestões sobrepostas", () => {
    const { lines, suggestion } = validSuggestion();
    const result = repairSuggestions(lines, [
      suggestion,
      {
        ...suggestion,
        start: suggestion.start + 1,
        end: suggestion.end,
        original: suggestion.original.slice(1),
        suggestion: "Graça",
      },
    ]);

    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0]).toEqual(suggestion);
  });

  it("limita a 20 sugestões", () => {
    const { lines } = segmentInput(Array.from({ length: 21 }, () => "palavra").join("\n"));
    const suggestions = lines.map((line) => ({
      lineId: line.id,
      start: 0,
      end: "palavra".length,
      original: "palavra",
      suggestion: "palavras",
    }));

    const result = repairSuggestions(lines, suggestions);

    expect(result.suggestions).toHaveLength(20);
    expect(result.warnings).toContain(
      "Algumas sugestões ortográficas inválidas foram descartadas.",
    );
  });
});

describe("spellcheckReport", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("retorna sugestões vazias em modo mock", async () => {
    vi.stubEnv("AI_PROVIDER", "mock");
    vi.stubEnv("ALLOW_MOCK_AI", "true");
    vi.resetModules();

    const { spellcheckReport } = await import("@/lib/ai/spellcheck");
    const result = await spellcheckReport(RAW);

    expect(result.suggestions).toEqual([]);
    expect(result.warnings).toContain("Modo mock ativo: nenhuma sugestão ortográfica foi gerada.");
    expect(result.meta.provider).toBe("mock");
    expect(result.meta.usedFallback).toBe(true);
    expect(result.meta.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("retorna sugestões vazias quando o provider falha", async () => {
    vi.stubEnv("AI_PROVIDER", "google");
    vi.stubEnv("ALLOW_MOCK_AI", "false");
    vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "");
    vi.resetModules();

    const { spellcheckReport } = await import("@/lib/ai/spellcheck");
    const result = await spellcheckReport(RAW);

    expect(result.suggestions).toEqual([]);
    expect(result.warnings).toContain(
      "IA indisponível no momento. Nenhuma sugestão ortográfica foi gerada.",
    );
    expect(result.meta.usedFallback).toBe(true);
  });

  it("propaga erro de entrada vazia", async () => {
    vi.stubEnv("AI_PROVIDER", "mock");
    vi.stubEnv("ALLOW_MOCK_AI", "true");
    vi.resetModules();

    const { spellcheckReport } = await import("@/lib/ai/spellcheck");

    await expect(spellcheckReport("   \n ")).rejects.toMatchObject({
      code: "EMPTY_INPUT",
      status: 400,
    });
  });
});
