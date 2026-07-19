# Menaikkan Aplikasi ke Server

Target: aplikasi berjalan di subdomain Anda sendiri, misalnya
`app.medhartara.id`, dengan kode di GitHub dan hosting di Vercel.

---

## Mengapa bukan hosting bersama Niagahoster

Aplikasi ini **tidak bisa** diubah menjadi kumpulan file statis. Yang
membuatnya begitu:

- setiap form memakai server action
- halaman dirender di server sambil membaca sesi login
- middleware memeriksa autentikasi tiap permintaan
- PDF penawaran, invoice, BOQ, dan kuitansi dirender runtime Node

Semuanya menuntut proses Node yang hidup terus-menerus. Hosting bersama
Niagahoster dirancang untuk PHP; beberapa paket punya "Setup Node.js App"
di cPanel, tapi menjalankan Next.js 15 berikut middleware di atas
Passenger rapuh dan sulit didiagnosis saat gagal.

**Domain Anda tetap dipakai.** Yang berpindah hanya satu data DNS.

---

## 1. Naikkan kode ke GitHub

Repositori Git lokal sudah dibuat dan commit pertama sudah ada.
Sudah diperiksa: `.env.local` **tidak** ikut ter-commit.

Buat repositori **privat** di [github.com/new](https://github.com/new) —
beri nama `medhartara-app`, jangan centang "Add a README". Lalu di
Terminal:

```bash
cd ~/Documents/medhartara-app
git remote add origin https://github.com/<akun-anda>/medhartara-app.git
git branch -M main
git push -u origin main
```

Repositori harus **privat**. Meski kunci tidak ikut, kode ini memuat
struktur keuangan perusahaan Anda.

---

## 2. Hubungkan ke Vercel

1. Masuk ke [vercel.com](https://vercel.com) dengan akun GitHub
2. **Add New → Project**, pilih repositori `medhartara-app`
3. Vercel mengenali Next.js sendiri — jangan ubah pengaturan build
4. Buka bagian **Environment Variables**, isi tiga baris berikut:

| Name | Value | Keterangan |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://gylysujctbrbyahhtzlt.supabase.co` | sama seperti di `.env.local` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key dari Supabase | boleh publik |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key | **rahasia** |

Salin nilainya dari `.env.local` di komputer Anda, atau dari
Supabase → Project Settings → API.

5. **Deploy**. Sekitar 2 menit.

Setelah selesai aplikasi hidup di alamat seperti
`medhartara-app.vercel.app`. Coba login dulu di sana sebelum lanjut.

---

## 3. Pasang subdomain Niagahoster

**Di Vercel:** Project → Settings → Domains → tambahkan
`app.medhartara.id`. Vercel akan menampilkan data DNS yang diminta.

**Di Niagahoster:** panel → Domain → DNS Management → tambah record:

| Type | Name | Value | TTL |
|---|---|---|---|
| CNAME | `app` | `cname.vercel-dns.com` | 3600 |

Ganti `app` sesuai subdomain yang Anda inginkan. Perubahan DNS biasanya
aktif dalam 5–30 menit, kadang sampai beberapa jam.

Sertifikat HTTPS diterbitkan Vercel otomatis begitu DNS terbaca — tidak
perlu membeli SSL.

---

## 4. Sesuaikan Supabase

Supabase → **Authentication → URL Configuration**:

- **Site URL**: `https://app.medhartara.id`
- **Redirect URLs**: tambahkan `https://app.medhartara.id/**`

Belum berpengaruh sekarang karena login memakai email dan kata sandi,
tapi wajib bila kelak dipasang fitur reset kata sandi.

---

## 5. Setelah aktif

Sekali jalan:

- [ ] Login berhasil di alamat baru
- [ ] Dashboard memuat angka, bukan nol semua
- [ ] Ekspor PDF invoice — **pastikan logo muncul**
- [ ] Unggah bukti transaksi lalu buka kembali
- [ ] Buat pelanggan baru, lalu hapus

Poin ketiga penting: `public/` di Vercel dilayani lewat CDN dan tidak
otomatis masuk ke bundel fungsi serverless. Berkas logo sudah dipaksa
ikut lewat `outputFileTracingIncludes` di `next.config.ts`, tapi ini
justru jenis kegagalan yang tidak memunculkan error — logonya sekadar
hilang. Jadi harus dilihat langsung.

---

## Cara memperbarui aplikasi nanti

```bash
cd ~/Documents/medhartara-app
git add -A
git commit -m "penjelasan singkat perubahan"
git push
```

Vercel membangun ulang dan menerbitkannya sendiri, sekitar 2 menit.
Bila hasilnya bermasalah, Vercel menyimpan seluruh versi sebelumnya —
buka Deployments, pilih versi lama, **Promote to Production**.

---

## Biaya

| Komponen | Paket | Biaya |
|---|---|---|
| Vercel | Hobby | gratis |
| Supabase | Free | gratis, batas 500 MB basis data & 1 GB storage |
| Domain | milik Anda | sudah ada |

Untuk satu perusahaan dengan puluhan proyek per tahun, batas gratis
masih sangat longgar. Yang biasanya lebih dulu penuh adalah storage
bukti transaksi, bukan basis datanya.

---

## Sebelum benar-benar dipakai produksi

Tiga hal dari `FASE-8.md` yang belum tersentuh dan sebaiknya dikerjakan:

1. **Aktifkan Point-in-Time Recovery** di Supabase. Seluruh sistem
   bertumpu pada satu basis data, dan paket Free hanya menyimpan backup
   harian terbatas.
2. **Jalankan `supabase/uji/uji_rls.sql`** — 32 asersi keamanan yang
   membuktikan tiap peran hanya melihat yang boleh dilihat. Belum pernah
   dijalankan.
3. **Rotasi `SUPABASE_SERVICE_ROLE_KEY`** bila kunci itu pernah tertulis
   di catatan, riwayat chat, atau tangkapan layar.
