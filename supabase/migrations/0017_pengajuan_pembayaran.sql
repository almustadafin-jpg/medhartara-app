-- =========================================================
-- 0017 — PENGAJUAN PEMBAYARAN PROYEK
-- Prasyarat: 0001–0016
-- =========================================================
--
-- Project Manager mengajukan pembayaran terkait proyeknya (vendor,
-- tenaga lepas, dll) kepada Admin/Finance. Admin meninjau lalu
-- menyetujui atau menolak.
--
-- Saat DISETUJUI, pengajuan berubah menjadi satu baris pengeluaran
-- kas sungguhan — dibuat oleh fungsi atomik di database, bukan
-- pencatatan ganda oleh manusia. Selama masih DIAJUKAN, belum ada
-- pengaruh apa pun ke kas.
-- =========================================================

create type pengajuan_status as enum ('diajukan', 'disetujui', 'ditolak');

create table if not exists payment_requests (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id),
  nomor text unique not null,                 -- PR-2026-0001
  project_id uuid not null references projects(id),
  vendor_id  uuid references vendors(id),
  kategori text not null,
  jumlah numeric(15,2) not null check (jumlah > 0),
  tanggal date not null default current_date,
  metode txn_method not null default 'transfer',
  deskripsi text,
  status pengajuan_status not null default 'diajukan',
  diajukan_oleh uuid references users_profile(id),
  ditinjau_oleh uuid references users_profile(id),
  ditinjau_pada timestamptz,
  catatan_tinjauan text,
  transaction_id uuid references transactions(id),   -- terisi saat disetujui
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_pr_company on payment_requests(company_id);
create index if not exists idx_pr_project on payment_requests(project_id);
create index if not exists idx_pr_status  on payment_requests(status);

-- ---------------------------------------------------------
-- RLS
-- ---------------------------------------------------------
alter table payment_requests enable row level security;

-- Baca: Direktur & Admin lihat semua; PM lihat pengajuannya sendiri
-- atau yang menyangkut proyek yang ia pegang.
drop policy if exists pr_select on payment_requests;
create policy pr_select on payment_requests for select to authenticated
  using (
    company_id = auth_company_id()
    and (
      auth_role() in ('direktur', 'admin_finance')
      or diajukan_oleh = auth.uid()
      or is_pm_of(project_id)
    )
  );

-- Buat: PM (proyeknya) atau Admin/Finance. Pembuat selalu dirinya sendiri.
drop policy if exists pr_insert on payment_requests;
create policy pr_insert on payment_requests for insert to authenticated
  with check (
    company_id = auth_company_id()
    and diajukan_oleh = auth.uid()
    and (
      (auth_role() = 'pm' and is_pm_of(project_id))
      or auth_role() = 'admin_finance'
    )
  );

-- Ubah: PM boleh menyunting pengajuannya SELAMA masih 'diajukan'.
-- Admin/Finance boleh meninjau (persetujuan lewat fungsi di bawah,
-- tapi policy ini memungkinkan pembaruan kolom tinjauan).
drop policy if exists pr_update on payment_requests;
create policy pr_update on payment_requests for update to authenticated
  using (
    company_id = auth_company_id()
    and (
      auth_role() = 'admin_finance'
      or (auth_role() = 'pm' and diajukan_oleh = auth.uid() and status = 'diajukan')
    )
  )
  with check (company_id = auth_company_id());

-- Hapus: PM boleh membatalkan pengajuannya selama masih 'diajukan';
-- Admin/Finance boleh menghapus yang belum disetujui.
drop policy if exists pr_delete on payment_requests;
create policy pr_delete on payment_requests for delete to authenticated
  using (
    company_id = auth_company_id()
    and status <> 'disetujui'
    and (
      auth_role() = 'admin_finance'
      or (auth_role() = 'pm' and diajukan_oleh = auth.uid())
    )
  );

-- ---------------------------------------------------------
-- PERSETUJUAN — atomik, hanya Admin/Finance
--   Membuat transaksi pengeluaran lalu menautkannya.
-- ---------------------------------------------------------
create or replace function setujui_pengajuan(p_id uuid, p_metode txn_method default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  r payment_requests;
  v_txn uuid;
begin
  if auth_role() <> 'admin_finance' then
    raise exception 'Hanya Admin/Finance yang dapat menyetujui pengajuan.';
  end if;

  select * into r from payment_requests where id = p_id for update;
  if not found then raise exception 'Pengajuan tidak ditemukan.'; end if;
  if r.status <> 'diajukan' then
    raise exception 'Pengajuan berstatus % tidak dapat disetujui.', r.status;
  end if;

  insert into transactions (
    company_id, tipe, jumlah, tanggal, kategori, metode,
    project_id, vendor_id, deskripsi, created_by
  ) values (
    r.company_id, 'pengeluaran', r.jumlah, r.tanggal, r.kategori,
    coalesce(p_metode, r.metode),
    r.project_id, r.vendor_id,
    coalesce(r.deskripsi, 'Pembayaran proyek') || ' (dari ' || r.nomor || ')',
    auth.uid()
  )
  returning id into v_txn;

  update payment_requests
     set status = 'disetujui',
         ditinjau_oleh = auth.uid(),
         ditinjau_pada = now(),
         transaction_id = v_txn,
         updated_at = now()
   where id = p_id;

  return v_txn;
end; $$;

create or replace function tolak_pengajuan(p_id uuid, p_catatan text default null)
returns void language plpgsql security definer set search_path = public as $$
declare r payment_requests;
begin
  if auth_role() <> 'admin_finance' then
    raise exception 'Hanya Admin/Finance yang dapat menolak pengajuan.';
  end if;

  select * into r from payment_requests where id = p_id for update;
  if not found then raise exception 'Pengajuan tidak ditemukan.'; end if;
  if r.status <> 'diajukan' then
    raise exception 'Pengajuan berstatus % tidak dapat ditolak.', r.status;
  end if;

  update payment_requests
     set status = 'ditolak',
         ditinjau_oleh = auth.uid(),
         ditinjau_pada = now(),
         catatan_tinjauan = p_catatan,
         updated_at = now()
   where id = p_id;
end; $$;

-- ---------------------------------------------------------
-- AUDIT
-- ---------------------------------------------------------
create or replace function catat_audit_pengajuan()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into audit_logs (company_id, actor_id, aksi, entity_type, entity_id, data_lama, data_baru)
  values (
    coalesce(new.company_id, old.company_id), auth.uid(),
    case
      when tg_op = 'INSERT' then 'create'
      when tg_op = 'DELETE' then 'delete'
      when new.status is distinct from old.status and new.status = 'disetujui' then 'approve'
      when new.status is distinct from old.status and new.status = 'ditolak'  then 'reject'
      else 'update'
    end,
    'payment_request', coalesce(new.id, old.id),
    case when tg_op <> 'INSERT'
         then jsonb_build_object('status', old.status, 'jumlah', old.jumlah) end,
    case when tg_op <> 'DELETE'
         then jsonb_build_object('nomor', new.nomor, 'status', new.status, 'jumlah', new.jumlah) end
  );
  return null;
end; $$;

drop trigger if exists trg_pr_audit on payment_requests;
create trigger trg_pr_audit
  after insert or update or delete on payment_requests
  for each row execute function catat_audit_pengajuan();

-- ---------------------------------------------------------
-- Verifikasi
-- ---------------------------------------------------------
-- select nomor, status, jumlah, transaction_id from payment_requests order by nomor;
-- Setiap pengajuan 'disetujui' harus punya transaction_id, dan jumlah
-- baris transaksi bertambah tepat satu per persetujuan.
