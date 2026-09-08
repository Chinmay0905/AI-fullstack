import { guardedFetch, UrlValidationError } from "../security/urlGuard";
import { isCrawlAllowed } from "./robots";
import { cleanPage } from "./pageCleaner";
import { rankLinks, RankedLink, LinkKind } from "./linkRanker";
import { withBackoff, sleep } from "../utils/retry";

export interface CrawledPage {
  url: string;
  kind: LinkKind | "homepage";
  title: string;
  text: string;
}

export interface SkippedSource {
  url: string;
  reason: string;
}

export interface CrawlResult {
  pages: CrawledPage[];
  skipped: SkippedSource[];
}

export class CompanyUnreachableError extends Error {
  constructor(url: string, cause: unknown) {
    super(`company site unreachable: ${url} (${(cause as Error)?.message ?? cause})`);
    this.name = "CompanyUnreachableError";
  }
}

const REQUEST_DELAY_MS = 350; // rate-limit ourselves against the target site
const HOMEPAGE_LINK_BUDGET = 6;
const SECOND_LEVEL_LINK_BUDGET = 3;
const MAX_TEXT_CHARS = 8000; // keep per-page text bounded before it hits the LLM

async function fetchOne(url: string): Promise<{ title: string; text: string; links: { href: string; text: string }[] } | { skipped: string }> {
  const allowed = await isCrawlAllowed(url);
  if (!allowed) return { skipped: "disallowed by robots.txt" };

  try {
    const res = await withBackoff(() => guardedFetch(url), {
      retries: 2,
      baseDelayMs: 400,
      shouldRetry: (err) => !(err instanceof UrlValidationError),
    });
    if (!res.ok) return { skipped: `HTTP ${res.status}` };
    const cleaned = cleanPage(res.body, res.url);
    return { title: cleaned.title, text: cleaned.text.slice(0, MAX_TEXT_CHARS), links: cleaned.links };
  } catch (err) {
    return { skipped: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Crawl a company site starting from its homepage: fetch it, rank every
 * link found by how "hiring/about"-shaped it looks (Section 2 — "a fixed
 * list of paths is not sufficient"), fetch the top-scoring candidates, and
 * — if one of those looks like a hiring page — crawl one level deeper from
 * it, since companies like GitLab/PostHog nest the real detail (handbook
 * pages, "our interview process") a level below the careers page itself.
 */
export async function crawlCompanySite(companyUrl: string): Promise<CrawlResult> {
  const homepageResult = await fetchOne(companyUrl);
  if ("skipped" in homepageResult) {
    throw new CompanyUnreachableError(companyUrl, homepageResult.skipped);
  }

  const siteOrigin = new URL(companyUrl).origin;
  const pages: CrawledPage[] = [
    { url: companyUrl, kind: "homepage", title: homepageResult.title, text: homepageResult.text },
  ];
  const skipped: SkippedSource[] = [];
  const fetchedUrls = new Set([normalizeUrl(companyUrl)]);

  const ranked = rankLinks(homepageResult.links, siteOrigin);
  const firstBatch = ranked.slice(0, HOMEPAGE_LINK_BUDGET);

  let bestHiringLink: RankedLink | undefined;
  let bestHiringLinks: { href: string; text: string }[] = [];
  for (const link of firstBatch) {
    if (fetchedUrls.has(normalizeUrl(link.href))) continue;
    await sleep(REQUEST_DELAY_MS);
    const result = await fetchOne(link.href);
    fetchedUrls.add(normalizeUrl(link.href));
    if ("skipped" in result) {
      skipped.push({ url: link.href, reason: result.skipped });
      continue;
    }
    pages.push({ url: link.href, kind: link.kind, title: result.title, text: result.text });
    if (link.kind === "hiring" && (!bestHiringLink || link.score > bestHiringLink.score)) {
      bestHiringLink = link;
      bestHiringLinks = result.links;
    }
  }

  if (bestHiringLink) {
    const rankedDeep = rankLinks(bestHiringLinks, siteOrigin).filter(
      (l) => !fetchedUrls.has(normalizeUrl(l.href)),
    );
    for (const link of rankedDeep.slice(0, SECOND_LEVEL_LINK_BUDGET)) {
      await sleep(REQUEST_DELAY_MS);
      const result = await fetchOne(link.href);
      fetchedUrls.add(normalizeUrl(link.href));
      if ("skipped" in result) {
        skipped.push({ url: link.href, reason: result.skipped });
        continue;
      }
      pages.push({ url: link.href, kind: link.kind, title: result.title, text: result.text });
    }
  }

  return { pages, skipped };
}

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.origin + u.pathname.replace(/\/$/, "");
  } catch {
    return url;
  }
}
