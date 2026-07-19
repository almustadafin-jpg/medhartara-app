import { z } from 'zod'

const teksOpsional = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === '' ? undefined : v))

export const skemaVendor = z.object({
  nama: z.string().trim().min(3, 'Nama minimal 3 karakter').max(120),
  kategori: z.string().trim().min(1, 'Kategori wajib dipilih'),
  narahubung: teksOpsional,
  telepon: teksOpsional.pipe(
    z.string().regex(/^[0-9+\-\s()]{8,20}$/, 'Format telepon tidak valid').optional()
  ),
  email: teksOpsional.pipe(z.string().email('Format email tidak valid').optional()),
  alamat: teksOpsional,
  bank_nama: teksOpsional,
  bank_rekening: teksOpsional,
  bank_atas_nama: teksOpsional,
  catatan: teksOpsional,
})

export type InputVendor = z.infer<typeof skemaVendor>
