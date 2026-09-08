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
    <li className="rounded-md border border-neutral-200 p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-neutral-600">
          {ORIGIN_LABEL[question.origin ?? "generated"]}
        </span>
        {question.pinned && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-800">Pinned</span>
        )}
        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-700">
          Difficulty {question.difficulty}/3
        </span>
        {question.requirement_ids.length > 0 && (
          <span className="text-neutral-400">covers {question.requirement_ids.join(", ")}</span>
        )}
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={onMoveUp}
            disabled={!canMoveUp}
            aria-label="Move up"
            className="rounded border border-neutral-200 px-1.5 py-0.5 text-neutral-600 hover:bg-neutral-50 disabled:opacity-30"
          >
            ↑
          </button>
          <button
            onClick={onMoveDown}
            disabled={!canMoveDown}
            aria-label="Move down"
            className="rounded border border-neutral-200 px-1.5 py-0.5 text-neutral-600 hover:bg-neutral-50 disabled:opacity-30"
          >
            ↓
          </button>
          <select
            aria-label="Move to category"
            value={question.category}
            onChange={(e) => onMoveCategory(e.target.value as QuestionCategory)}
            className="rounded border border-neutral-200 px-1.5 py-0.5 text-neutral-600"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <button
            onClick={() => actions.pinQuestion.mutate([question.id, !question.pinned])}
            className="rounded border border-neutral-200 px-1.5 py-0.5 text-neutral-600 hover:bg-neutral-50"
          >
            {question.pinned ? "Unpin" : "Pin"}
          </button>
          {confirmDelete ? (
            <>
              <button
                onClick={() => actions.deleteQuestion.mutate([question.id])}
                className="rounded border border-red-300 bg-red-50 px-1.5 py-0.5 text-red-700 hover:bg-red-100"
              >
                Confirm
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="rounded border border-neutral-200 px-1.5 py-0.5 text-neutral-600 hover:bg-neutral-50"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="rounded border border-neutral-200 px-1.5 py-0.5 text-neutral-600 hover:bg-neutral-50"
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
        className="w-full rounded-md border border-transparent px-2 py-1 text-sm font-medium hover:border-neutral-200 focus:border-neutral-400 focus:outline-none"
      />
      <EditableText
        value={question.answer_outline}
        onSave={(answer_outline) => actions.editQuestion.mutate([question.id, { answer_outline }])}
        multiline
        rows={2}
        label="Answer outline"
        placeholder="Answer outline…"
        className="w-full rounded-md border border-transparent px-2 py-1 text-xs text-neutral-600 hover:border-neutral-200 focus:border-neutral-400 focus:outline-none"
      />
    </li>
  );
}
