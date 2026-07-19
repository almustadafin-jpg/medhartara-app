# Fase 8 — Hardening & QA

Skrip uji RLS otomatis dan checklist QA manual sebelum rilis MVP.

---

## Jebakan yang membuat kebanyakan "uji RLS" tidak berarti

SQL Editor Supabase berjalan sebagai peran `postgres`, yang **melewati seluruh
Row Level Security**. Menjalankan `select * from customers;` di sana lalu melihat
datanya sama sekali tidak membuktikan RLS bekerja — Anda cuma melihat hak
superuser.

Lebih berbahaya lagi kebalikannya: orang menguji "PM tidak bisa menulis pelanggan"
sebagai postgres, perintahnya berhasil, lalu menyimpulkan policy-nya rusak dan
melonggarkannya. Padahal policy-nya benar sejak awal.

`supabase/uji/uji_rls.sql` menghindari keduanya dengan menjalankan
`set local role authenticated` plus menyetel klaim JWT sebelum **setiap** perintah
diuji, sehingga policy benar-benar dievaluasi seperti saat aplikasi berjalan.

---

## Cara menjalankan

1. Pastikan ada pengguna untuk tiap peran. Ambil UUID-nya:

   ```sql
   select id, nama_lengkap, role from users_profile order by role;
   ```

2. Buka `supabase/uji/uji_rls.sql`, isi empat UUID di **Bagian 0**.
   `pm_b` opsional — bila hanya ada satu PM, isi sama dengan `pm_a` dan uji
   kepemilikan lintas-PM otomatis dilewati.

3. Jalankan seluruh berkas di SQL Editor.

4. Baca tabel hasil. Perintah terakhir harus mengembalikan **0**:

   ```sql
   select count(*) as jumlah_gagal from uji.hasil where hasil = 'GAGAL';
   ```

5. Jalankan Bagian 6 (pembersihan) — masih dikomentari agar tidak terhapus
   sebelum Anda sempat membaca hasilnya.

Data uji berawalan `ZZ-UJI` sehingga mudah dikenali bila ada yang tersisa.

---

## Isi pengujian — 32 asersi

Harness `uji.cek()` menerima empat bentuk harapan: `berhasil`, `gagal`,
`kosong`, dan `baris:N`. Perbedaan `gagal` dan `kosong` penting:

- **`gagal`** — perintah ditolak dengan error (policy INSERT, atau trigger)
- **`kosong`** — perintah jalan tapi tidak menyentuh baris apa pun. Inilah yang
  terjadi saat tidak ada policy DELETE: PostgreSQL tidak melempar error, ia hanya
  menghapus nol baris. Menguji ini dengan harapan `gagal` justru akan keliru.

### Project Manager (12 asersi)

| Uji | Harapan |
|---|---|
| Membaca pelanggan | 1 baris |
| Menambah pelanggan | ditolak |
| Menghapus pelanggan | 0 baris (tak ada policy DELETE) |
| Menambah vendor | berhasil |
| Mengubah proyeknya sendiri | berhasil |
| Mengubah proyek PM lain | 0 baris |
| Melihat invoice | 0 baris |
| Mencatat pembayaran | ditolak |
| Mencatat pengeluaran proyeknya | berhasil |
| Mencatat biaya di proyek PM lain | ditolak |
| Mencatat pemasukan | ditolak |
| Melihat audit log | 0 baris |
| Mengubah perannya sendiri | 0 baris |

### Direktur (5 asersi)

Melihat invoice ✓ · membuat invoice ✗ · mengubah pelanggan ✗ ·
menyetujui penawaran terkirim ✓ · **menyetujui penawaran buatannya sendiri ✗**

Yang terakhir menguji *segregation of duties* di trigger, bukan di UI.

### Admin/Finance (13 asersi)

Menambah pelanggan ✓ · menghapus pelanggan ✗ · transisi `draft → disetujui` ✗ ·
transisi `draft → terkirim` ✓ · overpayment ✗ · pembayaran wajar ✓ ·
pembayaran otomatis jadi tepat 1 transaksi ✓ · mengubah transaksi otomatis ✗ ·
menghapus transaksi otomatis ✗ · pengeluaran tanpa kategori ✗ ·
konversi penawaran disetujui ✓ · konversi kedua kali ✗ · PM mengonversi ✗

### Isolasi laporan (1 asersi)

Bagian 4 memanggil `laporan_periode()` sebagai Admin/Finance lalu sebagai PM, dan
membandingkan hasilnya. **Angka PM harus lebih kecil.** Kalau sama, fungsi laporan
bocor melewati RLS dan PM sedang melihat keuangan perusahaan.

Ini uji paling penting di seluruh berkas, karena kebocoran seperti itu tidak
menimbulkan error apa pun — hanya angka yang diam-diam salah.

Serta: `document_sequences` tidak terbaca oleh peran mana pun.

---

## Yang sudah saya verifikasi

- Berkas lolos parser PostgreSQL asli (libpg_query lewat `pglast`)
- **Ke-32 perintah SQL dinamis di dalamnya diekstrak satu per satu dan
  masing-masing diparse ulang** — semuanya valid. Ini penting karena SQL yang
  dirangkai lewat konkatenasi string mudah salah kutip dan baru ketahuan saat
  dijalankan.
- Semua nilai `harapan` yang dipakai dikenali oleh harness (tidak ada salah ketik
  yang membuat asersi diam-diam terlewat)

## Yang tidak bisa saya verifikasi

Skrip ini belum pernah dieksekusi. Tidak ada PostgreSQL di lingkungan kerja saya,
jadi yang terbukti adalah sintaksis dan strukturnya — bukan bahwa policy Anda
benar-benar lolos.

Wajar bila pada percobaan pertama ada satu-dua asersi `GAGAL` karena perbedaan
data. Yang perlu Anda periksa: apakah kegagalannya karena policy memang salah,
atau karena prasyarat data uji tidak terpenuhi. Kolom `keterangan` memuat pesan
error aslinya untuk membedakan keduanya.

---

## Checklist QA manual

Yang tidak tercakup skrip SQL — perlu dijalankan lewat antarmuka.

### Autentikasi & navigasi

- [ ] Login dengan sandi salah → pesan error, tidak masuk
- [ ] Buka `/dashboard` tanpa sesi → dilempar ke `/login`
- [ ] Setelah login, tautan `?next=` mengembalikan ke halaman yang dituju
- [ ] Menu sidebar berbeda untuk tiap peran (PM: 7 item, Admin: 12)
- [ ] PM mengetik `/pengaturan/pengguna` di URL → dilempar ke dashboard
- [ ] Tombol Keluar mengakhiri sesi

### Alur utama end-to-end

- [ ] Buat pelanggan → proyek → penawaran (kode & nomor terisi otomatis)
- [ ] Total penawaran di form sama dengan yang tersimpan setelah disimpan
- [ ] Kirim penawaran tanpa item → ditolak
- [ ] Direktur menyetujui → status berubah, nama & waktu penyetuju tercatat
- [ ] Admin mengonversi → invoice terbentuk dengan item yang sama persis
- [ ] Penawaran otomatis menjadi `dikonversi`
- [ ] Catat pembayaran sebagian → status `sebagian_dibayar`, sisa benar
- [ ] Pelunasan → status `lunas`, sisa nol
- [ ] Pembayaran melebihi sisa → ditolak dengan pesan yang menyebut angka
- [ ] Halaman Pemasukan memuat baris otomatis dari pembayaran tadi
- [ ] Baris itu bertanda gembok dan tidak dapat diubah
- [ ] Profit proyek terbarui di halaman detail proyek

### Bukti transaksi

- [ ] Unggah JPG < 5 MB → berhasil, muncul di daftar
- [ ] Unggah berkas 10 MB → ditolak sebelum terkirim
- [ ] Unggah `.exe` atau `.zip` → ditolak
- [ ] Klik bukti → terbuka lewat URL bertanda tangan
- [ ] Salin URL itu, tunggu > 60 detik, buka lagi → kedaluwarsa
- [ ] **Sebagai PM, coba tebak path bukti perusahaan lain → ditolak**

### PDF & laporan

- [ ] Ekspor PDF penawaran → identitas perusahaan & rekening benar
- [ ] Ekspor PDF invoice → riwayat termin muncul, sisa tagihan benar
- [ ] Unggah logo di Pengaturan → logo muncul di PDF *(belum pernah diuji)*
- [ ] Penawaran dengan 30 item → periksa perilaku halaman kedua
- [ ] PM membuka `/api/invoice/<id>/pdf` langsung → 403
- [ ] Unduh CSV → terbuka rapi di Excel dengan kolom terpisah
- [ ] Isi keterangan transaksi dengan `=1+1`, ekspor, buka di Excel → tampil
      sebagai teks, bukan rumus

### Ketahanan

- [ ] Kirim form dua kali cepat (klik ganda) → tidak ada dokumen kembar
- [ ] Buka dua tab, setujui penawaran yang sama di keduanya → yang kedua ditolak
- [ ] Nonaktifkan pengguna, lalu ia me-refresh halaman → dilempar ke login
- [ ] Ubah tanggal jatuh tempo ke masa lalu → status jadi `jatuh_tempo` di daftar

---

## Sisa pekerjaan yang saya sarankan sebelum produksi

1. **Backup.** Aktifkan Point-in-Time Recovery di Supabase. Semua fase ini
   bertumpu pada satu basis data.
2. **Rate limiting** pada route handler PDF dan CSV — keduanya memakai CPU dan
   saat ini tidak dibatasi.
3. **Rotasi `SUPABASE_SERVICE_ROLE_KEY`** bila kunci itu pernah tertulis di
   riwayat chat, catatan, atau repositori.
4. **Uji beban ringan** pada halaman keuangan dengan ~10.000 transaksi — saat ini
   semua baris ditarik ke klien untuk difilter. Di bawah 10 ribu baris masih
   nyaman sesuai target §1.6, di atas itu perlu paginasi server.
5. **`PERAN_TERSEDIA`** di `app/(dashboard)/pengaturan/pengguna/actions.ts`
   sebaiknya dipindah ke `lib/constants.ts` — konstanta tidak seharusnya diekspor
   dari berkas `'use server'` (lihat `AUDIT-FASE-2.md`).
