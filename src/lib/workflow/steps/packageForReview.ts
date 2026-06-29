import { generateStructured } from "../../llm/client";
import {
  PACKAGE_FOR_REVIEW_SYSTEM,
  buildPackageForReviewUser,
} from "../../llm/prompts";
import type { ClinicalFacts } from "../../schemas/clinical";
import type { OasisStyleFieldMapping } from "../../schemas/oasis";
import {
  HumanReviewPackageSchema,
  type DraftVisitNote,
  type HumanReviewPackage,
  type MissingInfoWarning,
} from "../../schemas/review";
import { runLLMStep, type StepContext, type StepOutcome } from "../stepTypes";

interface PackageInput {
  cleanedTranscript: string;
  clinicalFacts: ClinicalFacts;
  oasisMappings: OasisStyleFieldMapping[];
  missingInfoWarnings: MissingInfoWarning[];
  draftNote: DraftVisitNote;
}

/** Deterministic mock review package derived from the workflow outputs. */
function mockReviewPackage(input: PackageInput): HumanReviewPackage {
  const hasHigh = input.missingInfoWarnings.some((w) => w.severity === "high");
  return {
    recommendation: hasHigh ? "needs_review" : "approve_with_edits",
    overallConfidence: hasHigh ? 0.74 : 0.86,
    summary: `Draft documentation generated for ${input.clinicalFacts.visitType}. ${input.missingInfoWarnings.length} documentation gap(s) flagged for clinician attention before sign-off.`,
    reviewerChecklist: [
      "Confirm furosemide adherence and document patient response",
      "Add or confirm pain assessment",
      "Complete flagged OASIS items (toileting, skin integrity)",
      "Verify homebound status statement",
      "Confirm physician notification of weight gain",
    ],
    sourceEvidence: [
      {
        claim: "Weight increased ~4 lbs since last visit",
        transcriptQuote:
          "weight 211 pounds — that's up about 4 pounds from last week",
      },
      {
        claim: "Furosemide adherence uncertain",
        transcriptQuote:
          "He wasn't sure whether he took his furosemide this morning",
      },
      {
        claim: "Bilateral lower-extremity edema",
        transcriptQuote: "noted 1+ pitting edema bilaterally",
      },
    ],
  };
}

/** STEP 6 — Assemble the human review package (structured output). */
export async function packageForReview(
  input: PackageInput,
  ctx: StepContext,
): Promise<StepOutcome<HumanReviewPackage>> {
  return runLLMStep<HumanReviewPackage>({
    ctx,
    llm: () =>
      generateStructured({
        schema: HumanReviewPackageSchema,
        schemaName: "HumanReviewPackage",
        system: PACKAGE_FOR_REVIEW_SYSTEM,
        user: buildPackageForReviewUser(input),
      }),
    mock: () => mockReviewPackage(input),
    describe: (pkg, mode) =>
      `Review package ready — recommendation: ${pkg.recommendation}, confidence ${Math.round(
        pkg.overallConfidence * 100,
      )}% (${mode}).`,
  });
}
