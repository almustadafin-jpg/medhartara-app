# Fase 5 — Keuangan & Bukti Transaksi

Pencatatan pemasukan/pengeluaran, kaitan ke proyek & vendor, unggah bukti ke
Supabase Storage, dan profitabilitas per proyek.

---

## Pembayaran invoice otomatis jadi pemasukan

Tanpa ini, Admin/Finance harus mencatat dua kali: sekali sebagai pembayaran
invoice, sekali lagi sebagai pemasukan kas. Dua entri manual untuk satu kejadian
selalu berakhir tidak sinkron.

Trigger `catat_pemasukan_dari_pembayaran` membuat satu baris `transactions`
setiap kali pembayaran tercatat, lengkap dengan `project_id` yang diwarisi dari
invoice — sehingga profitabilitas proyek langsung ikut terbarui.

**Pencegahan hitung ganda** ada di dua lapis:

1. Kolom `payment_id` dengan **unique index parsial** — satu pembayaran hanya
   bisa punya satu transaksi
2. `on conflict (payment_id) do update` — bila pembayaran diperbarui, transaksinya
   ikut diperbarui, bukan ditambah baris baru

**Transaksi otomatis dikunci.** Trigger `jaga_transaksi` menolak upaya mengubah
jumlah/tipe/tanggal atau menghapus baris yang punya `payment_id`, dengan pesan
yang mengarahkan: *"Ubah data pembayarannya, bukan transaksinya."* Di tabel,
baris seperti ini ditandai ikon gembok dan tombol ubahnya disembunyikan.

Sumber kebenaran tetap satu: tabel `payments`.

---

## Bukti transaksi: berkas tidak lewat server

Berkas diunggah langsung dari browser ke Supabase Storage. Server hanya mencatat
metadatanya. Alasannya: berkas 5 MB tidak perlu singgah di server action, dan
policy Storage sudah cukup untuk membatasi akses.

**Kunci keamanannya ada di struktur path:**

```
<company_id>/transaction/<transaksi_id>/<timestamp>-<nama_berkas>
```

Policy memeriksa `(storage.foldername(name))[1] = auth_company_id()::text` —
folder pertama harus sama dengan perusahaan penggunanya. Path apa pun di luar itu
ditolak saat unggah maupun baca.

| Operasi | Siapa |
|---|---|
| Baca | siapa pun di perusahaan itu |
| Unggah | siapa pun di perusahaan itu, `owner` harus dirinya sendiri |
| Hapus | pengunggahnya, atau Admin/Finance |
| **Timpa** | **tidak ada policy — berkas bukti tidak dapat ditimpa** |

Bucket bersifat privat. Menampilkan bukti memakai *signed URL* berumur 60 detik,
dibuat lewat server action — bukan URL publik permanen.

Batas: JPG/PNG/WEBP/PDF, maksimal 5 MB. Ditegakkan di bucket (`file_size_limit`,
`allowed_mime_types`) **dan** dicek di klien supaya pesannya cepat muncul.

---

## Wewenang

| Aksi | Direktur | Admin/Finance | PM |
|---|:--:|:--:|:--:|
| Lihat pemasukan | ✅ | ✅ | — |
| Catat pemasukan | — | ✅ | — |
| Lihat pengeluaran | ✅ | ✅ | proyeknya |
| Catat pengeluaran | — | ✅ | proyeknya |
| Unggah bukti | ✅ | ✅ | ✅ |
| Hapus bukti | pengunggah | ✅ | pengunggah |

Bagi PM, pilihan proyek di form pengeluaran sudah disaring hanya ke proyek yang ia
pegang, dan field-nya wajib diisi — RLS akan menolak kalau dipaksakan lewat jalur
lain.

---

## Rute & tampilan baru

| Rute | Isi |
|---|---|
| `/keuangan/pemasukan` | Daftar + filter kategori + total |
| `/keuangan/pengeluaran` | Idem, plus kolom vendor |

Halaman **detail proyek** kini menampilkan kartu Pemasukan / Pengeluaran / Profit
dengan margin, serta tabel biaya proyek. Angkanya dari view `project_profitability`
(dibuat sejak Fase 0), bukan dihitung di aplikasi.

Ditambahkan juga view `rekap_kas_bulanan` untuk dipakai dashboard di Fase 6.

---

## Yang sudah diverifikasi

- `tsc --noEmit` bersih; `next build` sukses
- Keenam migrasi lolos parser PostgreSQL asli (libpg_query lewat `pglast`)
- Simulasi hitung ganda: dua pembayaran dijalankan dua kali lewat aturan trigger →
  tetap menghasilkan tepat dua baris transaksi
- Path Storage yang dibuat klien dicocokkan otomatis dengan predikat policy SQL —
  folder pertama memang `company_id`
- Perhitungan profit diuji: 154.500.000 − 96.500.000 = 58.000.000 (margin 37,5%)

## Yang belum diverifikasi

Seperti fase sebelumnya, PL/pgSQL dan policy Storage belum dieksekusi — tidak ada
PostgreSQL di lingkungan kerja saya. Uji wajib setelah migrasi:

```sql
-- 1. Pemasukan otomatis
insert into payments (company_id, invoice_id, jumlah, tanggal)
values ('<company>', '<invoice-terkirim>', 1000000, current_date);
select count(*) from transactions where payment_id is not null;  -- harus 1

-- 2. Kunci transaksi otomatis → harus gagal
update transactions set jumlah = 1 where payment_id is not null;
delete from transactions where payment_id is not null;

-- 3. Pengeluaran tanpa kategori → harus gagal
insert into transactions (company_id, tipe, jumlah, tanggal)
values ('<company>', 'pengeluaran', 50000, current_date);
```

Untuk Storage, uji dari aplikasi: unggah bukti sebagai PM, lalu coba buka berkas
milik perusahaan lain lewat path tebakan — harus ditolak.

---

## Berikutnya — Fase 6

Dashboard keuangan (saldo, piutang, jatuh tempo, arus kas bulanan) dan laporan
periode yang dapat diekspor.
