/**
 * Section 3, step 1: "Extract the relevant requirements from the job
 * description." No retrieval needed here — this is pasted text (Section 3:
 * "pasted text needs no retrieval at all"). The one rule that matters most
 * (scored 20/100 on its own, per the automated pass): never invent a
 * requirement the JD doesn't contain, and a thin JD should produce a thin
 * (short) requirement list, not a padded one.
 */
import { z } from "zod";
import { generateJson, wrapUntrusted } from "../llm/geminiClient";
import { RequirementKind, RequirementPriority } from "@aipk/shared";

const ExtractedRequirementSchema = z.object({
  text: z.string().min(1),
  kind: RequirementKind,
  priority: RequirementPriority,
});
const ExtractionResponseSchema = z.object({
  role_title: z.string(),
  seniority: z.string(),
  responsibilities: z.array(z.string()),
  requirements: z.array(ExtractedRequirementSchema),
});

export type ExtractedRequirement = z.infer<typeof ExtractedRequirementSchema>;

export interface ExtractionResult {
  roleTitle: string;
  seniority: string;
  responsibilities: string[];
  requirements: ExtractedRequirement[];
}

const PROMPT = `Read the job description below and extract structured data from it.

Rules:
- Only extract requirements the text actually states or clearly implies. Do NOT invent
  requirements the description does not contain. If the description is thin (very short,
  vague), it is correct and expected to return few or even zero requirements — do not pad
  the list to look more complete.
- priority "must": the description states this as required, essential, or a minimum
  qualification (e.g. "must have", "required", "X years of experience with Y").
- priority "nice": the description frames this as a bonus, preferred, or optional
  (e.g. "bonus points for", "nice to have", "preferred but not required"). A "required" line
  and a "bonus points for" line are never the same priority — read the actual wording.
- kind "technical": a specific technology, tool, language, or hard skill.
- kind "behavioural": a soft skill, way of working, or interpersonal trait (e.g. "mentors
  junior engineers", "communicates clearly with non-technical stakeholders").
- kind "domain": industry/business-domain knowledge (e.g. "experience in fintech", "familiarity
  with healthcare compliance") rather than a specific technology or soft skill.
- role_title and seniority: read from the description; if not stated, make a reasonable,
  conservative inference from context (e.g. years of experience mentioned) rather than
  guessing wildly. seniority should be a short phrase like "senior", "mid-level", "staff", "unspecified".
- responsibilities: short bullet phrases of what the role actually does day to day, taken
  from the description.

Job description:
${wrapUntrusted("job_description", "{{JD}}")}

Respond with JSON matching exactly this shape:
{
  "role_title": "",
  "seniority": "",
  "responsibilities": [""],
  "requirements": [ { "text": "", "kind": "technical|behavioural|domain", "priority": "must|nice" } ]
}`;

export async function extractRequirements(jd: string): Promise<ExtractionResult> {
  const prompt = PROMPT.replace("{{JD}}", jd);
  const raw = await generateJson<unknown>(prompt, { temperature: 0.1, maxOutputTokens: 2048 });
  const parsed = ExtractionResponseSchema.parse(raw);
  return {
    roleTitle: parsed.role_title,
    seniority: parsed.seniority,
    responsibilities: parsed.responsibilities,
    requirements: parsed.requirements,
  };
}
