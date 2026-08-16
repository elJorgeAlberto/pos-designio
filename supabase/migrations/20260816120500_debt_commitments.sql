-- Cobros pendientes: debt_commitments is the single source of truth for
-- "this amount is due on this date" — replaces re-deriving balance/due
-- date from sale_payments(method='credit') minus collections on every
-- read, and gives renegotiation (partial payment → new commitment with
-- its own due date) somewhere to live.

create table public.debt_commitments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id),
  sale_id uuid not null references public.sales (id),
  parent_commitment_id uuid references public.debt_commitments (id),
  amount numeric(12, 2) not null,
  due_date date,
  status text not null default 'pending' check (status in ('pending', 'paid', 'renegotiated', 'cancelled')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index debt_commitments_client_id_idx on public.debt_commitments (client_id);
create index debt_commitments_due_date_idx on public.debt_commitments (due_date);
create index debt_commitments_status_idx on public.debt_commitments (status);

alter table public.collections
  add column debt_commitment_id uuid references public.debt_commitments (id);

-- Every credit sale_payment automatically opens a commitment — checkout
-- code in SalesPage doesn't change at all.
create function public.open_debt_commitment()
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
    insert into public.debt_commitments (client_id, sale_id, amount, due_date)
    values (v_client_id, new.sale_id, new.amount, new.commitment_date);
  end if;
  return new;
end;
$$;

create trigger sale_payments_open_commitment
after insert on public.sale_payments
for each row execute function public.open_debt_commitment();

-- Backfill the two existing credit sale_payments rows that predate this
-- table, so historical data lines up with the new ledger.
insert into public.debt_commitments (client_id, sale_id, amount, due_date, status, resolved_at)
select
  s.client_id,
  sp.sale_id,
  sp.amount - coalesce((select sum(c.amount) from public.collections c where c.sale_id = sp.sale_id), 0) as remaining,
  sp.commitment_date,
  case
    when sp.amount - coalesce((select sum(c.amount) from public.collections c where c.sale_id = sp.sale_id), 0) <= 0.01
    then 'paid' else 'pending'
  end,
  case
    when sp.amount - coalesce((select sum(c.amount) from public.collections c where c.sale_id = sp.sale_id), 0) <= 0.01
    then now() else null
  end
from public.sale_payments sp
join public.sales s on s.id = sp.sale_id
where sp.method = 'credit';

-- Link pre-existing collections rows to the commitment backfilled above
-- (one commitment per sale at this point, so the match is unambiguous).
update public.collections c
set debt_commitment_id = dc.id
from public.debt_commitments dc
where c.debt_commitment_id is null
  and dc.sale_id = c.sale_id;

create function public.collect_debt(
  p_commitment_id uuid,
  p_amount numeric,
  p_authorize_remainder boolean default false,
  p_new_due_date date default null
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

  insert into public.collections (client_id, sale_id, amount, debt_commitment_id)
  values (v_commitment.client_id, v_commitment.sale_id, p_amount, v_commitment.id);

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

create trigger debt_commitments_audit
after insert or update or delete on public.debt_commitments
for each row execute function public.log_audit_event();

alter table public.debt_commitments enable row level security;

create policy "super admins manage all debt_commitments"
  on public.debt_commitments for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "company members manage own debt_commitments"
  on public.debt_commitments for all
  using (client_id in (select id from public.clients where company_id = public.current_company_id()))
  with check (client_id in (select id from public.clients where company_id = public.current_company_id()));
