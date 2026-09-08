"use client";

import { useState } from "react";
import type { Kit } from "@aipk/shared";
import type { useKit } from "@/lib/useKit";

export function ScheduleSection({
  kit,
  actions,
}: {
  kit: Kit;
  actions: Pick<ReturnType<typeof useKit>, "regenerateSchedule">;
}) {
  const [days, setDays] = useState(kit.schedule.days_available);
  const regenerating = actions.regenerateSchedule.isPending;
  const questionsById = new Map(kit.questions.map((q) => [q.id, q]));

  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Study schedule</h2>
        <div className="flex items-center gap-2 text-xs">
          <label className="flex items-center gap-1">
            Days
            <input
              type="number"
              min={1}
              max={365}
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="w-16 rounded border border-neutral-300 px-1.5 py-0.5"
            />
          </label>
          <button
            onClick={() => actions.regenerateSchedule.mutate([days])}
            disabled={regenerating}
            className="rounded-md border border-neutral-300 px-2.5 py-1 text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
          >
            {regenerating ? "Rebuilding…" : "Regenerate"}
          </button>
        </div>
      </div>

      <ol className="flex flex-col gap-3">
        {kit.schedule.days.map((day) => (
          <li key={day.day} className="rounded-md border border-neutral-200 p-3">
            <div className="mb-1 flex items-baseline justify-between">
              <span className="text-sm font-semibold">Day {day.day}</span>
              <span className="text-xs text-neutral-500">{day.minutes} min</span>
            </div>
            <p className="mb-2 text-sm text-neutral-700">{day.focus}</p>
            {day.question_ids.length > 0 && (
              <ul className="flex flex-col gap-1">
                {day.question_ids.map((qid) => {
                  const q = questionsById.get(qid);
                  return (
                    <li key={qid} className="truncate text-xs text-neutral-500">
                      · {q?.prompt ?? qid}
                    </li>
                  );
                })}
              </ul>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
