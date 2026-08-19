-- =========================================================
-- 0032 - PERBAIKAN: 'batal' bukan status penawaran (enum error)
-- Prasyarat: 0001-0031
-- =========================================================
--
-- Pada 0028/0030 fungsi konversi memeriksa
--   if v_q.status in ('dikonversi','batal','arsip')
-- padahal enum quotation_status TIDAK memiliki 'batal', sehingga
-- Postgres gagal meng-cast literal itu:
--   invalid input value for enum quotation_status: "batal"
-- (muncul sebagai error "batal" saat konversi ke invoice).
--
-- Perbaikan: hapus 'batal' dari daftar cek.
-- =========================================================

create or replace function konversi_penawaran_ke_invoice(
  p_quotation uuid,
  p_jatuh_tempo date default null
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_q        quotations%rowtype;
  v_invoice  uuid;
  v_nomor    text;
  v_tempo    date;
begin
  if auth_role() is distinct from 'admin_finance' then
    raise exception 'Hanya Admin/Finance yang dapat menerbitkan invoice.';
  end if;

  select * into v_q from quotations where id = p_quotation;
  if not found then
    raise exception 'Penawaran tidak ditemukan.';
  end if;

  if v_q.company_id is distinct from auth_company_id() then
    raise exception 'Penawaran bukan milik perusahaan Anda.';
  end if;

  if v_q.status in ('dikonversi','arsip') then
    raise exception 'Penawaran berstatus % tidak dapat dikonversi.', v_q.status;
  end if;

  if v_q.final_pada is null then
    raise exception 'Penawaran belum Final. Tandai sebagai Final dulu sebelum dikonversi ke invoice.';
  end if;

  if exists (select 1 from invoices where quotation_id = p_quotation) then
    raise exception 'Penawaran ini sudah pernah dikonversi menjadi invoice.';
  end if;

  v_tempo := coalesce(p_jatuh_tempo, current_date + 30);
  v_nomor := next_document_number(v_q.company_id, 'invoice', 'INV');

  insert into invoices (
    company_id, nomor, quotation_id, customer_id, project_id, status,
    tanggal, jatuh_tempo, diskon_persen, pajak_persen, catatan, created_by
  ) values (
    v_q.company_id, v_nomor, v_q.id, v_q.customer_id, v_q.project_id, 'draft',
    current_date, v_tempo, v_q.diskon_persen, v_q.pajak_persen, v_q.catatan, auth.uid()
  ) returning id into v_invoice;

  insert into invoice_items (invoice_id, deskripsi, kuantitas, satuan, harga_satuan, urutan)
  select v_invoice, deskripsi, kuantitas, satuan, harga_satuan, urutan
    from quotation_items where quotation_id = p_quotation order by urutan;

  update quotations set status = 'dikonversi' where id = p_quotation;

  return v_invoice;
end; $$;

revoke execute on function konversi_penawaran_ke_invoice(uuid, date) from anon;
