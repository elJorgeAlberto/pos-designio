-- Shared reference catalog, not tenant data — safe to ship in every
-- environment (dev/prod).
insert into public.business_types (name) values
  ('Cárnicos'),
  ('Abarrotes'),
  ('Ferretería'),
  ('Farmacia'),
  ('Ropa y calzado'),
  ('Papelería'),
  ('Otro');
