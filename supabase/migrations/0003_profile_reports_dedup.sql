-- Health profile (for personalised AI insights), report metadata, and a
-- one-time cleanup of double-counted biomarkers.

-- profiles: health profile fields ------------------------------------------
alter table public.profiles
  add column if not exists date_of_birth date,
  add column if not exists sex text,
  add column if not exists height_cm numeric,
  add column if not exists weight_kg numeric,
  add column if not exists goals text,
  add column if not exists onboarded boolean not null default false;

-- reports: content hash (dedupe identical uploads) + editable title --------
alter table public.reports
  add column if not exists content_hash text,
  add column if not exists title text;

update public.reports set title = file_name where title is null;

-- ONE-TIME CLEANUP of existing double-counted data -------------------------
-- 1) Collapse duplicate report rows (same user + file + collected date),
--    keeping the earliest. Cascade removes their biomarkers.
with ranked as (
  select id,
         row_number() over (
           partition by user_id, file_name, collected_on
           order by created_at asc, id asc
         ) rn
  from public.reports
)
delete from public.reports r
using ranked
where r.id = ranked.id and ranked.rn > 1;

-- 2) Within a report, dedupe identical biomarker rows by name.
with ranked as (
  select id,
         row_number() over (
           partition by user_id, report_id, name
           order by id asc
         ) rn
  from public.biomarkers
)
delete from public.biomarkers b
using ranked
where b.id = ranked.id and ranked.rn > 1;

-- Prevent future duplicate report rows for identical file content.
create unique index if not exists reports_user_content_hash_idx
  on public.reports (user_id, content_hash)
  where content_hash is not null;
