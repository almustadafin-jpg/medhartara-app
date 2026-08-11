-- =========================================================
-- 0031 - HAPUS PROYEK BERSYARAT + ARSIP PROYEK
-- Prasyarat: 0001-0030
-- =========================================================
--
-- Proyek hanya boleh dihapus bila belum punya dokumen turunan:
-- tidak ada BOQ, penawaran, invoice, transaksi, maupun pengajuan
-- pembayaran. Bila sudah ada, arsipkan saja (kolom arsip_pada).
-- =========================================================

alter table projects add column if not exists arsip_pada timestamptz;

drop policy if exists projects_delete on projects;
create policy projects_delete on projects for delete to authenticated
  using (
    company_id = auth_company_id()
    and (
      auth_role() in ('direktur', 'admin_finance')
      or (auth_role() = 'pm' and pm_id = auth.uid())
    )
    and not exists (select 1 from boq b          where b.project_id = projects.id)
    and not exists (select 1 from quotations q   where q.project_id = projects.id)
    and not exists (select 1 from invoices i     where i.project_id = projects.id)
    and not exists (select 1 from transactions t where t.project_id = projects.id)
    and not exists (select 1 from payment_requests pr where pr.project_id = projects.id)
  );
