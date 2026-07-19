-- =========================================================
-- FASE 3 — PROYEK & PENAWARAN
-- Aturan bisnis ditegakkan di DATABASE, bukan hanya di aplikasi.
-- Prasyarat: 0001, 0002, 0003
-- =========================================================

-- ---------------------------------------------------------
-- 1. KODE PROYEK OTOMATIS  (PRJ-2026-0001)
-- ---------------------------------------------------------
create or replace function isi_kode_proyek()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.kode is null or new.kode = '' then
    new.kode := next_document_number(new.company_id, 'project', 'PRJ');
  end if;
  return new;
end; $$;

drop trigger if exists trg_projects_kode on projects;
create trigger trg_projects_kode before insert on projects
  for each row execute function isi_kode_proyek();

-- ---------------------------------------------------------
-- 2. HITUNG ULANG TOTAL PENAWARAN
--    Total TIDAK PERNAH dipercaya dari klien. Selalu dihitung
--    ulang dari baris item + persentase diskon & pajak.
-- ---------------------------------------------------------
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
         total    = v_dasar + (v_dasar * coalesce(v_pajak, 0) / 100)
   where id = p_quotation;
end; $$;

create or replace function trg_hitung_dari_item()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform hitung_total_quotation(coalesce(new.quotation_id, old.quotation_id));
  return null;
end; $$;

drop trigger if exists trg_quotation_items_total on quotation_items;
create trigger trg_quotation_items_total
  after insert or update or delete on quotation_items
  for each row execute function trg_hitung_dari_item();

-- Diskon/pajak berubah di induk → hitung ulang juga.
create or replace function trg_hitung_dari_induk()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.diskon_persen is distinct from old.diskon_persen
     or new.pajak_persen is distinct from old.pajak_persen then
    perform hitung_total_quotation(new.id);
  end if;
  return null;
end; $$;

drop trigger if exists trg_quotations_total on quotations;
create trigger trg_quotations_total after update on quotations
  for each row execute function trg_hitung_dari_induk();

-- ---------------------------------------------------------
-- 3. STATE MACHINE PENAWARAN  (§9.1)
--    draft → terkirim → disetujui/ditolak → dikonversi → arsip
-- ---------------------------------------------------------
create or replace function jaga_transisi_quotation()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_jumlah_item int;
  v_boleh boolean := false;
begin
  if new.status = old.status then
    -- Bukan perubahan status. Blokir penyuntingan dokumen final.
    if old.status in ('dikonversi','arsip','disetujui') then
      if new.diskon_persen is distinct from old.diskon_persen
         or new.pajak_persen is distinct from old.pajak_persen
         or new.customer_id  is distinct from old.customer_id then
        raise exception 'Penawaran berstatus % tidak dapat diubah.', old.status;
      end if;
    end if;
    return new;
  end if;

  -- Transisi yang diizinkan
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

  -- Syarat kirim: minimal satu item dan total > 0
  if new.status = 'terkirim' then
    select count(*) into v_jumlah_item from quotation_items where quotation_id = new.id;
    if v_jumlah_item = 0 then
      raise exception 'Penawaran harus memiliki minimal satu item sebelum dikirim.';
    end if;
    if coalesce(new.total, 0) <= 0 then
      raise exception 'Total penawaran harus lebih besar dari nol.';
    end if;
  end if;

  -- Persetujuan: pembuat tidak boleh menyetujui pekerjaannya sendiri
  if new.status in ('disetujui','ditolak') then
    if auth.uid() is not null and new.created_by = auth.uid() then
      raise exception 'Pembuat penawaran tidak dapat menyetujui atau menolak penawarannya sendiri.';
    end if;
    new.disetujui_oleh := coalesce(auth.uid(), new.disetujui_oleh);
    new.disetujui_pada := now();
  end if;

  return new;
end; $$;

drop trigger if exists trg_quotations_transisi on quotations;
create trigger trg_quotations_transisi before update on quotations
  for each row execute function jaga_transisi_quotation();

-- ---------------------------------------------------------
-- 4. AUDIT LOG OTOMATIS untuk penawaran
--    Ditulis oleh trigger — pengguna tidak dapat memalsukan.
-- ---------------------------------------------------------
create or replace function catat_audit_quotation()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_aksi text;
begin
  if tg_op = 'INSERT' then
    v_aksi := 'create';
  elsif new.status is distinct from old.status then
    v_aksi := case when new.status in ('disetujui','ditolak') then 'approve' else 'update' end;
  else
    v_aksi := 'update';
  end if;

  insert into audit_logs (company_id, actor_id, aksi, entity_type, entity_id, data_lama, data_baru)
  values (
    new.company_id, auth.uid(), v_aksi, 'quotation', new.id,
    case when tg_op = 'UPDATE'
         then jsonb_build_object('status', old.status, 'total', old.total) end,
    jsonb_build_object('nomor', new.nomor, 'status', new.status, 'total', new.total)
  );
  return null;
end; $$;

drop trigger if exists trg_quotations_audit on quotations;
create trigger trg_quotations_audit after insert or update on quotations
  for each row execute function catat_audit_quotation();

-- ---------------------------------------------------------
-- 5. Penyesuaian kolom & indeks
-- ---------------------------------------------------------
alter table projects add column if not exists nilai_kontrak numeric(15,2);

create index if not exists idx_quotations_status  on quotations(status);
create index if not exists idx_quotations_tanggal on quotations(tanggal desc);
create index if not exists idx_projects_status    on projects(status);

-- ---------------------------------------------------------
-- 6. Verifikasi
-- ---------------------------------------------------------
-- Uji transisi terlarang (harus gagal):
--   update quotations set status = 'disetujui' where status = 'draft';
-- Uji hitung ulang:
--   insert into quotation_items (...) → cek kolom total pada quotations.
