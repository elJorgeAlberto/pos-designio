-- §4.9 Configuración de ticket. Ticket generation itself is 100%
-- client-side (canvas image + Web Share API) — this only stores the
-- per-company branding. Logos live in a public Storage bucket, one
-- per company under a {company_id}/ folder; public read is fine (a
-- business logo isn't sensitive), writes are scoped by RLS.

create table public.ticket_settings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null unique default public.current_company_id() references public.companies (id),
  logo_url text,
  message text,
  created_at timestamptz not null default now()
);

alter table public.ticket_settings enable row level security;

create policy "super admins manage all ticket_settings"
  on public.ticket_settings for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "company members manage own ticket_settings"
  on public.ticket_settings for all
  using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

insert into storage.buckets (id, name, public)
values ('ticket-logos', 'ticket-logos', true);

create policy "anyone can read ticket logos"
  on storage.objects for select
  using (bucket_id = 'ticket-logos');

create policy "company members upload own logo"
  on storage.objects for insert
  with check (
    bucket_id = 'ticket-logos'
    and (storage.foldername(name))[1] = public.current_company_id()::text
  );

create policy "company members update own logo"
  on storage.objects for update
  using (
    bucket_id = 'ticket-logos'
    and (storage.foldername(name))[1] = public.current_company_id()::text
  );

create policy "company members delete own logo"
  on storage.objects for delete
  using (
    bucket_id = 'ticket-logos'
    and (storage.foldername(name))[1] = public.current_company_id()::text
  );
