import { BLOCK_TYPES } from "./types";
import { classifyLineType } from "./heuristics";
import type {
  BlockType,
  ClassifiedReport,
  EmphasisSpan,
  RawClassification,
  ReportBlock,
  ReportPreset,
  SourceLine,
} from "./types";

const VALID_BLOCK_TYPES = new Set<string>(BLOCK_TYPES);
const MAX_EMPHASIS_SPANS = 50;

function validateEmphasis(
  lines: SourceLine[],
  spans: EmphasisSpan[] | undefined,
  warnings: string[],
): EmphasisSpan[] {
  const lineById = new Map(lines.map((line) => [line.id, line]));
  const accepted: EmphasisSpan[] = [];
  const acceptedByLine = new Map<number, EmphasisSpan[]>();
  let dropped = 0;

  for (const span of spans ?? []) {
    const line = lineById.get(span.lineId);

    if (
      !line ||
      span.style !== "italic" ||
      !Number.isInteger(span.start) ||
      !Number.isInteger(span.end) ||
      span.start < 0 ||
      span.end <= span.start ||
      span.end > line.text.length ||
      line.text.slice(span.start, span.end).trim().length === 0
    ) {
      dropped += 1;
      continue;
    }

    const current = acceptedByLine.get(span.lineId) ?? [];
    const overlaps = current.some(
      (existing) => span.start < existing.end && span.end > existing.start,
    );

    if (overlaps) {
      dropped += 1;
      continue;
    }

    if (accepted.length >= MAX_EMPHASIS_SPANS) {
      dropped += 1;
      continue;
    }

    current.push(span);
    acceptedByLine.set(span.lineId, current);
    accepted.push(span);
  }

  if (dropped > 0) {
    warnings.push("Alguns spans de itálico inválidos foram descartados.");
  }

  return accepted;
}

export interface RepairResult {
  report: ClassifiedReport;
  warnings: string[];
}

export function repairClassification(
  lines: SourceLine[],
  raw: RawClassification | null,
  preset: ReportPreset,
): RepairResult {
  const warnings: string[] = [];
  const typeByLine = new Map<number, BlockType>();
  const validIds = new Set(lines.map((line) => line.id));
  let invalid = 0;
  let duplicates = 0;

  for (const block of raw?.blocks ?? []) {
    if (!VALID_BLOCK_TYPES.has(block.type)) {
      invalid += 1;
      continue;
    }

    for (const lineId of block.lineIds) {
      if (!validIds.has(lineId)) {
        invalid += 1;
        continue;
      }

      if (typeByLine.has(lineId)) {
        duplicates += 1;
        continue;
      }

      typeByLine.set(lineId, block.type);
    }
  }

  let missing = 0;

  lines.forEach((line, index) => {
    if (typeByLine.has(line.id)) {
      return;
    }

    typeByLine.set(line.id, classifyLineType(line, index, lines, preset));
    missing += 1;
  });

  if (invalid > 0 || duplicates > 0 || missing > 0) {
    warnings.push("A classificação da IA foi ajustada para preservar todas as linhas.");
  }

  const blocks: ReportBlock[] = [];

  for (const line of lines) {
    const type = typeByLine.get(line.id) ?? "paragraph";
    const last = blocks[blocks.length - 1];
    const isParagraph = type === "paragraph" || type === "unknown";

    if (isParagraph && last && (last.type === "paragraph" || last.type === "unknown")) {
      last.lines.push(line);
      continue;
    }

    blocks.push({ type, lines: [line] });
  }

  const emphasis = validateEmphasis(lines, raw?.emphasis, warnings);

  return {
    report: {
      blocks,
      emphasis,
      warnings: [],
      usedFallback: false,
    },
    warnings,
  };
}
