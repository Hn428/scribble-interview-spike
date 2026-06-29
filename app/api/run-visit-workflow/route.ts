import { NextResponse } from "next/server";
import { runVisitWorkflow } from "@/src/lib/workflow/runVisitWorkflow";
import type { VisitWorkflowResult } from "@/src/lib/schemas/workflow";

/** Ensure this route runs on the Node.js runtime (OpenAI SDK is server-side). */
export const runtime = "nodejs";

interface ApiError {
  error: string;
}

interface RunVisitWorkflowBody {
  transcript?: unknown;
  patientId?: unknown;
}

/**
 * POST /api/run-visit-workflow
 *
 * Accepts `{ transcript: string; patientId?: string }` and returns a typed
 * `VisitWorkflowResult`. OpenAI calls (when enabled) happen only here on the
 * server — never in the browser. Without OPENAI_API_KEY the workflow runs in
 * deterministic mock mode (see `result.mode`).
 */
export async function POST(
  request: Request,
): Promise<NextResponse<VisitWorkflowResult | ApiError>> {
  let body: RunVisitWorkflowBody;
  try {
    body = (await request.json()) as RunVisitWorkflowBody;
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const { transcript, patientId } = body;
  if (typeof transcript !== "string" || transcript.trim().length === 0) {
    return NextResponse.json(
      { error: "A non-empty 'transcript' string is required." },
      { status: 400 },
    );
  }
  if (patientId !== undefined && typeof patientId !== "string") {
    return NextResponse.json(
      { error: "'patientId' must be a string when provided." },
      { status: 400 },
    );
  }

  try {
    const result = await runVisitWorkflow({ transcript, patientId });
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error.";
    return NextResponse.json(
      { error: `Workflow failed: ${message}` },
      { status: 500 },
    );
  }
}
