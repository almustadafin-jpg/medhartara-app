-- =========================================================
-- 0026 — TARIK BOQ→PENAWARAN SEBAGAI SATU BARIS (NAMA PROYEK + TOTAL)
-- Prasyarat: 0001–0025
-- =========================================================
--
-- Penyederhanaan lanjutan: penawaran hasil tarikan cukup satu baris —
-- deskripsi = nama proyek (atau judul BOQ bila tanpa proyek),
-- nilai = total_jual BOQ. Tidak lagi dirinci per kategori.
-- (Sinkron dengan auto-fill di form penawaran.)
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
  v_label    text;
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

  -- Label baris = nama proyek; bila tanpa proyek, pakai judul BOQ.
  select nama into v_label from projects where id = v_b.project_id;
  v_label := coalesce(nullif(btrim(v_label), ''), nullif(btrim(v_b.judul), ''), 'Proyek');

  v_nomor := next_document_number(v_b.company_id, 'quotation', 'QT');

  insert into quotations (
    company_id, nomor, customer_id, project_id, status,
    tanggal, berlaku_hingga, catatan, diskon_persen, pajak_persen, created_by
  ) values (
    v_b.company_id, v_nomor, v_b.customer_id, v_b.project_id, 'draft',
    current_date, coalesce(p_berlaku_hingga, current_date + 30),
    v_b.catatan, 0, 12, auth.uid()
  ) returning id into v_quotation;

  -- Satu baris: deskripsi = nama proyek, nilai = total_jual BOQ.
  -- kuantitas = 1 & hari = 1 → total penawaran = total_jual BOQ.
  insert into quotation_items (
    quotation_id, nama, deskripsi, kategori, kuantitas, satuan, hari, harga_satuan, urutan
  ) values (
    v_quotation, v_label, v_label, null, 1, 'Paket', 1, coalesce(v_b.total_jual, 0), 0
  );

  update boq set quotation_id = v_quotation where id = p_boq;

  return v_quotation;
end; $$;

revoke execute on function buat_penawaran_dari_boq(uuid, date) from anon;
