import { generateObject } from "ai";

import { isMockMode } from "@/lib/env";
import { segmentInput } from "@/lib/format/segment";
import type { SpellCheckResult } from "@/lib/format/types";
import { repairSuggestions } from "@/lib/spell/suggest";
import { buildSpellCheckPrompt, SPELLCHECK_SYSTEM_PROMPT } from "./prompt";
import { createLanguageModel, getProviderInfo } from "./provider";
import { spellCheckSchema } from "./schema";

const AI_TIMEOUT_MS = 20_000;

function buildResult(
  suggestions: SpellCheckResult["suggestions"],
  usedFallback: boolean,
  warnings: string[],
  startedAt: number,
): SpellCheckResult {
  const info = getProviderInfo();

  return {
    suggestions,
    warnings,
    meta: {
      provider: info.provider,
      model: info.model,
      usedFallback,
      durationMs: Math.round(performance.now() - startedAt),
    },
  };
}

export async function spellcheckReport(rawText: string): Promise<SpellCheckResult> {
  const startedAt = performance.now();
  const input = segmentInput(rawText);

  if (isMockMode()) {
    return buildResult(
      [],
      true,
      ["Modo mock ativo: nenhuma sugestão ortográfica foi gerada."],
      startedAt,
    );
  }

  try {
    const model = createLanguageModel();
    const { object } = await generateObject({
      model,
      schema: spellCheckSchema,
      system: SPELLCHECK_SYSTEM_PROMPT,
      prompt: buildSpellCheckPrompt(input.lines),
      temperature: 0,
      maxOutputTokens: 2_000,
      maxRetries: 1,
      abortSignal: AbortSignal.timeout(AI_TIMEOUT_MS),
    });

    const repaired = repairSuggestions(input.lines, object.suggestions);

    return buildResult(
      repaired.suggestions,
      false,
      [...(object.warnings ?? []), ...repaired.warnings],
      startedAt,
    );
  } catch {
    return buildResult(
      [],
      true,
      ["IA indisponível no momento. Nenhuma sugestão ortográfica foi gerada."],
      startedAt,
    );
  }
}
