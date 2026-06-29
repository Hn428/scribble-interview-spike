import type { MissingInfoWarning } from "@/src/lib/schemas/review";

export function MissingDocWarningsView({
  warnings,
}: {
  warnings: MissingInfoWarning[];
}) {
  return (
    <section className="card">
      <h2>Missing Documentation Warnings</h2>
      <p className="card-subtitle">
        {warnings.length === 0
          ? "No gaps detected."
          : `${warnings.length} gap(s) flagged for clinician attention.`}
      </p>
      {warnings.map((w) => (
        <div key={w.id} className={`warning ${w.severity}`}>
          <div className="warning-head">
            <span className={`pill ${w.severity}`}>{w.severity}</span>
            <span className="warning-title">{w.title}</span>
          </div>
          <p className="warning-detail">{w.detail}</p>
          <p className="warning-action">
            <strong>Suggested action:</strong> {w.suggestedAction}
          </p>
        </div>
      ))}
    </section>
  );
}
