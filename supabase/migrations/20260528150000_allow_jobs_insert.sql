-- Allow web app (anon + authenticated) to insert jobs
DROP POLICY IF EXISTS "Allow anon insert on jobs" ON public.jobs;
DROP POLICY IF EXISTS "Allow authenticated insert on jobs" ON public.jobs;

CREATE POLICY "Allow anon insert on jobs"
ON public.jobs
FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "Allow authenticated insert on jobs"
ON public.jobs
FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon update on jobs" ON public.jobs;
DROP POLICY IF EXISTS "Allow authenticated update on jobs" ON public.jobs;

CREATE POLICY "Allow anon update on jobs"
ON public.jobs
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated update on jobs"
ON public.jobs
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);
