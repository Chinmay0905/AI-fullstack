/**
 * Business logic behind the Builder (Section 6) — the part of the brief
 * that calls out as "the hardest state problem in the assessment."
 *
 * State model: every question and flashcard carries an `origin` tag
 * ("generated" | "user_added" | "user_edited") and an optional `pinned`
 * flag. Regenerating a question category:
 *   - keeps any question in that category that is pinned, user_added, or
 *     user_edited, untouched
 *   - only replaces "generated" (never touched by the user) questions
 *   - only re-runs generation for the requirements NOT already covered by
 *     a kept question — so a requirement a user has already hand-answered
 *     for isn't redundantly regenerated
 * This is what makes "a question the user wrote or edited by hand must
 * survive a regeneration of its category" hold, while everything outside
 * that category (company brief, other categories, flashcards) is never
 * touched by this call at all.
 */
import crypto from "node:crypto";
import { KitModel, type KitMeta, type PracticeRecord } from "../models/Kit";
import type { Kit, Question, Flashcard, QuestionCategory } from "@aipk/shared";
import { KitSchema, validateKitReferences } from "@aipk/shared";
import { generateKitWithMeta, type ProgressStep } from "../pipeline/generateKit";
import { classifyPipelineError } from "../pipeline/errors";
import { generateCompanyBrief } from "../generation/companyBrief";
import { generateQuestionsForKind } from "../generation/questionGenerator";
import { findUncoveredRequirementIds } from "../coverage/coverageChecker";
import { buildSchedule } from "../scheduling/scheduler";
import { InvalidKitStructureError } from "../pipeline/errors";

export function computeInputHash(jd: string, companyUrl: string, days: number): string {
  return crypto.createHash("sha256").update(`${jd}|${companyUrl}|${days}`).digest("hex");
}

const DEDUPE_WINDOW_MS = 10 * 60 * 1000;

/** Section 10: "the same description and company are submitted twice."
 * Guards against an accidental double-submit (double click, a retried
 * request) re-triggering a second full generation for identical input
 * while one is already in flight — not a hard uniqueness constraint,
 * since a user may legitimately want a second, independent attempt later. */
async function findInFlightDuplicate(userId: string, inputHash: string) {
  return KitModel.findOne({
    userId,
    inputHash,
    status: "generating",
    createdAt: { $gte: new Date(Date.now() - DEDUPE_WINDOW_MS) },
  });
}

export interface CreateKitItem {
  jd: string;
  companyUrl: string;
  days: number;
}

/** Kicks off generation for each item without blocking the response —
 * Section 13: generation is slow (seconds to tens of seconds); the caller
 * gets kit ids back immediately and polls GET /api/kits/:id for status,
 * which is what makes "visible progress" possible in the UI. */
export async function createKits(userId: string, items: CreateKitItem[]) {
  const results: { id: string; status: string }[] = [];

  for (const item of items) {
    const inputHash = computeInputHash(item.jd, item.companyUrl, item.days);
    const existing = await findInFlightDuplicate(userId, inputHash);
    if (existing) {
      results.push({ id: existing._id.toString(), status: existing.status });
      continue;
    }

    const doc = await KitModel.create({
      userId,
      status: "generating",
      input: { jd: item.jd, companyUrl: item.companyUrl, days: item.days },
      inputHash,
      kit: null,
      meta: null,
      error: null,
      practice: {},
    });
    results.push({ id: doc._id.toString(), status: doc.status });

    runGenerationInBackground(doc._id.toString(), item);
  }

  return results;
}

function runGenerationInBackground(kitId: string, item: CreateKitItem): void {
  const onProgress = (step: ProgressStep) => {
    KitModel.updateOne({ _id: kitId }, { $set: { progressStep: step } }).catch(() => undefined);
  };

  generateKitWithMeta({ jd: item.jd, companyUrl: item.companyUrl, days: item.days }, onProgress)
    .then(async ({ kit, meta }) => {
      await KitModel.updateOne(
        { _id: kitId },
        { $set: { status: "ready", kit, meta, error: null }, $unset: { progressStep: 1 } },
      );
    })
    .catch(async (err) => {
      const classified = classifyPipelineError(err);
      await KitModel.updateOne(
        { _id: kitId },
        { $set: { status: "failed", error: classified }, $unset: { progressStep: 1 } },
      );
    });
}

function nextItemId(existingIds: string[], prefix: string): string {
  let max = 0;
  for (const id of existingIds) {
    const match = id.match(new RegExp(`^${prefix}(\\d+)$`));
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `${prefix}${max + 1}`;
}

function saveAndValidate(doc: { kit: Kit | null }): void {
  if (!doc.kit) throw new InvalidKitStructureError("no kit content to validate");
  const parsed = KitSchema.safeParse(doc.kit);
  if (!parsed.success) {
    throw new InvalidKitStructureError(parsed.error.issues.map((i) => i.message).join("; "));
  }
  const refErrors = validateKitReferences(parsed.data);
  if (refErrors.length > 0) throw new InvalidKitStructureError(refErrors.join("; "));
}

const CATEGORY_TO_KIND: Record<string, "technical" | "behavioural" | "domain"> = {
  technical: "technical",
  behavioural: "behavioural",
  "company-fit": "domain",
};

/** Section 6: regenerate one question category, preserving anything the
 * user pinned, hand-added, or hand-edited in that category, and only
 * re-generating for the requirements not already covered by one of those
 * kept questions. */
export async function regenerateQuestionCategory(kitId: string, userId: string, category: string) {
  const kind = CATEGORY_TO_KIND[category];
  if (!kind) {
    throw new InvalidKitStructureError(
      `"${category}" is not a regeneratable category in this app (technical, behavioural, company-fit are supported)`,
    );
  }

  const doc = await KitModel.findOne({ _id: kitId, userId });
  if (!doc || !doc.kit || !doc.meta) throw new NotFoundError("kit not found or not ready");

  const kit = doc.kit as Kit;
  const meta = doc.meta as KitMeta;

  const requirementsOfKind = kit.role.requirements.filter((r) => r.kind === kind);
  const categoryQuestions = kit.questions.filter((q) => q.category === category);
  const protectedQuestions = categoryQuestions.filter(
    (q) => q.pinned || q.origin === "user_added" || q.origin === "user_edited",
  );
  const regenerableIds = new Set(
    categoryQuestions.filter((q) => !protectedQuestions.includes(q)).map((q) => q.id),
  );

  const coveredByProtected = new Set(protectedQuestions.flatMap((q) => q.requirement_ids));
  const requirementsToRegenerate = requirementsOfKind.filter((r) => !coveredByProtected.has(r.id));

  let questions = kit.questions.filter((q) => !regenerableIds.has(q.id));

  if (requirementsToRegenerate.length > 0) {
    const generated = await generateQuestionsForKind(kind, requirementsToRegenerate, meta.genCtx);
    let idCounter = nextItemId(kit.questions.map((q) => q.id), "q");
    let idNum = Number(idCounter.slice(1));
    const newQuestions: Question[] = generated.map((g) => ({
      id: `q${idNum++}`,
      requirement_ids: g.requirement_ids,
      category: g.category,
      prompt: g.prompt,
      answer_outline: g.answer_outline,
      difficulty: g.difficulty,
      origin: "generated",
    }));
    questions = [...questions, ...newQuestions];
  }

  kit.questions = questions;
  kit.coverage = {
    uncovered_requirement_ids: findUncoveredRequirementIds({ requirements: kit.role.requirements, questions }),
    passes: kit.coverage.passes + 1,
  };
  kit.schedule = buildSchedule(questions, kit.role.requirements, kit.schedule.days_available);

  doc.kit = kit;
  saveAndValidate(doc);
  doc.markModified("kit");
  await doc.save();
  return doc;
}

export async function regenerateCompanyBrief(kitId: string, userId: string) {
  const doc = await KitModel.findOne({ _id: kitId, userId });
  if (!doc || !doc.kit || !doc.meta) throw new NotFoundError("kit not found or not ready");

  const meta = doc.meta as KitMeta;
  const kit = doc.kit as Kit;
  kit.company_brief = await generateCompanyBrief(kit.source.company_url, meta.sourcePages);

  doc.kit = kit;
  saveAndValidate(doc);
  doc.markModified("kit");
  await doc.save();
  return doc;
}

export async function regenerateSchedule(kitId: string, userId: string, days?: number) {
  const doc = await KitModel.findOne({ _id: kitId, userId });
  if (!doc || !doc.kit) throw new NotFoundError("kit not found or not ready");

  const kit = doc.kit as Kit;
  const daysAvailable = days ?? kit.schedule.days_available;
  kit.schedule = buildSchedule(kit.questions, kit.role.requirements, daysAvailable);

  doc.kit = kit;
  saveAndValidate(doc);
  doc.markModified("kit");
  await doc.save();
  return doc;
}

/** Direct inline edit (Section 6: "Edit any question, answer outline,
 * flashcard or brief inline") — distinct from regenerateCompanyBrief,
 * which replaces the whole section from the model instead. */
export async function editCompanyBrief(
  kitId: string,
  userId: string,
  patch: Partial<Pick<Kit["company_brief"], "summary" | "what_they_do">>,
) {
  const doc = await KitModel.findOne({ _id: kitId, userId });
  if (!doc || !doc.kit) throw new NotFoundError("kit not found or not ready");
  const kit = doc.kit as Kit;
  Object.assign(kit.company_brief, patch);

  doc.kit = kit;
  saveAndValidate(doc);
  doc.markModified("kit");
  await doc.save();
  return doc;
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

/** Any structural change to the question set (edit/add/delete/reorder)
 * rebuilds the schedule deterministically from current state — see
 * README for the trade-off this implies (a manually-arranged day layout
 * is not preserved across a question-set change). */
function afterQuestionSetChange(kit: Kit): void {
  kit.coverage.uncovered_requirement_ids = findUncoveredRequirementIds({
    requirements: kit.role.requirements,
    questions: kit.questions,
  });
  kit.schedule = buildSchedule(kit.questions, kit.role.requirements, kit.schedule.days_available);
}

export async function editQuestion(
  kitId: string,
  userId: string,
  questionId: string,
  patch: Partial<Pick<Question, "prompt" | "answer_outline" | "difficulty" | "category">>,
) {
  const doc = await KitModel.findOne({ _id: kitId, userId });
  if (!doc || !doc.kit) throw new NotFoundError("kit not found or not ready");
  const kit = doc.kit as Kit;

  const q = kit.questions.find((x) => x.id === questionId);
  if (!q) throw new NotFoundError("question not found");
  Object.assign(q, patch, { origin: "user_edited" });

  doc.kit = kit;
  saveAndValidate(doc);
  doc.markModified("kit");
  await doc.save();
  return doc;
}

export async function setQuestionPinned(kitId: string, userId: string, questionId: string, pinned: boolean) {
  const doc = await KitModel.findOne({ _id: kitId, userId });
  if (!doc || !doc.kit) throw new NotFoundError("kit not found or not ready");
  const kit = doc.kit as Kit;
  const q = kit.questions.find((x) => x.id === questionId);
  if (!q) throw new NotFoundError("question not found");
  q.pinned = pinned;
  doc.kit = kit;
  doc.markModified("kit");
  await doc.save();
  return doc;
}

export async function addQuestion(
  kitId: string,
  userId: string,
  input: Pick<Question, "requirement_ids" | "category" | "prompt" | "answer_outline" | "difficulty">,
) {
  const doc = await KitModel.findOne({ _id: kitId, userId });
  if (!doc || !doc.kit) throw new NotFoundError("kit not found or not ready");
  const kit = doc.kit as Kit;

  const id = nextItemId(kit.questions.map((q) => q.id), "q");
  kit.questions.push({ ...input, id, origin: "user_added" });
  afterQuestionSetChange(kit);

  doc.kit = kit;
  saveAndValidate(doc);
  doc.markModified("kit");
  await doc.save();
  return doc;
}

export async function deleteQuestion(kitId: string, userId: string, questionId: string) {
  const doc = await KitModel.findOne({ _id: kitId, userId });
  if (!doc || !doc.kit) throw new NotFoundError("kit not found or not ready");
  const kit = doc.kit as Kit;

  kit.questions = kit.questions.filter((q) => q.id !== questionId);
  afterQuestionSetChange(kit);

  doc.kit = kit;
  saveAndValidate(doc);
  doc.markModified("kit");
  await doc.save();
  return doc;
}

/** Section 6: "reorder questions, and move a question from one category
 * to another." The client sends the full desired order + category
 * assignment for every question id; only order/category change here,
 * every other field (including origin/pinned) is left untouched. */
export async function reorderQuestions(
  kitId: string,
  userId: string,
  order: { id: string; category: QuestionCategory }[],
) {
  const doc = await KitModel.findOne({ _id: kitId, userId });
  if (!doc || !doc.kit) throw new NotFoundError("kit not found or not ready");
  const kit = doc.kit as Kit;

  const byId = new Map(kit.questions.map((q) => [q.id, q]));
  const reordered: Question[] = [];
  for (const { id, category } of order) {
    const q = byId.get(id);
    if (!q) throw new NotFoundError(`question ${id} not found`);
    q.category = category;
    reordered.push(q);
    byId.delete(id);
  }
  // Anything not mentioned in `order` stays, appended at the end, rather
  // than silently deleted by an incomplete reorder payload.
  kit.questions = [...reordered, ...byId.values()];
  afterQuestionSetChange(kit);

  doc.kit = kit;
  saveAndValidate(doc);
  doc.markModified("kit");
  await doc.save();
  return doc;
}

export async function editFlashcard(
  kitId: string,
  userId: string,
  flashcardId: string,
  patch: Partial<Pick<Flashcard, "front" | "back">>,
) {
  const doc = await KitModel.findOne({ _id: kitId, userId });
  if (!doc || !doc.kit) throw new NotFoundError("kit not found or not ready");
  const kit = doc.kit as Kit;

  const f = kit.flashcards.find((x) => x.id === flashcardId);
  if (!f) throw new NotFoundError("flashcard not found");
  Object.assign(f, patch, { origin: "user_edited" });

  doc.kit = kit;
  saveAndValidate(doc);
  doc.markModified("kit");
  await doc.save();
  return doc;
}

export async function addFlashcard(
  kitId: string,
  userId: string,
  input: Pick<Flashcard, "front" | "back" | "requirement_ids">,
) {
  const doc = await KitModel.findOne({ _id: kitId, userId });
  if (!doc || !doc.kit) throw new NotFoundError("kit not found or not ready");
  const kit = doc.kit as Kit;

  const id = nextItemId(kit.flashcards.map((f) => f.id), "f");
  kit.flashcards.push({ ...input, id, origin: "user_added" });

  doc.kit = kit;
  saveAndValidate(doc);
  doc.markModified("kit");
  await doc.save();
  return doc;
}

export async function deleteFlashcard(kitId: string, userId: string, flashcardId: string) {
  const doc = await KitModel.findOne({ _id: kitId, userId });
  if (!doc || !doc.kit) throw new NotFoundError("kit not found or not ready");
  const kit = doc.kit as Kit;

  kit.flashcards = kit.flashcards.filter((f) => f.id !== flashcardId);
  // Practice records for a deleted card are orphaned but harmless; left
  // in place rather than pruned, since Mixed-map cleanup buys nothing here.

  doc.kit = kit;
  saveAndValidate(doc);
  doc.markModified("kit");
  await doc.save();
  return doc;
}

/**
 * Section 7 — Practice Mode. Confidence is 1 (not confident) to 5 (very
 * confident); a card with no record yet is treated as confidence 0 so it
 * always sorts ahead of anything already reviewed ("order the next
 * session by what they were least confident about" — an unreviewed card
 * is definitionally the least confident case there is). Chosen over a
 * full spaced-repetition interval scheduler because with a single
 * confidence rating per review (no separate recall-latency signal) a
 * proper SM-2-style interval doesn't have enough input to be more than
 * cosmetic — a plain confidence-ascending sort is honest about what the
 * data actually supports, and is trivial to explain and defend.
 */
export interface PracticeSessionCard {
  id: string;
  front: string;
  back: string;
  requirement_ids: string[];
  confidence: number | null;
  timesReviewed: number;
}

export async function getPracticeSession(kitId: string, userId: string) {
  const doc = await KitModel.findOne({ _id: kitId, userId });
  if (!doc || !doc.kit) throw new NotFoundError("kit not found or not ready");
  const kit = doc.kit as Kit;
  const practice = (doc.practice ?? {}) as Record<string, PracticeRecord>;

  const cards: PracticeSessionCard[] = kit.flashcards.map((f) => {
    const record = practice[f.id];
    return {
      id: f.id,
      front: f.front,
      back: f.back,
      requirement_ids: f.requirement_ids,
      confidence: record?.confidence ?? null,
      timesReviewed: record?.timesReviewed ?? 0,
    };
  });

  cards.sort((a, b) => (a.confidence ?? 0) - (b.confidence ?? 0));

  const reviewedCount = cards.filter((c) => c.timesReviewed > 0).length;
  return { cards, coverage: { reviewed: reviewedCount, total: cards.length } };
}

export async function recordPracticeConfidence(
  kitId: string,
  userId: string,
  flashcardId: string,
  confidence: number,
) {
  const doc = await KitModel.findOne({ _id: kitId, userId });
  if (!doc || !doc.kit) throw new NotFoundError("kit not found or not ready");
  const kit = doc.kit as Kit;
  if (!kit.flashcards.some((f) => f.id === flashcardId)) throw new NotFoundError("flashcard not found");

  const practice = (doc.practice ?? {}) as Record<string, PracticeRecord>;
  const prior = practice[flashcardId];
  practice[flashcardId] = {
    confidence,
    timesReviewed: (prior?.timesReviewed ?? 0) + 1,
    lastReviewedAt: new Date().toISOString(),
  };

  doc.practice = practice;
  doc.markModified("practice");
  await doc.save();
  return doc;
}
