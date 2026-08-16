-- §11 Fase 2: devoluciones/cancelaciones — "revierte stock y saldo,
-- restringido por rol, con auditoría". Full-sale void only (not partial
-- line returns — undetailed by the doc, kept simple).
--
-- has_permission() is the first real role-based restriction in the app
-- (everything so far was company-scoped only, not role-scoped) — it's
-- enforced here at the RLS level, not just hidden in the UI, since
-- voiding reverses real stock and money.

create function public.has_permission(permission_key text)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select public.is_super_admin() or exists (
    select 1
    from public.users u
    join public.role_permissions rp on rp.role_id = u.role_id
    join public.permissions p on p.id = rp.permission_id
    where u.id = auth.uid() and p.key = permission_key
  );
$$;

alter table public.sales
  add column voided_at timestamptz,
  add column voided_by uuid references public.users (id);

alter table public.inventory_movements
  drop constraint inventory_movements_type_check,
  add constraint inventory_movements_type_check
    check (type in ('sale', 'purchase', 'transfer_in', 'transfer_out', 'adjustment', 'return'));

create function public.void_sale()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item record;
begin
  if new.voided_at is not null and old.voided_at is null then
    for v_item in select product_id, quantity from public.sale_items where sale_id = new.id loop
      insert into public.inventory_movements (branch_id, product_id, type, quantity, reference_id, user_id)
      values (new.branch_id, v_item.product_id, 'return', v_item.quantity, new.id, new.voided_by);
    end loop;
  end if;
  return new;
end;
$$;

create trigger sales_void_reverses_stock
after update on public.sales
for each row execute function public.void_sale();

-- Split the old blanket "for all" policy so voiding (UPDATE) can be
-- restricted separately from creating/reading a sale.
drop policy "company members manage own sales" on public.sales;

create policy "company members create own sales"
  on public.sales for insert
  with check (branch_id in (select id from public.branches where company_id = public.current_company_id()));

create policy "company members read own sales"
  on public.sales for select
  using (branch_id in (select id from public.branches where company_id = public.current_company_id()));

create policy "company members void own sales"
  on public.sales for update
  using (
    branch_id in (select id from public.branches where company_id = public.current_company_id())
    and public.has_permission('sales.void')
  )
  with check (
    branch_id in (select id from public.branches where company_id = public.current_company_id())
    and public.has_permission('sales.void')
  );
