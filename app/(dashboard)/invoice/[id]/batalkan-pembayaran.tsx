"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { hapusPembayaran } from "../actions";

export default function BatalkanPembayaran({ id }: { id: string }) {
  const router = useRouter();
  const [pending, mulai] = useTransition();
  const [konfirmasi, setKonfirmasi] = useState(false);
  const [error, setError] = useState<string>();

  function batalkan() {
    setError(undefined);
    mulai(async () => {
      const hasil = await hapusPembayaran(id);
      if (hasil?.error) setError(hasil.error);
      else router.refresh();
    });
  }

  if (!konfirmasi) {
    return (
      <button
        onClick={() => setKonfirmasi(true)}
        className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
        title="Batalkan pembayaran ini (kuitansi ikut terhapus, status invoice disesuaikan)"
      >
        Batalkan
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={batalkan}
        disabled={pending}
        className="rounded bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-500 disabled:opacity-50"
      >
        {pending ? "…" : "Ya, batalkan"}
      </button>
      <button
        onClick={() => setKonfirmasi(false)}
        className="rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
      >
        Batal
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
