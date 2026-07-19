-- =========================================================
-- 0015 — KUITANSI
-- Prasyarat: 0001–0014
-- =========================================================
--
-- Setiap pembayaran menerbitkan tepat satu kuitansi, otomatis.
-- Alasannya sama seperti pemasukan otomatis di 0006: pencatatan
-- ganda oleh manusia selalu berakhir tidak sinkron.
--
-- Kuitansi TIDAK menyimpan salinan jumlah yang berdiri sendiri —
-- nilainya dibaca dari `payments`, sehingga tidak mungkin berbeda
-- dari pembayaran yang diwakilinya.
-- =========================================================

create table if not exists kuitansi (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id),
  nomor text unique not null,
  payment_id uuid not null unique references payments(id) on delete cascade,
  tanggal date not null default current_date,
  untuk_pembayaran text,
  ttd_nama text,
  ttd_jabatan text,
  created_at timestamptz default now()
);

create index if not exists idx_kuitansi_company on kuitansi(company_id);

-- ---------------------------------------------------------
-- Terbit otomatis saat pembayaran dicatat
-- ---------------------------------------------------------
create or replace function terbitkan_kuitansi()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_nomor   text;
  v_inv     text;
  v_proyek  text;
begin
  select i.nomor, p.nama
    into v_inv, v_proyek
    from invoices i
    left join projects p on p.id = i.project_id
   where i.id = new.invoice_id;

  v_nomor := next_document_number(new.company_id, 'kuitansi', 'KW');

  insert into kuitansi (company_id, nomor, payment_id, tanggal, untuk_pembayaran)
  values (
    new.company_id,
    v_nomor,
    new.id,
    new.tanggal,
    coalesce(
      'Pembayaran termin ' || new.termin_ke || ' invoice ' || v_inv,
      'Pembayaran invoice ' || v_inv
    ) || coalesce(' — ' || v_proyek, '')
  )
  on conflict (payment_id) do nothing;

  return null;
end; $$;

drop trigger if exists trg_payments_kuitansi on payments;
create trigger trg_payments_kuitansi
  after insert on payments
  for each row execute function terbitkan_kuitansi();

-- ---------------------------------------------------------
-- Pembayaran yang sudah ada sebelum migrasi ini ikut diterbitkan
-- ---------------------------------------------------------
do $$
declare r record;
begin
  for r in
    select p.* from payments p
     where not exists (select 1 from kuitansi k where k.payment_id = p.id)
     order by p.created_at
  loop
    insert into kuitansi (company_id, nomor, payment_id, tanggal, untuk_pembayaran)
    values (
      r.company_id,
      next_document_number(r.company_id, 'kuitansi', 'KW'),
      r.id,
      r.tanggal,
      'Pembayaran termin ' || coalesce(r.termin_ke::text, '-')
    )
    on conflict (payment_id) do nothing;
  end loop;
end $$;

-- ---------------------------------------------------------
-- RLS — mengikuti wewenang pembayaran
-- ---------------------------------------------------------
alter table kuitansi enable row level security;

drop policy if exists kuitansi_select on kuitansi;
create policy kuitansi_select on kuitansi for select to authenticated
  using (company_id = auth_company_id() and auth_role() in ('direktur', 'admin_finance'));

drop policy if exists kuitansi_update on kuitansi;
create policy kuitansi_update on kuitansi for update to authenticated
  using (company_id = auth_company_id() and auth_role() = 'admin_finance')
  with check (company_id = auth_company_id());

-- Tanpa policy INSERT: hanya trigger yang boleh menerbitkan, agar
-- nomor kuitansi tidak pernah dibuat tanpa pembayaran di baliknya.
-- Tanpa policy DELETE: kuitansi ikut terhapus bila pembayarannya
-- dihapus (ON DELETE CASCADE), bukan dihapus sendiri.

-- ---------------------------------------------------------
-- Verifikasi
-- ---------------------------------------------------------
-- select k.nomor, k.tanggal, p.jumlah, i.nomor as invoice
--   from kuitansi k
--   join payments p on p.id = k.payment_id
--   join invoices i on i.id = p.invoice_id
--  order by k.nomor;
-- Jumlah baris kuitansi harus sama dengan jumlah baris payments.
