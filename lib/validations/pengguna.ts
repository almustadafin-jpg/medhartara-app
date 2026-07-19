import { z } from 'zod'

export const skemaPenggunaBaru = z.object({
  email: z.string().trim().email('Format email tidak valid'),
  password: z
    .string()
    .min(8, 'Kata sandi minimal 8 karakter')
    .regex(/[A-Za-z]/, 'Kata sandi harus memuat huruf')
    .regex(/[0-9]/, 'Kata sandi harus memuat angka'),
  nama_lengkap: z.string().trim().min(3, 'Nama lengkap minimal 3 karakter'),
  role: z.enum(['direktur', 'admin_finance', 'pm']),
  telepon: z.string().trim().optional(),
})

export const skemaPenggunaUbah = z.object({
  id: z.string().uuid(),
  nama_lengkap: z.string().trim().min(3, 'Nama lengkap minimal 3 karakter'),
  role: z.enum(['direktur', 'admin_finance', 'pm']),
  telepon: z.string().trim().optional(),
  aktif: z.boolean(),
})

export type InputPenggunaBaru = z.infer<typeof skemaPenggunaBaru>
export type InputPenggunaUbah = z.infer<typeof skemaPenggunaUbah>
