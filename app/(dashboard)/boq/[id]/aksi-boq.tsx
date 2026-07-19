"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ubahStatusBoq, tarikKePenawaran } from "../actions";
import { Button } from "@/components/ui/button";
import type { BoqStatus } from "@/types";

export default function AksiBoq({
  id,
  status,
  sudahDitarik,
  bisaKelola,
  bisaSetujui,
  bisaBuatPenawaran,
}: {
  id: string;
  status: BoqStatus;
  sudahDitarik: boolean;
  bisaKelola: boolean;
  bisaSetujui: boolean;
  bisaBuatPenawaran: boolean;
}) {
  const router = useRouter();
  const [pending, mulai] = useTransition();
  const [error, setError] = useState<string>();

  function jalankan(baru: BoqStatus) {
    setError(undefined);
    mulai(async () => {
      const hasil = await ubahStatusBoq(id, baru);
      if (hasil?.error) setError(hasil.error);
      else router.refresh();
    });
  }

  const tombol: React.ReactNode[] = [];

  if (bisaKelola && (status === "draft" || status === "ditolak")) {
    tombol.push(
      <Button key="ajukan" disabled={pending} onClick={() => jalankan("diajukan")}>
        Ajukan untuk Persetujuan
      </Button>,
    );
  }

  if (bisaSetujui && status === "diajukan") {
    tombol.push(
      <Button
        key="setuju"
        disabled={pending}
        onClick={() => jalankan("disetujui")}
        className="bg-emerald-600 hover:bg-emerald-500"
      >
        Setujui
      </Button>,
      <Button key="tolak" varian="bahaya" disabled={pending} onClick={() => jalankan("ditolak")}>
        Tolak
      </Button>,
    );
  }

  if (bisaBuatPenawaran && status === "disetujui" && !sudahDitarik) {
    tombol.push(
      <Button
        key="tarik"
        disabled={pending}
        className="bg-violet-600 hover:bg-violet-500"
        onClick={() => {
          setError(undefined);
          mulai(async () => {
            const hasil = await tarikKePenawaran(id);
            if (hasil?.error) setError(hasil.error);
            else if (hasil?.penawaranId) router.push(`/penawaran/${hasil.penawaranId}`);
          });
        }}
      >
        Tarik jadi Penawaran
      </Button>,
    );
  }

  if (bisaKelola && status === "disetujui") {
    tombol.push(
      <Button key="arsip" varian="halus" disabled={pending} onClick={() => jalankan("arsip")}>
        Arsipkan
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
