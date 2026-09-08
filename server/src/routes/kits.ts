import { Router } from "express";
import { z } from "zod";
import { KitModel } from "../models/Kit";
import { requireAuth } from "../auth/middleware";
import * as kitService from "../services/kitService";
import { NotFoundError } from "../services/kitService";
import { InvalidKitStructureError } from "../pipeline/errors";

const router = Router();
router.use(requireAuth);

function userId(req: { session: { userId?: string } }): string {
  return req.session.userId as string;
}

/** Strips `meta` (crawled pages, generation context) before anything goes
 * to the client — it's regeneration plumbing, never part of the public
 * kit shape. */
function toPublicKit(doc: {
  _id: unknown;
  status: string;
  progressStep?: string;
  input: unknown;
  error: unknown;
  kit: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
}) {
  return {
    id: doc._id,
    status: doc.status,
    progressStep: doc.progressStep ?? null,
    input: doc.input,
    error: doc.error,
    kit: doc.kit,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function handleServiceError(err: unknown, res: import("express").Response): void {
  if (err instanceof NotFoundError) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: err.message } });
    return;
  }
  if (err instanceof InvalidKitStructureError) {
    res.status(422).json({ error: { code: "INVALID_KIT_STRUCTURE", message: err.message } });
    return;
  }
  console.error(err);
  res.status(500).json({ error: { code: "UNKNOWN_ERROR", message: "Something went wrong." } });
}

// ---- Create / list / read / delete --------------------------------------

const CreateItemSchema = z.object({
  jd: z.string().min(1),
  companyUrl: z.string().url(),
  // Section 10: "the user asks for a 1-day schedule, or a 60-day one" —
  // both must work; 365 is a sanity ceiling, not a brief-mandated one.
  days: z.number().int().min(1).max(365),
});
const CreateKitsSchema = z.object({ items: z.array(CreateItemSchema).min(1).max(50) });

router.post("/", async (req, res) => {
  const parsed = CreateKitsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "INVALID_INPUT", message: parsed.error.issues[0]?.message } });
    return;
  }
  const results = await kitService.createKits(userId(req), parsed.data.items);
  res.status(202).json({ kits: results });
});

router.get("/", async (req, res) => {
  const docs = await KitModel.find({ userId: userId(req) }).sort({ createdAt: -1 }).lean();
  res.json({ kits: docs.map(toPublicKit) });
});

router.get("/:id", async (req, res) => {
  const doc = await KitModel.findOne({ _id: req.params.id, userId: userId(req) }).lean();
  if (!doc) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Kit not found." } });
    return;
  }
  res.json(toPublicKit(doc));
});

router.delete("/:id", async (req, res) => {
  const result = await KitModel.deleteOne({ _id: req.params.id, userId: userId(req) });
  if (result.deletedCount === 0) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Kit not found." } });
    return;
  }
  res.status(204).end();
});

// ---- Company brief --------------------------------------------------------

const CompanyBriefPatchSchema = z.object({ summary: z.string().optional(), what_they_do: z.string().optional() });

router.patch("/:id/company-brief", async (req, res) => {
  const parsed = CompanyBriefPatchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "INVALID_INPUT", message: parsed.error.issues[0]?.message } });
    return;
  }
  try {
    const doc = await kitService.editCompanyBrief(req.params.id, userId(req), parsed.data);
    res.json(toPublicKit(doc));
  } catch (err) {
    handleServiceError(err, res);
  }
});

router.post("/:id/regenerate/company-brief", async (req, res) => {
  try {
    const doc = await kitService.regenerateCompanyBrief(req.params.id, userId(req));
    res.json(toPublicKit(doc));
  } catch (err) {
    handleServiceError(err, res);
  }
});

// ---- Questions --------------------------------------------------------

const QuestionPatchSchema = z.object({
  prompt: z.string().optional(),
  answer_outline: z.string().optional(),
  difficulty: z.number().int().min(1).max(3).optional(),
  category: z.enum(["technical", "behavioural", "system-design", "company-fit"]).optional(),
});

router.patch("/:id/questions/:qid", async (req, res) => {
  const parsed = QuestionPatchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "INVALID_INPUT", message: parsed.error.issues[0]?.message } });
    return;
  }
  try {
    const doc = await kitService.editQuestion(req.params.id, userId(req), req.params.qid, parsed.data);
    res.json(toPublicKit(doc));
  } catch (err) {
    handleServiceError(err, res);
  }
});

const PinSchema = z.object({ pinned: z.boolean() });

router.post("/:id/questions/:qid/pin", async (req, res) => {
  const parsed = PinSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "INVALID_INPUT", message: parsed.error.issues[0]?.message } });
    return;
  }
  try {
    const doc = await kitService.setQuestionPinned(req.params.id, userId(req), req.params.qid, parsed.data.pinned);
    res.json(toPublicKit(doc));
  } catch (err) {
    handleServiceError(err, res);
  }
});

const NewQuestionSchema = z.object({
  requirement_ids: z.array(z.string()).default([]),
  category: z.enum(["technical", "behavioural", "system-design", "company-fit"]),
  prompt: z.string().min(1),
  answer_outline: z.string().min(1),
  difficulty: z.number().int().min(1).max(3),
});

router.post("/:id/questions", async (req, res) => {
  const parsed = NewQuestionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "INVALID_INPUT", message: parsed.error.issues[0]?.message } });
    return;
  }
  try {
    const doc = await kitService.addQuestion(req.params.id, userId(req), parsed.data);
    res.status(201).json(toPublicKit(doc));
  } catch (err) {
    handleServiceError(err, res);
  }
});

router.delete("/:id/questions/:qid", async (req, res) => {
  try {
    const doc = await kitService.deleteQuestion(req.params.id, userId(req), req.params.qid);
    res.json(toPublicKit(doc));
  } catch (err) {
    handleServiceError(err, res);
  }
});

const ReorderSchema = z.object({
  order: z.array(
    z.object({
      id: z.string(),
      category: z.enum(["technical", "behavioural", "system-design", "company-fit"]),
    }),
  ),
});

router.post("/:id/questions/reorder", async (req, res) => {
  const parsed = ReorderSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "INVALID_INPUT", message: parsed.error.issues[0]?.message } });
    return;
  }
  try {
    const doc = await kitService.reorderQuestions(req.params.id, userId(req), parsed.data.order);
    res.json(toPublicKit(doc));
  } catch (err) {
    handleServiceError(err, res);
  }
});

router.post("/:id/regenerate/questions/:category", async (req, res) => {
  try {
    const doc = await kitService.regenerateQuestionCategory(req.params.id, userId(req), req.params.category);
    res.json(toPublicKit(doc));
  } catch (err) {
    handleServiceError(err, res);
  }
});

// ---- Schedule --------------------------------------------------------

const RegenerateScheduleSchema = z.object({ days: z.number().int().min(1).max(365).optional() });

router.post("/:id/regenerate/schedule", async (req, res) => {
  const parsed = RegenerateScheduleSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: { code: "INVALID_INPUT", message: parsed.error.issues[0]?.message } });
    return;
  }
  try {
    const doc = await kitService.regenerateSchedule(req.params.id, userId(req), parsed.data.days);
    res.json(toPublicKit(doc));
  } catch (err) {
    handleServiceError(err, res);
  }
});

// ---- Flashcards --------------------------------------------------------

const FlashcardPatchSchema = z.object({ front: z.string().optional(), back: z.string().optional() });

router.patch("/:id/flashcards/:fid", async (req, res) => {
  const parsed = FlashcardPatchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "INVALID_INPUT", message: parsed.error.issues[0]?.message } });
    return;
  }
  try {
    const doc = await kitService.editFlashcard(req.params.id, userId(req), req.params.fid, parsed.data);
    res.json(toPublicKit(doc));
  } catch (err) {
    handleServiceError(err, res);
  }
});

const NewFlashcardSchema = z.object({
  front: z.string().min(1),
  back: z.string().min(1),
  requirement_ids: z.array(z.string()).default([]),
});

router.post("/:id/flashcards", async (req, res) => {
  const parsed = NewFlashcardSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "INVALID_INPUT", message: parsed.error.issues[0]?.message } });
    return;
  }
  try {
    const doc = await kitService.addFlashcard(req.params.id, userId(req), parsed.data);
    res.status(201).json(toPublicKit(doc));
  } catch (err) {
    handleServiceError(err, res);
  }
});

router.delete("/:id/flashcards/:fid", async (req, res) => {
  try {
    const doc = await kitService.deleteFlashcard(req.params.id, userId(req), req.params.fid);
    res.json(toPublicKit(doc));
  } catch (err) {
    handleServiceError(err, res);
  }
});

// ---- Practice mode --------------------------------------------------------

router.get("/:id/practice", async (req, res) => {
  try {
    const session = await kitService.getPracticeSession(req.params.id, userId(req));
    res.json(session);
  } catch (err) {
    handleServiceError(err, res);
  }
});

const PracticeConfidenceSchema = z.object({ confidence: z.number().int().min(1).max(5) });

router.post("/:id/practice/:fid", async (req, res) => {
  const parsed = PracticeConfidenceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "INVALID_INPUT", message: parsed.error.issues[0]?.message } });
    return;
  }
  try {
    await kitService.recordPracticeConfidence(req.params.id, userId(req), req.params.fid, parsed.data.confidence);
    const session = await kitService.getPracticeSession(req.params.id, userId(req));
    res.json(session);
  } catch (err) {
    handleServiceError(err, res);
  }
});

export default router;
