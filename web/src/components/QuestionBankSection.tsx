"use client";

import { useState } from "react";
import type { Kit, Question, QuestionCategory } from "@aipk/shared";
import { QuestionCard } from "./QuestionCard";
import type { useKit } from "@/lib/useKit";

const CATEGORIES: QuestionCategory[] = ["technical", "behavioural", "system-design", "company-fit"];
const CATEGORY_LABEL: Record<QuestionCategory, string> = {
  technical: "Technical",
  behavioural: "Behavioural",
  "system-design": "System design",
  "company-fit": "Company fit",
};
// system-design has no requirement "kind" mapped to it in this app's
// pipeline (see server/src/services/kitService.ts) — questions land there
// only if added by hand, so there's nothing to regenerate automatically.
const REGENERATABLE = new Set<QuestionCategory>(["technical", "behavioural", "company-fit"]);

function groupByCategory(questions: Question[]): Record<QuestionCategory, Question[]> {
  const groups = { technical: [], behavioural: [], "system-design": [], "company-fit": [] } as Record<
    QuestionCategory,
    Question[]
  >;
  for (const q of questions) groups[q.category].push(q);
  return groups;
}

export function QuestionBankSection({
  kit,
  actions,
}: {
  kit: Kit;
  actions: Pick<
    ReturnType<typeof useKit>,
    "editQuestion" | "pinQuestion" | "deleteQuestion" | "addQuestion" | "reorderQuestions" | "regenerateQuestionCategory"
  >;
}) {
  const groups = groupByCategory(kit.questions);
  const uncovered = kit.coverage.uncovered_requirement_ids;

  function applyReorder(next: Record<QuestionCategory, Question[]>) {
    const order = CATEGORIES.flatMap((c) => next[c].map((q) => ({ id: q.id, category: c })));
    actions.reorderQuestions.mutate([order]);
  }

  function moveWithinCategory(category: QuestionCategory, index: number, direction: -1 | 1) {
    const list = [...groups[category]];
    const target = index + direction;
    if (target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target], list[index]];
    applyReorder({ ...groups, [category]: list });
  }

  function moveToCategory(question: Question, from: QuestionCategory, to: QuestionCategory) {
    if (from === to) return;
    const fromList = groups[from].filter((q) => q.id !== question.id);
    const toList = [...groups[to], question];
    applyReorder({ ...groups, [from]: fromList, [to]: toList });
  }

  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-5">
      <h2 className="mb-3 text-lg font-semibold">Question bank</h2>

      {uncovered.length > 0 && (
        <p className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800" role="status">
          {uncovered.length} requirement{uncovered.length === 1 ? "" : "s"} still {uncovered.length === 1 ? "has" : "have"}{" "}
          no question: {uncovered.join(", ")}.
        </p>
      )}

      <div className="flex flex-col gap-6">
        {CATEGORIES.map((category) => (
          <CategoryGroup
            key={category}
            category={category}
            questions={groups[category]}
            requirements={kit.role.requirements}
            actions={actions}
            onMoveUp={(i) => moveWithinCategory(category, i, -1)}
            onMoveDown={(i) => moveWithinCategory(category, i, 1)}
            onMoveCategory={(q, to) => moveToCategory(q, category, to)}
          />
        ))}
      </div>
    </section>
  );
}

function CategoryGroup({
  category,
  questions,
  requirements,
  actions,
  onMoveUp,
  onMoveDown,
  onMoveCategory,
}: {
  category: QuestionCategory;
  questions: Question[];
  requirements: Kit["role"]["requirements"];
  actions: QuestionBankProps["actions"];
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onMoveCategory: (q: Question, to: QuestionCategory) => void;
}) {
  const [adding, setAdding] = useState(false);
  const regenerating = actions.regenerateQuestionCategory.isPending;

  if (questions.length === 0 && category === "system-design") return null;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-700">
          {CATEGORY_LABEL[category]} ({questions.length})
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAdding((v) => !v)}
            className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs text-neutral-700 hover:bg-neutral-50"
          >
            Add question
          </button>
          {REGENERATABLE.has(category) && (
            <button
              onClick={() => actions.regenerateQuestionCategory.mutate([category])}
              disabled={regenerating}
              className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
            >
              {regenerating ? "Regenerating…" : "Regenerate"}
            </button>
          )}
        </div>
      </div>

      {adding && (
        <AddQuestionForm
          category={category}
          requirements={requirements}
          onAdd={(input) => {
            actions.addQuestion.mutate([input]);
            setAdding(false);
          }}
          onCancel={() => setAdding(false)}
        />
      )}

      {questions.length === 0 ? (
        <p className="text-sm text-neutral-400">No questions in this category yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {questions.map((q, i) => (
            <QuestionCard
              key={q.id}
              question={q}
              actions={actions}
              canMoveUp={i > 0}
              canMoveDown={i < questions.length - 1}
              onMoveUp={() => onMoveUp(i)}
              onMoveDown={() => onMoveDown(i)}
              onMoveCategory={(to) => onMoveCategory(q, to)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

type QuestionBankProps = Parameters<typeof QuestionBankSection>[0];

function AddQuestionForm({
  category,
  requirements,
  onAdd,
  onCancel,
}: {
  category: QuestionCategory;
  requirements: Kit["role"]["requirements"];
  onAdd: (input: Pick<Question, "requirement_ids" | "category" | "prompt" | "answer_outline" | "difficulty">) => void;
  onCancel: () => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [answerOutline, setAnswerOutline] = useState("");
  const [difficulty, setDifficulty] = useState(2);
  const [reqId, setReqId] = useState<string>("");

  return (
    <div className="mb-3 rounded-md border border-dashed border-neutral-300 p-3">
      <div className="flex flex-col gap-2">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Question prompt"
          rows={2}
          className="rounded-md border border-neutral-300 px-2 py-1 text-sm"
        />
        <textarea
          value={answerOutline}
          onChange={(e) => setAnswerOutline(e.target.value)}
          placeholder="Answer outline"
          rows={2}
          className="rounded-md border border-neutral-300 px-2 py-1 text-sm"
        />
        <div className="flex items-center gap-2 text-xs">
          <label className="flex items-center gap-1">
            Difficulty
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(Number(e.target.value))}
              className="rounded border border-neutral-300 px-1 py-0.5"
            >
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
            </select>
          </label>
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
            <button
              onClick={onCancel}
              className="rounded border border-neutral-300 px-2 py-1 text-neutral-600 hover:bg-neutral-50"
            >
              Cancel
            </button>
            <button
              disabled={!prompt.trim() || !answerOutline.trim()}
              onClick={() =>
                onAdd({
                  category,
                  prompt,
                  answer_outline: answerOutline,
                  difficulty,
                  requirement_ids: reqId ? [reqId] : [],
                })
              }
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
