"use client";

import { useState } from "react";
import type { Question, QuestionCategory } from "@aipk/shared";
import { EditableText } from "./EditableText";
import type { useKit } from "@/lib/useKit";

const CATEGORIES: QuestionCategory[] = ["technical", "behavioural", "system-design", "company-fit"];

const ORIGIN_LABEL: Record<string, string> = {
  generated: "Generated",
  user_added: "Added by you",
  user_edited: "Edited by you",
};

export function QuestionCard({
  question,
  actions,
  onMoveUp,
  onMoveDown,
  onMoveCategory,
  canMoveUp,
  canMoveDown,
}: {
  question: Question;
  actions: Pick<ReturnType<typeof useKit>, "editQuestion" | "pinQuestion" | "deleteQuestion">;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onMoveCategory: (category: QuestionCategory) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <li className="glass rounded-xl p-3.5 transition hover:border-white/20">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-white/55">
          {ORIGIN_LABEL[question.origin ?? "generated"]}
        </span>
        {question.pinned && (
          <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 font-medium text-amber-300">
            📌 Pinned
          </span>
        )}
        <span className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-2 py-0.5 text-cyan-300">
          Difficulty {question.difficulty}/3
        </span>
        {question.requirement_ids.length > 0 && (
          <span className="text-white/35">covers {question.requirement_ids.join(", ")}</span>
        )}
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={onMoveUp}
            disabled={!canMoveUp}
            aria-label="Move up"
            className="rounded-md border border-white/10 px-1.5 py-0.5 text-white/60 transition hover:bg-white/10 hover:text-white disabled:opacity-25"
          >
            ↑
          </button>
          <button
            onClick={onMoveDown}
            disabled={!canMoveDown}
            aria-label="Move down"
            className="rounded-md border border-white/10 px-1.5 py-0.5 text-white/60 transition hover:bg-white/10 hover:text-white disabled:opacity-25"
          >
            ↓
          </button>
          <select
            aria-label="Move to category"
            value={question.category}
            onChange={(e) => onMoveCategory(e.target.value as QuestionCategory)}
            className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-white/70"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c} className="bg-[#12101f] text-white">
                {c}
              </option>
            ))}
          </select>
          <button
            onClick={() => actions.pinQuestion.mutate([question.id, !question.pinned])}
            className="rounded-md border border-white/10 px-1.5 py-0.5 text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            {question.pinned ? "Unpin" : "Pin"}
          </button>
          {confirmDelete ? (
            <>
              <button
                onClick={() => actions.deleteQuestion.mutate([question.id])}
                className="rounded-md border border-red-400/40 bg-red-400/15 px-1.5 py-0.5 text-red-300 hover:bg-red-400/25"
              >
                Confirm
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="rounded-md border border-white/10 px-1.5 py-0.5 text-white/60 hover:bg-white/10"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="rounded-md border border-white/10 px-1.5 py-0.5 text-white/60 transition hover:border-red-400/30 hover:bg-red-400/10 hover:text-red-300"
            >
              Delete
            </button>
          )}
        </div>
      </div>
      <EditableText
        value={question.prompt}
        onSave={(prompt) => actions.editQuestion.mutate([question.id, { prompt }])}
        multiline
        rows={2}
        label="Question prompt"
        className="w-full rounded-lg border border-transparent px-2 py-1 text-sm font-medium text-white/90 transition hover:border-white/15 focus:border-fuchsia-400/50 focus:bg-white/5 focus:outline-none"
      />
      <EditableText
        value={question.answer_outline}
        onSave={(answer_outline) => actions.editQuestion.mutate([question.id, { answer_outline }])}
        multiline
        rows={2}
        label="Answer outline"
        placeholder="Answer outline…"
        className="w-full rounded-lg border border-transparent px-2 py-1 text-xs text-white/55 transition hover:border-white/15 focus:border-fuchsia-400/50 focus:bg-white/5 focus:outline-none"
      />
    </li>
  );
}
