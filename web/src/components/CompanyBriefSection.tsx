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
    <section className="rounded-lg border border-neutral-200 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Company brief</h2>
        <button
          onClick={() => actions.regenerateCompanyBrief.mutate([])}
          disabled={regenerating}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
        >
          {regenerating ? "Regenerating…" : "Regenerate"}
        </button>
      </div>
      <div className="flex flex-col gap-3">
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-neutral-500">Summary</p>
          <EditableText
            value={kit.company_brief.summary}
            onSave={(summary) => actions.editCompanyBrief.mutate([{ summary }])}
            multiline
            rows={4}
            label="Company brief summary"
            className="w-full rounded-md border border-transparent px-2 py-1 text-sm leading-relaxed hover:border-neutral-200 focus:border-neutral-400 focus:outline-none"
          />
        </div>
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-neutral-500">What they do</p>
          <EditableText
            value={kit.company_brief.what_they_do}
            onSave={(what_they_do) => actions.editCompanyBrief.mutate([{ what_they_do }])}
            multiline
            rows={2}
            label="What they do"
            className="w-full rounded-md border border-transparent px-2 py-1 text-sm leading-relaxed hover:border-neutral-200 focus:border-neutral-400 focus:outline-none"
          />
        </div>
        {kit.company_brief.sources.length > 0 && (
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-neutral-500">Sources</p>
            <ul className="flex flex-wrap gap-2">
              {kit.company_brief.sources.map((s) => (
                <li key={s}>
                  <a
                    href={s}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-blue-600 underline decoration-blue-300 hover:decoration-blue-600"
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
