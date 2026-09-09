import { PROGRESS_LABELS, type KitStatus } from "@/lib/types";

export function StatusBadge({ status, progressStep }: { status: KitStatus; progressStep?: string | null }) {
  if (status === "ready") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-0.5 text-xs font-medium text-emerald-300 shadow-[0_0_10px_rgba(52,211,153,0.25)]">
        ✓ Ready
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-red-400/30 bg-red-400/10 px-2.5 py-0.5 text-xs font-medium text-red-300">
        ✕ Failed
      </span>
    );
  }
  return (
    <span className="pulse-glow inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-0.5 text-xs font-medium text-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.25)]">
      <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      {progressStep ? PROGRESS_LABELS[progressStep] ?? "Generating" : "Generating"}
    </span>
  );
}
