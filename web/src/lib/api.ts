import type { Question, Flashcard, QuestionCategory } from "@aipk/shared";
import type { KitRecord, PracticeSession } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
    this.name = "ApiError";
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options.headers ?? {}) },
    ...options,
  });

  if (res.status === 204) return undefined as T;

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    // no body
  }

  if (!res.ok) {
    const err = (body as { error?: { code?: string; message?: string } } | null)?.error;
    throw new ApiError(res.status, err?.code ?? "UNKNOWN_ERROR", err?.message ?? res.statusText);
  }
  return body as T;
}

// ---- Auth --------------------------------------------------------

export interface UserSummary {
  id: string;
  email: string;
}

export const authApi = {
  me: () => request<UserSummary>("/api/auth/me"),
  register: (email: string, password: string) =>
    request<UserSummary>("/api/auth/register", { method: "POST", body: JSON.stringify({ email, password }) }),
  login: (email: string, password: string) =>
    request<UserSummary>("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  logout: () => request<void>("/api/auth/logout", { method: "POST" }),
};

// ---- Kits --------------------------------------------------------

export interface CreateKitItem {
  jd: string;
  companyUrl: string;
  days: number;
}

export const kitsApi = {
  list: () => request<{ kits: KitRecord[] }>("/api/kits"),
  get: (id: string) => request<KitRecord>(`/api/kits/${id}`),
  create: (items: CreateKitItem[]) =>
    request<{ kits: { id: string; status: string }[] }>("/api/kits", {
      method: "POST",
      body: JSON.stringify({ items }),
    }),
  remove: (id: string) => request<void>(`/api/kits/${id}`, { method: "DELETE" }),

  editCompanyBrief: (id: string, patch: { summary?: string; what_they_do?: string }) =>
    request<KitRecord>(`/api/kits/${id}/company-brief`, { method: "PATCH", body: JSON.stringify(patch) }),
  regenerateCompanyBrief: (id: string) =>
    request<KitRecord>(`/api/kits/${id}/regenerate/company-brief`, { method: "POST" }),

  editQuestion: (
    id: string,
    qid: string,
    patch: Partial<Pick<Question, "prompt" | "answer_outline" | "difficulty" | "category">>,
  ) => request<KitRecord>(`/api/kits/${id}/questions/${qid}`, { method: "PATCH", body: JSON.stringify(patch) }),
  pinQuestion: (id: string, qid: string, pinned: boolean) =>
    request<KitRecord>(`/api/kits/${id}/questions/${qid}/pin`, { method: "POST", body: JSON.stringify({ pinned }) }),
  addQuestion: (
    id: string,
    input: Pick<Question, "requirement_ids" | "category" | "prompt" | "answer_outline" | "difficulty">,
  ) => request<KitRecord>(`/api/kits/${id}/questions`, { method: "POST", body: JSON.stringify(input) }),
  deleteQuestion: (id: string, qid: string) =>
    request<KitRecord>(`/api/kits/${id}/questions/${qid}`, { method: "DELETE" }),
  reorderQuestions: (id: string, order: { id: string; category: QuestionCategory }[]) =>
    request<KitRecord>(`/api/kits/${id}/questions/reorder`, { method: "POST", body: JSON.stringify({ order }) }),
  regenerateQuestionCategory: (id: string, category: string) =>
    request<KitRecord>(`/api/kits/${id}/regenerate/questions/${category}`, { method: "POST" }),

  regenerateSchedule: (id: string, days?: number) =>
    request<KitRecord>(`/api/kits/${id}/regenerate/schedule`, {
      method: "POST",
      body: JSON.stringify(days ? { days } : {}),
    }),

  editFlashcard: (id: string, fid: string, patch: Partial<Pick<Flashcard, "front" | "back">>) =>
    request<KitRecord>(`/api/kits/${id}/flashcards/${fid}`, { method: "PATCH", body: JSON.stringify(patch) }),
  addFlashcard: (id: string, input: Pick<Flashcard, "front" | "back" | "requirement_ids">) =>
    request<KitRecord>(`/api/kits/${id}/flashcards`, { method: "POST", body: JSON.stringify(input) }),
  deleteFlashcard: (id: string, fid: string) =>
    request<KitRecord>(`/api/kits/${id}/flashcards/${fid}`, { method: "DELETE" }),

  getPracticeSession: (id: string) => request<PracticeSession>(`/api/kits/${id}/practice`),
  recordPracticeConfidence: (id: string, fid: string, confidence: number) =>
    request<PracticeSession>(`/api/kits/${id}/practice/${fid}`, {
      method: "POST",
      body: JSON.stringify({ confidence }),
    }),
};
