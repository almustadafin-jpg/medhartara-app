"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { wajibLogin } from "@/lib/auth/session";
import { boleh } from "@/lib/auth/permissions";
import { pesanGagalHapus, pesanTakTerhapus } from "@/lib/hapus";
import { skemaInvoice, skemaPembayaran } from "@/lib/validations/invoice";
import type { InvoiceStatus } from "@/types";

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

/** Pesan dari trigger DB sudah ramah pengguna — buang prefiks teknisnya. */
function pesanDB(pesan: string) {
  return pesan.replace(/^.*?(?:ERROR|error):\s*/, "").trim();
}

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

export async function simpanInvoice(_prev: FormState, fd: FormData): Promise<FormState> {
  const profil = await wajibLogin();
  if (!boleh(profil.role, "kelolaInvoice")) {
    return { error: "Hanya Admin/Finance yang dapat mengelola invoice." };
  }

  const parsed = skemaInvoice.safeParse({
    customer_id: String(fd.get("customer_id") ?? ""),
    project_id: String(fd.get("project_id") ?? ""),
    tanggal: String(fd.get("tanggal") ?? ""),
    jatuh_tempo: String(fd.get("jatuh_tempo") ?? ""),
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

  let invoiceId = id;

  if (id) {
    const { data: lama } = await supabase
      .from("invoices")
      .select("status")
      .eq("id", id)
      .maybeSingle();

    if (!lama) return { error: "Invoice tidak ditemukan." };

    // Invoice yang sudah ada pembayaran tidak boleh diubah (lindungi jejak kas).
    const { count: jmlBayar } = await supabase
      .from("payments")
      .select("id", { count: "exact", head: true })
      .eq("invoice_id", id);
    if (jmlBayar && jmlBayar > 0) {
      return { error: "Invoice ini sudah ada pembayaran, jadi tidak dapat diubah." };
    }

    const { error } = await supabase.from("invoices").update(induk).eq("id", id);
    if (error) return { error: pesanDB(error.message) };

    await supabase.from("invoice_items").delete().eq("invoice_id", id);
  } else {
    const { data: nomor, error: errNomor } = await supabase.rpc("next_document_number", {
      p_company: profil.company_id,
      p_jenis: "invoice",
      p_prefix: "INV",
    });

    if (errNomor || !nomor) return { error: "Gagal membuat nomor invoice." };

    const { data: baru, error } = await supabase
      .from("invoices")
      .insert({
        ...induk,
        nomor,
        company_id: profil.company_id,
        created_by: profil.id,
        status: "draft" as InvoiceStatus,
      })
      .select("id")
      .single();

    if (error || !baru) return { error: pesanDB(error?.message ?? "Gagal membuat invoice.") };
    invoiceId = baru.id;
  }

  const { error: errItem } = await supabase.from("invoice_items").insert(
    items.map((it, urutan) => ({ ...it, invoice_id: invoiceId, urutan })),
  );

  if (errItem) return { error: "Invoice tersimpan, tetapi item gagal disimpan." };

  revalidatePath("/invoice");
  redirect(`/invoice/${invoiceId}`);
}

export async function ubahStatusInvoice(id: string, status: InvoiceStatus) {
  const profil = await wajibLogin();
  if (!boleh(profil.role, "kelolaInvoice")) {
    return { error: "Anda tidak memiliki izin untuk aksi ini." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("invoices").update({ status }).eq("id", id);
  if (error) return { error: pesanDB(error.message) };

  revalidatePath("/invoice");
  revalidatePath(`/invoice/${id}`);
  return { sukses: true };
}

/**
 * Mencatat pembayaran termin.
 * Overpayment, status invoice, dan nomor termin ditangani trigger DB —
 * server action hanya memvalidasi bentuk masukan.
 */
export async function catatPembayaran(_prev: FormState, fd: FormData): Promise<FormState> {
  const profil = await wajibLogin();
  if (!boleh(profil.role, "catatPembayaran")) {
    return { error: "Hanya Admin/Finance yang dapat mencatat pembayaran." };
  }

  const parsed = skemaPembayaran.safeParse({
    invoice_id: String(fd.get("invoice_id") ?? ""),
    jumlah: Number(String(fd.get("jumlah") ?? "0").replace(/[^\d]/g, "")),
    tanggal: String(fd.get("tanggal") ?? ""),
    metode: String(fd.get("metode") ?? "transfer"),
    catatan: String(fd.get("catatan") ?? ""),
    ttd_nama: String(fd.get("ttd_nama") ?? ""),
    ttd_jabatan: String(fd.get("ttd_jabatan") ?? ""),
  });

  if (!parsed.success) return { fieldErrors: petakan(parsed.error.issues) };

  const supabase = await createClient();
  const { error } = await supabase.from("payments").insert({
    ...parsed.data,
    company_id: profil.company_id,
    created_by: profil.id,
  });

  if (error) return { error: pesanDB(error.message) };

  revalidatePath(`/invoice/${parsed.data.invoice_id}`);
  revalidatePath("/invoice");
  return { sukses: true };
}

/**
 * Batalkan (hapus) satu pembayaran, mis. karena kendala/gagal.
 * Kuitansi terkait ikut terhapus (cascade) dan status invoice dihitung
 * ulang otomatis (mis. lunas → sebagian_dibayar / terkirim).
 */
export async function hapusPembayaran(id: string) {
  const profil = await wajibLogin();
  if (!boleh(profil.role, "catatPembayaran")) {
    return { error: "Anda tidak memiliki izin membatalkan pembayaran." };
  }

  const supabase = await createClient();
  const { data: bayar } = await supabase
    .from("payments")
    .select("invoice_id")
    .eq("id", id)
    .maybeSingle();

  // Lewat RPC agar cascade (kuitansi + transaksi) diizinkan lewat penanda sesi.
  const { error } = await supabase.rpc("batalkan_pembayaran", { p_payment: id });

  if (error) return { error: error.message.replace(/^.*?:\s*/, "") };

  if (bayar?.invoice_id) revalidatePath(`/invoice/${bayar.invoice_id}`);
  revalidatePath("/invoice");
  revalidatePath("/kuitansi");
  return { sukses: true };
}

export async function hapusInvoice(id: string) {
  const profil = await wajibLogin();
  if (!boleh(profil.role, "kelolaInvoice")) {
    return { error: "Anda tidak memiliki izin menghapus invoice." };
  }

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("invoices")
    .delete({ count: "exact" })
    .eq("id", id);

  if (error) return { error: pesanGagalHapus(error.code, error.message, "Invoice") };
  if (!count) {
    return {
      error: pesanTakTerhapus("Invoice", "Hanya invoice draft atau batal tanpa pembayaran yang dapat dihapus."),
    };
  }

  revalidatePath("/invoice");
  return { sukses: true };
}
