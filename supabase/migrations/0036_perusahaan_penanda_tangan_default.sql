-- =========================================================
-- 0036 - DEFAULT PENANDA TANGAN DI PERUSAHAAN
-- Prasyarat: 0001-0035
-- =========================================================
--
-- Selama ini nama penanda tangan hanya per-dokumen; bila kosong, PDF
-- jatuh ke NAMA PERUSAHAAN, bukan nama direktur. Agar nama direktur
-- muncul otomatis di semua penawaran/invoice tanpa mengisi ulang tiap
-- dokumen, simpan default penanda tangan di perusahaan.
--
-- Urutan pemakaian di PDF: ttd dokumen -> default perusahaan -> nama perusahaan.
-- =========================================================

alter table companies
  add column if not exists ttd_nama    text,
  add column if not exists ttd_jabatan text;

-- Isi jabatan default bila belum ada.
update companies set ttd_jabatan = 'Direktur'
 where ttd_jabatan is null or btrim(ttd_jabatan) = '';
