import { generateStructured } from "../../llm/client";
import {
  DETECT_MISSING_INFO_SYSTEM,
  buildDetectMissingInfoUser,
} from "../../llm/prompts";
import type { ClinicalFacts } from "../../schemas/clinical";
import type { OasisStyleFieldMapping } from "../../schemas/oasis";
import {
  MissingInfoResultSchema,
  type MissingInfoWarning,
} from "../../schemas/review";
import { runLLMStep, type StepContext, type StepOutcome } from "../stepTypes";

/** Deterministic mock gap detection derived from facts + OASIS mappings. */
function mockMissingInfo(
  facts: ClinicalFacts,
  oasisMappings: OasisStyleFieldMapping[],
): MissingInfoWarning[] {
  const warnings: MissingInfoWarning[] = [];

  if (facts.vitals.painScore === null) {
    warnings.push({
      id: "pain_not_documented",
      severity: "high",
      title: "Pain assessment not documented",
      detail:
        "No pain score was captured. Pain assessment is a required element for skilled nursing visit documentation.",
      suggestedAction:
        "Add a pain score (0–10) or document that the patient denied pain.",
    });
  }

  const unconfirmed = facts.medications.filter((m) => !m.adherenceConfirmed);
  if (unconfirmed.length > 0) {
    warnings.push({
      id: "med_adherence_unconfirmed",
      severity: "medium",
      title: "Medication adherence not confirmed",
      detail: `Adherence is unconfirmed for: ${unconfirmed
        .map((m) => m.name)
        .join(", ")}. Clinically significant for a CHF diuretic.`,
      suggestedAction:
        "Follow up on furosemide adherence and document the teaching response.",
    });
  }

  const incomplete = oasisMappings.filter(
    (m) => m.value === null || m.confidence === "low",
  );
  if (incomplete.length > 0) {
    warnings.push({
      id: "oasis_incomplete",
      severity: "medium",
      title: "Incomplete OASIS items",
      detail: `${incomplete.length} OASIS item(s) could not be confidently completed: ${incomplete
        .map((m) => m.itemId)
        .join(", ")}.`,
      suggestedAction: "Complete the flagged OASIS items in the assessment.",
    });
  }

  warnings.push({
    id: "homebound_status",
    severity: "low",
    title: "Homebound status not explicitly stated",
    detail:
      "Medicare requires documentation supporting homebound status for each episode.",
    suggestedAction:
      "Add an explicit homebound-status statement and the taxing effort to leave home.",
  });

  return warnings;
}

/** STEP 4 — Detect missing / risky documentation (structured output). */
export async function detectMissingInfo(
  input: {
    clinicalFacts: ClinicalFacts;
    oasisMappings: OasisStyleFieldMapping[];
  },
  ctx: StepContext,
): Promise<StepOutcome<MissingInfoWarning[]>> {
  return runLLMStep<MissingInfoWarning[]>({
    ctx,
    llm: async () => {
      const result = await generateStructured({
        schema: MissingInfoResultSchema,
        schemaName: "MissingInfoResult",
        system: DETECT_MISSING_INFO_SYSTEM,
        user: buildDetectMissingInfoUser(
          input.clinicalFacts,
          input.oasisMappings,
        ),
      });
      return result.warnings;
    },
    mock: () => mockMissingInfo(input.clinicalFacts, input.oasisMappings),
    describe: (warnings, mode) => {
      const high = warnings.filter((w) => w.severity === "high").length;
      return `Flagged ${warnings.length} documentation gap(s), ${high} high-severity (${mode}).`;
    },
  });
}
