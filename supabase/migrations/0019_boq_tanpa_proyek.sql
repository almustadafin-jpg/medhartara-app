-- =========================================================
-- 0019 — PM BOLEH MENYUNTING BOQ TANPA PROYEK YANG IA BUAT
-- Prasyarat: 0001–0018
-- =========================================================
--
-- Bug: PM boleh MEMBUAT BOQ tanpa proyek (boq_insert mengizinkan
-- project_id null), tetapi tidak bisa MENYUNTINGNYA — karena
-- boq_update memeriksa kepemilikan lewat is_pm_of(project_id), dan
-- is_pm_of(null) selalu false.
--
-- Perbaikan: untuk BOQ tanpa proyek, kepemilikan PM ditentukan lewat
-- created_by. BOQ berproyek tetap lewat is_pm_of seperti biasa.
-- Batas status (draft/ditolak/diajukan) tidak berubah.
-- =========================================================

drop policy if exists boq_update on boq;
create policy boq_update on boq for update to authenticated
  using (
    company_id = auth_company_id()
    and (
      auth_role() in ('direktur', 'admin_finance')
      or (
        auth_role() = 'pm'
        and status in ('draft', 'ditolak', 'diajukan')
        and (is_pm_of(project_id) or (project_id is null and created_by = auth.uid()))
      )
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
         and (
           auth_role() in ('direktur', 'admin_finance')
           or (auth_role() = 'pm'
               and (is_pm_of(b.project_id)
                    or (b.project_id is null and b.created_by = auth.uid())))
         )
    )
  )
  with check (
    exists (
      select 1 from boq b
       where b.id = boq_id
         and b.status in ('draft', 'ditolak', 'diajukan')
    )
  );

-- Hapus BOQ tanpa proyek yang ia buat (masalah null yang sama).
drop policy if exists boq_delete on boq;
create policy boq_delete on boq for delete to authenticated
  using (
    company_id = auth_company_id()
    and status in ('draft', 'ditolak')
    and (
      auth_role() in ('direktur', 'admin_finance')
      or (auth_role() = 'pm'
          and (is_pm_of(project_id) or (project_id is null and created_by = auth.uid())))
    )
  );

-- ---------------------------------------------------------
-- Verifikasi
-- ---------------------------------------------------------
-- Sebagai PM pembuat: update BOQ tanpa proyek (status draft) BERHASIL.
