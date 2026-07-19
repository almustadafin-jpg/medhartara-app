import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { wajibIzin } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/page-header";
import PenawaranForm from "../penawaran-form";
import type { Customer, Project } from "@/types";

export const metadata = { title: "Penawaran Baru — Medhartara Production" };

export default async function PenawaranBaruPage() {
  const profil = await wajibIzin("kelolaPenawaran");
  const supabase = await createClient();

  const [{ data: pelanggan }, { data: proyek }] = await Promise.all([
    supabase.from("customers").select("*").eq("aktif", true).order("nama"),
    supabase.from("projects").select("*").neq("status", "batal").order("nama"),
  ]);

  return (
    <div>
      <Link href="/penawaran" className="mb-4 inline-block text-sm text-slate-500 hover:text-slate-800">
        ← Kembali ke daftar penawaran
      </Link>
      <PageHeader
        judul="Penawaran Baru"
        deskripsi="Nomor penawaran dibuat otomatis saat disimpan"
      />
      <PenawaranForm
        pelanggan={(pelanggan as Customer[]) ?? []}
        proyek={(proyek as Project[]) ?? []}
        penandaTanganBawaan={profil.nama_lengkap}
      />
    </div>
  );
}
