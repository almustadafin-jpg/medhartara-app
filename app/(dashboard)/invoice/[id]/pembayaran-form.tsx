"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { catatPembayaran, type FormState } from "../actions";
import { Field, Input, Textarea, Select } from "@/components/ui/field";
import { Button, TombolSimpan } from "@/components/ui/button";
import { formatIDR } from "@/lib/format";
import { LABEL_METODE } from "@/lib/status";

export default function PembayaranForm({
  invoiceId,
  sisa,
  onSelesai,
}: {
  invoiceId: string;
  sisa: number;
  onSelesai?: () => void;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState<FormState, FormData>(catatPembayaran, {});

  useEffect(() => {
    if (state.sukses) {
      onSelesai?.();
      router.refresh();
    }
  }, [state.sukses, onSelesai, router]);

  const e = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="invoice_id" value={invoiceId} />

      <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
        Sisa tagihan: <span className="font-semibold text-slate-900">{formatIDR(sisa)}</span>
      </p>

      <Field
        label="Jumlah Pembayaran"
        name="jumlah"
        wajib
        error={e.jumlah}
        petunjuk="Angka saja, tanpa titik. Tidak boleh melebihi sisa tagihan."
      >
        <Input
          id="jumlah"
          name="jumlah"
          inputMode="numeric"
          defaultValue={String(Math.round(sisa))}
          error={!!e.jumlah}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tanggal" name="tanggal" wajib error={e.tanggal}>
          <Input
            id="tanggal"
            name="tanggal"
            type="date"
            defaultValue={new Date().toISOString().slice(0, 10)}
          />
        </Field>

        <Field label="Metode" name="metode" wajib error={e.metode}>
          <Select id="metode" name="metode" defaultValue="transfer">
            {Object.entries(LABEL_METODE).map(([nilai, label]) => (
              <option key={nilai} value={nilai}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="Catatan" name="catatan" error={e.catatan}>
        <Textarea id="catatan" name="catatan" placeholder="Mis. transfer BCA a.n. ..." />
      </Field>

      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <p className="text-xs text-slate-400">
        Nomor termin diisi otomatis. Status invoice diperbarui database setelah
        pembayaran tersimpan.
      </p>

      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
        {onSelesai && (
          <Button type="button" varian="sekunder" onClick={onSelesai}>
            Batal
          </Button>
        )}
        <TombolSimpan label="Catat Pembayaran" labelProses="Menyimpan…" />
      </div>
    </form>
  );
}
