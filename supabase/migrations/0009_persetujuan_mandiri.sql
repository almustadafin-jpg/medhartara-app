-- =========================================================
-- 0009 — PERSETUJUAN PENAWARAN OLEH DIRI SENDIRI
-- Prasyarat: 0001–0008
-- =========================================================
--
-- LATAR
-- Rancangan awal menerapkan segregation of duties: pembuat penawaran
-- tidak boleh menyetujui penawarannya sendiri, dan hanya Direktur yang
-- berwenang menyetujui.
--
-- Dalam praktik Medhartara, persetujuan pelanggan sering datang lewat
-- lisan/telepon, lalu dicatat oleh orang yang sama yang menyusun
-- penawaran. Aturan lama membuat penawaran mandek dan tidak bisa
-- dikonversi jadi invoice.
--
-- YANG DILEPAS
-- 1. Larangan "pembuat tidak boleh menyetujui"
-- 2. Pembatasan penyetuju hanya Direktur — kini Admin/Finance juga bisa
--
-- YANG TETAP ADA
-- - State machine: hanya `terkirim` yang bisa jadi disetujui/ditolak
-- - Kolom `disetujui_oleh` dan `disetujui_pada` tetap diisi otomatis
-- - Audit log tetap mencatat siapa menyetujui dan kapan
--
-- Jejaknya tetap utuh; yang hilang hanya pencegahannya di muka.
-- Bila kelak ada staf terpisah, jalankan 0002_rls.sql bagian
-- `quotations_approve` dan blok pembuat di trigger untuk mengembalikannya.
-- =========================================================

-- ---------------------------------------------------------
-- 1. Trigger transisi — tanpa larangan menyetujui karya sendiri
-- ---------------------------------------------------------
create or replace function jaga_transisi_quotation()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_jumlah_item int;
  v_boleh boolean := false;
begin
  if new.status = old.status then
    if old.status in ('dikonversi','arsip','disetujui') then
      if new.diskon_persen is distinct from old.diskon_persen
         or new.pajak_persen is distinct from old.pajak_persen
         or new.customer_id  is distinct from old.customer_id then
        raise exception 'Penawaran berstatus % tidak dapat diubah.', old.status;
      end if;
    end if;
    return new;
  end if;

  v_boleh := case old.status
    when 'draft'      then new.status in ('terkirim','arsip')
    when 'terkirim'   then new.status in ('disetujui','ditolak','draft')
    when 'disetujui'  then new.status in ('dikonversi','arsip')
    when 'ditolak'    then new.status in ('arsip','draft')
    else false
  end;

  if not v_boleh then
    raise exception 'Transisi status % → % tidak diizinkan.', old.status, new.status;
  end if;

  if new.status = 'terkirim' then
    select count(*) into v_jumlah_item from quotation_items where quotation_id = new.id;
    if v_jumlah_item = 0 then
      raise exception 'Penawaran harus memiliki minimal satu item sebelum dikirim.';
    end if;
    if coalesce(new.total, 0) <= 0 then
      raise exception 'Total penawaran harus lebih besar dari nol.';
    end if;
  end if;

  -- Siapa pun yang berwenang boleh menyetujui, termasuk pembuatnya.
  -- Identitas penyetuju tetap dicatat agar jejaknya jelas.
  if new.status in ('disetujui','ditolak') then
    new.disetujui_oleh := coalesce(auth.uid(), new.disetujui_oleh);
    new.disetujui_pada := now();
  end if;

  return new;
end; $$;

-- ---------------------------------------------------------
-- 2. RLS — Admin/Finance ikut berwenang menyetujui
-- ---------------------------------------------------------
drop policy if exists quotations_approve on quotations;

create policy quotations_approve on quotations for update to authenticated
  using (
    company_id = auth_company_id()
    and auth_role() in ('direktur', 'admin_finance')
    and status = 'terkirim'
  )
  with check (
    company_id = auth_company_id()
    and status in ('disetujui', 'ditolak')
  );

-- ---------------------------------------------------------
-- 3. Verifikasi
-- ---------------------------------------------------------
-- Sebagai Admin/Finance, pada penawaran berstatus terkirim buatan sendiri:
--   update quotations set status = 'disetujui' where id = '<id>';
--   → harus berhasil, dan kolom disetujui_oleh/disetujui_pada terisi.
--
-- Transisi terlarang harus tetap ditolak:
--   update quotations set status = 'disetujui' where status = 'draft';
