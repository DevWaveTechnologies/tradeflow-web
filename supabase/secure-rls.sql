-- Run in Supabase → SQL Editor to secure all TradeFlow tables with RLS.
-- Requires: profiles, jobs, companies, job_notes, job_photos tables.

-- Secure TradeFlow with Row Level Security.
-- Workers: read assigned jobs; update job status only; insert notes/photos on assigned jobs.
-- Admins: full access to all app data.

-- ---------------------------------------------------------------------------
-- Helpers (SECURITY DEFINER avoids RLS recursion on profiles)
-- ---------------------------------------------------------------------------

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

CREATE OR REPLACE FUNCTION public.storage_job_id(object_name text)
RETURNS uuid
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(split_part(object_name, '/', 1), '')::uuid;
$$;

GRANT EXECUTE ON FUNCTION public.storage_job_id(text) TO authenticated;

-- Workers may only change job status (not assignment, title, etc.)
CREATE OR REPLACE FUNCTION public.enforce_worker_job_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF OLD.assigned_to IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Not allowed to update this job';
  END IF;

  IF to_jsonb(NEW) - 'status' IS DISTINCT FROM to_jsonb(OLD) - 'status' THEN
    RAISE EXCEPTION 'Workers may only update job status';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_worker_job_update ON public.jobs;
CREATE TRIGGER enforce_worker_job_update
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_worker_job_update();

-- ---------------------------------------------------------------------------
-- Remove legacy wide-open policies (from early dev migrations)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Allow anon insert on jobs" ON public.jobs;
DROP POLICY IF EXISTS "Allow authenticated insert on jobs" ON public.jobs;
DROP POLICY IF EXISTS "Allow anon update on jobs" ON public.jobs;
DROP POLICY IF EXISTS "Allow authenticated update on jobs" ON public.jobs;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'users'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "Users read own profile" ON public.users';
    EXECUTE 'DROP POLICY IF EXISTS "Admins read all users" ON public.users';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles read own" ON public.profiles;
CREATE POLICY "Profiles read own"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins read all profiles" ON public.profiles;
CREATE POLICY "Admins read all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS "Read profiles for accessible job notes" ON public.profiles;
CREATE POLICY "Read profiles for accessible job notes"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.job_notes n
    JOIN public.jobs j ON j.id = n.job_id
    WHERE n.author_id = profiles.id
      AND (j.assigned_to = auth.uid() OR public.is_admin())
  )
);

-- ---------------------------------------------------------------------------
-- jobs
-- ---------------------------------------------------------------------------

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs FORCE ROW LEVEL SECURITY;

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

-- ---------------------------------------------------------------------------
-- companies (customers)
-- ---------------------------------------------------------------------------

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read companies" ON public.companies;
DROP POLICY IF EXISTS "Workers read companies for assigned jobs" ON public.companies;
CREATE POLICY "Workers read companies for assigned jobs"
ON public.companies
FOR SELECT
TO authenticated
USING (
  public.is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.jobs j
    WHERE j.company_id = companies.id
      AND j.assigned_to = auth.uid()
  )
);

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

-- ---------------------------------------------------------------------------
-- job_notes
-- ---------------------------------------------------------------------------

ALTER TABLE public.job_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_notes FORCE ROW LEVEL SECURITY;

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

DROP POLICY IF EXISTS "Admins delete job notes" ON public.job_notes;
CREATE POLICY "Admins delete job notes"
ON public.job_notes
FOR DELETE
TO authenticated
USING (public.is_admin());

-- ---------------------------------------------------------------------------
-- job_photos
-- ---------------------------------------------------------------------------

ALTER TABLE public.job_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_photos FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read all job photos" ON public.job_photos;
CREATE POLICY "Admins read all job photos"
ON public.job_photos
FOR SELECT
TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS "Workers read photos on assigned jobs" ON public.job_photos;
CREATE POLICY "Workers read photos on assigned jobs"
ON public.job_photos
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.jobs j
    WHERE j.id = job_photos.job_id
      AND j.assigned_to = auth.uid()
  )
);

DROP POLICY IF EXISTS "Admins insert job photos" ON public.job_photos;
CREATE POLICY "Admins insert job photos"
ON public.job_photos
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin() AND author_id = auth.uid());

DROP POLICY IF EXISTS "Workers insert photos on assigned jobs" ON public.job_photos;
CREATE POLICY "Workers insert photos on assigned jobs"
ON public.job_photos
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

DROP POLICY IF EXISTS "Admins delete job photos" ON public.job_photos;
CREATE POLICY "Admins delete job photos"
ON public.job_photos
FOR DELETE
TO authenticated
USING (public.is_admin());

-- ---------------------------------------------------------------------------
-- storage: job-photos bucket
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Job photos storage read" ON storage.objects;
CREATE POLICY "Job photos storage read"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'job-photos'
  AND public.can_access_job(public.storage_job_id(name))
);

DROP POLICY IF EXISTS "Job photos storage insert" ON storage.objects;
CREATE POLICY "Job photos storage insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'job-photos'
  AND public.can_access_job(public.storage_job_id(name))
);

DROP POLICY IF EXISTS "Job photos storage delete" ON storage.objects;
CREATE POLICY "Job photos storage delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'job-photos'
  AND public.can_access_job(public.storage_job_id(name))
);

NOTIFY pgrst, 'reload schema';
