/**
 * Section 11: every URL this app fetches is untrusted input — either typed
 * in by a user (company_url) or discovered while crawling. Two defenses:
 * (1) refuse to even attempt private/loopback targets in production (SSRF),
 * (2) cap what we accept back (content-type, byte size, timeout) so a
 * malicious or broken page can't stall the pipeline or exhaust memory.
 */
import { isIP } from "node:net";
import { env } from "../config/env";

const PRIVATE_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0"]);

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) return false;
  const [a, b] = parts;
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 127) return true; // 127.0.0.0/8 loopback
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local
  if (a === 0) return true; // 0.0.0.0/8
  return false;
}

function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  return lower === "::1" || lower.startsWith("fc") || lower.startsWith("fd") || lower.startsWith("fe80");
}

export function isPrivateOrLoopbackHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (PRIVATE_HOSTNAMES.has(h)) return true;
  if (h.endsWith(".local")) return true;
  const ipVersion = isIP(h);
  if (ipVersion === 4) return isPrivateIPv4(h);
  if (ipVersion === 6) return isPrivateIPv6(h);
  return false;
}

export class UrlValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UrlValidationError";
  }
}

/** Throws UrlValidationError if the URL is malformed, not http(s), or
 * (outside of ALLOW_PRIVATE_HOSTS) points at a private/loopback address.
 * ALLOW_PRIVATE_HOSTS exists only so the mandatory batch command (Section
 * 9) can be graded against company sites served from localhost — it must
 * be "false" in any real deployment. */
export function validateExternalUrl(rawUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new UrlValidationError(`not a valid URL: ${rawUrl}`);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new UrlValidationError(`unsupported protocol: ${parsed.protocol}`);
  }
  if (!env.ALLOW_PRIVATE_HOSTS && isPrivateOrLoopbackHost(parsed.hostname)) {
    throw new UrlValidationError(`refusing to fetch private/loopback host: ${parsed.hostname}`);
  }
  return parsed;
}

const DEFAULT_MAX_BYTES = 3 * 1024 * 1024; // 3MB — a page, not a video
const DEFAULT_TIMEOUT_MS = 10_000;
// Default is HTML-page crawling (Section 11's "restrict to expected content
// types"). Callers hitting a known JSON API (e.g. discussionSearch.ts)
// override this via opts.allowedContentTypes rather than loosening the
// default, which stays scoped to arbitrary/untrusted page fetches.
const DEFAULT_ALLOWED_CONTENT_TYPES = ["text/html", "text/plain", "application/xhtml+xml"];

export interface GuardedFetchResult {
  ok: boolean;
  status: number;
  url: string;
  contentType: string | null;
  body: string;
}

/** Fetch with a timeout, a content-type allowlist, and a hard byte cap on
 * the body — protects the pipeline from slow/huge/wrong-type responses on
 * pages we did not write and do not control. */
export async function guardedFetch(
  rawUrl: string,
  opts: { maxBytes?: number; timeoutMs?: number; allowedContentTypes?: string[] } = {},
): Promise<GuardedFetchResult> {
  const url = validateExternalUrl(rawUrl);
  const maxBytes = opts.maxBytes ?? DEFAULT_MAX_BYTES;
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const allowedContentTypes = opts.allowedContentTypes ?? DEFAULT_ALLOWED_CONTENT_TYPES;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": "ai-interview-prep-kit/1.0 (+research bot)" },
    });

    const contentType = res.headers.get("content-type");
    const baseType = contentType?.split(";")[0]?.trim().toLowerCase() ?? "";
    if (contentType && !allowedContentTypes.some((t) => baseType === t)) {
      return { ok: false, status: res.status, url: res.url, contentType, body: "" };
    }

    const reader = res.body?.getReader();
    if (!reader) {
      const text = await res.text();
      return { ok: res.ok, status: res.status, url: res.url, contentType, body: text.slice(0, maxBytes) };
    }

    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        break;
      }
      chunks.push(value);
    }
    const body = Buffer.concat(chunks).toString("utf-8");
    return { ok: res.ok, status: res.status, url: res.url, contentType, body };
  } finally {
    clearTimeout(timer);
  }
}
