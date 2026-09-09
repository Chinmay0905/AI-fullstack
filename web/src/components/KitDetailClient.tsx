"use client";

import Link from "next/link";
import { useKit } from "@/lib/useKit";
import { PROGRESS_LABELS } from "@/lib/types";
import { CompanyBriefSection } from "./CompanyBriefSection";
import { RoleSection } from "./RoleSection";
import { QuestionBankSection } from "./QuestionBankSection";
import { FlashcardsSection } from "./FlashcardsSection";
import { ScheduleSection } from "./ScheduleSection";

const PIPELINE_STEPS = [
  "crawling_company_site",
  "extracting_requirements",
  "writing_company_brief",
  "searching_discussion",
  "generating_questions",
  "checking_coverage",
  "generating_flashcards",
  "building_schedule",
  "validating_kit",
];

export function KitDetailClient({ id }: { id: string }) {
  const kitHook = useKit(id);
  const { record, isLoading, isError } = kitHook;

  if (isLoading) {
    return <p className="text-sm text-stone-500">Loading kit…</p>;
  }
  if (isError || !record) {
    return (
      <div className="rounded-2xl border border-red-300 bg-red-50 p-5 text-sm text-red-700">
        Could not load this kit.{" "}
        <Link href="/" className="underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  if (record.status === "generating") {
    const currentIndex = PIPELINE_STEPS.indexOf(record.progressStep ?? "");
    return (
      <div className="glass rounded-2xl p-8">
        <h1 className="mb-1 text-xl font-bold gradient-text">Generating your kit…</h1>
        <p className="mb-7 text-sm text-stone-500">
          {record.input.companyUrl} · {record.input.days} day{record.input.days === 1 ? "" : "s"}
        </p>
        <ol className="flex flex-col gap-3">
          {PIPELINE_STEPS.map((step, i) => {
            const done = currentIndex > i || (currentIndex === -1 && false);
            const active = step === record.progressStep;
            return (
              <li key={step} className="flex items-center gap-3 text-sm">
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    done
                      ? "bg-emerald-100 text-emerald-700 shadow-[0_0_10px_rgba(52,211,153,0.35)]"
                      : active
                        ? "pulse-glow glow-btn text-white"
                        : "border border-stone-300 text-stone-400"
                  }`}
                >
                  {done ? "✓" : i + 1}
                </span>
                <span className={active ? "font-semibold text-stone-900" : done ? "text-stone-600" : "text-stone-400"}>
                  {PROGRESS_LABELS[step] ?? step}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    );
  }

  if (record.status === "failed") {
    return (
      <div className="rounded-2xl border border-red-300 bg-red-50 p-6">
        <h1 className="mb-2 text-lg font-bold text-red-700">Generation failed</h1>
        <p className="text-sm text-red-700/80">
          {record.error?.code}: {record.error?.message}
        </p>
        <Link href="/" className="mt-4 inline-block text-sm text-red-700 underline">
          Back to dashboard — try again with a different input
        </Link>
      </div>
    );
  }

  const kit = record.kit!;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold gradient-text">{kit.role.title || "Untitled role"}</h1>
          <p className="text-sm text-stone-500">
            {kit.source.company} · researched {new Date(kit.source.researched_at).toLocaleDateString()}
          </p>
        </div>
        <Link
          href={`/kits/${id}/practice`}
          className="glow-btn rounded-lg px-4 py-2 text-sm font-medium text-white"
        >
          🎓 Practice flashcards
        </Link>
      </div>

      <CompanyBriefSection kit={kit} actions={kitHook} />
      <RoleSection kit={kit} />
      <QuestionBankSection kit={kit} actions={kitHook} />
      <FlashcardsSection kit={kit} actions={kitHook} />
      <ScheduleSection kit={kit} actions={kitHook} />
    </div>
  );
}
