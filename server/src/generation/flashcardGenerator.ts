/**
 * Flashcards are derived from the finalized question set (after coverage
 * has already closed any gaps), not generated independently — so they
 * always match what's actually being tested rather than drifting from it.
 */
import { z } from "zod";
import { generateJson } from "../llm/geminiClient";
import type { Requirement } from "@aipk/shared";
import type { GeneratedQuestion } from "./questionGenerator";

const GeneratedFlashcardSchema = z.object({
  requirement_ids: z.array(z.string()).min(1),
  front: z.string().min(1),
  back: z.string().min(1),
});
const ResponseSchema = z.object({ flashcards: z.array(GeneratedFlashcardSchema) });

export type GeneratedFlashcard = z.infer<typeof GeneratedFlashcardSchema>;

/** One flashcard per must-have requirement (the material worth drilling on
 * recall), generated in a single batched call. */
export async function generateFlashcards(
  requirements: Requirement[],
  questions: { requirement_ids: string[]; prompt: string }[],
): Promise<GeneratedFlashcard[]> {
  const mustHaves = requirements.filter((r) => r.priority === "must");
  if (mustHaves.length === 0) return [];

  const reqList = mustHaves
    .map((r) => {
      const relatedQ = questions.find((q) => q.requirement_ids.includes(r.id));
      return `- id="${r.id}" (${r.kind}): ${r.text}${relatedQ ? `\n  related question: ${relatedQ.prompt}` : ""}`;
    })
    .join("\n");

  const prompt = `Create one flashcard per requirement below, for quick recall practice before an
interview. front = a short prompt/question. back = a concise answer (a few sentences, not an
essay). Base cards only on the requirement text given — do not invent facts about the
candidate or company.

Requirements:
${reqList}

Respond with JSON: { "flashcards": [ { "requirement_ids": ["r1"], "front": "", "back": "" } ] }`;

  const raw = await generateJson<unknown>(prompt, { temperature: 0.4, maxOutputTokens: 2048 });
  const parsed = ResponseSchema.parse(raw);
  return parsed.flashcards;
}
