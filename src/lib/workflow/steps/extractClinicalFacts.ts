import { generateStructured } from "../../llm/client";
import {
  EXTRACT_CLINICAL_FACTS_SYSTEM,
  buildExtractClinicalFactsUser,
} from "../../llm/prompts";
import { ClinicalFactsSchema, type ClinicalFacts } from "../../schemas/clinical";
import type { PatientContext } from "../../schemas/clinical";
import { runLLMStep, type StepContext, type StepOutcome } from "../stepTypes";

/** Deterministic mock aligned to the sample transcript. */
function mockClinicalFacts(): ClinicalFacts {
  return {
    visitType: "Routine skilled nursing follow-up",
    vitals: {
      bloodPressure: "148/92",
      heartRate: 88,
      respiratoryRate: 20,
      temperatureF: 98.4,
      oxygenSaturation: 94,
      weightLbs: 211,
      painScore: null,
    },
    diagnoses: [
      { description: "Congestive heart failure", icd10: "I50.9" },
      { description: "Type 2 diabetes mellitus", icd10: "E11.9" },
    ],
    medications: [
      {
        name: "Lisinopril",
        dosage: "10 mg",
        frequency: "Once daily",
        adherenceConfirmed: true,
      },
      {
        name: "Furosemide",
        dosage: "40 mg",
        frequency: "Once daily (AM)",
        adherenceConfirmed: false,
      },
      {
        name: "Metformin",
        dosage: "500 mg",
        frequency: "Twice daily with meals",
        adherenceConfirmed: true,
      },
    ],
    functionalStatus: [
      "Ambulates with front-wheeled walker",
      "Requires minimal assistance with bathing",
      "Dresses upper body independently; needs assistance with socks and shoes",
      "Prepares simple microwave meals independently",
      "Reports dyspnea on exertion walking bedroom to kitchen",
    ],
    interventions: [
      "Lower-extremity assessment: 1+ pitting edema bilaterally",
      "Educated patient and daughter on low-sodium diet and daily weight monitoring",
      "Instructed to report weight gain greater than 3 lbs in 24 hours",
      "Reinforced furosemide adherence",
    ],
    carePlan: [
      "Continue current plan of care",
      "Follow up in one week",
      "Notify physician of 4 lb weight gain and elevated blood pressure",
      "Recommend physical therapy evaluation for decreased endurance",
    ],
    riskFlags: [
      {
        category: "clinical",
        severity: "high",
        description:
          "Possible fluid overload: 4 lb weight gain, bilateral pitting edema, elevated BP.",
      },
      {
        category: "medication",
        severity: "medium",
        description: "Furosemide adherence unconfirmed in a CHF patient.",
      },
      {
        category: "functional",
        severity: "medium",
        description: "Decreased endurance with dyspnea on minimal exertion.",
      },
    ],
  };
}

/** STEP 2 — Extract structured clinical facts (OpenAI structured output). */
export async function extractClinicalFacts(
  input: { cleanedTranscript: string; patientContext: PatientContext },
  ctx: StepContext,
): Promise<StepOutcome<ClinicalFacts>> {
  return runLLMStep<ClinicalFacts>({
    ctx,
    llm: () =>
      generateStructured({
        schema: ClinicalFactsSchema,
        schemaName: "ClinicalFacts",
        system: EXTRACT_CLINICAL_FACTS_SYSTEM,
        user: buildExtractClinicalFactsUser(
          input.patientContext,
          input.cleanedTranscript,
        ),
      }),
    mock: mockClinicalFacts,
    describe: (facts, mode) =>
      `Extracted ${facts.diagnoses.length} diagnoses, ${facts.medications.length} medications, ${facts.riskFlags.length} risk flags (${mode}).`,
  });
}
