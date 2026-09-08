/**
 * Section 2/3: "companies bury [the hiring page] in different places... a
 * fixed list of paths is not sufficient." So instead of guessing paths, we
 * score every link found on a crawled page by how much it *looks* like a
 * hiring/about page, and let the crawler fetch whatever scores highest —
 * genuinely different pages win for different companies.
 */
const SKIP_EXTENSIONS = /\.(pdf|jpg|jpeg|png|gif|svg|zip|mp4|mp3|css|js|ico|woff2?|xml|json)(\?|$)/i;

const HIRING_KEYWORDS: [RegExp, number][] = [
  [/\bcareers?\b/i, 10],
  [/\bjobs?\b/i, 9],
  [/\bhiring\b/i, 9],
  [/\bopenings?\b/i, 8],
  [/\bpositions?\b/i, 7],
  [/\bjoin[-_ ]?us\b/i, 8],
  [/\bwork[-_ ]?with[-_ ]?us\b/i, 7],
  [/\binterview(ing)?[-_ ]?process\b/i, 10],
  [/\binterview(s|ing)?\b/i, 6],
  [/\bhandbook\b/i, 7],
  [/\blife[-_ ]?at\b/i, 6],
  [/\bculture\b/i, 5],
  [/\bteam\b/i, 3],
  [/\bengineering[-_ ]?blog\b/i, 6],
  [/\bblog\b/i, 3],
];

const ABOUT_KEYWORDS: [RegExp, number][] = [
  [/\babout[-_ ]?us\b/i, 8],
  [/\babout\b/i, 6],
  [/\bcompany\b/i, 5],
  [/\bmission\b/i, 4],
  [/\bwho[-_ ]?we[-_ ]?are\b/i, 6],
];

// Common external ATS/job-board hosts — companies frequently host hiring
// content off their own domain entirely, so cross-origin links here are
// worth following even though most other cross-origin links are not.
const KNOWN_ATS_HOSTS = [
  "greenhouse.io",
  "lever.co",
  "myworkday.com",
  "smartrecruiters.com",
  "ashbyhq.com",
  "bamboohr.com",
  "workable.com",
  "breezy.hr",
  "recruitee.com",
];

export type LinkKind = "hiring" | "about" | "other";

export interface RankedLink {
  href: string;
  text: string;
  score: number;
  kind: LinkKind;
}

function isKnownAtsHost(hostname: string): boolean {
  return KNOWN_ATS_HOSTS.some((h) => hostname.endsWith(h));
}

export function rankLinks(
  links: { href: string; text: string }[],
  siteOrigin: string,
): RankedLink[] {
  const seen = new Set<string>();
  const ranked: RankedLink[] = [];

  for (const link of links) {
    let url: URL;
    try {
      url = new URL(link.href);
    } catch {
      continue;
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") continue;
    if (SKIP_EXTENSIONS.test(url.pathname)) continue;

    const normalized = url.origin + url.pathname.replace(/\/$/, "");
    if (seen.has(normalized)) continue;

    const sameOrigin = url.origin === siteOrigin;
    const isAts = isKnownAtsHost(url.hostname);
    if (!sameOrigin && !isAts) continue; // stay on-site, except known ATS hosts

    const haystack = `${url.pathname} ${link.text}`;
    let score = isAts ? 5 : 0;
    let kind: LinkKind = "other";

    for (const [re, weight] of HIRING_KEYWORDS) {
      if (re.test(haystack)) {
        score += weight;
        kind = "hiring";
      }
    }
    for (const [re, weight] of ABOUT_KEYWORDS) {
      if (re.test(haystack)) {
        score += weight;
        if (kind !== "hiring") kind = "about";
      }
    }

    // Shallow paths are more likely to be primary nav items than deep
    // content pages; a small bonus keeps top-level /careers ahead of e.g.
    // /blog/2019/some-unrelated-post that happens to mention "team".
    const depth = url.pathname.split("/").filter(Boolean).length;
    score += Math.max(0, 3 - depth);

    if (score <= 0) continue;
    seen.add(normalized);
    ranked.push({ href: url.toString(), text: link.text, score, kind });
  }

  return ranked.sort((a, b) => b.score - a.score);
}
