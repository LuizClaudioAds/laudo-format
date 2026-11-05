export const REPORT_PRESETS = ["generico", "citologia"] as const;

export type ReportPreset = (typeof REPORT_PRESETS)[number];

export const BLOCK_TYPES = [
  "document_title",
  "section_heading",
  "field",
  "paragraph",
  "list_item",
  "note",
  "signature",
  "unknown",
] as const;

export type BlockType = (typeof BLOCK_TYPES)[number];

export interface SourceLine {
  id: number;
  text: string;
  start: number;
  end: number;
}

export interface SegmentedInput {
  normalizedText: string;
  lines: SourceLine[];
}

export interface EmphasisSpan {
  lineId: number;
  start: number;
  end: number;
  style: "italic";
}

export interface RawBlock {
  lineIds: number[];
  type: BlockType;
  confidence?: number;
}

export interface RawClassification {
  blocks: RawBlock[];
  emphasis?: EmphasisSpan[];
  warnings?: string[];
}

export interface ReportBlock {
  type: BlockType;
  lines: SourceLine[];
  confidence?: number;
}

export interface ClassifiedReport {
  blocks: ReportBlock[];
  emphasis: EmphasisSpan[];
  warnings: string[];
  usedFallback: boolean;
}

export interface FormatMeta {
  provider: string;
  model: string;
  usedFallback: boolean;
  durationMs: number;
  characters: number;
  lines: number;
  blocks: number;
}

export interface FormatResult {
  html: string;
  warnings: string[];
  meta: FormatMeta;
}

export interface SpellSuggestion {
  lineId: number;
  start: number;
  end: number;
  original: string;
  suggestion: string;
  reason?: string;
  confidence?: number;
}

export interface SpellCheckMeta {
  provider: string;
  model: string;
  usedFallback: boolean;
  durationMs: number;
}

export interface SpellCheckResult {
  suggestions: SpellSuggestion[];
  warnings: string[];
  meta: SpellCheckMeta;
}
