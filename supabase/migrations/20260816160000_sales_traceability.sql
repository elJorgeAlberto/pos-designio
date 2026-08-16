-- Traceability needs a human-readable name for "who registered this
-- sale" / "who voided it" — there is currently no name field anywhere
-- (users are provisioned via the GoTrue Admin API directly), only the
-- raw user_id uuid.
alter table public.users
  add column name text;
