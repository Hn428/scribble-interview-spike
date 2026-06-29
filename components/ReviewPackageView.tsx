import type { HumanReviewPackage } from "@/src/lib/schemas/review";

const RECOMMENDATION_LABEL: Record<
  HumanReviewPackage["recommendation"],
  { text: string; pill: string }
> = {
  approve: { text: "Approve", pill: "low" },
  approve_with_edits: { text: "Approve with edits", pill: "medium" },
  needs_review: { text: "Needs review", pill: "high" },
};

export function ReviewPackageView({
  reviewPackage,
}: {
  reviewPackage: HumanReviewPackage;
}) {
  const rec = RECOMMENDATION_LABEL[reviewPackage.recommendation];
  const confidencePct = Math.round(reviewPackage.overallConfidence * 100);

  return (
    <section className="card">
      <h2>Human Review Package</h2>
      <p className="card-subtitle">
        Everything a clinician needs to approve, edit, or reject — the
        human-in-the-loop checkpoint.
      </p>

      <div className="review-banner">
        <span className={`pill ${rec.pill}`}>{rec.text}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, color: "var(--muted)" }}>
            Overall confidence: {confidencePct}%
          </div>
          <div className="confidence-bar">
            <span style={{ width: `${confidencePct}%` }} />
          </div>
        </div>
      </div>

      <p style={{ marginTop: 0 }}>{reviewPackage.summary}</p>

      <h3 className="soap-label" style={{ marginTop: 16 }}>
        Reviewer Checklist
      </h3>
      <ul className="checklist">
        {reviewPackage.reviewerChecklist.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      <h3 className="soap-label" style={{ marginTop: 16 }}>
        Source Evidence
      </h3>
      {reviewPackage.sourceEvidence.map((e) => (
        <div key={e.claim} className="evidence">
          <div className="claim">{e.claim}</div>
          <p className="quote">“{e.transcriptQuote}”</p>
        </div>
      ))}
    </section>
  );
}
