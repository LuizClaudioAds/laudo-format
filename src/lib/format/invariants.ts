import { normalizeText } from "./segment";

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  "#39": "'",
};

const ALLOWED_TAG_PATTERN = /<br\s*\/?>|<\/?[bi]\s*>/gi;

export function decodeEntities(text: string): string {
  return text.replace(/&(amp|lt|gt|quot|#39);/g, (_, entity: string) => ENTITIES[entity] ?? _);
}

export function htmlToText(html: string): string {
  return decodeEntities(html.replace(/<br\s*\/?>/gi, " ").replace(/<\/?[bi]\s*>/gi, ""));
}

export function contentSignature(text: string): string {
  return text.replace(/\s+/g, "");
}

export function isContentPreserved(source: string, html: string): boolean {
  return contentSignature(normalizeText(source)) === contentSignature(htmlToText(html));
}

export function onlyAllowedTags(html: string): boolean {
  const withoutAllowedTags = html.replace(ALLOWED_TAG_PATTERN, "");
  return !/[<>]/.test(withoutAllowedTags);
}

export function hasLeadingOrTrailingBreak(html: string): boolean {
  return /^<br>/i.test(html) || /<br>$/i.test(html);
}

export function maxConsecutiveBreaks(html: string): number {
  const groups = html.match(/(?:<br\s*\/?>)+/gi) ?? [];
  return groups.reduce((max, group) => {
    const count = (group.match(/<br\s*\/?>/gi) ?? []).length;
    return Math.max(max, count);
  }, 0);
}
