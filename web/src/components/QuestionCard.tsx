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
    <li className="glass rounded-xl p-3.5 transition hover:border-amber-700/25">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full border border-stone-300 bg-white/50 px-2 py-0.5 text-stone-500">
          {ORIGIN_LABEL[question.origin ?? "generated"]}
        </span>
        {question.pinned && (
          <span className="rounded-full border border-amber-400 bg-amber-100 px-2 py-0.5 font-medium text-amber-800">
            📌 Pinned
          </span>
        )}
        <span className="rounded-full border border-amber-400/50 bg-amber-100/70 px-2 py-0.5 text-amber-800">
          Difficulty {question.difficulty}/3
        </span>
        {question.requirement_ids.length > 0 && (
          <span className="text-stone-400">covers {question.requirement_ids.join(", ")}</span>
        )}
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={onMoveUp}
            disabled={!canMoveUp}
            aria-label="Move up"
            className="rounded-md border border-stone-300 px-1.5 py-0.5 text-stone-600 transition hover:bg-amber-600/10 hover:text-stone-900 disabled:opacity-25"
          >
            ↑
          </button>
          <button
            onClick={onMoveDown}
            disabled={!canMoveDown}
            aria-label="Move down"
            className="rounded-md border border-stone-300 px-1.5 py-0.5 text-stone-600 transition hover:bg-amber-600/10 hover:text-stone-900 disabled:opacity-25"
          >
            ↓
          </button>
          <select
            aria-label="Move to category"
            value={question.category}
            onChange={(e) => onMoveCategory(e.target.value as QuestionCategory)}
            className="rounded-md border border-stone-300 bg-white/60 px-1.5 py-0.5 text-stone-700"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c} className="bg-white text-stone-900">
                {c}
              </option>
            ))}
          </select>
          <button
            onClick={() => actions.pinQuestion.mutate([question.id, !question.pinned])}
            className="rounded-md border border-stone-300 px-1.5 py-0.5 text-stone-600 transition hover:bg-amber-600/10 hover:text-stone-900"
          >
            {question.pinned ? "Unpin" : "Pin"}
          </button>
          {confirmDelete ? (
            <>
              <button
                onClick={() => actions.deleteQuestion.mutate([question.id])}
                className="rounded-md border border-red-400 bg-red-100 px-1.5 py-0.5 text-red-700 hover:bg-red-200"
              >
                Confirm
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="rounded-md border border-stone-300 px-1.5 py-0.5 text-stone-600 hover:bg-stone-100"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="rounded-md border border-stone-300 px-1.5 py-0.5 text-stone-600 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700"
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
        className="w-full rounded-lg border border-transparent px-2 py-1 text-sm font-medium text-stone-900 transition hover:border-amber-700/20 focus:border-amber-600/50 focus:bg-white/60 focus:outline-none"
      />
      <EditableText
        value={question.answer_outline}
        onSave={(answer_outline) => actions.editQuestion.mutate([question.id, { answer_outline }])}
        multiline
        rows={2}
        label="Answer outline"
        placeholder="Answer outline…"
        className="w-full rounded-lg border border-transparent px-2 py-1 text-xs text-stone-600 transition hover:border-amber-700/20 focus:border-amber-600/50 focus:bg-white/60 focus:outline-none"
      />
    </li>
  );
}
