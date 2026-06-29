import type { DraftVisitNote } from "@/src/lib/schemas/review";

export function DraftNoteView({ note }: { note: DraftVisitNote }) {
  const sections: Array<{ label: string; body: string }> = [
    { label: "Subjective", body: note.subjective },
    { label: "Objective", body: note.objective },
    { label: "Assessment", body: note.assessment },
    { label: "Plan", body: note.plan },
  ];
  return (
    <section className="card">
      <h2>Draft Visit Note</h2>
      <p className="card-subtitle">
        {note.format} format · draft for clinician review and sign-off.
      </p>
      {sections.map((s) => (
        <div key={s.label} className="soap-section">
          <div className="soap-label">{s.label}</div>
          <p className="soap-body">{s.body}</p>
        </div>
      ))}
    </section>
  );
}
