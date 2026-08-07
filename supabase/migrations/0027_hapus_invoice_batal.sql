-- =========================================================
-- 0027 — IZINKAN HAPUS INVOICE BERSTATUS BATAL
-- Prasyarat: 0001–0026
-- =========================================================
--
-- Sebelumnya hanya invoice 'draft' tanpa pembayaran yang bisa dihapus.
-- Invoice yang dibatalkan ('batal') kerap perlu dibersihkan juga.
-- Kebijakan diperluas ke 'draft' ATAU 'batal', tetap dengan syarat
-- tidak ada pembayaran tercatat (lindungi jejak keuangan).
-- =========================================================

drop policy if exists invoices_delete on invoices;
create policy invoices_delete on invoices for delete to authenticated
  using (
    company_id = auth_company_id()
    and auth_role() = 'admin_finance'
    and status in ('draft', 'batal')
    and not exists (select 1 from payments p where p.invoice_id = invoices.id)
  );
