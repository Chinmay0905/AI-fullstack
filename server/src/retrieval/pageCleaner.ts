import * as cheerio from "cheerio";

export interface CleanedPage {
  title: string;
  text: string;
  links: { href: string; text: string }[];
}

const NOISE_SELECTORS = [
  "script",
  "style",
  "noscript",
  "svg",
  "nav",
  "footer",
  "header",
  "iframe",
  "[aria-hidden='true']",
  ".cookie-banner",
  "#cookie-banner",
];

/** Strips boilerplate/markup and returns (a) plain readable text for the
 * LLM to read, and (b) the raw link list for the crawler to rank — kept
 * separate so link discovery still works even on pages whose main content
 * area we clean aggressively. */
export function cleanPage(html: string, baseUrl: string): CleanedPage {
  const $ = cheerio.load(html);
  const title = $("title").first().text().trim();

  const links: { href: string; text: string }[] = [];
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    try {
      const resolved = new URL(href, baseUrl).toString();
      links.push({ href: resolved, text: $(el).text().trim().replace(/\s+/g, " ") });
    } catch {
      // malformed href, ignore
    }
  });

  NOISE_SELECTORS.forEach((sel) => $(sel).remove());

  const text = $("body")
    .text()
    .replace(/\s+/g, " ")
    .replace(/ ,/g, ",")
    .trim();

  return { title, text, links };
}
