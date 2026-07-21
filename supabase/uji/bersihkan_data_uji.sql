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
-- Skrip ini mematikan sementara SELURUH trigger pengguna pada tabel
-- yang dibersihkan. Mematikan satu trigger saja tidak cukup, dan itu
-- terbukti saat dijalankan pertama kali: menghapus `payments` memicu
-- perhitungan ulang status invoice `lunas → terkirim`, yang ditolak
-- state machine invoice. Aturan-aturan itu benar untuk pemakaian
-- harian; hanya pembersihan total yang perlu melewatinya.
--
-- Bagian 1 menyalakan semuanya kembali. Bila skrip gagal di tengah,
-- seluruhnya di-rollback termasuk perintah mematikan trigger —
-- Supabase menjalankan satu eksekusi sebagai satu transaksi.
-- Bagian 5 tetap memverifikasi ini secara eksplisit.
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
alter table transactions    disable trigger user;
alter table payments        disable trigger user;
alter table kuitansi        disable trigger user;
alter table invoices        disable trigger user;
alter table invoice_items   disable trigger user;
alter table quotations      disable trigger user;
alter table quotation_items disable trigger user;
alter table boq             disable trigger user;
alter table boq_items       disable trigger user;
alter table projects        disable trigger user;

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

-- MASTER DATA — beri komentar pada tiga baris ini bila pelanggan,
-- vendor, dan proyek yang ada sudah data sungguhan.
delete from projects;
delete from customers;
delete from vendors;

alter table transactions    enable trigger user;
alter table payments        enable trigger user;
alter table kuitansi        enable trigger user;
alter table invoices        enable trigger user;
alter table invoice_items   enable trigger user;
alter table quotations      enable trigger user;
alter table quotation_items enable trigger user;
alter table boq             enable trigger user;
alter table boq_items       enable trigger user;
alter table projects        enable trigger user;


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

-- Semua trigger wajib hidup lagi — hasil di bawah HARUS 0 baris.
-- Bila ada yang muncul, nyalakan lagi:
--   alter table <nama_tabel> enable trigger user;
select tgrelid::regclass as tabel, tgname
  from pg_trigger
 where not tgisinternal
   and tgenabled = 'D';
