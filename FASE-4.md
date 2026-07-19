# Fase 4 — Invoice & Pembayaran

Konversi penawaran → invoice, pembayaran multi-termin, status otomatis, dan
pencegahan overpayment.

---

## Konversi dilakukan satu fungsi atomik

Menerbitkan invoice dari penawaran melibatkan lima langkah: ambil nomor,
buat invoice, salin semua item, hitung total, ubah status penawaran jadi
`dikonversi`. Kalau dikerjakan berurutan dari aplikasi, kegagalan di tengah
meninggalkan invoice tanpa item atau penawaran yang statusnya sudah berubah
padahal invoicenya gagal dibuat.

Karena itu semuanya masuk ke satu fungsi database,
`konversi_penawaran_ke_invoice()` — satu transaksi, tidak mungkin setengah jadi.

Fungsi ini `SECURITY DEFINER` (perlu, karena menyentuh `document_sequences` yang
tertutup RLS), jadi empat pemeriksaan dipasang eksplisit di dalamnya:

1. Peran pemanggil harus `admin_finance`
2. Penawaran harus milik perusahaan pemanggil
3. Status penawaran harus `disetujui`
4. Penawaran belum pernah dikonversi

Tanpa keempatnya, `SECURITY DEFINER` akan menjadi lubang yang melewati semua RLS.

---

## Overpayment ditolak database

Trigger `jaga_pembayaran` berjalan **sebelum** setiap insert/update pembayaran:

- Invoice `draft` atau `batal` tidak boleh menerima pembayaran
- Total pembayaran tidak boleh melebihi total invoice
- Nomor termin diisi otomatis (`max + 1`) bila kosong

Toleransi `0.005` dipakai agar pembulatan `numeric(15,2)` tidak menolak pelunasan
yang selisihnya nol koma sekian sen.

Pesan errornya sudah diformat untuk pengguna, mis. *"Pembayaran melebihi sisa
tagihan. Sisa: 56.400.000,00, diminta: 60.000.000,00"* — server action meneruskan
pesan itu apa adanya ke form.

---

## Status invoice: sebagian disimpan, sebagian dihitung

Ini keputusan yang perlu dijelaskan.

**Disimpan di kolom `status`:** `draft`, `terkirim`, `sebagian_dibayar`, `lunas`,
`batal`. Diperbarui trigger `segarkan_status_invoice` setiap kali pembayaran
berubah.

**Tidak disimpan:** `jatuh_tempo`. Status ini bergantung pada tanggal hari ini —
kalau disimpan, ia langsung basi keesokan harinya dan butuh cron untuk menyegarkan.

Solusinya view `invoice_ringkas`, yang menambahkan tiga kolom turunan:

| Kolom | Isi |
|---|---|
| `total_dibayar` | jumlah seluruh pembayaran |
| `sisa_tagihan` | `total − dibayar`, minimal 0 |
| `status_efektif` | status tersimpan, ditambah `jatuh_tempo` bila lewat tanggal |

Aplikasi membaca view ini, bukan tabel mentah. View memakai `security_invoker`,
jadi RLS tetap berlaku seperti biasa.

---

## Rute baru

| Rute | Isi |
|---|---|
| `/invoice` | Daftar + filter status efektif + total sisa piutang |
| `/invoice/baru` | Invoice manual (di luar alur penawaran) |
| `/invoice/[id]` | Dokumen, riwayat termin, tombol aksi |
| `/invoice/[id]/ubah` | Sunting — hanya status `draft` |

Tombol **Konversi ke Invoice** muncul di halaman penawaran berstatus `disetujui`
untuk Admin/Finance, dan langsung mengarahkan ke invoice yang baru dibuat.

---

## Wewenang

| Aksi | Direktur | Admin/Finance | PM |
|---|:--:|:--:|:--:|
| Lihat invoice | ✅ | ✅ | — |
| Buat/ubah invoice | — | ✅ | — |
| Terbitkan / batalkan | — | ✅ | — |
| Catat pembayaran | — | ✅ | — |
| Konversi penawaran | — | ✅ | — |

---

## Yang sudah diverifikasi

- `tsc --noEmit` bersih; `next build` sukses, **18 rute**
- Kelima migrasi lolos parser PostgreSQL asli (libpg_query lewat `pglast`)
- `TRANSISI_INVOICE` di `lib/status.ts` diuji **identik** dengan `case` di trigger
  `jaga_transisi_invoice` — diekstrak dari kedua berkas lalu dibandingkan otomatis
- Aturan pembayaran diuji pada lima skenario: pembayaran pertama, pelunasan termin
  kedua, bayar saat sudah lunas, kelebihan satu rupiah, dan bayar ke invoice draft.
  Semuanya menghasilkan keputusan yang diharapkan.

## Yang belum diverifikasi

Uji di atas menjalankan **port aturannya** ke Python, bukan trigger PostgreSQL
sungguhan — tidak ada PostgreSQL di lingkungan kerja saya. Yang terbukti adalah
aturannya koheren; bahwa PL/pgSQL-nya berjalan benar baru terbukti di Supabase.

Uji wajib setelah migrasi:

```sql
-- 1. Overpayment → harus gagal
insert into payments (company_id, invoice_id, jumlah)
select company_id, id, total + 1 from invoices where status = 'terkirim' limit 1;

-- 2. Konversi ganda → percobaan kedua harus gagal
select konversi_penawaran_ke_invoice('<id-penawaran-disetujui>');
select konversi_penawaran_ke_invoice('<id-penawaran-yang-sama>');

-- 3. Konversi oleh non-admin → harus gagal
--    (jalankan sebagai sesi PM)

-- 4. Status otomatis
insert into payments (...);  -- sebagian → status jadi 'sebagian_dibayar'
insert into payments (...);  -- pelunasan → status jadi 'lunas'
```

---

## Berikutnya — Fase 5

Pencatatan pemasukan & pengeluaran, kaitan ke proyek dan vendor, serta unggah
bukti transaksi ke Supabase Storage.
