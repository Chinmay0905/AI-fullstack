import { Schema, model, Types } from "mongoose";
import type { Kit as KitShape } from "@aipk/shared";
import type { CrawledPage } from "../retrieval/crawler";
import type { GenerationContext } from "../generation/questionGenerator";

/** Everything needed to regenerate a single section later (company brief,
 * a question category) without re-crawling the live site — the site could
 * be slow, rate-limited, or have changed since kit creation. Never sent to
 * the client; stripped out of every API response. */
export interface KitMeta {
  sourcePages: CrawledPage[];
  hiringProcessNotes: string;
  genCtx: GenerationContext;
}

export interface PracticeRecord {
  confidence: number; // 1 (not confident) - 5 (very confident)
  timesReviewed: number;
  lastReviewedAt: string;
}

export type KitStatus = "generating" | "ready" | "failed";

export interface KitDocFields {
  userId: Types.ObjectId;
  status: KitStatus;
  /** Which pipeline step is currently running, while status is
   * "generating" — this is what lets the UI show real progress instead of
   * a generic spinner (Application Overview: "watch the kit being
   * generated, with visible progress"). Unset once status leaves
   * "generating". */
  progressStep?: string;
  input: { jd: string; companyUrl: string; days: number };
  inputHash: string;
  kit: KitShape | null;
  meta: KitMeta | null;
  error: { code: string; message: string } | null;
  practice: Record<string, PracticeRecord>;
}

const KitSchemaMongo = new Schema<KitDocFields>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    status: { type: String, enum: ["generating", "ready", "failed"], required: true, default: "generating" },
    progressStep: { type: String },
    input: {
      jd: { type: String, required: true },
      companyUrl: { type: String, required: true },
      days: { type: Number, required: true },
    },
    inputHash: { type: String, required: true, index: true },
    // Appendix A's structure is already validated with Zod before a
    // document is ever saved (see generateKit.ts) — storing it as Mixed
    // here avoids maintaining a second, parallel Mongoose schema for the
    // same nested shape.
    kit: { type: Schema.Types.Mixed, default: null },
    meta: { type: Schema.Types.Mixed, default: null },
    error: { type: Schema.Types.Mixed, default: null },
    practice: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

KitSchemaMongo.index({ userId: 1, createdAt: -1 });

export const KitModel = model<KitDocFields>("Kit", KitSchemaMongo);
