import { z } from "zod";

/**
 * OASIS-style assessment mapping schemas.
 *
 * NOTE: These are *OASIS-style* fields for demonstration only — not a complete
 * or certified OASIS-E instrument.
 */

/** A single OASIS-style assessment item mapped from the clinical facts. */
export const OasisStyleFieldMappingSchema = z.object({
  /** OASIS item identifier, e.g. "M1860". */
  itemId: z.string(),
  /** Human-readable label for the item. */
  label: z.string(),
  /** Mapped value, or null when the transcript did not support a value. */
  value: z.string().nullable(),
  confidence: z.enum(["high", "medium", "low"]),
  /** Short justification grounded in the transcript / facts. */
  rationale: z.string(),
});
export type OasisStyleFieldMapping = z.infer<
  typeof OasisStyleFieldMappingSchema
>;

/**
 * Structured-output wrapper. OpenAI structured outputs require the JSON root to
 * be an object, so the array of mappings is nested under a key.
 */
export const OasisMappingResultSchema = z.object({
  mappings: z.array(OasisStyleFieldMappingSchema),
});
export type OasisMappingResult = z.infer<typeof OasisMappingResultSchema>;
