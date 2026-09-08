"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { authApi, ApiError } from "./api";

export function useAuth() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["me"],
    queryFn: authApi.me,
    retry: false,
    // A 401 here just means "signed out" — not worth React Query's default
    // background refetch/retry noise.
    throwOnError: (err) => !(err instanceof ApiError && err.status === 401),
  });

  return {
    user: query.data ?? null,
    isLoading: query.isLoading,
    isAuthenticated: !!query.data,
    refresh: () => queryClient.invalidateQueries({ queryKey: ["me"] }),
  };
}
