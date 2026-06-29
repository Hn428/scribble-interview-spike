import type { StepContext, StepOutcome } from "../stepTypes";

/**
 * STEP 1 — Clean / normalize the raw transcript.
 *
 * Deterministic and dependency-free (no LLM): it trims, collapses runs of
 * blank lines and spaces, and normalizes line endings. This gives every
 * downstream step a stable, tidy input.
 */
export async function cleanTranscript(
  input: { transcript: string },
  _ctx: StepContext,
): Promise<StepOutcome<string>> {
  const cleaned = input.transcript
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return {
    value: cleaned,
    summary: `Normalized transcript to ${cleaned.length} characters.`,
    model: null,
    status: "completed",
  };
}
