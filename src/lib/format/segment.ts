import { AppError } from "@/lib/errors";
import type { SegmentedInput, SourceLine } from "./types";

export const MAX_CHARACTERS = 20_000;
export const MAX_LINES = 500;
export const MAX_REQUEST_BYTES = 64 * 1024;

export function normalizeText(raw: string): string {
  return raw.normalize("NFC").replace(/\r\n?/g, "\n");
}

export function segmentInput(raw: string): SegmentedInput {
  const normalizedText = normalizeText(raw);

  if (normalizedText.length > MAX_CHARACTERS) {
    throw new AppError(
      "INPUT_TOO_LARGE",
      413,
      `O texto excede o limite de ${MAX_CHARACTERS.toLocaleString("pt-BR")} caracteres.`,
    );
  }

  const lines: SourceLine[] = [];
  let absoluteOffset = 0;
  let lineId = 0;

  for (const rawLine of normalizedText.split("\n")) {
    const text = rawLine.trim();
    const leadingWhitespace = rawLine.length - rawLine.trimStart().length;

    if (text.length > 0) {
      const start = absoluteOffset + leadingWhitespace;
      lines.push({
        id: lineId,
        text,
        start,
        end: start + text.length,
      });
      lineId += 1;
    }

    absoluteOffset += rawLine.length + 1;
  }

  if (lines.length === 0) {
    throw new AppError("EMPTY_INPUT", 400, "Cole o texto de um laudo para formatar.");
  }

  if (lines.length > MAX_LINES) {
    throw new AppError(
      "TOO_MANY_LINES",
      413,
      `O texto excede o limite de ${MAX_LINES} linhas não vazias.`,
    );
  }

  return { normalizedText, lines };
}
