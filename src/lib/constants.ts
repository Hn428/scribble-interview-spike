/**
 * Healthcare safety disclaimer shown in the UI and embedded in every API
 * response. This text is intentionally blunt: the output is a draft produced
 * from synthetic data and must never drive real care without clinician review.
 */
export const SAFETY_DISCLAIMER =
  "SYNTHETIC DATA ONLY — DRAFT, NOT FOR CLINICAL USE. This output is AI-generated and may be incomplete or incorrect. A licensed clinician must review and verify all content before any EHR submission, care planning, billing, or patient-care decision.";

/** Default OpenAI model when OPENAI_MODEL is not set. */
export const DEFAULT_OPENAI_MODEL = "gpt-4.1-mini";
