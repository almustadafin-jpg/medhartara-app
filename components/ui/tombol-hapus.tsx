"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

/**
 * Tombol hapus dengan konfirmasi.
 *
 * Konfirmasi ditampilkan sebagai modal, bukan `confirm()` bawaan
 * peramban, supaya bisa menjelaskan konsekuensinya dan menampilkan
 * pesan penolakan dari database bila datanya ternyata sudah terpakai.
 */
export function TombolHapus({
  nama,
  jenis,
  onHapus,
  redirectKe,
  gaya = "ikon",
}: {
  nama: string;
  jenis: string;
  onHapus: () => Promise<{ error?: string; sukses?: boolean } | void>;
  redirectKe?: string;
  gaya?: "ikon" | "tombol";
}) {
  const router = useRouter();
  const [buka, setBuka] = useState(false);
  const [pending, mulai] = useTransition();
  const [error, setError] = useState<string>();

  function jalankan() {
    setError(undefined);
    mulai(async () => {
      const hasil = await onHapus();
      if (hasil && "error" in hasil && hasil.error) {
        setError(hasil.error);
        return;
      }
      setBuka(false);
      if (redirectKe) router.push(redirectKe);
      else router.refresh();
    });
  }

  return (
    <>
      {gaya === "ikon" ? (
        <button
          type="button"
          onClick={() => setBuka(true)}
          className="rounded p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
          title={`Hapus ${jenis.toLowerCase()}`}
          aria-label={`Hapus ${jenis.toLowerCase()}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      ) : (
        <Button type="button" varian="bahaya" onClick={() => setBuka(true)}>
          <Trash2 className="h-4 w-4" />
          Hapus
        </Button>
      )}

      <Modal judul={`Hapus ${jenis}?`} buka={buka} onTutup={() => setBuka(false)}>
        <p className="text-sm text-slate-600">
          <b className="text-slate-900">{nama}</b> akan dihapus permanen dan tidak
          dapat dikembalikan.
        </p>
        <p className="mt-2 text-sm text-slate-500">
          Bila data ini sudah dipakai dokumen lain, penghapusan akan ditolak
          demi menjaga riwayat.
        </p>

        {error && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button type="button" varian="sekunder" onClick={() => setBuka(false)}>
            Batal
          </Button>
          <Button type="button" varian="bahaya" disabled={pending} onClick={jalankan}>
            {pending ? "Menghapus…" : "Ya, hapus"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
