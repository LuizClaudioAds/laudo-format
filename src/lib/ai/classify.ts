import { generateObject } from "ai";

import { isMockMode } from "@/lib/env";
import { heuristicClassify } from "@/lib/format/heuristics";
import type { ClassifiedReport, ReportPreset, SegmentedInput } from "@/lib/format/types";
import { repairClassification } from "@/lib/format/validate";
import { buildClassificationPrompt, CLASSIFICATION_SYSTEM_PROMPT } from "./prompt";
import { describeProviderError } from "./diagnostics";
import { createLanguageModel, getProviderInfo } from "./provider";
import { classificationSchema } from "./schema";

const AI_TIMEOUT_MS = 20_000;

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
    const model = createLanguageModel();
    const { object } = await generateObject({
      model,
      schema: classificationSchema,
      system: CLASSIFICATION_SYSTEM_PROMPT,
      prompt: buildClassificationPrompt(input.lines, preset),
      temperature: 0,
      maxOutputTokens: 2_000,
      maxRetries: 1,
      abortSignal: AbortSignal.timeout(AI_TIMEOUT_MS),
    });

    const repaired = repairClassification(input.lines, object, preset);
    const info = getProviderInfo();

    return {
      report: repaired.report,
      usedFallback: false,
      warnings: [...(object.warnings ?? []), ...repaired.warnings],
      provider: info.provider,
      model: info.model,
    };
  } catch (error) {
    console.error("[ai] classification failed", describeProviderError(error));

    return fallbackOutcome(input, preset, [
      "IA indisponível no momento. A formatação básica foi aplicada.",
    ]);
  }
}
