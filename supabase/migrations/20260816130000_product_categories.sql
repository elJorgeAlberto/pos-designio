-- Category tree for products: a single self-referencing table instead
-- of fixed categoría/sección/familia/subfamilia columns — a product
-- points to whichever node in the tree is specific enough for it, and
-- nothing forces filling in a level that isn't needed. The UI presents
-- this as a cascading picker but the schema doesn't hard-code depth.

create table public.product_categories (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default public.current_company_id() references public.companies (id),
  parent_id uuid references public.product_categories (id),
  name text not null,
  created_at timestamptz not null default now()
);

create index product_categories_company_id_idx on public.product_categories (company_id);
create index product_categories_parent_id_idx on public.product_categories (parent_id);

alter table public.products
  add column category_id uuid references public.product_categories (id);

alter table public.product_categories enable row level security;

create policy "super admins manage all product_categories"
  on public.product_categories for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "company members manage own product_categories"
  on public.product_categories for all
  using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());
