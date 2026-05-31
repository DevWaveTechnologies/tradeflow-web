-- Fixes "infinite recursion detected in policy for relation users"
-- and lets signed-in users read their profile.

-- Helper: check admin without RLS recursion (runs as definer, bypasses RLS)
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

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own profile" ON public.users;
DROP POLICY IF EXISTS "Admins read all users" ON public.users;
DROP POLICY IF EXISTS "Profiles read own" ON public.profiles;
DROP POLICY IF EXISTS "Admins read all profiles" ON public.profiles;

CREATE POLICY "Profiles read own"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Admins read all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.is_admin());

-- Jobs policies (replace recursive subqueries on users)
DROP POLICY IF EXISTS "Workers read assigned jobs" ON public.jobs;
CREATE POLICY "Workers read assigned jobs"
ON public.jobs
FOR SELECT
TO authenticated
USING (assigned_to = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Workers update assigned jobs" ON public.jobs;
CREATE POLICY "Workers update assigned jobs"
ON public.jobs
FOR UPDATE
TO authenticated
USING (assigned_to = auth.uid())
WITH CHECK (assigned_to = auth.uid());

DROP POLICY IF EXISTS "Admins full access jobs" ON public.jobs;
DROP POLICY IF EXISTS "Admins read all jobs" ON public.jobs;
DROP POLICY IF EXISTS "Admins insert jobs" ON public.jobs;
DROP POLICY IF EXISTS "Admins update jobs" ON public.jobs;
DROP POLICY IF EXISTS "Admins delete jobs" ON public.jobs;

CREATE POLICY "Admins read all jobs"
ON public.jobs
FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE POLICY "Admins insert jobs"
ON public.jobs
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "Admins update jobs"
ON public.jobs
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Admins delete jobs"
ON public.jobs
FOR DELETE
TO authenticated
USING (public.is_admin());

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read companies" ON public.companies;
CREATE POLICY "Authenticated read companies"
ON public.companies
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Admins insert companies" ON public.companies;
CREATE POLICY "Admins insert companies"
ON public.companies
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins update companies" ON public.companies;
CREATE POLICY "Admins update companies"
ON public.companies
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins delete companies" ON public.companies;
CREATE POLICY "Admins delete companies"
ON public.companies
FOR DELETE
TO authenticated
USING (public.is_admin());

-- Job notes (field notes on jobs)
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
