'use client'

import { useState } from 'react'
import { Plus, Pencil } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabel, Thead, Th, Td, Tr, KondisiKosong } from '@/components/ui/table'
import { Select } from '@/components/ui/field'
import VendorForm from './vendor-form'
import { ubahStatusVendor, hapusVendor } from './actions'
import { TombolHapus } from '@/components/ui/tombol-hapus'
import { KATEGORI_VENDOR } from '@/lib/constants'
import type { Vendor } from '@/types'

export default function VendorClient({
  data,
  bisaKelola,
}: {
  data: Vendor[]
  bisaKelola: boolean
}) {
  const [modalBuka, setModalBuka] = useState(false)
  const [terpilih, setTerpilih] = useState<Vendor | undefined>()
  const [cari, setCari] = useState('')
  const [kategori, setKategori] = useState('')

  const tersaring = data
    .filter((v) => (kategori ? v.kategori === kategori : true))
    .filter((v) =>
      [v.nama, v.narahubung, v.telepon]
        .filter(Boolean)
        .some((s) => s!.toLowerCase().includes(cari.toLowerCase()))
    )

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap gap-2">
          <input
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            placeholder="Cari vendor…"
            className="w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
          />
          <Select
            value={kategori}
            onChange={(e) => setKategori(e.target.value)}
            className="mt-0 w-auto"
          >
            <option value="">Semua kategori</option>
            {KATEGORI_VENDOR.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </Select>
        </div>
        {bisaKelola && (
          <Button onClick={() => { setTerpilih(undefined); setModalBuka(true) }}>
            <Plus className="h-4 w-4" />
            Tambah Vendor
          </Button>
        )}
      </div>

      <Tabel>
        <Thead>
          <Tr>
            <Th>Nama</Th>
            <Th>Kategori</Th>
            <Th>Kontak</Th>
            <Th>Rekening</Th>
            <Th>Status</Th>
            {bisaKelola && <Th className="w-24" />}
          </Tr>
        </Thead>
        <tbody>
          {tersaring.length === 0 ? (
            <KondisiKosong kolom={bisaKelola ? 6 : 5} pesan="Belum ada vendor yang cocok." />
          ) : (
            tersaring.map((v) => (
              <Tr key={v.id}>
                <Td className="font-medium text-slate-900">{v.nama}</Td>
                <Td><Badge warna="biru">{v.kategori}</Badge></Td>
                <Td>
                  <div className="text-xs">
                    {v.narahubung && <div>{v.narahubung}</div>}
                    {v.telepon && <div className="text-slate-500">{v.telepon}</div>}
                  </div>
                </Td>
                <Td className="text-xs">
                  {v.bank_rekening ? (
                    <>
                      <div>{v.bank_nama} · {v.bank_rekening}</div>
                      <div className="text-slate-500">{v.bank_atas_nama}</div>
                    </>
                  ) : '-'}
                </Td>
                <Td>
                  <Badge warna={v.aktif ? 'hijau' : 'abu'}>
                    {v.aktif ? 'Aktif' : 'Nonaktif'}
                  </Badge>
                </Td>
                {bisaKelola && (
                  <Td>
                    <div className="flex gap-1">
                      <button
                        onClick={() => { setTerpilih(v); setModalBuka(true) }}
                        className="rounded p-1.5 text-slate-500 transition hover:bg-slate-100"
                        title="Ubah"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => ubahStatusVendor(v.id, !v.aktif)}
                        className="rounded px-2 py-1 text-xs text-slate-500 transition hover:bg-slate-100"
                      >
                        {v.aktif ? 'Nonaktifkan' : 'Aktifkan'}
                      </button>
                      <TombolHapus
                        nama={v.nama}
                        jenis="Vendor"
                        onHapus={() => hapusVendor(v.id)}
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
        judul={terpilih ? 'Ubah Vendor' : 'Tambah Vendor'}
        buka={modalBuka}
        onTutup={() => setModalBuka(false)}
      >
        <VendorForm
          key={terpilih?.id ?? 'baru'}
          vendor={terpilih}
          onSelesai={() => setModalBuka(false)}
        />
      </Modal>
    </>
  )
}
