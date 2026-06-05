-- Run in Supabase SQL Editor if job site address columns are missing.

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS address_building text,
  ADD COLUMN IF NOT EXISTS address_line_1 text,
  ADD COLUMN IF NOT EXISTS address_line_2 text,
  ADD COLUMN IF NOT EXISTS postcode text;

UPDATE public.jobs
SET address_line_1 = address
WHERE address IS NOT NULL
  AND btrim(address) <> ''
  AND (address_line_1 IS NULL OR btrim(address_line_1) = '');

NOTIFY pgrst, 'reload schema';
