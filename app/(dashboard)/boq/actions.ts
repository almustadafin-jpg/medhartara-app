"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { wajibLogin } from "@/lib/auth/session";
import { boleh } from "@/lib/auth/permissions";
import { pesanGagalHapus, pesanTakTerhapus } from "@/lib/hapus";
import { skemaBoq } from "@/lib/validations/boq";
import type { BoqStatus } from "@/types";

export type FormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  sukses?: boolean;
};

function petakan(issues: { path: (string | number)[]; message: string }[]) {
  const f: Record<string, string> = {};
  for (const i of issues) {
    const k =
      i.path.length > 1 ? `${String(i.path[0])}.${String(i.path[1])}` : String(i.path[0] ?? "_");
    if (!f[k]) f[k] = i.message;
  }
  return f;
}

const pesanDB = (p: string) => p.replace(/^.*?(?:ERROR|error):\s*/, "").trim();
const angka = (v: FormDataEntryValue | null) =>
  Number(String(v ?? "0").replace(/[^\d.]/g, "")) || 0;

function bacaItems(fd: FormData) {
  const kategori = fd.getAll("item_kategori").map(String);
  const nama = fd.getAll("item_nama").map(String);
  const deskripsi = fd.getAll("item_deskripsi").map(String);
  const kuantitas = fd.getAll("item_kuantitas").map(String);
  const satuan = fd.getAll("item_satuan").map(String);
  const hari = fd.getAll("item_hari").map(String);
  const modal = fd.getAll("item_modal").map(String);
  const jual = fd.getAll("item_jual").map(String);

  return nama
    .map((n, i) => ({
      kategori: (kategori[i] ?? "").trim() || undefined,
      nama: n.trim(),
      deskripsi: (deskripsi[i] ?? "").trim() || undefined,
      kuantitas: Number(String(kuantitas[i] ?? "1").replace(",", ".")) || 0,
      satuan: (satuan[i] ?? "").trim() || undefined,
      hari: Number(String(hari[i] ?? "1").replace(",", ".")) || 0,
      harga_modal: Number((modal[i] ?? "0").replace(/[^\d]/g, "")),
      harga_jual: Number((jual[i] ?? "0").replace(/[^\d]/g, "")),
    }))
    .filter((it) => it.nama !== "");
}

export async function simpanBoq(_prev: FormState, fd: FormData): Promise<FormState> {
  const profil = await wajibLogin();
  if (!boleh(profil.role, "kelolaBOQ")) {
    return { error: "Anda tidak memiliki izin menyusun BOQ." };
  }

  const parsed = skemaBoq.safeParse({
    judul: String(fd.get("judul") ?? ""),
    customer_id: String(fd.get("customer_id") ?? ""),
    project_id: String(fd.get("project_id") ?? ""),
    tanggal: String(fd.get("tanggal") ?? ""),
    catatan: String(fd.get("catatan") ?? ""),
    items: bacaItems(fd),
  });

  if (!parsed.success) return { fieldErrors: petakan(parsed.error.issues) };

  const supabase = await createClient();
  const id = String(fd.get("id") ?? "");
  const { items, ...induk } = parsed.data;

  let boqId = id;

  if (id) {
    const { data: lama } = await supabase.from("boq").select("status").eq("id", id).maybeSingle();
    if (!lama) return { error: "BOQ tidak ditemukan." };
    if (!["draft", "ditolak", "diajukan"].includes(lama.status)) {
      return { error: `BOQ berstatus ${lama.status} tidak dapat diubah.` };
    }

    // Menyunting BOQ yang sudah diajukan mengembalikannya ke draft,
    // supaya perubahan wajib diajukan & ditinjau ulang.
    const indukSimpan =
      lama.status === "diajukan" ? { ...induk, status: "draft" as BoqStatus } : induk;

    const { error } = await supabase.from("boq").update(indukSimpan).eq("id", id);
    if (error) return { error: pesanDB(error.message) };

    await supabase.from("boq_items").delete().eq("boq_id", id);
  } else {
    const { data: nomor, error: errNomor } = await supabase.rpc("next_document_number", {
      p_company: profil.company_id,
      p_jenis: "boq",
      p_prefix: "BOQ",
    });
    if (errNomor || !nomor) return { error: "Gagal membuat nomor BOQ." };

    const { data: baru, error } = await supabase
      .from("boq")
      .insert({
        ...induk,
        nomor,
        company_id: profil.company_id,
        created_by: profil.id,
        status: "draft" as BoqStatus,
      })
      .select("id")
      .single();

    if (error || !baru) return { error: pesanDB(error?.message ?? "Gagal membuat BOQ.") };
    boqId = baru.id;
  }

  const { error: errItem } = await supabase
    .from("boq_items")
    .insert(items.map((it, urutan) => ({ ...it, boq_id: boqId, urutan })));

  if (errItem) return { error: "BOQ tersimpan, tetapi item gagal disimpan." };

  revalidatePath("/boq");
  redirect(`/boq/${boqId}`);
}

export async function ubahStatusBoq(id: string, status: BoqStatus) {
  const profil = await wajibLogin();

  const perluWewenang = status === "disetujui" || status === "ditolak";
  if (!boleh(profil.role, perluWewenang ? "setujuiBOQ" : "kelolaBOQ")) {
    return { error: "Anda tidak memiliki izin untuk aksi ini." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("boq").update({ status }).eq("id", id);
  if (error) return { error: pesanDB(error.message) };

  revalidatePath("/boq");
  revalidatePath(`/boq/${id}`);
  return { sukses: true };
}

/**
 * Menarik BOQ disetujui menjadi penawaran.
 * Seluruh langkah dijalankan satu fungsi atomik di database —
 * hanya `harga_jual` yang ikut, modal tidak pernah bocor ke penawaran.
 */
export async function tarikKePenawaran(id: string) {
  const profil = await wajibLogin();
  if (!boleh(profil.role, "kelolaPenawaran")) {
    return { error: "Anda tidak berwenang membuat penawaran." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("buat_penawaran_dari_boq", {
    p_boq: id,
    p_berlaku_hingga: null,
  });

  if (error) return { error: error.message.replace(/^.*?:\s*/, "") };

  revalidatePath("/boq");
  revalidatePath("/penawaran");
  return { sukses: true, penawaranId: data as string };
}

void angka;

export async function hapusBoq(id: string) {
  const profil = await wajibLogin();
  if (!boleh(profil.role, "kelolaBOQ")) {
    return { error: "Anda tidak memiliki izin menghapus BOQ." };
  }

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("boq")
    .delete({ count: "exact" })
    .eq("id", id);

  if (error) return { error: pesanGagalHapus(error.code, error.message, "BOQ") };
  if (!count) {
    return {
      error: pesanTakTerhapus("BOQ", "Hanya BOQ berstatus draft atau ditolak yang dapat dihapus."),
    };
  }

  revalidatePath("/boq");
  return { sukses: true };
}
