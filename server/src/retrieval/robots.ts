import robotsParser from "robots-parser";
import { guardedFetch } from "../security/urlGuard";

type Robots = ReturnType<typeof robotsParser>;

const USER_AGENT = "ai-interview-prep-kit/1.0 (+research bot)";
const cache = new Map<string, Robots | null>();

async function getRobots(origin: string): Promise<Robots | null> {
  if (cache.has(origin)) return cache.get(origin)!;
  const robotsUrl = `${origin}/robots.txt`;
  try {
    const res = await guardedFetch(robotsUrl, { timeoutMs: 5000, maxBytes: 200_000 });
    const robots = res.ok ? robotsParser(robotsUrl, res.body) : null;
    cache.set(origin, robots);
    return robots;
  } catch {
    // No robots.txt, or it's unreachable — treat as "everything allowed",
    // same as most crawlers do by default.
    cache.set(origin, null);
    return null;
  }
}

export async function isCrawlAllowed(url: string): Promise<boolean> {
  const parsed = new URL(url);
  const robots = await getRobots(parsed.origin);
  if (!robots) return true;
  return robots.isAllowed(url, USER_AGENT) ?? true;
}
