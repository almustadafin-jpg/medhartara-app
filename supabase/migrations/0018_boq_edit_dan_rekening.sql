-- =========================================================
-- 0018 — PM BOLEH MENYUNTING BOQ DIAJUKAN + REKENING TUJUAN PENGAJUAN
-- Prasyarat: 0001–0017
-- =========================================================

-- ---------------------------------------------------------
-- 1. BOQ — PM boleh menyunting hingga status 'diajukan'
--
-- Sebelumnya PM hanya bisa menyunting BOQ 'draft'/'ditolak'. Kini
-- 'diajukan' ikut boleh, supaya PM dapat menambah atau mengubah item
-- pada RAB yang sudah dibuat. Aplikasi mengembalikan statusnya ke
-- 'draft' saat disimpan sehingga wajib diajukan & ditinjau ulang —
-- persetujuan tidak pernah menutupi perubahan diam-diam.
--
-- BOQ 'disetujui'/'arsip' tetap terkunci (dasar penawaran).
-- ---------------------------------------------------------
drop policy if exists boq_update on boq;
create policy boq_update on boq for update to authenticated
  using (
    company_id = auth_company_id()
    and (
      auth_role() in ('direktur', 'admin_finance')
      or (auth_role() = 'pm' and is_pm_of(project_id)
          and status in ('draft', 'ditolak', 'diajukan'))
    )
  )
  with check (company_id = auth_company_id());

drop policy if exists boq_items_write on boq_items;
create policy boq_items_write on boq_items for all to authenticated
  using (
    exists (
      select 1 from boq b
       where b.id = boq_id
         and b.status in ('draft', 'ditolak', 'diajukan')
         and (auth_role() in ('direktur', 'admin_finance')
              or (auth_role() = 'pm' and is_pm_of(b.project_id)))
    )
  )
  with check (
    exists (
      select 1 from boq b
       where b.id = boq_id
         and b.status in ('draft', 'ditolak', 'diajukan')
    )
  );

-- ---------------------------------------------------------
-- 2. PENGAJUAN — rekening / pihak yang akan dibayar
--    Boleh diisi bebas (untuk pihak non-vendor) atau disalin dari
--    rekening vendor terpilih. Tidak menggantikan data vendor.
-- ---------------------------------------------------------
alter table payment_requests
  add column if not exists rekening_tujuan text;

-- ---------------------------------------------------------
-- Verifikasi
-- ---------------------------------------------------------
-- Sebagai PM pemegang proyek: update BOQ 'diajukan' harus BERHASIL.
-- Kolom rekening_tujuan harus ada di payment_requests.
