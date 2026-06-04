-- Ensure job UPDATE webhooks include complete old_record for push diff logic.
ALTER TABLE public.jobs REPLICA IDENTITY FULL;
