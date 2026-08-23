-- Personal: empleados (separado de public.users — login opcional vía
-- user_id), horarios, asistencia, préstamos (ledger inmutable, igual que
-- suppliers.balance: amount - sum(deductions), no reconstrucción como
-- debt_commitments) y vacaciones (días sugeridos por LFT calculados en
-- el cliente desde hire_date, vacation_days_override los sobreescribe).

create table public.employees (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default public.current_company_id() references public.companies (id),
  user_id uuid references public.users (id),
  name text not null,
  phone text,
  email text,
  address text,
  curp text,
  rfc text,
  nss text,
  position text,
  hire_date date,
  termination_date date,
  active boolean not null default true,
  salary numeric(12, 2),
  pay_frequency text check (pay_frequency in ('semanal', 'quincenal', 'mensual')),
  vacation_days_override int,
  emergency_contact_name text,
  emergency_contact_phone text,
  photo_url text,
  notes text,
  created_at timestamptz not null default now()
);

create index employees_company_id_idx on public.employees (company_id);

create table public.employee_schedules (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  weekday int not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null
);

create index employee_schedules_employee_id_idx on public.employee_schedules (employee_id);

create table public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  date date not null,
  check_in timestamptz,
  check_out timestamptz,
  status text not null default 'present'
    check (status in ('present', 'absent', 'late', 'permission', 'vacation')),
  note text,
  created_at timestamptz not null default now(),
  unique (employee_id, date)
);

create index attendance_records_employee_id_idx on public.attendance_records (employee_id);
create index attendance_records_date_idx on public.attendance_records (date);

create table public.employee_loans (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  amount numeric(12, 2) not null,
  note text,
  created_at timestamptz not null default now()
);

create index employee_loans_employee_id_idx on public.employee_loans (employee_id);

create table public.loan_deductions (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references public.employee_loans (id) on delete cascade,
  amount numeric(12, 2) not null,
  note text,
  created_at timestamptz not null default now()
);

create index loan_deductions_loan_id_idx on public.loan_deductions (loan_id);

create table public.vacation_periods (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  start_date date not null,
  end_date date not null,
  days numeric(4, 1) not null,
  note text,
  created_at timestamptz not null default now()
);

create index vacation_periods_employee_id_idx on public.vacation_periods (employee_id);

alter table public.employees enable row level security;
alter table public.employee_schedules enable row level security;
alter table public.attendance_records enable row level security;
alter table public.employee_loans enable row level security;
alter table public.loan_deductions enable row level security;
alter table public.vacation_periods enable row level security;

create policy "super admins manage all employees"
  on public.employees for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "company members manage own employees"
  on public.employees for all
  using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

create policy "super admins manage all employee_schedules"
  on public.employee_schedules for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "company members manage own employee_schedules"
  on public.employee_schedules for all
  using (employee_id in (select id from public.employees where company_id = public.current_company_id()))
  with check (employee_id in (select id from public.employees where company_id = public.current_company_id()));

create policy "super admins manage all attendance_records"
  on public.attendance_records for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "company members manage own attendance_records"
  on public.attendance_records for all
  using (employee_id in (select id from public.employees where company_id = public.current_company_id()))
  with check (employee_id in (select id from public.employees where company_id = public.current_company_id()));

create policy "super admins manage all employee_loans"
  on public.employee_loans for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "company members manage own employee_loans"
  on public.employee_loans for all
  using (employee_id in (select id from public.employees where company_id = public.current_company_id()))
  with check (employee_id in (select id from public.employees where company_id = public.current_company_id()));

create policy "super admins manage all loan_deductions"
  on public.loan_deductions for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "company members manage own loan_deductions"
  on public.loan_deductions for all
  using (loan_id in (
    select l.id from public.employee_loans l
    join public.employees e on e.id = l.employee_id
    where e.company_id = public.current_company_id()
  ))
  with check (loan_id in (
    select l.id from public.employee_loans l
    join public.employees e on e.id = l.employee_id
    where e.company_id = public.current_company_id()
  ));

create policy "super admins manage all vacation_periods"
  on public.vacation_periods for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "company members manage own vacation_periods"
  on public.vacation_periods for all
  using (employee_id in (select id from public.employees where company_id = public.current_company_id()))
  with check (employee_id in (select id from public.employees where company_id = public.current_company_id()));

create trigger employees_audit
after insert or update or delete on public.employees
for each row execute function public.log_audit_event();

create trigger employee_loans_audit
after insert or update or delete on public.employee_loans
for each row execute function public.log_audit_event();

-- Private bucket — unlike product-images/ticket-logos, employee photos
-- are PII and should not be publicly readable by a guessed URL. Frontend
-- must use createSignedUrl, not getPublicUrl.
insert into storage.buckets (id, name, public)
values ('staff-documents', 'staff-documents', false);

create policy "company members read own staff documents"
  on storage.objects for select
  using (
    bucket_id = 'staff-documents'
    and (storage.foldername(name))[1] = public.current_company_id()::text
  );

create policy "company members upload own staff documents"
  on storage.objects for insert
  with check (
    bucket_id = 'staff-documents'
    and (storage.foldername(name))[1] = public.current_company_id()::text
  );

create policy "company members update own staff documents"
  on storage.objects for update
  using (
    bucket_id = 'staff-documents'
    and (storage.foldername(name))[1] = public.current_company_id()::text
  );

create policy "company members delete own staff documents"
  on storage.objects for delete
  using (
    bucket_id = 'staff-documents'
    and (storage.foldername(name))[1] = public.current_company_id()::text
  );

insert into public.permissions (key, description) values
  ('staff.view', 'Ver personal, asistencia, préstamos y vacaciones'),
  ('staff.manage', 'Administrar personal, horarios, préstamos y vacaciones');
