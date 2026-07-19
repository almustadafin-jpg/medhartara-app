'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { simpanPelanggan, type FormState } from './actions'
import { Field, Input, Textarea } from '@/components/ui/field'
import { Button, TombolSimpan } from '@/components/ui/button'
import type { Customer } from '@/types'

export default function PelangganForm({
  pelanggan,
  onSelesai,
}: {
  pelanggan?: Customer
  onSelesai?: () => void
}) {
  const router = useRouter()
  const [state, formAction] = useActionState<FormState, FormData>(
    simpanPelanggan,
    {}
  )

  useEffect(() => {
    if (state.sukses) {
      onSelesai?.()
      router.refresh()
    }
  }, [state.sukses, onSelesai, router])

  const e = state.fieldErrors ?? {}

  return (
    <form action={formAction} className="space-y-4">
      {pelanggan && <input type="hidden" name="id" value={pelanggan.id} />}

      <Field label="Nama Pelanggan" name="nama" wajib error={e.nama}>
        <Input
          id="nama"
          name="nama"
          defaultValue={pelanggan?.nama ?? ''}
          error={!!e.nama}
          placeholder="PT Contoh Sejahtera"
        />
      </Field>

      <Field label="Narahubung" name="narahubung" error={e.narahubung}>
        <Input
          id="narahubung"
          name="narahubung"
          defaultValue={pelanggan?.narahubung ?? ''}
          placeholder="Nama orang yang dihubungi"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Telepon"
          name="telepon"
          error={e.telepon}
          petunjuk="Boleh dikosongkan"
        >
          <Input
            id="telepon"
            name="telepon"
            defaultValue={pelanggan?.telepon ?? ''}
            error={!!e.telepon}
            placeholder="0812xxxxxxx"
          />
        </Field>

        <Field label="Email" name="email" error={e.email}>
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={pelanggan?.email ?? ''}
            error={!!e.email}
            placeholder="kontak@contoh.com"
          />
        </Field>
      </div>

      <Field label="Alamat" name="alamat" error={e.alamat}>
        <Textarea id="alamat" name="alamat" defaultValue={pelanggan?.alamat ?? ''} />
      </Field>

      <Field label="NPWP" name="npwp" error={e.npwp}>
        <Input id="npwp" name="npwp" defaultValue={pelanggan?.npwp ?? ''} />
      </Field>

      <Field label="Catatan" name="catatan" error={e.catatan}>
        <Textarea id="catatan" name="catatan" defaultValue={pelanggan?.catatan ?? ''} />
      </Field>

      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
        {onSelesai && (
          <Button type="button" varian="sekunder" onClick={onSelesai}>
            Batal
          </Button>
        )}
        <TombolSimpan />
      </div>
    </form>
  )
}
