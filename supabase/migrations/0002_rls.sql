-- =========================================================
-- Medhartara — Row Level Security (Fase 1)
-- Prinsip: default DENY. Semua akses lewat policy eksplisit.
-- =========================================================

-- ---------------------------------------------------------
-- Helper (SECURITY DEFINER agar tidak rekursif ke users_profile)
-- ---------------------------------------------------------
create or replace function auth_company_id()
returns uuid language sql stable security definer set search_path = public as $$
  select company_id from users_profile where id = auth.uid() and aktif;
$$;

create or replace function auth_role()
returns user_role language sql stable security definer set search_path = public as $$
  select role from users_profile where id = auth.uid() and aktif;
$$;

create or replace function is_pm_of(p_project uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from projects where id = p_project and pm_id = auth.uid());
$$;

revoke execute on function auth_company_id(), auth_role(), is_pm_of(uuid) from anon;

-- ---------------------------------------------------------
-- Aktifkan RLS di SEMUA tabel
-- ---------------------------------------------------------
alter table companies          enable row level security;
alter table users_profile      enable row level security;
alter table customers          enable row level security;
alter table vendors            enable row level security;
alter table projects           enable row level security;
alter table quotations         enable row level security;
alter table quotation_items    enable row level security;
alter table invoices           enable row level security;
alter table invoice_items      enable row level security;
alter table payments           enable row level security;
alter table transactions       enable row level security;
alter table attachments        enable row level security;
alter table document_sequences enable row level security;
alter table audit_logs         enable row level security;

-- ---------------------------------------------------------
-- COMPANIES — semua baca, Direktur & Admin/Finance ubah
-- ---------------------------------------------------------
create policy companies_select on companies for select to authenticated
  using (id = auth_company_id());
create policy companies_update on companies for update to authenticated
  using (id = auth_company_id() and auth_role() in ('direktur','admin_finance'))
  with check (id = auth_company_id());

-- ---------------------------------------------------------
-- USERS_PROFILE — baca profil sendiri; Direktur/Admin baca semua;
-- hanya Admin/Finance yang mengelola
-- ---------------------------------------------------------
create policy users_select_self on users_profile for select to authenticated
  using (id = auth.uid());
create policy users_select_all on users_profile for select to authenticated
  using (company_id = auth_company_id() and auth_role() in ('direktur','admin_finance'));
create policy users_manage on users_profile for all to authenticated
  using (company_id = auth_company_id() and auth_role() = 'admin_finance')
  with check (company_id = auth_company_id());

-- ---------------------------------------------------------
-- CUSTOMERS — semua baca, hanya Admin/Finance tulis
-- ---------------------------------------------------------
create policy customers_select on customers for select to authenticated
  using (company_id = auth_company_id());
create policy customers_write on customers for all to authenticated
  using (company_id = auth_company_id() and auth_role() = 'admin_finance')
  with check (company_id = auth_company_id());

-- ---------------------------------------------------------
-- VENDORS — semua baca, Admin/Finance & PM tulis
-- ---------------------------------------------------------
create policy vendors_select on vendors for select to authenticated
  using (company_id = auth_company_id());
create policy vendors_write on vendors for all to authenticated
  using (company_id = auth_company_id() and auth_role() in ('admin_finance','pm'))
  with check (company_id = auth_company_id());

-- ---------------------------------------------------------
-- PROJECTS — semua baca; Direktur/Admin tulis penuh; PM hanya proyeknya
-- ---------------------------------------------------------
create policy projects_select on projects for select to authenticated
  using (company_id = auth_company_id());
create policy projects_write_admin on projects for all to authenticated
  using (company_id = auth_company_id() and auth_role() in ('direktur','admin_finance'))
  with check (company_id = auth_company_id());
create policy projects_insert_pm on projects for insert to authenticated
  with check (company_id = auth_company_id() and auth_role() = 'pm' and pm_id = auth.uid());
create policy projects_update_pm on projects for update to authenticated
  using (company_id = auth_company_id() and auth_role() = 'pm' and pm_id = auth.uid())
  with check (company_id = auth_company_id() and pm_id = auth.uid());

-- ---------------------------------------------------------
-- QUOTATIONS
-- Baca: Direktur/Admin semua; PM hanya penawaran proyeknya / buatannya.
-- Tulis: Admin/Finance penuh; PM untuk proyek yang ia pegang.
-- Approve (Direktur): update terbatas — pembuat != penyetuju.
-- ---------------------------------------------------------
create policy quotations_select on quotations for select to authenticated
  using (
    company_id = auth_company_id()
    and (auth_role() in ('direktur','admin_finance')
         or created_by = auth.uid()
         or is_pm_of(project_id))
  );
create policy quotations_write_admin on quotations for all to authenticated
  using (company_id = auth_company_id() and auth_role() = 'admin_finance')
  with check (company_id = auth_company_id());
create policy quotations_insert_pm on quotations for insert to authenticated
  with check (company_id = auth_company_id() and auth_role() = 'pm'
              and created_by = auth.uid() and is_pm_of(project_id));
create policy quotations_update_pm on quotations for update to authenticated
  using (company_id = auth_company_id() and auth_role() = 'pm'
         and is_pm_of(project_id) and status = 'draft')
  with check (company_id = auth_company_id() and status in ('draft','terkirim'));
create policy quotations_approve on quotations for update to authenticated
  using (company_id = auth_company_id() and auth_role() = 'direktur' and status = 'terkirim')
  with check (company_id = auth_company_id() and status in ('disetujui','ditolak'));

-- QUOTATION_ITEMS — mengikuti induknya
create policy quotation_items_select on quotation_items for select to authenticated
  using (exists (select 1 from quotations q where q.id = quotation_id));
create policy quotation_items_write on quotation_items for all to authenticated
  using (exists (select 1 from quotations q where q.id = quotation_id
                 and q.status = 'draft' and auth_role() in ('admin_finance','pm')))
  with check (exists (select 1 from quotations q where q.id = quotation_id and q.status = 'draft'));

-- ---------------------------------------------------------
-- INVOICES — Direktur baca, Admin/Finance kelola. PM tidak akses.
-- ---------------------------------------------------------
create policy invoices_select on invoices for select to authenticated
  using (company_id = auth_company_id() and auth_role() in ('direktur','admin_finance'));
create policy invoices_write on invoices for all to authenticated
  using (company_id = auth_company_id() and auth_role() = 'admin_finance')
  with check (company_id = auth_company_id());

create policy invoice_items_select on invoice_items for select to authenticated
  using (exists (select 1 from invoices i where i.id = invoice_id));
create policy invoice_items_write on invoice_items for all to authenticated
  using (auth_role() = 'admin_finance' and exists (select 1 from invoices i where i.id = invoice_id))
  with check (exists (select 1 from invoices i where i.id = invoice_id));

-- ---------------------------------------------------------
-- PAYMENTS — Direktur baca, Admin/Finance catat
-- ---------------------------------------------------------
create policy payments_select on payments for select to authenticated
  using (company_id = auth_company_id() and auth_role() in ('direktur','admin_finance'));
create policy payments_write on payments for all to authenticated
  using (company_id = auth_company_id() and auth_role() = 'admin_finance')
  with check (company_id = auth_company_id());

-- ---------------------------------------------------------
-- TRANSACTIONS
-- Baca: Direktur/Admin semua; PM hanya transaksi proyeknya.
-- Tulis: Admin/Finance penuh; PM hanya pengeluaran pada proyeknya.
-- ---------------------------------------------------------
create policy transactions_select on transactions for select to authenticated
  using (company_id = auth_company_id()
         and (auth_role() in ('direktur','admin_finance') or is_pm_of(project_id)));
create policy transactions_write_admin on transactions for all to authenticated
  using (company_id = auth_company_id() and auth_role() = 'admin_finance')
  with check (company_id = auth_company_id());
create policy transactions_insert_pm on transactions for insert to authenticated
  with check (company_id = auth_company_id() and auth_role() = 'pm'
              and tipe = 'pengeluaran' and is_pm_of(project_id) and created_by = auth.uid());

-- ---------------------------------------------------------
-- ATTACHMENTS — semua peran boleh unggah & baca dalam perusahaannya
-- ---------------------------------------------------------
create policy attachments_select on attachments for select to authenticated
  using (company_id = auth_company_id());
create policy attachments_insert on attachments for insert to authenticated
  with check (company_id = auth_company_id() and uploaded_by = auth.uid());
create policy attachments_delete on attachments for delete to authenticated
  using (company_id = auth_company_id()
         and (auth_role() = 'admin_finance' or uploaded_by = auth.uid()));

-- ---------------------------------------------------------
-- DOCUMENT_SEQUENCES — hanya lewat fungsi. Tanpa policy = tertutup total.
-- ---------------------------------------------------------
-- (sengaja tidak ada policy)

-- ---------------------------------------------------------
-- AUDIT_LOGS — Direktur & Admin baca. Tulis hanya lewat trigger/server.
-- ---------------------------------------------------------
create policy audit_select on audit_logs for select to authenticated
  using (company_id = auth_company_id() and auth_role() in ('direktur','admin_finance'));

-- ---------------------------------------------------------
-- Auto-buat profil saat pengguna baru mendaftar
-- ---------------------------------------------------------
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into users_profile (id, company_id, nama_lengkap, role)
  values (
    new.id,
    (select id from companies order by created_at limit 1),
    coalesce(new.raw_user_meta_data->>'nama_lengkap', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'pm')
  );
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
