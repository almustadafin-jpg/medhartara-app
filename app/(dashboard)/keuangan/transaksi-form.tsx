"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { simpanTransaksi, type FormState } from "./actions";
import { Field, Input, Textarea, Select } from "@/components/ui/field";
import { Button, TombolSimpan } from "@/components/ui/button";
import { LABEL_METODE } from "@/lib/status";
import { KATEGORI_PENGELUARAN_GRUP, KATEGORI_PEMASUKAN } from "@/lib/constants";
import { formatIDR } from "@/lib/format";
import type { Transaction, Project, Vendor, TxnType, UserRole } from "@/types";

export default function TransaksiForm({
  tipe,
  transaksi,
  proyek,
  vendor,
  peran,
  onSelesai,
}: {
  tipe: TxnType;
  transaksi?: Transaction;
  proyek: Project[];
  vendor: Vendor[];
  peran: UserRole;
  onSelesai?: () => void;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState<FormState, FormData>(simpanTransaksi, {});
  const [jumlah, setJumlah] = useState(String(transaksi?.jumlah ?? ""));

  useEffect(() => {
    if (state.sukses) {
      onSelesai?.();
      router.refresh();
    }
  }, [state.sukses, onSelesai, router]);

  const e = state.fieldErrors ?? {};
  const angka = Number(jumlah.replace(/[^\d]/g, "")) || 0;

  return (
    <form action={formAction} className="space-y-4">
      {transaksi && <input type="hidden" name="id" value={transaksi.id} />}
      <input type="hidden" name="tipe" value={tipe} />

      <Field
        label="Jumlah"
        name="jumlah"
        wajib
        error={e.jumlah}
        petunjuk={angka > 0 ? formatIDR(angka) : "Angka saja, tanpa titik"}
      >
        <Input
          id="jumlah"
          name="jumlah"
          inputMode="numeric"
          value={jumlah}
          onChange={(ev) => setJumlah(ev.target.value)}
          error={!!e.jumlah}
          placeholder="5000000"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tanggal" name="tanggal" wajib error={e.tanggal}>
          <Input
            id="tanggal"
            name="tanggal"
            type="date"
            defaultValue={transaksi?.tanggal ?? new Date().toISOString().slice(0, 10)}
          />
        </Field>

        <Field label="Metode" name="metode" wajib error={e.metode}>
          <Select id="metode" name="metode" defaultValue={transaksi?.metode ?? "transfer"}>
            {Object.entries(LABEL_METODE).map(([nilai, label]) => (
              <option key={nilai} value={nilai}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field
        label="Kategori"
        name="kategori"
        wajib={tipe === "pengeluaran"}
        error={e.kategori}
      >
        <Select
          id="kategori"
          name="kategori"
          defaultValue={transaksi?.kategori ?? ""}
          error={!!e.kategori}
        >
          <option value="">— Pilih kategori —</option>
          {tipe === "pengeluaran"
            ? KATEGORI_PENGELUARAN_GRUP.map((g) => (
                <optgroup key={g.grup} label={g.grup}>
                  {g.item.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </optgroup>
              ))
            : KATEGORI_PEMASUKAN.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
          {/* Kategori lama pada data yang sedang diedit tetap terpilih walau
              tak lagi ada di daftar, supaya nilainya tidak hilang saat disimpan. */}
          {transaksi?.kategori &&
            !KATEGORI_PENGELUARAN_GRUP.some((g) =>
              (g.item as readonly string[]).includes(transaksi.kategori as string),
            ) &&
            !(KATEGORI_PEMASUKAN as readonly string[]).includes(transaksi.kategori) && (
              <option value={transaksi.kategori}>{transaksi.kategori}</option>
            )}
        </Select>
      </Field>

      <Field
        label="Proyek"
        name="project_id"
        error={e.project_id}
        petunjuk={
          peran === "pm"
            ? "Wajib — Anda hanya dapat mencatat biaya pada proyek yang Anda pegang."
            : "Kosongkan untuk biaya umum perusahaan."
        }
      >
        <Select
          id="project_id"
          name="project_id"
          defaultValue={transaksi?.project_id ?? ""}
          error={!!e.project_id}
        >
          <option value="">— Tanpa proyek (umum) —</option>
          {proyek.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nama}
            </option>
          ))}
        </Select>
      </Field>

      {tipe === "pengeluaran" && (
        <Field label="Vendor" name="vendor_id" error={e.vendor_id}>
          <Select id="vendor_id" name="vendor_id" defaultValue={transaksi?.vendor_id ?? ""}>
            <option value="">— Tanpa vendor —</option>
            {vendor.map((v) => (
              <option key={v.id} value={v.id}>
                {v.nama} · {v.kategori}
              </option>
            ))}
          </Select>
        </Field>
      )}

      <Field label="Keterangan" name="deskripsi" error={e.deskripsi}>
        <Textarea
          id="deskripsi"
          name="deskripsi"
          defaultValue={transaksi?.deskripsi ?? ""}
          placeholder="Mis. DP dekorasi panggung utama"
        />
      </Field>

      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
        {onSelesai && (
          <Button type="button" varian="sekunder" onClick={onSelesai}>
            Batal
          </Button>
        )}
        <TombolSimpan />
      </div>
    </form>
  );
}
