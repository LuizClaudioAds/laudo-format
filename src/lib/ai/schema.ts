import { z } from "zod";

const blockTypeSchema = z.enum([
  "document_title",
  "section_heading",
  "field",
  "paragraph",
  "list_item",
  "note",
  "signature",
  "unknown",
]);

const emphasisSchema = z.object({
  lineId: z.number().int().nonnegative(),
  start: z.number().int().nonnegative(),
  end: z.number().int().positive(),
  style: z.literal("italic"),
});

const rawBlockSchema = z.object({
  lineIds: z.array(z.number().int().nonnegative()).min(1).max(500),
  type: blockTypeSchema,
  confidence: z.number().min(0).max(1).optional(),
});

export const classificationSchema = z.object({
  blocks: z.array(rawBlockSchema).min(1).max(1000),
  emphasis: z.array(emphasisSchema).max(50).optional().default([]),
  warnings: z.array(z.string().max(200)).max(10).optional().default([]),
});

export type ClassificationOutput = z.infer<typeof classificationSchema>;

export const spellSuggestionSchema = z.object({
  lineId: z.number().int().nonnegative(),
  start: z.number().int().nonnegative(),
  end: z.number().int().positive(),
  original: z.string().min(1).max(120),
  suggestion: z.string().min(1).max(120),
  reason: z.string().max(200).optional(),
  confidence: z.number().min(0).max(1).optional(),
});

export const spellCheckSchema = z.object({
  suggestions: z.array(spellSuggestionSchema).max(20),
  warnings: z.array(z.string().max(200)).max(10).optional().default([]),
});

export type SpellCheckOutput = z.infer<typeof spellCheckSchema>;
