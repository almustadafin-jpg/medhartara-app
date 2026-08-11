"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Pencil, Archive, ArchiveRestore } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabel, Thead, Th, Td, Tr, KondisiKosong } from "@/components/ui/table";
import { STATUS_PROYEK } from "@/lib/status";
import { formatIDR, formatTanggalPendek } from "@/lib/format";
import ProyekForm from "./proyek-form";
import { hapusProyek, arsipkanProyek } from "./actions";
import { TombolHapus } from "@/components/ui/tombol-hapus";
import type { Project, Customer, UsersProfile, UserRole, ProjectStatus } from "@/types";

const SEMUA = "semua";

export default function ProyekClient({
  data,
  pelanggan,
  pengguna,
  bisaKelola,
  peran,
  idSaya,
}: {
  data: Project[];
  pelanggan: Customer[];
  pengguna: UsersProfile[];
  bisaKelola: boolean;
  peran: UserRole;
  idSaya: string;
}) {
  const [modalBuka, setModalBuka] = useState(false);
  const [terpilih, setTerpilih] = useState<Project | undefined>();
  const [cari, setCari] = useState("");
  const [filterStatus, setFilterStatus] = useState<ProjectStatus | typeof SEMUA>(SEMUA);
  const [tampilArsip, setTampilArsip] = useState(false);
  const router = useRouter();
  const [pending, mulai] = useTransition();

  const namaPelanggan = (id: string) => pelanggan.find((p) => p.id === id)?.nama ?? "—";
  const namaPM = (id: string | null) =>
    id ? pengguna.find((u) => u.id === id)?.nama_lengkap ?? "—" : "Belum ditugaskan";

  const tersaring = data
    .filter((p) => tampilArsip || !p.arsip_pada)
    .filter((p) => filterStatus === SEMUA || p.status === filterStatus)
    .filter((p) =>
      [p.nama, p.kode, namaPelanggan(p.customer_id)]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(cari.toLowerCase())),
    );

  function ubahArsip(p: Project) {
    mulai(async () => {
      await arsipkanProyek(p.id, !p.arsip_pada);
      router.refresh();
    });
  }

  /** PM hanya boleh menyunting proyek yang ia pegang — cerminan RLS. */
  const bisaSunting = (p: Project) =>
    bisaKelola && (peran !== "pm" || p.pm_id === idSaya);

  function buka(proyek?: Project) {
    setTerpilih(proyek);
    setModalBuka(true);
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          value={cari}
          onChange={(e) => setCari(e.target.value)}
          placeholder="Cari proyek, kode, atau pelanggan…"
          className="w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as ProjectStatus | typeof SEMUA)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
        >
          <option value={SEMUA}>Semua status</option>
          {Object.entries(STATUS_PROYEK).map(([nilai, s]) => (
            <option key={nilai} value={nilai}>
              {s.label}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={tampilArsip}
            onChange={(e) => setTampilArsip(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300"
          />
          Tampilkan arsip
        </label>
        {bisaKelola && (
          <Button className="ml-auto" onClick={() => buka()}>
            <Plus className="h-4 w-4" />
            Tambah Proyek
          </Button>
        )}
      </div>

      <Tabel>
        <Thead>
          <Tr>
            <Th>Kode &amp; Nama</Th>
            <Th>Pelanggan</Th>
            <Th>Penanggung Jawab</Th>
            <Th>Periode</Th>
            <Th className="text-right">Nilai Kontrak</Th>
            <Th>Status</Th>
            <Th className="w-16" />
          </Tr>
        </Thead>
        <tbody>
          {tersaring.length === 0 ? (
            <KondisiKosong
              kolom={7}
              pesan={
                cari || filterStatus !== SEMUA
                  ? "Tidak ada proyek yang cocok."
                  : "Belum ada proyek. Tambahkan yang pertama."
              }
            />
          ) : (
            tersaring.map((p) => (
              <Tr key={p.id}>
                <Td>
                  <Link
                    href={`/proyek/${p.id}`}
                    className="font-medium text-slate-900 hover:underline"
                  >
                    {p.nama}
                  </Link>
                  <div className="font-mono text-xs text-slate-400">{p.kode ?? "—"}</div>
                </Td>
                <Td>{namaPelanggan(p.customer_id)}</Td>
                <Td className="text-sm">{namaPM(p.pm_id)}</Td>
                <Td className="text-xs text-slate-500">
                  {formatTanggalPendek(p.tanggal_mulai)} – {formatTanggalPendek(p.tanggal_selesai)}
                </Td>
                <Td className="text-right">
                  {p.nilai_kontrak ? formatIDR(p.nilai_kontrak) : "—"}
                </Td>
                <Td>
                  <Badge warna={STATUS_PROYEK[p.status].warna}>
                    {STATUS_PROYEK[p.status].label}
                  </Badge>
                  {p.arsip_pada && (
                    <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
                      Arsip
                    </span>
                  )}
                </Td>
                <Td>
                  {bisaSunting(p) && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => buka(p)}
                        className="rounded p-1.5 text-slate-500 transition hover:bg-slate-100"
                        title="Ubah"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => ubahArsip(p)}
                        disabled={pending}
                        className="rounded p-1.5 text-slate-500 transition hover:bg-slate-100 disabled:opacity-40"
                        title={p.arsip_pada ? "Batalkan arsip" : "Arsipkan"}
                      >
                        {p.arsip_pada ? (
                          <ArchiveRestore className="h-4 w-4" />
                        ) : (
                          <Archive className="h-4 w-4" />
                        )}
                      </button>
                      <TombolHapus
                        nama={p.nama}
                        jenis="Proyek"
                        onHapus={() => hapusProyek(p.id)}
                      />
                    </div>
                  )}
                </Td>
              </Tr>
            ))
          )}
        </tbody>
      </Tabel>

      <Modal
        judul={terpilih ? "Ubah Proyek" : "Tambah Proyek"}
        buka={modalBuka}
        onTutup={() => setModalBuka(false)}
      >
        <ProyekForm
          key={terpilih?.id ?? "baru"}
          proyek={terpilih}
          pelanggan={pelanggan}
          pengguna={pengguna}
          peran={peran}
          onSelesai={() => setModalBuka(false)}
        />
      </Modal>
    </>
  );
}
