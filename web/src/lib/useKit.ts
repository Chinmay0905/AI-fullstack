"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Question, Flashcard, QuestionCategory } from "@aipk/shared";
import { kitsApi, ApiError } from "./api";
import type { KitRecord } from "./types";

export function useKit(id: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["kit", id],
    queryFn: () => kitsApi.get(id),
    refetchInterval: (q) => (q.state.data?.status === "generating" ? 1500 : false),
  });

  function updateCache(updated: KitRecord) {
    queryClient.setQueryData(["kit", id], updated);
    queryClient.invalidateQueries({ queryKey: ["kits"] });
  }

  function useKitMutation<TArgs extends unknown[]>(fn: (...args: TArgs) => Promise<KitRecord>) {
    return useMutation({
      mutationFn: (args: TArgs) => fn(...args),
      onSuccess: updateCache,
    });
  }

  const editCompanyBrief = useKitMutation((patch: { summary?: string; what_they_do?: string }) =>
    kitsApi.editCompanyBrief(id, patch),
  );
  const regenerateCompanyBrief = useKitMutation(() => kitsApi.regenerateCompanyBrief(id));

  const editQuestion = useKitMutation(
    (qid: string, patch: Partial<Pick<Question, "prompt" | "answer_outline" | "difficulty" | "category">>) =>
      kitsApi.editQuestion(id, qid, patch),
  );
  const pinQuestion = useKitMutation((qid: string, pinned: boolean) => kitsApi.pinQuestion(id, qid, pinned));
  const addQuestion = useKitMutation(
    (input: Pick<Question, "requirement_ids" | "category" | "prompt" | "answer_outline" | "difficulty">) =>
      kitsApi.addQuestion(id, input),
  );
  const deleteQuestion = useKitMutation((qid: string) => kitsApi.deleteQuestion(id, qid));
  const reorderQuestions = useKitMutation((order: { id: string; category: QuestionCategory }[]) =>
    kitsApi.reorderQuestions(id, order),
  );
  const regenerateQuestionCategory = useKitMutation((category: string) =>
    kitsApi.regenerateQuestionCategory(id, category),
  );

  const regenerateSchedule = useKitMutation((days?: number) => kitsApi.regenerateSchedule(id, days));

  const editFlashcard = useKitMutation(
    (fid: string, patch: Partial<Pick<Flashcard, "front" | "back">>) => kitsApi.editFlashcard(id, fid, patch),
  );
  const addFlashcard = useKitMutation((input: Pick<Flashcard, "front" | "back" | "requirement_ids">) =>
    kitsApi.addFlashcard(id, input),
  );
  const deleteFlashcard = useKitMutation((fid: string) => kitsApi.deleteFlashcard(id, fid));

  return {
    record: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error instanceof ApiError ? query.error : null,
    editCompanyBrief,
    regenerateCompanyBrief,
    editQuestion,
    pinQuestion,
    addQuestion,
    deleteQuestion,
    reorderQuestions,
    regenerateQuestionCategory,
    regenerateSchedule,
    editFlashcard,
    addFlashcard,
    deleteFlashcard,
  };
}
