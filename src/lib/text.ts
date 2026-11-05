export const FIELD_PATTERN = /^([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ0-9 ./()\-]{0,59}):\s*(.*)$/;

export const LIST_MARKER_PATTERN = /^([-*•]|\d{1,3}[.)]|[A-Za-z][.)])\s+/;

const INVALID_FIELD_LABELS = new Set(["http", "https", "www", "ftp"]);

export function normalizeKeyword(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function getFieldLabelEnd(text: string): number | null {
  const match = FIELD_PATTERN.exec(text);

  if (!match) {
    return null;
  }

  const label = match[1].trim();

  if (label.length === 0 || INVALID_FIELD_LABELS.has(label.toLowerCase())) {
    return null;
  }

  return match[1].length + 1;
}

export function stripListMarker(text: string): string {
  return text.replace(LIST_MARKER_PATTERN, "").trim();
}

export function isUpperCaseLine(text: string): boolean {
  const letters = text.match(/[A-Za-zÀ-ÿ]/g);

  if (!letters || letters.length < 2) {
    return false;
  }

  const upper = text.toUpperCase();
  return text === upper && text.length <= 100;
}

export function matchesKeyword(text: string, keywords: string[]): boolean {
  const normalized = normalizeKeyword(text);
  return keywords.some((keyword) => normalizeKeyword(keyword) === normalized);
}

export function startsWithKeyword(text: string, keywords: string[]): boolean {
  const normalized = normalizeKeyword(text);
  return keywords.some((keyword) => normalized.startsWith(`${normalizeKeyword(keyword)} `));
}
