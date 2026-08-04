"use client";

import { useActionState, useState } from "react";
import { Trash2, Plus, FolderPlus } from "lucide-react";
import { simpanBoq, type FormState } from "./actions";
import { Field, Input, Textarea, Select } from "@/components/ui/field";
import { Button, TombolSimpan } from "@/components/ui/button";
import { formatIDR } from "@/lib/format";
import { KATEGORI_ITEM, SATUAN_ITEM } from "@/lib/constants";
import type { Boq, BoqItem, Customer, Project, UserRole } from "@/types";

/**
 * Editor BOQ — kategori besar + baris item sederhana.
 *
 * Tingkat atas: KATEGORI BESAR (mis. "Set & Properti", "Equipment Rent").
 * Tingkat bawah: baris item dengan kolom ringkas:
 *   Description · (detail spesifikasi) · QTY · Satuan · Days · Time · Rate · Total · Keterangan
 *
 * Total baris = QTY × Days × Time × Rate.
 *
 * Harga MODAL disembunyikan secara default. Admin/Finance bisa menyalakan
 * kolom modal (untuk hitung margin) lewat sakelar. Project Manager mengisi
 * kolom Rate sebagai harga modal — harga jual ditentukan Admin/Finance.
 */

interface Baris {
  kunci: string;
  nama: string;
  deskripsi: string;
  kuantitas: string;
  satuan: string;
  hari: string;
  waktu: string;
  modal: string;
  jual: string;
  keterangan: string;
}

interface Grup {
  kunci: string;
  kategori: string;
  items: Baris[];
}

const barisKosong = (): Baris => ({
  kunci: crypto.randomUUID(),
  nama: "",
  deskripsi: "",
  kuantitas: "1",
  satuan: "Paket",
  hari: "1",
  waktu: "1",
  modal: "",
  jual: "",
  keterangan: "",
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
      nama: it.nama,
      deskripsi: it.deskripsi ?? "",
      kuantitas: String(it.kuantitas),
      satuan: it.satuan ?? "Paket",
      hari: String(it.hari),
      waktu: String(it.waktu ?? 1),
      modal: String(it.harga_modal),
      jual: String(it.harga_jual),
      keterangan: it.keterangan ?? "",
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

  // Admin/Finance: kolom modal disembunyikan sampai sakelar dinyalakan.
  const [tampilModal, setTampilModal] = useState(false);

  const [grup, setGrup] = useState<Grup[]>(
    itemAwal?.length ? kelompokkan(itemAwal) : [grupKosong(KATEGORI_ITEM[0])],
  );

  // Terima koma maupun titik sebagai pemisah desimal (mis. "1,5" hari).
  const n = (v: string) => Number(v.replace(",", ".").replace(/[^\d.]/g, "")) || 0;
  const barisModal = (b: Baris) => n(b.kuantitas) * n(b.hari) * n(b.waktu) * n(b.modal);
  const barisJual = (b: Baris) => n(b.kuantitas) * n(b.hari) * n(b.waktu) * n(b.jual);
  const grupModal = (g: Grup) => g.items.reduce((s, b) => s + barisModal(b), 0);
  const grupJual = (g: Grup) => g.items.reduce((s, b) => s + barisJual(b), 0);

  const totalModal = grup.reduce((s, g) => s + grupModal(g), 0);
  const totalJual = grup.reduce((s, g) => s + grupJual(g), 0);
  const margin = totalJual - totalModal;
  const persenMargin = totalJual > 0 ? (margin / totalJual) * 100 : 0;

  // Kolom Rate mewakili modal untuk PM, jual untuk Admin/Finance.
  const barisRate = (b: Baris) => (hanyaModal ? barisModal(b) : barisJual(b));
  const grupRate = (g: Grup) => (hanyaModal ? grupModal(g) : grupJual(g));

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

      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-700">Rincian per Kategori</h2>
          <p className="text-xs text-slate-500">
            Susun per kategori besar — mis. Set &amp; Properti, Equipment Rent — lalu isi item di
            dalamnya. Total baris = QTY × Days × Time × Rate.
            {hanyaModal ? " Isi Rate sebagai harga modal (biaya ke vendor)." : ""}
          </p>
        </div>
        <Button type="button" onClick={tambahGrup}>
          <FolderPlus className="h-4 w-4" />
          Tambah Kategori
        </Button>
      </div>

      {!hanyaModal && (
        <label className="flex items-center gap-2 text-xs text-slate-600">
          <input
            type="checkbox"
            checked={tampilModal}
            onChange={(ev) => setTampilModal(ev.target.checked)}
            className="h-4 w-4 rounded border-slate-300"
          />
          Tampilkan kolom Harga Modal (untuk hitung margin &amp; profit) — opsional
        </label>
      )}

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
                Subtotal <b className="text-slate-900">{formatIDR(grupRate(g))}</b>
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
              {g.items.map((b, iBaris) => {
                indeksRata += 1;
                const errBaris = !!e[`items.${indeksRata}`];
                return (
                  <div key={b.kunci} className="rounded-lg border border-slate-200 p-3">
                    {/* Tiap item memancarkan kategori grupnya — server tak berubah. */}
                    <input type="hidden" name="item_kategori" value={g.kategori} />

                    <div className="mb-2 flex items-center gap-2">
                      <span className="w-6 shrink-0 text-center text-xs font-semibold text-slate-400">
                        {iBaris + 1}
                      </span>
                      <Input
                        name="item_nama"
                        value={b.nama}
                        onChange={(ev) => ubahItem(g.kunci, b.kunci, "nama", ev.target.value)}
                        placeholder="Description — mis. Panggung utama, Sound system, Operator"
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
                      placeholder="Detail spesifikasi — mis. ukuran 6×4 m, rangka besi, karpet"
                      className="mb-2 ml-8"
                    />

                    <div className="ml-8 grid gap-2 sm:grid-cols-12">
                      <div className="sm:col-span-2">
                        <label className="mb-1 block text-[10px] uppercase tracking-wide text-slate-400">
                          QTY
                        </label>
                        <Input
                          name="item_kuantitas"
                          inputMode="decimal"
                          value={b.kuantitas}
                          onChange={(ev) => ubahItem(g.kunci, b.kunci, "kuantitas", ev.target.value)}
                          placeholder="Qty"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="mb-1 block text-[10px] uppercase tracking-wide text-slate-400">
                          Satuan
                        </label>
                        <Select
                          name="item_satuan"
                          value={b.satuan}
                          onChange={(ev) => ubahItem(g.kunci, b.kunci, "satuan", ev.target.value)}
                        >
                          {SATUAN_ITEM.map((sat) => (
                            <option key={sat} value={sat}>
                              {sat}
                            </option>
                          ))}
                        </Select>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="mb-1 block text-[10px] uppercase tracking-wide text-slate-400">
                          Days
                        </label>
                        <Input
                          name="item_hari"
                          inputMode="decimal"
                          value={b.hari}
                          onChange={(ev) => ubahItem(g.kunci, b.kunci, "hari", ev.target.value)}
                          placeholder="Hari (mis. 1,5)"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="mb-1 block text-[10px] uppercase tracking-wide text-slate-400">
                          Time
                        </label>
                        <Input
                          name="item_waktu"
                          inputMode="decimal"
                          value={b.waktu}
                          onChange={(ev) => ubahItem(g.kunci, b.kunci, "waktu", ev.target.value)}
                          placeholder="Kali/sesi"
                        />
                      </div>
                      <div className={tampilModal ? "sm:col-span-2" : "sm:col-span-4"}>
                        <label className="mb-1 block text-[10px] uppercase tracking-wide text-slate-400">
                          {hanyaModal ? "Rate (modal)" : "Rate"}
                        </label>
                        <Input
                          name={hanyaModal ? "item_modal" : "item_jual"}
                          inputMode="numeric"
                          value={hanyaModal ? b.modal : b.jual}
                          onChange={(ev) =>
                            ubahItem(g.kunci, b.kunci, hanyaModal ? "modal" : "jual", ev.target.value)
                          }
                          placeholder="Harga satuan"
                        />
                      </div>
                      {!hanyaModal && tampilModal && (
                        <div className="sm:col-span-2">
                          <label className="mb-1 block text-[10px] uppercase tracking-wide text-slate-400">
                            Modal
                          </label>
                          <Input
                            name="item_modal"
                            inputMode="numeric"
                            value={b.modal}
                            onChange={(ev) => ubahItem(g.kunci, b.kunci, "modal", ev.target.value)}
                            placeholder="Harga modal"
                          />
                        </div>
                      )}

                      {/* PM: harga jual tetap dikirim (kosong → 0). Admin tanpa
                          sakelar: modal tetap dikirim (nilai tersembunyi). */}
                      {hanyaModal && <input type="hidden" name="item_jual" value={b.jual} />}
                      {!hanyaModal && !tampilModal && (
                        <input type="hidden" name="item_modal" value={b.modal} />
                      )}
                    </div>

                    <div className="ml-8 mt-2 flex flex-wrap items-center gap-2">
                      <Input
                        name="item_keterangan"
                        value={b.keterangan}
                        onChange={(ev) => ubahItem(g.kunci, b.kunci, "keterangan", ev.target.value)}
                        placeholder="Keterangan (opsional)"
                        className="flex-1"
                      />
                      <span className="whitespace-nowrap text-xs text-slate-500">
                        Total <b className="text-slate-900">{formatIDR(barisRate(b))}</b>
                      </span>
                      {!hanyaModal && tampilModal && (
                        <span
                          className={`whitespace-nowrap text-xs ${
                            barisJual(b) - barisModal(b) >= 0 ? "text-emerald-700" : "text-red-600"
                          }`}
                        >
                          Margin <b>{formatIDR(barisJual(b) - barisModal(b))}</b>
                        </span>
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
            {hanyaModal ? (
              <div className="flex justify-between text-base font-semibold">
                <dt className="text-slate-500">Total modal</dt>
                <dd className="text-slate-900">{formatIDR(totalModal)}</dd>
              </div>
            ) : (
              <>
                <div className="flex justify-between text-base font-semibold">
                  <dt className="text-slate-500">Total</dt>
                  <dd>{formatIDR(totalJual)}</dd>
                </div>
                {tampilModal && (
                  <>
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Total modal</dt>
                      <dd>{formatIDR(totalModal)}</dd>
                    </div>
                    <div
                      className={`flex justify-between border-t border-slate-200 pt-2 font-semibold ${
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
