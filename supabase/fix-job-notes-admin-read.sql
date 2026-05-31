-- Fix: admins must read all field notes; workers read notes on assigned jobs.
-- Run in Supabase SQL Editor if admins cannot see worker notes.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

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
