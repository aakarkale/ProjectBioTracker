-- Optional MCQ health questionnaire answers, stored as JSON on the profile.
-- Folded into the AI recommendation prompt for more accurate, personal advice.
alter table public.profiles
  add column if not exists health_questionnaire jsonb;
