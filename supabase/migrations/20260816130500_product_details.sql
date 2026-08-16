-- More product fields (description/brand/sku/min_stock), a note column
-- on inventory_movements for manual-adjustment reasons, and images —
-- a company-scoped Storage bucket, same pattern as ticket-logos.

alter table public.products
  add column description text,
  add column brand text,
  add column sku text,
  add column min_stock numeric(12, 3);

alter table public.inventory_movements
  add column note text;

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id),
  url text not null,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create index product_images_product_id_idx on public.product_images (product_id);

alter table public.product_images enable row level security;

create policy "super admins manage all product_images"
  on public.product_images for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "company members manage own product_images"
  on public.product_images for all
  using (product_id in (select id from public.products where company_id = public.current_company_id()))
  with check (product_id in (select id from public.products where company_id = public.current_company_id()));

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true);

create policy "anyone can read product images"
  on storage.objects for select
  using (bucket_id = 'product-images');

create policy "company members upload own product images"
  on storage.objects for insert
  with check (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = public.current_company_id()::text
  );

create policy "company members update own product images"
  on storage.objects for update
  using (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = public.current_company_id()::text
  );

create policy "company members delete own product images"
  on storage.objects for delete
  using (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = public.current_company_id()::text
  );
