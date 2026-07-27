-- =========================================================
-- HAPUS SATU PROYEK BESERTA SELURUH DOKUMENNYA (DATA UJI COBA)
-- =========================================================
--
-- TIDAK BISA DIBATALKAN. Hanya untuk membereskan data uji coba —
-- untuk proyek sungguhan, BATALKAN saja (ubah status ke 'Batal')
-- agar nomor invoice & riwayat tetap utuh.
--
-- Aplikasi sengaja menolak menghapus proyek yang punya dokumen,
-- supaya invoice/pembayaran/kuitansi tidak kehilangan induknya.
-- Skrip ini melakukannya secara terkendali: mematikan trigger
-- sementara, menghapus rantai dokumen dalam urutan yang benar,
-- lalu menyalakan trigger kembali. Dijalankan sebagai satu eksekusi
-- (satu transaksi) — bila ada langkah gagal, semuanya di-rollback.
--
-- CARA PAKAI:
--   1. Ganti SEMUA 'NAMA PROYEK DI SINI' dengan nama proyek yang
--      hendak dihapus (harus persis; huruf besar-kecil diperhatikan).
--      Cara cepat: pakai fitur Find & Replace editor.
--   2. Jalankan bagian 0 dulu (sendirian) untuk memastikan proyeknya
--      ketemu dan melihat berapa dokumen yang akan ikut terhapus.
--   3. Jalankan sisanya.
--   4. Query terakhir harus mengembalikan sisa_proyek = 0 dan
--      trigger_mati = 0.
-- =========================================================


-- ---------------------------------------------------------
-- 0. LIHAT DULU — jalankan sendirian
-- ---------------------------------------------------------
-- select
--   (select count(*) from projects       where nama = 'NAMA PROYEK DI SINI') as proyek,
--   (select count(*) from invoices       where project_id = (select id from projects where nama = 'NAMA PROYEK DI SINI')) as invoice,
--   (select count(*) from quotations     where project_id = (select id from projects where nama = 'NAMA PROYEK DI SINI')) as penawaran,
--   (select count(*) from boq            where project_id = (select id from projects where nama = 'NAMA PROYEK DI SINI')) as boq,
--   (select count(*) from transactions   where project_id = (select id from projects where nama = 'NAMA PROYEK DI SINI')) as transaksi;


-- ---------------------------------------------------------
-- 1. HAPUS  (jalankan seluruh blok di bawah ini sekaligus)
-- ---------------------------------------------------------
alter table transactions     disable trigger user;
alter table payments         disable trigger user;
alter table kuitansi         disable trigger user;
alter table invoices         disable trigger user;
alter table invoice_items    disable trigger user;
alter table quotations       disable trigger user;
alter table quotation_items  disable trigger user;
alter table boq              disable trigger user;
alter table boq_items        disable trigger user;
alter table payment_requests disable trigger user;
alter table projects         disable trigger user;

-- Bukti (polimorfik) untuk dokumen proyek ini
delete from attachments where entity_type = 'transaction' and entity_id in
  (select id from transactions where project_id = (select id from projects where nama = 'NAMA PROYEK DI SINI'));
delete from attachments where entity_type = 'payment' and entity_id in
  (select p.id from payments p join invoices i on i.id = p.invoice_id
    where i.project_id = (select id from projects where nama = 'NAMA PROYEK DI SINI'));
delete from attachments where entity_type = 'invoice' and entity_id in
  (select id from invoices where project_id = (select id from projects where nama = 'NAMA PROYEK DI SINI'));
delete from attachments where entity_type = 'quotation' and entity_id in
  (select id from quotations where project_id = (select id from projects where nama = 'NAMA PROYEK DI SINI'));

-- Kuitansi dari pembayaran invoice proyek ini
delete from kuitansi where payment_id in
  (select p.id from payments p join invoices i on i.id = p.invoice_id
    where i.project_id = (select id from projects where nama = 'NAMA PROYEK DI SINI'));

-- Pengajuan pembayaran proyek ini (sebelum transaksi — FK transaction_id)
delete from payment_requests where project_id = (select id from projects where nama = 'NAMA PROYEK DI SINI');

-- Pembayaran (cascade menghapus transaksi pemasukan turunannya)
delete from payments where invoice_id in
  (select id from invoices where project_id = (select id from projects where nama = 'NAMA PROYEK DI SINI'));

-- Transaksi proyek yang tersisa (mis. pengeluaran manual)
delete from transactions where project_id = (select id from projects where nama = 'NAMA PROYEK DI SINI');

-- BOQ proyek ini (sebelum invoice/penawaran — FK)
delete from boq_items where boq_id in
  (select id from boq where project_id = (select id from projects where nama = 'NAMA PROYEK DI SINI'));
delete from boq where project_id = (select id from projects where nama = 'NAMA PROYEK DI SINI');

-- Invoice
delete from invoice_items where invoice_id in
  (select id from invoices where project_id = (select id from projects where nama = 'NAMA PROYEK DI SINI'));
delete from invoices where project_id = (select id from projects where nama = 'NAMA PROYEK DI SINI');

-- Penawaran
delete from quotation_items where quotation_id in
  (select id from quotations where project_id = (select id from projects where nama = 'NAMA PROYEK DI SINI'));
delete from quotations where project_id = (select id from projects where nama = 'NAMA PROYEK DI SINI');

-- Proyek
delete from projects where nama = 'NAMA PROYEK DI SINI';

alter table transactions     enable trigger user;
alter table payments         enable trigger user;
alter table kuitansi         enable trigger user;
alter table invoices         enable trigger user;
alter table invoice_items    enable trigger user;
alter table quotations       enable trigger user;
alter table quotation_items  enable trigger user;
alter table boq              enable trigger user;
alter table boq_items        enable trigger user;
alter table payment_requests enable trigger user;
alter table projects         enable trigger user;


-- ---------------------------------------------------------
-- 2. VERIFIKASI — sisa_proyek harus 0, trigger_mati harus 0
-- ---------------------------------------------------------
select
  (select count(*) from projects where nama = 'NAMA PROYEK DI SINI') as sisa_proyek,
  (select count(*) from pg_trigger where not tgisinternal and tgenabled = 'D') as trigger_mati;
