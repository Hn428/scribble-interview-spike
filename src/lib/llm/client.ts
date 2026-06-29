import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { observeOpenAI } from "@langfuse/openai";
import type { z } from "zod";
import { DEFAULT_OPENAI_MODEL } from "../constants";
import { hasLangfuseConfig } from "../observability/langfuse";
import { initObservability } from "../observability/instrumentation";

/**
 * Server-only OpenAI integration.
 *
 * This module must never be imported by client components — doing so would
 * leak the SDK (and intent to use a secret key) into the browser bundle. The
 * guard below makes that mistake fail loudly during development.
 */
if (typeof window !== "undefined") {
  throw new Error(
    "src/lib/llm/client.ts is server-only and must not be imported in the browser.",
  );
}

let cachedClient: OpenAI | null = null;

/** True when an API key is configured. Used to choose openai vs mock mode. */
export function hasOpenAIKey(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

/** The model to use, configurable via OPENAI_MODEL. */
export function getModel(): string {
  return process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL;
}

/**
 * Lazily construct the OpenAI client. The missing-key error is only thrown when
 * a call is actually attempted, so the app can boot and run in mock mode.
 *
 * When Langfuse is configured, the client is wrapped with `observeOpenAI` so
 * every call is automatically traced (latency, tokens, cost) and nested under
 * the active workflow-step span. The wrapper preserves the OpenAI API surface,
 * so the mock-fallback behavior in the steps is unaffected.
 */
export function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not set. Set it to enable OpenAI mode, or omit it to run in mock mode.",
    );
  }
  if (!cachedClient) {
    const base = new OpenAI({ apiKey });
    if (hasLangfuseConfig()) {
      initObservability();
      cachedClient = observeOpenAI(base);
    } else {
      cachedClient = base;
    }
  }
  return cachedClient;
}

/**
 * Run a single structured-output completion and return a schema-validated
 * object. Throws on transport errors or refusals; callers decide whether to
 * fall back to mock output.
 */
export async function generateStructured<T>(opts: {
  schema: z.ZodType<T>;
  schemaName: string;
  system: string;
  user: string;
}): Promise<T> {
  const client = getOpenAIClient();
  const completion = await client.chat.completions.parse({
    model: getModel(),
    messages: [
      { role: "system", content: opts.system },
      { role: "user", content: opts.user },
    ],
    response_format: zodResponseFormat(opts.schema, opts.schemaName),
  });

  const message = completion.choices[0]?.message;
  if (message?.refusal) {
    throw new Error(`OpenAI refused the request: ${message.refusal}`);
  }
  if (!message?.parsed) {
    throw new Error("OpenAI returned no parsed structured output.");
  }
  return message.parsed;
}
