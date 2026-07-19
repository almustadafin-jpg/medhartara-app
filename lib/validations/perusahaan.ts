import { z } from 'zod'

const teksOpsional = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === '' ? undefined : v))

export const skemaPerusahaan = z.object({
  nama: z.string().trim().min(3, 'Nama perusahaan wajib diisi').max(120),
  npwp: teksOpsional,
  alamat: teksOpsional,
  telepon: teksOpsional,
  email: teksOpsional.pipe(z.string().email('Format email tidak valid').optional()),
  bank_nama: teksOpsional,
  bank_rekening: teksOpsional,
  bank_atas_nama: teksOpsional,
})

export type InputPerusahaan = z.infer<typeof skemaPerusahaan>
