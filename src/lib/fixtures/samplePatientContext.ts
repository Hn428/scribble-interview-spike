import type { PatientContext } from "../schemas/clinical";

/**
 * Synthetic patient context used when the API request does not supply a
 * patientId. In a real system this would be a lookup against the EHR / patient
 * service. Entirely fabricated — no real patient information.
 */
export const SAMPLE_PATIENT_CONTEXT: PatientContext = {
  patientId: "HH-558210",
  name: "Harold Jenkins",
  dateOfBirth: "1949-03-03",
  age: 77,
  sex: "male",
  primaryDiagnoses: [
    "Congestive heart failure (I50.9)",
    "Type 2 diabetes mellitus (E11.9)",
  ],
  allergies: ["No known drug allergies"],
  careSetting: "Home health — skilled nursing",
  episodeSummary:
    "Third skilled nursing visit of the current 60-day episode. CHF and T2DM management with home monitoring.",
};

/**
 * Look up patient context by id. Demo-only: returns the single sample patient
 * regardless of id, but keeps the async/lookup shape a real implementation
 * would use.
 */
export function getPatientContext(patientId?: string): PatientContext {
  if (!patientId) {
    return SAMPLE_PATIENT_CONTEXT;
  }
  return { ...SAMPLE_PATIENT_CONTEXT, patientId };
}
