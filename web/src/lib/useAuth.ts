"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { authApi } from "./api";

export function useAuth() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["me"],
    queryFn: authApi.me,
    retry: false,
    // This hook only ever answers "am I signed in" — there is no failure
    // mode (a 401, or the backend being briefly unreachable) that should
    // crash the app instead of just falling back to "treat as signed
    // out." No error boundary exists to catch a throw here, so letting
    // one through means a genuine blank-screen crash.
    throwOnError: false,
  });

  return {
    user: query.data ?? null,
    isLoading: query.isLoading,
    isAuthenticated: !!query.data,
    refresh: () => queryClient.invalidateQueries({ queryKey: ["me"] }),
    /** Sign out: calls the API, then drops the cached "me" data outright.
     * invalidateQueries alone isn't enough here — TanStack Query keeps
     * showing the last-known-good `data` while a stale query refetches in
     * the background, only updating once the refetch settles. That left
     * the topnav showing the signed-out user's email for a beat (long
     * enough to still be visible after the redirect to /login, since the
     * navigation doesn't wait on that refetch). removeQueries clears the
     * cache entry immediately instead of just marking it stale, so
     * isAuthenticated flips to false on the very next render. */
    logout: async () => {
      await authApi.logout();
      queryClient.removeQueries({ queryKey: ["me"] });
    },
  };
}
