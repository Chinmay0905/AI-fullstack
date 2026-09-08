/** Single place that turns a thrown pipeline error into the {code, message}
 * shape Appendix B's batch output uses — shared by the batch script and
 * the API route so both report failures the same way (Section 9: "the
 * same code your application uses, not a parallel implementation"). */
import { CompanyUnreachableError } from "../retrieval/crawler";
import { UrlValidationError } from "../security/urlGuard";
import { LlmInvalidJsonError, LlmTransientError } from "../llm/geminiClient";

export type BatchErrorCode =
  | "COMPANY_UNREACHABLE"
  | "INVALID_COMPANY_URL"
  | "LLM_FAILURE"
  | "INVALID_KIT_STRUCTURE"
  | "UNKNOWN_ERROR";

export class InvalidKitStructureError extends Error {
  constructor(details: string) {
    super(`generated kit failed structure validation: ${details}`);
    this.name = "InvalidKitStructureError";
  }
}

export function classifyPipelineError(err: unknown): { code: BatchErrorCode; message: string } {
  if (err instanceof CompanyUnreachableError) {
    return { code: "COMPANY_UNREACHABLE", message: err.message };
  }
  if (err instanceof UrlValidationError) {
    return { code: "INVALID_COMPANY_URL", message: err.message };
  }
  if (err instanceof InvalidKitStructureError) {
    return { code: "INVALID_KIT_STRUCTURE", message: err.message };
  }
  if (err instanceof LlmInvalidJsonError || err instanceof LlmTransientError) {
    return { code: "LLM_FAILURE", message: err.message };
  }
  const message = err instanceof Error ? err.message : String(err);
  return { code: "UNKNOWN_ERROR", message };
}
