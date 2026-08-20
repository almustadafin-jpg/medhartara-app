"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Field, Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { ubahKuitansi } from "./actions";
import type { Kuitansi } from "@/types";

export default function UbahKuitansi({ kuitansi }: { kuitansi: Kuitansi }) {
  const router = useRouter();
  const [buka, setBuka] = useState(false);
  const [pending, mulai] = useTransition();
  const [error, setError] = useState<string>();

  const [ttdNama, setTtdNama] = useState(kuitansi.ttd_nama ?? "");
  const [ttdJabatan, setTtdJabatan] = useState(kuitansi.ttd_jabatan ?? "");
  const [untuk, setUntuk] = useState(kuitansi.untuk_pembayaran ?? "");
  const [tanggal, setTanggal] = useState(kuitansi.tanggal);

  function simpan() {
    setError(undefined);
    mulai(async () => {
      const hasil = await ubahKuitansi(kuitansi.id, {
        ttd_nama: ttdNama,
        ttd_jabatan: ttdJabatan,
        untuk_pembayaran: untuk,
        tanggal,
      });
      if (hasil?.error) setError(hasil.error);
      else {
        setBuka(false);
        router.refresh();
      }
    });
  }

  return (
    <>
      <button
        onClick={() => setBuka(true)}
        className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
        title="Ubah kuitansi"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>

      <Modal judul={`Ubah ${kuitansi.nomor}`} buka={buka} onTutup={() => setBuka(false)}>
        <div className="space-y-4">
          <Field label="Ditandatangani oleh" name="ttd_nama">
            <Input
              id="ttd_nama"
              value={ttdNama}
              onChange={(e) => setTtdNama(e.target.value)}
              placeholder="Nama penanda tangan"
            />
          </Field>
          <Field label="Jabatan" name="ttd_jabatan">
            <Input
              id="ttd_jabatan"
              value={ttdJabatan}
              onChange={(e) => setTtdJabatan(e.target.value)}
              placeholder="mis. Direktur"
            />
          </Field>
          <Field label="Untuk pembayaran" name="untuk_pembayaran">
            <Input
              id="untuk_pembayaran"
              value={untuk}
              onChange={(e) => setUntuk(e.target.value)}
              placeholder="mis. Termin 1 (50%)"
            />
          </Field>
          <Field label="Tanggal" name="tanggal" wajib>
            <Input
              id="tanggal"
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
            />
          </Field>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" varian="sekunder" onClick={() => setBuka(false)}>
              Batal
            </Button>
            <Button type="button" onClick={simpan} disabled={pending}>
              {pending ? "Menyimpan…" : "Simpan"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
