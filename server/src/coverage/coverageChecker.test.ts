import { describe, it, expect } from "vitest";
import { findUncoveredRequirementIds } from "./coverageChecker";
import type { Requirement } from "@aipk/shared";

function req(id: string, priority: "must" | "nice" = "must"): Requirement {
  return { id, text: `requirement ${id}`, kind: "technical", priority };
}

describe("findUncoveredRequirementIds", () => {
  it("returns every requirement id when there are no questions at all", () => {
    const requirements = [req("r1"), req("r2")];
    const result = findUncoveredRequirementIds({ requirements, questions: [] });
    expect(result).toEqual(["r1", "r2"]);
  });

  it("returns an empty array when every requirement is covered", () => {
    const requirements = [req("r1"), req("r2")];
    const questions = [{ requirement_ids: ["r1"] }, { requirement_ids: ["r2"] }];
    expect(findUncoveredRequirementIds({ requirements, questions })).toEqual([]);
  });

  it("a single question covering two requirements clears both", () => {
    const requirements = [req("r1"), req("r2")];
    const questions = [{ requirement_ids: ["r1", "r2"] }];
    expect(findUncoveredRequirementIds({ requirements, questions })).toEqual([]);
  });

  it("only reports the specific requirements with no covering question", () => {
    const requirements = [req("r1"), req("r2"), req("r3")];
    const questions = [{ requirement_ids: ["r1"] }, { requirement_ids: ["r1", "r3"] }];
    expect(findUncoveredRequirementIds({ requirements, questions })).toEqual(["r2"]);
  });

  it("ignores a question's requirement_ids that don't match any real requirement", () => {
    const requirements = [req("r1")];
    const questions = [{ requirement_ids: ["r99"] }];
    expect(findUncoveredRequirementIds({ requirements, questions })).toEqual(["r1"]);
  });

  it("preserves nice-to-have requirements in the gap list too — Section 4 doesn't scope coverage to must-haves only", () => {
    const requirements = [req("r1", "must"), req("r2", "nice")];
    const result = findUncoveredRequirementIds({ requirements, questions: [] });
    expect(result).toContain("r2");
  });
});
