-- §4.4 discounts (left undetailed by the doc, "pendiente de detallar en
-- Fase 2" — design decision made here): a single discount amount per
-- sale (not per line, not a percentage) — simplest model that fits an
-- informal "te lo dejo en $200" negotiation. sales.total stays the
-- gross subtotal (unchanged meaning, still driven by the sale_items
-- trigger); amount actually owed = total - discount_amount, computed
-- in the app, not stored redundantly.

alter table public.sales
  add column discount_amount numeric(12, 2) not null default 0 check (discount_amount >= 0);
