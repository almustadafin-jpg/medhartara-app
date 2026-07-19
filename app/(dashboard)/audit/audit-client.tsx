"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Tabel, Thead, Th, Td, Tr, KondisiKosong } from "@/components/ui/table";
import { formatWaktu, formatIDR } from "@/lib/format";

export interface BarisAudit {
  id: string;
  aksi: string;
  entity_type: string;
  entity_id: string | null;
  data_lama: Record<string, unknown> | null;
  data_baru: Record<string, unknown> | null;
  created_at: string;
  actor_id: string | null;
}

const WARNA_AKSI: Record<string, "biru" | "kuning" | "hijau" | "ungu" | "merah" | "abu"> = {
  create: "biru",
  insert: "biru",
  update: "kuning",
  approve: "hijau",
  pay: "ungu",
  delete: "merah",
};

const LABEL_ENTITAS: Record<string, string> = {
  quotation: "Penawaran",
  invoice: "Invoice",
  payment: "Pembayaran",
  transaction: "Transaksi",
  customer: "Pelanggan",
  vendor: "Vendor",
  project: "Proyek",
};

const SEMUA = "semua";

/** Merangkum jsonb menjadi kalimat pendek yang terbaca. */
function ringkas(lama: Record<string, unknown> | null, baru: Record<string, unknown> | null) {
  if (!baru) return "—";

  const bagian: string[] = [];

  if (baru.nomor) bagian.push(String(baru.nomor));

  if (baru.status) {
    bagian.push(
      lama?.status && lama.status !== baru.status
        ? `${lama.status} → ${baru.status}`
        : String(baru.status),
    );
  }

  if (baru.jumlah !== undefined) bagian.push(formatIDR(Number(baru.jumlah)));
  else if (baru.total !== undefined && lama?.total !== baru.total) {
    bagian.push(formatIDR(Number(baru.total)));
  }

  if (baru.tipe) bagian.push(String(baru.tipe));
  if (baru.kategori) bagian.push(String(baru.kategori));

  return bagian.length ? bagian.join(" · ") : "—";
}

export default function AuditClient({
  data,
  namaAktor,
}: {
  data: BarisAudit[];
  namaAktor: Record<string, string>;
}) {
  const [filterAksi, setFilterAksi] = useState(SEMUA);
  const [filterEntitas, setFilterEntitas] = useState(SEMUA);
  const [cari, setCari] = useState("");

  const daftarAksi = Array.from(new Set(data.map((a) => a.aksi))).sort();
  const daftarEntitas = Array.from(new Set(data.map((a) => a.entity_type))).sort();

  const tersaring = data
    .filter((a) => filterAksi === SEMUA || a.aksi === filterAksi)
    .filter((a) => filterEntitas === SEMUA || a.entity_type === filterEntitas)
    .filter((a) => {
      if (!cari) return true;
      const teks = [
        namaAktor[a.actor_id ?? ""] ?? "",
        ringkas(a.data_lama, a.data_baru),
        LABEL_ENTITAS[a.entity_type] ?? a.entity_type,
      ].join(" ");
      return teks.toLowerCase().includes(cari.toLowerCase());
    });

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          value={cari}
          onChange={(e) => setCari(e.target.value)}
          placeholder="Cari aktor, nomor dokumen…"
          className="w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
        />
        <select
          value={filterAksi}
          onChange={(e) => setFilterAksi(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
        >
          <option value={SEMUA}>Semua aksi</option>
          {daftarAksi.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <select
          value={filterEntitas}
          onChange={(e) => setFilterEntitas(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
        >
          <option value={SEMUA}>Semua entitas</option>
          {daftarEntitas.map((e) => (
            <option key={e} value={e}>
              {LABEL_ENTITAS[e] ?? e}
            </option>
          ))}
        </select>
        <p className="ml-auto text-sm text-slate-500">{tersaring.length} catatan</p>
      </div>

      <Tabel>
        <Thead>
          <Tr>
            <Th>Waktu</Th>
            <Th>Aktor</Th>
            <Th>Aksi</Th>
            <Th>Entitas</Th>
            <Th>Perubahan</Th>
          </Tr>
        </Thead>
        <tbody>
          {tersaring.length === 0 ? (
            <KondisiKosong kolom={5} pesan="Tidak ada catatan yang cocok." />
          ) : (
            tersaring.map((a) => (
              <Tr key={a.id}>
                <Td className="whitespace-nowrap font-mono text-xs text-slate-500">
                  {formatWaktu(a.created_at)}
                </Td>
                <Td className="text-sm">
                  {a.actor_id ? namaAktor[a.actor_id] ?? "—" : <i className="text-slate-400">sistem</i>}
                </Td>
                <Td>
                  <Badge warna={WARNA_AKSI[a.aksi] ?? "abu"}>{a.aksi}</Badge>
                </Td>
                <Td className="text-slate-600">
                  {LABEL_ENTITAS[a.entity_type] ?? a.entity_type}
                </Td>
                <Td className="text-sm">{ringkas(a.data_lama, a.data_baru)}</Td>
              </Tr>
            ))
          )}
        </tbody>
      </Tabel>
    </>
  );
}
