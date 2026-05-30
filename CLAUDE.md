# CLAUDE.md — BioTracker

Context for Claude Code (and humans) working on this repo. This environment is
ephemeral, so this file is the durable memory of how the project is built and
deployed.

## What this is

A health-tracking web app that unifies **Apple Health daily metrics** (resting
HR, HRV, steps, exercise minutes, walking HR, flights, active calories) and
**lab biomarkers** extracted from uploaded medical reports, into one dark,
editorial recovery dashboard. Ground-up rebuild of an earlier Replit project.

Live: https://bio-tracker-rouge.vercel.app

## Stack

- **Framework:** Next.js 15 (App Router) + React 19 + TypeScript
- **Styling:** Tailwind CSS v3 (palette + fonts wired in `tailwind.config.ts`)
- **Charts:** Recharts
- **DB / Auth / Storage:** Supabase (Postgres + magic-link auth + private bucket)
- **AI:** Anthropic API — model `claude-opus-4-8` (extraction + recommendations)
- **Hosting:** Vercel · **CDN/front (optional):** Cloudflare (see `DEPLOY.md`)

## Commands

```bash
npm run dev        # local dev at http://localhost:3000
npm run typecheck  # tsc --noEmit
npm run build      # production build (run before committing non-trivial changes)
npm run lint       # eslint
```

Always run `npm run typecheck && npm run build` before pushing — CI parity.

## Conventions

- **Design system:** Fraunces (display serif), JetBrains Mono (metrics, tabular
  figures), Inter (body), loaded via `next/font` in `app/layout.tsx`. Colours
  live in `lib/theme.ts` **and** `tailwind.config.ts` — keep them in sync. Use
  Tailwind classes for layout; pass raw hex from `palette` to Recharts (it needs
  strings).
- **Data contract:** `DailyMetric` (`lib/health-data.ts`) is the shape the whole
  dashboard depends on. The DB → UI mapping lives in `lib/queries.ts`.
- **Demo mode:** When Supabase env vars are absent, or the user is signed out,
  the app falls back to the bundled sample dataset so the dashboard always
  renders. Don't break this fallback.
- **Analytics:** rolling averages / KPI deltas / chart series are pure functions
  in `lib/analytics.ts`.
- **Server vs client Supabase:** `lib/supabase/{client,server,middleware}.ts`.
  Use the service-role client (`createServiceClient`) only in server-only routes
  (the ingest webhook); never expose it to the browser.

## Layout

```
app/                     App Router: layout, dashboard page, login, auth routes
  api/ingest/metrics     Apple Health webhook (per-user bearer token)
  api/upload/metrics     authenticated CSV/JSON metrics upload
  api/reports            report upload → Claude extraction → biomarkers
  api/recommendations    biomarkers + activity → Claude recommendations
  settings|upload|reports  secondary pages (Connect / Upload / Biomarkers)
components/              dashboard/, charts/, biomarkers/, upload/, settings/
lib/                     theme, health-data, analytics, queries, ingest,
                         supabase/, anthropic/
supabase/migrations/     0001_init.sql, 0002_storage.sql (RLS on every table)
```

## Backend facts (Supabase project `biotracker`)

- Project ref: `fuaclfgoyprcotauzuae` · region us-west-1 · org AlignMoney
- Tables (all RLS-protected, keyed on `auth.uid()`): `profiles`,
  `daily_metrics`, `reports`, `biomarkers`, `ingest_tokens`
- Private storage bucket `reports`, per-user folder policies
- `handle_new_user` trigger creates a profile on signup; its RPC EXECUTE is
  revoked from anon/authenticated (security advisor clean)

## Environment variables

Names only — never commit values. See `.env.example` / `DEPLOY.md`.

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — public
- `SUPABASE_SERVICE_ROLE_KEY` — server-only; powers the ingest webhook
- `ANTHROPIC_API_KEY` — enables extraction + recommendations
- `NEXT_PUBLIC_SITE_URL` — optional; the app otherwise derives origin client-side

The app degrades gracefully: no Anthropic key → extraction/AI disabled but
upload/dashboard work; no service-role key → webhook 503 but manual upload works.

## Domain constraints (don't relitigate)

- **Apple Health has no web API.** HealthKit is device-only. Sync is via a
  per-user token + webhook (`/api/ingest/metrics`) that accepts Health Auto
  Export / Apple Shortcuts JSON, plus manual CSV/JSON upload. Do not attempt a
  direct "connect Apple Health" OAuth — it does not exist.
- **Biomarker extraction** uses Claude's native PDF/image understanding +
  structured outputs (`output_config.format`) + prompt caching on the
  instruction block. Don't add a separate PDF text-extraction dependency.

## Git / deploy workflow

- Default + production branch: **`main`** (Vercel deploys `main` → production).
- Work on feature branches → open a PR into `main` → Vercel posts a **preview
  deploy** on the PR → merge → production deploy.
- After pushing a branch, open a **draft PR** into `main`.
- Auth note: production magic links require the deployed URL in Supabase →
  Authentication → URL Configuration (Site URL + Redirect URLs). Add
  `http://localhost:3000` there only for local login.
