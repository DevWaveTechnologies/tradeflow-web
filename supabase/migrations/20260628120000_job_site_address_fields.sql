-- Structured job site address (UK). Combined `address` kept for maps/search/notifications.

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS address_building text,
  ADD COLUMN IF NOT EXISTS address_line_1 text,
  ADD COLUMN IF NOT EXISTS address_line_2 text,
  ADD COLUMN IF NOT EXISTS postcode text;

-- Legacy single-line values → line 1 until edited again.
UPDATE public.jobs
SET address_line_1 = address
WHERE address IS NOT NULL
  AND btrim(address) <> ''
  AND (address_line_1 IS NULL OR btrim(address_line_1) = '');

NOTIFY pgrst, 'reload schema';
