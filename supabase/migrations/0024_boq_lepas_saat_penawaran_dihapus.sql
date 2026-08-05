-- =========================================================
-- 0024 — LEPAS BOQ SAAT PENAWARAN DIHAPUS
-- Prasyarat: 0001–0023
-- =========================================================
--
-- Masalah: BOQ yang sudah ditarik menyimpan boq.quotation_id yang menunjuk
-- ke penawaran. Foreign key-nya tanpa aksi hapus (default: RESTRICT),
-- sehingga penawaran draft pun tidak bisa dihapus selama BOQ masih menaut.
--
-- Perbaikan: ubah FK menjadi ON DELETE SET NULL. Menghapus penawaran akan
-- otomatis mengosongkan boq.quotation_id — melepas kunci BOQ sehingga bisa
-- ditarik ulang (status BOQ tetap 'disetujui').
-- =========================================================

alter table boq drop constraint if exists boq_quotation_id_fkey;

alter table boq
  add constraint boq_quotation_id_fkey
  foreign key (quotation_id) references quotations(id) on delete set null;

-- ---------------------------------------------------------
-- Verifikasi
-- ---------------------------------------------------------
-- select conname, confdeltype from pg_constraint
--  where conrelid = 'boq'::regclass and conname = 'boq_quotation_id_fkey';
-- confdeltype harus 'n' (SET NULL).
