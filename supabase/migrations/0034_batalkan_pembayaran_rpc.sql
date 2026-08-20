-- =========================================================
-- 0034 - BATALKAN PEMBAYARAN via RPC + penanda sesi
-- Prasyarat: 0001-0033
-- =========================================================
--
-- Pendekatan 0033 gagal: saat ON DELETE CASCADE, baris pembayaran induk
-- masih ada ketika trigger transaksi (BEFORE DELETE) berjalan, sehingga
-- pengecekan "exists payments" tetap memblokir.
--
-- Solusi: trigger mengizinkan hapus transaksi ber-payment_id HANYA bila
-- penanda sesi app.batal_pembayaran = 'on'. Penanda itu disetel oleh
-- fungsi batalkan_pembayaran() sebelum menghapus pembayaran, jadi cascade
-- diizinkan; penghapusan transaksi langsung (tanpa penanda) tetap ditolak.
-- =========================================================

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
    if coalesce(current_setting('app.batal_pembayaran', true), '') <> 'on' then
      raise exception
        'Transaksi ini terikat pembayaran invoice. Batalkan pembayarannya di halaman invoice.';
    end if;
  end if;

  if tg_op <> 'DELETE' and new.tipe = 'pengeluaran'
     and (new.kategori is null or btrim(new.kategori) = '') then
    raise exception 'Pengeluaran wajib memiliki kategori.';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end; $$;

-- ---------------------------------------------------------
-- Fungsi pembatalan pembayaran (dipakai aplikasi).
-- Menghapus pembayaran; kuitansi & transaksi turunannya ikut terhapus
-- (cascade), status invoice dihitung ulang otomatis.
-- ---------------------------------------------------------
create or replace function batalkan_pembayaran(p_payment uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_company uuid;
begin
  if auth_role() is distinct from 'admin_finance' then
    raise exception 'Hanya Admin/Finance yang dapat membatalkan pembayaran.';
  end if;

  select company_id into v_company from payments where id = p_payment;
  if not found then
    raise exception 'Pembayaran tidak ditemukan.';
  end if;
  if v_company is distinct from auth_company_id() then
    raise exception 'Pembayaran bukan milik perusahaan Anda.';
  end if;

  -- Penanda sesi: izinkan cascade menghapus transaksi turunan pembayaran.
  perform set_config('app.batal_pembayaran', 'on', true);

  delete from payments where id = p_payment;

  perform set_config('app.batal_pembayaran', 'off', true);
end; $$;

revoke execute on function batalkan_pembayaran(uuid) from anon;
