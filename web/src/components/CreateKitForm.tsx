"use client";

import { useState, useRef, FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { kitsApi, ApiError, type CreateKitItem } from "@/lib/api";

/** Section 2: "a way to prepare for more than one role at once — pasting
 * again, or uploading a file." Single-paste and file-upload share one
 * mutation (kitsApi.create takes an array either way) so there's exactly
 * one code path for "submit these cases," not two. */
export function CreateKitForm() {
  const [mode, setMode] = useState<"single" | "batch">("single");
  const [jd, setJd] = useState("");
  const [companyUrl, setCompanyUrl] = useState("");
  const [days, setDays] = useState(5);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (items: CreateKitItem[]) => kitsApi.create(items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kits"] });
      setJd("");
      setCompanyUrl("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
  });

  async function handleSingleSubmit(e: FormEvent) {
    e.preventDefault();
    mutation.mutate([{ jd, companyUrl, days }]);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFileError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) throw new Error("File must contain a JSON array.");
      const items: CreateKitItem[] = parsed.map((item, i) => {
        if (!item.jd || !item.companyUrl || !item.days) {
          throw new Error(`Entry ${i + 1} is missing jd, companyUrl, or days.`);
        }
        return { jd: String(item.jd), companyUrl: String(item.companyUrl), days: Number(item.days) };
      });
      mutation.mutate(items);
    } catch (err) {
      setFileError(err instanceof Error ? err.message : "Could not read that file.");
    }
  }

  return (
    <div className="glass glow-card rounded-2xl p-6 transition-shadow">
      <div className="mb-5 flex gap-2 text-sm" role="tablist" aria-label="Kit creation mode">
        <button
          role="tab"
          aria-selected={mode === "single"}
          onClick={() => setMode("single")}
          className={`rounded-lg px-3.5 py-1.5 font-medium transition ${mode === "single" ? "glow-btn text-white" : "border border-white/10 text-white/60 hover:bg-white/10 hover:text-white"}`}
        >
          Paste one
        </button>
        <button
          role="tab"
          aria-selected={mode === "batch"}
          onClick={() => setMode("batch")}
          className={`rounded-lg px-3.5 py-1.5 font-medium transition ${mode === "batch" ? "glow-btn text-white" : "border border-white/10 text-white/60 hover:bg-white/10 hover:text-white"}`}
        >
          Upload multiple
        </button>
      </div>

      {mode === "single" ? (
        <form onSubmit={handleSingleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm text-white/70">
            Job description
            <textarea
              required
              rows={8}
              value={jd}
              onChange={(e) => setJd(e.target.value)}
              placeholder="Paste the full job description here…"
              className="field rounded-lg px-3 py-2 font-mono text-xs"
            />
          </label>
          <div className="flex gap-4">
            <label className="flex flex-1 flex-col gap-1.5 text-sm text-white/70">
              Company website
              <input
                type="url"
                required
                value={companyUrl}
                onChange={(e) => setCompanyUrl(e.target.value)}
                placeholder="https://example.com"
                className="field rounded-lg px-3 py-2"
              />
            </label>
            <label className="flex w-28 flex-col gap-1.5 text-sm text-white/70">
              Days to prep
              <input
                type="number"
                min={1}
                max={365}
                required
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="field rounded-lg px-3 py-2"
              />
            </label>
          </div>
          {mutation.isError && (
            <p className="rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-300" role="alert">
              {mutation.error instanceof ApiError ? mutation.error.message : "Could not start generation."}
            </p>
          )}
          <button
            type="submit"
            disabled={mutation.isPending}
            className="glow-btn self-start rounded-lg px-5 py-2.5 text-sm font-medium text-white"
          >
            {mutation.isPending ? "Starting…" : "🚀 Generate kit"}
          </button>
        </form>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-white/60">
            Upload a JSON file: an array of{" "}
            <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-cyan-300">
              {`{ "jd": "...", "companyUrl": "...", "days": 5 }`}
            </code>{" "}
            entries.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            onChange={handleFileChange}
            className="text-sm text-white/70 file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-white/80 hover:file:bg-white/15"
          />
          {fileError && (
            <p className="rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-300" role="alert">
              {fileError}
            </p>
          )}
          {mutation.isError && (
            <p className="rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-300" role="alert">
              {mutation.error instanceof ApiError ? mutation.error.message : "Could not start generation."}
            </p>
          )}
          {mutation.isPending && <p className="text-sm text-white/50">Starting generation…</p>}
        </div>
      )}
    </div>
  );
}
