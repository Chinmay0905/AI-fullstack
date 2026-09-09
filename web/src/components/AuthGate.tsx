"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";

/** Section 1: "a signed-out visitor cannot reach protected pages." Client-
 * side gate — the API itself is the real enforcement boundary (every
 * /api/kits/* route requires a valid session), this just keeps a
 * signed-out visitor from seeing a flash of protected UI. */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace("/login");
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-white/50">
        Loading…
      </div>
    );
  }
  if (!isAuthenticated) return null;
  return <>{children}</>;
}
