alter table public.products add column margin_percent numeric(5, 2);

-- Let the client create a branch without knowing its own company_id,
-- same convention as products/clients/expenses/suppliers/etc.
alter table public.branches
  alter column company_id set default public.current_company_id();
