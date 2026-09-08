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
    <header className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-3">
        <Link href="/" className="shrink-0 font-semibold text-neutral-900">
          Interview Prep Kit
        </Link>
        {isAuthenticated ? (
          <div className="flex min-w-0 shrink-0 items-center gap-2 text-sm">
            <span className="hidden max-w-[180px] truncate text-neutral-500 sm:inline">{user?.email}</span>
            <button
              onClick={handleLogout}
              className="shrink-0 rounded-md border border-neutral-300 px-3 py-1.5 text-neutral-700 hover:bg-neutral-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
            >
              Sign out
            </button>
          </div>
        ) : (
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/login" className="text-neutral-700 hover:underline">
              Sign in
            </Link>
            <Link
              href="/register"
              className="rounded-md bg-neutral-900 px-3 py-1.5 text-white hover:bg-neutral-700"
            >
              Sign up
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
