# BioTracker

A health-tracking web app that unifies **Apple Health daily metrics** (resting
HR, HRV, steps, exercise minutes, walking HR, flights, active calories) and
**lab biomarkers** (extracted from uploaded medical reports) into one dark,
editorial recovery dashboard — with AI recommendations that read your activity
and labs together.

Ground-up rebuild of an earlier Replit project on a modern, self-hostable stack.

**Live:** https://bio-tracker-rouge.vercel.app

> Not medical advice. For informational tracking only.

## Stack

| Concern            | Choice                                              |
| ------------------ | --------------------------------------------------- |
| Framework          | Next.js 15 (App Router) + React 19 + TypeScript     |
| Styling            | Tailwind CSS v3                                      |
| Charts             | Recharts                                             |
| Database / Auth / Storage | Supabase (Postgres + magic-link auth + private bucket) |
| AI                 | Anthropic API — Claude `claude-opus-4-8`            |
| Hosting            | Vercel                                              |
| Edge / CDN (optional) | Cloudflare (see [`DEPLOY.md`](./DEPLOY.md))      |

## Features

**Recovery dashboard** — responsive (mobile + desktop), matched to the reference
design: Fraunces display serif, JetBrains Mono tabular metrics, film-grain
panels, per-metric glows. Four chart views (Heart RHR vs HRV, Activity/steps,
Walking HR, Exercise minutes) with 30/60/90-day ranges and 7-day rolling trends,
plus KPI cards comparing the first vs last 14 days.

**Auth** — passwordless magic-link sign-in via Supabase (replaces the original
Replit Auth). Route protection via middleware.

**Data, private per user** — Postgres with row-level security on every table
(`profiles`, `daily_metrics`, `reports`, `biomarkers`, `ingest_tokens`) and a
private storage bucket for reports.

**Apple Health ingestion** — HealthKit has no web API, so syncing is via a
per-user token + webhook (`/api/ingest/metrics`) that accepts Health Auto Export
/ Apple Shortcuts JSON, plus manual CSV/JSON upload in the UI.

**Biomarker extraction** — upload a PDF/image/CSV lab report and Claude extracts
structured biomarkers (values, units, reference ranges, status) using native
document understanding + structured outputs + prompt caching.

**AI recommendations** — Claude folds out-of-range biomarkers together with
recent activity KPIs into specific, prioritised lifestyle recommendations.

**Demo mode** — with no Supabase env (or signed out), the dashboard falls back
to a bundled sample dataset so it always renders.

## Getting started

```bash
npm install
cp .env.example .env.local   # optional — demo mode works without it
npm run dev                  # http://localhost:3000
```

Scripts:

```bash
npm run dev        # local dev
npm run build      # production build
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
```

Run `npm run typecheck && npm run build` before pushing — CI parity.

## Environment variables

Names only — never commit values. See [`.env.example`](./.env.example) /
[`DEPLOY.md`](./DEPLOY.md).

| Variable | Scope | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | public | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | server-only | Powers the ingest webhook |
| `ANTHROPIC_API_KEY` | server-only | Enables extraction + recommendations |
| `NEXT_PUBLIC_SITE_URL` | optional | Origin is otherwise derived client-side |

The app degrades gracefully: no Anthropic key → AI off but upload/dashboard
work; no service-role key → webhook returns 503 but manual upload works.

## Project structure

```
app/                       App Router: layout, dashboard, login, auth routes
  api/ingest/metrics       Apple Health webhook (per-user bearer token)
  api/upload/metrics       authenticated CSV/JSON metrics upload
  api/reports              report upload → Claude extraction → biomarkers
  api/recommendations      biomarkers + activity → Claude recommendations
  upload|settings|reports  Upload / Connect / Biomarkers pages
components/                dashboard/, charts/, biomarkers/, upload/, settings/
lib/                       theme, health-data, analytics, queries, ingest,
                           supabase/, anthropic/
supabase/migrations/       0001_init.sql, 0002_storage.sql (RLS on every table)
```

## Deployment & workflow

Full setup — Supabase project, migrations, auth config, env vars, Vercel, and
Cloudflare-in-front — is in [`DEPLOY.md`](./DEPLOY.md).

- **`main`** is the GitHub default and Vercel production branch.
- Work on a feature branch → open a PR into `main` → Vercel posts a **preview
  deploy** on the PR → merge → production deploy.

See [`CLAUDE.md`](./CLAUDE.md) for architecture notes and conventions.
