-- =========================================================
-- 0022 — KOLOM WAKTU (Time) & KETERANGAN PADA ITEM BOQ
-- Prasyarat: 0001–0021
-- =========================================================
--
-- Penyederhanaan pengisian BOQ. Tiap item kini punya:
--   waktu (Time)      = pengali frekuensi/sesi, default 1.
--   keterangan        = catatan bebas per baris.
--
-- Subtotal dihitung ulang dengan pengali waktu:
--   subtotal = kuantitas × hari × waktu × harga
--
-- Baris lama mendapat waktu = 1, sehingga subtotal-nya TIDAK berubah
-- (× 1) dan total induk BOQ tetap sama tanpa perlu hitung ulang.
-- =========================================================

alter table boq_items
  add column if not exists waktu numeric(6,2) not null default 1 check (waktu > 0);

alter table boq_items
  add column if not exists keterangan text;

-- Redefinisi kolom subtotal (generated) agar menyertakan pengali waktu.
-- Kolom generated tidak bisa diubah ekspresinya — harus dihapus & dibuat ulang.
alter table boq_items drop column if exists subtotal_modal;
alter table boq_items drop column if exists subtotal_jual;

alter table boq_items
  add column subtotal_modal numeric(15,2)
    generated always as (kuantitas * hari * waktu * harga_modal) stored;

alter table boq_items
  add column subtotal_jual numeric(15,2)
    generated always as (kuantitas * hari * waktu * harga_jual) stored;

-- ---------------------------------------------------------
-- Verifikasi
-- ---------------------------------------------------------
-- Kolom waktu & keterangan harus ada; subtotal ikut memuat waktu.
-- select column_name, generation_expression
--   from information_schema.columns
--  where table_name = 'boq_items'
--    and column_name in ('waktu','keterangan','subtotal_modal','subtotal_jual');
