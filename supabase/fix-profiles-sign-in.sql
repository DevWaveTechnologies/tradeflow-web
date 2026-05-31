-- Fixes worker sign-in error: invalid input syntax for type uuid: "in_progress"
-- Cause: profiles RLS was casting status_changed metadata (from/to = status strings) as UUIDs.

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

-- Add worker profile (replace name if you like).
INSERT INTO public.profiles (id, name, role)
VALUES (
  '43095f01-aa93-4252-aad0-2971e0ae545f',
  'Worker',
  'worker'
)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    role = EXCLUDED.role;

NOTIFY pgrst, 'reload schema';
