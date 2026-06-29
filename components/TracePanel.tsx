import type {
  ObservabilityMode,
  VisitWorkflowStep,
  WorkflowMode,
} from "@/src/lib/schemas/workflow";

/**
 * Observability panel. Surfaces Langfuse trace metadata when enabled, and run
 * identity / step health always. Every major workflow step is traceable for
 * debugging output quality, latency, token usage, and failure analysis.
 */
export function TracePanel({
  workflowId,
  mode,
  model,
  observabilityMode,
  traceId,
  traceUrl,
  steps,
}: {
  workflowId: string;
  mode: WorkflowMode;
  model: string;
  observabilityMode: ObservabilityMode;
  traceId?: string;
  traceUrl?: string;
  steps: VisitWorkflowStep[];
}) {
  const totalMs = steps.reduce((sum, s) => sum + s.durationMs, 0);
  const completed = steps.filter((s) => s.status === "completed").length;
  const failed = steps.filter((s) => s.status === "failed").length;
  const tracingOn = observabilityMode === "langfuse";

  return (
    <section className="card trace-panel">
      <h2>Trace Panel</h2>
      <p className="card-subtitle">
        Every major workflow step is traceable for debugging output quality,
        latency, token usage, and failure analysis.
      </p>

      <div className="trace-grid">
        <div className="trace-metric">
          <div className="label">Observability</div>
          <div className="value">
            <span className={`pill ${tracingOn ? "low" : "muted"}`}>
              {tracingOn ? "Langfuse" : "disabled"}
            </span>
          </div>
        </div>
        <div className="trace-metric">
          <div className="label">Mode</div>
          <div className="value">
            <span className={`pill ${mode === "openai" ? "low" : "muted"}`}>
              {mode}
            </span>
          </div>
        </div>
        <div className="trace-metric">
          <div className="label">Model</div>
          <div className="value mono" style={{ fontSize: 14 }}>
            {mode === "openai" ? model : "—"}
          </div>
        </div>
        <div className="trace-metric">
          <div className="label">Total duration</div>
          <div className="value">{(totalMs / 1000).toFixed(2)}s</div>
        </div>
        <div className="trace-metric">
          <div className="label">Steps</div>
          <div className="value">
            {completed} ✓{failed > 0 ? ` · ${failed} ✗` : ""}
          </div>
        </div>
      </div>

      <div className="trace-id-row">
        <div className="label" style={{ fontSize: 12, color: "var(--muted)" }}>
          Workflow ID
        </div>
        <div className="value mono" style={{ fontSize: 13 }}>
          {workflowId}
        </div>
      </div>

      <div className="trace-id-row">
        <div className="label" style={{ fontSize: 12, color: "var(--muted)" }}>
          Trace ID
        </div>
        {traceId ? (
          <div className="value mono" style={{ fontSize: 13 }}>
            {traceUrl ? (
              <a
                className="trace-link"
                href={traceUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {traceId}
              </a>
            ) : (
              traceId
            )}
          </div>
        ) : (
          <div className="value">
            <span className="null-value">
              {tracingOn
                ? "no trace captured for this run"
                : "tracing disabled — set LANGFUSE_* env vars to enable"}
            </span>
          </div>
        )}
      </div>

      {traceId && (
        <p className="placeholder-note">
          Open this run in Langfuse by searching the trace id above. (The deep
          link is best-effort; Langfuse trace URLs are project-scoped.)
        </p>
      )}
    </section>
  );
}
