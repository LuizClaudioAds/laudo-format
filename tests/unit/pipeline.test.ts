import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import {
  hasLeadingOrTrailingBreak,
  isContentPreserved,
  maxConsecutiveBreaks,
  onlyAllowedTags,
} from "@/lib/format/invariants";
import { normalizeText } from "@/lib/format/segment";
import { CITOLOGY_RAW } from "../fixtures/reports";

let formatReport: typeof import("@/lib/format/pipeline").formatReport;

beforeAll(async () => {
  vi.stubEnv("AI_PROVIDER", "mock");
  vi.stubEnv("ALLOW_MOCK_AI", "true");
  vi.resetModules();
  ({ formatReport } = await import("@/lib/format/pipeline"));
});

afterAll(() => {
  vi.unstubAllEnvs();
});

describe("formatReport", () => {
  it("formata com fallback mock preservando o conteúdo", async () => {
    const result = await formatReport(CITOLOGY_RAW, "citologia");

    expect(onlyAllowedTags(result.html)).toBe(true);
    expect(isContentPreserved(CITOLOGY_RAW, result.html)).toBe(true);
    expect(hasLeadingOrTrailingBreak(result.html)).toBe(false);
    expect(maxConsecutiveBreaks(result.html)).toBeLessThanOrEqual(2);
    expect(result.warnings).toContain(
      "Modo mock ativo: classificação heurística aplicada sem chamada de IA.",
    );
  });

  it("preenche os metadados da formatação", async () => {
    const result = await formatReport(CITOLOGY_RAW, "citologia");
    const nonEmptyLines = normalizeText(CITOLOGY_RAW)
      .split("\n")
      .filter((line) => line.trim().length > 0);

    expect(result.meta.provider).toBe("mock");
    expect(result.meta.model).toBe("gemini-3.8-flash");
    expect(result.meta.usedFallback).toBe(true);
    expect(result.meta.durationMs).toBeGreaterThanOrEqual(0);
    expect(result.meta.characters).toBe(normalizeText(CITOLOGY_RAW).length);
    expect(result.meta.lines).toBe(nonEmptyLines.length);
    expect(result.meta.blocks).toBeGreaterThan(0);
  });

  it("propaga erros de entrada", async () => {
    await expect(formatReport("   \n ", "generico")).rejects.toMatchObject({
      code: "EMPTY_INPUT",
      status: 400,
    });
  });
});
