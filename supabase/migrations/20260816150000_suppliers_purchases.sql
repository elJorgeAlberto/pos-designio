-- §4.6 Proveedores y compras. A purchase adds stock automatically
-- (reusing the 'purchase' inventory_movements type that has existed
-- since the products module but was never actually used) and keeps
-- products.cost current (last-purchase-cost-wins). Balance owed per
-- supplier is the same simple sum-based model ClientsPage used before
-- debt_commitments existed — no renegotiation needed here, the user
-- only asked to track what's owed, not manage payment plans.

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default public.current_company_id() references public.companies (id),
  name text not null,
  phone text,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index suppliers_company_id_idx on public.suppliers (company_id);

create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers (id),
  branch_id uuid not null references public.branches (id),
  total numeric(12, 2) not null default 0,
  user_id uuid not null references public.users (id) default auth.uid(),
  created_at timestamptz not null default now()
);

create index purchases_supplier_id_idx on public.purchases (supplier_id);

create table public.purchase_items (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.purchases (id),
  product_id uuid not null references public.products (id),
  quantity numeric(12, 3) not null,
  unit_cost numeric(12, 2) not null
);

create index purchase_items_purchase_id_idx on public.purchase_items (purchase_id);

create table public.supplier_payments (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers (id),
  purchase_id uuid references public.purchases (id),
  amount numeric(12, 2) not null,
  method text not null check (method in ('cash', 'card', 'transfer')),
  cash_register_session_id uuid references public.cash_register_sessions (id),
  created_at timestamptz not null default now()
);

create index supplier_payments_supplier_id_idx on public.supplier_payments (supplier_id);

create function public.apply_purchase_item()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_branch_id uuid;
begin
  select branch_id into v_branch_id from public.purchases where id = new.purchase_id;

  update public.purchases
  set total = total + (new.quantity * new.unit_cost)
  where id = new.purchase_id;

  insert into public.inventory_movements (branch_id, product_id, type, quantity, reference_id, note)
  values (v_branch_id, new.product_id, 'purchase', new.quantity, new.purchase_id, 'Compra a proveedor');

  update public.products set cost = new.unit_cost where id = new.product_id;

  return new;
end;
$$;

create trigger purchase_items_apply
after insert on public.purchase_items
for each row execute function public.apply_purchase_item();

-- Third and last rewrite of this function: paying a supplier in cash
-- comes out of the till exactly like an expense does.
create or replace function public.close_cash_register_session()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cash_sales numeric(12, 2);
  v_cash_out numeric(12, 2);
begin
  if new.closed_at is not null and old.closed_at is null then
    select coalesce(sum(sp.amount), 0) into v_cash_sales
    from public.sale_payments sp
    join public.sales s on s.id = sp.sale_id
    where s.cash_register_session_id = new.id and sp.method = 'cash';

    select
      coalesce((select sum(e.amount) from public.expenses e where e.cash_register_session_id = new.id and e.method = 'cash'), 0)
      + coalesce((select sum(p.amount) from public.supplier_payments p where p.cash_register_session_id = new.id and p.method = 'cash'), 0)
    into v_cash_out;

    new.expected_amount := new.opening_amount + v_cash_sales - v_cash_out;
    new.difference := coalesce(new.counted_amount, 0) - new.expected_amount;
  end if;

  return new;
end;
$$;

create trigger suppliers_audit
after insert or update or delete on public.suppliers
for each row execute function public.log_audit_event();

create trigger purchases_audit
after insert or update or delete on public.purchases
for each row execute function public.log_audit_event();

alter table public.suppliers enable row level security;
alter table public.purchases enable row level security;
alter table public.purchase_items enable row level security;
alter table public.supplier_payments enable row level security;

create policy "super admins manage all suppliers"
  on public.suppliers for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "company members manage own suppliers"
  on public.suppliers for all
  using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

create policy "super admins manage all purchases"
  on public.purchases for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "company members manage own purchases"
  on public.purchases for all
  using (supplier_id in (select id from public.suppliers where company_id = public.current_company_id()))
  with check (supplier_id in (select id from public.suppliers where company_id = public.current_company_id()));

create policy "super admins manage all purchase_items"
  on public.purchase_items for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "company members manage own purchase_items"
  on public.purchase_items for all
  using (purchase_id in (
    select id from public.purchases where supplier_id in (
      select id from public.suppliers where company_id = public.current_company_id()
    )
  ))
  with check (purchase_id in (
    select id from public.purchases where supplier_id in (
      select id from public.suppliers where company_id = public.current_company_id()
    )
  ));

create policy "super admins manage all supplier_payments"
  on public.supplier_payments for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "company members manage own supplier_payments"
  on public.supplier_payments for all
  using (supplier_id in (select id from public.suppliers where company_id = public.current_company_id()))
  with check (supplier_id in (select id from public.suppliers where company_id = public.current_company_id()));
