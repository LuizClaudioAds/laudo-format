import { getPreset } from "@/config/report-rules";
import { getFieldLabelEnd, normalizeKeyword } from "@/lib/text";
import type {
  BlockType,
  ClassifiedReport,
  EmphasisSpan,
  ReportBlock,
  ReportPreset,
  SourceLine,
} from "./types";

type SpanStyle = "bold" | "italic";

interface StyledSpan {
  start: number;
  end: number;
  style: SpanStyle;
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function resolveSpans(spans: StyledSpan[], length: number): StyledSpan[] {
  const valid = spans
    .filter(
      (span) =>
        Number.isInteger(span.start) &&
        Number.isInteger(span.end) &&
        span.start >= 0 &&
        span.end > span.start &&
        span.end <= length,
    )
    .sort((a, b) => {
      if (a.start !== b.start) {
        return a.start - b.start;
      }

      if (a.style !== b.style) {
        return a.style === "bold" ? -1 : 1;
      }

      return b.end - a.end;
    });

  const resolved: StyledSpan[] = [];
  let cursor = 0;

  for (const span of valid) {
    if (span.start < cursor) {
      continue;
    }

    resolved.push(span);
    cursor = span.end;
  }

  return resolved;
}

export function renderLine(text: string, spans: StyledSpan[] = []): string {
  const ordered = resolveSpans(spans, text.length);

  if (ordered.length === 0) {
    return escapeHtml(text);
  }

  let output = "";
  let cursor = 0;

  for (const span of ordered) {
    output += escapeHtml(text.slice(cursor, span.start));
    const tag = span.style === "bold" ? "b" : "i";
    output += `<${tag}>${escapeHtml(text.slice(span.start, span.end))}</${tag}>`;
    cursor = span.end;
  }

  output += escapeHtml(text.slice(cursor));
  return output;
}

function noteLabelEnd(text: string, noteKeywords: string[]): number | null {
  const labelEnd = getFieldLabelEnd(text);

  if (labelEnd === null) {
    return null;
  }

  const label = normalizeKeyword(text.slice(0, labelEnd - 1));

  if (
    noteKeywords.some((keyword) => {
      const normalized = normalizeKeyword(keyword);
      return label === normalized || label.startsWith(`${normalized} `);
    })
  ) {
    return labelEnd;
  }

  return null;
}

function blockSpans(
  block: ReportBlock,
  line: SourceLine,
  emphasisByLine: Map<number, EmphasisSpan[]>,
  noteKeywords: string[],
): StyledSpan[] {
  const spans: StyledSpan[] = [];

  if (block.type === "document_title" || block.type === "section_heading") {
    spans.push({ start: 0, end: line.text.length, style: "bold" });
  }

  if (block.type === "field") {
    const labelEnd = getFieldLabelEnd(line.text);

    if (labelEnd !== null) {
      spans.push({ start: 0, end: labelEnd, style: "bold" });
    }
  }

  if (block.type === "note") {
    const labelEnd = noteLabelEnd(line.text, noteKeywords);

    if (labelEnd !== null) {
      spans.push({ start: 0, end: labelEnd, style: "bold" });
    }
  }

  for (const emphasis of emphasisByLine.get(line.id) ?? []) {
    spans.push({ start: emphasis.start, end: emphasis.end, style: "italic" });
  }

  return spans;
}

function renderBlock(
  block: ReportBlock,
  emphasisByLine: Map<number, EmphasisSpan[]>,
  noteKeywords: string[],
): string[] {
  const rendered = block.lines.map((line) =>
    renderLine(line.text, blockSpans(block, line, emphasisByLine, noteKeywords)),
  );

  if (block.type === "field" || block.type === "list_item" || block.type === "signature") {
    return rendered;
  }

  return [rendered.join(" ")];
}

function groupEmphasis(emphasis: EmphasisSpan[]): Map<number, EmphasisSpan[]> {
  const grouped = new Map<number, EmphasisSpan[]>();

  for (const span of emphasis) {
    const current = grouped.get(span.lineId);

    if (current) {
      current.push(span);
    } else {
      grouped.set(span.lineId, [span]);
    }
  }

  return grouped;
}

export function renderReport(report: ClassifiedReport, preset: ReportPreset): string {
  const presetConfig = getPreset(preset);
  const emphasisByLine = groupEmphasis(report.emphasis);
  const entries: string[] = [];
  let lastType: BlockType | null = null;

  const pushBlank = () => {
    if (entries.length > 0 && entries[entries.length - 1] !== "") {
      entries.push("");
    }
  };

  for (const block of report.blocks) {
    const renderedLines = renderBlock(block, emphasisByLine, presetConfig.noteKeywords);

    switch (block.type) {
      case "document_title":
        pushBlank();
        entries.push(renderedLines.join(" "));
        pushBlank();
        break;
      case "section_heading":
        pushBlank();
        entries.push(renderedLines.join(" "));
        pushBlank();
        break;
      case "field":
        if (lastType !== "field") {
          pushBlank();
        }
        entries.push(...renderedLines);
        break;
      case "list_item":
        if (lastType !== "list_item") {
          pushBlank();
        }
        entries.push(...renderedLines);
        break;
      case "note":
        pushBlank();
        entries.push(renderedLines.join(" "));
        break;
      case "signature":
        pushBlank();
        entries.push(...renderedLines);
        break;
      case "paragraph":
      case "unknown":
        pushBlank();
        entries.push(renderedLines.join(" "));
        break;
    }

    lastType = block.type;
  }

  while (entries[0] === "") {
    entries.shift();
  }

  while (entries[entries.length - 1] === "") {
    entries.pop();
  }

  const compact: string[] = [];

  for (const entry of entries) {
    if (entry === "" && compact[compact.length - 1] === "") {
      continue;
    }

    compact.push(entry);
  }

  return compact.join("<br>");
}
