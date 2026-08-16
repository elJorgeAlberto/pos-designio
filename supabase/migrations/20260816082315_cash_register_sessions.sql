-- §4.8 Cortes de caja. A session covers one open→close shift on one
-- cash_register; sales.cash_register_session_id ties each sale to the
-- session it happened under, so the close calculation is an exact join,
-- not a timestamp-range guess. Only one open session per register at a
-- time (partial unique index).
--
-- Simplification: "salidas" from the formula in the doc (fondo + ventas
-- efectivo − salidas) isn't tracked yet — gastos (§4.7) isn't in Fase 1
-- scope, so expected_amount is opening_amount + cash sales only. Revisit
-- once gastos exists.

create table public.cash_register_sessions (
  id uuid primary key default gen_random_uuid(),
  cash_register_id uuid not null references public.cash_registers (id),
  opened_by uuid not null references public.users (id) default auth.uid(),
  opening_amount numeric(12, 2) not null,
  opened_at timestamptz not null default now(),
  closed_by uuid references public.users (id),
  counted_amount numeric(12, 2),
  expected_amount numeric(12, 2),
  difference numeric(12, 2),
  closed_at timestamptz
);

create unique index cash_register_sessions_one_open_idx
  on public.cash_register_sessions (cash_register_id)
  where closed_at is null;

alter table public.sales
  add column cash_register_session_id uuid references public.cash_register_sessions (id);

create function public.close_cash_register_session()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cash_sales numeric(12, 2);
begin
  if new.closed_at is not null and old.closed_at is null then
    select coalesce(sum(sp.amount), 0) into v_cash_sales
    from public.sale_payments sp
    join public.sales s on s.id = sp.sale_id
    where s.cash_register_session_id = new.id and sp.method = 'cash';

    new.expected_amount := new.opening_amount + v_cash_sales;
    new.difference := coalesce(new.counted_amount, 0) - new.expected_amount;
  end if;

  return new;
end;
$$;

create trigger cash_register_sessions_close
before update on public.cash_register_sessions
for each row execute function public.close_cash_register_session();

create trigger cash_register_sessions_audit
after insert or update on public.cash_register_sessions
for each row execute function public.log_audit_event();

alter table public.cash_register_sessions enable row level security;

create policy "super admins manage all cash_register_sessions"
  on public.cash_register_sessions for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "company members manage own cash_register_sessions"
  on public.cash_register_sessions for all
  using (cash_register_id in (
    select cr.id from public.cash_registers cr
    join public.branches b on b.id = cr.branch_id
    where b.company_id = public.current_company_id()
  ))
  with check (cash_register_id in (
    select cr.id from public.cash_registers cr
    join public.branches b on b.id = cr.branch_id
    where b.company_id = public.current_company_id()
  ));
