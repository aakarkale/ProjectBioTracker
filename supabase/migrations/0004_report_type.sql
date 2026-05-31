-- Detected lab-report type (e.g. "Lipid Panel", "Comprehensive Metabolic Panel").
alter table public.reports
  add column if not exists report_type text;
