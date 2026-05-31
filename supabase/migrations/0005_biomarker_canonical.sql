-- Canonical identity for biomarkers so synonyms merge into one tile/trend,
-- plus a flag for markers whose identity needs user confirmation.
alter table public.biomarkers
  add column if not exists canonical_key text,
  add column if not exists needs_review boolean not null default false;

create index if not exists biomarkers_user_canonical_idx
  on public.biomarkers (user_id, canonical_key);
