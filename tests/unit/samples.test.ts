import { describe, expect, it } from "vitest";

import { SAMPLE_REPORTS } from "@/data/samples";
import { segmentInput } from "@/lib/format/segment";
import { REPORT_PRESETS } from "@/lib/format/types";

describe("SAMPLE_REPORTS", () => {
  it("oferece pelo menos três laudos fictícios", () => {
    expect(SAMPLE_REPORTS.length).toBeGreaterThanOrEqual(3);
  });

  it("usa ids e rótulos únicos", () => {
    const ids = new Set(SAMPLE_REPORTS.map((sample) => sample.id));
    const labels = new Set(SAMPLE_REPORTS.map((sample) => sample.label));

    expect(ids.size).toBe(SAMPLE_REPORTS.length);
    expect(labels.size).toBe(SAMPLE_REPORTS.length);
  });

  it("cobre todos os presets disponíveis", () => {
    const presets = new Set(SAMPLE_REPORTS.map((sample) => sample.preset));

    for (const preset of REPORT_PRESETS) {
      expect(presets.has(preset)).toBe(true);
    }
  });

  it("produz linhas válidas dentro dos limites de segmentação", () => {
    for (const sample of SAMPLE_REPORTS) {
      const segmented = segmentInput(sample.text);

      expect(segmented.lines.length).toBeGreaterThan(0);
      expect(segmented.lines.every((line) => line.text.trim().length > 0)).toBe(true);
    }
  });
});
