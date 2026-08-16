-- Let the client insert without knowing its own company_id — RLS's
-- WITH CHECK already guarantees correctness either way.
alter table public.products
  alter column company_id set default public.current_company_id();
