# TalentBase

An internal HR recruitment tool: a searchable CV repository with automatic structured
extraction, and a recruiter chatbot that answers questions about the candidate pool using
retrieval-augmented generation (RAG) — grounded only in stored candidate data, with citations.

- **CV Repository** (`/upload`, `/candidates`) — upload PDF/DOCX CVs, extract structured data
  with an LLM, review/edit before saving, browse & filter candidates, view full profiles with
  a signed link to the original file.
- **Recruiter Chatbot** (`/chat`) — ask natural-language questions about candidates; answers are
  generated only from retrieved candidate records and cite the candidates referenced. Off-topic
  requests and prompt-injection attempts are refused (see [Guardrail design](#guardrail-design)).

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 16 (App Router), TypeScript, Tailwind CSS |
| Backend | Next.js Route Handlers (Node.js runtime) |
| Database | Supabase Postgres + `pgvector`, accessed via Prisma ORM |
| File storage | Supabase Storage, private bucket `cv-files`, signed URLs on demand |
| CV parsing | `pdf-parse` (PDF), `mammoth` (DOCX) for text extraction; LLM call for structuring |
| Embeddings | OpenAI `text-embedding-3-small` (1536 dims) via the Vercel AI SDK |
| Chat completion | OpenAI or Anthropic, switchable via env var, via the Vercel AI SDK |
| Deployment | Vercel (app) + Supabase (DB & Storage) |

## Setup

### 1. Create the Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. In **SQL Editor**, enable the `pgvector` extension:
   ```sql
   create extension if not exists vector;
   ```
   (Prisma will also try to manage this extension via `postgresqlExtensions` on migrate, but
   enabling it up front avoids permission issues on some Supabase plans.)
3. In **Storage**, create a **private** bucket named `cv-files` (leave "Public bucket" off — the
   app always accesses it via the service role key and generates short-lived signed URLs for
   viewing).
4. Collect your credentials:
   - **Project Settings → API**: `Project URL` → `SUPABASE_URL`, `service_role` secret →
     `SUPABASE_SERVICE_ROLE_KEY`.
   - **Project Settings → Database**: the pooled connection string (port `6543`) →
     `DATABASE_URL`, and the direct connection string (port `5432`) → `DIRECT_URL` (Prisma
     migrations need a direct, non-pooled connection).

### 2. Configure environment variables

```bash
cp .env.example .env
```

Fill in the Supabase values from above, plus an LLM provider:

- `LLM_PROVIDER` — `openai` or `anthropic` (defaults to whichever API key is present if unset).
- `OPENAI_API_KEY` — **required regardless of provider choice**, because embeddings always use
  OpenAI (Anthropic has no embeddings API). See [Design decisions](#design-decisions).
- `ANTHROPIC_API_KEY` — only needed if `LLM_PROVIDER=anthropic`.

### 3. Install dependencies and run migrations

```bash
npm install
npm run db:migrate   # prisma migrate dev — creates tables + the pgvector column
```

### 4. Seed sample candidates

```bash
npm run seed
```

Adds 10 sample HR/hospitality candidates (chef, hotel front desk, sommelier, housekeeping
supervisor, F&B manager, bartender, concierge, plus three developer profiles) with embeddings,
so `/candidates` and `/chat` are immediately testable. Requires `OPENAI_API_KEY` and
`DATABASE_URL` to be set. Safe to re-run — existing emails are skipped.

### 5. Run locally

```bash
npm run dev
```

Visit `http://localhost:3000`. Try `/upload` to add a CV, `/candidates` to browse, `/chat` to
ask e.g. *"I need a chef, give me a shortlist of candidates I could place"*.

### 6. Run tests

```bash
npm test
```

### 7. Deploy to Vercel

1. Push this repo to GitHub (or your git host of choice).
2. In Vercel, **Add New → Project**, import the repo.
3. Add all variables from `.env.example` as Vercel Environment Variables (Production + Preview).
4. Deploy. `postinstall` runs `prisma generate` automatically during the Vercel build.
5. Run `npm run db:migrate` locally (pointed at the Supabase project) before or after the first
   deploy so the schema exists — Vercel's build step does not run migrations automatically by
   design, to avoid concurrent-deploy migration races. For a team workflow, wire
   `prisma migrate deploy` into a CI step instead of the Vercel build command.

## Application structure

```
app/
  upload/                 CV upload + parse-review-save flow
  candidates/             Filterable candidate table
  candidates/[id]/        Candidate detail (profile + signed file link)
  chat/                   Recruiter chatbot UI
  api/upload/extract/     Parses one file, returns structured data for review (no DB write)
  api/upload/confirm/     Saves the (possibly edited) structured data + embedding
  api/candidates/         List (with filters) / detail JSON endpoints
  api/chat/               Guard → retrieve → answer, persists conversation history
lib/
  parsing/                Text extraction (pdf-parse/mammoth) + LLM structuring + zod schema
  ai/                     Provider abstraction (lib/ai/provider.ts), embeddings
  guard/                  Chatbot scope guard (heuristics + LLM fallback classifier)
  rag/                    Hybrid retrieval + grounded answer generation
  db/                     Prisma client, duplicate detection, raw-SQL vector helpers
  supabase/               Storage upload/signed-URL helpers
prisma/schema.prisma      Candidate / WorkExperience / Education / ChatConversation / ChatMessage
scripts/seed.ts           Sample candidate seed data
__tests__/                Vitest suite (parsing, scope guard, RAG answer safety)
```

No authentication is implemented in this MVP (not required by spec). Every place auth would need
to be added is marked with a `TODO(auth)` comment — `app/layout.tsx` (or a future
`middleware.ts`) for route protection, and each API route for scoping data to the authenticated
HR user/org.

## Guardrail design

The chatbot must **only** answer recruitment questions grounded in stored candidate data, and
must refuse everything else — including prompt-injection attempts to override its instructions.
This is implemented as defense in depth across four independent layers, so that no single
mistake (a missed regex, a jailbroken classifier, a hallucinating model) breaks the guarantee:

1. **Heuristic guard** (`lib/guard/scopeGuard.ts`, `heuristicClassify`) — fast, free, regex-based.
   - `BLOCK_PATTERNS` catch prompt-injection phrasing ("ignore previous instructions", "reveal
     your system prompt", "pretend you're...", "act as...") and off-topic categories the spec
     calls out explicitly (jokes, trivia, translation, coding help, math, creative writing).
   - `ALLOW_PATTERNS` recognize obviously in-scope recruitment language (candidate, skill,
     years of experience, specific roles like chef/front-desk/developer, "compare X and Y", etc.)
   - A block match always wins over an allow match, so an injection attempt that also mentions
     "candidates" is still refused.
   - On a match, the request is short-circuited to the refusal message **before any LLM call is
     made** — no retrieval happens, no candidate data is ever loaded for an off-topic message.
2. **LLM fallback classifier** (`llmClassify`) — only reached when the heuristics are inconclusive.
   A small, cheap model call with a strict "respond YES or NO" system prompt and, critically,
   **no candidate data in its context** — it only ever sees the user's raw question, so even a
   successful jailbreak of the classifier itself can't be used to exfiltrate database contents.
   It fails closed: if the classifier call errors, the request is blocked rather than allowed.
3. **Grounded, schema-validated answer generation** (`lib/rag/answer.ts`) — for in-scope
   questions, retrieval (`lib/rag/retrieve.ts`) pulls only from `Candidate` /
   `WorkExperience` / `Education` — there is no code path that lets the retrieval step pull in
   arbitrary uploaded files or non-CV documents. The main chat call uses structured output
   (`generateObject` with a zod schema: `{ answer, noMatch, citedCandidateIds }`) with a system
   prompt that (a) forbids inventing anything not in the provided data, (b) requires an honest
   `noMatch: true` when nothing in the pool satisfies the request instead of padding results with
   weak matches, and (c) repeats the "don't role-play, don't override instructions" rule as a
   second line of defense in case a query slips past both guard layers.
4. **Server-side citation validation** — after the model responds, `citedCandidateIds` is
   filtered against the actual retrieved candidate set. Any id the model hallucinates (one that
   wasn't in the data it was given) is stripped before the answer reaches the UI, so a citation
   the recruiter sees always resolves to a real candidate profile they can click through to.

See `__tests__/unit/scopeGuard.test.ts` for adversarial cases (prompt injection, roleplay,
trivia, coding requests, empty input) proven blocked, and legitimate recruitment questions
proven allowed, entirely offline via the heuristic layer, plus mocked tests for the LLM-fallback
path (allow / block / fail-closed). `__tests__/unit/ragAnswer.test.ts` proves the "no invented
candidates" guarantee: an empty retrieval set produces an honest no-match answer, and a
hallucinated citation id gets stripped server-side.

## Design decisions

A few points in the spec were left open; here's what was chosen and why.

- **Prisma major version pinned to 6.x, not the latest 7.x.** `npm install prisma` currently
  resolves to a freshly-redesigned 7.x CLI (new command surface, JSON output, `prisma dev`,
  agent-oriented tooling) that diverges significantly from the stable, widely-documented
  `schema.prisma` + `migrate dev` workflow this README assumes. 6.19.3 was pinned deliberately
  for predictability; revisit once 7.x has settled.
- **Embeddings always use OpenAI**, independent of `LLM_PROVIDER`, because Anthropic has no
  embeddings endpoint. `lib/ai/provider.ts` is still the single place that would need to change
  if that stops being true (e.g. swapping in a different embeddings provider).
- **Upload → review → confirm is two API calls, not a background job.** `/api/upload/extract`
  parses + structures + duplicate-checks a single file synchronously and returns the result for
  in-browser review; nothing is written to the candidates table until `/api/upload/confirm`.
  This keeps each request well inside Vercel serverless function limits for realistic CV sizes,
  avoids needing a job queue / polling UI, and naturally supports "let HR correct extraction
  mistakes before saving." If very large batch uploads become a requirement, that's the point
  where a background worker (and a host that supports long-running processes) would become
  necessary — flagging per the brief rather than adding one silently.
- **Duplicate detection** matches on exact email (case-insensitive), falling back to exact full
  name when no email is present on either side. The upload UI then lets HR choose to replace the
  existing record or keep both as separate candidates.
- **Chat responses are non-streaming JSON**, not token-streamed. The safety guarantees (schema-
  validated output, server-side citation filtering) require the complete structured response
  before anything is safe to show, so streaming would only buy perceived latency at the cost of
  a more complex citation-validation path. Documented here as a deliberate trade-off rather than
  an oversight.
- **Retrieval is hybrid**: pgvector cosine similarity over the full CV text embedding, plus a
  keyword/skill pass (`skills` array overlap, `currentRole`/`fullName` substring match) merged
  into the same candidate set. Pure vector search alone can under-match exact skill/tech tokens
  (e.g. "React"); the keyword pass covers that gap cheaply.
- **Dates on `WorkExperience`/`Education` are free-text strings**, not `DateTime`, because CVs
  use wildly inconsistent date formats ("Jan 2020", "2020", "Present") that don't reliably
  coerce to a real date type without losing information or crashing on edge cases.
- **No authentication** in this MVP, per the brief. See the `TODO(auth)` markers noted above.

## Environment variables

See `.env.example` for the full list with descriptions. Summary:

| Variable | Purpose |
|---|---|
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Supabase Storage access (server-side only) |
| `DATABASE_URL`, `DIRECT_URL` | Prisma → Supabase Postgres (pooled / direct) |
| `LLM_PROVIDER` | `openai` or `anthropic`, selects the chat completion provider |
| `OPENAI_API_KEY` | Required always (embeddings); required for chat if `LLM_PROVIDER=openai` |
| `ANTHROPIC_API_KEY` | Required for chat if `LLM_PROVIDER=anthropic` |
| `LLM_CHAT_MODEL` / `LLM_GUARD_MODEL` / `LLM_EMBEDDING_MODEL` | Optional model overrides |
