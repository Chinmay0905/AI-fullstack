"use client";

import { useState } from "react";
import type { Kit, Flashcard } from "@aipk/shared";
import { EditableText } from "./EditableText";
import type { useKit } from "@/lib/useKit";

export function FlashcardsSection({
  kit,
  actions,
}: {
  kit: Kit;
  actions: Pick<ReturnType<typeof useKit>, "editFlashcard" | "addFlashcard" | "deleteFlashcard">;
}) {
  const [adding, setAdding] = useState(false);

  return (
    <section className="glass rounded-2xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-stone-900">🗂️ Flashcards ({kit.flashcards.length})</h2>
        <button
          onClick={() => setAdding((v) => !v)}
          className="rounded-lg border border-stone-300 px-2.5 py-1 text-xs text-stone-600 transition hover:bg-amber-600/10 hover:text-stone-900"
        >
          + Add flashcard
        </button>
      </div>

      {adding && (
        <AddFlashcardForm
          requirements={kit.role.requirements}
          onAdd={(input) => {
            actions.addFlashcard.mutate([input]);
            setAdding(false);
          }}
          onCancel={() => setAdding(false)}
        />
      )}

      {kit.flashcards.length === 0 ? (
        <p className="text-sm text-stone-400">No flashcards yet.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {kit.flashcards.map((f) => (
            <FlashcardEditor key={f.id} flashcard={f} actions={actions} />
          ))}
        </ul>
      )}
    </section>
  );
}

function FlashcardEditor({
  flashcard,
  actions,
}: {
  flashcard: Flashcard;
  actions: Pick<ReturnType<typeof useKit>, "editFlashcard" | "deleteFlashcard">;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <li className="glass rounded-xl p-3.5 transition hover:border-amber-700/25">
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="rounded-full border border-stone-300 bg-white/50 px-2 py-0.5 text-stone-500">
          {flashcard.origin === "user_added" ? "Added by you" : flashcard.origin === "user_edited" ? "Edited by you" : "Generated"}
        </span>
        {confirmDelete ? (
          <span className="flex gap-1">
            <button
              onClick={() => actions.deleteFlashcard.mutate([flashcard.id])}
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
          </span>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="rounded-md border border-stone-300 px-1.5 py-0.5 text-stone-600 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700"
          >
            Delete
          </button>
        )}
      </div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-orange-700/80">Front</p>
      <EditableText
        value={flashcard.front}
        onSave={(front) => actions.editFlashcard.mutate([flashcard.id, { front }])}
        multiline
        rows={2}
        label="Flashcard front"
        className="w-full rounded-lg border border-transparent px-2 py-1 text-sm font-medium text-stone-900 transition hover:border-amber-700/20 focus:border-amber-600/50 focus:bg-white/60 focus:outline-none"
      />
      <p className="mb-1 mt-1.5 text-xs font-semibold uppercase tracking-wider text-amber-700/80">Back</p>
      <EditableText
        value={flashcard.back}
        onSave={(back) => actions.editFlashcard.mutate([flashcard.id, { back }])}
        multiline
        rows={2}
        label="Flashcard back"
        className="w-full rounded-lg border border-transparent px-2 py-1 text-sm text-stone-700 transition hover:border-amber-700/20 focus:border-amber-600/50 focus:bg-white/60 focus:outline-none"
      />
    </li>
  );
}

function AddFlashcardForm({
  requirements,
  onAdd,
  onCancel,
}: {
  requirements: Kit["role"]["requirements"];
  onAdd: (input: Pick<Flashcard, "front" | "back" | "requirement_ids">) => void;
  onCancel: () => void;
}) {
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [reqId, setReqId] = useState("");

  return (
    <div className="glass mb-3 rounded-xl border-dashed p-3">
      <div className="flex flex-col gap-2">
        <input
          value={front}
          onChange={(e) => setFront(e.target.value)}
          placeholder="Front"
          className="field rounded-lg px-2 py-1 text-sm"
        />
        <input
          value={back}
          onChange={(e) => setBack(e.target.value)}
          placeholder="Back"
          className="field rounded-lg px-2 py-1 text-sm"
        />
        <div className="flex items-center gap-2 text-xs text-stone-600">
          <label className="flex items-center gap-1">
            Requirement
            <select
              value={reqId}
              onChange={(e) => setReqId(e.target.value)}
              className="field rounded-md px-1 py-0.5"
            >
              <option className="bg-white" value="">(none)</option>
              {requirements.map((r) => (
                <option key={r.id} value={r.id} className="bg-white">
                  {r.id}: {r.text.slice(0, 30)}
                </option>
              ))}
            </select>
          </label>
          <div className="ml-auto flex gap-2">
            <button onClick={onCancel} className="rounded-md border border-stone-300 px-2 py-1 text-stone-600 hover:bg-stone-100">
              Cancel
            </button>
            <button
              disabled={!front.trim() || !back.trim()}
              onClick={() => onAdd({ front, back, requirement_ids: reqId ? [reqId] : [] })}
              className="glow-btn rounded-md px-2.5 py-1 font-medium text-white disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
