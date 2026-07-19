import { z } from 'zod'

const teksOpsional = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === '' ? undefined : v))

/**
 * Telepon dan email sengaja TIDAK diwajibkan.
 * Banyak pelanggan berupa lembaga yang cukup dicatat namanya lebih dulu,
 * kontaknya menyusul. Format tetap divalidasi bila kolomnya diisi.
 */
export const skemaPelanggan = z
  .object({
    nama: z
      .string()
      .trim()
      .min(3, 'Nama minimal 3 karakter')
      .max(120, 'Nama maksimal 120 karakter'),
    narahubung: teksOpsional,
    telepon: teksOpsional.pipe(
      z
        .string()
        .regex(/^[0-9+\-\s()]{8,20}$/, 'Format telepon tidak valid')
        .optional()
    ),
    email: teksOpsional.pipe(z.string().email('Format email tidak valid').optional()),
    alamat: teksOpsional,
    npwp: teksOpsional,
    catatan: teksOpsional,
  })

export type InputPelanggan = z.infer<typeof skemaPelanggan>
