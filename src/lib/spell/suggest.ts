import type { SourceLine, SpellSuggestion } from "@/lib/format/types";

const MAX_SPELL_SUGGESTIONS = 20;

export interface SpellRepairResult {
  suggestions: SpellSuggestion[];
  warnings: string[];
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

export function repairSuggestions(
  lines: SourceLine[],
  raw: SpellSuggestion[] | undefined,
): SpellRepairResult {
  const lineById = new Map(lines.map((line) => [line.id, line]));
  const warnings: string[] = [];
  const accepted: SpellSuggestion[] = [];
  const acceptedByLine = new Map<number, SpellSuggestion[]>();
  let dropped = 0;

  for (const suggestion of raw ?? []) {
    const line = lineById.get(suggestion.lineId);

    if (
      !line ||
      !Number.isInteger(suggestion.start) ||
      !Number.isInteger(suggestion.end) ||
      suggestion.start < 0 ||
      suggestion.end <= suggestion.start ||
      suggestion.end > line.text.length
    ) {
      dropped += 1;
      continue;
    }

    const { start, end } = suggestion;

    if (
      !isNonEmptyString(suggestion.original) ||
      !isNonEmptyString(suggestion.suggestion) ||
      suggestion.original !== line.text.slice(start, end) ||
      line.text.slice(start, end).trim().length === 0 ||
      suggestion.suggestion === suggestion.original
    ) {
      dropped += 1;
      continue;
    }

    const current = acceptedByLine.get(suggestion.lineId) ?? [];
    const overlaps = current.some((existing) => start < existing.end && end > existing.start);

    if (overlaps) {
      dropped += 1;
      continue;
    }

    if (accepted.length >= MAX_SPELL_SUGGESTIONS) {
      dropped += 1;
      continue;
    }

    current.push(suggestion);
    acceptedByLine.set(suggestion.lineId, current);
    accepted.push(suggestion);
  }

  if (dropped > 0) {
    warnings.push("Algumas sugestões ortográficas inválidas foram descartadas.");
  }

  return { suggestions: accepted, warnings };
}
