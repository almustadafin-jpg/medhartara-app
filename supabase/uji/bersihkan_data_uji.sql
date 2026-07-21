-- =========================================================
-- BERSIHKAN DATA UJI COBA
-- Jalankan di Supabase → SQL Editor, sebagai pemilik proyek.
-- =========================================================
--
-- TIDAK BISA DIBATALKAN. Jalankan hanya sebelum aplikasi dipakai
-- sungguhan. Sesudah ada data asli, hapus berkas ini.
--
-- Yang TIDAK ikut terhapus:
--   companies      — identitas perusahaan Anda
--   users_profile  — akun dan perannya
--   auth.users     — kredensial login
--
-- Skrip ini mematikan sementara `trg_transactions_jaga`. Trigger itu
-- menolak penghapusan transaksi yang lahir dari pembayaran invoice —
-- benar untuk pemakaian harian, tapi menghalangi pembersihan total.
-- Bagian 4 menyalakannya kembali; jangan berhenti di tengah jalan.
-- =========================================================


-- ---------------------------------------------------------
-- 0. LIHAT DULU — jalankan sendirian, jangan bareng sisanya
-- ---------------------------------------------------------
-- select 'transaksi'  as tabel, count(*) from transactions
-- union all select 'pembayaran',  count(*) from payments
-- union all select 'kuitansi',    count(*) from kuitansi
-- union all select 'invoice',     count(*) from invoices
-- union all select 'penawaran',   count(*) from quotations
-- union all select 'boq',         count(*) from boq
-- union all select 'proyek',      count(*) from projects
-- union all select 'pelanggan',   count(*) from customers
-- union all select 'vendor',      count(*) from vendors
-- union all select 'bukti',       count(*) from attachments
-- union all select 'audit',       count(*) from audit_logs;


-- ---------------------------------------------------------
-- 1. TRANSAKSI & DOKUMEN  (selalu dijalankan)
-- ---------------------------------------------------------
begin;

alter table transactions disable trigger trg_transactions_jaga;

-- Bukti dilepas lebih dulu: `attachments` polimorfik, tidak ada foreign
-- key yang menariknya ikut terhapus.
delete from attachments;

-- kuitansi & transaksi ikut lewat ON DELETE CASCADE dari payments,
-- tapi ditulis eksplisit agar urutannya terbaca.
delete from kuitansi;
delete from payments;
delete from transactions;

delete from invoice_items;
delete from invoices;

delete from quotation_items;
delete from quotations;

delete from boq_items;
delete from boq;

alter table transactions enable trigger trg_transactions_jaga;

commit;


-- ---------------------------------------------------------
-- 2. MASTER DATA  (opsional — buang komentarnya bila perlu)
--    Lewati bagian ini kalau pelanggan/vendor/proyek yang ada
--    sudah data sungguhan dan hanya transaksinya yang uji coba.
-- ---------------------------------------------------------
-- begin;
-- delete from projects;
-- delete from customers;
-- delete from vendors;
-- commit;


-- ---------------------------------------------------------
-- 3. BERKAS BUKTI DI STORAGE
--    Baris `attachments` sudah hilang di bagian 1, tapi berkasnya
--    masih memakan kuota. Baris di bawah menghapus isinya, bukan
--    bucket-nya.
--
--    Bila baris ini ditolak dengan "permission denied for table
--    objects", hapus saja isinya lewat Supabase → Storage → bukti.
--    Hasilnya sama; hanya jalannya yang beda.
-- ---------------------------------------------------------
delete from storage.objects where bucket_id = 'bukti';


-- ---------------------------------------------------------
-- 4. PENOMORAN & JEJAK AUDIT
--    Tanpa ini, invoice pertama Anda yang sungguhan akan bernomor
--    INV-2026-0014 dan seterusnya.
-- ---------------------------------------------------------
delete from document_sequences;
delete from audit_logs;


-- ---------------------------------------------------------
-- 5. VERIFIKASI — semua harus 0
-- ---------------------------------------------------------
select 'transaksi'  as tabel, count(*) from transactions
union all select 'pembayaran',  count(*) from payments
union all select 'kuitansi',    count(*) from kuitansi
union all select 'invoice',     count(*) from invoices
union all select 'penawaran',   count(*) from quotations
union all select 'boq',         count(*) from boq
union all select 'bukti',       count(*) from attachments
union all select 'penomoran',   count(*) from document_sequences
union all select 'audit',       count(*) from audit_logs;

-- Trigger penjaga wajib hidup lagi — harus mengembalikan 'O' (origin).
-- Bila hasilnya 'D', jalankan:
--   alter table transactions enable trigger trg_transactions_jaga;
select tgname, tgenabled
  from pg_trigger
 where tgrelid = 'transactions'::regclass
   and not tgisinternal;
