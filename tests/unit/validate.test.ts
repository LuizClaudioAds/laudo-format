import { describe, expect, it } from "vitest";

import { segmentInput } from "@/lib/format/segment";
import { repairClassification } from "@/lib/format/validate";

describe("repairClassification", () => {
  const { lines } = segmentInput(
    "LAUDO CITOLÓGICO\nPaciente: Maria\nTexto do corpo.\nCONCLUSAO\nSem alteracoes.",
  );

  it("usa heurística para linhas ausentes", () => {
    const result = repairClassification(
      lines,
      {
        blocks: [
          { lineIds: [0], type: "document_title" },
          { lineIds: [2], type: "paragraph" },
        ],
      },
      "citologia",
    );

    const assigned = result.report.blocks.flatMap((block) => block.lines.map((line) => line.id));

    expect(assigned).toEqual([0, 1, 2, 3, 4]);
    expect(result.report.blocks.find((block) => block.lines[0]?.id === 1)?.type).toBe("field");
    expect(result.report.blocks.find((block) => block.lines[0]?.id === 3)?.type).toBe(
      "section_heading",
    );
    expect(result.warnings).toContain(
      "A classificação da IA foi ajustada para preservar todas as linhas.",
    );
  });

  it("descarta IDs inválidos e duplicados", () => {
    const result = repairClassification(
      lines,
      {
        blocks: [
          { lineIds: [0, 0, 99], type: "document_title" },
          { lineIds: [1], type: "field" },
          { lineIds: [2], type: "paragraph" },
          { lineIds: [3], type: "section_heading" },
          { lineIds: [4], type: "paragraph" },
        ],
      },
      "citologia",
    );

    const assigned = result.report.blocks.flatMap((block) => block.lines.map((line) => line.id));

    expect(assigned).toEqual([0, 1, 2, 3, 4]);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("agrupa parágrafos consecutivos", () => {
    const result = repairClassification(
      lines,
      {
        blocks: [
          { lineIds: [0], type: "document_title" },
          { lineIds: [1], type: "field" },
          { lineIds: [2], type: "paragraph" },
          { lineIds: [3], type: "section_heading" },
          { lineIds: [4], type: "paragraph" },
        ],
      },
      "citologia",
    );

    expect(result.report.blocks.map((block) => block.type)).toEqual([
      "document_title",
      "field",
      "paragraph",
      "section_heading",
      "paragraph",
    ]);
  });

  it("valida spans de itálico", () => {
    const { lines: italicsLines } = segmentInput("Cultura positiva para Candida albicans.");
    const start = italicsLines[0].text.indexOf("Candida");

    const result = repairClassification(
      italicsLines,
      {
        blocks: [{ lineIds: [0], type: "paragraph" }],
        emphasis: [
          { lineId: 0, start, end: start + "Candida albicans".length, style: "italic" },
          { lineId: 0, start, end: start + 3, style: "italic" },
          { lineId: 9, start: 0, end: 3, style: "italic" },
        ],
      },
      "generico",
    );

    expect(result.report.emphasis).toHaveLength(1);
    expect(result.warnings).toContain("Alguns spans de itálico inválidos foram descartados.");
  });

  it("limita a 50 spans de itálico", () => {
    const { lines: manyLines } = segmentInput(
      Array.from({ length: 60 }, () => "Candida albicans").join("\n"),
    );

    const emphasis = manyLines.map((line) => ({
      lineId: line.id,
      start: 0,
      end: "Candida".length,
      style: "italic" as const,
    }));

    const result = repairClassification(
      manyLines,
      {
        blocks: manyLines.map((line) => ({ lineIds: [line.id], type: "paragraph" as const })),
        emphasis,
      },
      "generico",
    );

    expect(result.report.emphasis).toHaveLength(50);
  });
});
