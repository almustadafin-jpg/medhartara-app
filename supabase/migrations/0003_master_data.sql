-- =========================================================
-- FASE 2 — MASTER DATA (selaras dengan 0001 & 0002)
-- =========================================================
-- CATATAN PENTING
-- Berkas Fase 2 asli (`0002_master_data.sql`) meng-CREATE tabel
-- customers & vendors dan memakai helper `auth_company()` /
-- `is_admin_finance()`. Pada proyek ini kedua tabel SUDAH dibuat di
-- 0001_schema.sql dan helper bernama `auth_company_id()` / `auth_role()`.
-- Migrasi ini menerapkan gagasan Fase 2 sebagai ALTER, bukan CREATE.
-- JANGAN jalankan 0002_master_data.sql versi asli.
-- =========================================================

-- ---------------------------------------------------------
-- 1. Kolom tambahan
-- ---------------------------------------------------------
alter table customers
  add column if not exists catatan    text,
  add column if not exists aktif      boolean not null default true,
  add column if not exists created_by uuid references users_profile(id);

alter table vendors
  add column if not exists alamat         text,
  add column if not exists bank_nama      text,
  add column if not exists bank_atas_nama text,
  add column if not exists catatan        text,
  add column if not exists aktif          boolean not null default true,
  add column if not exists created_by     uuid references users_profile(id),
  add column if not exists updated_at     timestamptz default now();

-- Modul pengguna Fase 2 menulis kolom ini; belum ada di 0001.
alter table users_profile
  add column if not exists telepon text;

-- ---------------------------------------------------------
-- 2. Indeks & keunikan nama (hanya di antara yang aktif)
-- ---------------------------------------------------------
create index if not exists idx_customers_company  on customers(company_id);
create index if not exists idx_customers_nama     on customers(lower(nama));
create unique index if not exists uq_customers_nama
  on customers(company_id, lower(nama)) where aktif;

create index if not exists idx_vendors_company    on vendors(company_id);
create index if not exists idx_vendors_kategori   on vendors(kategori);
create unique index if not exists uq_vendors_nama
  on vendors(company_id, lower(nama)) where aktif;

-- ---------------------------------------------------------
-- 3. Trigger updated_at untuk vendors (customers sudah ada di 0001)
-- ---------------------------------------------------------
drop trigger if exists trg_vendors_updated on vendors;
create trigger trg_vendors_updated before update on vendors
  for each row execute function set_updated_at();

-- ---------------------------------------------------------
-- 4. Ganti policy `for all` → insert/update terpisah
--    Tujuan: MENCABUT kemampuan DELETE. Penonaktifan memakai
--    kolom `aktif` (soft delete) agar riwayat proyek & invoice utuh.
-- ---------------------------------------------------------
drop policy if exists customers_write on customers;

create policy customers_insert on customers for insert to authenticated
  with check (auth_role() = 'admin_finance' and company_id = auth_company_id());

create policy customers_update on customers for update to authenticated
  using  (auth_role() = 'admin_finance' and company_id = auth_company_id())
  with check (auth_role() = 'admin_finance' and company_id = auth_company_id());

drop policy if exists vendors_write on vendors;

create policy vendors_insert on vendors for insert to authenticated
  with check (auth_role() in ('admin_finance','pm') and company_id = auth_company_id());

create policy vendors_update on vendors for update to authenticated
  using  (auth_role() in ('admin_finance','pm') and company_id = auth_company_id())
  with check (auth_role() in ('admin_finance','pm') and company_id = auth_company_id());

-- Tidak ada policy DELETE pada customers & vendors — hard delete tertutup.

-- ---------------------------------------------------------
-- 5. Verifikasi
-- ---------------------------------------------------------
-- select policyname, cmd from pg_policies
--   where tablename in ('customers','vendors') order by tablename, cmd;
-- Harapan: hanya SELECT, INSERT, UPDATE. Tidak ada DELETE.
