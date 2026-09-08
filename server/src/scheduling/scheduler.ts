/**
 * Section 8: "This is arithmetic and allocation. It belongs in your code,
 * not in a prompt." No LLM call anywhere in this file.
 *
 * Ordering: every question gets a priority score from the requirement(s)
 * it covers (must outranks nice) and its own difficulty, then questions
 * are laid out across the requested day count so higher-scored material
 * lands on earlier days ("harder and higher-priority material lands
 * earlier, not the night before"). Every question gets scheduled
 * somewhere — since the coverage pass already guarantees every
 * requirement has at least one question, that's what makes "every
 * must-have requirement appears somewhere in the schedule" hold.
 */
import type { Question, Requirement, ScheduleDay, Schedule } from "@aipk/shared";

const MINUTES_BY_DIFFICULTY: Record<number, number> = { 1: 10, 2: 15, 3: 25 };
const SYSTEM_DESIGN_BONUS_MINUTES = 15;

function estimateMinutes(q: Pick<Question, "difficulty" | "category">): number {
  const base = MINUTES_BY_DIFFICULTY[q.difficulty] ?? 15;
  return q.category === "system-design" ? base + SYSTEM_DESIGN_BONUS_MINUTES : base;
}

function priorityScore(q: Pick<Question, "requirement_ids" | "difficulty">, reqById: Map<string, Requirement>): number {
  let priorityWeight = 1; // default: treat as "nice" if it references nothing resolvable
  for (const rid of q.requirement_ids) {
    const req = reqById.get(rid);
    if (req?.priority === "must") priorityWeight = 2;
  }
  return priorityWeight * 10 + q.difficulty;
}

function focusLabel(dayQuestions: Question[], reqById: Map<string, Requirement>): string {
  if (dayQuestions.length === 0) return "Rest / review day — no new material scheduled";

  const categoryCounts = new Map<string, number>();
  for (const q of dayQuestions) categoryCounts.set(q.category, (categoryCounts.get(q.category) ?? 0) + 1);
  const topCategory = [...categoryCounts.entries()].sort((a, b) => b[1] - a[1])[0][0];

  const topicNames = new Set<string>();
  for (const q of dayQuestions) {
    for (const rid of q.requirement_ids) {
      const req = reqById.get(rid);
      if (req) topicNames.add(req.text.length > 40 ? `${req.text.slice(0, 40)}…` : req.text);
      if (topicNames.size >= 3) break;
    }
    if (topicNames.size >= 3) break;
  }

  const label = topCategory === "company-fit" ? "Company & domain fit" : topCategory[0].toUpperCase() + topCategory.slice(1);
  return topicNames.size > 0 ? `${label}: ${[...topicNames].join(", ")}` : label;
}

export function buildSchedule(
  questions: Question[],
  requirements: Requirement[],
  daysAvailable: number,
): Schedule {
  const reqById = new Map(requirements.map((r) => [r.id, r]));
  const days = Math.max(1, Math.floor(daysAvailable));

  const ordered = [...questions].sort(
    (a, b) => priorityScore(b, reqById) - priorityScore(a, reqById),
  );

  const buckets: Question[][] = Array.from({ length: days }, () => []);
  // Distribute in round-robin over sorted order so the highest-priority
  // items land on day 1, next batch on day 2, etc., while still spreading
  // roughly evenly when there are far more questions than days.
  const perDay = Math.ceil(ordered.length / days) || 0;
  ordered.forEach((q, i) => {
    const dayIndex = Math.min(days - 1, Math.floor(i / Math.max(1, perDay)));
    buckets[dayIndex].push(q);
  });

  const scheduleDays: ScheduleDay[] = buckets.map((dayQuestions, i) => ({
    day: i + 1,
    focus: focusLabel(dayQuestions, reqById),
    question_ids: dayQuestions.map((q) => q.id),
    minutes: dayQuestions.reduce((sum, q) => sum + estimateMinutes(q), 0),
  }));

  return { days_available: days, days: scheduleDays };
}
