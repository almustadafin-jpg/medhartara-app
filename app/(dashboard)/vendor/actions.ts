'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { wajibLogin } from '@/lib/auth/session'
import { boleh } from '@/lib/auth/permissions'
import { pesanGagalHapus, pesanTakTerhapus } from "@/lib/hapus";
import { skemaVendor } from '@/lib/validations/vendor'

export type FormState = {
  error?: string
  fieldErrors?: Record<string, string>
  sukses?: boolean
}

export async function simpanVendor(
  _prev: FormState,
  fd: FormData
): Promise<FormState> {
  const profil = await wajibLogin()
  if (!boleh(profil.role, 'kelolaVendor')) {
    return { error: 'Anda tidak memiliki izin mengelola vendor.' }
  }

  const parsed = skemaVendor.safeParse({
    nama: String(fd.get('nama') ?? ''),
    kategori: String(fd.get('kategori') ?? ''),
    narahubung: String(fd.get('narahubung') ?? ''),
    telepon: String(fd.get('telepon') ?? ''),
    email: String(fd.get('email') ?? ''),
    alamat: String(fd.get('alamat') ?? ''),
    bank_nama: String(fd.get('bank_nama') ?? ''),
    bank_rekening: String(fd.get('bank_rekening') ?? ''),
    bank_atas_nama: String(fd.get('bank_atas_nama') ?? ''),
    catatan: String(fd.get('catatan') ?? ''),
  })

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {}
    for (const i of parsed.error.issues) {
      const k = String(i.path[0] ?? '_')
      if (!fieldErrors[k]) fieldErrors[k] = i.message
    }
    return { fieldErrors }
  }

  const id = String(fd.get('id') ?? '')
  const supabase = await createClient()
  const payload = { ...parsed.data, company_id: profil.company_id }

  const { error } = id
    ? await supabase.from('vendors').update(payload).eq('id', id)
    : await supabase.from('vendors').insert({ ...payload, created_by: profil.id })

  if (error) {
    if (error.code === '23505') {
      return { fieldErrors: { nama: 'Nama vendor sudah terdaftar.' } }
    }
    return { error: 'Gagal menyimpan data. Silakan coba lagi.' }
  }

  revalidatePath('/vendor')
  return { sukses: true }
}

export async function ubahStatusVendor(id: string, aktif: boolean) {
  const profil = await wajibLogin()
  if (!boleh(profil.role, 'kelolaVendor')) throw new Error('Tanpa izin')

  const supabase = await createClient()
  await supabase.from('vendors').update({ aktif }).eq('id', id)
  revalidatePath('/vendor')
}

export async function hapusVendor(id: string) {
  const profil = await wajibLogin();
  if (!boleh(profil.role, "kelolaVendor")) {
    return { error: "Anda tidak memiliki izin menghapus vendor." };
  }

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("vendors")
    .delete({ count: "exact" })
    .eq("id", id);

  if (error) return { error: pesanGagalHapus(error.code, error.message, "Vendor") };
  if (!count) {
    return {
      error: pesanTakTerhapus("Vendor", "Anda tidak berwenang atas vendor ini."),
    };
  }

  revalidatePath("/vendor");
  return { sukses: true };
}
