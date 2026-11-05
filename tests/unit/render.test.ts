import { describe, expect, it } from "vitest";

import { heuristicClassify } from "@/lib/format/heuristics";
import {
  hasLeadingOrTrailingBreak,
  isContentPreserved,
  maxConsecutiveBreaks,
  onlyAllowedTags,
} from "@/lib/format/invariants";
import { escapeHtml, renderLine, renderReport } from "@/lib/format/render";
import { segmentInput } from "@/lib/format/segment";
import type {
  BlockType,
  ClassifiedReport,
  EmphasisSpan,
  ReportPreset,
  SourceLine,
} from "@/lib/format/types";
import { CITOLOGY_RAW } from "../fixtures/reports";

function buildReport(
  raw: string,
  specs: Array<[BlockType, number[]]>,
  emphasis: EmphasisSpan[] = [],
): ClassifiedReport {
  const { lines } = segmentInput(raw);

  return {
    blocks: specs.map(([type, ids]) => ({
      type,
      lines: ids.map((id) => lines[id] as SourceLine),
    })),
    emphasis,
    warnings: [],
    usedFallback: false,
  };
}

function render(
  raw: string,
  specs: Array<[BlockType, number[]]>,
  preset: ReportPreset = "generico",
) {
  return renderReport(buildReport(raw, specs), preset);
}

describe("escapeHtml", () => {
  it("escapa caracteres perigosos", () => {
    expect(escapeHtml("<script>alert(\"x\")</script> & 'y'")).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#39;y&#39;",
    );
  });
});

describe("renderLine", () => {
  it("aplica itálico sem alterar o texto", () => {
    const text = "Cultura positiva para Candida albicans.";
    const start = text.indexOf("Candida");

    expect(
      renderLine(text, [{ start, end: start + "Candida albicans".length, style: "italic" }]),
    ).toBe("Cultura positiva para <i>Candida albicans</i>.");
  });

  it("ignora spans inválidos", () => {
    expect(renderLine("Texto", [{ start: 2, end: 99, style: "italic" }])).toBe("Texto");
  });

  it("não aninha itálico dentro de negrito", () => {
    expect(
      renderLine("Título", [
        { start: 0, end: 6, style: "bold" },
        { start: 0, end: 6, style: "italic" },
      ]),
    ).toBe("<b>Título</b>");
  });
});

describe("renderReport", () => {
  it("formata título, campos e seção", () => {
    const html = render("LAUDO CITOLÓGICO\nPaciente: Maria\nIdade: 42\nDESCRIÇÃO\nTexto.", [
      ["document_title", [0]],
      ["field", [1]],
      ["field", [2]],
      ["section_heading", [3]],
      ["paragraph", [4]],
    ]);

    expect(html).toBe(
      "<b>LAUDO CITOLÓGICO</b><br><br><b>Paciente:</b> Maria<br><b>Idade:</b> 42<br><br><b>DESCRIÇÃO</b><br><br>Texto.",
    );
  });

  it("não altera a caixa do texto", () => {
    expect(render("laudo citológico", [["document_title", [0]]])).toBe("<b>laudo citológico</b>");
  });

  it("junta linhas de um parágrafo com espaço", () => {
    const html = render("Primeira linha\nSegunda linha", [["paragraph", [0, 1]]]);
    expect(html).toBe("Primeira linha Segunda linha");
  });

  it("preserva o marcador de item de lista", () => {
    const html = render("- Material insuficiente\n- Repetir coleta", [
      ["list_item", [0]],
      ["list_item", [1]],
    ]);

    expect(html).toBe("- Material insuficiente<br>- Repetir coleta");
  });

  it("aplica negrito no rótulo de nota", () => {
    const html = render("NOTA: correlacionar com dados clínicos.", [["note", [0]]]);
    expect(html).toBe("<b>NOTA:</b> correlacionar com dados clínicos.");
  });

  it("formata assinatura com linha em branco antes", () => {
    const html = render("Texto final.\nDra. Helena Martins\nCRM 123456-SP", [
      ["paragraph", [0]],
      ["signature", [1]],
      ["signature", [2]],
    ]);

    expect(html).toBe("Texto final.<br><br>Dra. Helena Martins<br>CRM 123456-SP");
  });

  it("formata campo sem valor", () => {
    expect(render("Paciente:", [["field", [0]]])).toBe("<b>Paciente:</b>");
  });

  it("escapa HTML malicioso", () => {
    const html = render("<script>alert(1)</script>", [["paragraph", [0]]]);

    expect(html).toBe("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(onlyAllowedTags(html)).toBe(true);
  });

  it("escapa caracteres especiais preservando o conteúdo", () => {
    const source = "Medida < 5 mm & \"ok\" 'x'";
    const html = render(source, [["paragraph", [0]]]);

    expect(html).toBe("Medida &lt; 5 mm &amp; &quot;ok&quot; &#39;x&#39;");
    expect(isContentPreserved(source, html)).toBe(true);
  });

  it("remove quebras no início e no fim", () => {
    const html = render("LAUDO\nTexto", [
      ["document_title", [0]],
      ["paragraph", [1]],
    ]);

    expect(hasLeadingOrTrailingBreak(html)).toBe(false);
  });

  it("não gera mais de duas quebras consecutivas", () => {
    const html = render(CITOLOGY_RAW, [
      ["document_title", [0]],
      ["field", [1]],
      ["field", [2]],
      ["section_heading", [3]],
      ["paragraph", [4, 5]],
      ["section_heading", [6]],
      ["paragraph", [7]],
      ["note", [8]],
      ["signature", [9, 10]],
    ]);

    expect(maxConsecutiveBreaks(html)).toBeLessThanOrEqual(2);
    expect(onlyAllowedTags(html)).toBe(true);
  });

  it("preserva o conteúdo completo de um laudo", () => {
    const { lines } = segmentInput(CITOLOGY_RAW);
    const report = heuristicClassify(lines, "citologia");
    const html = renderReport(report, "citologia");

    expect(isContentPreserved(CITOLOGY_RAW, html)).toBe(true);
    expect(onlyAllowedTags(html)).toBe(true);
    expect(hasLeadingOrTrailingBreak(html)).toBe(false);
    expect(maxConsecutiveBreaks(html)).toBeLessThanOrEqual(2);
  });
});
