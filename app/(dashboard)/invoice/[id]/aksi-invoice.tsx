"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ubahStatusInvoice } from "../actions";
import { Button } from "@/components/ui/button";
import type { InvoiceStatus } from "@/types";

export default function AksiInvoice({
  id,
  status,
  bisaKelola,
  onCatatPembayaran,
  bisaBayar,
}: {
  id: string;
  status: InvoiceStatus;
  bisaKelola: boolean;
  bisaBayar: boolean;
  onCatatPembayaran: () => void;
}) {
  const router = useRouter();
  const [pending, mulai] = useTransition();
  const [error, setError] = useState<string>();

  function jalankan(baru: InvoiceStatus) {
    setError(undefined);
    mulai(async () => {
      const hasil = await ubahStatusInvoice(id, baru);
      if (hasil?.error) setError(hasil.error);
      else router.refresh();
    });
  }

  const tombol: React.ReactNode[] = [];

  if (bisaKelola && status === "draft") {
    tombol.push(
      <Button key="terbit" disabled={pending} onClick={() => jalankan("terkirim")}>
        Terbitkan Invoice
      </Button>,
    );
  }

  if (bisaBayar) {
    tombol.push(
      <Button
        key="bayar"
        onClick={onCatatPembayaran}
        className="bg-emerald-600 hover:bg-emerald-500"
      >
        + Catat Pembayaran
      </Button>,
    );
  }

  if (bisaKelola && status !== "lunas" && status !== "batal") {
    tombol.push(
      <Button key="batal" varian="bahaya" disabled={pending} onClick={() => jalankan("batal")}>
        Batalkan
      </Button>,
    );
  }

  if (tombol.length === 0 && !error) return null;

  return (
    <div className="space-y-2">
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div className="flex flex-wrap justify-end gap-2">{tombol}</div>
    </div>
  );
}
