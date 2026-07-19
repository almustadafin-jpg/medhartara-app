# Fase 6 — Dashboard & Laporan

Dashboard keuangan per peran, laporan periode, dan ekspor CSV.

---

## Agregasi dikerjakan database, bukan aplikasi

Dashboard butuh tujuh angka: saldo, pemasukan, pengeluaran, piutang, invoice jatuh
tempo, proyek berjalan, penawaran menunggu. Kalau dihitung di aplikasi, artinya
menarik seluruh tabel transaksi dan invoice ke memori hanya untuk menjumlahkannya.

Semuanya jadi view `dashboard_ringkasan` — satu baris, satu query.

Empat fungsi tambahan untuk laporan:

| Fungsi | Guna |
|---|---|
| `laporan_periode(dari, sampai)` | total pemasukan, pengeluaran, laba, jumlah transaksi |
| `rekap_kategori(dari, sampai)` | pengelompokan per kategori |
| `profit_proyek_periode(dari, sampai)` | profit per proyek **dalam rentang** |
| `arus_kas_bulanan(n)` | data grafik n bulan terakhir |

**Semuanya `SECURITY INVOKER`** — kebalikan dari fungsi konversi di Fase 4. Di sini
justru itu yang diinginkan: RLS tetap berlaku, jadi PM yang memanggil
`laporan_periode` hanya menjumlahkan transaksi proyeknya sendiri. Tidak perlu
logika pemfilteran terpisah di aplikasi.

`arus_kas_bulanan` memakai `generate_series` supaya bulan tanpa transaksi tetap
muncul sebagai nol — tanpa itu, grafik akan bolong dan menyesatkan.

Catatan: `profit_proyek_periode` berbeda dari view `project_profitability`. View
menghitung seluruh riwayat proyek; fungsi ini dibatasi rentang tanggal laporan.
Keduanya dipakai di tempat berbeda dan memang bisa berbeda hasilnya.

---

## Dashboard bercabang per peran

Direktur & Admin/Finance melihat saldo perusahaan, piutang, grafik arus kas,
profitabilitas semua proyek, dan aktivitas terakhir dari audit log.

PM mendapat halaman berbeda — bukan versi yang sebagian disembunyikan, tapi query
yang memang berbeda: jumlah proyeknya, total biaya proyeknya, profit proyeknya.
Saldo kas perusahaan tidak pernah diambil. Ini sesuai §3.1 dokumen perencanaan
(`***` PM hanya melihat metrik proyeknya).

Grafik arus kas dirender di server sebagai div berskala — tidak ada pustaka chart,
tidak ada tambahan JavaScript ke klien.

---

## Ekspor CSV: dua jebakan yang ditangani

Ekspor lewat route handler `/api/laporan`, memakai client biasa sehingga RLS ikut
memfilter — file yang diunduh PM hanya berisi transaksi yang boleh ia lihat.

**1. Excel Indonesia memakai titik koma, bukan koma.**
CSV dengan pemisah koma akan tampil menumpuk di satu kolom pada Excel berlokal
id-ID. Berkas diawali baris `sep=;` yang memberi tahu Excel secara eksplisit,
ditambah BOM UTF-8 supaya karakter beraksen tidak rusak.

**2. Formula injection.**
Sel yang diawali `=`, `+`, `-`, atau `@` dieksekusi Excel sebagai rumus. Nama
vendor atau keterangan transaksi berisi `=cmd|'/c calc'!A1` bisa menjalankan
perintah di komputer penerima. Sel seperti itu diberi awalan kutip tunggal.

Efek samping yang perlu diketahui: angka negatif akan ikut diperlakukan sebagai
teks. Untuk laporan ini tidak masalah — kolom jumlah selalu positif, arah
transaksi ditentukan kolom Tipe.

---

## Rute baru

| Rute | Isi |
|---|---|
| `/dashboard` | Dirombak: KPI, grafik, piutang, profitabilitas, aktivitas |
| `/laporan` | Filter periode + pintasan, rekap kategori, profit per proyek |
| `/api/laporan` | Unduh CSV (GET, parameter `dari` & `sampai`) |

---

## Yang sudah diverifikasi

- `tsc --noEmit` bersih; `next build` sukses — **22 rute**
- Ketujuh migrasi lolos parser PostgreSQL asli (libpg_query lewat `pglast`)
- Escaping CSV diuji tujuh kasus: teks biasa, formula injection, angka berawalan
  minus, titik koma, kutip ganda, baris baru, dan sel kosong — **7/7 lulus**
- Berkas hasil dicek mengandung BOM UTF-8 dan petunjuk `sep=;`
- Regex pengaman di berkas uji dicocokkan dengan yang ada di `lib/csv.ts`

## Yang belum diverifikasi

View dan fungsi agregat belum dieksekusi — tidak ada PostgreSQL di lingkungan
kerja saya. Uji setelah migrasi:

```sql
-- Angka dashboard
select * from dashboard_ringkasan;

-- Laporan setahun
select * from laporan_periode('2026-01-01','2026-12-31');

-- Grafik: harus mengembalikan 6 baris, termasuk bulan kosong
select * from arus_kas_bulanan(6);
```

Yang paling penting: **jalankan `laporan_periode` sebagai sesi PM.** Hasilnya harus
lebih kecil daripada saat dijalankan Admin/Finance. Kalau sama, `security_invoker`
tidak bekerja seperti yang diharapkan dan PM sedang melihat angka perusahaan.

Catatan kinerja: halaman keuangan berukuran ~184 kB first load karena memuat
pustaka Supabase di browser untuk unggah berkas langsung. Halaman lain ~105–120 kB.

---

## Berikutnya — Fase 7

Ekspor PDF penawaran & invoice memakai identitas perusahaan, dan halaman audit log.
