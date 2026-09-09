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
    <section className="glass rounded-2xl p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-white">🗓️ Study schedule</h2>
        <div className="flex items-center gap-2 text-xs">
          <label className="flex items-center gap-1.5 text-white/60">
            Days
            <input
              type="number"
              min={1}
              max={365}
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="field w-16 rounded-md px-1.5 py-0.5"
            />
          </label>
          <button
            onClick={() => actions.regenerateSchedule.mutate([days])}
            disabled={regenerating}
            className="rounded-lg border border-white/10 px-2.5 py-1 text-white/70 transition hover:border-fuchsia-400/40 hover:bg-white/10 hover:text-white disabled:opacity-50"
          >
            {regenerating ? "Rebuilding…" : "↻ Regenerate"}
          </button>
        </div>
      </div>

      <ol className="flex flex-col gap-3">
        {kit.schedule.days.map((day) => {
          const empty = day.question_ids.length === 0;
          return (
            <li key={day.day} className="glass flex gap-3 rounded-xl p-3.5">
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  empty ? "border border-white/10 text-white/30" : "glow-btn text-white"
                }`}
              >
                {day.day}
              </span>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-baseline justify-between gap-2">
                  <span className="text-sm font-semibold text-white/90">{day.focus}</span>
                  <span className="shrink-0 text-xs text-white/40">{day.minutes} min</span>
                </div>
                {day.question_ids.length > 0 && (
                  <ul className="flex flex-col gap-1">
                    {day.question_ids.map((qid) => {
                      const q = questionsById.get(qid);
                      return (
                        <li key={qid} className="truncate text-xs text-white/45">
                          · {q?.prompt ?? qid}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
