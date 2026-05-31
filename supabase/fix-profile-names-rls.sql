-- Resolve profile display names for activity timeline and notes (bypasses profiles RLS).

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

-- Also allow reading profiles that appear on accessible job activity (for direct queries).
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
