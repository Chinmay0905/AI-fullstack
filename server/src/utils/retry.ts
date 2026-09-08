/** Shared exponential-backoff retry — used by both the crawler (Section 2:
 * "rate-limit your requests and back off on failure") and the Gemini client
 * (Section: free tiers rate-limit tokens/min, not just requests). */
export interface RetryOptions {
  retries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  /** Called before waiting, so callers can log/inspect the failure. */
  onRetry?: (error: unknown, attempt: number, delayMs: number) => void;
  /** Return false to abort retrying immediately for this error. */
  shouldRetry?: (error: unknown) => boolean;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withBackoff<T>(fn: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const retries = opts.retries ?? 3;
  const baseDelayMs = opts.baseDelayMs ?? 500;
  const maxDelayMs = opts.maxDelayMs ?? 8000;

  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (opts.shouldRetry && !opts.shouldRetry(err)) throw err;
      if (attempt === retries) break;
      const delay = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt) + Math.random() * 200;
      opts.onRetry?.(err, attempt + 1, delay);
      await sleep(delay);
    }
  }
  throw lastError;
}
