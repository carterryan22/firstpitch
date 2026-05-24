import { getMatrixBand, type AgeMatrixBand, type AgeMatrixTopic } from "@platform/corpus";

export type MatrixVerdict = "required" | "allowed" | "forbidden";

export interface MatrixQuery {
  age: number;
  topic: string;
  item: string;
  conditionsMet?: string[];
}

/**
 * Implements matrix_query_contract.isAllowed from corpus/age-band-matrix.json.
 * Evaluation order: forbidden → required → allowed_with_conditions → fallback 'forbidden'.
 */
export function isAllowedByAgeMatrix(q: MatrixQuery): MatrixVerdict {
  const band = getMatrixBand(q.age);
  const topic = band.topics[q.topic];
  if (!topic) return "forbidden";

  const lower = q.item.toLowerCase();
  if (topic.forbidden.some((f) => lower.includes(f.toLowerCase()))) return "forbidden";
  if (topic.required.some((r) => lower.includes(r.toLowerCase()))) return "required";

  const conditional = topic.allowed_with_conditions.find((a) =>
    lower.includes(a.item.toLowerCase())
  );
  if (conditional) {
    if (!q.conditionsMet) return "allowed";
    const allMet = conditional.conditions.every((c) =>
      q.conditionsMet!.some((m) => m.toLowerCase().includes(c.toLowerCase().slice(0, 12)))
    );
    return allMet ? "allowed" : "forbidden";
  }
  return "forbidden";
}

export function sessionCapsFor(age: number) {
  return getMatrixBand(age).session_structure;
}

export function listForbidden(age: number, topic: string): string[] {
  const band = getMatrixBand(age);
  return band.topics[topic]?.forbidden ?? [];
}

export function listRequired(age: number, topic: string): string[] {
  const band = getMatrixBand(age);
  return band.topics[topic]?.required ?? [];
}

export function getBand(age: number): AgeMatrixBand {
  return getMatrixBand(age);
}

export function topic(band: AgeMatrixBand, name: string): AgeMatrixTopic | undefined {
  return band.topics[name];
}
