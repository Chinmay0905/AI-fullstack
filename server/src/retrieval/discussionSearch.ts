/**
 * Section 2/3: "look for public discussion of that company's interview
 * process." Uses Google Programmable Search Engine's free tier (100
 * queries/day). If it isn't configured, or returns nothing, that's not a
 * failure — Section 10 explicitly lists "public discussion turns up
 * nothing at all" as an edge case to report honestly, not fake.
 */
import { env } from "../config/env";
import { withBackoff } from "../utils/retry";
import { guardedFetch } from "../security/urlGuard";

export interface DiscussionResult {
  title: string;
  url: string;
  snippet: string;
}

export interface DiscussionSearchOutcome {
  results: DiscussionResult[];
  skippedReason: string | null;
}

const SEARCH_ENDPOINT = "https://www.googleapis.com/customsearch/v1";

export async function searchInterviewDiscussion(companyName: string): Promise<DiscussionSearchOutcome> {
  if (!env.GOOGLE_CSE_API_KEY || !env.GOOGLE_CSE_CX) {
    return { results: [], skippedReason: "discussion search not configured (GOOGLE_CSE_API_KEY/GOOGLE_CSE_CX unset)" };
  }
  if (!companyName.trim()) {
    return { results: [], skippedReason: "no company name to search for" };
  }

  const query = `${companyName} interview process questions`;
  const url = new URL(SEARCH_ENDPOINT);
  url.searchParams.set("key", env.GOOGLE_CSE_API_KEY);
  url.searchParams.set("cx", env.GOOGLE_CSE_CX);
  url.searchParams.set("q", query);
  url.searchParams.set("num", "6");

  try {
    const res = await withBackoff(
      async () => {
        const r = await guardedFetch(url.toString(), {
          timeoutMs: 8000,
          allowedContentTypes: ["application/json"],
        });
        if (r.status === 429) throw new RateLimitedError();
        if (!r.ok) throw new Error(`search failed: HTTP ${r.status}`);
        return r;
      },
      { retries: 2, baseDelayMs: 800, shouldRetry: (err) => err instanceof RateLimitedError },
    );

    const data = JSON.parse(res.body) as { items?: { title: string; link: string; snippet: string }[] };
    const results = (data.items ?? []).map((item) => ({
      title: item.title,
      url: item.link,
      snippet: item.snippet,
    }));
    return { results, skippedReason: results.length === 0 ? "search returned no results" : null };
  } catch (err) {
    return {
      results: [],
      skippedReason: `discussion search failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

class RateLimitedError extends Error {
  constructor() {
    super("rate limited");
  }
}
