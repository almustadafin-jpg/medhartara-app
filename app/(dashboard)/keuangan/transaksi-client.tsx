"use client";

import { useState } from "react";
import { Plus, Pencil, Paperclip, Lock } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabel, Thead, Th, Td, Tr, KondisiKosong } from "@/components/ui/table";
import { TombolHapus } from "@/components/ui/tombol-hapus";
import { formatIDR, formatTanggalPendek } from "@/lib/format";
import { LABEL_METODE } from "@/lib/status";
import { hapusTransaksi } from "./actions";
import TransaksiForm from "./transaksi-form";
import BuktiTransaksi from "./bukti-transaksi";
import type {
  Transaction, Project, Vendor, Attachment, TxnType, UserRole,
} from "@/types";

const SEMUA = "semua";

export default function TransaksiClient({
  tipe,
  data,
  proyek,
  vendor,
  bukti,
  companyId,
  peran,
  bisaCatat,
  bisaHapus = false,
}: {
  tipe: TxnType;
  data: Transaction[];
  proyek: Project[];
  vendor: Vendor[];
  bukti: Attachment[];
  companyId: string;
  peran: UserRole;
  bisaCatat: boolean;
  /** Hanya Admin/Finance. PM boleh mencatat pengeluaran, tapi tidak menghapusnya. */
  bisaHapus?: boolean;
}) {
  const [modalForm, setModalForm] = useState(false);
  const [modalBukti, setModalBukti] = useState<Transaction | undefined>();
  const [terpilih, setTerpilih] = useState<Transaction | undefined>();
  const [cari, setCari] = useState("");
  const [filterKategori, setFilterKategori] = useState<string>(SEMUA);

  const namaProyek = (id: string | null) =>
    id ? proyek.find((p) => p.id === id)?.nama ?? "—" : null;
  const namaVendor = (id: string | null) =>
    id ? vendor.find((v) => v.id === id)?.nama ?? "—" : null;

  const buktiUntuk = (id: string) => bukti.filter((b) => b.entity_id === id);

  const daftarKategori = Array.from(
    new Set(data.map((t) => t.kategori).filter((k): k is string => !!k)),
  ).sort();

  const tersaring = data
    .filter((t) => filterKategori === SEMUA || t.kategori === filterKategori)
    .filter((t) =>
      [t.deskripsi, t.kategori, namaProyek(t.project_id), namaVendor(t.vendor_id)]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(cari.toLowerCase())),
    );

  const total = tersaring.reduce((s, t) => s + Number(t.jumlah), 0);
  const warnaJumlah = tipe === "pemasukan" ? "text-emerald-700" : "text-red-600";

  function buka(t?: Transaction) {
    setTerpilih(t);
    setModalForm(true);
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          value={cari}
          onChange={(e) => setCari(e.target.value)}
          placeholder="Cari keterangan, proyek, atau vendor…"
          className="w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
        />
        <select
          value={filterKategori}
          onChange={(e) => setFilterKategori(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
        >
          <option value={SEMUA}>Semua kategori</option>
          {daftarKategori.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>

        <p className="ml-auto text-sm text-slate-500">
          {tersaring.length} transaksi ·{" "}
          <span className={`font-semibold ${warnaJumlah}`}>{formatIDR(total)}</span>
        </p>

        {bisaCatat && (
          <Button onClick={() => buka()}>
            <Plus className="h-4 w-4" />
            Catat {tipe === "pemasukan" ? "Pemasukan" : "Pengeluaran"}
          </Button>
        )}
      </div>

      <Tabel>
        <Thead>
          <Tr>
            <Th>Tanggal</Th>
            <Th>Keterangan</Th>
            <Th>Kategori</Th>
            <Th>{tipe === "pengeluaran" ? "Proyek / Vendor" : "Proyek"}</Th>
            <Th>Metode</Th>
            <Th className="text-right">Jumlah</Th>
            <Th className="w-32">Bukti</Th>
          </Tr>
        </Thead>
        <tbody>
          {tersaring.length === 0 ? (
            <KondisiKosong
              kolom={7}
              pesan={
                cari || filterKategori !== SEMUA
                  ? "Tidak ada transaksi yang cocok."
                  : "Belum ada transaksi tercatat."
              }
            />
          ) : (
            tersaring.map((t) => {
              const otomatis = !!t.payment_id;
              const jumlahBukti = buktiUntuk(t.id).length;

              return (
                <Tr key={t.id}>
                  <Td className="text-xs text-slate-500">{formatTanggalPendek(t.tanggal)}</Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <span>{t.deskripsi ?? "—"}</span>
                      {otomatis && (
                        <span title="Dibuat otomatis dari pembayaran invoice">
                          <Lock className="h-3.5 w-3.5 text-slate-400" />
                        </span>
                      )}
                    </div>
                  </Td>
                  <Td>
                    {t.kategori ? (
                      <Badge>{t.kategori}</Badge>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </Td>
                  <Td className="text-xs text-slate-500">
                    {namaProyek(t.project_id) ?? <i>umum</i>}
                    {namaVendor(t.vendor_id) && (
                      <>
                        <br />
                        {namaVendor(t.vendor_id)}
                      </>
                    )}
                  </Td>
                  <Td className="text-xs text-slate-500">{LABEL_METODE[t.metode]}</Td>
                  <Td className={`text-right font-medium ${warnaJumlah}`}>
                    {formatIDR(t.jumlah)}
                  </Td>
                  <Td>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setModalBukti(t)}
                        className="flex items-center gap-1 rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
                      >
                        <Paperclip className="h-3.5 w-3.5" />
                        {jumlahBukti > 0 ? jumlahBukti : "lampir"}
                      </button>
                      {bisaCatat && !otomatis && (
                        <button
                          onClick={() => buka(t)}
                          className="rounded p-1.5 text-slate-500 hover:bg-slate-100"
                          title="Ubah"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {/* Transaksi otomatis dari pembayaran invoice ditolak
                          trigger database; tombolnya disembunyikan agar
                          penolakan itu tidak jadi kejutan. */}
                      {bisaHapus && !otomatis && (
                        <TombolHapus
                          jenis="Transaksi"
                          nama={t.deskripsi ?? formatIDR(t.jumlah)}
                          onHapus={() => hapusTransaksi(t.id)}
                        />
                      )}
                    </div>
                  </Td>
                </Tr>
              );
            })
          )}
        </tbody>
      </Tabel>

      <Modal
        judul={
          terpilih
            ? "Ubah Transaksi"
            : `Catat ${tipe === "pemasukan" ? "Pemasukan" : "Pengeluaran"}`
        }
        buka={modalForm}
        onTutup={() => setModalForm(false)}
      >
        <TransaksiForm
          key={terpilih?.id ?? "baru"}
          tipe={tipe}
          transaksi={terpilih}
          proyek={proyek}
          vendor={vendor}
          peran={peran}
          onSelesai={() => setModalForm(false)}
        />
      </Modal>

      <Modal
        judul="Bukti Transaksi"
        buka={!!modalBukti}
        onTutup={() => setModalBukti(undefined)}
      >
        {modalBukti && (
          <BuktiTransaksi
            transaksiId={modalBukti.id}
            companyId={companyId}
            bukti={buktiUntuk(modalBukti.id)}
            bisaHapus={bisaCatat}
          />
        )}
      </Modal>
    </>
  );
}
