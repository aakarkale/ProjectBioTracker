-- BioTracker initial schema
-- Tables: profiles, ingest_tokens, daily_metrics, reports, biomarkers
-- All user data is protected by row-level security keyed on auth.uid().

-- ---------------------------------------------------------------------------
-- profiles: one row per auth user
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  full_name   text,
  created_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: select own"
  on public.profiles for select using (auth.uid() = id);
create policy "profiles: update own"
  on public.profiles for update using (auth.uid() = id);
create policy "profiles: insert own"
  on public.profiles for insert with check (auth.uid() = id);

-- Auto-create a profile + ingest token when a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- ingest_tokens: per-user secret for the Apple Health webhook
-- Only the SHA-256 hash is stored; the plaintext is shown once on creation.
-- ---------------------------------------------------------------------------
create table if not exists public.ingest_tokens (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  token_hash   text not null unique,
  label        text,
  created_at   timestamptz not null default now(),
  last_used_at timestamptz,
  revoked      boolean not null default false
);

create index if not exists ingest_tokens_user_idx on public.ingest_tokens (user_id);

alter table public.ingest_tokens enable row level security;

-- Users can see/manage their token metadata (never the hash matters — it's opaque).
create policy "ingest_tokens: select own"
  on public.ingest_tokens for select using (auth.uid() = user_id);
create policy "ingest_tokens: insert own"
  on public.ingest_tokens for insert with check (auth.uid() = user_id);
create policy "ingest_tokens: update own"
  on public.ingest_tokens for update using (auth.uid() = user_id);
create policy "ingest_tokens: delete own"
  on public.ingest_tokens for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- daily_metrics: one row per user per day (Apple Health daily aggregates)
-- ---------------------------------------------------------------------------
create table if not exists public.daily_metrics (
  user_id         uuid not null references auth.users (id) on delete cascade,
  day             date not null,
  steps           integer,
  active_calories integer,
  resting_hr      integer,
  hrv             numeric,
  exercise_min    integer,
  walking_hr      integer,
  flights         integer,
  updated_at      timestamptz not null default now(),
  primary key (user_id, day)
);

create index if not exists daily_metrics_user_day_idx
  on public.daily_metrics (user_id, day);

alter table public.daily_metrics enable row level security;

create policy "daily_metrics: select own"
  on public.daily_metrics for select using (auth.uid() = user_id);
create policy "daily_metrics: insert own"
  on public.daily_metrics for insert with check (auth.uid() = user_id);
create policy "daily_metrics: update own"
  on public.daily_metrics for update using (auth.uid() = user_id);
create policy "daily_metrics: delete own"
  on public.daily_metrics for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- reports: uploaded medical documents
-- ---------------------------------------------------------------------------
create table if not exists public.reports (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  file_name    text not null,
  storage_path text not null,
  mime_type    text,
  status       text not null default 'pending'
                 check (status in ('pending', 'processing', 'done', 'error')),
  collected_on date,
  error        text,
  created_at   timestamptz not null default now()
);

create index if not exists reports_user_idx on public.reports (user_id, created_at desc);

alter table public.reports enable row level security;

create policy "reports: select own"
  on public.reports for select using (auth.uid() = user_id);
create policy "reports: insert own"
  on public.reports for insert with check (auth.uid() = user_id);
create policy "reports: update own"
  on public.reports for update using (auth.uid() = user_id);
create policy "reports: delete own"
  on public.reports for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- biomarkers: individual lab values extracted from reports
-- ---------------------------------------------------------------------------
create table if not exists public.biomarkers (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  report_id       uuid references public.reports (id) on delete cascade,
  name            text not null,
  value           numeric,
  unit            text,
  reference_low   numeric,
  reference_high  numeric,
  status          text default 'unknown'
                    check (status in ('normal', 'borderline', 'critical', 'unknown')),
  category        text,
  measured_on     date,
  created_at      timestamptz not null default now()
);

create index if not exists biomarkers_user_idx on public.biomarkers (user_id, name, measured_on);

alter table public.biomarkers enable row level security;

create policy "biomarkers: select own"
  on public.biomarkers for select using (auth.uid() = user_id);
create policy "biomarkers: insert own"
  on public.biomarkers for insert with check (auth.uid() = user_id);
create policy "biomarkers: update own"
  on public.biomarkers for update using (auth.uid() = user_id);
create policy "biomarkers: delete own"
  on public.biomarkers for delete using (auth.uid() = user_id);
