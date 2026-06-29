import type { WorkflowMode, WorkflowStepStatus } from "../schemas/workflow";

/** Shared context handed to every workflow step. */
export interface StepContext {
  mode: WorkflowMode;
  model: string;
}

/** What a step returns to the runner (the runner adds timing + identity). */
export interface StepOutcome<T> {
  value: T;
  summary: string;
  /** Model used, or null for deterministic / mocked work. */
  model: string | null;
  status: WorkflowStepStatus;
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/**
 * Run an LLM-backed step with a safe deterministic fallback.
 *
 * - In `mock` mode it returns the mock value directly.
 * - In `openai` mode it runs the LLM call; on any failure it falls back to the
 *   mock value, marks the step `failed`, and records a clear error summary so
 *   the pipeline can continue and the demo never crashes.
 */
export async function runLLMStep<T>(opts: {
  ctx: StepContext;
  llm: () => Promise<T>;
  mock: () => T;
  describe: (value: T, mode: WorkflowMode) => string;
}): Promise<StepOutcome<T>> {
  if (opts.ctx.mode === "mock") {
    const value = opts.mock();
    return {
      value,
      summary: opts.describe(value, "mock"),
      model: null,
      status: "completed",
    };
  }

  try {
    const value = await opts.llm();
    return {
      value,
      summary: opts.describe(value, "openai"),
      model: opts.ctx.model,
      status: "completed",
    };
  } catch (err) {
    const value = opts.mock();
    return {
      value,
      summary: `OpenAI call failed (${errorMessage(err)}); used deterministic mock fallback.`,
      model: opts.ctx.model,
      status: "failed",
    };
  }
}
