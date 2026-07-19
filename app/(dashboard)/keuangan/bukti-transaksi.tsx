"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Paperclip, Trash2, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { simpanBukti, urlBukti, hapusBukti } from "./actions";
import { UKURAN_MAKS_BUKTI, TIPE_BUKTI_DIIZINKAN } from "@/lib/constants";
import type { Attachment } from "@/types";

export default function BuktiTransaksi({
  transaksiId,
  companyId,
  bukti,
  bisaHapus,
}: {
  transaksiId: string;
  companyId: string;
  bukti: Attachment[];
  bisaHapus: boolean;
}) {
  const router = useRouter();
  const [pending, mulai] = useTransition();
  const [error, setError] = useState<string>();
  const [mengunggah, setMengunggah] = useState(false);

  async function unggah(berkas: File) {
    setError(undefined);

    if (berkas.size > UKURAN_MAKS_BUKTI) {
      setError("Ukuran berkas melebihi 5 MB.");
      return;
    }
    if (!TIPE_BUKTI_DIIZINKAN.includes(berkas.type)) {
      setError("Format harus JPG, PNG, WEBP, atau PDF.");
      return;
    }

    setMengunggah(true);
    const supabase = createClient();

    // Path diawali company_id — policy Storage memeriksa folder pertama.
    const bersih = berkas.name.replace(/[^\w.\-]/g, "_");
    const path = `${companyId}/transaction/${transaksiId}/${Date.now()}-${bersih}`;

    const { error: errUnggah } = await supabase.storage
      .from("bukti")
      .upload(path, berkas, { contentType: berkas.type, upsert: false });

    if (errUnggah) {
      setError("Gagal mengunggah berkas.");
      setMengunggah(false);
      return;
    }

    const hasil = await simpanBukti({
      entity_type: "transaction",
      entity_id: transaksiId,
      file_url: path,
      file_nama: berkas.name,
      file_tipe: berkas.type,
      file_ukuran: berkas.size,
    });

    setMengunggah(false);
    if (hasil?.error) setError(hasil.error);
    else router.refresh();
  }

  function buka(path: string) {
    mulai(async () => {
      const hasil = await urlBukti(path);
      if (hasil?.error) setError(hasil.error);
      else if (hasil.url) window.open(hasil.url, "_blank", "noopener,noreferrer");
    });
  }

  function hapus(id: string, path: string) {
    mulai(async () => {
      const hasil = await hapusBukti(id, path);
      if (hasil?.error) setError(hasil.error);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {bukti.length === 0 && (
          <li className="text-sm text-slate-400">Belum ada bukti terlampir.</li>
        )}
        {bukti.map((b) => (
          <li
            key={b.id}
            className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <Paperclip className="h-4 w-4 shrink-0 text-slate-400" />
            <span className="min-w-0 flex-1 truncate">{b.file_nama}</span>
            <button
              type="button"
              onClick={() => buka(b.file_url)}
              disabled={pending}
              className="rounded p-1.5 text-slate-500 hover:bg-slate-100"
              title="Buka"
            >
              <ExternalLink className="h-4 w-4" />
            </button>
            {bisaHapus && (
              <button
                type="button"
                onClick={() => hapus(b.id, b.file_url)}
                disabled={pending}
                className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                title="Hapus"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </li>
        ))}
      </ul>

      <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
        <Paperclip className="h-4 w-4" />
        {mengunggah ? "Mengunggah…" : "Lampirkan bukti"}
        <input
          type="file"
          className="hidden"
          accept=".jpg,.jpeg,.png,.webp,.pdf"
          disabled={mengunggah}
          onChange={(e) => {
            const berkas = e.target.files?.[0];
            if (berkas) void unggah(berkas);
            e.target.value = "";
          }}
        />
      </label>

      <p className="text-xs text-slate-400">JPG, PNG, WEBP, atau PDF · maksimal 5 MB</p>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
    </div>
  );
}
