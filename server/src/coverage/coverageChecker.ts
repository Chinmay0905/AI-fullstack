/**
 * Section 3: "Comparing the extracted requirements against the generated
 * questions to find the gaps is likewise your code's decision to make, not
 * the model's." Pure arithmetic/set logic — no LLM call in this file.
 */
import type { Requirement } from "@aipk/shared";

export interface CoverageCheckInput {
  requirements: Requirement[];
  questions: { requirement_ids: string[] }[];
}

export function findUncoveredRequirementIds(input: CoverageCheckInput): string[] {
  const covered = new Set<string>();
  for (const q of input.questions) {
    for (const rid of q.requirement_ids) covered.add(rid);
  }
  return input.requirements.filter((r) => !covered.has(r.id)).map((r) => r.id);
}
