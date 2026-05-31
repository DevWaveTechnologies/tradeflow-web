-- Before/after job photos (files in storage bucket job-photos).

CREATE TABLE IF NOT EXISTS public.job_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  photo_type text NOT NULL CHECK (photo_type IN ('before', 'after')),
  storage_path text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS job_photos_job_id_type_idx
  ON public.job_photos (job_id, photo_type, created_at DESC);

CREATE OR REPLACE FUNCTION public.storage_job_id(object_name text)
RETURNS uuid
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(split_part(object_name, '/', 1), '')::uuid;
$$;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'job-photos',
  'job-photos',
  false,
  5242880,
  NULL
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = 5242880,
    allowed_mime_types = NULL;

GRANT SELECT, INSERT ON public.job_photos TO authenticated;
GRANT EXECUTE ON FUNCTION public.storage_job_id(text) TO authenticated;

ALTER TABLE public.job_photos ENABLE ROW LEVEL SECURITY;

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
    SELECT 1 FROM public.jobs j
    WHERE j.id = job_photos.job_id AND j.assigned_to = auth.uid()
  )
);

DROP POLICY IF EXISTS "Admins insert job photos" ON public.job_photos;
CREATE POLICY "Admins insert job photos"
ON public.job_photos
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin() AND author_id = auth.uid() AND public.can_access_job(job_id));

DROP POLICY IF EXISTS "Workers insert photos on assigned jobs" ON public.job_photos;
CREATE POLICY "Workers insert photos on assigned jobs"
ON public.job_photos
FOR INSERT
TO authenticated
WITH CHECK (
  author_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.jobs j
    WHERE j.id = job_id AND j.assigned_to = auth.uid()
  )
);

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
