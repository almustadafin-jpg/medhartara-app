import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { wajibIzin } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/page-header";
import BoqForm from "../../boq-form";
import type { Boq, BoqItem, Customer, Project } from "@/types";

export default async function UbahBoqPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profil = await wajibIzin("kelolaBOQ");
  const supabase = await createClient();

  const { data: boq } = await supabase.from("boq").select("*").eq("id", id).maybeSingle();
  if (!boq) notFound();
  const b = boq as Boq;

  // Setelah diajukan, isinya terkunci — sama seperti aturan di database.
  if (!["draft", "ditolak"].includes(b.status)) redirect(`/boq/${id}`);

  const [{ data: items }, { data: pelanggan }, { data: proyek }] = await Promise.all([
    supabase.from("boq_items").select("*").eq("boq_id", id).order("urutan"),
    supabase.from("customers").select("*").eq("aktif", true).order("nama"),
    supabase.from("projects").select("*").neq("status", "batal").order("nama"),
  ]);

  const daftarProyek = (proyek as Project[]) ?? [];

  return (
    <div>
      <Link href={`/boq/${id}`} className="mb-4 inline-block text-sm text-slate-500 hover:text-slate-800">
        ← Kembali ke BOQ
      </Link>
      <PageHeader judul={`Ubah ${b.nomor}`} deskripsi="Hanya BOQ draft atau ditolak yang dapat diubah" />
      <BoqForm
        peran={profil.role}
        boq={b}
        itemAwal={(items as BoqItem[]) ?? []}
        pelanggan={(pelanggan as Customer[]) ?? []}
        proyek={
          profil.role === "pm" ? daftarProyek.filter((p) => p.pm_id === profil.id) : daftarProyek
        }
      />
    </div>
  );
}
