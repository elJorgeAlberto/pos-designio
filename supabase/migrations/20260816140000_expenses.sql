-- §4.7 Gastos. Cash expenses (gasolina, etc.) come out of the till just
-- like a sale adds to it, so close_cash_register_session() needs to
-- subtract them — the function already carried a comment anticipating
-- this exact moment.

create table public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default public.current_company_id() references public.companies (id),
  name text not null
);

create index expense_categories_company_id_idx on public.expense_categories (company_id);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id),
  category_id uuid references public.expense_categories (id),
  cash_register_session_id uuid references public.cash_register_sessions (id),
  method text not null check (method in ('cash', 'card', 'transfer')),
  amount numeric(12, 2) not null,
  description text,
  user_id uuid not null references public.users (id) default auth.uid(),
  created_at timestamptz not null default now()
);

create index expenses_branch_id_idx on public.expenses (branch_id);
create index expenses_cash_register_session_id_idx on public.expenses (cash_register_session_id);

create or replace function public.close_cash_register_session()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cash_sales numeric(12, 2);
  v_cash_expenses numeric(12, 2);
begin
  if new.closed_at is not null and old.closed_at is null then
    select coalesce(sum(sp.amount), 0) into v_cash_sales
    from public.sale_payments sp
    join public.sales s on s.id = sp.sale_id
    where s.cash_register_session_id = new.id and sp.method = 'cash';

    select coalesce(sum(e.amount), 0) into v_cash_expenses
    from public.expenses e
    where e.cash_register_session_id = new.id and e.method = 'cash';

    new.expected_amount := new.opening_amount + v_cash_sales - v_cash_expenses;
    new.difference := coalesce(new.counted_amount, 0) - new.expected_amount;
  end if;

  return new;
end;
$$;

create trigger expenses_audit
after insert or update or delete on public.expenses
for each row execute function public.log_audit_event();

alter table public.expense_categories enable row level security;
alter table public.expenses enable row level security;

create policy "super admins manage all expense_categories"
  on public.expense_categories for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "company members manage own expense_categories"
  on public.expense_categories for all
  using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

create policy "super admins manage all expenses"
  on public.expenses for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "company members manage own expenses"
  on public.expenses for all
  using (branch_id in (select id from public.branches where company_id = public.current_company_id()))
  with check (branch_id in (select id from public.branches where company_id = public.current_company_id()));
