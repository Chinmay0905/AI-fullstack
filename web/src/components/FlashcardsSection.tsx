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
        <h2 className="text-lg font-bold text-white">🗂️ Flashcards ({kit.flashcards.length})</h2>
        <button
          onClick={() => setAdding((v) => !v)}
          className="rounded-lg border border-white/10 px-2.5 py-1 text-xs text-white/70 transition hover:bg-white/10 hover:text-white"
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
        <p className="text-sm text-white/35">No flashcards yet.</p>
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
    <li className="glass rounded-xl p-3.5 transition hover:border-white/20">
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-white/55">
          {flashcard.origin === "user_added" ? "Added by you" : flashcard.origin === "user_edited" ? "Edited by you" : "Generated"}
        </span>
        {confirmDelete ? (
          <span className="flex gap-1">
            <button
              onClick={() => actions.deleteFlashcard.mutate([flashcard.id])}
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
          </span>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="rounded-md border border-white/10 px-1.5 py-0.5 text-white/60 transition hover:border-red-400/30 hover:bg-red-400/10 hover:text-red-300"
          >
            Delete
          </button>
        )}
      </div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-violet-300/70">Front</p>
      <EditableText
        value={flashcard.front}
        onSave={(front) => actions.editFlashcard.mutate([flashcard.id, { front }])}
        multiline
        rows={2}
        label="Flashcard front"
        className="w-full rounded-lg border border-transparent px-2 py-1 text-sm font-medium text-white/90 transition hover:border-white/15 focus:border-fuchsia-400/50 focus:bg-white/5 focus:outline-none"
      />
      <p className="mb-1 mt-1.5 text-xs font-semibold uppercase tracking-wider text-cyan-300/70">Back</p>
      <EditableText
        value={flashcard.back}
        onSave={(back) => actions.editFlashcard.mutate([flashcard.id, { back }])}
        multiline
        rows={2}
        label="Flashcard back"
        className="w-full rounded-lg border border-transparent px-2 py-1 text-sm text-white/75 transition hover:border-white/15 focus:border-fuchsia-400/50 focus:bg-white/5 focus:outline-none"
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
        <div className="flex items-center gap-2 text-xs text-white/60">
          <label className="flex items-center gap-1">
            Requirement
            <select
              value={reqId}
              onChange={(e) => setReqId(e.target.value)}
              className="field rounded-md px-1 py-0.5"
            >
              <option className="bg-[#12101f]" value="">(none)</option>
              {requirements.map((r) => (
                <option key={r.id} value={r.id} className="bg-[#12101f]">
                  {r.id}: {r.text.slice(0, 30)}
                </option>
              ))}
            </select>
          </label>
          <div className="ml-auto flex gap-2">
            <button onClick={onCancel} className="rounded-md border border-white/10 px-2 py-1 text-white/60 hover:bg-white/10">
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
