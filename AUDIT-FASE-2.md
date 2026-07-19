# Hasil Audit Fase 2 — Master Data

Metode: paket Fase 2 diintegrasikan ke proyek Fase 1, lalu dikompilasi.
Hasil akhir: **`tsc --noEmit` bersih, `next build` sukses, 8 rute.**

---

## Temuan utama

Paket Fase 2 dibuat terhadap **Fase 1 versi lain** — bukan yang ada di repo ini.
Kalau disalin apa adanya, tidak akan jalan. Enam ketidakcocokan:

| # | Masalah | Dampak | Tindakan |
|---|---|---|---|
| 1 | `0002_master_data.sql` mem-**CREATE** `customers` & `vendors` | Kedua tabel sudah dibuat di `0001_schema.sql` → migrasi gagal / tabel ganda | Ditulis ulang jadi `0003_master_data.sql` berbasis `ALTER`. **Jangan jalankan `0002_master_data.sql` asli** |
| 2 | Memakai helper `auth_company()` & `is_admin_finance()` | Fungsi itu tidak ada; nama di repo ini `auth_company_id()` & `auth_role()` | Diselaraskan di `0003` |
| 3 | Impor `@/lib/auth/session`, `@/lib/auth/permissions`, `@/lib/utils`, `@/types` | Keempat modul tidak ada → build gagal | Ditulis: `wajibLogin`/`wajibIzin`, matriks `IZIN` + `boleh()`, `cn()`, dan `types/index.ts` |
| 4 | Menulis kolom `users_profile.telepon` | Kolom tidak ada → error runtime saat menyimpan pengguna (terdeteksi typecheck) | Kolom ditambahkan di `0003` + tipe TS |
| 5 | Butuh `lucide-react`, `clsx`, `tailwind-merge` | Tidak ada di `package.json` | Ditambahkan (`lucide-react` 1.25.0) |
| 6 | Halaman Fase 2 memakai `PageHeader`, bukan `Header` Fase 1 | Halaman baru tanpa profil & tombol Keluar | `Header` dipindah ke `(dashboard)/layout.tsx`; halaman cukup pakai `PageHeader` |

---

## Temuan keamanan

**Policy `for all` di Fase 1 mengizinkan DELETE.** Fase 2 merancang larangan hard
delete total (soft delete lewat kolom `aktif`), tapi policy `customers_write` /
`vendors_write` milik `0002_rls.sql` memakai `for all` — yang mencakup DELETE.
Niat desain tidak tercapai.

`0003_master_data.sql` menghapus kedua policy itu dan menggantinya dengan
INSERT + UPDATE terpisah. Setelah migrasi, tidak ada policy DELETE sama sekali
pada `customers` dan `vendors`.

Verifikasi setelah migrasi:

```sql
select policyname, cmd from pg_policies
where tablename in ('customers','vendors') order by tablename, cmd;
-- Harapan: hanya SELECT, INSERT, UPDATE.
```

---

## Yang sudah benar di paket Fase 2

- **Izin diperiksa dua kali** — di `page.tsx` (`wajibIzin`) dan lagi di dalam setiap
  server action. Tidak mengandalkan UI menyembunyikan tombol.
- **Urutan pada modul pengguna** — `boleh(profil.role, 'kelolaPengguna')` dicek
  **sebelum** `createAdminClient()` dipanggil, jadi service_role tidak pernah
  tersentuh oleh pemanggil tanpa izin.
- **Anti-kunci-diri-sendiri** — tidak bisa menonaktifkan akun sendiri maupun
  mengubah peran sendiri.
- **Penanganan `23505`** — pelanggaran unique constraint diterjemahkan jadi pesan
  "Nama sudah terdaftar", bukan error mentah.
- **Unique index parsial `where aktif`** — nama unik hanya di antara yang aktif,
  sehingga pelanggan nonaktif tidak memblokir pendaftaran nama serupa.
- **Validasi berlapis** — HTML `required` → Zod di server → constraint database.

---

## Catatan kecil (belum diubah)

1. **`PERAN_TERSEDIA` diekspor dari file `'use server'`.** Aturan Next: file
   `'use server'` sebaiknya hanya mengekspor fungsi async. Pada Next 15.5 ini
   masih lolos build (sudah saya uji, termasuk saat diimpor komponen klien),
   tapi lebih aman dipindah ke `lib/constants.ts`. Saat ini konstanta itu tidak
   dipakai di mana pun.
2. **`ubahStatusPelanggan` / `ubahStatusVendor` dipanggil langsung dari `onClick`.**
   Bila izin ditolak, action `throw` dan menjadi unhandled rejection — pengguna
   tidak melihat pesan apa pun. Sebaiknya dibungkus `try/catch` atau diubah jadi
   `useTransition` dengan state error.
3. **Penurunan peran Admin/Finance terakhir masih mungkin** — Admin A bisa
   menurunkan Admin B, lalu B menurunkan A tidak bisa (guard diri sendiri aktif),
   tapi dengan dua admin, A bisa menurunkan B sampai tersisa satu. Aman secara
   praktis; bila ingin ketat, tambahkan pengecekan "minimal satu admin_finance aktif".

---

## Urutan migrasi (final)

```
0001_schema.sql        skema penuh 14 tabel
0002_rls.sql           RLS + helper peran
0003_master_data.sql   penyesuaian Fase 2  ← baru
```

`0002_master_data.sql` dari paket Fase 2 **tidak dipakai**.

---

## Uji manual yang masih perlu dijalankan

Kompilasi tidak membuktikan RLS. Setelah migrasi, jalankan Uji C dari dokumen
Fase 2 di SQL Editor — simulasikan sesi PM, lalu coba `insert into customers`
dan `delete from customers`. Keduanya harus gagal.
