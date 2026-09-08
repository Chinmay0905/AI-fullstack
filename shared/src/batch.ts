/** Batch entry point I/O shapes — mirrors Appendix B exactly. */
import { z } from "zod";
import { KitSchema } from "./kit";

export const BatchCaseSchema = z.object({
  id: z.string().min(1),
  jd: z.string(),
  company_url: z.string(),
  days: z.number().int().min(1),
});

export const BatchInputSchema = z.array(BatchCaseSchema);

export const BatchErrorCode = z.enum([
  "COMPANY_UNREACHABLE",
  "INVALID_COMPANY_URL",
  "LLM_FAILURE",
  "INVALID_KIT_STRUCTURE",
  "UNKNOWN_ERROR",
]);

export const BatchResultSchema = z.object({
  id: z.string(),
  status: z.enum(["ok", "failed"]),
  kit: KitSchema.nullable(),
  error: z
    .object({
      code: BatchErrorCode,
      message: z.string(),
    })
    .nullable(),
});

export const BatchOutputSchema = z.object({
  version: z.literal("1.0"),
  generated_at: z.string(),
  kits: z.array(BatchResultSchema),
});

export type BatchCase = z.infer<typeof BatchCaseSchema>;
export type BatchResult = z.infer<typeof BatchResultSchema>;
export type BatchOutput = z.infer<typeof BatchOutputSchema>;
