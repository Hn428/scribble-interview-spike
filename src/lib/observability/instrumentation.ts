import { NodeSDK } from "@opentelemetry/sdk-node";
import { LangfuseSpanProcessor } from "@langfuse/otel";

/**
 * Server-only OpenTelemetry initialization for Langfuse.
 *
 * `initObservability()` is idempotent and safe to call from any server-side
 * entry point. It is a no-op when:
 *   - running in a browser context (guarded), or
 *   - Langfuse env vars are absent.
 *
 * Initialization never throws — if setup fails, the app continues with
 * observability disabled rather than crashing the workflow.
 *
 * NOTE: this is intentionally NOT the Next.js root `instrumentation.ts` hook.
 * We initialize lazily and explicitly so the workflow controls when the tracer
 * provider is set up, and so the build never depends on the experimental hook.
 */

let processor: LangfuseSpanProcessor | null = null;
let started = false;

function langfuseConfigPresent(): boolean {
  return Boolean(
    process.env.LANGFUSE_PUBLIC_KEY && process.env.LANGFUSE_SECRET_KEY,
  );
}

export function initObservability(): void {
  if (started) return;
  started = true;

  if (typeof window !== "undefined") return;
  if (!langfuseConfigPresent()) return;

  try {
    processor = new LangfuseSpanProcessor({
      publicKey: process.env.LANGFUSE_PUBLIC_KEY,
      secretKey: process.env.LANGFUSE_SECRET_KEY,
      baseUrl: process.env.LANGFUSE_BASE_URL || "https://us.cloud.langfuse.com",
    });
    const sdk = new NodeSDK({ spanProcessors: [processor] });
    sdk.start();
  } catch (err) {
    processor = null;
    console.warn(
      "[observability] Langfuse init failed; continuing without tracing:",
      err instanceof Error ? err.message : err,
    );
  }
}

/** The active Langfuse span processor, or null when observability is disabled. */
export function getSpanProcessor(): LangfuseSpanProcessor | null {
  return processor;
}
