"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { wajibLogin } from "@/lib/auth/session";
import { boleh } from "@/lib/auth/permissions";
import { pesanGagalHapus, pesanTakTerhapus } from "@/lib/hapus";

export type FormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  sukses?: boolean;
};

const opsionalUuid = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === "" ? undefined : v))
  .pipe(z.string().uuid("Referensi tidak valid").optional());

const skema = z.object({
  project_id: z.string().uuid("Proyek wajib dipilih"),
  vendor_id: opsionalUuid,
  kategori: z.string().trim().min(1, "Kategori wajib diisi").max(60),
  jumlah: z.number().positive("Jumlah harus lebih dari 0"),
  tanggal: z.string().min(1, "Tanggal wajib diisi"),
  metode: z.enum(["transfer", "tunai", "lainnya"]),
  rekening_tujuan: z.string().trim().max(200).optional().transform((v) => (v === "" ? undefined : v)),
  deskripsi: z.string().trim().max(300).optional().transform((v) => (v === "" ? undefined : v)),
});

function petakan(issues: { path: (string | number)[]; message: string }[]) {
  const f: Record<string, string> = {};
  for (const i of issues) {
    const k = String(i.path[0] ?? "_");
    if (!f[k]) f[k] = i.message;
  }
  return f;
}

/** PM (atau Admin/Finance) mengajukan pembayaran proyek. */
export async function buatPengajuan(_prev: FormState, fd: FormData): Promise<FormState> {
  const profil = await wajibLogin();
  if (!boleh(profil.role, "ajukanPembayaran")) {
    return { error: "Anda tidak berwenang mengajukan pembayaran." };
  }

  const parsed = skema.safeParse({
    project_id: String(fd.get("project_id") ?? ""),
    vendor_id: String(fd.get("vendor_id") ?? ""),
    kategori: String(fd.get("kategori") ?? ""),
    jumlah: Number(String(fd.get("jumlah") ?? "0").replace(/[^\d]/g, "")),
    tanggal: String(fd.get("tanggal") ?? ""),
    metode: String(fd.get("metode") ?? "transfer"),
    rekening_tujuan: String(fd.get("rekening_tujuan") ?? ""),
    deskripsi: String(fd.get("deskripsi") ?? ""),
  });

  if (!parsed.success) return { fieldErrors: petakan(parsed.error.issues) };

  const supabase = await createClient();
  const { data: nomor, error: errNomor } = await supabase.rpc("next_document_number", {
    p_company: profil.company_id,
    p_jenis: "pengajuan",
    p_prefix: "PR",
  });
  if (errNomor || !nomor) return { error: "Gagal membuat nomor pengajuan." };

  const { error } = await supabase.from("payment_requests").insert({
    ...parsed.data,
    nomor,
    company_id: profil.company_id,
    diajukan_oleh: profil.id,
    status: "diajukan",
  });

  if (error) return { error: error.message.replace(/^.*?:\s*/, "") };

  revalidatePath("/keuangan/pengajuan");
  return { sukses: true };
}

/** Admin/Finance menyetujui — otomatis menjadi pengeluaran kas. */
export async function setujuiPengajuan(id: string): Promise<{ error?: string; sukses?: boolean }> {
  const profil = await wajibLogin();
  if (!boleh(profil.role, "tinjauPengajuan")) {
    return { error: "Hanya Admin/Finance yang dapat menyetujui pengajuan." };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("setujui_pengajuan", { p_id: id });
  if (error) return { error: error.message.replace(/^.*?:\s*/, "") };

  revalidatePath("/keuangan/pengajuan");
  revalidatePath("/keuangan/pengeluaran");
  return { sukses: true };
}

/** Admin/Finance menolak. */
export async function tolakPengajuan(
  id: string,
  catatan: string,
): Promise<{ error?: string; sukses?: boolean }> {
  const profil = await wajibLogin();
  if (!boleh(profil.role, "tinjauPengajuan")) {
    return { error: "Hanya Admin/Finance yang dapat menolak pengajuan." };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("tolak_pengajuan", {
    p_id: id,
    p_catatan: catatan.trim() || null,
  });
  if (error) return { error: error.message.replace(/^.*?:\s*/, "") };

  revalidatePath("/keuangan/pengajuan");
  return { sukses: true };
}

/** Membatalkan pengajuan yang belum disetujui. */
export async function hapusPengajuan(id: string): Promise<{ error?: string; sukses?: boolean }> {
  const profil = await wajibLogin();
  if (!boleh(profil.role, "ajukanPembayaran")) {
    return { error: "Anda tidak berwenang." };
  }
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("payment_requests")
    .delete({ count: "exact" })
    .eq("id", id);

  if (error) return { error: pesanGagalHapus(error.code, error.message, "Pengajuan") };
  if (!count) {
    return {
      error: pesanTakTerhapus(
        "Pengajuan",
        "Pengajuan yang sudah disetujui tidak dapat dihapus.",
      ),
    };
  }

  revalidatePath("/keuangan/pengajuan");
  return { sukses: true };
}
