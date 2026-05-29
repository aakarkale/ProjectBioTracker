# BioTracker

A health tracking app that unifies **Apple Health metrics** (resting HR, HRV,
steps, exercise minutes, walking HR) and **lab biomarkers** (extracted from
uploaded medical reports) into one dark, editorial recovery dashboard.

This is a ground-up rebuild of the original Replit project on a modern,
self-hostable stack.

## Stack

| Concern        | Choice                                            |
| -------------- | ------------------------------------------------- |
| Framework      | Next.js 15 (App Router) + React 19 + TypeScript   |
| Styling        | Tailwind CSS                                       |
| Charts         | Recharts                                           |
| Database/Auth  | Supabase (Postgres + Auth) — _later pass_         |
| AI advice      | Anthropic API (Claude) — _later pass_             |
| Hosting        | Vercel                                             |
| Edge/CDN       | Cloudflare                                         |

## Status

**Pass 1 — Dashboard**
- ✅ Responsive recovery dashboard (mobile + desktop), pixel-matched to the
  reference design: Fraunces display serif, JetBrains Mono metrics, film-grain
  panels, per-metric glows.
- ✅ Four chart views — Heart (RHR vs HRV), Activity (steps), Walk HR, Exercise
  — with 30/60/90-day range switching and 7-day rolling trends.
- ✅ KPI cards comparing first-14-days vs last-14-days with delta indicators.

**Pass 2 — Supabase + auth + ingestion**
- ✅ Postgres schema with row-level security (profiles, daily_metrics, reports,
  biomarkers, ingest_tokens) + private `reports` storage bucket.
- ✅ Passwordless magic-link auth (replaces Replit Auth); session middleware.
- ✅ Dashboard reads live `daily_metrics`, with a demo-mode fallback to sample
  data when signed out / unconfigured.
- ✅ Apple Health ingestion: per-user token + webhook (`/api/ingest/metrics`)
  accepting Health Auto Export / Apple Shortcuts JSON, plus manual CSV/JSON
  upload. (HealthKit has no web API — see `DEPLOY.md`.)

**Pass 3 — Anthropic**
- ✅ Claude-powered biomarker extraction from uploaded PDF/image/CSV reports
  (native document understanding + structured outputs + prompt caching).
- ✅ Personalised recommendations folding biomarkers + recent activity together.
- ✅ Biomarkers view with status filtering and on-demand AI recommendations.

**Pass 4 — Deploy**
- ✅ Vercel-ready (`vercel.json`); Cloudflare-in-front guide in `DEPLOY.md`.

See [`DEPLOY.md`](./DEPLOY.md) for the full setup: creating the Supabase
project, applying migrations, configuring auth + env vars, deploying to Vercel,
and putting Cloudflare in front.

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
```

Other scripts:

```bash
npm run build      # production build
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
```

Copy `.env.example` to `.env.local` and fill in values as the relevant passes
land.

## Project structure

```
app/                     Next.js App Router (layout, page, global styles)
components/dashboard/     Dashboard UI
  charts/                 Recharts views + shared chart config
lib/                      Data + analytics
  health-data.ts          DailyMetric type + sample dataset
  analytics.ts            rolling averages, KPI deltas, chart series
  theme.ts                colour palette (mirrors tailwind.config.ts)
```

> Not medical advice. For informational tracking only.
