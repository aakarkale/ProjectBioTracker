# Deploying BioTracker

This walks through standing up the full stack: **Supabase** (database + auth +
storage), **Anthropic** (AI), **Vercel** (hosting), and **Cloudflare** (in
front). The app runs in demo mode until Supabase env vars are present, so you
can deploy first and wire up the backend incrementally.

## 1. Supabase

1. Create a project at [supabase.com](https://supabase.com) → note the project
   URL and keys (Project Settings → API).
2. Apply the migrations in `supabase/migrations/` (in order):
   - **SQL Editor:** paste `0001_init.sql`, run; then `0002_storage.sql`, run.
   - **or CLI:** `supabase link --project-ref <ref>` then `supabase db push`.
3. **Auth → Email:** ensure email sign-in is enabled (magic links use it).
   - Set the **Site URL** to your deployed URL and add it (plus
     `http://localhost:3000`) to **Redirect URLs**.
   - The email template works as-is. To use the explicit confirm route, set the
     magic-link template's link to
     `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email` — the
     app's `/auth/confirm` route also handles the default PKCE `code` flow, so
     either template works.

## 2. Environment variables

Copy `.env.example` → `.env.local` for local dev, and set the same in Vercel
(Project → Settings → Environment Variables):

| Variable | Where | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase API settings | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase API settings | Public |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase API settings | **Server-only** — used by the ingest webhook |
| `ANTHROPIC_API_KEY` | console.anthropic.com | Enables extraction + recommendations |
| `NEXT_PUBLIC_SITE_URL` | your URL | e.g. `https://biotracker.vercel.app` |

## 3. Vercel

1. Import the GitHub repo at [vercel.com](https://vercel.com) → **Add New →
   Project**.
2. Framework auto-detects as **Next.js**; no build settings to change.
3. Add the environment variables above.
4. Deploy. Every push to the branch gets a preview URL.

## 4. Cloudflare (in front of Vercel)

Cloudflare sits in front as DNS + CDN + WAF (Vercel still runs the app):

1. Add your domain to Cloudflare; update your registrar's nameservers.
2. In Vercel, add the custom domain to the project; Vercel shows a CNAME (or
   A/ALIAS) target.
3. In Cloudflare DNS, add that record with the **proxy (orange cloud) ON**.
4. SSL/TLS mode: **Full (strict)**. Enable Auto Minify / Brotli as desired.
5. Optional: a WAF rate-limit rule on `/api/ingest/*` and `/api/*`.

> Note: keep Cloudflare's proxy on the apex/subdomain that points at Vercel.
> Vercel issues its own certs for the domain; Full (strict) keeps the hop
> encrypted end-to-end.

## 5. Connect Apple Health (per user)

A website can't read Apple Health directly — HealthKit lives on-device with no
web API. Instead, each user connects via a personal webhook:

1. Sign in → **Connect** → **Generate ingest token** (shown once).
2. Install the free **Health Auto Export** app (or build an Apple Shortcut).
3. Add a **REST API** export pointing at `https://<your-site>/api/ingest/metrics`
   with header `Authorization: Bearer <token>`.
4. Select metrics (steps, resting HR, HRV, exercise time, walking HR, active
   energy, flights) and schedule a daily push.

Manual CSV/JSON upload is also available under **Upload** for one-off imports.

## Local development

```bash
npm install
cp .env.example .env.local   # fill in values (optional — demo mode works without)
npm run dev                  # http://localhost:3000
```
