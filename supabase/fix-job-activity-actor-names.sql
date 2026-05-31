-- Fixes "Unknown" in activity timeline: store actor names on events + server-side name lookup.

CREATE OR REPLACE FUNCTION public.get_profile_names(p_ids uuid[])
RETURNS TABLE (id uuid, name text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT p.id, p.name
  FROM public.profiles p
  WHERE p.id = ANY(p_ids);
$$;

GRANT EXECUTE ON FUNCTION public.get_profile_names(uuid[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.profile_name_for(p_user_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT name FROM public.profiles WHERE id = p_user_id;
$$;

GRANT EXECUTE ON FUNCTION public.profile_name_for(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_job_activity_for_job(p_job_id uuid)
RETURNS TABLE (
  id uuid,
  job_id uuid,
  actor_id uuid,
  actor_name text,
  activity_type text,
  metadata jsonb,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    a.id,
    a.job_id,
    a.actor_id,
    COALESCE(
      p.name,
      a.metadata->>'actor_name',
      'Someone'
    ),
    a.activity_type,
    a.metadata,
    a.created_at
  FROM public.job_activity a
  LEFT JOIN public.profiles p ON p.id = a.actor_id
  WHERE a.job_id = p_job_id
    AND public.can_access_job(p_job_id)
  ORDER BY a.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_job_activity_for_job(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.log_job_activity_from_jobs()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_actor_name text := public.profile_name_for(auth.uid());
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.job_activity (job_id, actor_id, activity_type, metadata)
    VALUES (
      NEW.id,
      v_actor,
      'job_created',
      jsonb_build_object('title', NEW.title, 'actor_name', v_actor_name)
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
          'to', COALESCE(NEW.status, 'pending'),
          'actor_name', v_actor_name
        )
      );
    END IF;

    IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
      INSERT INTO public.job_activity (job_id, actor_id, activity_type, metadata)
      VALUES (
        NEW.id,
        v_actor,
        'assignment_changed',
        jsonb_build_object(
          'from', OLD.assigned_to,
          'to', NEW.assigned_to,
          'actor_name', v_actor_name
        )
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
DECLARE
  v_actor_name text := public.profile_name_for(NEW.author_id);
BEGIN
  INSERT INTO public.job_activity (job_id, actor_id, activity_type, metadata)
  VALUES (
    NEW.job_id,
    NEW.author_id,
    'note_added',
    jsonb_build_object(
      'note_id', NEW.id,
      'preview', left(trim(NEW.body), 120),
      'actor_name', v_actor_name
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
DECLARE
  v_actor_name text := public.profile_name_for(NEW.author_id);
BEGIN
  INSERT INTO public.job_activity (job_id, actor_id, activity_type, metadata)
  VALUES (
    NEW.job_id,
    NEW.author_id,
    'photo_uploaded',
    jsonb_build_object(
      'photo_id', NEW.id,
      'photo_type', NEW.photo_type,
      'actor_name', v_actor_name
    )
  );
  RETURN NEW;
END;
$$;

-- Backfill names on existing activity rows where possible.
UPDATE public.job_activity a
SET metadata = a.metadata || jsonb_build_object('actor_name', p.name)
FROM public.profiles p
WHERE p.id = a.actor_id
  AND (a.metadata->>'actor_name') IS NULL
  AND p.name IS NOT NULL;

DROP POLICY IF EXISTS "Read profiles for accessible job activity" ON public.profiles;
CREATE POLICY "Read profiles for accessible job activity"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.job_activity a
    JOIN public.jobs j ON j.id = a.job_id
    WHERE a.actor_id = profiles.id
      AND (j.assigned_to = auth.uid() OR public.is_admin())
  )
  OR EXISTS (
    SELECT 1
    FROM public.job_activity a
    JOIN public.jobs j ON j.id = a.job_id
    WHERE (j.assigned_to = auth.uid() OR public.is_admin())
      AND a.activity_type = 'assignment_changed'
      AND (
        (
          (a.metadata->>'from') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          AND (a.metadata->>'from')::uuid = profiles.id
        )
        OR (
          (a.metadata->>'to') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          AND (a.metadata->>'to')::uuid = profiles.id
        )
      )
  )
);

NOTIFY pgrst, 'reload schema';
