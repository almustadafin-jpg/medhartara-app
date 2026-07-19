"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { wajibLogin } from "@/lib/auth/session";
import { boleh } from "@/lib/auth/permissions";
import { pesanGagalHapus, pesanTakTerhapus } from "@/lib/hapus";
import { skemaPenawaran } from "@/lib/validations/penawaran";
import type { QuotationStatus } from "@/types";

export type FormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  sukses?: boolean;
};

function petakan(issues: { path: (string | number)[]; message: string }[]) {
  const f: Record<string, string> = {};
  for (const i of issues) {
    const k = i.path.length > 1 ? `${String(i.path[0])}.${String(i.path[1])}` : String(i.path[0] ?? "_");
    if (!f[k]) f[k] = i.message;
  }
  return f;
}

/** Baris item dikirim sebagai array paralel dari form. */
function bacaItems(fd: FormData) {
  const deskripsi = fd.getAll("item_deskripsi").map(String);
  const kuantitas = fd.getAll("item_kuantitas").map(String);
  const satuan = fd.getAll("item_satuan").map(String);
  const harga = fd.getAll("item_harga").map(String);

  return deskripsi
    .map((d, i) => ({
      deskripsi: d.trim(),
      kuantitas: Number(kuantitas[i] ?? 0),
      satuan: (satuan[i] ?? "").trim() || undefined,
      harga_satuan: Number((harga[i] ?? "0").replace(/[^\d]/g, "")),
    }))
    .filter((it) => it.deskripsi !== "" || it.harga_satuan > 0);
}

export async function simpanPenawaran(_prev: FormState, fd: FormData): Promise<FormState> {
  const profil = await wajibLogin();
  if (!boleh(profil.role, "kelolaPenawaran")) {
    return { error: "Anda tidak memiliki izin membuat penawaran." };
  }

  const parsed = skemaPenawaran.safeParse({
    customer_id: String(fd.get("customer_id") ?? ""),
    project_id: String(fd.get("project_id") ?? ""),
    tanggal: String(fd.get("tanggal") ?? ""),
    berlaku_hingga: String(fd.get("berlaku_hingga") ?? ""),
    diskon_persen: Number(fd.get("diskon_persen") ?? 0),
    pajak_persen: Number(fd.get("pajak_persen") ?? 0),
    catatan: String(fd.get("catatan") ?? ""),
    ttd_nama: String(fd.get("ttd_nama") ?? ""),
    ttd_jabatan: String(fd.get("ttd_jabatan") ?? ""),
    items: bacaItems(fd),
  });

  if (!parsed.success) return { fieldErrors: petakan(parsed.error.issues) };

  const supabase = await createClient();
  const id = String(fd.get("id") ?? "");
  const { items, ...induk } = parsed.data;

  let quotationId = id;

  if (id) {
    // Hanya draft yang boleh disunting — RLS & trigger DB juga menegakkan ini.
    const { data: lama } = await supabase
      .from("quotations")
      .select("status")
      .eq("id", id)
      .maybeSingle();

    if (!lama) return { error: "Penawaran tidak ditemukan." };
    if (lama.status !== "draft") {
      return { error: `Penawaran berstatus ${lama.status} tidak dapat diubah.` };
    }

    const { error } = await supabase.from("quotations").update(induk).eq("id", id);
    if (error) return { error: "Gagal menyimpan penawaran." };

    await supabase.from("quotation_items").delete().eq("quotation_id", id);
  } else {
    // Nomor dibuat fungsi atomik di DB — bukan di aplikasi.
    const { data: nomor, error: errNomor } = await supabase.rpc("next_document_number", {
      p_company: profil.company_id,
      p_jenis: "quotation",
      p_prefix: "QT",
    });

    if (errNomor || !nomor) return { error: "Gagal membuat nomor penawaran." };

    const { data: baru, error } = await supabase
      .from("quotations")
      .insert({
        ...induk,
        nomor,
        company_id: profil.company_id,
        created_by: profil.id,
        status: "draft" as QuotationStatus,
      })
      .select("id")
      .single();

    if (error || !baru) return { error: "Gagal membuat penawaran." };
    quotationId = baru.id;
  }

  const { error: errItem } = await supabase.from("quotation_items").insert(
    items.map((it, urutan) => ({ ...it, quotation_id: quotationId, urutan })),
  );

  if (errItem) return { error: "Penawaran tersimpan, tetapi item gagal disimpan." };

  // Subtotal & total dihitung ulang oleh trigger DB, bukan dikirim dari klien.
  revalidatePath("/penawaran");
  redirect(`/penawaran/${quotationId}`);
}

/** Perubahan status: kirim, setujui, tolak, arsipkan. */
export async function ubahStatusPenawaran(id: string, status: QuotationStatus) {
  const profil = await wajibLogin();

  const perluPersetujuan = status === "disetujui" || status === "ditolak";
  const izin = perluPersetujuan ? "setujuiPenawaran" : "kelolaPenawaran";

  if (!boleh(profil.role, izin)) {
    return { error: "Anda tidak memiliki izin untuk aksi ini." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("quotations").update({ status }).eq("id", id);

  if (error) {
    // Trigger DB melempar pesan yang sudah ramah pengguna.
    return { error: error.message.replace(/^.*?:\s*/, "") };
  }

  revalidatePath("/penawaran");
  revalidatePath(`/penawaran/${id}`);
  return { sukses: true };
}

/**
 * Konversi penawaran disetujui → invoice.
 * Seluruh langkah (nomor, salin item, ubah status) dijalankan satu fungsi
 * atomik di database, sehingga tidak mungkin setengah jadi.
 */
export async function konversiKeInvoice(id: string, jatuhTempo?: string) {
  const profil = await wajibLogin();
  if (!boleh(profil.role, "kelolaInvoice")) {
    return { error: "Hanya Admin/Finance yang dapat menerbitkan invoice." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("konversi_penawaran_ke_invoice", {
    p_quotation: id,
    p_jatuh_tempo: jatuhTempo ?? null,
  });

  if (error) return { error: error.message.replace(/^.*?:\s*/, "") };

  revalidatePath("/penawaran");
  revalidatePath("/invoice");
  return { sukses: true, invoiceId: data as string };
}

export async function hapusPenawaran(id: string) {
  const profil = await wajibLogin();
  if (!boleh(profil.role, "kelolaPenawaran")) {
    return { error: "Anda tidak memiliki izin menghapus penawaran." };
  }

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("quotations")
    .delete({ count: "exact" })
    .eq("id", id);

  if (error) return { error: pesanGagalHapus(error.code, error.message, "Penawaran") };
  if (!count) {
    return {
      error: pesanTakTerhapus("Penawaran", "Hanya penawaran berstatus draft yang dapat dihapus."),
    };
  }

  revalidatePath("/penawaran");
  return { sukses: true };
}
