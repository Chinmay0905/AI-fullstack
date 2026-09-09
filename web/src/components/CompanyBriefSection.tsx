"use client";

import type { Kit } from "@aipk/shared";
import { EditableText } from "./EditableText";
import type { useKit } from "@/lib/useKit";

export function CompanyBriefSection({
  kit,
  actions,
}: {
  kit: Kit;
  actions: Pick<ReturnType<typeof useKit>, "editCompanyBrief" | "regenerateCompanyBrief">;
}) {
  const regenerating = actions.regenerateCompanyBrief.isPending;

  return (
    <section className="glass rounded-2xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-stone-900">🏢 Company brief</h2>
        <button
          onClick={() => actions.regenerateCompanyBrief.mutate([])}
          disabled={regenerating}
          className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-600 transition hover:border-amber-600/40 hover:bg-amber-600/10 hover:text-stone-900 disabled:opacity-50"
        >
          {regenerating ? "Regenerating…" : "↻ Regenerate"}
        </button>
      </div>
      <div className="flex flex-col gap-4">
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-amber-700/80">Summary</p>
          <EditableText
            value={kit.company_brief.summary}
            onSave={(summary) => actions.editCompanyBrief.mutate([{ summary }])}
            multiline
            rows={4}
            label="Company brief summary"
            className="w-full rounded-lg border border-transparent px-2 py-1 text-sm leading-relaxed text-stone-800 transition hover:border-amber-700/20 focus:border-amber-600/50 focus:bg-white/60 focus:outline-none"
          />
        </div>
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-orange-700/80">What they do</p>
          <EditableText
            value={kit.company_brief.what_they_do}
            onSave={(what_they_do) => actions.editCompanyBrief.mutate([{ what_they_do }])}
            multiline
            rows={2}
            label="What they do"
            className="w-full rounded-lg border border-transparent px-2 py-1 text-sm leading-relaxed text-stone-800 transition hover:border-amber-700/20 focus:border-amber-600/50 focus:bg-white/60 focus:outline-none"
          />
        </div>
        {kit.company_brief.sources.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-stone-400">Sources</p>
            <ul className="flex flex-wrap gap-2">
              {kit.company_brief.sources.map((s) => (
                <li key={s}>
                  <a
                    href={s}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-amber-700/25 bg-amber-600/5 px-2.5 py-0.5 text-xs text-amber-800 transition hover:border-amber-700/45 hover:bg-amber-600/10"
                  >
                    {new URL(s).pathname || "/"}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
