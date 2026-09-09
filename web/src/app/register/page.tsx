"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authApi, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const { refresh } = useAuth();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await authApi.register(email, password);
      await refresh();
      router.push("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm py-12">
      <div className="glass glow-card rounded-2xl p-8 transition-shadow">
        <h1 className="mb-6 text-2xl font-bold gradient-text">Create an account</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm text-white/70">
            Email
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="field rounded-lg px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-white/70">
            Password
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="field rounded-lg px-3 py-2"
            />
            <span className="text-xs text-white/40">At least 8 characters.</span>
          </label>
          {error && (
            <p className="rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-300" role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="glow-btn mt-2 rounded-lg px-4 py-2.5 font-medium text-white"
          >
            {submitting ? "Creating account…" : "Create account"}
          </button>
        </form>
        <p className="mt-6 text-sm text-white/50">
          Already have an account?{" "}
          <Link href="/login" className="text-cyan-300 underline decoration-cyan-300/40 hover:text-cyan-200">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
