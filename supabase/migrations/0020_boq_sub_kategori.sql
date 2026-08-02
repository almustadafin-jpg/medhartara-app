-- =========================================================
-- 0020 — SUB-KELOMPOK PADA ITEM BOQ (struktur dua tingkat)
-- Prasyarat: 0001–0019
-- =========================================================
--
-- BOQ kini bertingkat dua, mengikuti rujukan budget:
--   Kategori besar (mis. RENTAL EQUIPMENT)
--     └─ Sub-kelompok (mis. MAIN STAGE, ELECTRICITY)  ← kolom baru
--         └─ Item
--
-- `kategori` (sudah ada) = kategori besar.
-- `sub_kategori` (baru)  = sub-kelompok, opsional.
-- =========================================================

alter table boq_items
  add column if not exists sub_kategori text;

-- Verifikasi: kolom sub_kategori harus ada di boq_items.
