import { createClient } from '@/lib/supabase/server'
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

  return (
    <div>
      <PageHeader
        judul="Pengguna & Peran"
        deskripsi="Kelola akun dan hak akses tim"
      />
      <PenggunaClient data={(data as UsersProfile[]) ?? []} idSaya={profil.id} />
    </div>
  )
}
