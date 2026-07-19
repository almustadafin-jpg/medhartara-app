/** Saran kategori vendor untuk event organizer & video production. */
export const KATEGORI_VENDOR = [
  'Katering',
  'Sewa Alat',
  'Dekorasi',
  'Kru Freelance',
  'Venue',
  'Dokumentasi',
  'Sound System',
  'Lighting',
  'Percetakan',
  'Transportasi',
  'Talent / Pengisi Acara',
  'Lainnya',
] as const

export type KategoriVendor = (typeof KATEGORI_VENDOR)[number]

/** Kategori pengeluaran — event organizer & video production. */
export const KATEGORI_PENGELUARAN = [
  'Katering',
  'Sewa Alat',
  'Dekorasi',
  'Venue',
  'Kru Freelance',
  'Talent',
  'Dokumentasi',
  'Audio',
  'Lighting',
  'Percetakan',
  'Transportasi',
  'Akomodasi',
  'Operasional Kantor',
  'Gaji & Tunjangan',
  'Pajak & Retribusi',
  'Lainnya',
] as const

/** Kategori pemasukan di luar pembayaran invoice. */
export const KATEGORI_PEMASUKAN = [
  'Pembayaran Invoice',
  'Uang Muka',
  'Pendapatan Lain',
  'Pengembalian Dana',
] as const

export const UKURAN_MAKS_BUKTI = 5 * 1024 * 1024
export const TIPE_BUKTI_DIIZINKAN = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']

/**
 * Daftar peran untuk dropdown manajemen pengguna.
 *
 * Diletakkan di sini, BUKAN di dalam berkas `'use server'`.
 * Next.js mensyaratkan berkas server action hanya mengekspor fungsi
 * async; mengekspor objek dari sana memicu error runtime
 * "A use server file can only export async functions, found object".
 */
export const PERAN_TERSEDIA = [
  { nilai: 'direktur', label: 'Direktur' },
  { nilai: 'admin_finance', label: 'Admin/Finance' },
  { nilai: 'pm', label: 'Project Manager' },
] as const

/** Kategori baris BOQ — dipakai sebagai pengelompokan di dokumen. */
export const KATEGORI_ITEM = [
  'Equipment Rent',
  'Man Power',
  'Set & Properti',
  'Venue',
  'Katering',
  'Transportasi',
  'Akomodasi',
  'Talent',
  'Pasca Produksi',
  'Perizinan',
  'Lain-lain',
] as const
