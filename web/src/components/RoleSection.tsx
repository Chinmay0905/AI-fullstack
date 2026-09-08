import type { Kit } from "@aipk/shared";

export function RoleSection({ kit }: { kit: Kit }) {
  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-5">
      <h2 className="mb-3 text-lg font-semibold">Role breakdown</h2>
      <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-base font-medium text-neutral-900">{kit.role.title || "Untitled role"}</span>
        {kit.role.seniority && (
          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
            {kit.role.seniority}
          </span>
        )}
      </div>

      {kit.role.responsibilities.length > 0 && (
        <div className="mb-4">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-neutral-500">Responsibilities</p>
          <ul className="list-inside list-disc text-sm text-neutral-700">
            {kit.role.responsibilities.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-neutral-500">
          Requirements ({kit.role.requirements.length})
        </p>
        {kit.role.requirements.length === 0 ? (
          <p className="text-sm text-neutral-500">
            No clear requirements could be extracted from this job description.
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {kit.role.requirements.map((r) => (
              <li key={r.id} className="flex items-start gap-2 text-sm">
                <span
                  className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                    r.priority === "must" ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-600"
                  }`}
                >
                  {r.priority}
                </span>
                <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">{r.kind}</span>
                <span className="text-neutral-800">{r.text}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
