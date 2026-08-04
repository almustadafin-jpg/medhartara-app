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
/**
 * Kategori pengeluaran dikelompokkan dua: biaya produksi acara, dan biaya
 * operasional kantor sehari-hari. Pengelompokan ini ikut tampil sebagai
 * optgroup di form, sekaligus membuat rekap laporan lebih mudah dibaca.
 *
 * Kategori disimpan sebagai teks di kolom transactions.kategori — mengubah
 * daftar ini hanya memengaruhi pilihan input berikutnya, tidak menyentuh
 * data lama.
 */
export const KATEGORI_PENGELUARAN_GRUP = [
  {
    grup: 'Produksi / Event',
    item: [
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
    ],
  },
  {
    grup: 'Operasional Kantor',
    item: [
      'ATK & Perlengkapan',
      'Listrik, Air & Internet',
      'Sewa Kantor',
      'Konsumsi & Rumah Tangga',
      'Langganan & Software',
      'Perbaikan & Pemeliharaan',
      'Marketing & Promosi',
      'Biaya Bank & Administrasi',
      'Gaji & Tunjangan',
      'Pajak & Retribusi',
      'Perizinan & Legal',
    ],
  },
  {
    grup: 'Lain-lain',
    item: ['Lainnya'],
  },
] as const

/** Daftar rata (tanpa grup) — untuk validasi atau pemakaian lain. */
export const KATEGORI_PENGELUARAN = KATEGORI_PENGELUARAN_GRUP.flatMap((g) => g.item)

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

/** Pilihan satuan baris BOQ — dropdown pada form. */
export const SATUAN_ITEM = [
  'Paket',
  'Pcs',
  'Unit',
  'Set',
  'Orang',
  'Kegiatan',
  'Hari',
  'Titik',
  'Meter',
  'Roll',
  'Lembar',
  'Ls',
] as const
