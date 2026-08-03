"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { simpanProyek, type FormState } from "./actions";
import { Field, Input, Textarea, Select } from "@/components/ui/field";
import { Button, TombolSimpan } from "@/components/ui/button";
import { STATUS_PROYEK } from "@/lib/status";
import type { Project, Customer, UsersProfile, UserRole } from "@/types";

export default function ProyekForm({
  proyek,
  pelanggan,
  pengguna,
  peran,
  onSelesai,
}: {
  proyek?: Project;
  pelanggan: Customer[];
  pengguna: UsersProfile[];
  peran: UserRole;
  onSelesai?: () => void;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState<FormState, FormData>(simpanProyek, {});

  useEffect(() => {
    if (state.sukses) {
      onSelesai?.();
      router.refresh();
    }
  }, [state.sukses, onSelesai, router]);

  const e = state.fieldErrors ?? {};
  const daftarPM = pengguna.filter((u) => u.role === "pm");

  return (
    <form action={formAction} className="space-y-4">
      {proyek && <input type="hidden" name="id" value={proyek.id} />}

      <Field label="Nama Proyek" name="nama" wajib error={e.nama}>
        <Input
          id="nama"
          name="nama"
          defaultValue={proyek?.nama ?? ""}
          error={!!e.nama}
          placeholder="Gala Dinner Tahunan"
        />
      </Field>

      <Field label="Pelanggan" name="customer_id" wajib error={e.customer_id}>
        <Select
          id="customer_id"
          name="customer_id"
          defaultValue={proyek?.customer_id ?? ""}
          error={!!e.customer_id}
        >
          <option value="">— Pilih pelanggan —</option>
          {pelanggan.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nama}
            </option>
          ))}
        </Select>
      </Field>

      {peran === "pm" ? (
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
          Proyek yang Anda buat otomatis ditugaskan kepada Anda.
        </p>
      ) : (
        <Field label="Penanggung Jawab (PM)" name="pm_id" error={e.pm_id}>
          <Select id="pm_id" name="pm_id" defaultValue={proyek?.pm_id ?? ""}>
            <option value="">— Belum ditugaskan —</option>
            {daftarPM.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nama_lengkap}
              </option>
            ))}
          </Select>
        </Field>
      )}

      <p className="text-sm font-medium text-slate-700">Tanggal Pelaksanaan Acara</p>
      <p className="-mt-3 text-xs text-slate-500">
        Untuk acara beberapa hari, isi tanggal mulai dan selesai (mis. 2–3 hari). Tanggal ini
        muncul otomatis di BOQ, penawaran, dan invoice.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Mulai" name="tanggal_mulai" error={e.tanggal_mulai}>
          <Input
            id="tanggal_mulai"
            name="tanggal_mulai"
            type="date"
            defaultValue={proyek?.tanggal_mulai ?? ""}
          />
        </Field>
        <Field label="Selesai" name="tanggal_selesai" error={e.tanggal_selesai} petunjuk="Boleh sama dengan tanggal mulai untuk acara 1 hari">
          <Input
            id="tanggal_selesai"
            name="tanggal_selesai"
            type="date"
            defaultValue={proyek?.tanggal_selesai ?? ""}
            error={!!e.tanggal_selesai}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Status" name="status" wajib error={e.status}>
          <Select id="status" name="status" defaultValue={proyek?.status ?? "prospek"}>
            {Object.entries(STATUS_PROYEK).map(([nilai, s]) => (
              <option key={nilai} value={nilai}>
                {s.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Nilai Kontrak"
          name="nilai_kontrak"
          error={e.nilai_kontrak}
          petunjuk="Angka saja, tanpa titik"
        >
          <Input
            id="nilai_kontrak"
            name="nilai_kontrak"
            inputMode="numeric"
            defaultValue={proyek?.nilai_kontrak ?? ""}
            error={!!e.nilai_kontrak}
            placeholder="150000000"
          />
        </Field>
      </div>

      <Field
        label="Lokasi Acara"
        name="lokasi"
        error={e.lokasi}
        petunjuk="Muncul otomatis di BOQ, penawaran, dan invoice proyek ini"
      >
        <Input
          id="lokasi"
          name="lokasi"
          defaultValue={proyek?.lokasi ?? ""}
          placeholder="Ballroom Hotel Mulia, Senayan, Jakarta"
        />
      </Field>

      <Field label="Deskripsi" name="deskripsi" error={e.deskripsi}>
        <Textarea id="deskripsi" name="deskripsi" defaultValue={proyek?.deskripsi ?? ""} />
      </Field>

      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
        {onSelesai && (
          <Button type="button" varian="sekunder" onClick={onSelesai}>
            Batal
          </Button>
        )}
        <TombolSimpan />
      </div>
    </form>
  );
}
