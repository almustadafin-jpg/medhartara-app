"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { konversiKeInvoice, tandaiFinalPenawaran } from "../actions";
import { Button } from "@/components/ui/button";
import type { QuotationStatus } from "@/types";

export default function AksiPenawaran({
  id,
  status,
  sudahFinal,
  bisaKelola,
  bisaKonversi,
}: {
  id: string;
  status: QuotationStatus;
  sudahFinal: boolean;
  bisaKelola: boolean;
  bisaKonversi: boolean;
}) {
  const router = useRouter();
  const [pending, mulai] = useTransition();
  const [error, setError] = useState<string>();

  const sudahDikonversi = ["dikonversi", "batal", "arsip"].includes(status);

  function ubahFinal(jadikan: boolean) {
    setError(undefined);
    mulai(async () => {
      const hasil = await tandaiFinalPenawaran(id, jadikan);
      if (hasil?.error) setError(hasil.error);
      else router.refresh();
    });
  }

  // Tombol Final: hanya penawaran Final yang boleh dikonversi ke invoice.
  const tampilFinal = bisaKelola && !sudahDikonversi;
  const tampilKonversi = bisaKonversi && sudahFinal && !sudahDikonversi;

  if (!tampilFinal && !tampilKonversi && !error) return null;

  return (
    <div className="space-y-2">
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        {tampilFinal &&
          (sudahFinal ? (
            <Button varian="sekunder" disabled={pending} onClick={() => ubahFinal(false)}>
              Batalkan Final
            </Button>
          ) : (
            <Button
              disabled={pending}
              onClick={() => ubahFinal(true)}
              className="bg-emerald-600 hover:bg-emerald-500"
            >
              Tandai Final
            </Button>
          ))}
        {tampilKonversi && (
          <Button
            disabled={pending}
            onClick={() => {
              setError(undefined);
              mulai(async () => {
                const hasil = await konversiKeInvoice(id);
                if (hasil?.error) setError(hasil.error);
                else if (hasil?.invoiceId) router.push(`/invoice/${hasil.invoiceId}`);
              });
            }}
            className="bg-violet-600 hover:bg-violet-500"
          >
            Konversi ke Invoice
          </Button>
        )}
      </div>
    </div>
  );
}
