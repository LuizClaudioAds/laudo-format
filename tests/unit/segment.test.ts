import { describe, expect, it } from "vitest";

import { AppError } from "@/lib/errors";
import { MAX_CHARACTERS, MAX_LINES, normalizeText, segmentInput } from "@/lib/format/segment";

describe("normalizeText", () => {
  it("normaliza quebras CRLF e CR para LF", () => {
    expect(normalizeText("a\r\nb\rc")).toBe("a\nb\nc");
  });

  it("aplica normalização NFC", () => {
    const decomposed = "cafe\u0301";
    expect(normalizeText(decomposed)).toBe("café");
  });
});

describe("segmentInput", () => {
  it("remove linhas vazias e calcula offsets", () => {
    const result = segmentInput("  Título  \n\nPaciente: Maria\n");

    expect(result.lines).toHaveLength(2);
    expect(result.lines[0]).toMatchObject({ id: 0, text: "Título" });
    expect(result.lines[1]).toMatchObject({ id: 1, text: "Paciente: Maria" });
    expect(result.normalizedText.slice(result.lines[0].start, result.lines[0].end)).toBe("Título");
    expect(result.normalizedText.slice(result.lines[1].start, result.lines[1].end)).toBe(
      "Paciente: Maria",
    );
  });

  it("mantém espaços internos e remove apenas extremidades", () => {
    const result = segmentInput("  Texto   com   espaços  ");
    expect(result.lines[0].text).toBe("Texto   com   espaços");
  });

  it("recusa entrada vazia", () => {
    expect(() => segmentInput(" \n \n ")).toThrowError(AppError);

    try {
      segmentInput("");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe("EMPTY_INPUT");
      expect((error as AppError).status).toBe(400);
    }
  });

  it("recusa texto acima do limite de caracteres", () => {
    expect(() => segmentInput("a".repeat(MAX_CHARACTERS + 1))).toThrowError(/20.000/);
  });

  it("recusa linhas acima do limite", () => {
    const text = Array.from({ length: MAX_LINES + 1 }, (_, index) => `Linha ${index}`).join("\n");

    try {
      segmentInput(text);
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe("TOO_MANY_LINES");
      expect((error as AppError).status).toBe(413);
    }
  });
});
