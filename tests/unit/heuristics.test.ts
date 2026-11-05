import { describe, expect, it } from "vitest";

import { classifyLineType, heuristicClassify } from "@/lib/format/heuristics";
import { segmentInput } from "@/lib/format/segment";
import type { BlockType } from "@/lib/format/types";
import { CITOLOGY_RAW } from "../fixtures/reports";

describe("classifyLineType", () => {
  const { lines } = segmentInput(CITOLOGY_RAW);

  function typeOf(text: string, preset: "generico" | "citologia" = "citologia"): BlockType {
    const index = lines.findIndex((line) => line.text === text);
    expect(index).toBeGreaterThanOrEqual(0);
    return classifyLineType(lines[index], index, lines, preset);
  }

  it("identifica o título", () => {
    expect(typeOf("LAUDO CITOLÓGICO")).toBe("document_title");
  });

  it("identifica seções", () => {
    expect(typeOf("MATERIAL")).toBe("section_heading");
    expect(typeOf("DESCRIÇÃO MICROSCÓPICA")).toBe("section_heading");
    expect(typeOf("CONCLUSÃO")).toBe("section_heading");
  });

  it("identifica campos", () => {
    expect(typeOf("Paciente: Maria das Graças Almeida")).toBe("field");
    expect(typeOf("Data: 12/03/2026")).toBe("field");
  });

  it("identifica nota", () => {
    expect(typeOf("NOTA: correlacionar com dados clínicos.")).toBe("note");
  });

  it("identifica assinatura próxima ao fim", () => {
    expect(typeOf("Dra. Helena Martins")).toBe("signature");
    expect(typeOf("CRM 123456-SP")).toBe("signature");
  });

  it("identifica itens de lista", () => {
    const input = segmentInput("- Material insuficiente\n- Repetir coleta");
    expect(classifyLineType(input.lines[0], 0, input.lines, "generico")).toBe("list_item");
  });

  it("não trata horário como campo", () => {
    const input = segmentInput("10:30 - início do exame");
    expect(classifyLineType(input.lines[0], 0, input.lines, "generico")).toBe("paragraph");
  });
});

describe("heuristicClassify", () => {
  it("cobre todas as linhas na ordem", () => {
    const { lines } = segmentInput(CITOLOGY_RAW);
    const report = heuristicClassify(lines, "citologia");
    const ids = report.blocks.flatMap((block) => block.lines.map((line) => line.id));

    expect(ids).toEqual(lines.map((line) => line.id));
    expect(report.usedFallback).toBe(true);
    expect(report.emphasis).toEqual([]);
  });

  it("agrupa parágrafos consecutivos", () => {
    const { lines } = segmentInput(
      "LAUDO\nPaciente: Maria\nPrimeira linha do corpo.\nSegunda linha do corpo.",
    );
    const report = heuristicClassify(lines, "generico");
    const paragraph = report.blocks.find((block) => block.type === "paragraph");

    expect(paragraph?.lines.map((line) => line.text)).toEqual([
      "Primeira linha do corpo.",
      "Segunda linha do corpo.",
    ]);
  });
});
