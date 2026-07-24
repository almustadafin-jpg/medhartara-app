import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { wajibIzin } from '@/lib/auth/session'
import { PageHeader } from '@/components/ui/page-header'
import PenggunaClient from './pengguna-client'
import type { UsersProfile } from '@/types'

export const metadata = { title: 'Pengguna & Peran — Medhartara Production' }

export default async function PenggunaPage() {
  const profil = await wajibIzin('kelolaPengguna')
  const supabase = await createClient()

  const { data } = await supabase
    .from('users_profile')
    .select('*')
    .order('created_at')

  // Email tinggal di auth.users, bukan users_profile. Karena izin
  // kelolaPengguna sudah diverifikasi wajibIzin di atas, aman memakai
  // admin client untuk memetakan id → email.
  const emailPer: Record<string, string> = {}
  try {
    const admin = createAdminClient()
    const { data: daftar } = await admin.auth.admin.listUsers({ perPage: 1000 })
    for (const u of daftar?.users ?? []) {
      if (u.email) emailPer[u.id] = u.email
    }
  } catch {
    // service_role belum diset — tabel tetap tampil tanpa kolom email.
  }

  return (
    <div>
      <PageHeader
        judul="Pengguna & Peran"
        deskripsi="Kelola akun dan hak akses tim"
      />
      <PenggunaClient
        data={(data as UsersProfile[]) ?? []}
        emailPer={emailPer}
        idSaya={profil.id}
      />
    </div>
  )
}
