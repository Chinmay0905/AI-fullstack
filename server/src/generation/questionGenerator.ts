/**
 * Section 3: "Generate questions for a given requirement and category" —
 * and "a requirement like five years of React leads to technical questions
 * while mentoring junior engineers leads to behavioural ones; the two
 * should not come from the same call with the same instructions." So this
 * is called once per requirement *kind*, each with its own prompt/rules —
 * never one generic call covering every requirement.
 *
 * It also folds in whatever hiring-process signal we found (a crawled
 * hiring page, or discussion-search snippets) so the question *style*
 * reacts to it, per Section 3: "a company that publishes a take-home
 * followed by a system design round should produce a different kit from
 * one that says nothing."
 *
 * Reused verbatim for the Section 4 second pass — the gap-filling call
 * just invokes this again scoped to the uncovered requirements, so there
 * is exactly one code path for "generate questions," not two.
 */
import { z } from "zod";
import { generateJson, wrapUntrusted } from "../llm/geminiClient";
import { QuestionCategory } from "@aipk/shared";
import type { Requirement } from "@aipk/shared";

type Category = z.infer<typeof QuestionCategory>;

const GeneratedQuestionSchema = z.object({
  requirement_ids: z.array(z.string()).min(1),
  prompt: z.string().min(1),
  answer_outline: z.string().min(1),
  difficulty: z.number().int().min(1).max(3),
});
const ResponseSchema = z.object({ questions: z.array(GeneratedQuestionSchema) });

export type GeneratedQuestion = z.infer<typeof GeneratedQuestionSchema> & {
  category: Category;
};

export interface GenerationContext {
  companyName: string;
  roleTitle: string;
  seniority: string;
  companyBriefSummary: string;
  /** Concatenated text from crawled hiring-process pages + discussion
   * search snippets. Empty string if nothing was found — see edge case
   * "public discussion turns up nothing at all" in Section 10. */
  hiringProcessNotes: string;
}

const KIND_TO_CATEGORY: Record<Requirement["kind"], "technical" | "behavioural" | "company-fit"> = {
  technical: "technical",
  behavioural: "behavioural",
  domain: "company-fit",
};

const KIND_INSTRUCTIONS: Record<Requirement["kind"], string> = {
  technical:
    "Write technical interview questions that test hands-on knowledge of the specific " +
    "technology/skill named in each requirement — a realistic mix of conceptual " +
    "understanding and practical/applied questions. answer_outline should sketch the 3-5 " +
    "points a strong answer would hit, not a full essay.",
  behavioural:
    "Write behavioural interview questions (STAR-style: situation/task/action/result) that " +
    "probe the specific soft skill or trait named in each requirement. answer_outline should " +
    "describe what a strong STAR answer demonstrates for this trait specifically — not generic " +
    "interview advice.",
  domain:
    "Write questions that assess the candidate's domain/industry knowledge relevant to each " +
    "requirement, and — where the company brief gives enough to work with — how that " +
    "knowledge connects to this company's actual business. answer_outline should describe " +
    "what separates genuine domain understanding from surface-level familiarity.",
};

export async function generateQuestionsForKind(
  kind: Requirement["kind"],
  requirements: Requirement[],
  ctx: GenerationContext,
): Promise<GeneratedQuestion[]> {
  if (requirements.length === 0) return [];

  const category = KIND_TO_CATEGORY[kind];
  const reqList = requirements.map((r) => `- id="${r.id}" priority=${r.priority}: ${r.text}`).join("\n");
  const hiringBlock = ctx.hiringProcessNotes.trim()
    ? wrapUntrusted("hiring_process_notes", ctx.hiringProcessNotes.slice(0, 2500))
    : "(none found — use standard interview formats for this category)";

  const prompt = `You are generating interview-prep questions for a candidate interviewing for
"${ctx.roleTitle}" (seniority: ${ctx.seniority}) at ${ctx.companyName}.

${KIND_INSTRUCTIONS[kind]}

Rules:
- Generate 1 question per requirement listed below, referencing that requirement's exact id
  in requirement_ids. You may combine two closely related requirements into a single question
  if that is more natural — reference both ids in that case.
- difficulty is 1 (junior/basic), 2 (mid-level), or 3 (senior/advanced) — judge from the
  requirement's priority and this role's seniority.
- Only generate questions for the requirements listed. Do not invent additional requirements.
- answer_outline must be a single plain string (not a list/array) — if it has multiple points,
  separate them with "; " or newline characters within that one string.

Requirements to cover:
${reqList}

Company hiring-process context (adjust question style/format to match if this mentions
specific interview stages, e.g. take-home, system design round, pairing):
${hiringBlock}

Company context: ${ctx.companyBriefSummary || "(no company brief available)"}

Respond with JSON: { "questions": [ { "requirement_ids": ["r1"], "prompt": "", "answer_outline": "", "difficulty": 2 } ] }`;

  const parsed = await generateJson(prompt, ResponseSchema, { temperature: 0.5, maxOutputTokens: 4096 });
  return parsed.questions.map((q) => ({ ...q, category }));
}
