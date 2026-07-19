import { createClient } from '@/lib/supabase/server'
import { wajibIzin } from '@/lib/auth/session'
import { PageHeader } from '@/components/ui/page-header'
import PerusahaanForm from './perusahaan-form'
import type { Company } from '@/types'

export const metadata = { title: 'Identitas Perusahaan — Medhartara Production' }

export default async function PerusahaanPage() {
  const profil = await wajibIzin('ubahPerusahaan')
  const supabase = await createClient()

  const { data } = await supabase
    .from('companies')
    .select('*')
    .eq('id', profil.company_id!)
    .single()

  if (!data) {
    return <p className="text-sm text-red-600">Data perusahaan tidak ditemukan.</p>
  }

  return (
    <div>
      <PageHeader
        judul="Identitas Perusahaan"
        deskripsi="Data ini muncul pada penawaran dan invoice"
      />
      <PerusahaanForm data={data as Company} />
    </div>
  )
}
