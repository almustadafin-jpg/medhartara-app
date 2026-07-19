-- =========================================================
-- 0013 — TARIK BOQ DISETUJUI MENJADI PENAWARAN
-- Prasyarat: 0001–0012
-- =========================================================
--
-- BOQ yang sudah disetujui dapat langsung menjadi penawaran:
-- kolom `harga_jual` tiap baris menjadi `harga_satuan` penawaran.
-- Kolom `harga_modal` TIDAK ikut — penawaran adalah dokumen
-- pelanggan, margin tidak boleh bocor ke sana.
--
-- Seluruh langkah dijalankan satu fungsi agar atomik, sama seperti
-- konversi penawaran → invoice.
-- =========================================================

create or replace function buat_penawaran_dari_boq(
  p_boq uuid,
  p_berlaku_hingga date default null
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_b        boq%rowtype;
  v_quotation uuid;
  v_nomor    text;
  v_peran    user_role := auth_role();
begin
  select * into v_b from boq where id = p_boq;
  if not found then
    raise exception 'BOQ tidak ditemukan.';
  end if;

  if v_b.company_id is distinct from auth_company_id() then
    raise exception 'BOQ bukan milik perusahaan Anda.';
  end if;

  -- Wewenang sama dengan membuat penawaran biasa.
  if v_peran = 'pm' then
    if v_b.project_id is null or not is_pm_of(v_b.project_id) then
      raise exception 'Anda hanya dapat menarik BOQ dari proyek yang Anda pegang.';
    end if;
  elsif v_peran is distinct from 'admin_finance' then
    raise exception 'Peran Anda tidak berwenang membuat penawaran.';
  end if;

  if v_b.status <> 'disetujui' then
    raise exception 'Hanya BOQ berstatus disetujui yang dapat ditarik (saat ini: %).', v_b.status;
  end if;

  if v_b.quotation_id is not null then
    raise exception 'BOQ ini sudah pernah ditarik menjadi penawaran.';
  end if;

  if v_b.customer_id is null then
    raise exception 'BOQ belum memiliki pelanggan. Lengkapi dulu sebelum ditarik.';
  end if;

  v_nomor := next_document_number(v_b.company_id, 'quotation', 'QT');

  insert into quotations (
    company_id, nomor, customer_id, project_id, status,
    tanggal, berlaku_hingga, catatan, diskon_persen, pajak_persen, created_by
  ) values (
    v_b.company_id, v_nomor, v_b.customer_id, v_b.project_id, 'draft',
    current_date, coalesce(p_berlaku_hingga, current_date + 30),
    v_b.catatan, 0, 11, auth.uid()
  ) returning id into v_quotation;

  -- harga_jual → harga_satuan. Modal sengaja ditinggal.
  insert into quotation_items (
    quotation_id, nama, deskripsi, kategori, kuantitas, satuan, hari, harga_satuan, urutan
  )
  select v_quotation, nama, deskripsi, kategori, kuantitas, satuan, hari, harga_jual, urutan
    from boq_items where boq_id = p_boq order by urutan;

  update boq set quotation_id = v_quotation where id = p_boq;

  return v_quotation;
end; $$;

revoke execute on function buat_penawaran_dari_boq(uuid, date) from anon;

-- ---------------------------------------------------------
-- Verifikasi
-- ---------------------------------------------------------
-- select buat_penawaran_dari_boq('<id-boq-disetujui>');
-- Percobaan kedua pada BOQ yang sama harus gagal.
-- Sebagai PM pada BOQ proyek orang lain harus gagal.
