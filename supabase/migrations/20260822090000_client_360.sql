-- Client 360 profile: contact info + legacy/manual debts that predate
-- this system, so Cobros Pendientes stays accurate for money already
-- owed before go-live ("adeudos pasados").
--
-- debt_commitments/collections both required sale_id — every commitment
-- was assumed to come from a credit sale_payment (open_debt_commitment()
-- trigger). A manual debt has no sale to point to, so sale_id becomes
-- optional; collect_debt() already just copies whatever is on the
-- commitment through to collections, so it keeps working unchanged.

alter table public.clients add column phone text;

alter table public.debt_commitments
  alter column sale_id drop not null,
  add column note text;

alter table public.collections
  alter column sale_id drop not null;
