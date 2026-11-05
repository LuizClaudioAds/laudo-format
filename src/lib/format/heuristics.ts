import { getPreset, type ReportPresetConfig } from "@/config/report-rules";
import {
  FIELD_PATTERN,
  LIST_MARKER_PATTERN,
  getFieldLabelEnd,
  isUpperCaseLine,
  matchesKeyword,
  normalizeKeyword,
  startsWithKeyword,
  stripListMarker,
} from "@/lib/text";
import type { BlockType, ClassifiedReport, ReportBlock, ReportPreset, SourceLine } from "./types";

function isTitleLine(text: string, config: ReportPresetConfig): boolean {
  const normalized = normalizeKeyword(text);
  return config.titleKeywords.some((keyword) => normalized.includes(normalizeKeyword(keyword)));
}

function isSectionLine(text: string, config: ReportPresetConfig): boolean {
  return matchesKeyword(text, config.sectionKeywords);
}

function isNoteLine(text: string, config: ReportPresetConfig): boolean {
  const labelEnd = getFieldLabelEnd(text);

  if (labelEnd === null) {
    return startsWithKeyword(text, config.noteKeywords);
  }

  const label = normalizeKeyword(text.slice(0, labelEnd - 1));
  return config.noteKeywords.some((keyword) => {
    const normalized = normalizeKeyword(keyword);
    return label === normalized || label.startsWith(`${normalized} `);
  });
}

function isSignatureLine(
  text: string,
  index: number,
  lines: SourceLine[],
  config: ReportPresetConfig,
): boolean {
  const nearTheEnd = index >= Math.max(0, lines.length - 5);

  if (!nearTheEnd) {
    return false;
  }

  const normalized = normalizeKeyword(text);
  return config.signatureKeywords.some((keyword) => normalized.includes(normalizeKeyword(keyword)));
}

export function classifyLineType(
  line: SourceLine,
  index: number,
  lines: SourceLine[],
  preset: ReportPreset,
): BlockType {
  const config = getPreset(preset);
  const text = line.text;
  const withoutMarker = stripListMarker(text);

  if (index === 0 && isTitleLine(text, config)) {
    return "document_title";
  }

  if (isSectionLine(withoutMarker, config)) {
    return "section_heading";
  }

  if (isNoteLine(text, config)) {
    return "note";
  }

  if (getFieldLabelEnd(text) !== null || FIELD_PATTERN.test(text)) {
    return "field";
  }

  if (isSignatureLine(text, index, lines, config)) {
    return "signature";
  }

  if (LIST_MARKER_PATTERN.test(text)) {
    return "list_item";
  }

  return "paragraph";
}

export function heuristicClassify(lines: SourceLine[], preset: ReportPreset): ClassifiedReport {
  const blocks: ReportBlock[] = [];

  lines.forEach((line, index) => {
    const type = classifyLineType(line, index, lines, preset);
    const last = blocks[blocks.length - 1];
    const isParagraph = type === "paragraph" || type === "unknown";

    if (isParagraph && last && (last.type === "paragraph" || last.type === "unknown")) {
      last.lines.push(line);
      return;
    }

    blocks.push({
      type,
      lines: [line],
      confidence: isUpperCaseLine(line.text) ? 0.6 : 0.5,
    });
  });

  return {
    blocks,
    emphasis: [],
    warnings: [],
    usedFallback: true,
  };
}
