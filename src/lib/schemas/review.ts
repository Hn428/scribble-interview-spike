import { z } from "zod";

/**
 * Documentation-gap, draft-note, and human-review schemas.
 *
 * MissingInfoWarning, DraftVisitNote, and HumanReviewPackage are all
 * model-generated structured outputs, so they avoid `.optional()`.
 */

/** A gap or risk in the documentation that a clinician should resolve. */
export const MissingInfoWarningSchema = z.object({
  id: z.string(),
  severity: z.enum(["high", "medium", "low"]),
  /** Short title, e.g. "Pain assessment not documented". */
  title: z.string(),
  /** Why it matters (compliance, billing, or clinical quality). */
  detail: z.string(),
  /** Concrete remediation the clinician can act on. */
  suggestedAction: z.string(),
});
export type MissingInfoWarning = z.infer<typeof MissingInfoWarningSchema>;

/** Structured-output wrapper (root must be an object). */
export const MissingInfoResultSchema = z.object({
  warnings: z.array(MissingInfoWarningSchema),
});
export type MissingInfoResult = z.infer<typeof MissingInfoResultSchema>;

/** A draft visit note in SOAP format. */
export const DraftVisitNoteSchema = z.object({
  format: z.enum(["SOAP"]),
  subjective: z.string(),
  objective: z.string(),
  assessment: z.string(),
  plan: z.string(),
});
export type DraftVisitNote = z.infer<typeof DraftVisitNoteSchema>;

const SourceEvidenceSchema = z.object({
  claim: z.string(),
  transcriptQuote: z.string(),
});

/** The bundle a human reviewer uses to approve, edit, or reject the output. */
export const HumanReviewPackageSchema = z.object({
  recommendation: z.enum(["approve", "approve_with_edits", "needs_review"]),
  /**
   * Aggregate confidence across the workflow, expected 0–1. Not range-bounded
   * in the schema because OpenAI strict structured outputs reject numeric
   * minimum/maximum constraints.
   */
  overallConfidence: z.number(),
  summary: z.string(),
  /** Specific items the reviewer must confirm before sign-off. */
  reviewerChecklist: z.array(z.string()),
  /** Transcript quotes supporting the key extracted facts. */
  sourceEvidence: z.array(SourceEvidenceSchema),
});
export type HumanReviewPackage = z.infer<typeof HumanReviewPackageSchema>;
