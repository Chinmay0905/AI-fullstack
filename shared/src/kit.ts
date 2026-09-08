/**
 * Kit structure — mirrors Appendix A of the assessment brief EXACTLY for the
 * required fields (names, nesting, enums). Extensions (origin/pinned state
 * for the builder, practice-mode tracking) are added as optional fields
 * alongside the required ones, never in place of them, per the brief's
 * "you may extend it where that genuinely helps" allowance.
 */
import { z } from "zod";

export const RequirementKind = z.enum(["technical", "behavioural", "domain"]);
export const RequirementPriority = z.enum(["must", "nice"]);
export const QuestionCategory = z.enum([
  "technical",
  "behavioural",
  "system-design",
  "company-fit",
]);

/** Tracks whether an item came from the model, was hand-authored, or was
 * edited by the user — this is what lets a category regeneration skip
 * anything the user touched. Optional/extension field, not in Appendix A. */
export const ItemOrigin = z.enum(["generated", "user_added", "user_edited"]);

export const RequirementSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  kind: RequirementKind,
  priority: RequirementPriority,
});

export const QuestionSchema = z.object({
  id: z.string().min(1),
  requirement_ids: z.array(z.string()),
  category: QuestionCategory,
  prompt: z.string(),
  answer_outline: z.string(),
  difficulty: z.number().int().min(1).max(3),
  // Extensions for the builder's edit/regenerate state machine.
  origin: ItemOrigin.optional(),
  pinned: z.boolean().optional(),
});

export const FlashcardSchema = z.object({
  id: z.string().min(1),
  front: z.string(),
  back: z.string(),
  requirement_ids: z.array(z.string()),
  origin: ItemOrigin.optional(),
  pinned: z.boolean().optional(),
});

export const ScheduleDaySchema = z.object({
  day: z.number().int().min(1),
  focus: z.string(),
  question_ids: z.array(z.string()),
  minutes: z.number().int().min(0),
});

export const ScheduleSchema = z.object({
  days_available: z.number().int().min(1),
  days: z.array(ScheduleDaySchema),
});

export const CoverageSchema = z.object({
  uncovered_requirement_ids: z.array(z.string()),
  passes: z.number().int().min(0),
});

export const SourceSchema = z.object({
  company: z.string(),
  company_url: z.string(),
  role: z.string(),
  location: z.string(),
  jd_chars: z.number().int().min(0),
  researched_at: z.string(),
  pages_used: z.array(z.string()),
});

export const CompanyBriefSchema = z.object({
  summary: z.string(),
  what_they_do: z.string(),
  sources: z.array(z.string()),
});

export const RoleSchema = z.object({
  title: z.string(),
  seniority: z.string(),
  responsibilities: z.array(z.string()),
  requirements: z.array(RequirementSchema),
});

export const KitSchema = z.object({
  source: SourceSchema,
  company_brief: CompanyBriefSchema,
  role: RoleSchema,
  questions: z.array(QuestionSchema),
  flashcards: z.array(FlashcardSchema),
  schedule: ScheduleSchema,
  coverage: CoverageSchema,
});

export type Requirement = z.infer<typeof RequirementSchema>;
export type Question = z.infer<typeof QuestionSchema>;
export type Flashcard = z.infer<typeof FlashcardSchema>;
export type ScheduleDay = z.infer<typeof ScheduleDaySchema>;
export type Schedule = z.infer<typeof ScheduleSchema>;
export type Coverage = z.infer<typeof CoverageSchema>;
export type Source = z.infer<typeof SourceSchema>;
export type CompanyBrief = z.infer<typeof CompanyBriefSchema>;
export type Role = z.infer<typeof RoleSchema>;
export type Kit = z.infer<typeof KitSchema>;

/** Structural cross-reference checks zod alone can't express: every
 * question/flashcard requirement_id must resolve, every schedule
 * question_id must resolve. Run this after schema validation. */
export function validateKitReferences(kit: Kit): string[] {
  const errors: string[] = [];
  const reqIds = new Set(kit.role.requirements.map((r) => r.id));
  const qIds = new Set(kit.questions.map((q) => q.id));

  for (const q of kit.questions) {
    for (const rid of q.requirement_ids) {
      if (!reqIds.has(rid)) errors.push(`question ${q.id} references unknown requirement ${rid}`);
    }
  }
  for (const f of kit.flashcards) {
    for (const rid of f.requirement_ids) {
      if (!reqIds.has(rid)) errors.push(`flashcard ${f.id} references unknown requirement ${rid}`);
    }
  }
  for (const day of kit.schedule.days) {
    for (const qid of day.question_ids) {
      if (!qIds.has(qid)) errors.push(`schedule day ${day.day} references unknown question ${qid}`);
    }
  }
  for (const rid of kit.coverage.uncovered_requirement_ids) {
    if (!reqIds.has(rid)) errors.push(`coverage references unknown requirement ${rid}`);
  }
  return errors;
}
