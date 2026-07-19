-- =========================================================
-- 0010 — PENANDA TANGAN DOKUMEN
-- Prasyarat: 0001–0009
-- =========================================================
--
-- Nama penanda tangan disimpan per dokumen, bukan di tabel companies,
-- karena yang meneken bisa berbeda-beda: Direktur untuk proyek besar,
-- Manajer Operasional untuk pekerjaan rutin. Menyimpannya di perusahaan
-- akan memaksa satu nama untuk semua dokumen, dan mengubahnya kelak
-- akan ikut mengubah dokumen lama yang sudah dikirim.
-- =========================================================

alter table quotations
  add column if not exists ttd_nama    text,
  add column if not exists ttd_jabatan text;

alter table invoices
  add column if not exists ttd_nama    text,
  add column if not exists ttd_jabatan text;

-- ---------------------------------------------------------
-- Verifikasi
-- ---------------------------------------------------------
-- select column_name from information_schema.columns
--  where table_name in ('quotations','invoices')
--    and column_name like 'ttd%'
--  order by table_name, column_name;
-- Harus mengembalikan 4 baris.
