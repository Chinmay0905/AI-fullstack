"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";

export function TopNav() {
  const { isAuthenticated, user, logout } = useAuth();
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  return (
    <header className="glass sticky top-0 z-10 border-x-0 border-t-0">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-3.5">
        <Link href="/" className="shrink-0 text-lg font-bold tracking-tight gradient-text">
          ☕ Interview Prep Kit
        </Link>
        {isAuthenticated ? (
          <div className="flex min-w-0 shrink-0 items-center gap-3 text-sm">
            <span className="hidden max-w-[180px] truncate text-stone-500 sm:inline">{user?.email}</span>
            <button
              onClick={handleLogout}
              className="shrink-0 rounded-lg border border-stone-300 px-3 py-1.5 text-stone-700 transition hover:border-amber-600/50 hover:bg-amber-600/10 hover:text-stone-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
            >
              Sign out
            </button>
          </div>
        ) : (
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/login" className="text-stone-600 transition hover:text-stone-900">
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
