# Fase 7 — Ekspor PDF & Audit Log

Ekspor penawaran/invoice ke PDF dengan identitas perusahaan, dan halaman jejak audit.

---

## Pilihan pustaka PDF: penyimpangan yang disengaja

Dokumen perencanaan (§0 asumsi 7) menyebut *"PDF dibuat di sisi server memakai
template HTML → PDF"*. Pendekatan itu berarti menjalankan Chromium headless
(Puppeteer/Playwright). Di Vercel, itu menuntut paket `@sparticuz/chromium` sekitar
50 MB, mendekati batas ukuran fungsi serverless, dan menambah cold start beberapa
detik untuk setiap unduhan.

Saya memakai **`@react-pdf/renderer`**: JavaScript murni, tanpa peramban, ukuran
kecil, dan hasilnya deterministik. Trade-off yang perlu Anda tahu:

| | HTML → PDF (Chromium) | @react-pdf/renderer (dipakai) |
|---|---|---|
| Tata letak | CSS penuh | subset flexbox |
| Ukuran deployment | ~50 MB | ~2 MB |
| Cold start | beberapa detik | tidak terasa |
| Template | HTML biasa | komponen React khusus |

Konsekuensinya: template PDF adalah berkas terpisah (`components/pdf/dokumen-pdf.tsx`),
bukan halaman detail yang di-*print*. Kalau tata letak halaman berubah, PDF-nya
perlu disesuaikan terpisah. Bila nanti Anda butuh tata letak CSS yang rumit,
inilah titik yang harus ditinjau ulang.

Font bawaan Helvetica sudah memuat seluruh karakter yang dibutuhkan bahasa
Indonesia, jadi tidak perlu memuat font tambahan.

---

## Satu template, dua dokumen

`DokumenPDF` menerima objek `DataDokumenPDF` dan menyesuaikan diri: penawaran
menampilkan "Berlaku hingga" dan blok persetujuan; invoice menampilkan "Jatuh
tempo", sudah dibayar, sisa tagihan, dan riwayat termin.

Route handler mengambil data lewat client biasa, jadi **RLS ikut menentukan** —
penawaran yang tidak boleh dilihat pengguna akan kembali kosong dan menghasilkan
404, bukan PDF. Izin juga dicek eksplisit sebelum query.

Keduanya memakai `runtime = "nodejs"` karena `@react-pdf/renderer` butuh API Node.

---

## Audit log

Tabel `audit_logs` diisi trigger sejak Fase 3–5. Halaman `/audit` menampilkan 300
catatan terakhir dengan filter aksi dan entitas.

Kolom `data_lama`/`data_baru` berupa jsonb; fungsi `ringkas()` menerjemahkannya jadi
kalimat pendek — misalnya `QT-2026-0001 · terkirim → disetujui`, atau
`Rp 104.500.000 · pemasukan`.

Yang membuatnya bermakna: tabel ini **tidak punya policy INSERT, UPDATE, maupun
DELETE** untuk pengguna. Satu-satunya penulis adalah trigger `SECURITY DEFINER`.
Pengguna, termasuk Admin/Finance, tidak dapat menyunting atau menghapus jejaknya
sendiri.

---

## Rute baru

| Rute | Isi |
|---|---|
| `/audit` | Jejak audit + filter |
| `/api/penawaran/[id]/pdf` | PDF penawaran (inline) |
| `/api/invoice/[id]/pdf` | PDF invoice (inline) |

Tombol **Ekspor PDF** ditambahkan di halaman detail penawaran dan invoice.

---

## Yang sudah diverifikasi — kali ini dieksekusi sungguhan

Berbeda dari fase-fase sebelumnya yang terbatas pada analisis statis, PDF dapat
dijalankan di lingkungan kerja saya. Jadi saya benar-benar merendernya:

- Dua PDF contoh dibangkitkan dari data nyata (penawaran QT-2026-0001 dan invoice
  INV-2026-0001 dengan dua termin)
- Berkas diverifikasi: header `%PDF-`, 4,5 KB dan 4,8 KB, render dua dokumen 250 ms
- **Teksnya diekstrak ulang dengan `pypdf` dan diperiksa** — format Rupiah
  (`Rp 210.900.000`), tanggal Indonesia (`20 Mei 2026`), rincian bank, dan penomoran
  halaman semuanya benar
- Bug yang tertangkap dari uji ini: invoice awalnya tumpah ke **halaman kedua** hanya
  untuk satu baris rekening bank. Jarak antarbagian dirapatkan dan blok penutup
  dibungkus `wrap={false}`; sekarang keduanya muat satu halaman. Tanpa merender
  sungguhan, ini tidak akan ketahuan.
- `tsc --noEmit` bersih; `next build` sukses — **25 rute**

Berkas contohnya saya sertakan: `contoh-penawaran.pdf` dan `contoh-invoice.pdf`.

## Yang belum diverifikasi

- **Logo perusahaan** belum diuji. `Image` di react-pdf perlu URL yang dapat diakses
  server; kalau logo disimpan di bucket privat, URL bertanda tangan harus dibuat
  dulu di route handler. Uji setelah mengunggah logo di Pengaturan.
- Perilaku dokumen dengan banyak item (>25 baris) belum dicoba — header tabel tidak
  otomatis diulang di halaman berikutnya.
- Seperti sebelumnya, RLS pada route PDF baru terbukti setelah dijalankan di
  Supabase. Uji: minta PM membuka `/api/invoice/<id>/pdf` — harus 403.

---

## Status keseluruhan

Fase 0–7 selesai. Yang tersisa dari rencana awal adalah **Fase 8 — Hardening**:
uji RLS menyeluruh per peran, penanganan edge case, dan QA sebelum rilis MVP.

Ini fase yang paling tidak bisa saya kerjakan sendiri, karena intinya menjalankan
aplikasi terhadap PostgreSQL sungguhan. Yang bisa saya siapkan: skrip uji RLS
lengkap yang tinggal Anda jalankan di SQL Editor.
