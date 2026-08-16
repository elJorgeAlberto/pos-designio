-- Foundation: companies stub, users, super_admins, and the RLS helper
-- functions every other table's policies will depend on.
-- companies gets its full column set in the companies/branches/registers
-- module migration; it exists here only as the FK target for users.

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  company_id uuid not null references public.companies (id),
  pin_hash text,
  created_at timestamptz not null default now()
);

create table public.super_admins (
  id uuid primary key references auth.users (id) on delete cascade
);

create function public.is_super_admin()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.super_admins where id = auth.uid()
  );
$$;

create function public.current_company_id()
returns uuid
language sql
security definer
set search_path = ''
stable
as $$
  select company_id from public.users where id = auth.uid();
$$;

alter table public.companies enable row level security;
alter table public.users enable row level security;
alter table public.super_admins enable row level security;

create policy "super admins manage all companies"
  on public.companies for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "users read own company"
  on public.companies for select
  using (id = public.current_company_id());

create policy "super admins manage all users"
  on public.users for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "users read own company users"
  on public.users for select
  using (company_id = public.current_company_id());

create policy "super admins manage super_admins"
  on public.super_admins for all
  using (public.is_super_admin())
  with check (public.is_super_admin());
