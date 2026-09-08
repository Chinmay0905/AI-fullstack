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
    <section className="rounded-lg border border-neutral-200 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Flashcards ({kit.flashcards.length})</h2>
        <button
          onClick={() => setAdding((v) => !v)}
          className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs text-neutral-700 hover:bg-neutral-50"
        >
          Add flashcard
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
        <p className="text-sm text-neutral-400">No flashcards yet.</p>
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
    <li className="rounded-md border border-neutral-200 p-3">
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-neutral-600">
          {flashcard.origin === "user_added" ? "Added by you" : flashcard.origin === "user_edited" ? "Edited by you" : "Generated"}
        </span>
        {confirmDelete ? (
          <span className="flex gap-1">
            <button
              onClick={() => actions.deleteFlashcard.mutate([flashcard.id])}
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
          </span>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="rounded border border-neutral-200 px-1.5 py-0.5 text-neutral-600 hover:bg-neutral-50"
          >
            Delete
          </button>
        )}
      </div>
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-neutral-500">Front</p>
      <EditableText
        value={flashcard.front}
        onSave={(front) => actions.editFlashcard.mutate([flashcard.id, { front }])}
        multiline
        rows={2}
        label="Flashcard front"
        className="w-full rounded-md border border-transparent px-2 py-1 text-sm font-medium hover:border-neutral-200 focus:border-neutral-400 focus:outline-none"
      />
      <p className="mb-1 mt-1 text-xs font-medium uppercase tracking-wide text-neutral-500">Back</p>
      <EditableText
        value={flashcard.back}
        onSave={(back) => actions.editFlashcard.mutate([flashcard.id, { back }])}
        multiline
        rows={2}
        label="Flashcard back"
        className="w-full rounded-md border border-transparent px-2 py-1 text-sm hover:border-neutral-200 focus:border-neutral-400 focus:outline-none"
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
    <div className="mb-3 rounded-md border border-dashed border-neutral-300 p-3">
      <div className="flex flex-col gap-2">
        <input
          value={front}
          onChange={(e) => setFront(e.target.value)}
          placeholder="Front"
          className="rounded-md border border-neutral-300 px-2 py-1 text-sm"
        />
        <input
          value={back}
          onChange={(e) => setBack(e.target.value)}
          placeholder="Back"
          className="rounded-md border border-neutral-300 px-2 py-1 text-sm"
        />
        <div className="flex items-center gap-2 text-xs">
          <label className="flex items-center gap-1">
            Requirement
            <select
              value={reqId}
              onChange={(e) => setReqId(e.target.value)}
              className="rounded border border-neutral-300 px-1 py-0.5"
            >
              <option value="">(none)</option>
              {requirements.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.id}: {r.text.slice(0, 30)}
                </option>
              ))}
            </select>
          </label>
          <div className="ml-auto flex gap-2">
            <button onClick={onCancel} className="rounded border border-neutral-300 px-2 py-1 text-neutral-600 hover:bg-neutral-50">
              Cancel
            </button>
            <button
              disabled={!front.trim() || !back.trim()}
              onClick={() => onAdd({ front, back, requirement_ids: reqId ? [reqId] : [] })}
              className="rounded bg-neutral-900 px-2 py-1 text-white disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
