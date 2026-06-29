import type { ClinicalFacts, PatientContext } from "@/src/lib/schemas/clinical";

/**
 * Renders the patient context plus the structured clinical facts, both as
 * readable sections and as the raw JSON payload (interviewers want to see the
 * actual structured output that downstream steps consume).
 */
export function ClinicalExtractionView({
  facts,
  patient,
}: {
  facts: ClinicalFacts;
  patient: PatientContext;
}) {
  const {
    visitType,
    vitals,
    diagnoses,
    medications,
    functionalStatus,
    interventions,
    carePlan,
    riskFlags,
  } = facts;

  return (
    <section className="card">
      <h2>Structured Clinical Extraction</h2>
      <p className="card-subtitle">
        Typed data extracted from the transcript — the input to every downstream
        step.
      </p>

      <div className="grid-2">
        <div>
          <h3 className="soap-label">Patient (context)</h3>
          <dl className="kv">
            <dt>Name</dt>
            <dd>{patient.name}</dd>
            <dt>ID</dt>
            <dd className="mono">{patient.patientId}</dd>
            <dt>DOB</dt>
            <dd>
              {patient.dateOfBirth} (age {patient.age})
            </dd>
            <dt>Setting</dt>
            <dd>{patient.careSetting}</dd>
            <dt>Visit</dt>
            <dd>{visitType}</dd>
          </dl>
        </div>

        <div>
          <h3 className="soap-label">Vitals</h3>
          <dl className="kv">
            <dt>BP</dt>
            <dd>{vitals.bloodPressure ?? "—"}</dd>
            <dt>HR</dt>
            <dd>{vitals.heartRate ?? "—"}</dd>
            <dt>RR</dt>
            <dd>{vitals.respiratoryRate ?? "—"}</dd>
            <dt>Temp</dt>
            <dd>{vitals.temperatureF != null ? `${vitals.temperatureF}°F` : "—"}</dd>
            <dt>SpO₂</dt>
            <dd>
              {vitals.oxygenSaturation != null
                ? `${vitals.oxygenSaturation}%`
                : "—"}
            </dd>
            <dt>Weight</dt>
            <dd>{vitals.weightLbs != null ? `${vitals.weightLbs} lbs` : "—"}</dd>
            <dt>Pain</dt>
            <dd>
              {vitals.painScore != null ? (
                vitals.painScore
              ) : (
                <span className="null-value">not documented</span>
              )}
            </dd>
          </dl>
        </div>
      </div>

      {riskFlags.length > 0 && (
        <>
          <h3 className="soap-label" style={{ marginTop: 18 }}>
            Risk Flags
          </h3>
          <table className="data">
            <thead>
              <tr>
                <th>Severity</th>
                <th>Category</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {riskFlags.map((flag, i) => (
                <tr key={`${flag.category}-${i}`}>
                  <td>
                    <span className={`pill ${flag.severity}`}>
                      {flag.severity}
                    </span>
                  </td>
                  <td>{flag.category}</td>
                  <td>{flag.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <h3 className="soap-label" style={{ marginTop: 18 }}>
        Diagnoses
      </h3>
      <table className="data">
        <thead>
          <tr>
            <th>Description</th>
            <th>ICD-10</th>
          </tr>
        </thead>
        <tbody>
          {diagnoses.map((d) => (
            <tr key={d.description}>
              <td>{d.description}</td>
              <td className="mono">{d.icd10 ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 className="soap-label" style={{ marginTop: 18 }}>
        Medications
      </h3>
      <table className="data">
        <thead>
          <tr>
            <th>Name</th>
            <th>Dosage</th>
            <th>Frequency</th>
            <th>Adherence</th>
          </tr>
        </thead>
        <tbody>
          {medications.map((m) => (
            <tr key={m.name}>
              <td>{m.name}</td>
              <td>{m.dosage}</td>
              <td>{m.frequency}</td>
              <td>
                {m.adherenceConfirmed ? (
                  <span className="pill low">confirmed</span>
                ) : (
                  <span className="pill medium">unconfirmed</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="grid-2" style={{ marginTop: 18 }}>
        <ListBlock title="Functional Status" items={functionalStatus} />
        <ListBlock title="Interventions" items={interventions} />
      </div>
      <div style={{ marginTop: 18 }}>
        <ListBlock title="Care Plan" items={carePlan} />
      </div>

      <h3 className="soap-label" style={{ marginTop: 18 }}>
        Raw JSON (clinicalFacts)
      </h3>
      <pre className="json">{JSON.stringify(facts, null, 2)}</pre>
    </section>
  );
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="soap-label">{title}</h3>
      <ul className="checklist">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
