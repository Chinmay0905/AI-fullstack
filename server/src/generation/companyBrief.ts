/**
 * Section 3: turn crawled pages into a company brief. Section 10's edge
 * case — "a company you can find nothing about should produce an honest
 * brief rather than a fabricated one" — is the whole reason this takes an
 * explicit "did we actually find anything" branch instead of always
 * calling the model.
 */
import { z } from "zod";
import { generateJson, wrapUntrusted } from "../llm/geminiClient";
import type { CrawledPage } from "../retrieval/crawler";
import type { CompanyBrief } from "@aipk/shared";

const BriefResponseSchema = z.object({
  summary: z.string(),
  what_they_do: z.string(),
});

const MAX_PAGE_CHARS_FOR_PROMPT = 3000;

export async function generateCompanyBrief(
  companyUrl: string,
  pages: CrawledPage[],
): Promise<CompanyBrief> {
  const usablePages = pages.filter((p) => p.text.trim().length > 100);

  if (usablePages.length === 0) {
    return {
      summary: `We could not retrieve usable content from ${companyUrl}. No company brief could be generated from this source — treat this section as unresearched rather than guessed.`,
      what_they_do: "Unknown — the company site was unreachable or had no readable content.",
      sources: [],
    };
  }

  const pageBlocks = usablePages
    .map((p, i) => wrapUntrusted(`page_${i}:${p.url}`, `${p.title}\n${p.text.slice(0, MAX_PAGE_CHARS_FOR_PROMPT)}`))
    .join("\n\n");

  const prompt = `You are summarizing a company from pages crawled off its own website, for someone
preparing for a job interview there.

Rules:
- Base the summary ONLY on the page content given below. Do not invent facts, funding
  details, headcount, or founding dates that are not stated in the pages.
- If the pages give little usable information, say so plainly in the summary rather than
  padding it with generic filler.
- "summary": 2-4 sentences, what an interview candidate should know about this company.
- "what_they_do": 1-2 sentences on the actual product/service/business.

Pages:
${pageBlocks}

Respond with JSON: { "summary": "", "what_they_do": "" }`;

  const parsed = await generateJson(prompt, BriefResponseSchema, { temperature: 0.3, maxOutputTokens: 1024 });

  return {
    summary: parsed.summary,
    what_they_do: parsed.what_they_do,
    sources: usablePages.map((p) => p.url),
  };
}
