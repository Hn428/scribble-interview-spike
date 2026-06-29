import { generateStructured } from "../../llm/client";
import { MAP_OASIS_SYSTEM, buildMapOasisUser } from "../../llm/prompts";
import type { ClinicalFacts } from "../../schemas/clinical";
import {
  OasisMappingResultSchema,
  type OasisStyleFieldMapping,
} from "../../schemas/oasis";
import { runLLMStep, type StepContext, type StepOutcome } from "../stepTypes";

/** Deterministic mock mapping derived from the clinical facts. */
function mockOasisMappings(facts: ClinicalFacts): OasisStyleFieldMapping[] {
  const onWalker = facts.functionalStatus.some((f) =>
    f.toLowerCase().includes("walker"),
  );
  return [
    {
      itemId: "M1830",
      label: "Bathing",
      value: "2 - Able to bathe with intermittent assistance",
      confidence: "high",
      rationale: "Facts: 'requires minimal assistance with bathing'.",
    },
    {
      itemId: "M1840",
      label: "Toilet Transferring",
      value: null,
      confidence: "low",
      rationale: "Not addressed in the transcript.",
    },
    {
      itemId: "M1850",
      label: "Transferring",
      value: "1 - Minimal human assistance or assistive device",
      confidence: "medium",
      rationale: "Uses front-wheeled walker; transfer detail inferred.",
    },
    {
      itemId: "M1860",
      label: "Ambulation/Locomotion",
      value: onWalker ? "2 - Requires a two-handed device to walk" : null,
      confidence: "high",
      rationale: "Facts: 'ambulates with a front-wheeled walker'.",
    },
    {
      itemId: "M1400",
      label: "Short of Breath (Dyspnea)",
      value: "2 - With moderate exertion (e.g., walking ~20 feet)",
      confidence: "medium",
      rationale: "Reports dyspnea walking bedroom to kitchen.",
    },
    {
      itemId: "M1322",
      label: "Current Number of Pressure Ulcers",
      value: null,
      confidence: "low",
      rationale: "Skin integrity not fully documented this visit.",
    },
  ];
}

/** STEP 3 — Map clinical facts to OASIS-style items (structured output). */
export async function mapOasisFields(
  input: { clinicalFacts: ClinicalFacts },
  ctx: StepContext,
): Promise<StepOutcome<OasisStyleFieldMapping[]>> {
  return runLLMStep<OasisStyleFieldMapping[]>({
    ctx,
    llm: async () => {
      const result = await generateStructured({
        schema: OasisMappingResultSchema,
        schemaName: "OasisMappingResult",
        system: MAP_OASIS_SYSTEM,
        user: buildMapOasisUser(input.clinicalFacts),
      });
      return result.mappings;
    },
    mock: () => mockOasisMappings(input.clinicalFacts),
    describe: (mappings, mode) => {
      const documented = mappings.filter((m) => m.value !== null).length;
      return `Mapped ${mappings.length} OASIS items (${documented} with values) (${mode}).`;
    },
  });
}
