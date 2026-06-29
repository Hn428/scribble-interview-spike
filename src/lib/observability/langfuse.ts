import { getSpanProcessor } from "./instrumentation";

/**
 * Server-only Langfuse configuration helpers.
 *
 * These functions only read env vars and the (already-initialized) span
 * processor — they never construct OpenTelemetry objects themselves, so they
 * are cheap and safe to call anywhere on the server.
 */
if (typeof window !== "undefined") {
  throw new Error(
    "src/lib/observability/langfuse.ts is server-only and must not be imported in the browser.",
  );
}

export type ObservabilityMode = "disabled" | "langfuse";

/** True when both Langfuse keys are configured. */
export function hasLangfuseConfig(): boolean {
  return Boolean(
    process.env.LANGFUSE_PUBLIC_KEY && process.env.LANGFUSE_SECRET_KEY,
  );
}

/** The observability mode reported in API responses. */
export function getObservabilityMode(): ObservabilityMode {
  return hasLangfuseConfig() ? "langfuse" : "disabled";
}

/** Configured Langfuse base URL (defaults to US cloud). */
export function getLangfuseBaseUrl(): string {
  return process.env.LANGFUSE_BASE_URL || "https://us.cloud.langfuse.com";
}

/**
 * Best-effort trace deep link.
 *
 * Langfuse's canonical trace URL is project-scoped
 * (`/project/<id>/traces/<traceId>`), and we don't know the project id from the
 * keys alone. We return a best-effort host-level link; the UI also shows the
 * raw trace id as copy text so it can be pasted into the Langfuse UI search.
 */
export function buildTraceUrl(traceId?: string): string | undefined {
  if (!traceId) return undefined;
  const base = getLangfuseBaseUrl().replace(/\/+$/, "");
  return `${base}/trace/${traceId}`;
}

/**
 * Flush pending spans without ever throwing. Important on serverless/edge-like
 * request lifecycles where the process may freeze between requests.
 */
export async function flushLangfuseSafely(): Promise<void> {
  const processor = getSpanProcessor();
  if (!processor) return;
  try {
    await processor.forceFlush();
  } catch (err) {
    console.warn(
      "[observability] Langfuse flush failed:",
      err instanceof Error ? err.message : err,
    );
  }
}
