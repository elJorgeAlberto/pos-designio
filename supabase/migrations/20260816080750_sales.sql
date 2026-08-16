-- §4.4 Ventas. sale_items writes drive everything else: a trigger keeps
-- sales.total in sync and appends a matching 'sale' inventory_movements
-- row (reusing the stock trigger from the products module) — nobody
-- computes totals or stock client-side.
--
-- client_id / crédito are intentionally NOT here yet — §4.5 (clientes y
-- cuentas por cobrar) comes right after this module and adds them via
-- ALTER TABLE, same pattern as companies/users earlier. 'credit' is not
-- a valid sale_payments.method until then.

create table public.sales (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id),
  cash_register_id uuid not null references public.cash_registers (id),
  user_id uuid not null references public.users (id) default auth.uid(),
  total numeric(12, 2) not null default 0,
  created_at timestamptz not null default now()
);

create index sales_branch_id_idx on public.sales (branch_id);

create table public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales (id),
  product_id uuid not null references public.products (id),
  quantity numeric(12, 3) not null,
  unit_price numeric(12, 2) not null,
  unit_cost numeric(12, 2) not null,
  created_at timestamptz not null default now()
);

create index sale_items_sale_id_idx on public.sale_items (sale_id);

create table public.sale_payments (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales (id),
  method text not null check (method in ('cash', 'card', 'transfer')),
  amount numeric(12, 2) not null,
  created_at timestamptz not null default now()
);

create index sale_payments_sale_id_idx on public.sale_payments (sale_id);

create function public.apply_sale_item()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_branch_id uuid;
  v_user_id uuid;
begin
  select branch_id, user_id into v_branch_id, v_user_id
  from public.sales where id = new.sale_id;

  update public.sales
  set total = total + (new.quantity * new.unit_price)
  where id = new.sale_id;

  insert into public.inventory_movements (branch_id, product_id, type, quantity, reference_id, user_id)
  values (v_branch_id, new.product_id, 'sale', -new.quantity, new.sale_id, v_user_id);

  return new;
end;
$$;

create trigger sale_items_apply
after insert on public.sale_items
for each row execute function public.apply_sale_item();

create trigger sales_audit
after insert or update or delete on public.sales
for each row execute function public.log_audit_event();

alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.sale_payments enable row level security;

create policy "super admins manage all sales"
  on public.sales for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "company members manage own sales"
  on public.sales for all
  using (branch_id in (select id from public.branches where company_id = public.current_company_id()))
  with check (branch_id in (select id from public.branches where company_id = public.current_company_id()));

create policy "super admins manage all sale_items"
  on public.sale_items for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "company members manage own sale_items"
  on public.sale_items for all
  using (sale_id in (
    select id from public.sales where branch_id in (
      select id from public.branches where company_id = public.current_company_id()
    )
  ))
  with check (sale_id in (
    select id from public.sales where branch_id in (
      select id from public.branches where company_id = public.current_company_id()
    )
  ));

create policy "super admins manage all sale_payments"
  on public.sale_payments for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "company members manage own sale_payments"
  on public.sale_payments for all
  using (sale_id in (
    select id from public.sales where branch_id in (
      select id from public.branches where company_id = public.current_company_id()
    )
  ))
  with check (sale_id in (
    select id from public.sales where branch_id in (
      select id from public.branches where company_id = public.current_company_id()
    )
  ));
