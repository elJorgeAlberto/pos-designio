-- More invoicing-relevant fields for client_organizations, per explicit
-- request to look past the minimum: régimen fiscal + código postal are
-- both required by CFDI 4.0 (Mexican e-invoicing) alongside RFC, and
-- contact_name/notes are plain CRM value (who to call, anything worth
-- remembering about the account) — same idea as suppliers.notes.

alter table public.client_organizations
  add column tax_regime text,
  add column postal_code text,
  add column contact_name text,
  add column notes text;
