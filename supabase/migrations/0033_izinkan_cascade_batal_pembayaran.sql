-- =========================================================
-- 0033 - IZINKAN CASCADE SAAT PEMBAYARAN DIBATALKAN
-- Prasyarat: 0001-0032
-- =========================================================
--
-- jaga_transaksi memblokir DELETE transaksi ber-payment_id agar pengguna
-- tidak menghapus catatan pemasukan langsung. Tapi saat pembayaran
-- dibatalkan, transaksi turunannya HARUS ikut terhapus (ON DELETE CASCADE),
-- dan cascade itu ikut terblokir -> pembatalan pembayaran gagal.
--
-- Perbaikan: blokir DELETE hanya bila pembayaran induknya MASIH ada
-- (berarti pengguna mencoba hapus transaksi langsung). Bila induknya
-- sudah tidak ada (sedang cascade dari pembatalan pembayaran), izinkan.
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
    if exists (select 1 from payments where id = old.payment_id) then
      raise exception
        'Transaksi ini terikat pembayaran invoice. Batalkan pembayarannya di halaman invoice.';
    end if;
  end if;

  -- Pengeluaran wajib berkategori (jaring pengaman selain constraint).
  if tg_op <> 'DELETE' and new.tipe = 'pengeluaran'
     and (new.kategori is null or btrim(new.kategori) = '') then
    raise exception 'Pengeluaran wajib memiliki kategori.';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end; $$;
