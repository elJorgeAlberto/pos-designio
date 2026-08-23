-- Payment methods catalog: every peso in or out gets tagged with how it
-- moved. Efectivo/Transferencia/Crédito are native and protected (a
-- before-trigger blocks deleting them or changing their behavior flags);
-- the tenant can add their own on top (e.g. "Vales de despensa").
--
-- This also closes two real gaps found auditing every money-in/money-out
-- path: collect_debt() (abonos a deudas) never recorded a method at all,
-- and cash abonos were never included in the cash-register arqueo.

create table public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default public.current_company_id() references public.companies (id),
  key text not null,
  label text not null,
  is_system boolean not null default false,
  is_cash boolean not null default false,
  is_credit boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (company_id, key)
);

create index payment_methods_company_id_idx on public.payment_methods (company_id);

insert into public.payment_methods (company_id, key, label, is_system, is_cash, is_credit)
select id, 'cash', 'Efectivo', true, true, false from public.companies
union all
select id, 'transfer', 'Transferencia', true, false, false from public.companies
union all
select id, 'credit', 'Crédito', true, false, true from public.companies;

-- Preserve the one pre-existing "card" sale_payment as a regular
-- (non-system, editable/deactivatable) custom method rather than forcing
-- a native 4th slot or orphaning the row.
insert into public.payment_methods (company_id, key, label, is_system, is_cash, is_credit)
select distinct co.id, 'card', 'Tarjeta', false, false, false
from public.sale_payments sp
join public.sales s on s.id = sp.sale_id
join public.branches b on b.id = s.branch_id
join public.companies co on co.id = b.company_id
where sp.method = 'card'
on conflict (company_id, key) do nothing;

create function public.protect_system_payment_methods()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if TG_OP = 'DELETE' then
    if old.is_system then
      raise exception 'No se puede eliminar un medio de pago del sistema.';
    end if;
    return old;
  end if;

  if old.is_system and (
    new.key <> old.key
    or new.is_system <> old.is_system
    or new.is_cash <> old.is_cash
    or new.is_credit <> old.is_credit
    or new.active <> old.active
  ) then
    raise exception 'No se pueden modificar las propiedades de un medio de pago del sistema.';
  end if;

  return new;
end;
$$;

create trigger payment_methods_protect
before update or delete on public.payment_methods
for each row execute function public.protect_system_payment_methods();

create trigger payment_methods_audit
after insert or update or delete on public.payment_methods
for each row execute function public.log_audit_event();

alter table public.payment_methods enable row level security;

create policy "super admins manage all payment_methods"
  on public.payment_methods for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "company members manage own payment_methods"
  on public.payment_methods for all
  using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

-- sale_payments: free-text method -> payment_method_id FK.
alter table public.sale_payments add column payment_method_id uuid references public.payment_methods (id);

update public.sale_payments sp
set payment_method_id = pm.id
from public.sales s
join public.branches b on b.id = s.branch_id
, public.payment_methods pm
where sp.sale_id = s.id
  and pm.company_id = b.company_id
  and pm.key = sp.method;

alter table public.sale_payments
  alter column payment_method_id set not null,
  drop constraint sale_payments_method_check,
  drop column method;

-- expenses: same treatment.
alter table public.expenses add column payment_method_id uuid references public.payment_methods (id);

update public.expenses e
set payment_method_id = pm.id
from public.branches b, public.payment_methods pm
where e.branch_id = b.id
  and pm.company_id = b.company_id
  and pm.key = e.method;

alter table public.expenses
  alter column payment_method_id set not null,
  drop constraint expenses_method_check,
  drop column method;

-- supplier_payments: same treatment, joined via supplier_id directly
-- (purchase_id is nullable, not every payment references one purchase).
alter table public.supplier_payments add column payment_method_id uuid references public.payment_methods (id);

update public.supplier_payments p
set payment_method_id = pm.id
from public.suppliers sup, public.payment_methods pm
where p.supplier_id = sup.id
  and pm.company_id = sup.company_id
  and pm.key = p.method;

alter table public.supplier_payments
  alter column payment_method_id set not null,
  drop constraint supplier_payments_method_check,
  drop column method;

-- collections: gains both a method (gap #1) and a cash-register link so
-- cash abonos join the arqueo like everything else (gap #2). Existing
-- rows backfill to 'cash' — a disclosed assumption, there's no way to
-- know historically, and cash is by far the likely case for this pilot.
alter table public.collections
  add column payment_method_id uuid references public.payment_methods (id),
  add column cash_register_session_id uuid references public.cash_register_sessions (id);

update public.collections c
set payment_method_id = pm.id
from public.clients cl
join public.payment_methods pm on pm.company_id = cl.company_id and pm.key = 'cash'
where c.client_id = cl.id;

alter table public.collections alter column payment_method_id set not null;

-- Every function that special-cased method by string comparison now
-- looks up the is_cash/is_credit flag instead.

create or replace function public.check_credit_payment_has_client()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_client_id uuid;
  v_is_credit boolean;
begin
  select is_credit into v_is_credit from public.payment_methods where id = new.payment_method_id;
  if v_is_credit then
    select client_id into v_client_id from public.sales where id = new.sale_id;
    if v_client_id is null then
      raise exception 'Un pago a crédito requiere que la venta tenga un cliente asignado.';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.open_debt_commitment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_client_id uuid;
  v_is_credit boolean;
begin
  select is_credit into v_is_credit from public.payment_methods where id = new.payment_method_id;
  if v_is_credit then
    select client_id into v_client_id from public.sales where id = new.sale_id;
    insert into public.debt_commitments (client_id, sale_id, amount, due_date)
    values (v_client_id, new.sale_id, new.amount, new.commitment_date);
  end if;
  return new;
end;
$$;

create or replace function public.collect_debt(
  p_commitment_id uuid,
  p_amount numeric,
  p_payment_method_id uuid,
  p_authorize_remainder boolean default false,
  p_new_due_date date default null,
  p_cash_register_session_id uuid default null
)
returns public.debt_commitments
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_commitment public.debt_commitments;
  v_remaining numeric;
begin
  select * into v_commitment from public.debt_commitments where id = p_commitment_id for update;

  if v_commitment.id is null then
    raise exception 'Compromiso no encontrado.';
  end if;

  if not (
    public.is_super_admin()
    or v_commitment.client_id in (select id from public.clients where company_id = public.current_company_id())
  ) then
    raise exception 'No autorizado.';
  end if;

  if v_commitment.status <> 'pending' then
    raise exception 'Este compromiso ya no está pendiente de cobro.';
  end if;

  if p_amount is null or p_amount <= 0 or p_amount > v_commitment.amount then
    raise exception 'Monto inválido.';
  end if;

  if p_payment_method_id is null then
    raise exception 'Selecciona con qué medio de pago se recibió el abono.';
  end if;

  insert into public.collections (client_id, sale_id, amount, debt_commitment_id, payment_method_id, cash_register_session_id)
  values (v_commitment.client_id, v_commitment.sale_id, p_amount, v_commitment.id, p_payment_method_id, p_cash_register_session_id);

  v_remaining := v_commitment.amount - p_amount;

  if v_remaining <= 0.01 then
    update public.debt_commitments
    set amount = 0, status = 'paid', resolved_at = now()
    where id = v_commitment.id
    returning * into v_commitment;
  elsif p_authorize_remainder then
    update public.debt_commitments
    set amount = 0, status = 'renegotiated', resolved_at = now()
    where id = v_commitment.id;

    insert into public.debt_commitments (client_id, sale_id, parent_commitment_id, amount, due_date, status)
    values (v_commitment.client_id, v_commitment.sale_id, v_commitment.id, v_remaining, p_new_due_date, 'pending')
    returning * into v_commitment;
  else
    update public.debt_commitments
    set amount = v_remaining
    where id = v_commitment.id
    returning * into v_commitment;
  end if;

  return v_commitment;
end;
$$;

-- Fourth rewrite of this function: now also credits cash abonos
-- (collections) the same way it already debits cash expenses/supplier
-- payments, and every 'cash' string check becomes an is_cash flag join.
create or replace function public.close_cash_register_session()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cash_sales numeric(12, 2);
  v_cash_collections numeric(12, 2);
  v_cash_out numeric(12, 2);
begin
  if new.closed_at is not null and old.closed_at is null then
    select coalesce(sum(sp.amount), 0) into v_cash_sales
    from public.sale_payments sp
    join public.sales s on s.id = sp.sale_id
    join public.payment_methods pm on pm.id = sp.payment_method_id
    where s.cash_register_session_id = new.id and pm.is_cash;

    select coalesce(sum(c.amount), 0) into v_cash_collections
    from public.collections c
    join public.payment_methods pm on pm.id = c.payment_method_id
    where c.cash_register_session_id = new.id and pm.is_cash;

    select
      coalesce((
        select sum(e.amount) from public.expenses e
        join public.payment_methods pm on pm.id = e.payment_method_id
        where e.cash_register_session_id = new.id and pm.is_cash
      ), 0)
      + coalesce((
        select sum(p.amount) from public.supplier_payments p
        join public.payment_methods pm on pm.id = p.payment_method_id
        where p.cash_register_session_id = new.id and pm.is_cash
      ), 0)
    into v_cash_out;

    new.expected_amount := new.opening_amount + v_cash_sales + v_cash_collections - v_cash_out;
    new.difference := coalesce(new.counted_amount, 0) - new.expected_amount;
  end if;

  return new;
end;
$$;
