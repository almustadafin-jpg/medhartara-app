'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { wajibLogin } from '@/lib/auth/session'
import { boleh } from '@/lib/auth/permissions'
import { pesanGagalHapus, pesanTakTerhapus } from "@/lib/hapus";
import { skemaPelanggan } from '@/lib/validations/pelanggan'

export type FormState = {
  error?: string
  fieldErrors?: Record<string, string>
  sukses?: boolean
}

function bacaForm(fd: FormData) {
  return {
    nama: String(fd.get('nama') ?? ''),
    narahubung: String(fd.get('narahubung') ?? ''),
    telepon: String(fd.get('telepon') ?? ''),
    email: String(fd.get('email') ?? ''),
    alamat: String(fd.get('alamat') ?? ''),
    npwp: String(fd.get('npwp') ?? ''),
    catatan: String(fd.get('catatan') ?? ''),
  }
}

function petakanError(issues: { path: (string | number)[]; message: string }[]) {
  const fieldErrors: Record<string, string> = {}
  for (const i of issues) {
    const key = String(i.path[0] ?? '_')
    if (!fieldErrors[key]) fieldErrors[key] = i.message
  }
  return fieldErrors
}

export async function simpanPelanggan(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const profil = await wajibLogin()
  if (!boleh(profil.role, 'kelolaPelanggan')) {
    return { error: 'Anda tidak memiliki izin mengelola pelanggan.' }
  }

  const parsed = skemaPelanggan.safeParse(bacaForm(formData))
  if (!parsed.success) {
    return { fieldErrors: petakanError(parsed.error.issues) }
  }

  const id = String(formData.get('id') ?? '')
  const supabase = await createClient()

  const payload = {
    ...parsed.data,
    company_id: profil.company_id,
  }

  const { error } = id
    ? await supabase.from('customers').update(payload).eq('id', id)
    : await supabase
        .from('customers')
        .insert({ ...payload, created_by: profil.id })

  if (error) {
    // 23505 = pelanggaran unique constraint
    if (error.code === '23505') {
      return { fieldErrors: { nama: 'Nama pelanggan sudah terdaftar.' } }
    }
    return { error: 'Gagal menyimpan data. Silakan coba lagi.' }
  }

  revalidatePath('/pelanggan')
  return { sukses: true }
}

export async function ubahStatusPelanggan(id: string, aktif: boolean) {
  const profil = await wajibLogin()
  if (!boleh(profil.role, 'kelolaPelanggan')) {
    throw new Error('Tanpa izin')
  }

  const supabase = await createClient()
  // Soft delete — data historis (proyek, invoice) tetap utuh.
  await supabase.from('customers').update({ aktif }).eq('id', id)
  revalidatePath('/pelanggan')
}

export async function hapusPelanggan(id: string) {
  const profil = await wajibLogin();
  if (!boleh(profil.role, "kelolaPelanggan")) {
    return { error: "Anda tidak memiliki izin menghapus pelanggan." };
  }

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("customers")
    .delete({ count: "exact" })
    .eq("id", id);

  if (error) return { error: pesanGagalHapus(error.code, error.message, "Pelanggan") };
  if (!count) {
    return {
      error: pesanTakTerhapus("Pelanggan", "Hanya Admin/Finance yang berwenang."),
    };
  }

  revalidatePath("/pelanggan");
  return { sukses: true };
}
