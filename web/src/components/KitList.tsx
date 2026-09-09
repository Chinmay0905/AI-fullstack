"use client";

import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { kitsApi } from "@/lib/api";
import { StatusBadge } from "./StatusBadge";

export function KitList() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["kits"],
    queryFn: kitsApi.list,
    // Poll while anything is still generating, so status/progress updates
    // without the user having to refresh — stop once nothing is in flight.
    refetchInterval: (q) => {
      const kits = q.state.data?.kits ?? [];
      return kits.some((k) => k.status === "generating") ? 2000 : false;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => kitsApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["kits"] }),
  });

  if (query.isLoading) {
    return <p className="text-sm text-stone-500">Loading your kits…</p>;
  }
  if (query.isError) {
    return <p className="text-sm text-red-700">Could not load your kits. Try refreshing.</p>;
  }

  const kits = query.data?.kits ?? [];
  if (kits.length === 0) {
    return (
      <p className="glass rounded-2xl border-dashed p-8 text-center text-sm text-stone-500">
        No kits yet — paste a job description above to generate your first one.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {kits.map((k) => (
        <li
          key={k.id}
          className="glass glow-card flex items-center justify-between gap-3 rounded-2xl p-4 transition-shadow"
        >
          <Link href={`/kits/${k.id}`} className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate font-medium text-stone-900">
                {k.kit?.role.title || k.kit?.source.company || "Untitled kit"}
              </span>
              <StatusBadge status={k.status} progressStep={k.progressStep} />
            </div>
            <p className="mt-0.5 truncate text-xs text-stone-500">
              {k.kit?.source.company || k.input.companyUrl} · {k.input.days} day
              {k.input.days === 1 ? "" : "s"}
            </p>
            {k.status === "failed" && k.error && (
              <p className="mt-1 text-xs text-red-700">
                {k.error.code}: {k.error.message}
              </p>
            )}
          </Link>
          <button
            onClick={() => deleteMutation.mutate(k.id)}
            disabled={deleteMutation.isPending}
            aria-label="Delete kit"
            className="shrink-0 rounded-lg border border-stone-300 px-2.5 py-1.5 text-xs text-stone-600 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
          >
            Delete
          </button>
        </li>
      ))}
    </ul>
  );
}
