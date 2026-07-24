'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { wajibLogin } from '@/lib/auth/session'
import { boleh } from '@/lib/auth/permissions'
import { skemaPenggunaBaru, skemaPenggunaUbah } from '@/lib/validations/pengguna'

export type FormState = {
  error?: string
  fieldErrors?: Record<string, string>
  sukses?: boolean
}

function petakan(issues: { path: (string | number)[]; message: string }[]) {
  const f: Record<string, string> = {}
  for (const i of issues) {
    const k = String(i.path[0] ?? '_')
    if (!f[k]) f[k] = i.message
  }
  return f
}

/**
 * Membuat pengguna baru.
 * Memakai service_role karena pembuatan akun auth memerlukan hak admin.
 * Izin diverifikasi manual DULU sebelum client admin dipakai.
 */
export async function buatPengguna(
  _prev: FormState,
  fd: FormData
): Promise<FormState> {
  const profil = await wajibLogin()
  if (!boleh(profil.role, 'kelolaPengguna')) {
    return { error: 'Hanya Admin/Finance yang dapat membuat pengguna.' }
  }

  const parsed = skemaPenggunaBaru.safeParse({
    email: String(fd.get('email') ?? ''),
    password: String(fd.get('password') ?? ''),
    nama_lengkap: String(fd.get('nama_lengkap') ?? ''),
    role: String(fd.get('role') ?? 'pm'),
    telepon: String(fd.get('telepon') ?? ''),
  })

  if (!parsed.success) return { fieldErrors: petakan(parsed.error.issues) }

  const admin = createAdminClient()

  // Trigger handle_new_user() akan membaca metadata ini
  // untuk membuat baris users_profile secara otomatis.
  const { error } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: {
      nama_lengkap: parsed.data.nama_lengkap,
      role: parsed.data.role,
    },
  })

  if (error) {
    if (error.message.toLowerCase().includes('already')) {
      return { fieldErrors: { email: 'Email sudah terdaftar.' } }
    }
    return { error: 'Gagal membuat pengguna. Silakan coba lagi.' }
  }

  revalidatePath('/pengaturan/pengguna')
  return { sukses: true }
}

/** Mengubah nama, peran, telepon, dan status aktif pengguna. */
export async function ubahPengguna(
  _prev: FormState,
  fd: FormData
): Promise<FormState> {
  const profil = await wajibLogin()
  if (!boleh(profil.role, 'kelolaPengguna')) {
    return { error: 'Tanpa izin.' }
  }

  const parsed = skemaPenggunaUbah.safeParse({
    id: String(fd.get('id') ?? ''),
    nama_lengkap: String(fd.get('nama_lengkap') ?? ''),
    role: String(fd.get('role') ?? 'pm'),
    telepon: String(fd.get('telepon') ?? ''),
    aktif: fd.get('aktif') === 'on',
  })

  if (!parsed.success) return { fieldErrors: petakan(parsed.error.issues) }

  // Cegah pengguna menonaktifkan atau menurunkan perannya sendiri
  // — mencegah situasi terkunci tanpa Admin/Finance.
  if (parsed.data.id === profil.id) {
    if (!parsed.data.aktif) {
      return { error: 'Anda tidak dapat menonaktifkan akun sendiri.' }
    }
    if (parsed.data.role !== profil.role) {
      return { error: 'Anda tidak dapat mengubah peran akun sendiri.' }
    }
  }

  const supabase = await createClient()
  const { id, ...payload } = parsed.data
  const { error } = await supabase
    .from('users_profile')
    .update(payload)
    .eq('id', id)

  if (error) return { error: 'Gagal menyimpan perubahan.' }

  revalidatePath('/pengaturan/pengguna')
  return { sukses: true }
}

/** Reset kata sandi pengguna oleh Admin/Finance. */
export async function resetKataSandi(
  id: string,
  passwordBaru: string,
): Promise<{ error?: string; sukses?: boolean }> {
  const profil = await wajibLogin()
  if (!boleh(profil.role, 'kelolaPengguna')) {
    return { error: 'Hanya Admin/Finance yang dapat mengatur ulang kata sandi.' }
  }
  if (passwordBaru.length < 8) {
    return { error: 'Kata sandi minimal 8 karakter.' }
  }
  if (!/[A-Za-z]/.test(passwordBaru) || !/[0-9]/.test(passwordBaru)) {
    return { error: 'Kata sandi harus memuat huruf dan angka.' }
  }

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.updateUserById(id, {
    password: passwordBaru,
  })
  if (error) return { error: 'Gagal mengatur ulang kata sandi.' }

  revalidatePath('/pengaturan/pengguna')
  return { sukses: true }
}

/**
 * Menghapus pengguna.
 *
 * Menghapus akun auth; baris users_profile ikut terhapus lewat cascade.
 * Bila pengguna itu pernah membuat, menyetujui, atau tercatat di dokumen
 * mana pun, foreign key pada users_profile menolak — dan itu benar:
 * jejak siapa-melakukan-apa tidak boleh hilang. Dalam hal itu, arahkan
 * ke penonaktifan, bukan pemaksaan hapus.
 */
export async function hapusPengguna(
  id: string,
): Promise<{ error?: string; sukses?: boolean }> {
  const profil = await wajibLogin()
  if (!boleh(profil.role, 'kelolaPengguna')) {
    return { error: 'Hanya Admin/Finance yang dapat menghapus pengguna.' }
  }
  if (id === profil.id) {
    return { error: 'Anda tidak dapat menghapus akun sendiri.' }
  }

  const supabase = await createClient()

  // Cegah menghapus Admin/Finance terakhir yang masih aktif —
  // tanpa itu tidak ada lagi yang bisa mengelola pengguna.
  const { data: sasaran } = await supabase
    .from('users_profile')
    .select('role')
    .eq('id', id)
    .maybeSingle()

  if (sasaran?.role === 'admin_finance') {
    const { count } = await supabase
      .from('users_profile')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'admin_finance')
      .eq('aktif', true)
    if ((count ?? 0) <= 1) {
      return {
        error:
          'Ini satu-satunya Admin/Finance yang aktif. Tambahkan Admin/Finance lain sebelum menghapus akun ini.',
      }
    }
  }

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.deleteUser(id)

  if (error) {
    // Kegagalan paling mungkin: FK dari dokumen yang pernah ia buat.
    return {
      error:
        'Tidak dapat menghapus — pengguna ini kemungkinan sudah membuat atau menyetujui dokumen. Nonaktifkan akunnya saja agar riwayat tetap utuh.',
    }
  }

  revalidatePath('/pengaturan/pengguna')
  return { sukses: true }
}
