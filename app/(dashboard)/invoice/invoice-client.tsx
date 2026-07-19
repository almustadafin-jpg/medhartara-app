"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Tabel, Thead, Th, Td, Tr, KondisiKosong } from "@/components/ui/table";
import { STATUS_INVOICE } from "@/lib/status";
import { formatIDR, formatTanggalPendek } from "@/lib/format";
import type { InvoiceRingkas, Customer, Project, InvoiceStatus } from "@/types";

const SEMUA = "semua";

export default function InvoiceClient({
  data,
  pelanggan,
  proyek,
}: {
  data: InvoiceRingkas[];
  pelanggan: Customer[];
  proyek: Project[];
}) {
  const [cari, setCari] = useState("");
  const [filterStatus, setFilterStatus] = useState<InvoiceStatus | typeof SEMUA>(SEMUA);

  const namaPelanggan = (id: string) => pelanggan.find((c) => c.id === id)?.nama ?? "—";
  const namaProyek = (id: string | null) =>
    id ? proyek.find((p) => p.id === id)?.nama ?? "—" : "—";

  const tersaring = data
    .filter((i) => filterStatus === SEMUA || i.status_efektif === filterStatus)
    .filter((i) =>
      [i.nomor, namaPelanggan(i.customer_id)].some((v) =>
        v.toLowerCase().includes(cari.toLowerCase()),
      ),
    );

  const piutang = tersaring.reduce((s, i) => s + Number(i.sisa_tagihan), 0);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          value={cari}
          onChange={(e) => setCari(e.target.value)}
          placeholder="Cari nomor atau pelanggan…"
          className="w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as InvoiceStatus | typeof SEMUA)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
        >
          <option value={SEMUA}>Semua status</option>
          {Object.entries(STATUS_INVOICE).map(([nilai, s]) => (
            <option key={nilai} value={nilai}>
              {s.label}
            </option>
          ))}
        </select>
        <p className="ml-auto text-sm text-slate-500">
          Sisa piutang:{" "}
          <span className="font-semibold text-slate-900">{formatIDR(piutang)}</span>
        </p>
      </div>

      <Tabel>
        <Thead>
          <Tr>
            <Th>Nomor</Th>
            <Th>Pelanggan</Th>
            <Th>Proyek</Th>
            <Th>Jatuh Tempo</Th>
            <Th className="text-right">Total</Th>
            <Th className="text-right">Dibayar</Th>
            <Th className="text-right">Sisa</Th>
            <Th>Status</Th>
          </Tr>
        </Thead>
        <tbody>
          {tersaring.length === 0 ? (
            <KondisiKosong
              kolom={8}
              pesan={
                cari || filterStatus !== SEMUA
                  ? "Tidak ada invoice yang cocok."
                  : "Belum ada invoice. Terbitkan dari penawaran yang disetujui."
              }
            />
          ) : (
            tersaring.map((i) => (
              <Tr key={i.id}>
                <Td>
                  <Link
                    href={`/invoice/${i.id}`}
                    className="font-mono font-medium text-slate-900 hover:underline"
                  >
                    {i.nomor}
                  </Link>
                </Td>
                <Td>{namaPelanggan(i.customer_id)}</Td>
                <Td className="text-sm text-slate-500">{namaProyek(i.project_id)}</Td>
                <Td className="text-xs text-slate-500">{formatTanggalPendek(i.jatuh_tempo)}</Td>
                <Td className="text-right">{formatIDR(i.total)}</Td>
                <Td className="text-right text-emerald-700">{formatIDR(i.total_dibayar)}</Td>
                <Td className="text-right font-medium">{formatIDR(i.sisa_tagihan)}</Td>
                <Td>
                  <Badge warna={STATUS_INVOICE[i.status_efektif].warna}>
                    {STATUS_INVOICE[i.status_efektif].label}
                  </Badge>
                </Td>
              </Tr>
            ))
          )}
        </tbody>
      </Tabel>
    </>
  );
}
