"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { kitsApi } from "@/lib/api";
import type { PracticeCard } from "@/lib/types";

const CONFIDENCE_LABELS = ["Not confident", "Shaky", "OK", "Confident", "Nailed it"];
const CONFIDENCE_STYLE = [
  "border-red-300 bg-red-50 text-red-700 hover:bg-red-100",
  "border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100",
  "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100",
  "border-lime-300 bg-lime-50 text-lime-700 hover:bg-lime-100",
  "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
];

/**
 * Section 7. The API returns cards ordered least-confident first; that
 * ordering is frozen into `sessionOrder` the moment the session starts,
 * and the walk-through uses that fixed order for the rest of the run.
 * Without this, rating a card would re-sort the live query data and the
 * card that used to be at the next index could shift or repeat — the
 * *next* session (a fresh page load) is what picks up the new ordering.
 */
export function PracticeClient({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["practice", id], queryFn: () => kitsApi.getPracticeSession(id) });
  const [sessionOrder, setSessionOrder] = useState<string[] | null>(null);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const cardsById = useRef(new Map<string, PracticeCard>());

  useEffect(() => {
    if (query.data) {
      for (const c of query.data.cards) cardsById.current.set(c.id, c);
      if (sessionOrder === null) setSessionOrder(query.data.cards.map((c) => c.id));
    }
    // Only seed the frozen order once per mount — see doc comment above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data]);

  const rateMutation = useMutation({
    mutationFn: (confidence: number) => kitsApi.recordPracticeConfidence(id, sessionOrder![index], confidence),
    onSuccess: (updatedSession) => {
      queryClient.setQueryData(["practice", id], updatedSession);
      queryClient.invalidateQueries({ queryKey: ["kits"] });
      for (const c of updatedSession.cards) cardsById.current.set(c.id, c);
      setRevealed(false);
      setIndex((i) => i + 1);
    },
  });

  if (query.isLoading || sessionOrder === null) {
    return <p className="text-sm text-stone-500">Loading flashcards…</p>;
  }
  if (query.isError || !query.data) {
    return <p className="text-sm text-red-700">Could not load flashcards for this kit.</p>;
  }

  const coverage = query.data.coverage;

  if (sessionOrder.length === 0) {
    return (
      <div className="glass rounded-2xl border-dashed p-8 text-center text-sm text-stone-500">
        This kit has no flashcards yet.{" "}
        <Link href={`/kits/${id}`} className="text-amber-700 underline">
          Go add some
        </Link>
        .
      </div>
    );
  }

  const done = index >= sessionOrder.length;
  const card = !done ? cardsById.current.get(sessionOrder[index]) : null;

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <Link href={`/kits/${id}`} className="text-sm text-stone-500 underline hover:text-stone-800">
          ← Back to kit
        </Link>
        <span className="text-sm text-stone-500">
          Covered {coverage.reviewed}/{coverage.total}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full border border-stone-300 bg-white/50">
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 shadow-[0_0_10px_rgba(184,115,58,0.5)] transition-all"
          style={{ width: `${(coverage.reviewed / Math.max(1, coverage.total)) * 100}%` }}
        />
      </div>

      {done || !card ? (
        <div className="glass rounded-2xl p-8 text-center">
          <h1 className="mb-2 text-xl font-bold gradient-text">🎉 Session complete</h1>
          <p className="mb-5 text-sm text-stone-500">
            You reviewed {sessionOrder.length} card{sessionOrder.length === 1 ? "" : "s"} this session.
          </p>
          <button
            onClick={() => {
              setIndex(0);
              setSessionOrder(null);
              queryClient.invalidateQueries({ queryKey: ["practice", id] });
            }}
            className="glow-btn rounded-lg px-5 py-2.5 text-sm font-medium text-white"
          >
            Practice again
          </button>
        </div>
      ) : (
        <div className="glass rounded-2xl p-8">
          <p className="mb-4 text-xs uppercase tracking-wide text-stone-400">
            Card {index + 1} of {sessionOrder.length}
            {card.confidence !== null && ` · last rated: ${CONFIDENCE_LABELS[card.confidence - 1]}`}
          </p>
          <p className="mb-7 min-h-[3rem] text-xl font-semibold text-stone-900">{card.front}</p>

          {revealed ? (
            <>
              <div className="glass mb-6 rounded-xl p-4 text-sm text-stone-700">{card.back}</div>
              <p className="mb-2 text-sm text-stone-500">How confident were you?</p>
              <div className="flex gap-2">
                {CONFIDENCE_LABELS.map((label, i) => (
                  <button
                    key={label}
                    onClick={() => rateMutation.mutate(i + 1)}
                    disabled={rateMutation.isPending}
                    className={`flex-1 rounded-lg border px-2 py-2 text-xs font-medium transition disabled:opacity-50 ${CONFIDENCE_STYLE[i]}`}
                  >
                    {i + 1}
                    <br />
                    {label}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <button
              onClick={() => setRevealed(true)}
              className="glow-btn w-full rounded-lg px-4 py-3 text-sm font-medium text-white"
              autoFocus
            >
              Reveal answer
            </button>
          )}
        </div>
      )}
    </div>
  );
}
