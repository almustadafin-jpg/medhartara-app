"use client";

import { useActionState, useState } from "react";
import { Trash2, Plus, FolderPlus } from "lucide-react";
import { simpanBoq, type FormState } from "./actions";
import { Field, Input, Textarea, Select } from "@/components/ui/field";
import { Button, TombolSimpan } from "@/components/ui/button";
import { formatIDR } from "@/lib/format";
import { KATEGORI_ITEM } from "@/lib/constants";
import type { Boq, BoqItem, Customer, Project, UserRole } from "@/types";

/**
 * Editor BOQ dua tingkat.
 *
 * Tingkat atas: KATEGORI BESAR (mis. "Set & Properti", "Rental Equipment").
 * Tingkat bawah: ITEM di dalam kategori itu (panggung, gate, dekorasi…).
 *
 * Struktur ini murni soal tampilan & penyusunan. Saat disimpan, tiap item
 * tetap memancarkan pasangan field `item_*` berurutan — dengan `item_kategori`
 * mengikuti kategori grupnya — sehingga server action & basis data tidak
 * berubah: keduanya membaca daftar item yang sama seperti sebelumnya.
 */

interface Baris {
  kunci: string;
  sub: string;
  nama: string;
  deskripsi: string;
  kuantitas: string;
  satuan: string;
  hari: string;
  modal: string;
  jual: string;
}

interface Grup {
  kunci: string;
  kategori: string;
  items: Baris[];
}

const barisKosong = (sub = ""): Baris => ({
  kunci: crypto.randomUUID(),
  sub,
  nama: "",
  deskripsi: "",
  kuantitas: "1",
  satuan: "unit",
  hari: "1",
  modal: "",
  jual: "",
});

const grupKosong = (kategori = ""): Grup => ({
  kunci: crypto.randomUUID(),
  kategori,
  items: [barisKosong()],
});

/** Kelompokkan item lama ke grup per kategori, urutan pertama-terlihat. */
function kelompokkan(itemAwal: BoqItem[]): Grup[] {
  const peta = new Map<string, Grup>();
  for (const it of itemAwal) {
    const kat = it.kategori ?? "";
    if (!peta.has(kat)) peta.set(kat, { kunci: crypto.randomUUID(), kategori: kat, items: [] });
    peta.get(kat)!.items.push({
      kunci: it.id,
      sub: it.sub_kategori ?? "",
      nama: it.nama,
      deskripsi: it.deskripsi ?? "",
      kuantitas: String(it.kuantitas),
      satuan: it.satuan ?? "",
      hari: String(it.hari),
      modal: String(it.harga_modal),
      jual: String(it.harga_jual),
    });
  }
  return [...peta.values()];
}

export default function BoqForm({
  peran,
  boq,
  itemAwal,
  pelanggan,
  proyek,
}: {
  peran: UserRole;
  boq?: Boq;
  itemAwal?: BoqItem[];
  pelanggan: Customer[];
  proyek: Project[];
}) {
  const [state, formAction] = useActionState<FormState, FormData>(simpanBoq, {});

  // Project Manager hanya mengisi harga MODAL. Harga jual (yang ditagihkan
  // ke pelanggan) ditentukan Admin/Finance saat menyusun penawaran.
  const hanyaModal = peran === "pm";

  const [grup, setGrup] = useState<Grup[]>(
    itemAwal?.length ? kelompokkan(itemAwal) : [grupKosong(KATEGORI_ITEM[0])],
  );

  const n = (v: string) => Number(v.replace(/[^\d.]/g, "")) || 0;
  const barisModal = (b: Baris) => n(b.kuantitas) * n(b.hari) * n(b.modal);
  const barisJual = (b: Baris) => n(b.kuantitas) * n(b.hari) * n(b.jual);
  const grupModal = (g: Grup) => g.items.reduce((s, b) => s + barisModal(b), 0);
  const grupJual = (g: Grup) => g.items.reduce((s, b) => s + barisJual(b), 0);

  const totalModal = grup.reduce((s, g) => s + grupModal(g), 0);
  const totalJual = grup.reduce((s, g) => s + grupJual(g), 0);
  const margin = totalJual - totalModal;
  const persenMargin = totalJual > 0 ? (margin / totalJual) * 100 : 0;

  // ---- perubahan state ----
  const ubahKategori = (gk: string, nilai: string) =>
    setGrup((p) => p.map((g) => (g.kunci === gk ? { ...g, kategori: nilai } : g)));

  const ubahItem = (gk: string, ik: string, kolom: keyof Baris, nilai: string) =>
    setGrup((p) =>
      p.map((g) =>
        g.kunci === gk
          ? { ...g, items: g.items.map((b) => (b.kunci === ik ? { ...b, [kolom]: nilai } : b)) }
          : g,
      ),
    );

  const tambahItem = (gk: string) =>
    setGrup((p) =>
      p.map((g) => (g.kunci === gk ? { ...g, items: [...g.items, barisKosong()] } : g)),
    );

  const hapusItem = (gk: string, ik: string) =>
    setGrup((p) =>
      p.map((g) =>
        g.kunci === gk
          ? { ...g, items: g.items.length === 1 ? g.items : g.items.filter((b) => b.kunci !== ik) }
          : g,
      ),
    );

  const tambahGrup = () => setGrup((p) => [...p, grupKosong()]);
  const hapusGrup = (gk: string) =>
    setGrup((p) => (p.length === 1 ? p : p.filter((g) => g.kunci !== gk)));

  const e = state.fieldErrors ?? {};

  // Indeks item rata, untuk mencocokkan pesan error per baris dari server.
  let indeksRata = -1;

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

          <Field
            label="Pelanggan"
            name="customer_id"
            error={e.customer_id}
            petunjuk="Wajib bila BOQ akan ditarik jadi penawaran"
          >
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

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-700">Rincian per Kategori</h2>
          <p className="text-xs text-slate-500">
            Susun per kategori besar — mis. Set &amp; Properti, Rental Equipment — lalu isi
            item di dalamnya.
            {hanyaModal
              ? " Isi harga modal (biaya ke vendor). Harga jual ditentukan Admin/Finance."
              : " Harga modal biaya ke vendor; harga jual yang ditagihkan."}
          </p>
        </div>
        <Button type="button" onClick={tambahGrup}>
          <FolderPlus className="h-4 w-4" />
          Tambah Kategori
        </Button>
      </div>

      {e.items && <p className="text-xs text-red-600">{e.items}</p>}

      <div className="space-y-5">
        {grup.map((g) => (
          <section key={g.kunci} className="rounded-xl border border-slate-200 bg-white">
            {/* Kepala kategori */}
            <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3">
              <input
                list="daftar-kategori"
                value={g.kategori}
                onChange={(ev) => ubahKategori(g.kunci, ev.target.value)}
                placeholder="Nama kategori besar — mis. Set & Properti"
                className="w-full max-w-md rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-slate-900"
              />
              <span className="ml-auto whitespace-nowrap text-xs text-slate-500">
                {hanyaModal ? "Subtotal modal " : "Subtotal jual "}
                <b className="text-slate-900">
                  {formatIDR(hanyaModal ? grupModal(g) : grupJual(g))}
                </b>
              </span>
              <button
                type="button"
                onClick={() => hapusGrup(g.kunci)}
                disabled={grup.length === 1}
                className="rounded p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                title="Hapus kategori beserta itemnya"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            {/* Item dalam kategori */}
            <div className="space-y-3 p-4">
              {g.items.map((b) => {
                indeksRata += 1;
                const errBaris = !!e[`items.${indeksRata}`];
                return (
                  <div key={b.kunci} className="rounded-lg border border-slate-200 p-3">
                    {/* Tiap item memancarkan kategori grupnya — server tak berubah. */}
                    <input type="hidden" name="item_kategori" value={g.kategori} />

                    <div className="mb-2 flex gap-2">
                      <Input
                        name="item_sub_kategori"
                        value={b.sub}
                        onChange={(ev) => ubahItem(g.kunci, b.kunci, "sub", ev.target.value)}
                        placeholder="Sub-kelompok (opsional) — mis. Main Stage"
                        className="max-w-[220px]"
                      />
                      <Input
                        name="item_nama"
                        value={b.nama}
                        onChange={(ev) => ubahItem(g.kunci, b.kunci, "nama", ev.target.value)}
                        placeholder="Nama item — mis. Panggung, Gate, Dekorasi"
                        error={errBaris}
                      />
                      <button
                        type="button"
                        onClick={() => hapusItem(g.kunci, b.kunci)}
                        disabled={g.items.length === 1}
                        className="shrink-0 rounded p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                        title="Hapus item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <Input
                      name="item_deskripsi"
                      value={b.deskripsi}
                      onChange={(ev) => ubahItem(g.kunci, b.kunci, "deskripsi", ev.target.value)}
                      placeholder="Spesifikasi — mis. ukuran 6×4 m, rangka besi, karpet"
                      className="mb-2"
                    />

                    <div className="grid gap-2 sm:grid-cols-12">
                      <div className="sm:col-span-2">
                        <Input
                          name="item_kuantitas"
                          inputMode="decimal"
                          value={b.kuantitas}
                          onChange={(ev) => ubahItem(g.kunci, b.kunci, "kuantitas", ev.target.value)}
                          placeholder="Qty"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <Input
                          name="item_satuan"
                          value={b.satuan}
                          onChange={(ev) => ubahItem(g.kunci, b.kunci, "satuan", ev.target.value)}
                          placeholder="Satuan"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <Input
                          name="item_hari"
                          inputMode="decimal"
                          value={b.hari}
                          onChange={(ev) => ubahItem(g.kunci, b.kunci, "hari", ev.target.value)}
                          placeholder="Hari"
                        />
                      </div>
                      <div className={hanyaModal ? "sm:col-span-6" : "sm:col-span-3"}>
                        <Input
                          name="item_modal"
                          inputMode="numeric"
                          value={b.modal}
                          onChange={(ev) => ubahItem(g.kunci, b.kunci, "modal", ev.target.value)}
                          placeholder="Harga modal"
                        />
                      </div>
                      {hanyaModal ? (
                        // Harga jual tetap dikirim (kosong → 0) agar server
                        // membaca deretan field item yang sama seperti biasa.
                        <input type="hidden" name="item_jual" value={b.jual} />
                      ) : (
                        <div className="sm:col-span-3">
                          <Input
                            name="item_jual"
                            inputMode="numeric"
                            value={b.jual}
                            onChange={(ev) => ubahItem(g.kunci, b.kunci, "jual", ev.target.value)}
                            placeholder="Harga jual"
                          />
                        </div>
                      )}
                    </div>

                    <div className="mt-2 flex flex-wrap justify-end gap-4 text-xs">
                      <span className="text-slate-500">
                        Modal <b className="text-slate-700">{formatIDR(barisModal(b))}</b>
                      </span>
                      {!hanyaModal && (
                        <>
                          <span className="text-slate-500">
                            Jual <b className="text-slate-900">{formatIDR(barisJual(b))}</b>
                          </span>
                          <span
                            className={
                              barisJual(b) - barisModal(b) >= 0
                                ? "text-emerald-700"
                                : "text-red-600"
                            }
                          >
                            Margin <b>{formatIDR(barisJual(b) - barisModal(b))}</b>
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}

              <Button type="button" varian="sekunder" onClick={() => tambahItem(g.kunci)}>
                <Plus className="h-4 w-4" />
                Tambah Item di {g.kategori.trim() || "kategori ini"}
              </Button>
            </div>
          </section>
        ))}
      </div>

      <datalist id="daftar-kategori">
        {KATEGORI_ITEM.map((k) => (
          <option key={k} value={k} />
        ))}
      </datalist>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="Catatan" name="catatan" error={e.catatan}>
            <Textarea id="catatan" name="catatan" defaultValue={boq?.catatan ?? ""} />
          </Field>

          <dl className="space-y-2 self-start rounded-lg bg-slate-50 p-4 text-sm">
            <div
              className={`flex justify-between ${
                hanyaModal ? "border-t-0 pt-0 text-base font-semibold" : ""
              }`}
            >
              <dt className="text-slate-500">Total modal</dt>
              <dd className={hanyaModal ? "text-slate-900" : ""}>{formatIDR(totalModal)}</dd>
            </div>
            {!hanyaModal && (
              <>
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
              </>
            )}
            {hanyaModal && (
              <p className="text-xs text-slate-400">
                Harga jual ditentukan Admin/Finance saat menyusun penawaran.
              </p>
            )}
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
