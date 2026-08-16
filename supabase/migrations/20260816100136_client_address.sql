-- §8: free-text address captured by hand by the cashier, independent of
-- the lat/lng pin (which the §4.5 migration already added to clients).
alter table public.clients
  add column address text;
