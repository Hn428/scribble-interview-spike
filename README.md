# scribble-interview-spike

An interview-ready **AI workflow spike** for a home health documentation
platform. It takes a synthetic home health visit transcript and runs it through
a typed, multi-step documentation workflow backed by the **OpenAI Node SDK**
(with a deterministic mock fallback), rendering each stage of the output.

> ⚠️ **SYNTHETIC DATA ONLY — DRAFT, NOT FOR CLINICAL USE.** No real patient
> data, no database, no auth. All output is AI-generated and must be reviewed by
> a licensed clinician before any EHR submission, care planning, billing, or
> patient-care decision.

## What it does

Given a visit transcript, the workflow produces:

1. **Workflow timeline** — each step, its status, duration, model, and summary.
2. **Structured clinical extraction** — typed vitals, meds, diagnoses, ADLs, and
   risk flags (rendered as readable sections _and_ raw JSON).
3. **OASIS-style field mapping** — extracted findings mapped to OASIS items with
   confidence and rationale.
4. **Missing documentation warnings** — compliance / billing / quality gaps with
   suggested remediation.
5. **Draft visit note** — a SOAP-format draft for clinician review.
6. **Human review package** — recommendation, confidence, reviewer checklist,
   and transcript source evidence (the human-in-the-loop checkpoint).
7. **Transcript Confidence & Uncertainty (sidecar)** — an extra review layer
   flagging phrases that support, weaken, or need confirmation (see Phase 3).
8. **Trace panel** — observability mode, trace id/URL, model, duration, and
   step health (Langfuse-backed; see Phase 3).

## Getting started

```bash
npm install
cp .env.example .env.local   # optional — add your OpenAI key to enable OpenAI mode
npm run dev
# open http://localhost:3000
```

Other scripts:

```bash
npm run build      # production build
npm run typecheck  # tsc --noEmit
```

## Configuration

Set these in `.env.local` (never commit real keys):

```bash
OPENAI_API_KEY=sk-...        # enables OpenAI mode; omit to run in mock mode
OPENAI_MODEL=gpt-4.1-mini    # optional; defaults to gpt-4.1-mini (cost-effective)

# Set BOTH to enable Langfuse tracing; omit either for observabilityMode: "disabled"
LANGFUSE_SECRET_KEY=
LANGFUSE_PUBLIC_KEY=
LANGFUSE_BASE_URL=https://us.cloud.langfuse.com
```

### OpenAI mode vs. mock mode

- **OpenAI mode** — active when `OPENAI_API_KEY` is set. The workflow uses
  OpenAI **structured outputs** (Zod-validated) for extraction, OASIS mapping,
  gap detection, the draft note, and the review package.
- **Mock mode** — active when `OPENAI_API_KEY` is absent. The workflow returns
  deterministic, fully-typed mock outputs so the app runs with zero setup.

The active mode is reported on every API response as `result.mode`
(`"openai"` | `"mock"`) and shown in the UI. If an individual OpenAI call fails
(bad key, rate limit, transport error), that step **falls back to mock output**,
is marked `failed` in the timeline with a clear message, and the workflow still
completes — the demo never crashes.

### Server-only OpenAI

**OpenAI is called only on the server**, inside the API route
(`app/api/run-visit-workflow/route.ts`) and the workflow layer under
`src/lib/`. The browser never imports the OpenAI SDK or sees the API key — UI
components import only **types** from the schema files. `src/lib/llm/client.ts`
additionally throws if it is ever imported in a browser context.

## Architecture

```
app/
  page.tsx                          # client UI: transcript input + Run Workflow + results
  layout.tsx · globals.css          # root layout + plain CSS (no framework)
  api/run-visit-workflow/route.ts   # POST { transcript, patientId? } -> VisitWorkflowResult
components/                         # one presentational component per output section
src/lib/
  constants.ts                      # safety disclaimer + default model
  llm/
    client.ts                       # server-only OpenAI client (+ Langfuse wrap) + helper
    prompts.ts                      # system prompts + user-message builders per step
  observability/                    # server-only Langfuse / OpenTelemetry layer
    instrumentation.ts              # lazy, idempotent OTEL + LangfuseSpanProcessor init
    langfuse.ts                     # config helpers, mode, safe flush, trace URL
    traceWorkflow.ts                # withWorkflowTrace + traceStep wrappers
  schemas/                          # Zod schemas (single source of truth for types)
    clinical.ts · oasis.ts · review.ts · insights.ts · workflow.ts
  fixtures/
    sampleTranscript.ts · samplePatientContext.ts
  workflow/
    runVisitWorkflow.ts             # orchestrator: traces, times + records each step
    stepTypes.ts                    # StepContext / StepOutcome + LLM-with-fallback helper
    steps/
      cleanTranscript.ts            # deterministic
      extractClinicalFacts.ts       # OpenAI structured output
      mapOasisFields.ts             # OpenAI structured output
      detectMissingInfo.ts          # OpenAI structured output
      generateDraftNote.ts          # OpenAI structured output
      packageForReview.ts           # OpenAI structured output
      analyzeTranscriptConfidence.ts# sidecar — OpenAI structured output
```

### Workflow design

`runVisitWorkflow` runs the steps in sequence, timing each one and recording a
`VisitWorkflowStep` (status, start/end, duration, summary, model). Each LLM step
is a thin wrapper over `generateStructured(...)` with a matching Zod schema and a
deterministic mock for the fallback path, so swapping prompts/models or adding a
tracer is a localized change. The typed contract lives entirely in
`src/lib/schemas/` — the API and UI both consume those inferred types.

## Phase 3: Observability + Transcript Confidence

This demo now includes **Langfuse tracing** for workflow observability and a
sidecar **Transcript Confidence & Uncertainty** panel.

### Langfuse observability

When `LANGFUSE_PUBLIC_KEY` and `LANGFUSE_SECRET_KEY` are set, the run is wrapped
in a root trace with one child span per step, and the OpenAI client is wrapped
with `observeOpenAI` so model calls are captured automatically. Each response
reports `observabilityMode` (`"langfuse"` | `"disabled"`) and, when available, a
`traceId` and best-effort `traceUrl`.

Langfuse tracks:

- model calls (latency, tokens/cost when available)
- per-step latency and status
- errors and failure analysis
- trace IDs for debugging

If the Langfuse env vars are missing, the workflow still runs, nothing crashes,
and the response shows `observabilityMode: "disabled"`. Tracing is **server-only**
— OpenTelemetry and the Langfuse SDK never reach the browser bundle. Setup is in
`src/lib/observability/` (`instrumentation.ts`, `langfuse.ts`, `traceWorkflow.ts`).

### Transcript Confidence & Uncertainty (sidecar)

A sidecar step (`analyzeTranscriptConfidence`) runs after the main workflow and
produces an **extra review layer** that never overrides the documentation. The
confidence panel highlights:

- strong confirmation phrases
- uncertain / hedged phrases
- needs-clinician-confirmation items
- possible contradictions
- missing context
- safety-relevant transcript evidence

Like every other LLM step, it uses OpenAI structured output when a key is
present and a deterministic mock fallback otherwise. In the timeline it appears
as **"Sidecar: Transcript Confidence Analysis"**.

## Not included yet

MCP is intentionally out of scope for this phase.
