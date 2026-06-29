import type { OasisStyleFieldMapping } from "@/src/lib/schemas/oasis";

export function OasisMappingView({
  mapping,
}: {
  mapping: OasisStyleFieldMapping[];
}) {
  return (
    <section className="card">
      <h2>OASIS Field Mapping</h2>
      <p className="card-subtitle">
        Extracted findings mapped to OASIS-style assessment items, with
        confidence and rationale for clinician review.
      </p>
      <table className="data">
        <thead>
          <tr>
            <th>Item</th>
            <th>Field</th>
            <th>Mapped Value</th>
            <th>Confidence</th>
            <th>Rationale</th>
          </tr>
        </thead>
        <tbody>
          {mapping.map((m) => (
            <tr key={m.itemId}>
              <td className="mono">{m.itemId}</td>
              <td>{m.label}</td>
              <td>
                {m.value ?? (
                  <span className="null-value">not documented</span>
                )}
              </td>
              <td>
                <span className={`pill ${m.confidence}`}>{m.confidence}</span>
              </td>
              <td style={{ color: "var(--muted)" }}>{m.rationale}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
