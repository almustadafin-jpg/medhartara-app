import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { wajibIzin } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/page-header";
import BoqForm from "../boq-form";
import type { Customer, Project } from "@/types";

export const metadata = { title: "BOQ Baru — Medhartara Production" };

export default async function BoqBaruPage() {
  const profil = await wajibIzin("kelolaBOQ");
  const supabase = await createClient();

  const [{ data: pelanggan }, { data: proyek }] = await Promise.all([
    supabase.from("customers").select("*").eq("aktif", true).order("nama"),
    supabase.from("projects").select("*").neq("status", "batal").order("nama"),
  ]);

  const daftarProyek = (proyek as Project[]) ?? [];

  return (
    <div>
      <Link href="/boq" className="mb-4 inline-block text-sm text-slate-500 hover:text-slate-800">
        ← Kembali ke daftar BOQ
      </Link>
      <PageHeader judul="BOQ Baru" deskripsi="Nomor dibuat otomatis saat disimpan" />
      <BoqForm
        pelanggan={(pelanggan as Customer[]) ?? []}
        proyek={
          profil.role === "pm"
            ? daftarProyek.filter((p) => p.pm_id === profil.id)
            : daftarProyek
        }
      />
    </div>
  );
}
