-- "Respaldos programados" (§11 Fase 2 / architecture doc's free-tier
-- risk section: Supabase free tier has no automatic backups). Weekly
-- job: pg_cron fires, pg_net calls the backup-export Edge Function
-- (service_role key stored in Vault, never in this file or the cron
-- job definition itself — see the follow-up one-off command that
-- stores it), which dumps every table to a private Storage bucket.
-- Platform-wide, not per-company — no frontend surface, nothing a
-- tenant should ever see or trigger.

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

insert into storage.buckets (id, name, public)
values ('backups', 'backups', false);

-- No storage.objects policies for 'backups' — private by default, only
-- the service_role key (which bypasses RLS entirely) can read/write it.

select cron.schedule(
  'weekly-backup-export',
  '0 4 * * 0', -- Sundays 04:00 UTC
  $$
  select net.http_post(
    url := 'https://gbwkjqoyjbdgjjajrppq.supabase.co/functions/v1/backup-export',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'backup_export_secret_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
