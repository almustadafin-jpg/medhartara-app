-- =========================================================
-- 0011 — ITEM: NAMA + DESKRIPSI, KATEGORI, DAN HARI
-- Prasyarat: 0001–0010
-- =========================================================
--
-- LATAR
-- Struktur lama hanya punya satu kolom `deskripsi` untuk tiap baris,
-- padahal dokumen produksi Medhartara membedakan:
--   - nama item      : "Kamera"
--   - spesifikasi    : "Sony A7s Mark III (Body only) — termasuk Tripod…"
--   - kategori       : "EQUIPMENT RENT" / "MAN POWER"
--   - lama pemakaian : 2 hari
--
-- Perhitungan ikut berubah:
--   subtotal = kuantitas × hari × harga_satuan
--
-- MIGRASI DATA
-- Isi `deskripsi` lama dipindahkan ke `nama`, karena selama ini kolom
-- itu memang dipakai sebagai nama item. Kolom `deskripsi` kemudian
-- dikosongkan untuk menampung spesifikasi.
-- =========================================================

-- ---------------------------------------------------------
-- 1. Kolom baru
-- ---------------------------------------------------------
alter table quotation_items
  add column if not exists nama     text,
  add column if not exists kategori text,
  add column if not exists hari     numeric(6,2) not null default 1
    check (hari > 0);

alter table invoice_items
  add column if not exists nama     text,
  add column if not exists kategori text,
  add column if not exists hari     numeric(6,2) not null default 1
    check (hari > 0);

-- ---------------------------------------------------------
-- 2. Pindahkan data lama: deskripsi → nama
-- ---------------------------------------------------------
update quotation_items
   set nama = deskripsi, deskripsi = null
 where nama is null;

update invoice_items
   set nama = deskripsi, deskripsi = null
 where nama is null;

-- ---------------------------------------------------------
-- 3. Subtotal ikut memperhitungkan hari
--    Kolom generated tidak bisa diubah rumusnya, jadi dibuat ulang.
-- ---------------------------------------------------------
alter table quotation_items drop column if exists subtotal;
alter table quotation_items
  add column subtotal numeric(15,2)
  generated always as (kuantitas * hari * harga_satuan) stored;

alter table invoice_items drop column if exists subtotal;
alter table invoice_items
  add column subtotal numeric(15,2)
  generated always as (kuantitas * hari * harga_satuan) stored;

-- ---------------------------------------------------------
-- 4. Trigger penghitung total ikut disesuaikan
-- ---------------------------------------------------------
create or replace function hitung_total_quotation(p_quotation uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_subtotal numeric(15,2);
  v_diskon   numeric(5,2);
  v_pajak    numeric(5,2);
  v_dasar    numeric(15,2);
begin
  select coalesce(sum(kuantitas * hari * harga_satuan), 0)
    into v_subtotal
    from quotation_items where quotation_id = p_quotation;

  select diskon_persen, pajak_persen into v_diskon, v_pajak
    from quotations where id = p_quotation;
  if not found then return; end if;

  v_dasar := v_subtotal - (v_subtotal * coalesce(v_diskon, 0) / 100);

  update quotations
     set subtotal = v_subtotal,
         total    = v_dasar + (v_dasar * coalesce(v_pajak, 0) / 100)
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
  select coalesce(sum(kuantitas * hari * harga_satuan), 0)
    into v_subtotal
    from invoice_items where invoice_id = p_invoice;

  select diskon_persen, pajak_persen into v_diskon, v_pajak
    from invoices where id = p_invoice;
  if not found then return; end if;

  v_dasar := v_subtotal - (v_subtotal * coalesce(v_diskon, 0) / 100);

  update invoices
     set subtotal = v_subtotal,
         total    = v_dasar + (v_dasar * coalesce(v_pajak, 0) / 100)
   where id = p_invoice;
end; $$;

-- ---------------------------------------------------------
-- 5. Konversi penawaran → invoice ikut menyalin kolom baru
-- ---------------------------------------------------------
create or replace function konversi_penawaran_ke_invoice(
  p_quotation uuid,
  p_jatuh_tempo date default null
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_q       quotations%rowtype;
  v_invoice uuid;
  v_nomor   text;
  v_tempo   date;
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

  if v_q.status <> 'disetujui' then
    raise exception 'Hanya penawaran berstatus disetujui yang dapat dikonversi (saat ini: %).', v_q.status;
  end if;

  if exists (select 1 from invoices where quotation_id = p_quotation) then
    raise exception 'Penawaran ini sudah pernah dikonversi menjadi invoice.';
  end if;

  v_tempo := coalesce(p_jatuh_tempo, current_date + 30);
  v_nomor := next_document_number(v_q.company_id, 'invoice', 'INV');

  insert into invoices (
    company_id, nomor, quotation_id, customer_id, project_id, status,
    tanggal, jatuh_tempo, diskon_persen, pajak_persen, catatan, created_by,
    ttd_nama, ttd_jabatan
  ) values (
    v_q.company_id, v_nomor, v_q.id, v_q.customer_id, v_q.project_id, 'draft',
    current_date, v_tempo, v_q.diskon_persen, v_q.pajak_persen, v_q.catatan, auth.uid(),
    v_q.ttd_nama, v_q.ttd_jabatan
  ) returning id into v_invoice;

  insert into invoice_items (
    invoice_id, nama, deskripsi, kategori, kuantitas, satuan, hari, harga_satuan, urutan
  )
  select v_invoice, nama, deskripsi, kategori, kuantitas, satuan, hari, harga_satuan, urutan
    from quotation_items where quotation_id = p_quotation order by urutan;

  update quotations set status = 'dikonversi' where id = p_quotation;

  return v_invoice;
end; $$;

-- ---------------------------------------------------------
-- 6. Verifikasi
-- ---------------------------------------------------------
-- select nama, deskripsi, kategori, kuantitas, hari, harga_satuan, subtotal
--   from quotation_items limit 5;
-- Subtotal harus sama dengan kuantitas × hari × harga_satuan.
