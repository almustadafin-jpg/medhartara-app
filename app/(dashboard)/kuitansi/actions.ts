"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { wajibLogin } from "@/lib/auth/session";
import { boleh } from "@/lib/auth/permissions";

export type UbahKuitansiInput = {
  ttd_nama: string;
  ttd_jabatan: string;
  untuk_pembayaran: string;
  tanggal: string;
};

/** Sunting kuitansi: penanda tangan, keterangan, & tanggal. Nominal ikut pembayaran. */
export async function ubahKuitansi(id: string, data: UbahKuitansiInput) {
  const profil = await wajibLogin();
  if (!boleh(profil.role, "lihatKuitansi") || profil.role !== "admin_finance") {
    return { error: "Hanya Admin/Finance yang dapat mengubah kuitansi." };
  }
  if (!data.tanggal) return { error: "Tanggal wajib diisi." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("kuitansi")
    .update({
      ttd_nama: data.ttd_nama.trim() || null,
      ttd_jabatan: data.ttd_jabatan.trim() || null,
      untuk_pembayaran: data.untuk_pembayaran.trim() || null,
      tanggal: data.tanggal,
    })
    .eq("id", id);

  if (error) return { error: error.message.replace(/^.*?:\s*/, "") };

  revalidatePath("/kuitansi");
  return { sukses: true };
}
