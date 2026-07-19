"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { wajibLogin } from "@/lib/auth/session";
import { boleh } from "@/lib/auth/permissions";
import { skemaTransaksi, skemaBukti } from "@/lib/validations/transaksi";

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

const pesanDB = (p: string) => p.replace(/^.*?(?:ERROR|error):\s*/, "").trim();

export async function simpanTransaksi(_prev: FormState, fd: FormData): Promise<FormState> {
  const profil = await wajibLogin();

  const tipe = String(fd.get("tipe") ?? "pengeluaran");

  // PM hanya boleh mencatat pengeluaran pada proyeknya — RLS menegakkan,
  // pemeriksaan di sini memberi pesan yang jelas lebih dulu.
  const izin = tipe === "pemasukan" ? "kelolaKeuangan" : "catatPengeluaran";
  if (!boleh(profil.role, izin)) {
    return { error: `Anda tidak memiliki izin mencatat ${tipe}.` };
  }

  const parsed = skemaTransaksi.safeParse({
    tipe,
    jumlah: Number(String(fd.get("jumlah") ?? "0").replace(/[^\d]/g, "")),
    tanggal: String(fd.get("tanggal") ?? ""),
    kategori: String(fd.get("kategori") ?? ""),
    metode: String(fd.get("metode") ?? "transfer"),
    project_id: String(fd.get("project_id") ?? ""),
    vendor_id: String(fd.get("vendor_id") ?? ""),
    deskripsi: String(fd.get("deskripsi") ?? ""),
  });

  if (!parsed.success) return { fieldErrors: petakan(parsed.error.issues) };

  if (profil.role === "pm" && !parsed.data.project_id) {
    return { fieldErrors: { project_id: "Pilih proyek yang Anda pegang." } };
  }

  const supabase = await createClient();
  const id = String(fd.get("id") ?? "");

  const { error } = id
    ? await supabase.from("transactions").update(parsed.data).eq("id", id)
    : await supabase.from("transactions").insert({
        ...parsed.data,
        company_id: profil.company_id,
        created_by: profil.id,
      });

  if (error) {
    if (error.code === "42501") {
      return { error: "Ditolak database: Anda tidak berwenang atas proyek ini." };
    }
    return { error: pesanDB(error.message) };
  }

  revalidatePath("/keuangan/pemasukan");
  revalidatePath("/keuangan/pengeluaran");
  return { sukses: true };
}

export async function hapusTransaksi(id: string) {
  const profil = await wajibLogin();
  if (!boleh(profil.role, "kelolaKeuangan")) {
    return { error: "Hanya Admin/Finance yang dapat menghapus transaksi." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) return { error: pesanDB(error.message) };

  revalidatePath("/keuangan/pemasukan");
  revalidatePath("/keuangan/pengeluaran");
  return { sukses: true };
}

/**
 * Mencatat metadata bukti setelah berkas terunggah ke Storage.
 * Berkas itu sendiri diunggah langsung dari browser agar tidak
 * melewati server — policy Storage yang membatasi aksesnya.
 */
export async function simpanBukti(input: {
  entity_type: string;
  entity_id: string;
  file_url: string;
  file_nama: string;
  file_tipe?: string;
  file_ukuran?: number;
}) {
  const profil = await wajibLogin();

  const parsed = skemaBukti.safeParse(input);
  if (!parsed.success) return { error: "Data bukti tidak valid." };

  const supabase = await createClient();
  const { error } = await supabase.from("attachments").insert({
    ...parsed.data,
    company_id: profil.company_id,
    uploaded_by: profil.id,
  });

  if (error) return { error: "Gagal menyimpan data bukti." };

  revalidatePath("/keuangan/pemasukan");
  revalidatePath("/keuangan/pengeluaran");
  return { sukses: true };
}

/** URL bertanda-tangan, berlaku 60 detik. Bucket bukti tidak publik. */
export async function urlBukti(path: string) {
  await wajibLogin();
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from("bukti").createSignedUrl(path, 60);
  if (error || !data) return { error: "Gagal membuka bukti." };
  return { url: data.signedUrl };
}

export async function hapusBukti(id: string, path: string) {
  const profil = await wajibLogin();
  const supabase = await createClient();

  const { error } = await supabase.from("attachments").delete().eq("id", id);
  if (error) return { error: "Gagal menghapus data bukti." };

  // Policy Storage menolak bila bukan pengunggah dan bukan Admin/Finance.
  await supabase.storage.from("bukti").remove([path]);
  void profil;

  revalidatePath("/keuangan/pemasukan");
  revalidatePath("/keuangan/pengeluaran");
  return { sukses: true };
}
