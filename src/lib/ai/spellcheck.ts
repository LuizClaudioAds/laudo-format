import { generateObject } from "ai";

import { isMockMode } from "@/lib/env";
import { segmentInput } from "@/lib/format/segment";
import type { SpellCheckResult } from "@/lib/format/types";
import { repairSuggestions } from "@/lib/spell/suggest";
import { buildSpellCheckPrompt, SPELLCHECK_SYSTEM_PROMPT } from "./prompt";
import { describeProviderError } from "./diagnostics";
import { runWithModelFallback } from "./models";
import { createLanguageModel, getProviderInfo } from "./provider";
import { spellCheckSchema } from "./schema";

function buildResult(
  suggestions: SpellCheckResult["suggestions"],
  usedFallback: boolean,
  warnings: string[],
  startedAt: number,
  model: string = getProviderInfo().model,
): SpellCheckResult {
  const info = getProviderInfo();

  return {
    suggestions,
    warnings,
    meta: {
      provider: info.provider,
      model,
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
    const generated = await runWithModelFallback(async (modelId, signal) => {
      const model = createLanguageModel(modelId);
      const { object } = await generateObject({
        model,
        schema: spellCheckSchema,
        system: SPELLCHECK_SYSTEM_PROMPT,
        prompt: buildSpellCheckPrompt(input.lines),
        temperature: 0,
        maxOutputTokens: 2_000,
        maxRetries: 0,
        abortSignal: signal,
      });

      return object;
    });

    if (!generated) {
      return buildResult(
        [],
        true,
        ["IA indisponível no momento. Nenhuma sugestão ortográfica foi gerada."],
        startedAt,
      );
    }

    const repaired = repairSuggestions(input.lines, generated.value.suggestions);

    return buildResult(
      repaired.suggestions,
      false,
      [...(generated.value.warnings ?? []), ...repaired.warnings],
      startedAt,
      generated.modelId,
    );
  } catch (error) {
    console.error("[ai] spellcheck repair failed", describeProviderError(error));

    return buildResult(
      [],
      true,
      ["IA indisponível no momento. Nenhuma sugestão ortográfica foi gerada."],
      startedAt,
    );
  }
}
