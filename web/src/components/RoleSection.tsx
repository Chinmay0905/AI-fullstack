import type { Kit } from "@aipk/shared";

const KIND_STYLE: Record<string, string> = {
  technical: "border-cyan-400/30 bg-cyan-400/10 text-cyan-300",
  behavioural: "border-violet-400/30 bg-violet-400/10 text-violet-300",
  domain: "border-pink-400/30 bg-pink-400/10 text-pink-300",
};

export function RoleSection({ kit }: { kit: Kit }) {
  return (
    <section className="glass rounded-2xl p-6">
      <h2 className="mb-4 text-lg font-bold text-white">🎯 Role breakdown</h2>
      <div className="mb-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-lg font-semibold text-white">{kit.role.title || "Untitled role"}</span>
        {kit.role.seniority && (
          <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-xs text-white/70">
            {kit.role.seniority}
          </span>
        )}
      </div>

      {kit.role.responsibilities.length > 0 && (
        <div className="mb-5">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-white/40">Responsibilities</p>
          <ul className="list-inside list-disc text-sm text-white/75">
            {kit.role.responsibilities.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/40">
          Requirements ({kit.role.requirements.length})
        </p>
        {kit.role.requirements.length === 0 ? (
          <p className="text-sm text-white/50">
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
                      : "border border-white/12 bg-white/5 text-white/50"
                  }`}
                >
                  {r.priority}
                </span>
                <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs ${KIND_STYLE[r.kind] ?? KIND_STYLE.technical}`}>
                  {r.kind}
                </span>
                <span className="text-white/80">{r.text}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
