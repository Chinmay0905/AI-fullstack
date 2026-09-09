"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import { authApi } from "@/lib/api";

export function TopNav() {
  const { isAuthenticated, user, refresh } = useAuth();
  const router = useRouter();

  async function handleLogout() {
    await authApi.logout();
    await refresh();
    router.push("/login");
  }

  return (
    <header className="glass sticky top-0 z-10 border-x-0 border-t-0">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-3.5">
        <Link href="/" className="shrink-0 text-lg font-bold tracking-tight gradient-text">
          ⚡ Interview Prep Kit
        </Link>
        {isAuthenticated ? (
          <div className="flex min-w-0 shrink-0 items-center gap-3 text-sm">
            <span className="hidden max-w-[180px] truncate text-white/50 sm:inline">{user?.email}</span>
            <button
              onClick={handleLogout}
              className="shrink-0 rounded-lg border border-white/15 px-3 py-1.5 text-white/80 transition hover:border-white/30 hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-400"
            >
              Sign out
            </button>
          </div>
        ) : (
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/login" className="text-white/70 transition hover:text-white">
              Sign in
            </Link>
            <Link
              href="/register"
              className="glow-btn rounded-lg px-4 py-1.5 font-medium text-white"
            >
              Sign up
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
