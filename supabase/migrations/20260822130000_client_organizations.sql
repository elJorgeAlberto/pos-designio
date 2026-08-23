-- "Empresas": an optional business entity a client can belong to
-- (multiple clients under one company, mainly for invoicing/facturación).
-- Named client_organizations (not "companies") to avoid colliding with
-- public.companies, which is the SaaS's own tenant table.

create table public.client_organizations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default public.current_company_id() references public.companies (id),
  legal_name text not null,
  trade_name text,
  tax_id text,
  address text,
  phone text,
  email text,
  created_at timestamptz not null default now()
);

create index client_organizations_company_id_idx on public.client_organizations (company_id);

alter table public.clients add column organization_id uuid references public.client_organizations (id);

create trigger client_organizations_audit
after insert or update or delete on public.client_organizations
for each row execute function public.log_audit_event();

alter table public.client_organizations enable row level security;

create policy "super admins manage all client_organizations"
  on public.client_organizations for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "company members manage own client_organizations"
  on public.client_organizations for all
  using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());
