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
        <h2 className="text-lg font-bold text-white">🏢 Company brief</h2>
        <button
          onClick={() => actions.regenerateCompanyBrief.mutate([])}
          disabled={regenerating}
          className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-medium text-white/70 transition hover:border-fuchsia-400/40 hover:bg-white/10 hover:text-white disabled:opacity-50"
        >
          {regenerating ? "Regenerating…" : "↻ Regenerate"}
        </button>
      </div>
      <div className="flex flex-col gap-4">
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-fuchsia-300/70">Summary</p>
          <EditableText
            value={kit.company_brief.summary}
            onSave={(summary) => actions.editCompanyBrief.mutate([{ summary }])}
            multiline
            rows={4}
            label="Company brief summary"
            className="w-full rounded-lg border border-transparent px-2 py-1 text-sm leading-relaxed text-white/85 transition hover:border-white/15 focus:border-fuchsia-400/50 focus:bg-white/5 focus:outline-none"
          />
        </div>
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-cyan-300/70">What they do</p>
          <EditableText
            value={kit.company_brief.what_they_do}
            onSave={(what_they_do) => actions.editCompanyBrief.mutate([{ what_they_do }])}
            multiline
            rows={2}
            label="What they do"
            className="w-full rounded-lg border border-transparent px-2 py-1 text-sm leading-relaxed text-white/85 transition hover:border-white/15 focus:border-fuchsia-400/50 focus:bg-white/5 focus:outline-none"
          />
        </div>
        {kit.company_brief.sources.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-white/40">Sources</p>
            <ul className="flex flex-wrap gap-2">
              {kit.company_brief.sources.map((s) => (
                <li key={s}>
                  <a
                    href={s}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-cyan-400/20 bg-cyan-400/5 px-2.5 py-0.5 text-xs text-cyan-300 transition hover:border-cyan-400/40 hover:bg-cyan-400/10"
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
