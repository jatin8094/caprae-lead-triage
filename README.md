## The feature and why this one

SaaSquatch's own site already advertises AI company scoring a revenue estimate,
advanced filters and CSV/Excel export  so the honest starting point isn't they
don't score leads it's what's opaque about how they do it, and what's still
missing around it.

Their scoring is a single number with no visible reasoning  you can't tell why one
company scored higher than another or retune it for a different ICP without asking
their team to change it. And nothing in their feature list addresses **duplicates**:
the same person re-appearing across sources or re-scrapes quietly inflating a rep's
list and wasting call time on someone already contacted.

Lead Triage is built around those two specific gaps not as a second scraper:

1. **Scores every row 0–100 with a visible breakdown** (title fit, industry fit, size
   fit, data quality) against an ICP defined in one config file
   (`src/types/lead.ts`) a sales-ops person can see *why* a lead scored the way it
   did and retune the weights themselves, without it being a black box.
2. **Deduplicates explicitly** — same email or same normalized company domain +
   person name — and keeps the highest-scoring copy of each real human with the
   duplicate flag visible in the UI rather than silently merged away.
3. **Enriches gaps** — fills missing industry/employee-count from the company domain
   through a pluggable provider interface (ships with a deterministic heuristic
   stand-in; swapping in Clearbit/Apollo/PDL in production is a one-file change).
4. **Exports back out** as CSV, filtered to whatever tier/view you're looking at, so
   it drops straight into a sequencer or CRM import — it's a layer that works on any
   scraper's export not a platform feature locked to one tool.

This is the "prioritize high-impact leads, minimize irrelevant data, integrate into
existing sales workflow" evaluation criterion, aimed specifically at the transparency
and cross-source dedup gap rather than re-building what already exists.

## Stack and architecture

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js 14 (App Router) + TypeScript + Tailwind | One deployable, server + client in the same repo, fast to ship in 5 hours |
| Backend | Next.js API routes (Node runtime) | No separate service to stand up; scales to a real Express/Fastify service later without touching the domain logic in `src/lib/` |
| Database | Prisma ORM → SQLite locally, Postgres in prod | `prisma/schema.prisma` is provider-agnostic; swap `datasource` to `postgresql` and point `DATABASE_URL` at Neon/RDS for prod — no query code changes |
| Caching | In-memory memoization in `EnrichmentProvider` (`src/lib/enrichment.ts`) | Never pay a real enrichment provider twice for the same domain; in prod this becomes a `domain -> result` table with a TTL |
| Hosting | Vercel (serverless functions for the API routes, static/ISR for the shell) | Zero-config for Next.js, scales to zero between imports, matches "serverless" from the brief |
| Deployment | `git push` → Vercel build hook, or `vercel --prod` | CI is Vercel's own build pipeline; add a GitHub Action for lint/typecheck before merge in a real rollout |

### Data flow

```
CSV upload
   -> parseLeadCsv()        normalize header synonyms (src/lib/csv.ts)
   -> enrichRow() x N        fill blanks, bounded-concurrency (src/lib/enrichment.ts)
   -> scoreLead()            ICP-fit score + tier (src/lib/scoring.ts)
   -> dedupeLeads()          email + domain/name clustering (src/lib/dedupe.ts)
   -> prisma.lead.create()   persisted, one row per import batch
Frontend
   -> GET /api/leads         filtered, sorted, server-side (tier, search, hide dupes)
   -> GET /api/leads/export  same filter, streamed back as CSV
```

Each step is its own pure(ish) module under `src/lib/` with no framework
dependency — they're unit-testable in isolation and the scoring weights /
ICP definition (`src/types/lead.ts`) are the one place a sales-ops person
would need to touch to retune it, without reading the pipeline code.

## Running it

```bash
npm install
cp .env.example .env          # SQLite by default, no setup needed
npx prisma generate
npx prisma db push            # creates dev.db with the Lead table
npm run dev                   # http://localhost:3000
```

Then drag `data/sample_leads.csv` onto the upload panel — it's a 15-row set with
a couple of intentional duplicates (same person, two source rows) and a mix of
decision-makers, adjacent titles and out-of-ICP company sizes, so the
scoring/dedup behavior is visible immediately.

**Note:** `npx prisma generate` downloads a query-engine binary from
`binaries.prisma.sh` — if you're behind a restrictive proxy/firewall, that step
needs outbound access to that host once. Everything else is regular npm.

## What I'd do next with more time

- Real enrichment provider (Clearbit/Apollo) behind the existing `EnrichmentProvider`
  interface, with the in-memory cache promoted to a `DomainEnrichment` table.
- Bulk actions (tag a filtered set, push selected hot leads to a CRM via webhook).
- A second ICP profile per campaign, so the same import can be scored two ways.
- Server-side pagination once imports go past a few thousand rows (current version
  loads the filtered set in one response, fine for a rep's working list, not fine
  at 50k rows).
- Tests for `scoring.ts` and `dedupe.ts` — pure functions, no excuse not to.

## Repo layout

```
src/
  app/
    page.tsx                 the single dashboard view
    api/leads/import/route.ts    POST — parse, enrich, score, dedupe, persist
    api/leads/route.ts           GET filtered list, DELETE (reset demo)
    api/leads/export/route.ts    GET filtered CSV
  components/                UploadPanel, StatsBar, FilterBar, LeadTable
  lib/                       csv.ts, scoring.ts, dedupe.ts, enrichment.ts, prisma.ts
  types/lead.ts               shared types + DEFAULT_ICP config
prisma/schema.prisma          Lead model
data/sample_leads.csv         demo import file
```
