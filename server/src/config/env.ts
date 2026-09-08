/**
 * Split in two deliberately: the batch entry point (Section 9) must run
 * "with no setup beyond your documented install step" — it should not need
 * a MongoDB Atlas cluster provisioned just to produce kits.json. So the
 * pipeline-only vars here are validated eagerly and are all this module
 * needs; MONGODB_URI/SESSION_SECRET/PORT live in serverEnv.ts and are only
 * required when the full Express app (src/index.ts) boots.
 */
import { config as loadDotenv } from "dotenv";
import { z } from "zod";

loadDotenv();

const PipelineEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY is required"),
  GEMINI_MODEL: z.string().default("gemini-3.5-flash-lite"),
  ALLOW_PRIVATE_HOSTS: z
    .string()
    .default("false")
    .transform((v) => v === "true"),
  // Google Programmable Search Engine — used to look for public discussion
  // of a company's interview process (Section 2/3). Optional: if unset,
  // discussion search is skipped and reported, not treated as fatal (see
  // Section 10's "public discussion turns up nothing at all").
  GOOGLE_CSE_API_KEY: z.string().optional(),
  GOOGLE_CSE_CX: z.string().optional(),
});

function parseOrExit<T extends z.ZodTypeAny>(schema: T, label: string): z.infer<T> {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    console.error(`Invalid environment configuration (${label}):`);
    for (const issue of parsed.error.issues) {
      console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
  }
  return parsed.data;
}

const parsed = parseOrExit(PipelineEnvSchema, "pipeline");

export const env = {
  ...parsed,
  isProduction: parsed.NODE_ENV === "production",
};

export { parseOrExit };
