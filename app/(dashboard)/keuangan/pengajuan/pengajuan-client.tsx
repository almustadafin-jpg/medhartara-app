"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Check, X } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button, TombolSimpan } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, Input, Textarea, Select } from "@/components/ui/field";
import { Tabel, Thead, Th, Td, Tr, KondisiKosong } from "@/components/ui/table";
import { TombolHapus } from "@/components/ui/tombol-hapus";
import { STATUS_PENGAJUAN, LABEL_METODE } from "@/lib/status";
import { KATEGORI_PENGELUARAN_GRUP } from "@/lib/constants";
import { formatIDR, formatTanggalPendek } from "@/lib/format";
import {
  buatPengajuan,
  setujuiPengajuan,
  tolakPengajuan,
  hapusPengajuan,
  type FormState,
} from "./actions";
import type { PaymentRequest, Project, Vendor, UserRole } from "@/types";

const SEMUA = "semua";

function FormAjukan({ proyek, vendor, onSelesai }: {
  proyek: Project[];
  vendor: Vendor[];
  onSelesai: () => void;
}) {
  const router = useRouter();
  const [state, action] = useActionState<FormState, FormData>(buatPengajuan, {});
  const [jumlah, setJumlah] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [rekening, setRekening] = useState("");
  useEffect(() => {
    if (state.sukses) { onSelesai(); router.refresh(); }
  }, [state.sukses, onSelesai, router]);

  const e = state.fieldErrors ?? {};
  const angka = Number(jumlah.replace(/[^\d]/g, "")) || 0;

  // Rangkai rekening vendor jadi satu baris untuk disalin ke tujuan.
  const rekeningVendor = (id: string) => {
    const v = vendor.find((x) => x.id === id);
    if (!v) return "";
    return [v.bank_nama, v.bank_rekening, v.bank_atas_nama && `a.n. ${v.bank_atas_nama}`]
      .filter(Boolean)
      .join(" · ");
  };

  function pilihVendor(id: string) {
    setVendorId(id);
    const rek = rekeningVendor(id);
    // Isi otomatis bila tujuan masih kosong; jangan menimpa isian manual.
    if (rek && !rekening.trim()) setRekening(rek);
  }

  return (
    <form action={action} className="space-y-4">
      <Field label="Proyek" name="project_id" wajib error={e.project_id}>
        <Select id="project_id" name="project_id" defaultValue="" error={!!e.project_id}>
          <option value="">— Pilih proyek —</option>
          {proyek.map((p) => (
            <option key={p.id} value={p.id}>{p.nama}</option>
          ))}
        </Select>
      </Field>

      <Field label="Jumlah" name="jumlah" wajib error={e.jumlah}
        petunjuk={angka > 0 ? formatIDR(angka) : "Angka saja, tanpa titik"}>
        <Input id="jumlah" name="jumlah" inputMode="numeric" value={jumlah}
          onChange={(ev) => setJumlah(ev.target.value)} error={!!e.jumlah} placeholder="2500000" />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Kategori" name="kategori" wajib error={e.kategori}>
          <Select id="kategori" name="kategori" defaultValue="" error={!!e.kategori}>
            <option value="">— Pilih kategori —</option>
            {KATEGORI_PENGELUARAN_GRUP.map((g) => (
              <optgroup key={g.grup} label={g.grup}>
                {g.item.map((k) => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </optgroup>
            ))}
          </Select>
        </Field>

        <Field label="Tanggal" name="tanggal" wajib error={e.tanggal}>
          <Input id="tanggal" name="tanggal" type="date"
            defaultValue={new Date().toISOString().slice(0, 10)} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Vendor" name="vendor_id" error={e.vendor_id} petunjuk="Opsional">
          <Select id="vendor_id" name="vendor_id" value={vendorId}
            onChange={(ev) => pilihVendor(ev.target.value)}>
            <option value="">— Tanpa vendor —</option>
            {vendor.map((v) => (
              <option key={v.id} value={v.id}>{v.nama} · {v.kategori}</option>
            ))}
          </Select>
        </Field>

        <Field label="Metode" name="metode" wajib error={e.metode}>
          <Select id="metode" name="metode" defaultValue="transfer">
            {Object.entries(LABEL_METODE).map(([nilai, label]) => (
              <option key={nilai} value={nilai}>{label}</option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="Rekening Tujuan" name="rekening_tujuan" error={e.rekening_tujuan}
        petunjuk="Ke mana dana dikirim. Terisi otomatis dari vendor bila ada; boleh diketik manual untuk pihak lain.">
        <Input id="rekening_tujuan" name="rekening_tujuan" value={rekening}
          onChange={(ev) => setRekening(ev.target.value)}
          placeholder="Mis. BCA 1234567890 a.n. CV Karya Bahagia" />
      </Field>

      <Field label="Keterangan" name="deskripsi" error={e.deskripsi}>
        <Textarea id="deskripsi" name="deskripsi"
          placeholder="Mis. DP sewa panggung ke CV Karya Bahagia" />
      </Field>

      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
        <Button type="button" varian="sekunder" onClick={onSelesai}>Batal</Button>
        <TombolSimpan label="Ajukan" />
      </div>
    </form>
  );
}

function FormTolak({ id, onSelesai }: { id: string; onSelesai: () => void }) {
  const router = useRouter();
  const [pending, mulai] = useTransition();
  const [error, setError] = useState<string>();
  const [catatan, setCatatan] = useState("");

  function jalankan() {
    setError(undefined);
    mulai(async () => {
      const h = await tolakPengajuan(id, catatan);
      if (h.error) { setError(h.error); return; }
      onSelesai();
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <Field label="Alasan penolakan" name="catatan" petunjuk="Opsional, tapi membantu pengaju memperbaiki">
        <Textarea id="catatan" name="catatan" value={catatan}
          onChange={(ev) => setCatatan(ev.target.value)} placeholder="Mis. nominal melebihi anggaran, minta revisi" />
      </Field>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
        <Button type="button" varian="sekunder" onClick={onSelesai}>Batal</Button>
        <Button type="button" varian="bahaya" disabled={pending} onClick={jalankan}>
          {pending ? "Menyimpan…" : "Tolak Pengajuan"}
        </Button>
      </div>
    </div>
  );
}

export default function PengajuanClient({
  data,
  proyek,
  vendor,
  namaOrang,
  peran,
  idSaya,
  bisaAjukan,
  bisaTinjau,
}: {
  data: PaymentRequest[];
  proyek: Project[];
  vendor: Vendor[];
  namaOrang: Record<string, string>;
  peran: UserRole;
  idSaya: string;
  bisaAjukan: boolean;
  bisaTinjau: boolean;
}) {
  const router = useRouter();
  const [modalForm, setModalForm] = useState(false);
  const [tolakId, setTolakId] = useState<string | undefined>();
  const [filter, setFilter] = useState<string>(SEMUA);
  const [menyetujui, mulaiSetuju] = useTransition();

  void peran;

  const namaProyek = (id: string) => proyek.find((p) => p.id === id)?.nama ?? "—";
  const namaVendor = (id: string | null) =>
    id ? vendor.find((v) => v.id === id)?.nama ?? null : null;

  const tersaring = data.filter((p) => filter === SEMUA || p.status === filter);

  function setujui(id: string) {
    mulaiSetuju(async () => {
      const h = await setujuiPengajuan(id);
      if (h.error) alert(h.error);
      else router.refresh();
    });
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
        >
          <option value={SEMUA}>Semua status</option>
          <option value="diajukan">Diajukan</option>
          <option value="disetujui">Disetujui</option>
          <option value="ditolak">Ditolak</option>
        </select>

        <p className="ml-auto text-sm text-slate-500">{tersaring.length} pengajuan</p>

        {bisaAjukan && (
          <Button onClick={() => setModalForm(true)}>
            <Plus className="h-4 w-4" />
            Ajukan Pembayaran
          </Button>
        )}
      </div>

      <Tabel>
        <Thead>
          <Tr>
            <Th>Nomor</Th>
            <Th>Tanggal</Th>
            <Th>Proyek</Th>
            <Th>Kategori</Th>
            <Th className="text-right">Jumlah</Th>
            <Th>Diajukan</Th>
            <Th>Status</Th>
            <Th className="w-40" />
          </Tr>
        </Thead>
        <tbody>
          {tersaring.length === 0 ? (
            <KondisiKosong kolom={8} pesan="Belum ada pengajuan pembayaran." />
          ) : (
            tersaring.map((p) => {
              const milikSaya = p.diajukan_oleh === idSaya;
              return (
                <Tr key={p.id}>
                  <Td className="font-mono text-xs">{p.nomor}</Td>
                  <Td className="text-xs text-slate-500">{formatTanggalPendek(p.tanggal)}</Td>
                  <Td>
                    {namaProyek(p.project_id)}
                    {namaVendor(p.vendor_id) && (
                      <span className="block text-xs text-slate-400">{namaVendor(p.vendor_id)}</span>
                    )}
                    {p.rekening_tujuan && (
                      <span className="block text-xs text-slate-500">💳 {p.rekening_tujuan}</span>
                    )}
                  </Td>
                  <Td><Badge>{p.kategori}</Badge></Td>
                  <Td className="text-right font-medium text-red-600">{formatIDR(p.jumlah)}</Td>
                  <Td className="text-xs text-slate-500">
                    {p.diajukan_oleh ? namaOrang[p.diajukan_oleh] ?? "—" : "—"}
                  </Td>
                  <Td>
                    <Badge warna={STATUS_PENGAJUAN[p.status].warna}>
                      {STATUS_PENGAJUAN[p.status].label}
                    </Badge>
                    {p.status === "ditolak" && p.catatan_tinjauan && (
                      <span className="block max-w-[12rem] text-xs text-slate-400">
                        {p.catatan_tinjauan}
                      </span>
                    )}
                    {p.status === "disetujui" && (
                      <span className="block text-xs text-emerald-600">tercatat sebagai pengeluaran</span>
                    )}
                  </Td>
                  <Td>
                    <div className="flex items-center justify-end gap-1">
                      {bisaTinjau && p.status === "diajukan" && (
                        <>
                          <button
                            onClick={() => setujui(p.id)}
                            disabled={menyetujui}
                            className="flex items-center gap-1 rounded-lg border border-emerald-300 bg-white px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                            title="Setujui — jadi pengeluaran"
                          >
                            <Check className="h-3.5 w-3.5" /> Setujui
                          </button>
                          <button
                            onClick={() => setTolakId(p.id)}
                            className="flex items-center gap-1 rounded-lg border border-red-300 bg-white px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                            title="Tolak"
                          >
                            <X className="h-3.5 w-3.5" /> Tolak
                          </button>
                        </>
                      )}
                      {milikSaya && p.status !== "disetujui" && (
                        <TombolHapus
                          jenis="Pengajuan"
                          nama={p.nomor}
                          onHapus={() => hapusPengajuan(p.id)}
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

      <Modal judul="Ajukan Pembayaran" buka={modalForm} onTutup={() => setModalForm(false)}>
        <FormAjukan proyek={proyek} vendor={vendor} onSelesai={() => setModalForm(false)} />
      </Modal>

      <Modal judul="Tolak Pengajuan" buka={!!tolakId} onTutup={() => setTolakId(undefined)}>
        {tolakId && <FormTolak id={tolakId} onSelesai={() => setTolakId(undefined)} />}
      </Modal>
    </>
  );
}
