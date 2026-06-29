import {
  getActiveTraceId,
  startActiveObservation,
} from "@langfuse/tracing";
import { getObservabilityMode } from "./langfuse";
import { initObservability } from "./instrumentation";

/**
 * Tracing wrappers for the workflow.
 *
 * Both helpers are no-ops when observability is disabled, so the runner can call
 * them unconditionally. When enabled, they create a root trace and one child
 * span per step; LLM generations created by the Langfuse-wrapped OpenAI client
 * automatically nest under whichever step span is active.
 */

/** Minimal shape a step outcome must expose so the span can be annotated. */
interface TraceableOutcome {
  status: string;
  model: string | null;
  summary: string;
}

/**
 * Run the entire workflow inside a root trace and return the captured trace id
 * (undefined when observability is disabled).
 */
export async function withWorkflowTrace<T>(
  meta: { name: string; input?: unknown },
  fn: () => Promise<T>,
): Promise<{ result: T; traceId?: string }> {
  if (getObservabilityMode() === "disabled") {
    return { result: await fn(), traceId: undefined };
  }

  initObservability();

  let traceId: string | undefined;
  const result = await startActiveObservation(meta.name, async (span) => {
    traceId = getActiveTraceId();
    span.update({ input: meta.input });
    return fn();
  });

  return { result, traceId };
}

/**
 * Wrap a single workflow step in a child span that records name, status, model,
 * mode, an input summary, an output summary, latency, and any error message.
 * Returns the step's outcome unchanged.
 */
export async function traceStep<T extends TraceableOutcome>(
  meta: { name: string; mode: string; inputSummary?: string },
  fn: () => Promise<T>,
): Promise<T> {
  if (getObservabilityMode() === "disabled") {
    return fn();
  }

  return startActiveObservation(meta.name, async (span) => {
    const start = Date.now();
    try {
      const outcome = await fn();
      span.update({
        input: meta.inputSummary,
        output: outcome.summary,
        level: outcome.status === "failed" ? "WARNING" : "DEFAULT",
        statusMessage: outcome.status,
        metadata: {
          mode: meta.mode,
          status: outcome.status,
          model: outcome.model,
          latencyMs: Date.now() - start,
        },
      });
      return outcome;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      span.update({
        level: "ERROR",
        statusMessage: message,
        metadata: { mode: meta.mode, latencyMs: Date.now() - start },
      });
      throw err;
    }
  });
}
