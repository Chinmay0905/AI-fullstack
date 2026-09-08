import { describe, it, expect } from "vitest";
import { buildSchedule } from "./scheduler";
import type { Question, Requirement } from "@aipk/shared";

function req(id: string, priority: "must" | "nice" = "must"): Requirement {
  return { id, text: `requirement ${id}`, kind: "technical", priority };
}
function q(id: string, requirement_ids: string[], difficulty: 1 | 2 | 3 = 2, category: Question["category"] = "technical"): Question {
  return { id, requirement_ids, category, prompt: `prompt ${id}`, answer_outline: "outline", difficulty };
}

describe("buildSchedule", () => {
  it("Section 8: the number of days in the schedule equals the number of days requested", () => {
    const schedule = buildSchedule([q("q1", ["r1"])], [req("r1")], 7);
    expect(schedule.days_available).toBe(7);
    expect(schedule.days).toHaveLength(7);
  });

  it("handles a 1-day schedule — everything lands on day 1", () => {
    const questions = [q("q1", ["r1"]), q("q2", ["r2"]), q("q3", ["r3"])];
    const requirements = [req("r1"), req("r2"), req("r3")];
    const schedule = buildSchedule(questions, requirements, 1);
    expect(schedule.days).toHaveLength(1);
    expect(schedule.days[0].question_ids.sort()).toEqual(["q1", "q2", "q3"]);
  });

  it("handles a 60-day schedule with few questions — extra days are honest empty rest days, not fabricated content", () => {
    const questions = [q("q1", ["r1"])];
    const requirements = [req("r1")];
    const schedule = buildSchedule(questions, requirements, 60);
    expect(schedule.days).toHaveLength(60);
    const nonEmptyDays = schedule.days.filter((d) => d.question_ids.length > 0);
    expect(nonEmptyDays).toHaveLength(1);
    const emptyDay = schedule.days.find((d) => d.question_ids.length === 0)!;
    expect(emptyDay.minutes).toBe(0);
  });

  it("handles zero questions — every day is present but empty", () => {
    const schedule = buildSchedule([], [], 5);
    expect(schedule.days).toHaveLength(5);
    for (const day of schedule.days) {
      expect(day.question_ids).toEqual([]);
      expect(day.minutes).toBe(0);
    }
  });

  it("never drops a question — every question_id appears exactly once across all days", () => {
    const questions = [q("q1", ["r1"]), q("q2", ["r2"]), q("q3", ["r3"]), q("q4", ["r4"]), q("q5", ["r5"])];
    const requirements = questions.map((_, i) => req(`r${i + 1}`));
    const schedule = buildSchedule(questions, requirements, 3);
    const allIds = schedule.days.flatMap((d) => d.question_ids);
    expect(allIds.sort()).toEqual(["q1", "q2", "q3", "q4", "q5"]);
  });

  it("every day has an integer minutes value", () => {
    const questions = [q("q1", ["r1"], 1), q("q2", ["r2"], 2), q("q3", ["r3"], 3)];
    const requirements = questions.map((_, i) => req(`r${i + 1}`));
    const schedule = buildSchedule(questions, requirements, 2);
    for (const day of schedule.days) {
      expect(Number.isInteger(day.minutes)).toBe(true);
    }
  });

  it("Section 8: harder and higher-priority material lands earlier, not the night before", () => {
    // r1 is a must-have difficulty-3 question; r2 is a nice-to-have
    // difficulty-1 question. With enough days to separate them one per
    // day, the must-have should land on day 1.
    const questions = [q("q-nice", ["r-nice"], 1), q("q-must", ["r-must"], 3)];
    const requirements = [req("r-nice", "nice"), req("r-must", "must")];
    const schedule = buildSchedule(questions, requirements, 2);
    expect(schedule.days[0].question_ids).toEqual(["q-must"]);
    expect(schedule.days[1].question_ids).toEqual(["q-nice"]);
  });
});
