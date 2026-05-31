-- Activity history for jobs (created, assignment, status, notes, photos).

CREATE TABLE IF NOT EXISTS public.job_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  activity_type text NOT NULL CHECK (
    activity_type IN (
      'job_created',
      'assignment_changed',
      'status_changed',
      'note_added',
      'photo_uploaded'
    )
  ),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS job_activity_job_id_created_at_idx
  ON public.job_activity (job_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.log_job_activity_from_jobs()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.job_activity (job_id, actor_id, activity_type, metadata)
    VALUES (
      NEW.id,
      v_actor,
      'job_created',
      jsonb_build_object('title', NEW.title)
    );
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO public.job_activity (job_id, actor_id, activity_type, metadata)
      VALUES (
        NEW.id,
        v_actor,
        'status_changed',
        jsonb_build_object(
          'from', COALESCE(OLD.status, 'pending'),
          'to', COALESCE(NEW.status, 'pending')
        )
      );
    END IF;

    IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
      INSERT INTO public.job_activity (job_id, actor_id, activity_type, metadata)
      VALUES (
        NEW.id,
        v_actor,
        'assignment_changed',
        jsonb_build_object('from', OLD.assigned_to, 'to', NEW.assigned_to)
      );
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_job_activity_from_notes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.job_activity (job_id, actor_id, activity_type, metadata)
  VALUES (
    NEW.job_id,
    NEW.author_id,
    'note_added',
    jsonb_build_object(
      'note_id', NEW.id,
      'preview', left(trim(NEW.body), 120)
    )
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_job_activity_from_photos()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.job_activity (job_id, actor_id, activity_type, metadata)
  VALUES (
    NEW.job_id,
    NEW.author_id,
    'photo_uploaded',
    jsonb_build_object(
      'photo_id', NEW.id,
      'photo_type', NEW.photo_type
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS log_job_activity_jobs ON public.jobs;
CREATE TRIGGER log_job_activity_jobs
  AFTER INSERT OR UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.log_job_activity_from_jobs();

DROP TRIGGER IF EXISTS log_job_activity_notes ON public.job_notes;
CREATE TRIGGER log_job_activity_notes
  AFTER INSERT ON public.job_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.log_job_activity_from_notes();

DROP TRIGGER IF EXISTS log_job_activity_photos ON public.job_photos;
CREATE TRIGGER log_job_activity_photos
  AFTER INSERT ON public.job_photos
  FOR EACH ROW
  EXECUTE FUNCTION public.log_job_activity_from_photos();

GRANT SELECT ON public.job_activity TO authenticated;

ALTER TABLE public.job_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read all job activity" ON public.job_activity;
CREATE POLICY "Admins read all job activity"
ON public.job_activity
FOR SELECT
TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS "Workers read activity on assigned jobs" ON public.job_activity;
CREATE POLICY "Workers read activity on assigned jobs"
ON public.job_activity
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.jobs j
    WHERE j.id = job_activity.job_id
      AND j.assigned_to = auth.uid()
  )
);

NOTIFY pgrst, 'reload schema';
