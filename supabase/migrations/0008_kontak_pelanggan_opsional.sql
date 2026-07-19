-- =========================================================
-- 0008 — KONTAK PELANGGAN JADI OPSIONAL
-- Prasyarat: 0001–0007
-- =========================================================
--
-- LATAR
-- Skema awal mewajibkan setiap pelanggan punya telepon ATAU email.
-- Dalam praktik Medhartara, banyak pelanggan berupa lembaga yang
-- cukup dicatat namanya lebih dulu — kontaknya menyusul setelah
-- ada narahubung resmi. Aturan itu menghambat pencatatan.
--
-- Nama pelanggan tetap wajib, dan format telepon/email tetap
-- divalidasi di aplikasi bila kolomnya diisi.
-- =========================================================

alter table customers
  drop constraint if exists customers_kontak_check;

-- Nama constraint versi paket Fase 2 (bila pernah dijalankan).
alter table customers
  drop constraint if exists chk_customer_kontak;

-- ---------------------------------------------------------
-- Verifikasi
-- ---------------------------------------------------------
-- Harus mengembalikan 0 baris:
--   select conname
--     from pg_constraint
--    where conrelid = 'customers'::regclass
--      and contype = 'c'
--      and conname in ('customers_kontak_check', 'chk_customer_kontak');
--
-- Uji langsung — pelanggan tanpa kontak harus diterima:
--   insert into customers (company_id, nama)
--   values ((select id from companies limit 1), 'Uji Tanpa Kontak');
--   delete from customers where nama = 'Uji Tanpa Kontak';
