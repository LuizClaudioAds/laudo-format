import type { SpellSuggestion } from "@/lib/format/types";

const LINE_BREAK_PATTERN = /(\r\n|\r|\n)/;

export function applySuggestion(rawText: string, suggestion: SpellSuggestion): string | null {
  if (
    !Number.isInteger(suggestion.lineId) ||
    !Number.isInteger(suggestion.start) ||
    !Number.isInteger(suggestion.end) ||
    suggestion.start < 0 ||
    suggestion.end <= suggestion.start ||
    suggestion.original.length === 0 ||
    suggestion.suggestion.length === 0 ||
    suggestion.suggestion === suggestion.original
  ) {
    return null;
  }

  const parts = rawText.split(LINE_BREAK_PATTERN);
  let lineId = 0;

  for (let index = 0; index < parts.length; index += 2) {
    const rawLine = parts[index];
    const normalizedLine = rawLine.normalize("NFC");
    const text = normalizedLine.trim();

    if (text.length === 0) {
      continue;
    }

    if (lineId !== suggestion.lineId) {
      lineId += 1;
      continue;
    }

    if (
      suggestion.end > text.length ||
      text.slice(suggestion.start, suggestion.end) !== suggestion.original
    ) {
      return null;
    }

    const leadingWhitespace = normalizedLine.length - normalizedLine.trimStart().length;
    const startInRawLine = leadingWhitespace + suggestion.start;
    const endInRawLine = leadingWhitespace + suggestion.end;

    if (rawLine.slice(startInRawLine, endInRawLine) !== suggestion.original) {
      return null;
    }

    parts[index] =
      rawLine.slice(0, startInRawLine) + suggestion.suggestion + rawLine.slice(endInRawLine);

    return parts.join("");
  }

  return null;
}
