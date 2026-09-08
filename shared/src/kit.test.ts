import { describe, it, expect } from "vitest";
import { KitSchema, validateKitReferences, type Kit } from "./kit";

function validKit(): Kit {
  return {
    source: {
      company: "Acme",
      company_url: "https://acme.example",
      role: "Backend Engineer",
      location: "",
      jd_chars: 100,
      researched_at: new Date().toISOString(),
      pages_used: ["https://acme.example"],
    },
    company_brief: { summary: "A company.", what_they_do: "Builds things.", sources: [] },
    role: {
      title: "Backend Engineer",
      seniority: "senior",
      responsibilities: ["Ship features"],
      requirements: [{ id: "r1", text: "5+ years Node.js", kind: "technical", priority: "must" }],
    },
    questions: [
      {
        id: "q1",
        requirement_ids: ["r1"],
        category: "technical",
        prompt: "Explain event loop",
        answer_outline: "...",
        difficulty: 2,
      },
    ],
    flashcards: [{ id: "f1", front: "Front", back: "Back", requirement_ids: ["r1"] }],
    schedule: { days_available: 1, days: [{ day: 1, focus: "Technical", question_ids: ["q1"], minutes: 30 }] },
    coverage: { uncovered_requirement_ids: [], passes: 1 },
  };
}

describe("KitSchema (Appendix A structure validation)", () => {
  it("accepts a well-formed kit", () => {
    expect(KitSchema.safeParse(validKit()).success).toBe(true);
  });

  it("rejects a requirement with an invalid priority (not must|nice)", () => {
    const kit = validKit();
    // @ts-expect-error deliberately invalid for the test
    kit.role.requirements[0].priority = "should";
    expect(KitSchema.safeParse(kit).success).toBe(false);
  });

  it("rejects a requirement with an invalid kind", () => {
    const kit = validKit();
    // @ts-expect-error deliberately invalid for the test
    kit.role.requirements[0].kind = "soft-skill";
    expect(KitSchema.safeParse(kit).success).toBe(false);
  });

  it("rejects a question category outside the fixed enum", () => {
    const kit = validKit();
    // @ts-expect-error deliberately invalid for the test
    kit.questions[0].category = "trivia";
    expect(KitSchema.safeParse(kit).success).toBe(false);
  });

  it("rejects a non-integer difficulty", () => {
    const kit = validKit();
    // Not a TS-level error (number accepts a float) — this is exactly the
    // kind of mistake only the runtime .int() check catches.
    kit.questions[0].difficulty = 2.5;
    expect(KitSchema.safeParse(kit).success).toBe(false);
  });

  it("rejects difficulty outside 1-3", () => {
    const kit = validKit();
    kit.questions[0].difficulty = 4;
    expect(KitSchema.safeParse(kit).success).toBe(false);
  });

  it("rejects a non-integer schedule minutes value ('about an hour' style input)", () => {
    const kit = validKit();
    // Section 5: "Durations are integer minutes. No floats." — again, only
    // the runtime .int() check catches this, not the TS type itself.
    kit.schedule.days[0].minutes = 60.5;
    expect(KitSchema.safeParse(kit).success).toBe(false);
  });

  it("rejects a missing required field (company_brief.summary)", () => {
    const kit = validKit() as unknown as Record<string, unknown>;
    const companyBrief = kit.company_brief as Record<string, unknown>;
    delete companyBrief.summary;
    expect(KitSchema.safeParse(kit).success).toBe(false);
  });

  it("strips unknown top-level fields rather than rejecting the kit (extensibility)", () => {
    const kit = { ...validKit(), somethingExtra: "ignored" };
    const result = KitSchema.safeParse(kit);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("somethingExtra");
    }
  });
});

describe("validateKitReferences (cross-reference integrity)", () => {
  it("passes for a well-formed kit", () => {
    expect(validateKitReferences(validKit())).toEqual([]);
  });

  it("flags a question referencing a requirement id that doesn't exist", () => {
    const kit = validKit();
    kit.questions[0].requirement_ids = ["r-does-not-exist"];
    const errors = validateKitReferences(kit);
    expect(errors.some((e) => e.includes("r-does-not-exist"))).toBe(true);
  });

  it("flags a flashcard referencing a requirement id that doesn't exist", () => {
    const kit = validKit();
    kit.flashcards[0].requirement_ids = ["r-ghost"];
    const errors = validateKitReferences(kit);
    expect(errors.some((e) => e.includes("r-ghost"))).toBe(true);
  });

  it("flags a schedule day referencing a question id that doesn't exist", () => {
    const kit = validKit();
    kit.schedule.days[0].question_ids = ["q-ghost"];
    const errors = validateKitReferences(kit);
    expect(errors.some((e) => e.includes("q-ghost"))).toBe(true);
  });

  it("flags coverage.uncovered_requirement_ids referencing an unknown requirement", () => {
    const kit = validKit();
    kit.coverage.uncovered_requirement_ids = ["r-nope"];
    const errors = validateKitReferences(kit);
    expect(errors.some((e) => e.includes("r-nope"))).toBe(true);
  });
});
