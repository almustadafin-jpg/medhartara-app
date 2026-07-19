"use client";

import { useActionState, useState } from "react";
import { Trash2, Plus } from "lucide-react";
import { simpanBoq, type FormState } from "./actions";
import { Field, Input, Textarea, Select } from "@/components/ui/field";
import { Button, TombolSimpan } from "@/components/ui/button";
import { formatIDR } from "@/lib/format";
import { KATEGORI_ITEM } from "@/lib/constants";
import type { Boq, BoqItem, Customer, Project } from "@/types";

interface Baris {
  kunci: string;
  kategori: string;
  nama: string;
  deskripsi: string;
  kuantitas: string;
  satuan: string;
  hari: string;
  modal: string;
  jual: string;
}

const barisKosong = (kategori = ""): Baris => ({
  kunci: crypto.randomUUID(),
  kategori,
  nama: "",
  deskripsi: "",
  kuantitas: "1",
  satuan: "unit",
  hari: "1",
  modal: "",
  jual: "",
});

export default function BoqForm({
  boq,
  itemAwal,
  pelanggan,
  proyek,
}: {
  boq?: Boq;
  itemAwal?: BoqItem[];
  pelanggan: Customer[];
  proyek: Project[];
}) {
  const [state, formAction] = useActionState<FormState, FormData>(simpanBoq, {});

  const [items, setItems] = useState<Baris[]>(
    itemAwal?.length
      ? itemAwal.map((it) => ({
          kunci: it.id,
          kategori: it.kategori ?? "",
          nama: it.nama,
          deskripsi: it.deskripsi ?? "",
          kuantitas: String(it.kuantitas),
          satuan: it.satuan ?? "",
          hari: String(it.hari),
          modal: String(it.harga_modal),
          jual: String(it.harga_jual),
        }))
      : [barisKosong(KATEGORI_ITEM[0])],
  );

  const n = (v: string) => Number(v.replace(/[^\d.]/g, "")) || 0;
  const barisModal = (b: Baris) => n(b.kuantitas) * n(b.hari) * n(b.modal);
  const barisJual = (b: Baris) => n(b.kuantitas) * n(b.hari) * n(b.jual);

  const totalModal = items.reduce((s, b) => s + barisModal(b), 0);
  const totalJual = items.reduce((s, b) => s + barisJual(b), 0);
  const margin = totalJual - totalModal;
  const persenMargin = totalJual > 0 ? (margin / totalJual) * 100 : 0;

  const ubah = (kunci: string, kolom: keyof Baris, nilai: string) =>
    setItems((p) => p.map((b) => (b.kunci === kunci ? { ...b, [kolom]: nilai } : b)));

  const e = state.fieldErrors ?? {};

  // Kategori dikelompokkan hanya untuk pemisah visual di editor.
  const urutTampil = items;

  return (
    <form action={formAction} className="space-y-6">
      {boq && <input type="hidden" name="id" value={boq.id} />}

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-slate-700">Informasi BOQ</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Judul" name="judul" wajib error={e.judul}>
              <Input
                id="judul"
                name="judul"
                defaultValue={boq?.judul ?? ""}
                error={!!e.judul}
                placeholder="RAB Produksi Video Profil Bank Cakrawala"
              />
            </Field>
          </div>

          <Field label="Pelanggan" name="customer_id" error={e.customer_id} petunjuk="Wajib bila BOQ akan ditarik jadi penawaran">
            <Select id="customer_id" name="customer_id" defaultValue={boq?.customer_id ?? ""}>
              <option value="">— Belum ditentukan —</option>
              {pelanggan.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nama}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Proyek" name="project_id" error={e.project_id}>
            <Select id="project_id" name="project_id" defaultValue={boq?.project_id ?? ""}>
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
              defaultValue={boq?.tanggal ?? new Date().toISOString().slice(0, 10)}
            />
          </Field>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">Rincian Item</h2>
          <Button type="button" varian="sekunder" onClick={() => setItems((p) => [...p, barisKosong()])}>
            <Plus className="h-4 w-4" />
            Tambah Item
          </Button>
        </div>
        <p className="mb-4 text-xs text-slate-500">
          Harga modal adalah biaya ke vendor. Harga jual yang ditagihkan ke pelanggan.
        </p>

        {e.items && <p className="mb-3 text-xs text-red-600">{e.items}</p>}

        <div className="space-y-4">
          {urutTampil.map((b, i) => (
            <div key={b.kunci} className="rounded-lg border border-slate-200 p-3">
              <div className="mb-2 grid gap-2 sm:grid-cols-12">
                <div className="sm:col-span-3">
                  <input
                    name="item_kategori"
                    list="daftar-kategori"
                    value={b.kategori}
                    onChange={(ev) => ubah(b.kunci, "kategori", ev.target.value)}
                    placeholder="Kategori"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
                  />
                </div>
                <div className="sm:col-span-8">
                  <Input
                    name="item_nama"
                    value={b.nama}
                    onChange={(ev) => ubah(b.kunci, "nama", ev.target.value)}
                    placeholder="Nama item — mis. Kamera"
                    error={!!e[`items.${i}`]}
                  />
                </div>
                <div className="flex justify-end sm:col-span-1">
                  <button
                    type="button"
                    onClick={() =>
                      setItems((p) => (p.length === 1 ? p : p.filter((x) => x.kunci !== b.kunci)))
                    }
                    disabled={items.length === 1}
                    className="rounded p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                    title="Hapus item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <Input
                name="item_deskripsi"
                value={b.deskripsi}
                onChange={(ev) => ubah(b.kunci, "deskripsi", ev.target.value)}
                placeholder="Spesifikasi — mis. Sony A7s Mark III (body only), termasuk tripod"
                className="mb-2"
              />

              <div className="grid gap-2 sm:grid-cols-12">
                <div className="sm:col-span-2">
                  <Input
                    name="item_kuantitas"
                    inputMode="decimal"
                    value={b.kuantitas}
                    onChange={(ev) => ubah(b.kunci, "kuantitas", ev.target.value)}
                    placeholder="Qty"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Input
                    name="item_satuan"
                    value={b.satuan}
                    onChange={(ev) => ubah(b.kunci, "satuan", ev.target.value)}
                    placeholder="Satuan"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Input
                    name="item_hari"
                    inputMode="decimal"
                    value={b.hari}
                    onChange={(ev) => ubah(b.kunci, "hari", ev.target.value)}
                    placeholder="Hari"
                  />
                </div>
                <div className="sm:col-span-3">
                  <Input
                    name="item_modal"
                    inputMode="numeric"
                    value={b.modal}
                    onChange={(ev) => ubah(b.kunci, "modal", ev.target.value)}
                    placeholder="Harga modal"
                  />
                </div>
                <div className="sm:col-span-3">
                  <Input
                    name="item_jual"
                    inputMode="numeric"
                    value={b.jual}
                    onChange={(ev) => ubah(b.kunci, "jual", ev.target.value)}
                    placeholder="Harga jual"
                  />
                </div>
              </div>

              <div className="mt-2 flex flex-wrap justify-end gap-4 text-xs">
                <span className="text-slate-500">
                  Modal <b className="text-slate-700">{formatIDR(barisModal(b))}</b>
                </span>
                <span className="text-slate-500">
                  Jual <b className="text-slate-900">{formatIDR(barisJual(b))}</b>
                </span>
                <span
                  className={
                    barisJual(b) - barisModal(b) >= 0 ? "text-emerald-700" : "text-red-600"
                  }
                >
                  Margin <b>{formatIDR(barisJual(b) - barisModal(b))}</b>
                </span>
              </div>
            </div>
          ))}
        </div>

        <datalist id="daftar-kategori">
          {KATEGORI_ITEM.map((k) => (
            <option key={k} value={k} />
          ))}
        </datalist>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="Catatan" name="catatan" error={e.catatan}>
            <Textarea id="catatan" name="catatan" defaultValue={boq?.catatan ?? ""} />
          </Field>

          <dl className="space-y-2 self-start rounded-lg bg-slate-50 p-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Total modal</dt>
              <dd>{formatIDR(totalModal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Total jual</dt>
              <dd className="font-medium">{formatIDR(totalJual)}</dd>
            </div>
            <div
              className={`flex justify-between border-t border-slate-200 pt-2 text-base font-semibold ${
                margin >= 0 ? "text-emerald-700" : "text-red-600"
              }`}
            >
              <dt>Margin</dt>
              <dd>{formatIDR(margin)}</dd>
            </div>
            <p className="text-xs text-slate-400">
              {persenMargin.toFixed(1)}% dari harga jual. Angka final dihitung ulang database.
            </p>
          </dl>
        </div>
      </section>

      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <div className="flex justify-end">
        <TombolSimpan label="Simpan BOQ" labelProses="Menyimpan…" />
      </div>
    </form>
  );
}
