import { generateObject } from "ai";

import { isMockMode } from "@/lib/env";
import { heuristicClassify } from "@/lib/format/heuristics";
import type { ClassifiedReport, ReportPreset, SegmentedInput } from "@/lib/format/types";
import { repairClassification } from "@/lib/format/validate";
import { buildClassificationPrompt, CLASSIFICATION_SYSTEM_PROMPT } from "./prompt";
import { describeProviderError } from "./diagnostics";
import { runWithModelFallback } from "./models";
import { createLanguageModel, getProviderInfo } from "./provider";
import { classificationSchema } from "./schema";

export interface ClassificationOutcome {
  report: ClassifiedReport;
  usedFallback: boolean;
  warnings: string[];
  provider: string;
  model: string;
}

function fallbackOutcome(
  input: SegmentedInput,
  preset: ReportPreset,
  warnings: string[],
): ClassificationOutcome {
  const info = getProviderInfo();

  return {
    report: heuristicClassify(input.lines, preset),
    usedFallback: true,
    warnings,
    provider: info.provider,
    model: info.model,
  };
}

export async function classifyReport(
  input: SegmentedInput,
  preset: ReportPreset,
): Promise<ClassificationOutcome> {
  if (isMockMode()) {
    return fallbackOutcome(input, preset, [
      "Modo mock ativo: classificação heurística aplicada sem chamada de IA.",
    ]);
  }

  try {
    const generated = await runWithModelFallback(async (modelId, signal) => {
      const model = createLanguageModel(modelId);
      const { object } = await generateObject({
        model,
        schema: classificationSchema,
        system: CLASSIFICATION_SYSTEM_PROMPT,
        prompt: buildClassificationPrompt(input.lines, preset),
        temperature: 0,
        maxOutputTokens: 2_000,
        maxRetries: 0,
        abortSignal: signal,
      });

      return object;
    });

    if (!generated) {
      return fallbackOutcome(input, preset, [
        "IA indisponível no momento. A formatação básica foi aplicada.",
      ]);
    }

    const repaired = repairClassification(input.lines, generated.value, preset);
    const info = getProviderInfo();

    return {
      report: repaired.report,
      usedFallback: false,
      warnings: [...(generated.value.warnings ?? []), ...repaired.warnings],
      provider: info.provider,
      model: generated.modelId,
    };
  } catch (error) {
    console.error("[ai] classification repair failed", describeProviderError(error));

    return fallbackOutcome(input, preset, [
      "IA indisponível no momento. A formatação básica foi aplicada.",
    ]);
  }
}
