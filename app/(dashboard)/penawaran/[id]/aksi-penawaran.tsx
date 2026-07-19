"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ubahStatusPenawaran, konversiKeInvoice } from "../actions";
import { Button } from "@/components/ui/button";
import type { QuotationStatus } from "@/types";

export default function AksiPenawaran({
  id,
  status,
  bisaKelola,
  bisaSetujui,
  bisaKonversi,
}: {
  id: string;
  status: QuotationStatus;
  bisaKelola: boolean;
  bisaSetujui: boolean;
  bisaKonversi: boolean;
}) {
  const router = useRouter();
  const [pending, mulai] = useTransition();
  const [error, setError] = useState<string>();

  function jalankan(baru: QuotationStatus) {
    setError(undefined);
    mulai(async () => {
      const hasil = await ubahStatusPenawaran(id, baru);
      if (hasil?.error) setError(hasil.error);
      else router.refresh();
    });
  }

  const tombol: React.ReactNode[] = [];

  if (bisaKelola && status === "draft") {
    tombol.push(
      <Button key="kirim" disabled={pending} onClick={() => jalankan("terkirim")}>
        Kirim ke Pelanggan
      </Button>,
    );
  }

  if (bisaSetujui && status === "terkirim") {
    tombol.push(
      <Button
        key="setuju"
        disabled={pending}
        onClick={() => jalankan("disetujui")}
        className="bg-emerald-600 hover:bg-emerald-500"
      >
        Setujui
      </Button>,
      <Button
        key="tolak"
        varian="bahaya"
        disabled={pending}
        onClick={() => jalankan("ditolak")}
      >
        Tolak
      </Button>,
    );
  }

  if (bisaKelola && (status === "ditolak" || status === "terkirim")) {
    tombol.push(
      <Button key="draft" varian="sekunder" disabled={pending} onClick={() => jalankan("draft")}>
        Kembalikan ke Draft
      </Button>,
    );
  }

  if (bisaKonversi && status === "disetujui") {
    tombol.push(
      <Button
        key="konversi"
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
      </Button>,
    );
  }

  if (bisaKelola && (status === "disetujui" || status === "ditolak")) {
    tombol.push(
      <Button key="arsip" varian="halus" disabled={pending} onClick={() => jalankan("arsip")}>
        Arsipkan
      </Button>,
    );
  }

  if (tombol.length === 0 && !error) return null;

  return (
    <div className="space-y-2">
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
      <div className="flex flex-wrap justify-end gap-2">{tombol}</div>
    </div>
  );
}
