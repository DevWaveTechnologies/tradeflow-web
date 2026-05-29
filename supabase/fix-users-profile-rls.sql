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
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own profile" ON public.users;
DROP POLICY IF EXISTS "Admins read all users" ON public.users;

CREATE POLICY "Users read own profile"
ON public.users
FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Admins read all users"
ON public.users
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
CREATE POLICY "Admins full access jobs"
ON public.jobs
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Authenticated read companies" ON public.companies;
CREATE POLICY "Authenticated read companies"
ON public.companies
FOR SELECT
TO authenticated
USING (true);
