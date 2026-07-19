import { createClient } from "@/lib/supabase/server";
import { wajibIzin } from "@/lib/auth/session";
import { boleh } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/ui/page-header";
import ProyekClient from "./proyek-client";
import type { Project, Customer, UsersProfile } from "@/types";

export const metadata = { title: "Proyek — Medhartara Production" };

export default async function ProyekPage() {
  const profil = await wajibIzin("lihatProyek");
  const supabase = await createClient();

  // RLS membatasi baris; PM tetap dapat melihat daftar proyek perusahaan.
  const [{ data: proyek }, { data: pelanggan }, { data: pengguna }] = await Promise.all([
    supabase.from("projects").select("*").order("created_at", { ascending: false }),
    supabase.from("customers").select("*").eq("aktif", true).order("nama"),
    supabase.from("users_profile").select("*").eq("aktif", true).order("nama_lengkap"),
  ]);

  return (
    <div>
      <PageHeader
        judul="Proyek"
        deskripsi="Seluruh proyek beserta status dan penanggung jawabnya"
      />
      <ProyekClient
        data={(proyek as Project[]) ?? []}
        pelanggan={(pelanggan as Customer[]) ?? []}
        pengguna={(pengguna as UsersProfile[]) ?? []}
        bisaKelola={boleh(profil.role, "kelolaProyek")}
        peran={profil.role}
        idSaya={profil.id}
      />
      <p className="mt-4 text-xs text-slate-400">
        Kode proyek dibuat otomatis oleh database saat penyimpanan pertama.
      </p>
    </div>
  );
}
