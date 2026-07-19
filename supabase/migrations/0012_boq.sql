-- =========================================================
-- 0012 — BOQ / RAB (Bill of Quantities / Rencana Anggaran Biaya)
-- Prasyarat: 0001–0011
-- =========================================================
--
-- LATAR
-- BOQ adalah dokumen tersendiri, bukan bagian dari penawaran:
--   - disusun Project Manager
--   - disetujui Admin/Finance atau Direktur (satu tahap)
--   - dicetak sebagai LAMPIRAN penawaran atau invoice
--
-- Tiap baris memuat DUA harga:
--   harga_modal — biaya ke vendor/internal
--   harga_jual  — yang ditagihkan ke pelanggan
-- Selisihnya margin. Versi cetak untuk klien menyembunyikan kolom modal.
--
-- Karena memuat angka modal, BOQ tidak pernah otomatis ikut terkirim
-- ke pelanggan — pencetakan versi klien harus diminta eksplisit.
-- =========================================================

create type boq_status as enum ('draft', 'diajukan', 'disetujui', 'ditolak', 'arsip');

-- ---------------------------------------------------------
-- 1. TABEL
-- ---------------------------------------------------------
create table if not exists boq (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id),
  nomor text unique not null,
  judul text not null,

  project_id   uuid references projects(id),
  customer_id  uuid references customers(id),
  quotation_id uuid references quotations(id),
  invoice_id   uuid references invoices(id),

  status boq_status not null default 'draft',
  tanggal date default current_date,
  catatan text,

  total_modal numeric(15,2) default 0,
  total_jual  numeric(15,2) default 0,

  disetujui_oleh uuid references users_profile(id),
  disetujui_pada timestamptz,
  created_by uuid references users_profile(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists boq_items (
  id uuid primary key default uuid_generate_v4(),
  boq_id uuid references boq(id) on delete cascade,
  kategori text,
  nama text not null,
  deskripsi text,
  kuantitas numeric(12,2) not null default 1 check (kuantitas > 0),
  satuan text,
  hari numeric(6,2) not null default 1 check (hari > 0),
  harga_modal numeric(15,2) not null default 0 check (harga_modal >= 0),
  harga_jual  numeric(15,2) not null default 0 check (harga_jual  >= 0),
  subtotal_modal numeric(15,2) generated always as (kuantitas * hari * harga_modal) stored,
  subtotal_jual  numeric(15,2) generated always as (kuantitas * hari * harga_jual)  stored,
  urutan int default 0
);

create index if not exists idx_boq_company   on boq(company_id);
create index if not exists idx_boq_project   on boq(project_id);
create index if not exists idx_boq_quotation on boq(quotation_id);
create index if not exists idx_boq_status    on boq(status);
create index if not exists idx_boq_items_boq on boq_items(boq_id);

drop trigger if exists trg_boq_updated on boq;
create trigger trg_boq_updated before update on boq
  for each row execute function set_updated_at();

-- ---------------------------------------------------------
-- 2. TOTAL DIHITUNG DATABASE
-- ---------------------------------------------------------
create or replace function hitung_total_boq(p_boq uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update boq b
     set total_modal = coalesce((select sum(subtotal_modal) from boq_items where boq_id = p_boq), 0),
         total_jual  = coalesce((select sum(subtotal_jual)  from boq_items where boq_id = p_boq), 0)
   where b.id = p_boq;
end; $$;

create or replace function trg_boq_total()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform hitung_total_boq(coalesce(new.boq_id, old.boq_id));
  return null;
end; $$;

drop trigger if exists trg_boq_items_total on boq_items;
create trigger trg_boq_items_total
  after insert or update or delete on boq_items
  for each row execute function trg_boq_total();

-- ---------------------------------------------------------
-- 3. STATE MACHINE
--    draft → diajukan → disetujui / ditolak → arsip
-- ---------------------------------------------------------
create or replace function jaga_transisi_boq()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_item int;
  v_boleh boolean;
begin
  if new.status = old.status then
    if old.status in ('disetujui', 'arsip') then
      if new.total_jual is distinct from old.total_jual
         or new.total_modal is distinct from old.total_modal then
        raise exception 'BOQ berstatus % tidak dapat diubah.', old.status;
      end if;
    end if;
    return new;
  end if;

  v_boleh := case old.status
    when 'draft'     then new.status in ('diajukan', 'arsip')
    when 'diajukan'  then new.status in ('disetujui', 'ditolak', 'draft')
    when 'disetujui' then new.status in ('arsip')
    when 'ditolak'   then new.status in ('draft', 'arsip')
    else false
  end;

  if not v_boleh then
    raise exception 'Transisi status BOQ % → % tidak diizinkan.', old.status, new.status;
  end if;

  if new.status = 'diajukan' then
    select count(*) into v_item from boq_items where boq_id = new.id;
    if v_item = 0 then
      raise exception 'BOQ harus memiliki minimal satu item sebelum diajukan.';
    end if;
  end if;

  if new.status in ('disetujui', 'ditolak') then
    new.disetujui_oleh := coalesce(auth.uid(), new.disetujui_oleh);
    new.disetujui_pada := now();
  end if;

  return new;
end; $$;

drop trigger if exists trg_boq_transisi on boq;
create trigger trg_boq_transisi before update on boq
  for each row execute function jaga_transisi_boq();

-- ---------------------------------------------------------
-- 4. AUDIT
-- ---------------------------------------------------------
create or replace function catat_audit_boq()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into audit_logs (company_id, actor_id, aksi, entity_type, entity_id, data_lama, data_baru)
  values (
    new.company_id, auth.uid(),
    case when tg_op = 'INSERT' then 'create'
         when new.status is distinct from old.status
              and new.status in ('disetujui','ditolak') then 'approve'
         else 'update' end,
    'boq', new.id,
    case when tg_op = 'UPDATE'
         then jsonb_build_object('status', old.status, 'total', old.total_jual) end,
    jsonb_build_object('nomor', new.nomor, 'status', new.status, 'total', new.total_jual)
  );
  return null;
end; $$;

drop trigger if exists trg_boq_audit on boq;
create trigger trg_boq_audit after insert or update on boq
  for each row execute function catat_audit_boq();

-- ---------------------------------------------------------
-- 5. RLS
--    PM menyusun BOQ proyek yang ia pegang; Admin/Direktur menyetujui.
-- ---------------------------------------------------------
alter table boq       enable row level security;
alter table boq_items enable row level security;

drop policy if exists boq_select on boq;
create policy boq_select on boq for select to authenticated
  using (company_id = auth_company_id());

drop policy if exists boq_insert on boq;
create policy boq_insert on boq for insert to authenticated
  with check (
    company_id = auth_company_id()
    and (
      auth_role() in ('direktur', 'admin_finance')
      or (auth_role() = 'pm' and (project_id is null or is_pm_of(project_id)))
    )
  );

drop policy if exists boq_update on boq;
create policy boq_update on boq for update to authenticated
  using (
    company_id = auth_company_id()
    and (
      auth_role() in ('direktur', 'admin_finance')
      or (auth_role() = 'pm' and is_pm_of(project_id) and status in ('draft', 'ditolak'))
    )
  )
  with check (company_id = auth_company_id());

-- Tanpa policy DELETE — BOQ diarsipkan, tidak dihapus.

drop policy if exists boq_items_select on boq_items;
create policy boq_items_select on boq_items for select to authenticated
  using (exists (select 1 from boq b where b.id = boq_id));

drop policy if exists boq_items_write on boq_items;
create policy boq_items_write on boq_items for all to authenticated
  using (
    exists (
      select 1 from boq b
       where b.id = boq_id
         and b.status in ('draft', 'ditolak')
         and (auth_role() in ('direktur', 'admin_finance')
              or (auth_role() = 'pm' and is_pm_of(b.project_id)))
    )
  )
  with check (exists (select 1 from boq b where b.id = boq_id and b.status in ('draft', 'ditolak')));

-- ---------------------------------------------------------
-- 6. Verifikasi
-- ---------------------------------------------------------
-- select nomor, status, total_modal, total_jual,
--        total_jual - total_modal as margin from boq;
-- Transisi terlarang harus gagal:
--   update boq set status = 'disetujui' where status = 'draft';
