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
