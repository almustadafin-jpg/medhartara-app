'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { simpanVendor, type FormState } from './actions'
import { Field, Input, Textarea, Select } from '@/components/ui/field'
import { Button, TombolSimpan } from '@/components/ui/button'
import { KATEGORI_VENDOR } from '@/lib/constants'
import type { Vendor } from '@/types'

export default function VendorForm({
  vendor,
  onSelesai,
}: {
  vendor?: Vendor
  onSelesai?: () => void
}) {
  const router = useRouter()
  const [state, formAction] = useActionState<FormState, FormData>(simpanVendor, {})

  useEffect(() => {
    if (state.sukses) {
      onSelesai?.()
      router.refresh()
    }
  }, [state.sukses, onSelesai, router])

  const e = state.fieldErrors ?? {}

  return (
    <form action={formAction} className="space-y-4">
      {vendor && <input type="hidden" name="id" value={vendor.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nama Vendor" name="nama" wajib error={e.nama}>
          <Input id="nama" name="nama" defaultValue={vendor?.nama ?? ''} error={!!e.nama} />
        </Field>

        <Field label="Kategori" name="kategori" wajib error={e.kategori}>
          <Select id="kategori" name="kategori" defaultValue={vendor?.kategori ?? ''} error={!!e.kategori}>
            <option value="">— Pilih kategori —</option>
            {KATEGORI_VENDOR.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="Narahubung" name="narahubung" error={e.narahubung}>
        <Input id="narahubung" name="narahubung" defaultValue={vendor?.narahubung ?? ''} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Telepon" name="telepon" error={e.telepon}>
          <Input id="telepon" name="telepon" defaultValue={vendor?.telepon ?? ''} error={!!e.telepon} />
        </Field>
        <Field label="Email" name="email" error={e.email}>
          <Input id="email" name="email" type="email" defaultValue={vendor?.email ?? ''} error={!!e.email} />
        </Field>
      </div>

      <Field label="Alamat" name="alamat" error={e.alamat}>
        <Textarea id="alamat" name="alamat" defaultValue={vendor?.alamat ?? ''} />
      </Field>

      <div className="rounded-lg border border-slate-200 p-4">
        <p className="mb-3 text-sm font-medium text-slate-700">Rekening Pembayaran</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Bank" name="bank_nama" error={e.bank_nama}>
            <Input id="bank_nama" name="bank_nama" defaultValue={vendor?.bank_nama ?? ''} placeholder="BCA" />
          </Field>
          <Field label="No. Rekening" name="bank_rekening" error={e.bank_rekening}>
            <Input id="bank_rekening" name="bank_rekening" defaultValue={vendor?.bank_rekening ?? ''} />
          </Field>
          <Field label="Atas Nama" name="bank_atas_nama" error={e.bank_atas_nama}>
            <Input id="bank_atas_nama" name="bank_atas_nama" defaultValue={vendor?.bank_atas_nama ?? ''} />
          </Field>
        </div>
      </div>

      <Field label="Catatan" name="catatan" error={e.catatan}>
        <Textarea id="catatan" name="catatan" defaultValue={vendor?.catatan ?? ''} />
      </Field>

      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
        {onSelesai && (
          <Button type="button" varian="sekunder" onClick={onSelesai}>Batal</Button>
        )}
        <TombolSimpan />
      </div>
    </form>
  )
}
