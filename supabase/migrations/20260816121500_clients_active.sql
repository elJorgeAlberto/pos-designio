-- Soft-delete flag for clients: deactivating a client must never lose
-- their sales/receivables history, so this is a filter, not a DELETE.
alter table public.clients
  add column active boolean not null default true;
