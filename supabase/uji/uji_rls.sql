-- =========================================================
-- UJI RLS OTOMATIS — Medhartara Production (Fase 8)
-- =========================================================
--
-- PERINGATAN PALING PENTING
-- -------------------------
-- SQL Editor Supabase berjalan sebagai peran `postgres`, yang
-- MELEWATI seluruh Row Level Security. Menjalankan
--   select * from customers;
-- di sana lalu melihat datanya BUKAN berarti RLS bekerja —
-- Anda hanya melihat hak superuser.
--
-- Skrip ini menghindari jebakan itu dengan `set local role
-- authenticated` sebelum setiap perintah diuji, sehingga policy
-- benar-benar dievaluasi.
--
-- CARA PAKAI
-- ----------
-- 1. Pastikan sudah ada tiga pengguna dengan peran berbeda.
-- 2. Isi ketiga UUID di bagian KONFIGURASI di bawah.
-- 3. Jalankan seluruh berkas ini di SQL Editor.
-- 4. Baca tabel hasil di akhir. Semua baris harus LULUS.
-- 5. Jalankan bagian PEMBERSIHAN (paling bawah) setelah selesai.
--
-- Data uji diberi awalan 'ZZ-UJI' agar mudah dikenali & dihapus.
-- =========================================================


-- =========================================================
-- BAGIAN 0 — KONFIGURASI
-- =========================================================
create schema if not exists uji;

drop table if exists uji.konfig;
create table uji.konfig (
  kunci text primary key,
  nilai uuid
);

-- ↓↓↓ ISI TIGA UUID INI ↓↓↓
-- select id, nama_lengkap, role from users_profile order by role;
insert into uji.konfig (kunci, nilai) values
  ('direktur',      '00000000-0000-0000-0000-000000000001'),
  ('admin_finance', '00000000-0000-0000-0000-000000000002'),
  ('pm_a',          '00000000-0000-0000-0000-000000000003'),
  ('pm_b',          '00000000-0000-0000-0000-000000000004');
-- ↑↑↑ pm_b opsional; bila hanya ada satu PM, isi dengan UUID yang sama
--     seperti pm_a — uji kepemilikan lintas-PM otomatis dilewati.

create or replace function uji.id(p_kunci text)
returns uuid language sql stable as $$
  select nilai from uji.konfig where kunci = p_kunci;
$$;


-- =========================================================
-- BAGIAN 1 — HARNESS PENGUJIAN
-- =========================================================
drop table if exists uji.hasil;
create table uji.hasil (
  no        serial primary key,
  kelompok  text,
  peran     text,
  nama      text,
  harapan   text,
  hasil     text,
  keterangan text
);

/**
 * Menjalankan satu perintah SQL sebagai pengguna tertentu.
 *
 * p_harapan:
 *   'berhasil'  → perintah harus jalan tanpa error
 *   'gagal'     → perintah harus ditolak (RLS atau trigger)
 *   'baris:N'   → perintah SELECT harus mengembalikan tepat N baris
 *   'kosong'    → sama dengan 'baris:0' (RLS menyaring habis)
 */
create or replace function uji.cek(
  p_kelompok text,
  p_peran    text,
  p_nama     text,
  p_sql      text,
  p_harapan  text
) returns void
language plpgsql
security invoker
as $$
declare
  v_user   uuid := uji.id(p_peran);
  v_baris  int;
  v_target int;
  v_hasil  text;
  v_ket    text := '';
begin
  if v_user is null then
    insert into uji.hasil (kelompok, peran, nama, harapan, hasil, keterangan)
    values (p_kelompok, p_peran, p_nama, p_harapan, 'DILEWATI', 'UUID belum diisi di uji.konfig');
    return;
  end if;

  begin
    -- Menyamar sebagai pengguna: klaim JWT + peran authenticated.
    -- Keduanya transaksional (parameter ketiga true / SET LOCAL).
    perform set_config(
      'request.jwt.claims',
      json_build_object('sub', v_user::text, 'role', 'authenticated')::text,
      true
    );
    set local role authenticated;

    execute p_sql;
    get diagnostics v_baris = row_count;

    reset role;

    if p_harapan = 'gagal' then
      v_hasil := 'GAGAL';
      v_ket   := 'Perintah berhasil padahal seharusnya ditolak';
    elsif p_harapan = 'berhasil' then
      v_hasil := 'LULUS';
      v_ket   := v_baris || ' baris terpengaruh';
    elsif p_harapan = 'kosong' or p_harapan like 'baris:%' then
      v_target := case when p_harapan = 'kosong' then 0
                       else split_part(p_harapan, ':', 2)::int end;
      if v_baris = v_target then
        v_hasil := 'LULUS';
        v_ket   := v_baris || ' baris';
      else
        v_hasil := 'GAGAL';
        v_ket   := 'dapat ' || v_baris || ' baris, harusnya ' || v_target;
      end if;
    end if;

  exception when others then
    reset role;
    if p_harapan = 'gagal' then
      v_hasil := 'LULUS';
      v_ket   := 'ditolak: ' || left(sqlerrm, 90);
    else
      v_hasil := 'GAGAL';
      v_ket   := 'error tak terduga: ' || left(sqlerrm, 90);
    end if;
  end;

  insert into uji.hasil (kelompok, peran, nama, harapan, hasil, keterangan)
  values (p_kelompok, p_peran, p_nama, p_harapan, v_hasil, v_ket);
end;
$$;

-- Harness dijalankan oleh peran authenticated, jadi ia butuh akses
-- ke skema uji. Skema ini hanya ada saat pengujian.
grant usage on schema uji to authenticated;
grant select, insert on uji.hasil to authenticated;
grant select on uji.konfig to authenticated;
grant usage, select on sequence uji.hasil_no_seq to authenticated;


-- =========================================================
-- BAGIAN 2 — DATA UJI
-- Dibuat sebagai postgres (melewati RLS) supaya prasyarat
-- pengujian pasti ada, apa pun isi basis data Anda.
-- =========================================================
do $$
declare
  v_company  uuid;
  v_customer uuid;
  v_proyek_a uuid;
  v_proyek_b uuid;
  v_quo      uuid;
  v_inv      uuid;
begin
  select company_id into v_company from users_profile where id = uji.id('admin_finance');
  if v_company is null then
    raise exception 'Pengguna admin_finance tidak ditemukan. Periksa UUID di uji.konfig.';
  end if;

  insert into customers (company_id, nama, telepon)
  values (v_company, 'ZZ-UJI Pelanggan', '0800000000')
  returning id into v_customer;

  insert into projects (company_id, nama, customer_id, pm_id, status)
  values (v_company, 'ZZ-UJI Proyek PM-A', v_customer, uji.id('pm_a'), 'berjalan')
  returning id into v_proyek_a;

  insert into projects (company_id, nama, customer_id, pm_id, status)
  values (v_company, 'ZZ-UJI Proyek PM-B', v_customer, uji.id('pm_b'), 'berjalan')
  returning id into v_proyek_b;

  -- Penawaran berstatus terkirim, dibuat oleh admin_finance.
  insert into quotations (company_id, nomor, customer_id, project_id, status,
                          pajak_persen, created_by)
  values (v_company, 'ZZ-UJI-QT-001', v_customer, v_proyek_a, 'draft', 11,
          uji.id('admin_finance'))
  returning id into v_quo;

  insert into quotation_items (quotation_id, deskripsi, kuantitas, harga_satuan)
  values (v_quo, 'ZZ-UJI Item', 1, 10000000);

  update quotations set status = 'terkirim' where id = v_quo;

  -- Penawaran kedua: dibuat oleh DIREKTUR, untuk menguji
  -- larangan menyetujui pekerjaan sendiri.
  insert into quotations (company_id, nomor, customer_id, status, pajak_persen, created_by)
  values (v_company, 'ZZ-UJI-QT-002', v_customer, 'draft', 11, uji.id('direktur'))
  returning id into v_quo;

  insert into quotation_items (quotation_id, deskripsi, kuantitas, harga_satuan)
  values (v_quo, 'ZZ-UJI Item', 1, 5000000);

  update quotations set status = 'terkirim' where id = v_quo;

  -- Penawaran ketiga: tetap draft, untuk menguji state machine.
  insert into quotations (company_id, nomor, customer_id, status, pajak_persen, created_by)
  values (v_company, 'ZZ-UJI-QT-003', v_customer, 'draft', 11, uji.id('admin_finance'))
  returning id into v_quo;

  insert into quotation_items (quotation_id, deskripsi, kuantitas, harga_satuan)
  values (v_quo, 'ZZ-UJI Item', 1, 7000000);

  -- Invoice terkirim, untuk uji overpayment.
  insert into invoices (company_id, nomor, customer_id, project_id, status,
                        jatuh_tempo, pajak_persen, created_by)
  values (v_company, 'ZZ-UJI-INV-001', v_customer, v_proyek_a, 'draft',
          current_date + 30, 0, uji.id('admin_finance'))
  returning id into v_inv;

  insert into invoice_items (invoice_id, deskripsi, kuantitas, harga_satuan)
  values (v_inv, 'ZZ-UJI Item', 1, 10000000);

  update invoices set status = 'terkirim' where id = v_inv;

  raise notice 'Data uji dibuat.';
end $$;


-- =========================================================
-- BAGIAN 3 — ASERSI
-- =========================================================
do $$
declare
  v_proyek_a uuid := (select id from projects where nama = 'ZZ-UJI Proyek PM-A');
  v_proyek_b uuid := (select id from projects where nama = 'ZZ-UJI Proyek PM-B');
  v_customer uuid := (select id from customers where nama = 'ZZ-UJI Pelanggan');
  v_company  uuid := (select company_id from users_profile where id = uji.id('admin_finance'));
  v_quo_af   uuid := (select id from quotations where nomor = 'ZZ-UJI-QT-001');
  v_quo_dir  uuid := (select id from quotations where nomor = 'ZZ-UJI-QT-002');
  v_quo_draf uuid := (select id from quotations where nomor = 'ZZ-UJI-QT-003');
  v_inv      uuid := (select id from invoices where nomor = 'ZZ-UJI-INV-001');
  v_pm_beda  boolean := uji.id('pm_a') is distinct from uji.id('pm_b');
begin

-- ---------- PROJECT MANAGER ----------
perform uji.cek('Pelanggan', 'pm_a', 'PM boleh membaca pelanggan',
  'select 1 from customers where id = ' || quote_literal(v_customer) || '::uuid',
  'baris:1');

perform uji.cek('Pelanggan', 'pm_a', 'PM TIDAK boleh menambah pelanggan',
  'insert into customers (company_id, nama, telepon) values ('
   || quote_literal(v_company) || '::uuid, ''ZZ-UJI Bypass'', ''0811'')',
  'gagal');

perform uji.cek('Pelanggan', 'pm_a', 'PM TIDAK boleh menghapus pelanggan',
  'delete from customers where id = ' || quote_literal(v_customer) || '::uuid',
  'kosong');

perform uji.cek('Vendor', 'pm_a', 'PM boleh menambah vendor',
  'insert into vendors (company_id, nama, kategori) values ('
   || quote_literal(v_company) || '::uuid, ''ZZ-UJI Vendor PM'', ''Sewa Alat'')',
  'berhasil');

perform uji.cek('Proyek', 'pm_a', 'PM boleh mengubah proyeknya sendiri',
  'update projects set deskripsi = ''ZZ-UJI diubah'' where id = '
   || quote_literal(v_proyek_a) || '::uuid',
  'berhasil');

if v_pm_beda then
  perform uji.cek('Proyek', 'pm_a', 'PM TIDAK boleh mengubah proyek PM lain',
    'update projects set deskripsi = ''ZZ-UJI bypass'' where id = '
     || quote_literal(v_proyek_b) || '::uuid',
    'kosong');
end if;

perform uji.cek('Invoice', 'pm_a', 'PM TIDAK dapat melihat invoice',
  'select 1 from invoices where id = ' || quote_literal(v_inv) || '::uuid',
  'kosong');

perform uji.cek('Pembayaran', 'pm_a', 'PM TIDAK boleh mencatat pembayaran',
  'insert into payments (company_id, invoice_id, jumlah) values ('
   || quote_literal(v_company) || '::uuid, ' || quote_literal(v_inv) || '::uuid, 1000)',
  'gagal');

perform uji.cek('Keuangan', 'pm_a', 'PM boleh mencatat pengeluaran proyeknya',
  'insert into transactions (company_id, tipe, jumlah, kategori, project_id, created_by) values ('
   || quote_literal(v_company) || '::uuid, ''pengeluaran'', 500000, ''ZZ-UJI'', '
   || quote_literal(v_proyek_a) || '::uuid, ' || quote_literal(uji.id('pm_a')) || '::uuid)',
  'berhasil');

if v_pm_beda then
  perform uji.cek('Keuangan', 'pm_a', 'PM TIDAK boleh mencatat biaya di proyek PM lain',
    'insert into transactions (company_id, tipe, jumlah, kategori, project_id, created_by) values ('
     || quote_literal(v_company) || '::uuid, ''pengeluaran'', 500000, ''ZZ-UJI'', '
     || quote_literal(v_proyek_b) || '::uuid, ' || quote_literal(uji.id('pm_a')) || '::uuid)',
    'gagal');
end if;

perform uji.cek('Keuangan', 'pm_a', 'PM TIDAK boleh mencatat pemasukan',
  'insert into transactions (company_id, tipe, jumlah, project_id, created_by) values ('
   || quote_literal(v_company) || '::uuid, ''pemasukan'', 500000, '
   || quote_literal(v_proyek_a) || '::uuid, ' || quote_literal(uji.id('pm_a')) || '::uuid)',
  'gagal');

perform uji.cek('Audit', 'pm_a', 'PM TIDAK dapat melihat audit log',
  'select 1 from audit_logs limit 1',
  'kosong');

perform uji.cek('Penomoran', 'pm_a', 'document_sequences tertutup untuk semua peran',
  'select 1 from document_sequences limit 1',
  'kosong');

-- ---------- DIREKTUR ----------
perform uji.cek('Invoice', 'direktur', 'Direktur boleh melihat invoice',
  'select 1 from invoices where id = ' || quote_literal(v_inv) || '::uuid',
  'baris:1');

perform uji.cek('Invoice', 'direktur', 'Direktur TIDAK boleh membuat invoice',
  'insert into invoices (company_id, nomor, customer_id, jatuh_tempo) values ('
   || quote_literal(v_company) || '::uuid, ''ZZ-UJI-INV-BYPASS'', '
   || quote_literal(v_customer) || '::uuid, current_date + 30)',
  'gagal');

perform uji.cek('Pelanggan', 'direktur', 'Direktur TIDAK boleh mengubah pelanggan',
  'update customers set nama = ''ZZ-UJI bypass'' where id = '
   || quote_literal(v_customer) || '::uuid',
  'kosong');

perform uji.cek('Penawaran', 'direktur', 'Direktur boleh menyetujui penawaran terkirim',
  'update quotations set status = ''disetujui'' where id = '
   || quote_literal(v_quo_af) || '::uuid',
  'berhasil');

perform uji.cek('Penawaran', 'direktur', 'Pembuat TIDAK boleh menyetujui penawarannya sendiri',
  'update quotations set status = ''disetujui'' where id = '
   || quote_literal(v_quo_dir) || '::uuid',
  'gagal');

-- ---------- ADMIN/FINANCE ----------
perform uji.cek('Pelanggan', 'admin_finance', 'Admin boleh menambah pelanggan',
  'insert into customers (company_id, nama, telepon) values ('
   || quote_literal(v_company) || '::uuid, ''ZZ-UJI Pelanggan 2'', ''0812'')',
  'berhasil');

perform uji.cek('Pelanggan', 'admin_finance', 'Admin TIDAK boleh menghapus pelanggan (soft delete)',
  'delete from customers where id = ' || quote_literal(v_customer) || '::uuid',
  'kosong');

perform uji.cek('Penawaran', 'admin_finance', 'Transisi draft → disetujui ditolak state machine',
  'update quotations set status = ''disetujui'' where id = '
   || quote_literal(v_quo_draf) || '::uuid',
  'gagal');

perform uji.cek('Penawaran', 'admin_finance', 'Transisi draft → terkirim diterima',
  'update quotations set status = ''terkirim'' where id = '
   || quote_literal(v_quo_draf) || '::uuid',
  'berhasil');

perform uji.cek('Invoice', 'admin_finance', 'Overpayment ditolak',
  'insert into payments (company_id, invoice_id, jumlah) values ('
   || quote_literal(v_company) || '::uuid, ' || quote_literal(v_inv) || '::uuid, 999999999)',
  'gagal');

perform uji.cek('Invoice', 'admin_finance', 'Pembayaran wajar diterima',
  'insert into payments (company_id, invoice_id, jumlah) values ('
   || quote_literal(v_company) || '::uuid, ' || quote_literal(v_inv) || '::uuid, 4000000)',
  'berhasil');

perform uji.cek('Keuangan', 'admin_finance', 'Pembayaran otomatis menjadi satu transaksi',
  'select 1 from transactions where invoice_id = ' || quote_literal(v_inv)
   || '::uuid and payment_id is not null',
  'baris:1');

perform uji.cek('Keuangan', 'admin_finance', 'Transaksi otomatis TIDAK dapat diubah',
  'update transactions set jumlah = 1 where invoice_id = ' || quote_literal(v_inv)
   || '::uuid and payment_id is not null',
  'gagal');

perform uji.cek('Keuangan', 'admin_finance', 'Transaksi otomatis TIDAK dapat dihapus',
  'delete from transactions where invoice_id = ' || quote_literal(v_inv)
   || '::uuid and payment_id is not null',
  'gagal');

perform uji.cek('Keuangan', 'admin_finance', 'Pengeluaran tanpa kategori ditolak',
  'insert into transactions (company_id, tipe, jumlah) values ('
   || quote_literal(v_company) || '::uuid, ''pengeluaran'', 100000)',
  'gagal');

perform uji.cek('Konversi', 'admin_finance', 'Penawaran disetujui dapat dikonversi',
  'select konversi_penawaran_ke_invoice(' || quote_literal(v_quo_af) || '::uuid)',
  'berhasil');

perform uji.cek('Konversi', 'admin_finance', 'Konversi kedua kali ditolak',
  'select konversi_penawaran_ke_invoice(' || quote_literal(v_quo_af) || '::uuid)',
  'gagal');

perform uji.cek('Konversi', 'pm_a', 'PM TIDAK boleh mengonversi penawaran',
  'select konversi_penawaran_ke_invoice(' || quote_literal(v_quo_draf) || '::uuid)',
  'gagal');

perform uji.cek('Pengguna', 'pm_a', 'PM TIDAK boleh mengubah perannya sendiri',
  'update users_profile set role = ''admin_finance'' where id = '
   || quote_literal(uji.id('pm_a')) || '::uuid',
  'kosong');

end $$;


-- =========================================================
-- BAGIAN 4 — UJI ISOLASI LAPORAN (security_invoker)
-- Angka laporan PM harus lebih kecil daripada Admin/Finance.
-- Bila sama, fungsi laporan bocor melewati RLS.
-- =========================================================
do $$
declare
  v_admin numeric;
  v_pm    numeric;
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', uji.id('admin_finance')::text, 'role','authenticated')::text, true);
  set local role authenticated;
  select total_pemasukan + total_pengeluaran into v_admin
    from laporan_periode('2000-01-01', '2100-01-01');
  reset role;

  perform set_config('request.jwt.claims',
    json_build_object('sub', uji.id('pm_a')::text, 'role','authenticated')::text, true);
  set local role authenticated;
  select total_pemasukan + total_pengeluaran into v_pm
    from laporan_periode('2000-01-01', '2100-01-01');
  reset role;

  insert into uji.hasil (kelompok, peran, nama, harapan, hasil, keterangan)
  values (
    'Laporan', 'pm_a', 'Laporan PM tidak memuat angka perusahaan',
    'pm < admin',
    case when coalesce(v_pm,0) < coalesce(v_admin,0) then 'LULUS'
         when coalesce(v_admin,0) = 0 then 'DILEWATI'
         else 'GAGAL' end,
    'admin=' || coalesce(v_admin,0) || ' pm=' || coalesce(v_pm,0)
  );
end $$;


-- =========================================================
-- BAGIAN 5 — HASIL
-- =========================================================
select
  no, kelompok, peran, nama, harapan, hasil, keterangan
from uji.hasil
order by no;

select
  hasil,
  count(*) as jumlah
from uji.hasil
group by hasil
order by hasil;

-- Baris ini harus mengembalikan 0. Bila tidak, JANGAN rilis.
select count(*) as jumlah_gagal from uji.hasil where hasil = 'GAGAL';


-- =========================================================
-- BAGIAN 6 — PEMBERSIHAN
-- Jalankan setelah membaca hasil.
-- =========================================================
-- delete from payments   where invoice_id in (select id from invoices where nomor like 'ZZ-UJI%');
-- delete from transactions where kategori = 'ZZ-UJI' or deskripsi like '%ZZ-UJI%';
-- delete from invoice_items   where invoice_id in (select id from invoices where nomor like 'ZZ-UJI%');
-- delete from invoices        where nomor like 'ZZ-UJI%';
-- delete from quotation_items where quotation_id in (select id from quotations where nomor like 'ZZ-UJI%');
-- delete from quotations      where nomor like 'ZZ-UJI%';
-- delete from transactions    where project_id in (select id from projects where nama like 'ZZ-UJI%');
-- delete from projects        where nama like 'ZZ-UJI%';
-- delete from vendors         where nama like 'ZZ-UJI%';
-- delete from customers       where nama like 'ZZ-UJI%';
-- delete from audit_logs      where data_baru::text like '%ZZ-UJI%';
-- drop schema uji cascade;
