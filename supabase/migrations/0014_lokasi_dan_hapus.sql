-- =========================================================
-- 0014 — LOKASI ACARA & PENGHAPUSAN BERPENGAMAN
-- Prasyarat: 0001–0013
-- =========================================================

-- ---------------------------------------------------------
-- 1. LOKASI ACARA
--    Disimpan di proyek, bukan di tiap dokumen. Penawaran,
--    invoice, dan BOQ membacanya lewat project_id sehingga
--    memperbaiki lokasi cukup di satu tempat.
-- ---------------------------------------------------------
alter table projects
  add column if not exists lokasi text;

-- ---------------------------------------------------------
-- 2. PENGHAPUSAN
--
-- Rancangan awal melarang hard delete sama sekali. Itu terlalu kaku
-- untuk kesalahan input sehari-hari, tapi menghapus dokumen yang sudah
-- terbit tetap berbahaya: nomor jadi bolong dan jejak audit rusak.
--
-- Jalan tengah yang dipakai di sini:
--   - Dokumen yang belum pernah keluar (draft) boleh dihapus
--   - Dokumen yang sudah terbit hanya boleh dibatalkan/diarsipkan
--   - Master data boleh dihapus HANYA bila belum dipakai di mana pun
--
-- Syarat terakhir tidak perlu ditulis di policy: foreign key sudah
-- menolaknya sendiri. Aplikasi menerjemahkan error 23503 menjadi
-- pesan yang bisa dibaca pengguna.
-- ---------------------------------------------------------

-- ---------- PELANGGAN & VENDOR ----------
drop policy if exists customers_delete on customers;
create policy customers_delete on customers for delete to authenticated
  using (company_id = auth_company_id() and auth_role() = 'admin_finance');

drop policy if exists vendors_delete on vendors;
create policy vendors_delete on vendors for delete to authenticated
  using (company_id = auth_company_id() and auth_role() in ('admin_finance', 'pm'));

-- ---------- PROYEK ----------
drop policy if exists projects_delete on projects;
create policy projects_delete on projects for delete to authenticated
  using (
    company_id = auth_company_id()
    and (
      auth_role() in ('direktur', 'admin_finance')
      or (auth_role() = 'pm' and pm_id = auth.uid())
    )
  );

-- ---------- PENAWARAN — hanya draft ----------
drop policy if exists quotations_delete on quotations;
create policy quotations_delete on quotations for delete to authenticated
  using (
    company_id = auth_company_id()
    and status = 'draft'
    and (
      auth_role() = 'admin_finance'
      or (auth_role() = 'pm' and created_by = auth.uid())
    )
  );

-- ---------- INVOICE — hanya draft, dan belum ada pembayaran ----------
drop policy if exists invoices_delete on invoices;
create policy invoices_delete on invoices for delete to authenticated
  using (
    company_id = auth_company_id()
    and auth_role() = 'admin_finance'
    and status = 'draft'
    and not exists (select 1 from payments p where p.invoice_id = invoices.id)
  );

-- ---------- BOQ — hanya draft atau ditolak ----------
drop policy if exists boq_delete on boq;
create policy boq_delete on boq for delete to authenticated
  using (
    company_id = auth_company_id()
    and status in ('draft', 'ditolak')
    and (
      auth_role() in ('direktur', 'admin_finance')
      or (auth_role() = 'pm' and is_pm_of(project_id))
    )
  );

-- ---------------------------------------------------------
-- 3. Catatan sengaja TIDAK diberi policy DELETE
--    payments      — menghapus pembayaran merusak status invoice
--    transactions  — sudah punya penjaga sendiri di trigger 0006
--    audit_logs    — jejak audit tidak boleh dihapus siapa pun
-- ---------------------------------------------------------

-- ---------------------------------------------------------
-- 4. Verifikasi
-- ---------------------------------------------------------
-- Menghapus pelanggan yang punya proyek harus gagal (FK 23503):
--   delete from customers where id = '<punya-proyek>';
-- Menghapus penawaran terkirim harus 0 baris:
--   delete from quotations where status = 'terkirim';
