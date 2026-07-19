-- =========================================================
-- FASE 5 — KEUANGAN & BUKTI TRANSAKSI
-- Prasyarat: 0001–0005
-- =========================================================

-- ---------------------------------------------------------
-- 1. TAUTAN PEMBAYARAN → TRANSAKSI
--    Setiap pembayaran invoice otomatis menjadi satu baris
--    pemasukan. Kolom `payment_id` mencegah pencatatan ganda.
-- ---------------------------------------------------------
alter table transactions
  add column if not exists payment_id uuid references payments(id) on delete cascade;

create unique index if not exists uq_transactions_payment
  on transactions(payment_id) where payment_id is not null;

create or replace function catat_pemasukan_dari_pembayaran()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_project uuid;
  v_nomor   text;
begin
  select project_id, nomor into v_project, v_nomor
    from invoices where id = new.invoice_id;

  insert into transactions (
    company_id, tipe, jumlah, tanggal, kategori, metode,
    project_id, invoice_id, payment_id, deskripsi, created_by
  ) values (
    new.company_id, 'pemasukan', new.jumlah, new.tanggal,
    'Pembayaran Invoice', new.metode,
    v_project, new.invoice_id, new.id,
    coalesce('Termin ' || new.termin_ke || ' — ' || v_nomor, v_nomor),
    new.created_by
  )
  on conflict (payment_id) where payment_id is not null do update
    set jumlah   = excluded.jumlah,
        tanggal  = excluded.tanggal,
        metode   = excluded.metode;

  return null;
end; $$;

drop trigger if exists trg_payments_transaksi on payments;
create trigger trg_payments_transaksi
  after insert or update on payments
  for each row execute function catat_pemasukan_dari_pembayaran();

-- ---------------------------------------------------------
-- 2. JAGA TRANSAKSI OTOMATIS
--    Baris pemasukan hasil pembayaran tidak boleh disunting
--    manual — sumber kebenarannya tabel `payments`.
-- ---------------------------------------------------------
create or replace function jaga_transaksi()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and old.payment_id is not null then
    if new.jumlah is distinct from old.jumlah
       or new.tipe is distinct from old.tipe
       or new.tanggal is distinct from old.tanggal then
      raise exception
        'Transaksi ini berasal dari pembayaran invoice. Ubah data pembayarannya, bukan transaksinya.';
    end if;
  end if;

  if tg_op = 'DELETE' and old.payment_id is not null then
    raise exception
      'Transaksi ini terikat pembayaran invoice dan tidak dapat dihapus di sini.';
  end if;

  -- Pengeluaran wajib berkategori (jaring pengaman selain constraint).
  if tg_op <> 'DELETE' and new.tipe = 'pengeluaran'
     and (new.kategori is null or btrim(new.kategori) = '') then
    raise exception 'Pengeluaran wajib memiliki kategori.';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end; $$;

drop trigger if exists trg_transactions_jaga on transactions;
create trigger trg_transactions_jaga before update or delete on transactions
  for each row execute function jaga_transaksi();

-- ---------------------------------------------------------
-- 3. AUDIT LOG transaksi
-- ---------------------------------------------------------
create or replace function catat_audit_transaksi()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into audit_logs (company_id, actor_id, aksi, entity_type, entity_id, data_lama, data_baru)
  values (
    coalesce(new.company_id, old.company_id), auth.uid(),
    lower(tg_op), 'transaction', coalesce(new.id, old.id),
    case when tg_op <> 'INSERT'
         then jsonb_build_object('tipe', old.tipe, 'jumlah', old.jumlah) end,
    case when tg_op <> 'DELETE'
         then jsonb_build_object('tipe', new.tipe, 'jumlah', new.jumlah,
                                 'kategori', new.kategori) end
  );
  return null;
end; $$;

drop trigger if exists trg_transactions_audit on transactions;
create trigger trg_transactions_audit
  after insert or update or delete on transactions
  for each row execute function catat_audit_transaksi();

-- ---------------------------------------------------------
-- 4. VIEW REKAP KAS BULANAN
-- ---------------------------------------------------------
create or replace view rekap_kas_bulanan
with (security_invoker = on) as
select
  company_id,
  date_trunc('month', tanggal)::date                                  as bulan,
  sum(jumlah) filter (where tipe = 'pemasukan')                       as pemasukan,
  sum(jumlah) filter (where tipe = 'pengeluaran')                     as pengeluaran,
  coalesce(sum(jumlah) filter (where tipe = 'pemasukan'), 0)
    - coalesce(sum(jumlah) filter (where tipe = 'pengeluaran'), 0)    as net
from transactions
group by company_id, date_trunc('month', tanggal);

-- ---------------------------------------------------------
-- 5. STORAGE: bucket bukti transaksi
--    Berkas disimpan pada path `<company_id>/<entitas>/<berkas>`
--    sehingga policy dapat memeriksa folder pertama.
-- ---------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'bukti', 'bukti', false, 5242880,
  array['image/jpeg','image/png','image/webp','application/pdf']
)
on conflict (id) do update
  set file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "bukti_baca" on storage.objects;
create policy "bukti_baca" on storage.objects for select to authenticated
  using (
    bucket_id = 'bukti'
    and (storage.foldername(name))[1] = auth_company_id()::text
  );

drop policy if exists "bukti_unggah" on storage.objects;
create policy "bukti_unggah" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'bukti'
    and (storage.foldername(name))[1] = auth_company_id()::text
    and owner = auth.uid()
  );

drop policy if exists "bukti_hapus" on storage.objects;
create policy "bukti_hapus" on storage.objects for delete to authenticated
  using (
    bucket_id = 'bukti'
    and (storage.foldername(name))[1] = auth_company_id()::text
    and (owner = auth.uid() or auth_role() = 'admin_finance')
  );

-- Tidak ada policy UPDATE → berkas bukti tidak dapat ditimpa.

-- ---------------------------------------------------------
-- 6. Indeks
-- ---------------------------------------------------------
create index if not exists idx_txn_tipe     on transactions(tipe);
create index if not exists idx_txn_kategori on transactions(kategori);
create index if not exists idx_txn_vendor   on transactions(vendor_id);

-- ---------------------------------------------------------
-- 7. Verifikasi
-- ---------------------------------------------------------
-- Pemasukan otomatis:
--   insert into payments (...);
--   select * from transactions where payment_id is not null;  -- harus ada 1 baris
-- Sunting transaksi otomatis (harus gagal):
--   update transactions set jumlah = 1 where payment_id is not null;
-- Hitung ganda:
--   pastikan hanya satu baris per payment_id (dijaga unique index).
