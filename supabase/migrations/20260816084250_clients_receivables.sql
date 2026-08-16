-- §4.5 Clientes y cuentas por cobrar.
-- lat/lng columns exist here per the doc's own table definition, but the
-- "usar mi ubicación" UI is its own later Fase 1 item — not built yet.

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default public.current_company_id() references public.companies (id),
  name text not null,
  credit_limit numeric(12, 2),
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  created_at timestamptz not null default now()
);

create index clients_company_id_idx on public.clients (company_id);

alter table public.sales
  add column client_id uuid references public.clients (id);

alter table public.sale_payments
  drop constraint sale_payments_method_check,
  add constraint sale_payments_method_check check (method in ('cash', 'card', 'transfer', 'credit')),
  add column commitment_date date;

create function public.check_credit_payment_has_client()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_client_id uuid;
begin
  if new.method = 'credit' then
    select client_id into v_client_id from public.sales where id = new.sale_id;
    if v_client_id is null then
      raise exception 'Un pago a crédito requiere que la venta tenga un cliente asignado.';
    end if;
  end if;
  return new;
end;
$$;

create trigger sale_payments_check_credit
before insert on public.sale_payments
for each row execute function public.check_credit_payment_has_client();

create table public.collections (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id),
  sale_id uuid not null references public.sales (id),
  amount numeric(12, 2) not null,
  created_at timestamptz not null default now()
);

create index collections_client_id_idx on public.collections (client_id);
create index collections_sale_id_idx on public.collections (sale_id);

create trigger clients_audit
after insert or update or delete on public.clients
for each row execute function public.log_audit_event();

alter table public.clients enable row level security;
alter table public.collections enable row level security;

create policy "super admins manage all clients"
  on public.clients for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "company members manage own clients"
  on public.clients for all
  using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

create policy "super admins manage all collections"
  on public.collections for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "company members manage own collections"
  on public.collections for all
  using (client_id in (select id from public.clients where company_id = public.current_company_id()))
  with check (client_id in (select id from public.clients where company_id = public.current_company_id()));
