'use client'

import { useActionState } from 'react'
import { simpanPerusahaan, type FormState } from './actions'
import { Field, Input, Textarea } from '@/components/ui/field'
import { TombolSimpan } from '@/components/ui/button'
import type { Company } from '@/types'

export default function PerusahaanForm({ data }: { data: Company }) {
  const [state, formAction] = useActionState<FormState, FormData>(
    simpanPerusahaan,
    {}
  )
  const e = state.fieldErrors ?? {}

  return (
    <form action={formAction} className="max-w-2xl space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">Identitas</h2>
        <div className="space-y-4">
          <Field label="Nama Perusahaan" name="nama" wajib error={e.nama}>
            <Input id="nama" name="nama" defaultValue={data.nama} error={!!e.nama} />
          </Field>

          <Field label="NPWP" name="npwp" error={e.npwp}>
            <Input id="npwp" name="npwp" defaultValue={data.npwp ?? ''} />
          </Field>

          <Field label="Alamat" name="alamat" error={e.alamat}>
            <Textarea id="alamat" name="alamat" defaultValue={data.alamat ?? ''} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Telepon" name="telepon" error={e.telepon}>
              <Input id="telepon" name="telepon" defaultValue={data.telepon ?? ''} />
            </Field>
            <Field label="Email" name="email" error={e.email}>
              <Input id="email" name="email" type="email" defaultValue={data.email ?? ''} error={!!e.email} />
            </Field>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-slate-900">Rekening Penerimaan</h2>
        <p className="mb-4 mt-1 text-xs text-slate-500">
          Ditampilkan pada penawaran dan invoice.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Bank" name="bank_nama" error={e.bank_nama}>
            <Input id="bank_nama" name="bank_nama" defaultValue={data.bank_nama ?? ''} placeholder="BCA" />
          </Field>
          <Field label="No. Rekening" name="bank_rekening" error={e.bank_rekening}>
            <Input id="bank_rekening" name="bank_rekening" defaultValue={data.bank_rekening ?? ''} />
          </Field>
          <Field label="Atas Nama" name="bank_atas_nama" error={e.bank_atas_nama}>
            <Input id="bank_atas_nama" name="bank_atas_nama" defaultValue={data.bank_atas_nama ?? ''} />
          </Field>
        </div>
      </section>

      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
      {state.sukses && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Perubahan tersimpan.
        </p>
      )}

      <div className="flex justify-end">
        <TombolSimpan />
      </div>
    </form>
  )
}
