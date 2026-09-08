/**
 * Section 9 — Batch Entry Point (Mandatory). Invoked as:
 *   npm run evaluate -- --input <cases.json> --output <kits.json>
 *
 * Reads BatchCase[] (Appendix B input shape), runs each through the exact
 * same generateKit() pipeline the interactive API uses, and writes a
 * single BatchOutput JSON file (Appendix B output shape). One case
 * failing does not abort the run — its failure is recorded and the run
 * continues, per Section 9's "continues after one case fails."
 *
 * No MongoDB/session setup required — see server/src/config/env.ts for
 * why this only needs GEMINI_API_KEY (and optionally the discussion-search
 * keys) to run from a clean clone.
 */
import { parseArgs } from "node:util";
import { readFile, writeFile } from "node:fs/promises";
import { BatchInputSchema, BatchOutput, BatchResult } from "@aipk/shared";
import { generateKit } from "../pipeline/generateKit";
import { classifyPipelineError } from "../pipeline/errors";

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      input: { type: "string" },
      output: { type: "string" },
    },
  });

  if (!values.input || !values.output) {
    console.error("Usage: npm run evaluate -- --input <cases.json> --output <kits.json>");
    process.exit(1);
  }

  const raw = await readFile(values.input, "utf-8");
  const cases = BatchInputSchema.parse(JSON.parse(raw));

  console.log(`[evaluate] running ${cases.length} case(s)...`);
  const results: BatchResult[] = [];

  for (const c of cases) {
    const startedAt = Date.now();
    try {
      const kit = await generateKit({ jd: c.jd, companyUrl: c.company_url, days: c.days });
      results.push({ id: c.id, status: "ok", kit, error: null });
      console.log(`[evaluate] ${c.id}: ok (${Date.now() - startedAt}ms)`);
    } catch (err) {
      const classified = classifyPipelineError(err);
      results.push({ id: c.id, status: "failed", kit: null, error: classified });
      console.error(`[evaluate] ${c.id}: failed — ${classified.code}: ${classified.message}`);
    }
  }

  const output: BatchOutput = {
    version: "1.0",
    generated_at: new Date().toISOString(),
    kits: results,
  };

  await writeFile(values.output, JSON.stringify(output, null, 2), "utf-8");
  const okCount = results.filter((r) => r.status === "ok").length;
  console.log(`[evaluate] done: ${okCount}/${results.length} ok. Written to ${values.output}`);
}

main().catch((err) => {
  console.error("[evaluate] fatal error:", err);
  process.exit(1);
});
