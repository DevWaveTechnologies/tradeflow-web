-- Run in Supabase SQL Editor to add job scheduling fields.

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS scheduled_date date,
  ADD COLUMN IF NOT EXISTS scheduled_start_time time;

CREATE INDEX IF NOT EXISTS jobs_scheduled_date_idx
  ON public.jobs (scheduled_date);

NOTIFY pgrst, 'reload schema';
