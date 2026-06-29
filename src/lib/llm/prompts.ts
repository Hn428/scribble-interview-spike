import type { ClinicalFacts, PatientContext } from "../schemas/clinical";
import type { OasisStyleFieldMapping } from "../schemas/oasis";
import type { DraftVisitNote, MissingInfoWarning } from "../schemas/review";

/**
 * Prompts for each LLM-backed workflow step. Kept here (separate from the step
 * logic) so they are easy to review and iterate on. Each system prompt holds
 * the model to grounded, conservative behavior appropriate for clinical drafts.
 */

const SAFETY_PREAMBLE =
  "You are an assistant that drafts home health documentation from a visit transcript. " +
  "Only use information present in the provided transcript and patient context. " +
  "Never invent vitals, medications, diagnoses, or findings. " +
  "When information is absent, leave the corresponding field null or empty rather than guessing. " +
  "All output is a draft for licensed-clinician review.";

export const EXTRACT_CLINICAL_FACTS_SYSTEM =
  `${SAFETY_PREAMBLE} Extract structured clinical facts from the transcript. ` +
  "Populate vitals only when explicitly stated. Map diagnoses to ICD-10 codes only when confident, otherwise null. " +
  "Set medication adherenceConfirmed to true only when the transcript clearly confirms the patient took it. " +
  "Add riskFlags for clinically significant concerns (e.g. fluid overload, fall risk, medication non-adherence).";

export function buildExtractClinicalFactsUser(
  patientContext: PatientContext,
  cleanedTranscript: string,
): string {
  return [
    "PATIENT CONTEXT:",
    JSON.stringify(patientContext, null, 2),
    "",
    "VISIT TRANSCRIPT:",
    cleanedTranscript,
  ].join("\n");
}

export const MAP_OASIS_SYSTEM =
  `${SAFETY_PREAMBLE} Map the clinical facts to OASIS-style assessment items ` +
  "(e.g. M1830 Bathing, M1850 Transferring, M1860 Ambulation, M1400 Dyspnea). " +
  "For each item provide the most defensible value, a confidence level, and a short rationale grounded in the facts. " +
  "If the facts do not support a value, set value to null with low confidence. Return 5–8 relevant items.";

export function buildMapOasisUser(clinicalFacts: ClinicalFacts): string {
  return ["CLINICAL FACTS:", JSON.stringify(clinicalFacts, null, 2)].join("\n");
}

export const DETECT_MISSING_INFO_SYSTEM =
  `${SAFETY_PREAMBLE} Identify documentation gaps and risks that a clinician must resolve ` +
  "before sign-off: required-but-missing elements (e.g. pain assessment, homebound status), " +
  "unconfirmed medication adherence, and incomplete OASIS items. " +
  "Rank each by severity and give a concrete suggested action.";

export function buildDetectMissingInfoUser(
  clinicalFacts: ClinicalFacts,
  oasisMappings: OasisStyleFieldMapping[],
): string {
  return [
    "CLINICAL FACTS:",
    JSON.stringify(clinicalFacts, null, 2),
    "",
    "OASIS MAPPINGS:",
    JSON.stringify(oasisMappings, null, 2),
  ].join("\n");
}

export const GENERATE_DRAFT_NOTE_SYSTEM =
  `${SAFETY_PREAMBLE} Write a concise draft visit note in SOAP format ` +
  "(Subjective, Objective, Assessment, Plan) using only the provided facts. " +
  "Keep each section tight and clinically appropriate. Do not add a separate disclaimer; the application adds one.";

export function buildGenerateDraftNoteUser(
  patientContext: PatientContext,
  clinicalFacts: ClinicalFacts,
): string {
  return [
    "PATIENT CONTEXT:",
    JSON.stringify(patientContext, null, 2),
    "",
    "CLINICAL FACTS:",
    JSON.stringify(clinicalFacts, null, 2),
  ].join("\n");
}

export const ANALYZE_TRANSCRIPT_CONFIDENCE_SYSTEM =
  `${SAFETY_PREAMBLE} This is a SIDECAR analysis that supports clinician review — it must not override the documentation. ` +
  "Read the transcript and surface short, specific phrases worth a clinician's attention, each classified as one of: " +
  "strong_confirmation (clearly stated facts, e.g. 'using the walker', 'no falls'), " +
  "uncertainty (hedged language, e.g. 'I think', 'maybe', 'sometimes', 'better than last week', 'by evening'), " +
  "needs_clinician_confirmation (incomplete clinical detail, e.g. medication changed without a dose, ADL limitation without a level of assistance), " +
  "possible_contradiction (statements that conflict, e.g. denies falls then mentions slipping), " +
  "missing_context (a finding without supporting data, e.g. shortness of breath without an oxygen-saturation measurement), and " +
  "safety_relevant (e.g. worsening dyspnea, new medication change, fall risk, edema, dizziness). " +
  "Quote the supporting transcript text in transcriptEvidence, explain why it matters, and add a recommendedFollowUp when useful (else null). " +
  "Provide an overall confidence of low/medium/high and a brief summary.";

export function buildAnalyzeTranscriptConfidenceUser(
  cleanedTranscript: string,
): string {
  return ["VISIT TRANSCRIPT:", cleanedTranscript].join("\n");
}

export const PACKAGE_FOR_REVIEW_SYSTEM =
  `${SAFETY_PREAMBLE} Assemble a human-review package. Provide an overall recommendation ` +
  "(approve / approve_with_edits / needs_review), an overall confidence between 0 and 1, a brief summary, " +
  "a reviewer checklist of items to confirm before sign-off, and source evidence quoting the transcript " +
  "to support key claims. Recommend needs_review when any high-severity gap exists.";

export function buildPackageForReviewUser(input: {
  cleanedTranscript: string;
  clinicalFacts: ClinicalFacts;
  oasisMappings: OasisStyleFieldMapping[];
  missingInfoWarnings: MissingInfoWarning[];
  draftNote: DraftVisitNote;
}): string {
  return [
    "VISIT TRANSCRIPT:",
    input.cleanedTranscript,
    "",
    "CLINICAL FACTS:",
    JSON.stringify(input.clinicalFacts, null, 2),
    "",
    "OASIS MAPPINGS:",
    JSON.stringify(input.oasisMappings, null, 2),
    "",
    "MISSING INFO WARNINGS:",
    JSON.stringify(input.missingInfoWarnings, null, 2),
    "",
    "DRAFT NOTE:",
    JSON.stringify(input.draftNote, null, 2),
  ].join("\n");
}
