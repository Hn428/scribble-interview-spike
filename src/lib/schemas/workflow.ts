import { z } from "zod";
import { ClinicalFactsSchema, PatientContextSchema } from "./clinical";
import { OasisStyleFieldMappingSchema } from "./oasis";
import {
  DraftVisitNoteSchema,
  HumanReviewPackageSchema,
  MissingInfoWarningSchema,
} from "./review";
import { TranscriptConfidenceAnalysisSchema } from "./insights";

/**
 * Top-level workflow schemas. These are validated and typed for our own use;
 * they are NOT sent to OpenAI, so `.optional()` is fine here.
 */

/** Execution mode for a workflow run. */
export const WorkflowModeSchema = z.enum(["openai", "mock"]);
export type WorkflowMode = z.infer<typeof WorkflowModeSchema>;

/** Observability mode for a workflow run. */
export const ObservabilityModeSchema = z.enum(["disabled", "langfuse"]);
export type ObservabilityMode = z.infer<typeof ObservabilityModeSchema>;

export const WorkflowStepStatusSchema = z.enum([
  "completed",
  "skipped",
  "failed",
]);
export type WorkflowStepStatus = z.infer<typeof WorkflowStepStatusSchema>;

/** One node in the workflow execution timeline. */
export const VisitWorkflowStepSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string(),
  status: WorkflowStepStatusSchema,
  /** ISO-8601 start timestamp. */
  startedAt: z.string(),
  /** ISO-8601 end timestamp. */
  endedAt: z.string(),
  durationMs: z.number(),
  /** Short human-readable summary of what happened in this step. */
  summary: z.string(),
  /** Model used, or null for deterministic / mocked steps. */
  model: z.string().nullable(),
});
export type VisitWorkflowStep = z.infer<typeof VisitWorkflowStepSchema>;

/** The complete, typed result of one workflow run. */
export const VisitWorkflowResultSchema = z.object({
  workflowId: z.string(),
  /** Whether real OpenAI calls were used, or deterministic mock fallback. */
  mode: WorkflowModeSchema,
  patientContext: PatientContextSchema,
  cleanedTranscript: z.string(),
  clinicalFacts: ClinicalFactsSchema,
  oasisMappings: z.array(OasisStyleFieldMappingSchema),
  missingInfoWarnings: z.array(MissingInfoWarningSchema),
  draftNote: DraftVisitNoteSchema,
  humanReviewPackage: HumanReviewPackageSchema,
  steps: z.array(VisitWorkflowStepSchema),
  /** Whether Langfuse tracing was active for this run. */
  observabilityMode: ObservabilityModeSchema,
  /** Langfuse trace id, when observability is enabled and a trace was created. */
  traceId: z.string().optional(),
  /** Best-effort deep link to the trace in Langfuse, when derivable. */
  traceUrl: z.string().optional(),
  /**
   * Sidecar transcript confidence analysis — an EXTRA review layer that does
   * not override the main documentation output.
   */
  transcriptConfidenceAnalysis: TranscriptConfidenceAnalysisSchema.optional(),
  /** Always-present safety disclaimer for the UI. */
  disclaimer: z.string(),
});
export type VisitWorkflowResult = z.infer<typeof VisitWorkflowResultSchema>;
