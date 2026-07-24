'use client'

import { useActionState, useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, KeyRound } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Button, TombolSimpan } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Field, Input, Select } from '@/components/ui/field'
import { Tabel, Thead, Th, Td, Tr, KondisiKosong } from '@/components/ui/table'
import { TombolHapus } from '@/components/ui/tombol-hapus'
import { buatPengguna, ubahPengguna, hapusPengguna, resetKataSandi, type FormState } from './actions'
import { LABEL_PERAN, type UsersProfile } from '@/types'
import { formatTanggal } from '@/lib/format'

const PERAN = [
  { nilai: 'direktur', label: 'Direktur' },
  { nilai: 'admin_finance', label: 'Admin/Finance' },
  { nilai: 'pm', label: 'Project Manager' },
]

function FormBaru({ onSelesai }: { onSelesai: () => void }) {
  const router = useRouter()
  const [state, action] = useActionState<FormState, FormData>(buatPengguna, {})
  useEffect(() => {
    if (state.sukses) { onSelesai(); router.refresh() }
  }, [state.sukses, onSelesai, router])

  const e = state.fieldErrors ?? {}

  return (
    <form action={action} className="space-y-4">
      <Field label="Nama Lengkap" name="nama_lengkap" wajib error={e.nama_lengkap}>
        <Input id="nama_lengkap" name="nama_lengkap" error={!!e.nama_lengkap} />
      </Field>

      <Field label="Email" name="email" wajib error={e.email}>
        <Input id="email" name="email" type="email" error={!!e.email} />
      </Field>

      <Field
        label="Kata Sandi"
        name="password"
        wajib
        error={e.password}
        petunjuk="Minimal 8 karakter, memuat huruf dan angka"
      >
        <Input id="password" name="password" type="password" error={!!e.password} />
      </Field>

      <Field label="Peran" name="role" wajib error={e.role}>
        <Select id="role" name="role" defaultValue="pm">
          {PERAN.map((p) => (
            <option key={p.nilai} value={p.nilai}>{p.label}</option>
          ))}
        </Select>
      </Field>

      <Field label="Telepon" name="telepon" error={e.telepon}>
        <Input id="telepon" name="telepon" />
      </Field>

      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
        <Button type="button" varian="sekunder" onClick={onSelesai}>Batal</Button>
        <TombolSimpan label="Buat Pengguna" />
      </div>
    </form>
  )
}

function FormUbah({ pengguna, onSelesai }: { pengguna: UsersProfile; onSelesai: () => void }) {
  const router = useRouter()
  const [state, action] = useActionState<FormState, FormData>(ubahPengguna, {})
  useEffect(() => {
    if (state.sukses) { onSelesai(); router.refresh() }
  }, [state.sukses, onSelesai, router])

  const e = state.fieldErrors ?? {}

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={pengguna.id} />

      <Field label="Nama Lengkap" name="nama_lengkap" wajib error={e.nama_lengkap}>
        <Input id="nama_lengkap" name="nama_lengkap" defaultValue={pengguna.nama_lengkap} error={!!e.nama_lengkap} />
      </Field>

      <Field label="Peran" name="role" wajib error={e.role}>
        <Select id="role" name="role" defaultValue={pengguna.role}>
          {PERAN.map((p) => (
            <option key={p.nilai} value={p.nilai}>{p.label}</option>
          ))}
        </Select>
      </Field>

      <Field label="Telepon" name="telepon" error={e.telepon}>
        <Input id="telepon" name="telepon" defaultValue={pengguna.telepon ?? ''} />
      </Field>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" name="aktif" defaultChecked={pengguna.aktif} className="rounded border-slate-300" />
        Akun aktif
      </label>

      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
        <Button type="button" varian="sekunder" onClick={onSelesai}>Batal</Button>
        <TombolSimpan />
      </div>
    </form>
  )
}

function FormReset({ pengguna, onSelesai }: { pengguna: UsersProfile; onSelesai: () => void }) {
  const router = useRouter()
  const [pending, mulai] = useTransition()
  const [error, setError] = useState<string>()
  const [sandi, setSandi] = useState('')

  function jalankan() {
    setError(undefined)
    mulai(async () => {
      const hasil = await resetKataSandi(pengguna.id, sandi)
      if (hasil.error) { setError(hasil.error); return }
      onSelesai()
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Kata sandi baru untuk <b className="text-slate-900">{pengguna.nama_lengkap}</b>.
        Sampaikan langsung ke yang bersangkutan; ia dapat mengubahnya sendiri nanti.
      </p>
      <Field label="Kata Sandi Baru" name="sandi" wajib petunjuk="Minimal 8 karakter, memuat huruf dan angka">
        <Input
          id="sandi"
          name="sandi"
          type="text"
          value={sandi}
          onChange={(ev) => setSandi(ev.target.value)}
          error={!!error}
        />
      </Field>
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
        <Button type="button" varian="sekunder" onClick={onSelesai}>Batal</Button>
        <Button type="button" disabled={pending || sandi.length < 8} onClick={jalankan}>
          {pending ? 'Menyimpan…' : 'Atur Ulang'}
        </Button>
      </div>
    </div>
  )
}

export default function PenggunaClient({
  data,
  emailPer,
  idSaya,
}: {
  data: UsersProfile[]
  emailPer: Record<string, string>
  idSaya: string
}) {
  const [modal, setModal] = useState<'baru' | 'ubah' | 'reset' | null>(null)
  const [terpilih, setTerpilih] = useState<UsersProfile | undefined>()

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setModal('baru')}>
          <Plus className="h-4 w-4" />
          Tambah Pengguna
        </Button>
      </div>

      <Tabel>
        <Thead>
          <Tr>
            <Th>Nama</Th>
            <Th>Email</Th>
            <Th>Peran</Th>
            <Th>Telepon</Th>
            <Th>Bergabung</Th>
            <Th>Status</Th>
            <Th className="w-28" />
          </Tr>
        </Thead>
        <tbody>
          {data.length === 0 ? (
            <KondisiKosong kolom={7} pesan="Belum ada pengguna." />
          ) : (
            data.map((u) => (
              <Tr key={u.id}>
                <Td className="font-medium text-slate-900">
                  {u.nama_lengkap}
                  {u.id === idSaya && (
                    <span className="ml-2 text-xs font-normal text-slate-400">(Anda)</span>
                  )}
                </Td>
                <Td className="text-slate-600">{emailPer[u.id] ?? '—'}</Td>
                <Td><Badge warna="biru">{LABEL_PERAN[u.role]}</Badge></Td>
                <Td>{u.telepon ?? '-'}</Td>
                <Td className="text-xs text-slate-500">{formatTanggal(u.created_at)}</Td>
                <Td>
                  <Badge warna={u.aktif ? 'hijau' : 'merah'}>
                    {u.aktif ? 'Aktif' : 'Nonaktif'}
                  </Badge>
                </Td>
                <Td>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => { setTerpilih(u); setModal('ubah') }}
                      className="rounded p-1.5 text-slate-500 transition hover:bg-slate-100"
                      title="Ubah"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => { setTerpilih(u); setModal('reset') }}
                      className="rounded p-1.5 text-slate-500 transition hover:bg-slate-100"
                      title="Atur ulang kata sandi"
                    >
                      <KeyRound className="h-4 w-4" />
                    </button>
                    {u.id !== idSaya && (
                      <TombolHapus
                        jenis="Pengguna"
                        nama={u.nama_lengkap}
                        onHapus={() => hapusPengguna(u.id)}
                      />
                    )}
                  </div>
                </Td>
              </Tr>
            ))
          )}
        </tbody>
      </Tabel>

      <Modal judul="Tambah Pengguna" buka={modal === 'baru'} onTutup={() => setModal(null)}>
        <FormBaru onSelesai={() => setModal(null)} />
      </Modal>

      <Modal judul="Ubah Pengguna" buka={modal === 'ubah'} onTutup={() => setModal(null)}>
        {terpilih && (
          <FormUbah key={terpilih.id} pengguna={terpilih} onSelesai={() => setModal(null)} />
        )}
      </Modal>

      <Modal judul="Atur Ulang Kata Sandi" buka={modal === 'reset'} onTutup={() => setModal(null)}>
        {terpilih && (
          <FormReset key={terpilih.id} pengguna={terpilih} onSelesai={() => setModal(null)} />
        )}
      </Modal>
    </>
  )
}
