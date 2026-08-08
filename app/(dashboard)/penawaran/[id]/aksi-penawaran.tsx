"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { konversiKeInvoice } from "../actions";
import { Button } from "@/components/ui/button";
import type { QuotationStatus } from "@/types";

export default function AksiPenawaran({
  id,
  status,
  bisaKonversi,
}: {
  id: string;
  status: QuotationStatus;
  bisaKonversi: boolean;
}) {
  const router = useRouter();
  const [pending, mulai] = useTransition();
  const [error, setError] = useState<string>();

  // Alur cetak-manual: langkah kirim/setujui disembunyikan. Penawaran
  // langsung bisa dikonversi menjadi invoice selama belum dikonversi/batal.
  const bisaTampilKonversi =
    bisaKonversi && !["dikonversi", "batal", "arsip"].includes(status);

  if (!bisaTampilKonversi && !error) return null;

  return (
    <div className="space-y-2">
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        {bisaTampilKonversi && (
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
