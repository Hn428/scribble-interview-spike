import { randomUUID } from "crypto";
import { hasOpenAIKey, getModel } from "../llm/client";
import { SAFETY_DISCLAIMER } from "../constants";
import type { PatientContext } from "../schemas/clinical";
import type {
  VisitWorkflowResult,
  VisitWorkflowStep,
  WorkflowMode,
} from "../schemas/workflow";
import { getPatientContext } from "../fixtures/samplePatientContext";
import {
  buildTraceUrl,
  flushLangfuseSafely,
  getObservabilityMode,
} from "../observability/langfuse";
import { traceStep, withWorkflowTrace } from "../observability/traceWorkflow";
import type { StepContext, StepOutcome } from "./stepTypes";
import { cleanTranscript } from "./steps/cleanTranscript";
import { extractClinicalFacts } from "./steps/extractClinicalFacts";
import { mapOasisFields } from "./steps/mapOasisFields";
import { detectMissingInfo } from "./steps/detectMissingInfo";
import { generateDraftNote } from "./steps/generateDraftNote";
import { packageForReview } from "./steps/packageForReview";
import { analyzeTranscriptConfidence } from "./steps/analyzeTranscriptConfidence";

export interface RunVisitWorkflowInput {
  transcript: string;
  patientId?: string;
}

interface StepIdentity {
  id: string;
  label: string;
  description: string;
}

/**
 * Run a single step: time it, trace it (when enabled), record a
 * `VisitWorkflowStep` entry, and return the step's value. Steps handle their own
 * LLM/mock fallback, so a thrown error here is genuinely unexpected — we still
 * record it and re-throw with context so the API route returns a clean error.
 */
async function runStep<T>(
  identity: StepIdentity,
  steps: VisitWorkflowStep[],
  mode: WorkflowMode,
  fn: () => Promise<StepOutcome<T>>,
): Promise<T> {
  const startedAt = new Date().toISOString();
  const start = Date.now();
  try {
    const outcome = await traceStep(
      { name: identity.id, mode, inputSummary: identity.description },
      fn,
    );
    const endedAt = new Date().toISOString();
    steps.push({
      ...identity,
      status: outcome.status,
      startedAt,
      endedAt,
      durationMs: Date.now() - start,
      summary: outcome.summary,
      model: outcome.model,
    });
    return outcome.value;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    steps.push({
      ...identity,
      status: "failed",
      startedAt,
      endedAt: new Date().toISOString(),
      durationMs: Date.now() - start,
      summary: `Unexpected error: ${message}`,
      model: null,
    });
    throw new Error(`Workflow step "${identity.id}" failed: ${message}`);
  }
}

/**
 * Orchestrate the full home health documentation workflow.
 *
 * - `openai` mode when OPENAI_API_KEY is present, otherwise `mock` mode.
 * - `langfuse` observability when Langfuse keys are present, otherwise `disabled`.
 * - The whole run is wrapped in a root trace; each step is a child span.
 * - LLM steps fall back to deterministic mock output on failure so a partial
 *   outage never crashes the demo.
 * - The final sidecar step (transcript confidence) is an extra review layer and
 *   does not affect the main documentation output.
 */
export async function runVisitWorkflow(
  input: RunVisitWorkflowInput,
): Promise<VisitWorkflowResult> {
  const mode: WorkflowMode = hasOpenAIKey() ? "openai" : "mock";
  const ctx: StepContext = { mode, model: getModel() };
  const patientContext: PatientContext = getPatientContext(input.patientId);
  const steps: VisitWorkflowStep[] = [];

  const { result, traceId } = await withWorkflowTrace(
    {
      name: "visit-documentation-workflow",
      input: {
        patientId: patientContext.patientId,
        transcriptChars: input.transcript.length,
        mode,
      },
    },
    async () => {
      const cleanedTranscript = await runStep(
        {
          id: "clean_transcript",
          label: "Clean transcript",
          description:
            "Normalize whitespace and formatting of the raw transcript.",
        },
        steps,
        mode,
        () => cleanTranscript({ transcript: input.transcript }, ctx),
      );

      const clinicalFacts = await runStep(
        {
          id: "extract_clinical_facts",
          label: "Extract clinical facts",
          description:
            "Pull structured vitals, meds, diagnoses, ADLs, and risks.",
        },
        steps,
        mode,
        () => extractClinicalFacts({ cleanedTranscript, patientContext }, ctx),
      );

      const oasisMappings = await runStep(
        {
          id: "map_oasis_fields",
          label: "Map OASIS fields",
          description: "Map extracted facts to OASIS-style assessment items.",
        },
        steps,
        mode,
        () => mapOasisFields({ clinicalFacts }, ctx),
      );

      const missingInfoWarnings = await runStep(
        {
          id: "detect_missing_info",
          label: "Detect missing documentation",
          description: "Flag compliance, billing, and clinical-quality gaps.",
        },
        steps,
        mode,
        () => detectMissingInfo({ clinicalFacts, oasisMappings }, ctx),
      );

      const draftNote = await runStep(
        {
          id: "generate_draft_note",
          label: "Generate draft note",
          description: "Produce a SOAP-format draft visit note.",
        },
        steps,
        mode,
        () => generateDraftNote({ clinicalFacts, patientContext }, ctx),
      );

      const humanReviewPackage = await runStep(
        {
          id: "package_for_review",
          label: "Package for human review",
          description:
            "Assemble recommendation, checklist, and source evidence.",
        },
        steps,
        mode,
        () =>
          packageForReview(
            {
              cleanedTranscript,
              clinicalFacts,
              oasisMappings,
              missingInfoWarnings,
              draftNote,
            },
            ctx,
          ),
      );

      // SIDECAR — extra review layer, not part of final note generation.
      const transcriptConfidenceAnalysis = await runStep(
        {
          id: "analyze_transcript_confidence",
          label: "Sidecar: Transcript Confidence Analysis",
          description:
            "Highlight transcript phrases that support, weaken, or need confirmation.",
        },
        steps,
        mode,
        () => analyzeTranscriptConfidence({ cleanedTranscript }, ctx),
      );

      return {
        cleanedTranscript,
        clinicalFacts,
        oasisMappings,
        missingInfoWarnings,
        draftNote,
        humanReviewPackage,
        transcriptConfidenceAnalysis,
      };
    },
  );

  // Flush spans best-effort so the trace is available shortly after the request.
  await flushLangfuseSafely();

  return {
    workflowId: `wf_${randomUUID()}`,
    mode,
    observabilityMode: getObservabilityMode(),
    traceId,
    traceUrl: buildTraceUrl(traceId),
    patientContext,
    cleanedTranscript: result.cleanedTranscript,
    clinicalFacts: result.clinicalFacts,
    oasisMappings: result.oasisMappings,
    missingInfoWarnings: result.missingInfoWarnings,
    draftNote: result.draftNote,
    humanReviewPackage: result.humanReviewPackage,
    transcriptConfidenceAnalysis: result.transcriptConfidenceAnalysis,
    steps,
    disclaimer: SAFETY_DISCLAIMER,
  };
}
