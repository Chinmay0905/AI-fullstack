# AI Interview Prep Kit

Turns a job description + a company URL into a structured interview prep kit — a company brief, role breakdown, a categorized question bank with coverage guarantees, flashcards, and a day-by-day study schedule — then lets you edit, reorder, and regenerate any part of it without losing your edits, and practice against the flashcards.

**Live deployment:** https://web-nine-ashen-79.vercel.app
**API:** https://ai-interview-prep-kit-api.onrender.com (Render free tier — the first request after idling takes ~30-50s to cold-start)
**Repo:** https://github.com/Chinmay0905/AI-fullstack

---

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js 16 (App Router) + Tailwind CSS v4 + React Query | Matches the brief's preferred stack. React Query handles the two things this UI actually needs — polling a kit while it generates, and optimistic cache updates after an edit — without hand-rolling either. |
| Backend | Node.js + Express | Matches the brief's preferred stack. A real long-running process (not a serverless function) fits the multi-step, tens-of-seconds generation pipeline naturally. |
| Database | MongoDB (Atlas free tier) | Matches the brief's preferred stack. The kit document is a nested, evolving structure (Appendix A shape plus builder-state extensions) — a document store fits it without an ORM/migration layer. |
| Language | TypeScript everywhere (including `shared/`) | The brief allows JS or TS; TS earns its keep here specifically because Appendix A's structure is validated with [Zod](https://zod.dev) schemas that are shared, unmodified, between the server (runtime validation) and the frontend (compile-time types) — one source of truth for the exact shape the batch output must match. |
| LLM | Google Gemini, model `gemini-3.5-flash-lite` | Free tier, generous enough for a normal kit (which costs the pipeline ~4-8 calls). Two other models were tried and dropped: `gemini-2.5-flash`/`gemini-3.6-flash` are either deprecated for new API keys or capped at 20 requests/**day**, which one kit alone can exhaust. |
| Scraping | Hand-rolled: `cheerio` for HTML parsing + a link-scoring ranker, no headless browser | The target pages (company marketing/careers sites) are static HTML almost universally; a full browser wasn't worth the latency/memory cost for this. |

This is an npm-workspaces monorepo: `shared/` (Zod schemas + TS types, used by both), `server/` (Express API + the generation pipeline + the batch entry point), `web/` (Next.js frontend).

---

## Setup

### Local development

Prerequisites: Node.js 20+, a MongoDB connection string (Atlas free tier or local), a Gemini API key ([aistudio.google.com/apikey](https://aistudio.google.com/apikey), free).

```bash
git clone https://github.com/Chinmay0905/AI-fullstack.git
cd AI-fullstack
npm install                        # also builds shared/ via postinstall
cp server/.env.example server/.env # fill in MONGODB_URI, GEMINI_API_KEY (see below)
cp web/.env.local.example web/.env.local  # defaults to http://localhost:4000, fine for local

npm run dev:server                 # http://localhost:4000
npm run dev:web                    # http://localhost:3000, in a second terminal
```

`server/.env` — the required variables (see `server/.env.example` for the full annotated list):

```
MONGODB_URI=mongodb+srv://...
SESSION_SECRET=<any long random string>
GEMINI_API_KEY=<your key>
CLIENT_ORIGINS=http://localhost:3000
ALLOW_PRIVATE_HOSTS=true   # only for local dev — see Security section below
```

`GOOGLE_CSE_API_KEY` / `GOOGLE_CSE_CX` (Google Programmable Search Engine, free tier) are optional — if unset, discussion search is skipped and reported honestly rather than failing the run (see Section 10's edge cases).

### The batch entry point (Section 9)

Runs the exact same pipeline the interactive app uses, no MongoDB required:

```bash
npm run evaluate -- --input <cases.json> --output <kits.json>
```

`cases.json` is an array of `{ "id", "jd", "company_url", "days" }` (Appendix B). `test-fixtures/cases.json` has three worked examples (a normal case, a thin two-line JD, and a deliberately-unreachable company), and `test-fixtures/kits.json` is real output from running them. `test-fixtures/serve.js` + `test-fixtures/site/` is a zero-dependency local company site for testing retrieval without hitting the real internet — start it with `node test-fixtures/serve.js` (serves `http://localhost:8099/`) and set `ALLOW_PRIVATE_HOSTS=true` to let the crawler reach it.

### Deployed setup

- **Backend (Render):** `render.yaml` at the repo root is a Blueprint — Render dashboard → New → Blueprint → point at this repo → fill in the secrets it prompts for (`MONGODB_URI`, `SESSION_SECRET`, `GEMINI_API_KEY`, `CLIENT_ORIGINS` = your deployed frontend URL). No `rootDir` is set in the blueprint since this is a workspaces monorepo — install/build/start all need repo root as their working directory for the `@aipk/shared` symlink to resolve. The install command explicitly passes `--include=dev`, because Render also exports `NODE_ENV=production` into the *build* step, and npm's default under that is to skip `devDependencies` — which is where `typescript`, `@types/*`, and `tsx` all live.
- **Frontend (Vercel):** deployed from the repo root with the Vercel project's Root Directory setting pointed at `web/` (Project Settings → Root Directory) — this makes Vercel upload the whole monorepo (needed to resolve `@aipk/shared`) while still building only the Next.js app. Set `NEXT_PUBLIC_API_URL` to the deployed backend URL as a Production environment variable.
- **Database:** MongoDB Atlas free (M0) tier. Network Access needs `0.0.0.0/0` — Render's free tier has no static outbound IP.

---

## LLM provider and model

**Google Gemini**, model **`gemini-3.5-flash-lite`**, via the `@google/genai` SDK. All calls go through `server/src/llm/geminiClient.ts`, which wraps every call with:
- **JSON-mode + schema-validated retries** — the model's response is parsed as JSON *and* checked against the Zod schema the caller expects; either failure (not-JSON, or valid-JSON-wrong-shape — the lite model occasionally returned an array where a string was asked for) triggers a bounded retry with the specific problem fed back to the model, not just "try again."
- **Backoff on both 429 (rate limit) and 503 (`UNAVAILABLE`/"high demand")** — free-tier Gemini returns both under load, and Section 10 explicitly calls out "your LLM provider rate-limits you, or briefly fails" as a case to handle, not a hypothetical.
- **Prompt-injection fencing** (`wrapUntrusted()`) — every piece of text that didn't originate as your own instruction to the model (crawled page content, the pasted JD, search snippets) is wrapped in `<untrusted_data source="...">` tags, with a standing system instruction never to treat that content as instructions. This matters concretely here: a company's own careers page is not something we wrote, and it's going straight into a prompt.

---

## Architecture

```
web/ (Next.js)  --fetch, credentials: include-->  server/ (Express)
                                                        |
                                    session (MongoDB-backed) + bcrypt auth
                                                        |
                                    src/pipeline/generateKit.ts  <-- the one
                                    orchestrator both the API route (via
                                    src/services/kitService.ts) and the
                                    batch entry point call
                                                        |
        +----------------+----------------+----------------+----------------+
        |                |                |                |                |
   retrieval/        extraction/      generation/       coverage/      scheduling/
   crawler, robots,  requirement      companyBrief,      (no LLM)        (no LLM)
   linkRanker,       Extractor        questionGenerator,
   discussionSearch                   flashcardGenerator
```

`shared/` sits underneath all of it: the Zod schemas in `shared/src/kit.ts` and `shared/src/batch.ts` are Appendix A/B, and both `server/` and `web/` import the same compiled package — the frontend's TypeScript types for a `Kit` are the exact same types the backend validates against at runtime, not a hand-kept-in-sync duplicate.

**Persistence model:** a `Kit` MongoDB document stores three things: the public `kit` (exactly the Appendix A shape, what the API returns), a private `meta` (crawled page contents + generation context — needed so "regenerate the company brief" doesn't have to re-crawl the live site, and never sent to the client), and `practice` (per-flashcard confidence records, Section 7). `server/src/routes/kits.ts` strips `meta` from every response.

---

## Retrieval approach and sources used

Two sources feed a kit besides the pasted JD:

1. **The company's own site**, crawled starting from the homepage (`server/src/retrieval/crawler.ts`). Rather than guessing paths (Section 2 is explicit that a fixed list isn't sufficient — the brief's own example is that GitLab and PostHog both publish detailed hiring info at unpredictable paths), every link found on the homepage is scored by a keyword/path heuristic (`server/src/retrieval/linkRanker.ts` — "careers", "jobs", "interview-process", "about", common ATS domains like `greenhouse.io`/`lever.co`, etc.), and the top-scoring candidates are fetched. If one of those looks like a hiring page, the crawler goes one level deeper from *its* links too — this is what actually finds a page like GitLab's `/jobs/ai-interview-process/`, which isn't linked from the homepage directly. Verified against the live deployment during testing: a real run against `about.gitlab.com` found and used that exact page.
2. **Public discussion of the interview process**, via Google Programmable Search Engine (optional — see Setup). If it's not configured, or returns nothing, that's recorded and the kit proceeds without it (Section 10: "public discussion turns up nothing at all" is an explicit edge case, not a failure).

Both respect `robots.txt` (`server/src/retrieval/robots.ts`) and are rate-limited against the target site (a fixed delay between requests, plus retry-with-backoff on individual page failures) — a single unreachable page is skipped and recorded, never fails the whole run (Section 2).

---

## Sequencing — what each step is responsible for

`server/src/pipeline/generateKit.ts` runs, in order:

1. **Crawl the company site** + **extract requirements from the JD**, in parallel (the JD needs no retrieval at all, so there's no reason to serialize these).
2. **Write the company brief** from whatever pages were actually fetched — if none were usable, this branch returns an honest "we could not retrieve..." brief instead of calling the LLM to guess (Section 10).
3. **Search for interview-process discussion**, folded together with any crawled hiring-page text into one "hiring process notes" block.
4. **Generate questions once per requirement *kind*** — technical, behavioural, domain — each a separate LLM call with different instructions (`server/src/generation/questionGenerator.ts`). This is deliberate, not incidental: "5+ years of React" and "mentors junior engineers" need genuinely different question-writing instructions, and the hiring-process-notes block from step 3 is folded into every one of these calls so the question *style* reacts to it — a company that describes a take-home + system-design round produces different questions from one that says nothing about its process.
5. **Check coverage** — deterministic, no LLM call (`server/src/coverage/coverageChecker.ts`): does every requirement have at least one question referencing it?
6. **If there are gaps, generate again — scoped to just the uncovered requirements** — the second pass (Section 4), reusing the exact same function as step 4, not a parallel implementation.
7. **Derive flashcards** from the finalized (post-gap-fill) question set — one per must-have requirement.
8. **Allocate the schedule** — deterministic, no LLM call (see below).
9. **Validate the whole kit** against the Appendix A Zod schema plus a cross-reference check (every `requirement_ids`/`question_ids` reference actually resolves) before it's ever persisted or returned.

Two of these (5 and 8) are explicitly required by the brief to be arithmetic, not model output — `coverageChecker.ts` and `scheduler.ts` have no import of the LLM client at all, and both have a dedicated test suite (`npm test`) asserting that directly.

**How many coverage passes, and why stop there:** two — the initial pass, plus one gap-filling pass. The question-generation prompt already instructs the model to reference exact requirement ids, and it's reliable at that in practice; a second call scoped to just what's missing closes nearly every real gap. More passes mostly burn free-tier token budget without meaningfully improving coverage. Anything still uncovered after pass 2 is recorded honestly in `coverage.uncovered_requirement_ids` rather than silently dropped or fabricated — see `server/src/pipeline/generateKit.ts` for the exact reasoning in context.

---

## Generated / edited / pinned state (the Builder)

Every question and flashcard carries an `origin` (`"generated" | "user_added" | "user_edited"`) and an optional `pinned` flag — extension fields alongside Appendix A's required ones, not replacing them. This is what makes "regenerate this category" safe:

- Anything in that category that's **pinned, user-added, or user-edited is left untouched.**
- Only **`"generated"`, unpinned** questions are replaced.
- Generation for the second pass is scoped to only the requirements **not already covered by a kept question** — so a requirement you've already hand-answered isn't redundantly regenerated.

(`server/src/services/kitService.ts::regenerateQuestionCategory`.) This was verified against the live deployment: editing a question flips it to `user_edited`; pinning another and regenerating that category left both of them byte-for-byte untouched while replacing the unprotected one with a fresh question covering the same requirement — and the schedule (which is rebuilt after any question-set change) picked up the edited text immediately.

**Frontend side of the same problem** (`web/src/components/EditableText.tsx`): the UI polls a generating kit every 1.5-2s, and a naive re-sync from that poll would overwrite whatever you're mid-typing. Each field tracks the last value *it itself* saved; an incoming prop update only overwrites local state when it *doesn't* match that — so the field's own save echoing back through a refetch is a no-op, but a genuine external change (a regeneration, a different tab) still refreshes it.

**Trade-off, stated plainly:** any structural change to the question set (regenerate/add/delete/reorder) rebuilds the schedule from scratch. There's no manual "keep my custom day arrangement" mode — every schedule view always reflects current state, which is simpler to reason about and guarantees the schedule never references a deleted question, at the cost of not preserving a hand-arranged day layout across an edit.

---

## Schedule allocation

`server/src/scheduling/scheduler.ts` — no LLM call. Every question gets a priority score (must-covering questions outrank nice-only ones outright, then difficulty breaks ties within that), the sorted list is split into `days_available` buckets round-robin, and each day's `minutes` is the sum of a per-question estimate (10/15/25 min by difficulty, +15 for a system-design question). This is what makes "harder and higher-priority material lands earlier" (Section 8) hold, and why a 60-day schedule against 3 questions produces 57 honest, empty "rest" days rather than padded content, and a 1-day schedule just puts everything on day 1. Covered by `server/src/scheduling/scheduler.test.ts`.

---

## Creative feature

Not added — the four required feature areas (research/generation sequencing, the Builder's state model, coverage/scheduling correctness, Practice Mode) took the full time budget to build and verify properly end to end, including against the real deployed stack, rather than leaving any of them shallow to make room for a fifth thing. Practice Mode's confidence-ordering (below) is the one piece of independent judgment in that area.

**Practice Mode ordering rationale** (Section 7 asks for either a simple confidence-weighted sort or a proper spaced-repetition interval, and to defend the choice): a plain confidence-ascending sort, not SM-2-style intervals. Each review here produces exactly one signal — a 1-5 confidence rating — with no recall-latency or actual-elapsed-time-since-last-review input feeding it. A real spaced-repetition scheduler needs more than that to be more than cosmetic; a confidence-ascending sort is honest about what the data actually supports. An unreviewed card sorts as confidence 0 — ahead of everything, since "never reviewed" is definitionally the least-confident case there is.

---

## Key design decisions, trade-offs, and known limitations

- **`system-design` category has no generation path.** The pipeline generates questions per requirement *kind* (technical → technical, behavioural → behavioural, domain → company-fit); there's no requirement kind that maps to `system-design`, so it only appears in a kit if a user adds one by hand via the Builder. Documented rather than hidden — the category exists in Appendix A's enum and is fully usable, it's just not automatically populated.
- **The batch entry point needs no MongoDB.** `server/src/config/env.ts` (pipeline-only vars) and `server/src/config/serverEnv.ts` (server-only: `MONGODB_URI`, `SESSION_SECRET`, `PORT`) are deliberately split, so `npm run evaluate` only requires `GEMINI_API_KEY` — matching Section 9's "needs no setup beyond your documented install step."
- **A "submitted twice" duplicate** (Section 10) reuses an in-flight kit rather than creating a second one, scoped to the same user + identical `(jd, companyUrl, days)` + within a 10-minute window of an existing `"generating"` kit — guards against an accidental double-submit re-triggering a second full generation, without blocking a deliberate second attempt later.
- **Security (Section 11):** `server/src/security/urlGuard.ts` centralizes URL validation for every fetch the app makes — rejects non-http(s) schemes and private/loopback IP ranges (SSRF), and caps response size/timeout/content-type before reading a body. `ALLOW_PRIVATE_HOSTS` exists only so the batch command can be tested against a local fixture site and is read independently of `NODE_ENV`, so a real deployment can't accidentally leave it on.
- **No manual day-by-day schedule editing** — see the Builder section above.
- **`.gitignore` had a real bug worth naming:** a bare `coverage/` pattern (meant for test-coverage-report output) was also matching the actual source directory `server/src/coverage/`, silently excluding it from every commit until caught by an unexpected `git status` diff. Verified fixed by cloning the repo fresh and running the exact documented batch command against it.
