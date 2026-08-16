-- §4.2 Usuarios, roles, permisos, auditoría.
-- permissions is a fixed shared catalog; roles are per-company (each
-- company gets Administrador/Cajero defaults on creation, full custom
-- role building is Fase 5). audit_log is fed by a generic trigger that
-- future sensitive tables (ventas, gastos, pagos, movimientos de
-- inventario, ...) will also attach to.

create table public.permissions (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  description text not null
);

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id),
  name text not null,
  created_at timestamptz not null default now()
);

create index roles_company_id_idx on public.roles (company_id);

create table public.role_permissions (
  role_id uuid not null references public.roles (id) on delete cascade,
  permission_id uuid not null references public.permissions (id) on delete cascade,
  primary key (role_id, permission_id)
);

alter table public.users
  add column role_id uuid references public.roles (id);

create table public.user_branches (
  user_id uuid not null references public.users (id) on delete cascade,
  branch_id uuid not null references public.branches (id) on delete cascade,
  primary key (user_id, branch_id)
);

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  company_id uuid,
  user_id uuid,
  action text not null,
  entity text not null,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_company_id_idx on public.audit_log (company_id);

-- Generic audit trigger: works on any table with an `id` column, using
-- `company_id` from the row when present (missing key -> null, no error).
create function public.log_audit_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_company_id uuid;
begin
  v_company_id := coalesce(
    (to_jsonb(new)->>'company_id')::uuid,
    (to_jsonb(old)->>'company_id')::uuid
  );

  insert into public.audit_log (company_id, user_id, action, entity, entity_id, before_data, after_data)
  values (
    v_company_id,
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    coalesce((to_jsonb(new)->>'id')::uuid, (to_jsonb(old)->>'id')::uuid),
    case when TG_OP in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when TG_OP in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
  );

  return coalesce(new, old);
end;
$$;

create trigger users_audit
after insert or update or delete on public.users
for each row execute function public.log_audit_event();

create trigger roles_audit
after insert or update or delete on public.roles
for each row execute function public.log_audit_event();

-- Auto-provision Administrador (all permissions) and Cajero (day-to-day
-- subset) roles whenever a company is created.
create function public.provision_default_roles()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_role_id uuid;
  v_cashier_role_id uuid;
begin
  insert into public.roles (company_id, name) values (new.id, 'Administrador') returning id into v_admin_role_id;
  insert into public.roles (company_id, name) values (new.id, 'Cajero') returning id into v_cashier_role_id;

  insert into public.role_permissions (role_id, permission_id)
  select v_admin_role_id, id from public.permissions;

  insert into public.role_permissions (role_id, permission_id)
  select v_cashier_role_id, id from public.permissions
  where key in (
    'sales.create',
    'cash_register.open',
    'cash_register.close',
    'clients.view',
    'clients.create',
    'credit.collect',
    'inventory.view'
  );

  return new;
end;
$$;

create trigger companies_provision_default_roles
after insert on public.companies
for each row execute function public.provision_default_roles();

alter table public.permissions enable row level security;
alter table public.roles enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_branches enable row level security;
alter table public.audit_log enable row level security;

create policy "anyone can read permissions"
  on public.permissions for select
  using (true);

create policy "super admins manage permissions"
  on public.permissions for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "super admins manage all roles"
  on public.roles for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "company members manage own roles"
  on public.roles for all
  using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

create policy "super admins manage all role_permissions"
  on public.role_permissions for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "company members manage own role_permissions"
  on public.role_permissions for all
  using (
    role_id in (select id from public.roles where company_id = public.current_company_id())
  )
  with check (
    role_id in (select id from public.roles where company_id = public.current_company_id())
  );

create policy "super admins manage all user_branches"
  on public.user_branches for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "company members manage own user_branches"
  on public.user_branches for all
  using (
    user_id in (select id from public.users where company_id = public.current_company_id())
  )
  with check (
    user_id in (select id from public.users where company_id = public.current_company_id())
  );

create policy "super admins read all audit_log"
  on public.audit_log for select
  using (public.is_super_admin());

create policy "company members read own audit_log"
  on public.audit_log for select
  using (company_id = public.current_company_id());
