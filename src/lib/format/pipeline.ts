import { classifyReport } from "@/lib/ai/classify";

import { renderReport } from "./render";
import { segmentInput } from "./segment";
import type { FormatResult, ReportPreset } from "./types";

export async function formatReport(
  rawText: string,
  preset: ReportPreset = "generico",
): Promise<FormatResult> {
  const startedAt = performance.now();
  const input = segmentInput(rawText);
  const classification = await classifyReport(input, preset);
  const html = renderReport(classification.report, preset);
  const durationMs = Math.round(performance.now() - startedAt);

  return {
    html,
    warnings: classification.warnings,
    meta: {
      provider: classification.provider,
      model: classification.model,
      usedFallback: classification.usedFallback,
      durationMs,
      characters: input.normalizedText.length,
      lines: input.lines.length,
      blocks: classification.report.blocks.length,
    },
  };
}
