CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

DROP POLICY IF EXISTS "Users read own profile" ON public.users;
CREATE POLICY "Users read own profile"
ON public.users
FOR SELECT
TO authenticated
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins read all users" ON public.users;
CREATE POLICY "Admins read all users"
ON public.users
FOR SELECT
TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS "Workers read assigned jobs" ON public.jobs;
CREATE POLICY "Workers read assigned jobs"
ON public.jobs
FOR SELECT
TO authenticated
USING (assigned_to = auth.uid() OR public.is_admin());

-- Workers: update status on their assigned jobs only
DROP POLICY IF EXISTS "Workers update assigned jobs" ON public.jobs;
CREATE POLICY "Workers update assigned jobs"
ON public.jobs
FOR UPDATE
TO authenticated
USING (assigned_to = auth.uid())
WITH CHECK (assigned_to = auth.uid());

-- Admins: full access to jobs when signed in
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

-- Customers (public.companies): read for all; admin CRUD
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
