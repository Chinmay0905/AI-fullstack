import type { Kit } from "@aipk/shared";

export type KitStatus = "generating" | "ready" | "failed";

export interface KitRecord {
  id: string;
  status: KitStatus;
  progressStep: string | null;
  input: { jd: string; companyUrl: string; days: number };
  error: { code: string; message: string } | null;
  kit: Kit | null;
  createdAt: string;
  updatedAt: string;
}

export interface PracticeCard {
  id: string;
  front: string;
  back: string;
  requirement_ids: string[];
  confidence: number | null;
  timesReviewed: number;
}

export interface PracticeSession {
  cards: PracticeCard[];
  coverage: { reviewed: number; total: number };
}

export const PROGRESS_LABELS: Record<string, string> = {
  crawling_company_site: "Crawling the company site",
  extracting_requirements: "Reading the job description",
  writing_company_brief: "Writing the company brief",
  searching_discussion: "Searching for interview discussion",
  generating_questions: "Generating interview questions",
  checking_coverage: "Checking requirement coverage",
  filling_coverage_gaps: "Filling coverage gaps",
  generating_flashcards: "Generating flashcards",
  building_schedule: "Building your study schedule",
  validating_kit: "Validating the kit",
};
