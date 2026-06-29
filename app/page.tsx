"use client";

import { useState } from "react";
import { SAMPLE_TRANSCRIPT } from "@/src/lib/fixtures/sampleTranscript";
import { SAFETY_DISCLAIMER } from "@/src/lib/constants";
import type { VisitWorkflowResult } from "@/src/lib/schemas/workflow";
import { WorkflowTimeline } from "@/components/WorkflowTimeline";
import { ClinicalExtractionView } from "@/components/ClinicalExtractionView";
import { OasisMappingView } from "@/components/OasisMappingView";
import { MissingDocWarningsView } from "@/components/MissingDocWarningsView";
import { DraftNoteView } from "@/components/DraftNoteView";
import { ReviewPackageView } from "@/components/ReviewPackageView";
import { TranscriptConfidencePanel } from "@/components/TranscriptConfidencePanel";
import { TracePanel } from "@/components/TracePanel";

interface ApiError {
  error: string;
}

export default function Home() {
  const [transcript, setTranscript] = useState(SAMPLE_TRANSCRIPT);
  const [result, setResult] = useState<VisitWorkflowResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runWorkflow() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/run-visit-workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript }),
      });
      if (!res.ok) {
        const body = (await res.json()) as ApiError;
        throw new Error(body.error ?? `Request failed (${res.status})`);
      }
      const data = (await res.json()) as VisitWorkflowResult;
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  function resetTranscript() {
    setTranscript(SAMPLE_TRANSCRIPT);
  }

  return (
    <main className="page">
      <span className="synthetic-badge">SYNTHETIC DATA · DEMO ONLY</span>
      <header className="app-header">
        <h1>Home Health Documentation Workflow</h1>
        <p>
          Paste a visit transcript and run the AI workflow to produce structured
          clinical data, OASIS mappings, documentation warnings, a draft note,
          and a human-review package.
        </p>
      </header>

      <div className="disclaimer-banner">⚠ {SAFETY_DISCLAIMER}</div>

      <section className="card">
        <h2>Visit Transcript</h2>
        <p className="card-subtitle">
          Synthetic input — edit freely. No data leaves this demo except a
          server-side LLM call when OpenAI mode is enabled.
        </p>
        <textarea
          className="transcript"
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          spellCheck={false}
        />
        <div className="controls">
          <button
            className="primary"
            onClick={runWorkflow}
            disabled={loading || transcript.trim().length === 0}
          >
            {loading && <span className="spinner" />}
            {loading ? "Running workflow…" : "Run Workflow"}
          </button>
          <button
            className="secondary"
            onClick={resetTranscript}
            disabled={loading}
          >
            Reset sample
          </button>
        </div>
        {error && <div className="error-banner">⚠ {error}</div>}
      </section>

      {!result && !loading && (
        <div className="card empty-state">
          Run the workflow to see the generated documentation package.
        </div>
      )}

      {result && (
        <>
          <div className="run-meta">
            <span className={`pill ${result.mode === "openai" ? "low" : "muted"}`}>
              mode: {result.mode}
            </span>
            <span className="mono" style={{ color: "var(--muted)" }}>
              {result.workflowId}
            </span>
          </div>
          <WorkflowTimeline steps={result.steps} />
          <ClinicalExtractionView
            facts={result.clinicalFacts}
            patient={result.patientContext}
          />
          <OasisMappingView mapping={result.oasisMappings} />
          <MissingDocWarningsView warnings={result.missingInfoWarnings} />
          {result.transcriptConfidenceAnalysis && (
            <TranscriptConfidencePanel
              analysis={result.transcriptConfidenceAnalysis}
            />
          )}
          <DraftNoteView note={result.draftNote} />
          <ReviewPackageView reviewPackage={result.humanReviewPackage} />
          <TracePanel
            workflowId={result.workflowId}
            mode={result.mode}
            model={result.steps.find((s) => s.model)?.model ?? "—"}
            observabilityMode={result.observabilityMode}
            traceId={result.traceId}
            traceUrl={result.traceUrl}
            steps={result.steps}
          />
          <div className="disclaimer-banner subtle">⚠ {result.disclaimer}</div>
        </>
      )}
    </main>
  );
}
