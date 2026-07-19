"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Tabel, Thead, Th, Td, Tr, KondisiKosong } from "@/components/ui/table";
import { STATUS_PENAWARAN } from "@/lib/status";
import { formatIDR, formatTanggalPendek } from "@/lib/format";
import type { Quotation, Customer, Project, QuotationStatus } from "@/types";

const SEMUA = "semua";

export default function PenawaranClient({
  data,
  pelanggan,
  proyek,
}: {
  data: Quotation[];
  pelanggan: Customer[];
  proyek: Project[];
}) {
  const [cari, setCari] = useState("");
  const [filterStatus, setFilterStatus] = useState<QuotationStatus | typeof SEMUA>(SEMUA);

  const namaPelanggan = (id: string) => pelanggan.find((c) => c.id === id)?.nama ?? "—";
  const namaProyek = (id: string | null) =>
    id ? proyek.find((p) => p.id === id)?.nama ?? "—" : "—";

  const tersaring = data
    .filter((q) => filterStatus === SEMUA || q.status === filterStatus)
    .filter((q) =>
      [q.nomor, namaPelanggan(q.customer_id)].some((v) =>
        v.toLowerCase().includes(cari.toLowerCase()),
      ),
    );

  const totalTersaring = tersaring.reduce((s, q) => s + Number(q.total), 0);

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
          onChange={(e) => setFilterStatus(e.target.value as QuotationStatus | typeof SEMUA)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
        >
          <option value={SEMUA}>Semua status</option>
          {Object.entries(STATUS_PENAWARAN).map(([nilai, s]) => (
            <option key={nilai} value={nilai}>
              {s.label}
            </option>
          ))}
        </select>
        <p className="ml-auto text-sm text-slate-500">
          {tersaring.length} penawaran ·{" "}
          <span className="font-semibold text-slate-900">{formatIDR(totalTersaring)}</span>
        </p>
      </div>

      <Tabel>
        <Thead>
          <Tr>
            <Th>Nomor</Th>
            <Th>Pelanggan</Th>
            <Th>Proyek</Th>
            <Th>Tanggal</Th>
            <Th className="text-right">Total</Th>
            <Th>Status</Th>
          </Tr>
        </Thead>
        <tbody>
          {tersaring.length === 0 ? (
            <KondisiKosong
              kolom={6}
              pesan={
                cari || filterStatus !== SEMUA
                  ? "Tidak ada penawaran yang cocok."
                  : "Belum ada penawaran. Buat yang pertama."
              }
            />
          ) : (
            tersaring.map((q) => (
              <Tr key={q.id}>
                <Td>
                  <Link
                    href={`/penawaran/${q.id}`}
                    className="font-mono font-medium text-slate-900 hover:underline"
                  >
                    {q.nomor}
                  </Link>
                </Td>
                <Td>{namaPelanggan(q.customer_id)}</Td>
                <Td className="text-sm text-slate-500">{namaProyek(q.project_id)}</Td>
                <Td className="text-xs text-slate-500">{formatTanggalPendek(q.tanggal)}</Td>
                <Td className="text-right font-medium">{formatIDR(q.total)}</Td>
                <Td>
                  <Badge warna={STATUS_PENAWARAN[q.status].warna}>
                    {STATUS_PENAWARAN[q.status].label}
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
