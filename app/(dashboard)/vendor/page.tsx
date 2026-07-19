import { createClient } from '@/lib/supabase/server'
import { wajibIzin } from '@/lib/auth/session'
import { boleh } from '@/lib/auth/permissions'
import { PageHeader } from '@/components/ui/page-header'
import VendorClient from './vendor-client'
import type { Vendor } from '@/types'

export const metadata = { title: 'Vendor — Medhartara Production' }

export default async function VendorPage() {
  const profil = await wajibIzin('kelolaVendor')
  const supabase = await createClient()

  const { data } = await supabase.from('vendors').select('*').order('nama')

  return (
    <div>
      <PageHeader judul="Vendor" deskripsi="Daftar vendor dan pemasok" />
      <VendorClient
        data={(data as Vendor[]) ?? []}
        bisaKelola={boleh(profil.role, 'kelolaVendor')}
      />
    </div>
  )
}
