-- §4.1 Empresas, sucursales, cajas: business_types catalog, full companies
-- columns, branches, and cash registers (corte de caja is per-register, not
-- per-branch).

create table public.business_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

alter table public.companies
  add column subdomain text not null default '',
  add column business_type_id uuid references public.business_types (id),
  add column status text not null default 'active' check (status in ('active', 'suspended'));

alter table public.companies
  alter column subdomain drop default;

create unique index companies_subdomain_key on public.companies (subdomain);

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id),
  name text not null,
  address text,
  created_at timestamptz not null default now()
);

create index branches_company_id_idx on public.branches (company_id);

create table public.cash_registers (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id),
  name text not null,
  created_at timestamptz not null default now()
);

create index cash_registers_branch_id_idx on public.cash_registers (branch_id);

alter table public.business_types enable row level security;
alter table public.branches enable row level security;
alter table public.cash_registers enable row level security;

create policy "anyone can read business_types"
  on public.business_types for select
  using (true);

create policy "super admins manage business_types"
  on public.business_types for insert
  with check (public.is_super_admin());

create policy "super admins update business_types"
  on public.business_types for update
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "super admins delete business_types"
  on public.business_types for delete
  using (public.is_super_admin());

create policy "super admins manage all branches"
  on public.branches for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "company members manage own branches"
  on public.branches for all
  using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

create policy "super admins manage all cash_registers"
  on public.cash_registers for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "company members manage own cash_registers"
  on public.cash_registers for all
  using (
    branch_id in (
      select id from public.branches where company_id = public.current_company_id()
    )
  )
  with check (
    branch_id in (
      select id from public.branches where company_id = public.current_company_id()
    )
  );
