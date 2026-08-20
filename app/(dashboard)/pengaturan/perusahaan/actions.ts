'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { wajibLogin } from '@/lib/auth/session'
import { boleh } from '@/lib/auth/permissions'
import { skemaPerusahaan } from '@/lib/validations/perusahaan'

export type FormState = {
  error?: string
  fieldErrors?: Record<string, string>
  sukses?: boolean
}

export async function simpanPerusahaan(
  _prev: FormState,
  fd: FormData
): Promise<FormState> {
  const profil = await wajibLogin()
  if (!boleh(profil.role, 'ubahPerusahaan')) {
    return { error: 'Anda tidak memiliki izin mengubah identitas perusahaan.' }
  }

  const parsed = skemaPerusahaan.safeParse({
    nama: String(fd.get('nama') ?? ''),
    npwp: String(fd.get('npwp') ?? ''),
    alamat: String(fd.get('alamat') ?? ''),
    telepon: String(fd.get('telepon') ?? ''),
    email: String(fd.get('email') ?? ''),
    bank_nama: String(fd.get('bank_nama') ?? ''),
    bank_rekening: String(fd.get('bank_rekening') ?? ''),
    bank_atas_nama: String(fd.get('bank_atas_nama') ?? ''),
    ttd_nama: String(fd.get('ttd_nama') ?? ''),
    ttd_jabatan: String(fd.get('ttd_jabatan') ?? ''),
  })

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {}
    for (const i of parsed.error.issues) {
      const k = String(i.path[0] ?? '_')
      if (!fieldErrors[k]) fieldErrors[k] = i.message
    }
    return { fieldErrors }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('companies')
    .update(parsed.data)
    .eq('id', profil.company_id!)

  if (error) return { error: 'Gagal menyimpan. Silakan coba lagi.' }

  revalidatePath('/pengaturan/perusahaan')
  return { sukses: true }
}
