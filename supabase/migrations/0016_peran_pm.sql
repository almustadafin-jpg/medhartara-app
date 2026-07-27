-- =========================================================
-- 0016 — PENYESUAIAN PERAN PROJECT MANAGER
-- Prasyarat: 0001–0015
-- =========================================================
--
-- Perubahan model peran:
--   1. PM boleh mengelola pelanggan penuh (buat, ubah, hapus).
--   2. PM TIDAK lagi membuat/mengubah penawaran — hanya Admin/Finance
--      yang menyusun penawaran & invoice (harga jual & penagihan).
--
-- Wewenang BOQ/RAB milik PM tidak berubah di sini (sudah diatur 0012/0014):
-- PM menyusun RAB, Admin/Finance & Direktur yang menyetujui.
-- =========================================================

-- ---------------------------------------------------------
-- 1. PELANGGAN — PM setara Admin/Finance
-- ---------------------------------------------------------
drop policy if exists customers_insert on customers;
create policy customers_insert on customers for insert to authenticated
  with check (auth_role() in ('admin_finance', 'pm') and company_id = auth_company_id());

drop policy if exists customers_update on customers;
create policy customers_update on customers for update to authenticated
  using  (auth_role() in ('admin_finance', 'pm') and company_id = auth_company_id())
  with check (auth_role() in ('admin_finance', 'pm') and company_id = auth_company_id());

drop policy if exists customers_delete on customers;
create policy customers_delete on customers for delete to authenticated
  using (company_id = auth_company_id() and auth_role() in ('admin_finance', 'pm'));
-- Menghapus pelanggan yang sudah dipakai dokumen tetap ditolak foreign key.

-- ---------------------------------------------------------
-- 2. PENAWARAN — cabut hak tulis PM
--    PM tetap dapat MELIHAT penawaran proyeknya (policy select
--    tidak diubah), tetapi tidak lagi membuat atau mengubahnya.
-- ---------------------------------------------------------
drop policy if exists quotations_insert_pm on quotations;
drop policy if exists quotations_update_pm on quotations;

-- Item penawaran ikut hanya-baca bagi PM: policy tulisnya dipersempit
-- ke Admin/Finance. (Select tetap mengikuti induk.)
drop policy if exists quotation_items_write on quotation_items;
create policy quotation_items_write on quotation_items for all to authenticated
  using (
    exists (
      select 1 from quotations q
      where q.id = quotation_items.quotation_id
        and q.status = 'draft'
        and auth_role() = 'admin_finance'
    )
  )
  with check (
    exists (
      select 1 from quotations q
      where q.id = quotation_items.quotation_id
        and q.status = 'draft'
    )
  );

-- ---------------------------------------------------------
-- Verifikasi
-- ---------------------------------------------------------
-- Sebagai PM: insert customers harus BERHASIL, insert quotations harus GAGAL.
-- Sebagai Admin/Finance: keduanya berhasil seperti semula.
