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
  };
}
