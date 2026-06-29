import type { VisitWorkflowStep } from "@/src/lib/schemas/workflow";

export function WorkflowTimeline({ steps }: { steps: VisitWorkflowStep[] }) {
  const totalMs = steps.reduce((sum, s) => sum + s.durationMs, 0);
  return (
    <section className="card">
      <h2>Workflow Timeline</h2>
      <p className="card-subtitle">
        {steps.length} steps · {(totalMs / 1000).toFixed(2)}s total
      </p>
      <ol className="timeline">
        {steps.map((step) => (
          <li key={step.id} className="timeline-step">
            <span className={`timeline-dot ${step.status}`} />
            <div className="timeline-head">
              <span className="timeline-label">{step.label}</span>
              <span className="timeline-meta">
                {(step.durationMs / 1000).toFixed(2)}s ·{" "}
                <span className="tag">{step.model ?? "deterministic"}</span>
              </span>
            </div>
            <p className="timeline-desc">{step.description}</p>
            <p className="timeline-desc">
              {step.status === "failed" ? "⚠ " : ""}
              {step.summary}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
