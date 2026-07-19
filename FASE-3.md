# Fase 3 — Proyek & Penawaran

Modul proyek (CRUD + detail) dan penawaran (editor item dinamis + alur persetujuan).

---

## Keputusan utama: aturan bisnis diletakkan di database

Penawaran menyangkut uang, jadi tiga hal ini **tidak dititipkan ke aplikasi**.
Semuanya ditegakkan trigger di `0004_proyek_penawaran.sql`:

**1. Total dihitung ulang oleh database.**
Form menampilkan pratinjau total saat mengetik, tapi angka itu tidak pernah dikirim
ke server. Trigger `trg_quotation_items_total` menghitung ulang `subtotal` dan
`total` dari baris item setiap kali item berubah, dan `trg_quotations_total`
mengulanginya saat persentase diskon/pajak berubah. Manipulasi form tidak dapat
mengubah nilai tersimpan.

Urutan perhitungan: `subtotal → dikurangi diskon% → hasilnya ditambah pajak%`.
Pajak dihitung dari nilai **setelah** diskon.

**2. Transisi status dijaga state machine.**
`jaga_transisi_quotation()` menolak lompatan tidak sah — `draft` tidak bisa
langsung jadi `disetujui`, dokumen `dikonversi` tidak bisa dibuka lagi.

```
draft ──→ terkirim ──→ disetujui ──→ dikonversi
  │           │  ↑          └──→ arsip
  │           ↓  │
  └──→ arsip  ditolak ──→ arsip
              └──→ draft
```

Syarat tambahan sebelum `terkirim`: minimal satu item dan total > 0.

**3. Pembuat tidak bisa menyetujui pekerjaannya sendiri.**
Dicek di trigger dengan membandingkan `created_by` dan `auth.uid()`. UI juga
menonaktifkan tombolnya dan menjelaskan alasannya, tapi database yang menolak.

**4. Audit log ditulis trigger.**
`catat_audit_quotation()` mencatat create/update/approve beserta status dan total
sebelum–sesudah. Karena ditulis trigger, pengguna tidak dapat memalsukan atau
melewatinya.

---

## Penomoran dokumen

`QT-2026-0001` dibuat fungsi `next_document_number()` dari Fase 0 — upsert atomik
ke `document_sequences`, jadi dua permintaan bersamaan tidak menghasilkan nomor
kembar. Kode proyek `PRJ-2026-0001` diisi trigger `isi_kode_proyek` saat insert.

Tabel `document_sequences` sengaja **tidak punya policy RLS sama sekali** —
tertutup total untuk klien. Satu-satunya jalan masuk adalah fungsi
`SECURITY DEFINER` tersebut.

---

## Rute baru

| Rute | Isi |
|---|---|
| `/proyek` | Daftar + filter status + pencarian |
| `/proyek/[id]` | Detail, penawaran terkait, nilai disetujui |
| `/penawaran` | Daftar + filter status + total tersaring |
| `/penawaran/baru` | Editor item dinamis |
| `/penawaran/[id]` | Tampilan dokumen + tombol aksi sesuai peran |
| `/penawaran/[id]/ubah` | Sunting — hanya untuk status `draft` |

---

## Wewenang

| Aksi | Direktur | Admin/Finance | PM |
|---|:--:|:--:|:--:|
| Lihat proyek | ✅ | ✅ | ✅ |
| Buat/ubah proyek | ✅ | ✅ | hanya proyeknya |
| Buat/ubah penawaran | — | ✅ | proyeknya, status draft |
| Kirim ke pelanggan | — | ✅ | ✅ |
| Setujui / tolak | ✅ | — | — |

PM yang membuat proyek otomatis ditugaskan sebagai penanggung jawab — form tidak
menawarkan pilihan PM lain, dan server action memaksa `pm_id = profil.id`.

---

## Yang sudah diverifikasi

- `tsc --noEmit` bersih; `next build` sukses, 14 rute
- Keempat migrasi lolos parser PostgreSQL asli (libpg_query lewat `pglast`)
- Tabel transisi di `lib/status.ts` diuji **identik** dengan `case` di trigger SQL —
  keduanya diekstrak lalu dibandingkan otomatis, supaya UI tidak menawarkan aksi
  yang akan ditolak database
- Rumus total diuji pada lima kasus termasuk pecahan persen dan pembulatan

## Yang belum diverifikasi

Badan PL/pgSQL tidak dapat dieksekusi di sini — tidak ada PostgreSQL di lingkungan
kerja saya. Trigger baru terbukti benar setelah dijalankan di Supabase. Uji minimal
setelah migrasi:

```sql
-- Transisi terlarang → harus gagal
update quotations set status = 'disetujui' where status = 'draft';

-- Kirim tanpa item → harus gagal
update quotations set status = 'terkirim' where id = '<id-tanpa-item>';

-- Hitung ulang → total harus berubah sendiri
insert into quotation_items (quotation_id, deskripsi, kuantitas, harga_satuan)
values ('<id>', 'Uji', 2, 5000000);
select subtotal, total from quotations where id = '<id>';
```

---

## Berikutnya — Fase 4

Konversi penawaran `disetujui` → invoice, pembayaran multi-termin, status invoice
otomatis dari total dibayar vs jatuh tempo, dan pencegahan overpayment.
