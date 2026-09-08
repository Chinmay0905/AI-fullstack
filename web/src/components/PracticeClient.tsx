"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { kitsApi } from "@/lib/api";
import type { PracticeCard } from "@/lib/types";

const CONFIDENCE_LABELS = ["Not confident", "Shaky", "OK", "Confident", "Nailed it"];

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
    return <p className="text-sm text-neutral-500">Loading flashcards…</p>;
  }
  if (query.isError || !query.data) {
    return <p className="text-sm text-red-600">Could not load flashcards for this kit.</p>;
  }

  const coverage = query.data.coverage;

  if (sessionOrder.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500">
        This kit has no flashcards yet.{" "}
        <Link href={`/kits/${id}`} className="underline">
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
        <Link href={`/kits/${id}`} className="text-sm text-neutral-500 underline">
          ← Back to kit
        </Link>
        <span className="text-sm text-neutral-500">
          Covered {coverage.reviewed}/{coverage.total}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
        <div
          className="h-full bg-neutral-900 transition-all"
          style={{ width: `${(coverage.reviewed / Math.max(1, coverage.total)) * 100}%` }}
        />
      </div>

      {done || !card ? (
        <div className="rounded-lg border border-neutral-200 bg-white p-8 text-center">
          <h1 className="mb-2 text-lg font-semibold">Session complete</h1>
          <p className="mb-4 text-sm text-neutral-500">
            You reviewed {sessionOrder.length} card{sessionOrder.length === 1 ? "" : "s"} this session.
          </p>
          <button
            onClick={() => {
              setIndex(0);
              setSessionOrder(null);
              queryClient.invalidateQueries({ queryKey: ["practice", id] });
            }}
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700"
          >
            Practice again
          </button>
        </div>
      ) : (
        <div className="rounded-lg border border-neutral-200 bg-white p-8">
          <p className="mb-4 text-xs uppercase tracking-wide text-neutral-400">
            Card {index + 1} of {sessionOrder.length}
            {card.confidence !== null && ` · last rated: ${CONFIDENCE_LABELS[card.confidence - 1]}`}
          </p>
          <p className="mb-6 min-h-[3rem] text-lg font-medium text-neutral-900">{card.front}</p>

          {revealed ? (
            <>
              <div className="mb-6 rounded-md bg-neutral-50 p-4 text-sm text-neutral-700">{card.back}</div>
              <p className="mb-2 text-sm text-neutral-500">How confident were you?</p>
              <div className="flex gap-2">
                {CONFIDENCE_LABELS.map((label, i) => (
                  <button
                    key={label}
                    onClick={() => rateMutation.mutate(i + 1)}
                    disabled={rateMutation.isPending}
                    className="flex-1 rounded-md border border-neutral-300 px-2 py-2 text-xs text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
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
              className="w-full rounded-md bg-neutral-900 px-4 py-3 text-sm text-white hover:bg-neutral-700"
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
