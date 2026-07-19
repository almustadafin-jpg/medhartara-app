# Medhartara Production — Aplikasi Finansial & Proyek

Implementasi dokumen perencanaan v1.0 — Fase 0 sampai 8.

**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · Supabase · PostgreSQL

---

## 1. Persiapan

```bash
rm -rf node_modules          # hapus sisa instalasi parsial
npm install
cp .env.local.example .env.local
```

Isi `.env.local` dari **Supabase Dashboard → Project Settings → API**:

| Variabel | Sumber | Catatan |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL | boleh publik |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public | boleh publik, dibatasi RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role | **rahasia** — hanya server, jangan di-commit |

## 2. Jalankan migrasi

Supabase Dashboard → **SQL Editor**, jalankan berurutan:

1. `supabase/migrations/0001_schema.sql` — 14 tabel, enum, view profitabilitas, fungsi penomoran atomik, trigger `updated_at`
2. `supabase/migrations/0002_rls.sql` — RLS di semua tabel + helper peran + trigger profil otomatis
3. `supabase/migrations/0003_master_data.sql` — penyesuaian Fase 2: kolom `aktif`/`catatan`/`created_by`, `users_profile.telepon`, unique index nama, dan pencabutan hak DELETE
4. `supabase/migrations/0004_proyek_penawaran.sql` — Fase 3: kode proyek otomatis, hitung ulang total penawaran, state machine status, audit log otomatis
5. `supabase/migrations/0005_invoice_pembayaran.sql` — Fase 4: total invoice, cegah overpayment, status otomatis, view `invoice_ringkas`, fungsi konversi atomik
6. `supabase/migrations/0006_keuangan_bukti.sql` — Fase 5: pemasukan otomatis dari pembayaran, kunci transaksi otomatis, bucket Storage `bukti` + policy
7. `supabase/migrations/0007_dashboard_laporan.sql` — Fase 6: view ringkasan dashboard + fungsi laporan periode (semua `security_invoker`)
8. `supabase/seed.sql` — baris perusahaan

Setelah semua migrasi jalan, uji keamanannya:
`supabase/uji/uji_rls.sql` — 32 asersi RLS otomatis. Panduan: `FASE-8.md`.

> Paket Fase 2 menyertakan `0002_master_data.sql` yang mem-CREATE tabel `customers`
> & `vendors`. **Jangan dijalankan** — kedua tabel sudah ada sejak `0001`.
> Penggantinya adalah `0003_master_data.sql`. Detail: `AUDIT-FASE-2.md`.

## 3. Buat pengguna pertama

Authentication → **Add user** (email + password, centang auto-confirm). Trigger
`handle_new_user` otomatis membuat baris `users_profile` dengan peran `pm`.
Naikkan peran lewat SQL Editor:

```sql
update users_profile set role = 'admin_finance' where id = '<uuid-pengguna>';
```

## 4. Jalankan

```bash
npm run dev        # http://localhost:3000
npm run typecheck  # tsc --noEmit
npm run build
```

---

## Struktur

```
app/
  (auth)/login/         halaman login + server action (login/logout)
  (dashboard)/          layout terproteksi + sidebar
    pelanggan/ vendor/  master data (Fase 2)
    pengaturan/         identitas perusahaan & pengguna
    proyek/             daftar, form, detail + profitabilitas
    penawaran/          editor item, approval, konversi ke invoice
    invoice/            dokumen, termin pembayaran
    keuangan/           pemasukan, pengeluaran, bukti transaksi
    laporan/            laporan periode + filter
    audit/              jejak audit + filter
  api/laporan/          route handler ekspor CSV
  api/penawaran|invoice/[id]/pdf/   ekspor PDF (runtime nodejs)
components/
  layout/               sidebar (filter peran) & header
  ui/                   Button, Field, Tabel, Badge, Modal, PageHeader, KartuMetrik
  pdf/                  template PDF penawaran & invoice
lib/
  format.ts             formatIDR, formatTanggal — locale id-ID
  status.ts             label, warna, dan tabel transisi status
  constants.ts          kategori vendor & pengeluaran, batas unggah
  csv.ts                pembentuk CSV (anti formula injection)
  auth/roles.ts         definisi menu per peran
  auth/permissions.ts   matriks IZIN + boleh()
  auth/session.ts       wajibLogin() / wajibIzin()
  validations/          skema zod tiap modul
  supabase/
    client.ts           browser client (anon)
    server.ts           server client + getProfil()
    admin.ts            service_role — MELEWATI RLS, hanya server
    middleware.ts       penyegaran sesi + proteksi rute
supabase/migrations/    0001–0007
supabase/uji/            uji_rls.sql — harness pengujian RLS
types/                  database.ts (enum & tabel) + index.ts (entitas)
```

### Pola tiap modul

```
page.tsx          Server Component — ambil data, cek izin
xxx-client.tsx    Client Component — tabel, filter, modal
xxx-form.tsx      Client Component — form + useActionState
actions.ts        Server Action — validasi zod, cek izin ulang, tulis ke DB
```

## Model keamanan

Wewenang ditegakkan **dua lapis**:

1. **UI** — `menuUntuk(peran)` menyembunyikan menu; `middleware.ts` menolak sesi kosong.
2. **RLS PostgreSQL** — penegak sesungguhnya. Default *deny*; setiap tabel punya policy eksplisit.

Helper RLS (`auth_role()`, `auth_company_id()`, `is_pm_of()`) memakai `SECURITY DEFINER`
agar tidak rekursif saat policy membaca `users_profile`.

Ringkasan policy:

| Tabel | Direktur | Admin/Finance | PM |
|---|---|---|---|
| customers | lihat | penuh | lihat |
| vendors | lihat | penuh | penuh |
| projects | penuh | penuh | hanya `pm_id = auth.uid()` |
| quotations | lihat + setujui | penuh | proyeknya, hanya saat `draft` |
| invoices, payments | lihat | penuh | tanpa akses |
| transactions | lihat | penuh | insert pengeluaran proyeknya |
| audit_logs | lihat | lihat | tanpa akses |
| document_sequences | — | — | — (tertutup, hanya lewat fungsi) |

Segregation of duties: policy `quotations_approve` hanya mengizinkan Direktur
mengubah status `terkirim → disetujui/ditolak`, dan pembuat tidak dapat menyetujui.

## Sudah diverifikasi

- `tsc --noEmit` bersih
- `next build` sukses — 25 rute + middleware
- Semua migrasi lolos parser PostgreSQL asli (libpg_query via pglast)
- Tabel transisi status di `lib/status.ts` diuji identik dengan trigger SQL
- Next dipin ke 15.5.20 (versi 15.1.6 punya CVE-2025-66478)

## Status fase

| Fase | Isi | Status |
|---|---|---|
| 0 | Fondasi: Next.js, Tailwind v4, Supabase | selesai |
| 1 | Auth, RLS dasar, layout & menu per peran | selesai |
| 2 | Master data: pelanggan, vendor, perusahaan, pengguna | selesai — lihat `AUDIT-FASE-2.md` |
| 3 | Proyek & penawaran: penomoran otomatis, item, approval | selesai — lihat `FASE-3.md` |
| 4 | Invoice, konversi penawaran, pembayaran multi-termin | selesai — lihat `FASE-4.md` |
| 5 | Pemasukan/pengeluaran + unggah bukti transaksi | selesai — lihat `FASE-5.md` |
| 6 | Dashboard keuangan, laporan periode, ekspor CSV | selesai — lihat `FASE-6.md` |
| 7 | Ekspor PDF penawaran/invoice + halaman audit log | selesai — lihat `FASE-7.md` |
| 8 | Hardening: skrip uji RLS + checklist QA | skrip siap — lihat `FASE-8.md` |
