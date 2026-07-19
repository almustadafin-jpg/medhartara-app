-- =========================================================
-- Medhartara — Skema Awal (Fase 0)
-- =========================================================
create extension if not exists "uuid-ossp";

create type user_role        as enum ('direktur','admin_finance','pm');
create type quotation_status as enum ('draft','terkirim','disetujui','ditolak','dikonversi','arsip');
create type invoice_status   as enum ('draft','terkirim','sebagian_dibayar','lunas','jatuh_tempo','batal');
create type project_status   as enum ('prospek','berjalan','selesai','batal');
create type txn_type         as enum ('pemasukan','pengeluaran');
create type txn_method       as enum ('transfer','tunai','lainnya');

-- ---------- COMPANY ----------
create table companies (
  id uuid primary key default uuid_generate_v4(),
  nama text not null,
  npwp text, alamat text, telepon text, email text, logo_url text,
  bank_nama text, bank_rekening text, bank_atas_nama text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ---------- USERS ----------
create table users_profile (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid references companies(id),
  nama_lengkap text not null,
  role user_role not null default 'pm',
  aktif boolean default true,
  created_at timestamptz default now()
);

-- ---------- CUSTOMERS ----------
create table customers (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references companies(id),
  nama text not null,
  narahubung text, telepon text, email text, alamat text, npwp text,
  owner_id uuid references users_profile(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint customers_kontak_check check (telepon is not null or email is not null)
);

-- ---------- VENDORS ----------
create table vendors (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references companies(id),
  nama text not null,
  kategori text not null,
  narahubung text, telepon text, email text, bank_rekening text,
  created_at timestamptz default now()
);

-- ---------- PROJECTS ----------
create table projects (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references companies(id),
  kode text unique,
  nama text not null,
  customer_id uuid references customers(id) not null,
  pm_id uuid references users_profile(id),
  status project_status default 'prospek',
  tanggal_mulai date,
  tanggal_selesai date,
  deskripsi text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint projects_tanggal_check check (tanggal_selesai is null or tanggal_mulai is null or tanggal_selesai >= tanggal_mulai)
);

-- ---------- QUOTATIONS ----------
create table quotations (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references companies(id),
  nomor text unique not null,
  customer_id uuid references customers(id) not null,
  project_id uuid references projects(id),
  status quotation_status default 'draft',
  tanggal date default current_date,
  berlaku_hingga date,
  catatan text,
  diskon_persen numeric(5,2) default 0 check (diskon_persen between 0 and 100),
  pajak_persen  numeric(5,2) default 0 check (pajak_persen between 0 and 100),
  subtotal numeric(15,2) default 0,
  total    numeric(15,2) default 0,
  disetujui_oleh uuid references users_profile(id),
  disetujui_pada timestamptz,
  created_by uuid references users_profile(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint quotations_berlaku_check check (berlaku_hingga is null or berlaku_hingga >= tanggal)
);

create table quotation_items (
  id uuid primary key default uuid_generate_v4(),
  quotation_id uuid references quotations(id) on delete cascade,
  deskripsi text not null,
  kuantitas numeric(12,2) default 1 check (kuantitas > 0),
  satuan text,
  harga_satuan numeric(15,2) default 0 check (harga_satuan >= 0),
  subtotal numeric(15,2) generated always as (kuantitas * harga_satuan) stored,
  urutan int default 0
);

-- ---------- INVOICES ----------
create table invoices (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references companies(id),
  nomor text unique not null,
  quotation_id uuid references quotations(id),
  customer_id uuid references customers(id) not null,
  project_id uuid references projects(id),
  status invoice_status default 'draft',
  tanggal date default current_date,
  jatuh_tempo date not null,
  diskon_persen numeric(5,2) default 0 check (diskon_persen between 0 and 100),
  pajak_persen  numeric(5,2) default 0 check (pajak_persen between 0 and 100),
  subtotal numeric(15,2) default 0,
  total    numeric(15,2) default 0,
  catatan text,
  created_by uuid references users_profile(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint invoices_jatuh_tempo_check check (jatuh_tempo >= tanggal)
);

create table invoice_items (
  id uuid primary key default uuid_generate_v4(),
  invoice_id uuid references invoices(id) on delete cascade,
  deskripsi text not null,
  kuantitas numeric(12,2) default 1 check (kuantitas > 0),
  satuan text,
  harga_satuan numeric(15,2) default 0 check (harga_satuan >= 0),
  subtotal numeric(15,2) generated always as (kuantitas * harga_satuan) stored,
  urutan int default 0
);

-- ---------- PAYMENTS ----------
create table payments (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references companies(id),
  invoice_id uuid references invoices(id) on delete cascade,
  jumlah numeric(15,2) not null check (jumlah > 0),
  tanggal date default current_date,
  metode txn_method default 'transfer',
  termin_ke int,
  catatan text,
  created_by uuid references users_profile(id),
  created_at timestamptz default now()
);

-- ---------- TRANSACTIONS ----------
create table transactions (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references companies(id),
  tipe txn_type not null,
  jumlah numeric(15,2) not null check (jumlah > 0),
  tanggal date default current_date,
  kategori text,
  metode txn_method default 'transfer',
  project_id uuid references projects(id),
  vendor_id  uuid references vendors(id),
  invoice_id uuid references invoices(id),
  deskripsi text,
  created_by uuid references users_profile(id),
  created_at timestamptz default now(),
  constraint transactions_kategori_check check (tipe <> 'pengeluaran' or kategori is not null)
);

-- ---------- ATTACHMENTS ----------
create table attachments (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references companies(id),
  entity_type text not null,
  entity_id uuid not null,
  file_url text not null,
  file_nama text, file_tipe text, file_ukuran int,
  uploaded_by uuid references users_profile(id),
  created_at timestamptz default now()
);

-- ---------- DOCUMENT SEQUENCES ----------
create table document_sequences (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references companies(id),
  jenis text not null,
  tahun int not null,
  nomor_terakhir int default 0,
  unique (company_id, jenis, tahun)
);

create or replace function next_document_number(p_company uuid, p_jenis text, p_prefix text)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_tahun int := extract(year from now());
  v_nomor int;
begin
  insert into document_sequences (company_id, jenis, tahun, nomor_terakhir)
  values (p_company, p_jenis, v_tahun, 1)
  on conflict (company_id, jenis, tahun)
  do update set nomor_terakhir = document_sequences.nomor_terakhir + 1
  returning nomor_terakhir into v_nomor;
  return p_prefix || '-' || v_tahun || '-' || lpad(v_nomor::text, 4, '0');
end; $$;

-- ---------- AUDIT LOGS ----------
create table audit_logs (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references companies(id),
  actor_id uuid references users_profile(id),
  aksi text not null,
  entity_type text not null,
  entity_id uuid,
  data_lama jsonb,
  data_baru jsonb,
  created_at timestamptz default now()
);

-- ---------- INDEXES ----------
create index idx_projects_customer   on projects(customer_id);
create index idx_projects_pm         on projects(pm_id);
create index idx_quotations_customer on quotations(customer_id);
create index idx_quotations_project  on quotations(project_id);
create index idx_invoices_customer   on invoices(customer_id);
create index idx_invoices_project    on invoices(project_id);
create index idx_payments_invoice    on payments(invoice_id);
create index idx_txn_project         on transactions(project_id);
create index idx_txn_tanggal         on transactions(tanggal);
create index idx_attachments_entity  on attachments(entity_type, entity_id);
create index idx_audit_created       on audit_logs(created_at desc);

-- ---------- VIEW: PROFITABILITAS ----------
create or replace view project_profitability
with (security_invoker = on) as
select
  p.id as project_id,
  p.company_id,
  p.nama,
  coalesce(sum(t.jumlah) filter (where t.tipe='pemasukan'), 0)   as total_pemasukan,
  coalesce(sum(t.jumlah) filter (where t.tipe='pengeluaran'), 0) as total_pengeluaran,
  coalesce(sum(t.jumlah) filter (where t.tipe='pemasukan'), 0)
    - coalesce(sum(t.jumlah) filter (where t.tipe='pengeluaran'), 0) as profit
from projects p
left join transactions t on t.project_id = p.id
group by p.id, p.company_id, p.nama;

-- ---------- TRIGGER: updated_at ----------
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

do $$
declare t text;
begin
  foreach t in array array['companies','customers','projects','quotations','invoices'] loop
    execute format('create trigger trg_%s_updated before update on %I for each row execute function set_updated_at()', t, t);
  end loop;
end $$;
