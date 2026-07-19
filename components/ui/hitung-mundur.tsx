"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { formatIDR } from "@/lib/format";

/**
 * Menghitung mundur dari total yang diinginkan.
 *
 * Kasus nyata: pelanggan memberi pagu "Rp 50 juta termasuk PPN".
 * Yang dibutuhkan adalah subtotal sebelum pajak, supaya setelah
 * diskon dan PPN hasilnya jatuh persis di angka itu.
 *
 *   total = subtotal × (1 − diskon%) × (1 + pajak%)
 *   subtotal = total ÷ ((1 − diskon%) × (1 + pajak%))
 *
 * Harga tiap item lalu diskalakan dengan faktor yang sama sehingga
 * proporsi antar item tidak berubah.
 */
export function HitungMundur({
  subtotalSaatIni,
  diskonPersen,
  pajakPersen,
  onTerapkan,
}: {
  subtotalSaatIni: number;
  diskonPersen: number;
  pajakPersen: number;
  onTerapkan: (subtotalTarget: number) => void;
}) {
  const [buka, setBuka] = useState(false);
  const [target, setTarget] = useState("");

  const angka = Number(target.replace(/[^\d]/g, "")) || 0;
  const pengali = (1 - diskonPersen / 100) * (1 + pajakPersen / 100);
  const subtotalTarget = pengali > 0 ? angka / pengali : 0;
  const pajakNanti = subtotalTarget * (1 - diskonPersen / 100) * (pajakPersen / 100);

  const siap = angka > 0 && subtotalSaatIni > 0 && pengali > 0;

  if (!buka) {
    return (
      <button
        type="button"
        onClick={() => setBuka(true)}
        className="text-xs text-slate-500 underline underline-offset-2 hover:text-slate-800"
      >
        Hitung mundur dari total yang diinginkan
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-medium text-slate-700">
          Hitung mundur dari total
        </p>
        <button
          type="button"
          onClick={() => setBuka(false)}
          className="text-xs text-slate-400 hover:text-slate-600"
        >
          tutup
        </button>
      </div>

      <p className="mb-2 text-xs text-slate-500">
        Masukkan pagu dari pelanggan — angka ini sudah termasuk pajak.
      </p>

      <div className="flex gap-2">
        <input
          inputMode="numeric"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          placeholder="50000000"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
        />
        <Button
          type="button"
          disabled={!siap}
          onClick={() => {
            onTerapkan(subtotalTarget);
            setBuka(false);
          }}
        >
          Terapkan
        </Button>
      </div>

      {siap && (
        <dl className="mt-3 space-y-1 text-xs">
          <div className="flex justify-between">
            <dt className="text-slate-500">Subtotal sebelum pajak</dt>
            <dd className="font-medium">{formatIDR(subtotalTarget)}</dd>
          </div>
          {pajakPersen > 0 && (
            <div className="flex justify-between">
              <dt className="text-slate-500">PPN {pajakPersen}%</dt>
              <dd>{formatIDR(pajakNanti)}</dd>
            </div>
          )}
          <div className="flex justify-between border-t border-slate-200 pt-1 font-medium">
            <dt>Total menjadi</dt>
            <dd>{formatIDR(angka)}</dd>
          </div>
          <p className="pt-1 text-slate-400">
            Harga tiap item dikalikan{" "}
            {(subtotalTarget / subtotalSaatIni).toLocaleString("id-ID", {
              maximumFractionDigits: 4,
            })}
            × sehingga perbandingan antar item tetap sama.
          </p>
        </dl>
      )}

      {angka > 0 && subtotalSaatIni <= 0 && (
        <p className="mt-2 text-xs text-red-600">
          Isi dulu harga item, baru total bisa dihitung mundur.
        </p>
      )}
    </div>
  );
}
