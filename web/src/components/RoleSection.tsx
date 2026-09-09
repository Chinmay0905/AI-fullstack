import type { Kit } from "@aipk/shared";

const KIND_STYLE: Record<string, string> = {
  technical: "border-amber-400 bg-amber-100 text-amber-800",
  behavioural: "border-orange-400 bg-orange-100 text-orange-800",
  domain: "border-red-400 bg-red-100 text-red-800",
};

export function RoleSection({ kit }: { kit: Kit }) {
  return (
    <section className="glass rounded-2xl p-6">
      <h2 className="mb-4 text-lg font-bold text-stone-900">🎯 Role breakdown</h2>
      <div className="mb-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-lg font-semibold text-stone-900">{kit.role.title || "Untitled role"}</span>
        {kit.role.seniority && (
          <span className="rounded-full border border-stone-300 bg-white/60 px-2.5 py-0.5 text-xs text-stone-600">
            {kit.role.seniority}
          </span>
        )}
      </div>

      {kit.role.responsibilities.length > 0 && (
        <div className="mb-5">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-stone-400">Responsibilities</p>
          <ul className="list-inside list-disc text-sm text-stone-700">
            {kit.role.responsibilities.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-400">
          Requirements ({kit.role.requirements.length})
        </p>
        {kit.role.requirements.length === 0 ? (
          <p className="text-sm text-stone-500">
            No clear requirements could be extracted from this job description.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {kit.role.requirements.map((r) => (
              <li key={r.id} className="flex items-start gap-2 text-sm">
                <span
                  className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                    r.priority === "must"
                      ? "glow-btn text-white"
                      : "border border-stone-300 bg-white/60 text-stone-500"
                  }`}
                >
                  {r.priority}
                </span>
                <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs ${KIND_STYLE[r.kind] ?? KIND_STYLE.technical}`}>
                  {r.kind}
                </span>
                <span className="text-stone-800">{r.text}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
