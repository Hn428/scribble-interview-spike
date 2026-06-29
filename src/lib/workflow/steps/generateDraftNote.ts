import { generateStructured } from "../../llm/client";
import {
  GENERATE_DRAFT_NOTE_SYSTEM,
  buildGenerateDraftNoteUser,
} from "../../llm/prompts";
import type { ClinicalFacts, PatientContext } from "../../schemas/clinical";
import { DraftVisitNoteSchema, type DraftVisitNote } from "../../schemas/review";
import { runLLMStep, type StepContext, type StepOutcome } from "../stepTypes";

/** Deterministic mock SOAP note built from the clinical facts. */
function mockDraftNote(facts: ClinicalFacts): DraftVisitNote {
  const v = facts.vitals;
  return {
    format: "SOAP",
    subjective:
      'Patient reports feeling "okay" but endorses dyspnea on exertion when walking from the bedroom to the kitchen. Daughter present and engaged during the visit.',
    objective: `Vitals: BP ${v.bloodPressure ?? "—"}, HR ${v.heartRate ?? "—"}, RR ${v.respiratoryRate ?? "—"}, Temp ${v.temperatureF ?? "—"}°F, SpO2 ${v.oxygenSaturation ?? "—"}% on room air, weight ${v.weightLbs ?? "—"} lbs (up ~4 lbs from prior visit). 1+ pitting edema bilaterally in lower extremities. Ambulates with front-wheeled walker.`,
    assessment:
      "CHF with signs of mild fluid overload (weight gain, bilateral edema, elevated BP). Type 2 diabetes stable. Decreased endurance limiting mobility. Furosemide adherence uncertain.",
    plan: "Notify physician of weight gain and elevated BP. Reinforce low-sodium diet and daily weight monitoring; report >3 lb gain in 24h. Recommend PT evaluation for endurance. Continue current medications; confirm furosemide adherence at next visit. Follow up in one week.",
  };
}

/** STEP 5 — Generate a draft SOAP visit note (structured output). */
export async function generateDraftNote(
  input: { clinicalFacts: ClinicalFacts; patientContext: PatientContext },
  ctx: StepContext,
): Promise<StepOutcome<DraftVisitNote>> {
  return runLLMStep<DraftVisitNote>({
    ctx,
    llm: () =>
      generateStructured({
        schema: DraftVisitNoteSchema,
        schemaName: "DraftVisitNote",
        system: GENERATE_DRAFT_NOTE_SYSTEM,
        user: buildGenerateDraftNoteUser(
          input.patientContext,
          input.clinicalFacts,
        ),
      }),
    mock: () => mockDraftNote(input.clinicalFacts),
    describe: (_note, mode) => `Generated SOAP draft note (${mode}).`,
  });
}
