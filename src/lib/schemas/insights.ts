import { z } from "zod";

/**
 * Sidecar "Transcript Confidence & Uncertainty" analysis schemas.
 *
 * This is an EXTRA review layer — it never overrides the main documentation
 * output. It highlights transcript phrases that support, weaken, or require
 * confirmation before documentation is finalized.
 *
 * Model-generated, so `.nullable()` is used instead of `.optional()` for the
 * one optional field (OpenAI strict structured outputs require every key).
 */

export const InsightCategorySchema = z.enum([
  "strong_confirmation",
  "uncertainty",
  "needs_clinician_confirmation",
  "possible_contradiction",
  "missing_context",
  "safety_relevant",
]);
export type InsightCategory = z.infer<typeof InsightCategorySchema>;

export const TranscriptInsightSchema = z.object({
  id: z.string(),
  category: InsightCategorySchema,
  severity: z.enum(["low", "medium", "high"]),
  /** The key phrase / wording identified in the transcript. */
  phrasing: z.string(),
  /** The surrounding transcript quote that evidences the insight. */
  transcriptEvidence: z.string(),
  /** Why this phrase supports, weakens, or needs confirmation. */
  explanation: z.string(),
  /** Suggested clinician follow-up, or null when none applies. */
  recommendedFollowUp: z.string().nullable(),
});
export type TranscriptInsight = z.infer<typeof TranscriptInsightSchema>;

export const TranscriptConfidenceAnalysisSchema = z.object({
  summary: z.string(),
  overallConfidence: z.enum(["low", "medium", "high"]),
  insights: z.array(TranscriptInsightSchema),
});
export type TranscriptConfidenceAnalysis = z.infer<
  typeof TranscriptConfidenceAnalysisSchema
>;
