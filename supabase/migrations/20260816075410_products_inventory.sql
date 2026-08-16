-- §4.3 Productos e inventario. products are company-wide (price/cost don't
-- vary by branch); stock does, so it's tracked per branch via an
-- append-only inventory_movements ledger that maintains product_stock
-- through a trigger — nobody writes product_stock directly, and movements
-- are immutable (no update/delete policies).

create table public.products (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id),
  name text not null,
  sale_type text not null check (sale_type in ('piece', 'weight')),
  unit text not null,
  barcode text,
  cost numeric(12, 2) not null default 0,
  price numeric(12, 2) not null default 0,
  created_at timestamptz not null default now()
);

create index products_company_id_idx on public.products (company_id);
create unique index products_company_barcode_key on public.products (company_id, barcode) where barcode is not null;

create table public.product_stock (
  product_id uuid not null references public.products (id),
  branch_id uuid not null references public.branches (id),
  quantity numeric(12, 3) not null default 0,
  primary key (product_id, branch_id)
);

create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id),
  product_id uuid not null references public.products (id),
  type text not null check (type in ('sale', 'purchase', 'transfer_in', 'transfer_out', 'adjustment')),
  quantity numeric(12, 3) not null,
  reference_id uuid,
  user_id uuid references public.users (id),
  created_at timestamptz not null default now()
);

create index inventory_movements_branch_product_idx on public.inventory_movements (branch_id, product_id);

create function public.apply_inventory_movement()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.product_stock (product_id, branch_id, quantity)
  values (new.product_id, new.branch_id, new.quantity)
  on conflict (product_id, branch_id)
  do update set quantity = public.product_stock.quantity + excluded.quantity;

  return new;
end;
$$;

create trigger inventory_movements_apply_stock
after insert on public.inventory_movements
for each row execute function public.apply_inventory_movement();

create trigger products_audit
after insert or update or delete on public.products
for each row execute function public.log_audit_event();

alter table public.products enable row level security;
alter table public.product_stock enable row level security;
alter table public.inventory_movements enable row level security;

create policy "super admins manage all products"
  on public.products for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "company members manage own products"
  on public.products for all
  using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

create policy "super admins read all product_stock"
  on public.product_stock for select
  using (public.is_super_admin());

create policy "company members read own product_stock"
  on public.product_stock for select
  using (
    product_id in (select id from public.products where company_id = public.current_company_id())
  );

create policy "super admins manage all inventory_movements"
  on public.inventory_movements for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "company members read own inventory_movements"
  on public.inventory_movements for select
  using (
    product_id in (select id from public.products where company_id = public.current_company_id())
  );

create policy "company members create own inventory_movements"
  on public.inventory_movements for insert
  with check (
    product_id in (select id from public.products where company_id = public.current_company_id())
  );
