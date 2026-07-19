import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { wajibIzin } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/page-header";
import PenawaranForm from "../../penawaran-form";
import type { Quotation, QuotationItem, Customer, Project } from "@/types";

export default async function UbahPenawaranPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profil = await wajibIzin("kelolaPenawaran");
  const supabase = await createClient();

  const { data: penawaran } = await supabase
    .from("quotations")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!penawaran) notFound();
  const q = penawaran as Quotation;

  // Hanya draft yang dapat disunting (§9.1).
  if (q.status !== "draft") redirect(`/penawaran/${id}`);

  const [{ data: items }, { data: pelanggan }, { data: proyek }] = await Promise.all([
    supabase.from("quotation_items").select("*").eq("quotation_id", id).order("urutan"),
    supabase.from("customers").select("*").eq("aktif", true).order("nama"),
    supabase.from("projects").select("*").neq("status", "batal").order("nama"),
  ]);

  return (
    <div>
      <Link
        href={`/penawaran/${id}`}
        className="mb-4 inline-block text-sm text-slate-500 hover:text-slate-800"
      >
        ← Kembali ke penawaran
      </Link>
      <PageHeader judul={`Ubah ${q.nomor}`} deskripsi="Hanya penawaran berstatus draft yang dapat diubah" />
      <PenawaranForm
        penawaran={q}
        itemAwal={(items as QuotationItem[]) ?? []}
        pelanggan={(pelanggan as Customer[]) ?? []}
        proyek={(proyek as Project[]) ?? []}
        penandaTanganBawaan={profil.nama_lengkap}
      />
    </div>
  );
}
