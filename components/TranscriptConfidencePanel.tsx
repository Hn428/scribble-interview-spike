"use client";

import { useState } from "react";
import type {
  InsightCategory,
  TranscriptConfidenceAnalysis,
} from "@/src/lib/schemas/insights";

const CATEGORY_LABEL: Record<InsightCategory, string> = {
  strong_confirmation: "Strong Confirmation",
  uncertainty: "Uncertainty",
  needs_clinician_confirmation: "Needs Clinician Confirmation",
  possible_contradiction: "Possible Contradiction",
  missing_context: "Missing Context",
  safety_relevant: "Safety Relevant",
};

const CATEGORY_ORDER: InsightCategory[] = [
  "safety_relevant",
  "possible_contradiction",
  "needs_clinician_confirmation",
  "uncertainty",
  "missing_context",
  "strong_confirmation",
];

/**
 * Sidecar panel — an extra review layer that highlights transcript phrases that
 * may support, weaken, or require confirmation before documentation is
 * finalized. It never overrides the main documentation output.
 */
export function TranscriptConfidencePanel({
  analysis,
}: {
  analysis: TranscriptConfidenceAnalysis;
}) {
  const [open, setOpen] = useState(false);

  const counts = CATEGORY_ORDER.map((category) => ({
    category,
    count: analysis.insights.filter((i) => i.category === category).length,
  })).filter((c) => c.count > 0);

  const sortedInsights = [...analysis.insights].sort(
    (a, b) =>
      CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category),
  );

  return (
    <section className="card sidecar-panel">
      <div className="sidecar-head">
        <div>
          <h2>
            Transcript Confidence &amp; Uncertainty{" "}
            <span className="sidecar-tag">sidecar</span>
          </h2>
          <p className="card-subtitle" style={{ marginBottom: 0 }}>
            Sidecar analysis: highlights transcript phrases that may support,
            weaken, or require confirmation before documentation is finalized.
          </p>
        </div>
        <span className={`pill ${confidencePill(analysis.overallConfidence)}`}>
          confidence: {analysis.overallConfidence}
        </span>
      </div>

      <p className="sidecar-summary">{analysis.summary}</p>

      <div className="sidecar-counts">
        {counts.map((c) => (
          <span key={c.category} className="count-chip">
            {CATEGORY_LABEL[c.category]}: <strong>{c.count}</strong>
          </span>
        ))}
      </div>

      <button
        className="secondary sidecar-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {open
          ? "Hide insights"
          : `Show ${analysis.insights.length} insight${analysis.insights.length === 1 ? "" : "s"}`}
      </button>

      {open && (
        <div className="insight-list">
          {sortedInsights.map((insight) => (
            <div key={insight.id} className="insight-card">
              <div className="insight-head">
                <span className="insight-category">
                  {CATEGORY_LABEL[insight.category]}
                </span>
                <span className={`pill ${insight.severity}`}>
                  {insight.severity}
                </span>
              </div>
              <div className="insight-phrase">“{insight.phrasing}”</div>
              <div className="insight-evidence">
                <span className="insight-field-label">Transcript evidence</span>
                <span className="insight-quote">
                  {insight.transcriptEvidence}
                </span>
              </div>
              <p className="insight-explanation">{insight.explanation}</p>
              {insight.recommendedFollowUp && (
                <p className="insight-followup">
                  <strong>Recommended follow-up:</strong>{" "}
                  {insight.recommendedFollowUp}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function confidencePill(level: "low" | "medium" | "high"): string {
  if (level === "high") return "low"; // high confidence → green
  if (level === "medium") return "medium";
  return "high"; // low confidence → red
}
