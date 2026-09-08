/**
 * The sequence Section 3 asks for, in one place:
 *   1. crawl the company site (retrieval)                     — throws hard on total unreachability
 *   2. extract requirements from the JD (extraction)           — runs in parallel with (1), no retrieval needed
 *   3. look for public hiring-process discussion (retrieval)
 *   4. generate a company brief from whatever pages we got      (generation)
 *   5. generate questions, once per requirement KIND, each with
 *      its own instructions and folding in whatever hiring-
 *      process signal step 3 found                              (generation)
 *   6. check coverage deterministically, no LLM                 (Section 3: "not the model's")
 *   7. if there are gaps, generate again for just those          (Section 4: the second pass)
 *   8. derive flashcards from the finalized question set         (generation)
 *   9. allocate the schedule deterministically, no LLM           (Section 8)
 *  10. validate the whole thing against Appendix A before returning it
 *
 * This exact function is what both the interactive API route and the
 * batch entry point (Section 9) call — there is no parallel implementation.
 */
import {
  Kit,
  KitSchema,
  Requirement,
  Question,
  Flashcard,
  validateKitReferences,
} from "@aipk/shared";
import { crawlCompanySite, CompanyUnreachableError, CrawledPage } from "../retrieval/crawler";
import { searchInterviewDiscussion } from "../retrieval/discussionSearch";
import { extractRequirements } from "../extraction/requirementExtractor";
import { generateCompanyBrief } from "../generation/companyBrief";
import { generateQuestionsForKind, GenerationContext } from "../generation/questionGenerator";
import { generateFlashcards } from "../generation/flashcardGenerator";
import { findUncoveredRequirementIds } from "../coverage/coverageChecker";
import { buildSchedule } from "../scheduling/scheduler";
import { validateExternalUrl } from "../security/urlGuard";
import { InvalidKitStructureError } from "./errors";

export interface GenerateKitInput {
  jd: string;
  companyUrl: string;
  days: number;
}

export type ProgressStep =
  | "crawling_company_site"
  | "extracting_requirements"
  | "writing_company_brief"
  | "searching_discussion"
  | "generating_questions"
  | "checking_coverage"
  | "filling_coverage_gaps"
  | "generating_flashcards"
  | "building_schedule"
  | "validating_kit";

export interface GenerateKitResult {
  kit: Kit;
  /** Regeneration context (crawled pages, hiring notes, generation
   * settings) — not part of Appendix A, persisted separately so a later
   * "regenerate this section" call doesn't need to re-crawl the live site. */
  meta: {
    sourcePages: CrawledPage[];
    hiringProcessNotes: string;
    genCtx: GenerationContext;
  };
}

/** First pass + one gap-filling pass. Chosen over more passes because the
 * question-generation prompt already instructs the model to reference
 * exact requirement ids and is reliable at doing so in practice — a
 * second call at the same task, scoped to just what's missing, closes
 * nearly every real gap. Further passes mostly just burn free-tier TPM
 * budget without meaningfully improving coverage, and Section 4 only
 * requires that the kit not *ship* with a gap it could have closed, not
 * that every pass be exhausted. Any requirement still uncovered after
 * pass 2 is recorded honestly in coverage.uncovered_requirement_ids rather
 * than papered over. */
const MAX_COVERAGE_PASSES = 2;

function deriveCompanyName(homepageTitle: string | undefined, companyUrl: string): string {
  if (homepageTitle && homepageTitle.trim()) {
    // Titles are often "Company – Tagline" or "Company | Careers" — take the first segment.
    return homepageTitle.split(/[|–—-]/)[0].trim();
  }
  try {
    const host = new URL(companyUrl).hostname.replace(/^www\./, "");
    return host.split(".")[0];
  } catch {
    return companyUrl;
  }
}

function groupByKind(requirements: Requirement[]): Record<Requirement["kind"], Requirement[]> {
  const groups: Record<Requirement["kind"], Requirement[]> = { technical: [], behavioural: [], domain: [] };
  for (const r of requirements) groups[r.kind].push(r);
  return groups;
}

export async function generateKitWithMeta(
  input: GenerateKitInput,
  onProgress?: (step: ProgressStep) => void,
): Promise<GenerateKitResult> {
  const emit = (step: ProgressStep) => onProgress?.(step);

  // Fail fast on a structurally invalid URL before spending an LLM call on extraction.
  validateExternalUrl(input.companyUrl);

  emit("crawling_company_site");
  emit("extracting_requirements");
  const [crawl, extraction] = await Promise.all([
    crawlCompanySite(input.companyUrl),
    extractRequirements(input.jd),
  ]);

  const requirements: Requirement[] = extraction.requirements.map((r, i) => ({
    id: `r${i + 1}`,
    text: r.text,
    kind: r.kind,
    priority: r.priority,
  }));

  const companyName = deriveCompanyName(crawl.pages[0]?.title, input.companyUrl);
  emit("writing_company_brief");
  const companyBrief = await generateCompanyBrief(input.companyUrl, crawl.pages);

  const hiringPagesText = crawl.pages
    .filter((p: CrawledPage) => p.kind === "hiring")
    .map((p) => p.text)
    .join("\n\n");
  emit("searching_discussion");
  const discussion = await searchInterviewDiscussion(companyName);
  const discussionText = discussion.results.map((r) => `${r.title}: ${r.snippet}`).join("\n");
  const hiringProcessNotes = [hiringPagesText, discussionText].filter(Boolean).join("\n\n");

  const genCtx: GenerationContext = {
    companyName,
    roleTitle: extraction.roleTitle || "the role",
    seniority: extraction.seniority || "unspecified",
    companyBriefSummary: companyBrief.summary,
    hiringProcessNotes,
  };

  let questionCounter = 1;
  const questions: Question[] = [];

  async function generateForRequirements(reqs: Requirement[]): Promise<void> {
    const byKind = groupByKind(reqs);
    for (const kind of ["technical", "behavioural", "domain"] as const) {
      const kindReqs = byKind[kind];
      if (kindReqs.length === 0) continue;
      const generated = await generateQuestionsForKind(kind, kindReqs, genCtx);
      for (const g of generated) {
        questions.push({
          id: `q${questionCounter++}`,
          requirement_ids: g.requirement_ids,
          category: g.category,
          prompt: g.prompt,
          answer_outline: g.answer_outline,
          difficulty: g.difficulty,
          origin: "generated",
        });
      }
    }
  }

  emit("generating_questions");
  await generateForRequirements(requirements);

  emit("checking_coverage");
  let passes = 1;
  let uncovered = findUncoveredRequirementIds({ requirements, questions });
  if (uncovered.length > 0) emit("filling_coverage_gaps");
  while (uncovered.length > 0 && passes < MAX_COVERAGE_PASSES) {
    const gapRequirements = requirements.filter((r) => uncovered.includes(r.id));
    await generateForRequirements(gapRequirements);
    passes += 1;
    uncovered = findUncoveredRequirementIds({ requirements, questions });
  }

  emit("generating_flashcards");
  let flashcardCounter = 1;
  const flashcardsRaw = await generateFlashcards(requirements, questions);
  const flashcards: Flashcard[] = flashcardsRaw.map((f) => ({
    id: `f${flashcardCounter++}`,
    front: f.front,
    back: f.back,
    requirement_ids: f.requirement_ids,
    origin: "generated",
  }));

  emit("building_schedule");
  const schedule = buildSchedule(questions, requirements, input.days);

  const kit: Kit = {
    source: {
      company: companyName,
      company_url: input.companyUrl,
      role: extraction.roleTitle || "",
      location: "",
      jd_chars: input.jd.length,
      researched_at: new Date().toISOString(),
      pages_used: crawl.pages.map((p) => p.url),
    },
    company_brief: companyBrief,
    role: {
      title: extraction.roleTitle || "",
      seniority: extraction.seniority || "",
      responsibilities: extraction.responsibilities,
      requirements,
    },
    questions,
    flashcards,
    schedule,
    coverage: { uncovered_requirement_ids: uncovered, passes },
  };

  emit("validating_kit");
  const parsed = KitSchema.safeParse(kit);
  if (!parsed.success) {
    throw new InvalidKitStructureError(parsed.error.issues.map((i) => i.message).join("; "));
  }
  const refErrors = validateKitReferences(parsed.data);
  if (refErrors.length > 0) {
    throw new InvalidKitStructureError(refErrors.join("; "));
  }

  return {
    kit: parsed.data,
    meta: { sourcePages: crawl.pages, hiringProcessNotes, genCtx },
  };
}

/** Batch entry point (Section 9) only needs the Appendix A shape — no
 * regeneration meta, since a batch run never reopens a kit afterward. */
export async function generateKit(input: GenerateKitInput): Promise<Kit> {
  const { kit } = await generateKitWithMeta(input);
  return kit;
}

export { CompanyUnreachableError };
