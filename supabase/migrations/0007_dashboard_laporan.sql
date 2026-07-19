-- =========================================================
-- FASE 6 — DASHBOARD & LAPORAN
-- Semua view/fungsi memakai hak pemanggil, jadi RLS tetap berlaku.
-- Prasyarat: 0001–0006
-- =========================================================

-- ---------------------------------------------------------
-- 1. RINGKASAN DASHBOARD
--    Satu baris per perusahaan. Angka dihitung di database
--    agar aplikasi tidak perlu menarik seluruh tabel.
-- ---------------------------------------------------------
create or replace view dashboard_ringkasan
with (security_invoker = on) as
select
  c.id as company_id,

  coalesce((select sum(t.jumlah) from transactions t
             where t.company_id = c.id and t.tipe = 'pemasukan'), 0)   as total_pemasukan,

  coalesce((select sum(t.jumlah) from transactions t
             where t.company_id = c.id and t.tipe = 'pengeluaran'), 0) as total_pengeluaran,

  coalesce((select sum(t.jumlah) filter (where t.tipe = 'pemasukan')
                 - sum(t.jumlah) filter (where t.tipe = 'pengeluaran')
              from transactions t where t.company_id = c.id), 0)       as saldo_kas,

  coalesce((select sum(r.sisa_tagihan) from invoice_ringkas r
             where r.company_id = c.id
               and r.status not in ('draft','batal')), 0)              as piutang,

  coalesce((select count(*) from invoice_ringkas r
             where r.company_id = c.id
               and r.status_efektif = 'jatuh_tempo'), 0)               as invoice_jatuh_tempo,

  coalesce((select count(*) from projects p
             where p.company_id = c.id and p.status = 'berjalan'), 0)  as proyek_berjalan,

  coalesce((select count(*) from quotations q
             where q.company_id = c.id and q.status = 'terkirim'), 0)  as penawaran_menunggu
from companies c;

-- ---------------------------------------------------------
-- 2. LAPORAN PERIODE
--    SECURITY INVOKER (bawaan) — pengguna hanya melihat baris
--    yang diizinkan RLS untuknya.
-- ---------------------------------------------------------
create or replace function laporan_periode(p_dari date, p_sampai date)
returns table (
  total_pemasukan   numeric,
  total_pengeluaran numeric,
  laba_bersih       numeric,
  jumlah_transaksi  bigint
)
language sql stable as $$
  select
    coalesce(sum(jumlah) filter (where tipe = 'pemasukan'), 0),
    coalesce(sum(jumlah) filter (where tipe = 'pengeluaran'), 0),
    coalesce(sum(jumlah) filter (where tipe = 'pemasukan'), 0)
      - coalesce(sum(jumlah) filter (where tipe = 'pengeluaran'), 0),
    count(*)
  from transactions
  where tanggal between p_dari and p_sampai;
$$;

-- ---------------------------------------------------------
-- 3. REKAP PER KATEGORI
-- ---------------------------------------------------------
create or replace function rekap_kategori(p_dari date, p_sampai date)
returns table (
  tipe     txn_type,
  kategori text,
  total    numeric,
  jumlah   bigint
)
language sql stable as $$
  select
    tipe,
    coalesce(nullif(btrim(kategori), ''), 'Tanpa Kategori') as kategori,
    sum(jumlah),
    count(*)
  from transactions
  where tanggal between p_dari and p_sampai
  group by tipe, coalesce(nullif(btrim(kategori), ''), 'Tanpa Kategori')
  order by sum(jumlah) desc;
$$;

-- ---------------------------------------------------------
-- 4. PROFIT PROYEK DALAM PERIODE
--    Berbeda dari view `project_profitability` yang menghitung
--    seluruh riwayat — fungsi ini dibatasi rentang tanggal.
-- ---------------------------------------------------------
create or replace function profit_proyek_periode(p_dari date, p_sampai date)
returns table (
  project_id  uuid,
  nama        text,
  kode        text,
  pemasukan   numeric,
  pengeluaran numeric,
  profit      numeric
)
language sql stable as $$
  select
    p.id,
    p.nama,
    p.kode,
    coalesce(sum(t.jumlah) filter (where t.tipe = 'pemasukan'), 0),
    coalesce(sum(t.jumlah) filter (where t.tipe = 'pengeluaran'), 0),
    coalesce(sum(t.jumlah) filter (where t.tipe = 'pemasukan'), 0)
      - coalesce(sum(t.jumlah) filter (where t.tipe = 'pengeluaran'), 0)
  from projects p
  left join transactions t
    on t.project_id = p.id
   and t.tanggal between p_dari and p_sampai
  group by p.id, p.nama, p.kode
  order by 6 desc;
$$;

-- ---------------------------------------------------------
-- 5. ARUS KAS N BULAN TERAKHIR
--    generate_series memastikan bulan tanpa transaksi tetap
--    muncul sebagai nol, sehingga grafik tidak bolong.
-- ---------------------------------------------------------
create or replace function arus_kas_bulanan(p_jumlah_bulan int default 6)
returns table (
  bulan       date,
  pemasukan   numeric,
  pengeluaran numeric,
  net         numeric
)
language sql stable as $$
  with rentang as (
    select generate_series(
      date_trunc('month', current_date) - ((p_jumlah_bulan - 1) || ' month')::interval,
      date_trunc('month', current_date),
      '1 month'::interval
    )::date as bulan
  )
  select
    r.bulan,
    coalesce(sum(t.jumlah) filter (where t.tipe = 'pemasukan'), 0),
    coalesce(sum(t.jumlah) filter (where t.tipe = 'pengeluaran'), 0),
    coalesce(sum(t.jumlah) filter (where t.tipe = 'pemasukan'), 0)
      - coalesce(sum(t.jumlah) filter (where t.tipe = 'pengeluaran'), 0)
  from rentang r
  left join transactions t
    on date_trunc('month', t.tanggal)::date = r.bulan
  group by r.bulan
  order by r.bulan;
$$;

revoke execute on function
  laporan_periode(date, date),
  rekap_kategori(date, date),
  profit_proyek_periode(date, date),
  arus_kas_bulanan(int)
from anon;

-- ---------------------------------------------------------
-- 6. Verifikasi
-- ---------------------------------------------------------
-- select * from dashboard_ringkasan;
-- select * from laporan_periode('2026-01-01','2026-12-31');
-- select * from arus_kas_bulanan(6);
-- Sebagai PM: laporan_periode harus hanya menjumlah transaksi proyeknya.
