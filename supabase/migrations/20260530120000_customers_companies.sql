-- Customers are stored in public.companies; jobs link via company_id.

CREATE TABLE IF NOT EXISTS public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL;

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
