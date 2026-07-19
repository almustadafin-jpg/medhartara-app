import { createClient } from '@/lib/supabase/server'
import { wajibIzin } from '@/lib/auth/session'
import { boleh } from '@/lib/auth/permissions'
import { PageHeader } from '@/components/ui/page-header'
import PelangganClient from './pelanggan-client'
import type { Customer } from '@/types'

export const metadata = { title: 'Pelanggan — Medhartara Production' }

export default async function PelangganPage() {
  const profil = await wajibIzin('lihatPelanggan')
  const supabase = await createClient()

  // RLS otomatis membatasi ke company_id pengguna.
  const { data } = await supabase
    .from('customers')
    .select('*')
    .order('nama')

  return (
    <div>
      <PageHeader
        judul="Pelanggan"
        deskripsi="Daftar pelanggan Medhartara Production"
      />
      <PelangganClient
        data={(data as Customer[]) ?? []}
        bisaKelola={boleh(profil.role, 'kelolaPelanggan')}
      />
    </div>
  )
}
