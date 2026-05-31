-- Field notes left by workers (and admins) on a job.

CREATE TABLE IF NOT EXISTS public.job_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(trim(body)) > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS job_notes_job_id_created_at_idx
  ON public.job_notes (job_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.can_access_job(p_job_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.jobs j
    WHERE j.id = p_job_id
      AND (j.assigned_to = auth.uid() OR public.is_admin())
  );
$$;

GRANT EXECUTE ON FUNCTION public.can_access_job(uuid) TO authenticated;

ALTER TABLE public.job_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read job notes for accessible jobs" ON public.job_notes;
DROP POLICY IF EXISTS "Admins read all job notes" ON public.job_notes;
DROP POLICY IF EXISTS "Workers read notes on assigned jobs" ON public.job_notes;

CREATE POLICY "Admins read all job notes"
ON public.job_notes
FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE POLICY "Workers read notes on assigned jobs"
ON public.job_notes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.jobs j
    WHERE j.id = job_notes.job_id
      AND j.assigned_to = auth.uid()
  )
);

DROP POLICY IF EXISTS "Insert job notes on accessible jobs" ON public.job_notes;
DROP POLICY IF EXISTS "Admins insert job notes" ON public.job_notes;
DROP POLICY IF EXISTS "Workers insert notes on assigned jobs" ON public.job_notes;

CREATE POLICY "Admins insert job notes"
ON public.job_notes
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin() AND author_id = auth.uid());

CREATE POLICY "Workers insert notes on assigned jobs"
ON public.job_notes
FOR INSERT
TO authenticated
WITH CHECK (
  author_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.jobs j
    WHERE j.id = job_id
      AND j.assigned_to = auth.uid()
  )
);
