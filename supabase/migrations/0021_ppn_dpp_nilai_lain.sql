-- =========================================================
-- 0021 — PPN ATAS DPP NILAI LAIN (mekanisme 2025)
-- Prasyarat: 0001–0020
-- =========================================================
--
-- PPN dihitung atas DPP Nilai Lain = 11/12 × dasar pengenaan pajak.
--   PPN   = pajak% × (11/12) × dasar
--   total = dasar + PPN
--
-- Dengan tarif 12%, PPN efektif = 12% × 11/12 = 11% dari dasar, jadi
-- total tagihan tidak berubah dari skema PPN 11% sebelumnya. Baris
-- lama bertarif 11% dinaikkan ke 12% agar konsisten dengan penyajian
-- baru — totalnya tetap sama (11% efektif).
-- =========================================================

create or replace function hitung_total_quotation(p_quotation uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_subtotal numeric(15,2);
  v_diskon   numeric(5,2);
  v_pajak    numeric(5,2);
  v_dasar    numeric(15,2);
begin
  select coalesce(sum(kuantitas * harga_satuan), 0)
    into v_subtotal
    from quotation_items where quotation_id = p_quotation;

  select diskon_persen, pajak_persen
    into v_diskon, v_pajak
    from quotations where id = p_quotation;

  if not found then return; end if;

  v_dasar := v_subtotal - (v_subtotal * coalesce(v_diskon, 0) / 100);

  update quotations
     set subtotal = v_subtotal,
         total    = v_dasar + (v_dasar * coalesce(v_pajak, 0) / 100 * 11.0 / 12.0)
   where id = p_quotation;
end; $$;

create or replace function hitung_total_invoice(p_invoice uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_subtotal numeric(15,2);
  v_diskon   numeric(5,2);
  v_pajak    numeric(5,2);
  v_dasar    numeric(15,2);
begin
  select coalesce(sum(kuantitas * harga_satuan), 0)
    into v_subtotal from invoice_items where invoice_id = p_invoice;

  select diskon_persen, pajak_persen into v_diskon, v_pajak
    from invoices where id = p_invoice;
  if not found then return; end if;

  v_dasar := v_subtotal - (v_subtotal * coalesce(v_diskon, 0) / 100);

  update invoices
     set subtotal = v_subtotal,
         total    = v_dasar + (v_dasar * coalesce(v_pajak, 0) / 100 * 11.0 / 12.0)
   where id = p_invoice;
end; $$;

-- ---------------------------------------------------------
-- Naikkan tarif tercatat 11% → 12% (total tetap, karena efektif 11%).
-- Perubahan pajak_persen memicu trigger recompute total masing-masing.
-- ---------------------------------------------------------
update quotations set pajak_persen = 12 where pajak_persen = 11;
update invoices    set pajak_persen = 12 where pajak_persen = 11;

-- ---------------------------------------------------------
-- Verifikasi
-- ---------------------------------------------------------
-- Untuk dokumen bertarif 12%: total harus = dasar × 1,11 (efektif 11%).
-- select nomor, subtotal, diskon_persen, pajak_persen, total from invoices;
