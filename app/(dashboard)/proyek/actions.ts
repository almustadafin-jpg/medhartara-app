"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { wajibLogin } from "@/lib/auth/session";
import { boleh } from "@/lib/auth/permissions";
import { pesanGagalHapus, pesanTakTerhapus } from "@/lib/hapus";
import { skemaProyek } from "@/lib/validations/proyek";

export type FormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  sukses?: boolean;
};

function petakan(issues: { path: (string | number)[]; message: string }[]) {
  const f: Record<string, string> = {};
  for (const i of issues) {
    const k = String(i.path[0] ?? "_");
    if (!f[k]) f[k] = i.message;
  }
  return f;
}

export async function simpanProyek(_prev: FormState, fd: FormData): Promise<FormState> {
  const profil = await wajibLogin();
  if (!boleh(profil.role, "kelolaProyek")) {
    return { error: "Anda tidak memiliki izin mengelola proyek." };
  }

  const parsed = skemaProyek.safeParse({
    nama: String(fd.get("nama") ?? ""),
    customer_id: String(fd.get("customer_id") ?? ""),
    pm_id: String(fd.get("pm_id") ?? ""),
    status: String(fd.get("status") ?? "prospek"),
    tanggal_mulai: String(fd.get("tanggal_mulai") ?? ""),
    tanggal_selesai: String(fd.get("tanggal_selesai") ?? ""),
    nilai_kontrak: String(fd.get("nilai_kontrak") ?? ""),
    lokasi: String(fd.get("lokasi") ?? ""),
    deskripsi: String(fd.get("deskripsi") ?? ""),
  });

  if (!parsed.success) return { fieldErrors: petakan(parsed.error.issues) };

  const id = String(fd.get("id") ?? "");
  const supabase = await createClient();

  // PM hanya boleh menangani proyek miliknya sendiri.
  const pmId = profil.role === "pm" ? profil.id : parsed.data.pm_id ?? null;

  const payload = {
    ...parsed.data,
    pm_id: pmId,
    company_id: profil.company_id,
  };

  const { error } = id
    ? await supabase.from("projects").update(payload).eq("id", id)
    : await supabase.from("projects").insert(payload);

  if (error) {
    // Kode diisi trigger DB (PRJ-2026-0001); bentrok seharusnya tidak terjadi.
    if (error.code === "23505") return { error: "Kode proyek bentrok. Coba simpan ulang." };
    if (error.code === "42501") return { error: "Ditolak database: Anda bukan PM proyek ini." };
    return { error: "Gagal menyimpan proyek. Silakan coba lagi." };
  }

  revalidatePath("/proyek");
  return { sukses: true };
}

export async function hapusProyek(id: string) {
  const profil = await wajibLogin();
  if (!boleh(profil.role, "kelolaProyek")) {
    return { error: "Anda tidak memiliki izin menghapus proyek." };
  }

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("projects")
    .delete({ count: "exact" })
    .eq("id", id);

  if (error) return { error: pesanGagalHapus(error.code, error.message, "Proyek") };
  if (!count) {
    return {
      error: pesanTakTerhapus("Proyek", "PM hanya dapat menghapus proyek yang ia pegang."),
    };
  }

  revalidatePath("/proyek");
  return { sukses: true };
}
