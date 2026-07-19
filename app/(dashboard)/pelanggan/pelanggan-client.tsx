'use client'

import { useState } from 'react'
import { Plus, Pencil } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabel, Thead, Th, Td, Tr, KondisiKosong } from '@/components/ui/table'
import PelangganForm from './pelanggan-form'
import { ubahStatusPelanggan, hapusPelanggan } from './actions'
import { TombolHapus } from '@/components/ui/tombol-hapus'
import type { Customer } from '@/types'

export default function PelangganClient({
  data,
  bisaKelola,
}: {
  data: Customer[]
  bisaKelola: boolean
}) {
  const [modalBuka, setModalBuka] = useState(false)
  const [terpilih, setTerpilih] = useState<Customer | undefined>()
  const [cari, setCari] = useState('')

  const tersaring = data.filter((p) =>
    [p.nama, p.narahubung, p.telepon, p.email]
      .filter(Boolean)
      .some((v) => v!.toLowerCase().includes(cari.toLowerCase()))
  )

  function buka(pelanggan?: Customer) {
    setTerpilih(pelanggan)
    setModalBuka(true)
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <input
          value={cari}
          onChange={(e) => setCari(e.target.value)}
          placeholder="Cari pelanggan…"
          className="w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
        />
        {bisaKelola && (
          <Button onClick={() => buka()}>
            <Plus className="h-4 w-4" />
            Tambah Pelanggan
          </Button>
        )}
      </div>

      <Tabel>
        <Thead>
          <Tr>
            <Th>Nama</Th>
            <Th>Narahubung</Th>
            <Th>Kontak</Th>
            <Th>Status</Th>
            {bisaKelola && <Th className="w-24" />}
          </Tr>
        </Thead>
        <tbody>
          {tersaring.length === 0 ? (
            <KondisiKosong
              kolom={bisaKelola ? 5 : 4}
              pesan={
                cari
                  ? 'Tidak ada pelanggan yang cocok.'
                  : 'Belum ada pelanggan. Tambahkan yang pertama.'
              }
            />
          ) : (
            tersaring.map((p) => (
              <Tr key={p.id}>
                <Td className="font-medium text-slate-900">{p.nama}</Td>
                <Td>{p.narahubung ?? '-'}</Td>
                <Td>
                  <div className="text-xs">
                    {p.telepon && <div>{p.telepon}</div>}
                    {p.email && <div className="text-slate-500">{p.email}</div>}
                  </div>
                </Td>
                <Td>
                  <Badge warna={p.aktif ? 'hijau' : 'abu'}>
                    {p.aktif ? 'Aktif' : 'Nonaktif'}
                  </Badge>
                </Td>
                {bisaKelola && (
                  <Td>
                    <div className="flex gap-1">
                      <button
                        onClick={() => buka(p)}
                        className="rounded p-1.5 text-slate-500 transition hover:bg-slate-100"
                        title="Ubah"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => ubahStatusPelanggan(p.id, !p.aktif)}
                        className="rounded px-2 py-1 text-xs text-slate-500 transition hover:bg-slate-100"
                      >
                        {p.aktif ? 'Nonaktifkan' : 'Aktifkan'}
                      </button>
                      <TombolHapus
                        nama={p.nama}
                        jenis="Pelanggan"
                        onHapus={() => hapusPelanggan(p.id)}
                      />
                    </div>
                  </Td>
                )}
              </Tr>
            ))
          )}
        </tbody>
      </Tabel>

      <Modal
        judul={terpilih ? 'Ubah Pelanggan' : 'Tambah Pelanggan'}
        buka={modalBuka}
        onTutup={() => setModalBuka(false)}
      >
        <PelangganForm
          key={terpilih?.id ?? 'baru'}
          pelanggan={terpilih}
          onSelesai={() => setModalBuka(false)}
        />
      </Modal>
    </>
  )
}
