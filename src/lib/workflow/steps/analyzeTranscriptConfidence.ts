import { generateStructured } from "../../llm/client";
import {
  ANALYZE_TRANSCRIPT_CONFIDENCE_SYSTEM,
  buildAnalyzeTranscriptConfidenceUser,
} from "../../llm/prompts";
import {
  TranscriptConfidenceAnalysisSchema,
  type TranscriptConfidenceAnalysis,
} from "../../schemas/insights";
import { runLLMStep, type StepContext, type StepOutcome } from "../stepTypes";

/**
 * Deterministic mock confidence analysis aligned to the sample transcript.
 * Used in mock mode and as the safe fallback when the LLM call fails.
 */
function mockConfidenceAnalysis(): TranscriptConfidenceAnalysis {
  return {
    summary:
      "Transcript is largely usable but contains hedged language and several safety-relevant findings that warrant clinician confirmation before documentation is finalized.",
    overallConfidence: "medium",
    insights: [
      {
        id: "conf_walker",
        category: "strong_confirmation",
        severity: "low",
        phrasing: "ambulates with a front-wheeled walker",
        transcriptEvidence: "he ambulates with a front-wheeled walker",
        explanation:
          "Clearly stated assistive-device use; well supported for OASIS ambulation mapping.",
        recommendedFollowUp: null,
      },
      {
        id: "conf_okay",
        category: "uncertainty",
        severity: "low",
        phrasing: '"doing okay"',
        transcriptEvidence: 'He reports he\'s "doing okay"',
        explanation:
          "Subjective, hedged self-report that conflicts with objective findings of fluid overload.",
        recommendedFollowUp:
          "Quantify symptom status with a structured question or scale.",
      },
      {
        id: "conf_furosemide",
        category: "needs_clinician_confirmation",
        severity: "medium",
        phrasing: "wasn't sure whether he took his furosemide",
        transcriptEvidence:
          "He wasn't sure whether he took his furosemide this morning, so adherence is uncertain",
        explanation:
          "Medication adherence is unconfirmed for a CHF diuretic — material to the assessment and plan.",
        recommendedFollowUp:
          "Confirm last furosemide dose and document the teaching response.",
      },
      {
        id: "conf_dyspnea_no_spo2_context",
        category: "missing_context",
        severity: "medium",
        phrasing: "short of breath walking from the bedroom to the kitchen",
        transcriptEvidence:
          "he gets short of breath walking from the bedroom to the kitchen",
        explanation:
          "Exertional dyspnea is noted without a documented dyspnea scale or activity-specific SpO2.",
        recommendedFollowUp:
          "Document a dyspnea scale and consider SpO2 with exertion.",
      },
      {
        id: "conf_weight_gain",
        category: "safety_relevant",
        severity: "high",
        phrasing: "up about 4 pounds from last week",
        transcriptEvidence:
          "weight 211 pounds — that's up about 4 pounds from last week",
        explanation:
          "Rapid weight gain with bilateral edema and elevated BP suggests possible CHF fluid overload.",
        recommendedFollowUp:
          "Ensure physician notification is documented and reassess diuretic plan.",
      },
      {
        id: "conf_okay_vs_overload",
        category: "possible_contradiction",
        severity: "medium",
        phrasing: '"doing okay" vs. signs of fluid overload',
        transcriptEvidence:
          'He reports he\'s "doing okay" ... noted 1+ pitting edema bilaterally',
        explanation:
          "Patient's reassuring self-report conflicts with objective signs of decompensation.",
        recommendedFollowUp:
          "Reconcile subjective report with objective findings in the assessment.",
      },
    ],
  };
}

/**
 * SIDECAR STEP — Transcript confidence & uncertainty analysis.
 *
 * Runs after the main workflow. It supports clinician review and never changes
 * the documentation output.
 */
export async function analyzeTranscriptConfidence(
  input: { cleanedTranscript: string },
  ctx: StepContext,
): Promise<StepOutcome<TranscriptConfidenceAnalysis>> {
  return runLLMStep<TranscriptConfidenceAnalysis>({
    ctx,
    llm: () =>
      generateStructured({
        schema: TranscriptConfidenceAnalysisSchema,
        schemaName: "TranscriptConfidenceAnalysis",
        system: ANALYZE_TRANSCRIPT_CONFIDENCE_SYSTEM,
        user: buildAnalyzeTranscriptConfidenceUser(input.cleanedTranscript),
      }),
    mock: mockConfidenceAnalysis,
    describe: (analysis, mode) =>
      `Surfaced ${analysis.insights.length} transcript insight(s); overall confidence ${analysis.overallConfidence} (${mode}).`,
  });
}
