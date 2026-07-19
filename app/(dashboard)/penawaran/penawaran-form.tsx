"use client";

import { useActionState, useState } from "react";
import { Trash2, Plus } from "lucide-react";
import { simpanPenawaran, type FormState } from "./actions";
import { Field, Input, Textarea, Select } from "@/components/ui/field";
import { Button, TombolSimpan } from "@/components/ui/button";
import { formatIDR } from "@/lib/format";
import { HitungMundur } from "@/components/ui/hitung-mundur";
import type { Customer, Project, Quotation, QuotationItem } from "@/types";

interface BarisItem {
  kunci: string;
  deskripsi: string;
  kuantitas: string;
  satuan: string;
  harga: string;
}

const barisKosong = (): BarisItem => ({
  kunci: crypto.randomUUID(),
  deskripsi: "",
  kuantitas: "1",
  satuan: "paket",
  harga: "",
});

export default function PenawaranForm({
  penawaran,
  itemAwal,
  pelanggan,
  proyek,
  penandaTanganBawaan,
}: {
  penawaran?: Quotation;
  itemAwal?: QuotationItem[];
  pelanggan: Customer[];
  proyek: Project[];
  /** Nama pengguna yang sedang login — dipakai bila dokumen belum punya penanda tangan. */
  penandaTanganBawaan?: string;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(simpanPenawaran, {});

  const [items, setItems] = useState<BarisItem[]>(
    itemAwal?.length
      ? itemAwal.map((it) => ({
          kunci: it.id,
          deskripsi: it.deskripsi,
          kuantitas: String(it.kuantitas),
          satuan: it.satuan ?? "",
          harga: String(it.harga_satuan),
        }))
      : [barisKosong()],
  );

  const [diskon, setDiskon] = useState(String(penawaran?.diskon_persen ?? 0));
  const [pajak, setPajak] = useState(String(penawaran?.pajak_persen ?? 11));

  const angka = (v: string) => Number(v.replace(/[^\d.]/g, "")) || 0;

  // Pratinjau di klien. Nilai yang tersimpan dihitung ulang oleh trigger DB.
  const subtotal = items.reduce((s, it) => s + angka(it.kuantitas) * angka(it.harga), 0);
  const potongan = (subtotal * angka(diskon)) / 100;
  const dasar = subtotal - potongan;
  const ppn = (dasar * angka(pajak)) / 100;
  const total = dasar + ppn;


  /**
   * Menskalakan seluruh harga item agar subtotal jatuh di angka target.
   * Selisih akibat pembulatan ke rupiah dibebankan ke item terakhir,
   * supaya totalnya benar-benar pas — bukan meleset beberapa rupiah.
   */
  function terapkanTarget(subtotalTarget: number) {
    if (subtotal <= 0) return;
    const faktor = subtotalTarget / subtotal;

    const baru = items.map((it) => {
      const hargaBaru = Math.round(angka(it.harga) * faktor);
      return { ...it, harga: String(hargaBaru) };
    });

    const subtotalBaru = baru.reduce(
      (s, it) => s + angka(it.kuantitas) * angka(it.harga),
      0,
    );
    const selisih = Math.round(subtotalTarget) - subtotalBaru;

    if (selisih !== 0) {
      const i = baru.length - 1;
      const qty = angka(baru[i].kuantitas) || 1;
      baru[i] = {
        ...baru[i],
        harga: String(angka(baru[i].harga) + Math.round(selisih / qty)),
      };
    }

    setItems(baru);
  }

  const ubahBaris = (kunci: string, kolom: keyof BarisItem, nilai: string) =>
    setItems((prev) => prev.map((it) => (it.kunci === kunci ? { ...it, [kolom]: nilai } : it)));

  const e = state.fieldErrors ?? {};
  const hariIni = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="space-y-6">
      {penawaran && <input type="hidden" name="id" value={penawaran.id} />}

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-slate-700">Informasi Penawaran</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Pelanggan" name="customer_id" wajib error={e.customer_id}>
            <Select
              id="customer_id"
              name="customer_id"
              defaultValue={penawaran?.customer_id ?? ""}
              error={!!e.customer_id}
            >
              <option value="">— Pilih pelanggan —</option>
              {pelanggan.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nama}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Proyek" name="project_id" error={e.project_id} petunjuk="Boleh dikosongkan">
            <Select id="project_id" name="project_id" defaultValue={penawaran?.project_id ?? ""}>
              <option value="">— Tanpa proyek —</option>
              {proyek.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nama}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Tanggal" name="tanggal" wajib error={e.tanggal}>
            <Input
              id="tanggal"
              name="tanggal"
              type="date"
              defaultValue={penawaran?.tanggal ?? hariIni}
            />
          </Field>

          <Field label="Berlaku Hingga" name="berlaku_hingga" error={e.berlaku_hingga}>
            <Input
              id="berlaku_hingga"
              name="berlaku_hingga"
              type="date"
              defaultValue={penawaran?.berlaku_hingga ?? ""}
              error={!!e.berlaku_hingga}
            />
          </Field>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">Item Penawaran</h2>
          <Button
            type="button"
            varian="sekunder"
            onClick={() => setItems((p) => [...p, barisKosong()])}
          >
            <Plus className="h-4 w-4" />
            Tambah Item
          </Button>
        </div>

        {e.items && <p className="mb-3 text-xs text-red-600">{e.items}</p>}

        <div className="space-y-3">
          {items.map((it, i) => (
            <div key={it.kunci} className="grid gap-2 sm:grid-cols-12">
              <div className="sm:col-span-5">
                <Input
                  name="item_deskripsi"
                  value={it.deskripsi}
                  onChange={(ev) => ubahBaris(it.kunci, "deskripsi", ev.target.value)}
                  placeholder="Deskripsi pekerjaan"
                  error={!!e[`items.${i}`]}
                />
              </div>
              <div className="sm:col-span-2">
                <Input
                  name="item_kuantitas"
                  inputMode="decimal"
                  value={it.kuantitas}
                  onChange={(ev) => ubahBaris(it.kunci, "kuantitas", ev.target.value)}
                  placeholder="Qty"
                />
              </div>
              <div className="sm:col-span-1">
                <Input
                  name="item_satuan"
                  value={it.satuan}
                  onChange={(ev) => ubahBaris(it.kunci, "satuan", ev.target.value)}
                  placeholder="Sat."
                />
              </div>
              <div className="sm:col-span-3">
                <Input
                  name="item_harga"
                  inputMode="numeric"
                  value={it.harga}
                  onChange={(ev) => ubahBaris(it.kunci, "harga", ev.target.value)}
                  placeholder="Harga satuan"
                />
              </div>
              <div className="flex items-center justify-between gap-2 sm:col-span-1">
                <span className="text-xs text-slate-500 sm:hidden">
                  {formatIDR(angka(it.kuantitas) * angka(it.harga))}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setItems((p) => (p.length === 1 ? p : p.filter((x) => x.kunci !== it.kunci)))
                  }
                  disabled={items.length === 1}
                  className="mt-1.5 rounded p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-30 disabled:hover:bg-transparent"
                  title="Hapus item"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Diskon (%)" name="diskon_persen" error={e.diskon_persen}>
                <Input
                  id="diskon_persen"
                  name="diskon_persen"
                  inputMode="decimal"
                  value={diskon}
                  onChange={(ev) => setDiskon(ev.target.value)}
                />
              </Field>
              <Field label="PPN (%)" name="pajak_persen" error={e.pajak_persen}>
                <Input
                  id="pajak_persen"
                  name="pajak_persen"
                  inputMode="decimal"
                  value={pajak}
                  onChange={(ev) => setPajak(ev.target.value)}
                />
              </Field>
            </div>
            <HitungMundur
              subtotalSaatIni={subtotal}
              diskonPersen={angka(diskon)}
              pajakPersen={angka(pajak)}
              onTerapkan={terapkanTarget}
            />

            <div className="grid grid-cols-2 gap-4">
              <Field label="Ditandatangani oleh" name="ttd_nama" error={e.ttd_nama}>
                <Input
                  id="ttd_nama"
                  name="ttd_nama"
                  defaultValue={penawaran?.ttd_nama ?? penandaTanganBawaan ?? ""}
                  placeholder="Nama lengkap"
                />
              </Field>
              <Field label="Jabatan" name="ttd_jabatan" error={e.ttd_jabatan}>
                <Input
                  id="ttd_jabatan"
                  name="ttd_jabatan"
                  defaultValue={penawaran?.ttd_jabatan ?? ""}
                  placeholder="Direktur"
                />
              </Field>
            </div>

            <Field label="Catatan" name="catatan" error={e.catatan}>
              <Textarea id="catatan" name="catatan" defaultValue={penawaran?.catatan ?? ""} />
            </Field>
          </div>

          <dl className="space-y-2 self-start rounded-lg bg-slate-50 p-4 text-sm">
            <Baris label="Subtotal" nilai={formatIDR(subtotal)} />
            {angka(diskon) > 0 && (
              <Baris label={`Diskon ${diskon}%`} nilai={`−${formatIDR(potongan)}`} />
            )}
            {angka(pajak) > 0 && <Baris label={`PPN ${pajak}%`} nilai={formatIDR(ppn)} />}
            <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-semibold">
              <dt>Total</dt>
              <dd>{formatIDR(total)}</dd>
            </div>
            <p className="pt-1 text-xs text-slate-400">
              Pratinjau. Nilai final dihitung ulang oleh database saat disimpan.
            </p>
          </dl>
        </div>
      </section>

      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <div className="flex justify-end gap-2">
        <TombolSimpan label="Simpan sebagai Draft" labelProses="Menyimpan…" />
      </div>
    </form>
  );
}

function Baris({ label, nilai }: { label: string; nilai: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-slate-500">{label}</dt>
      <dd>{nilai}</dd>
    </div>
  );
}
