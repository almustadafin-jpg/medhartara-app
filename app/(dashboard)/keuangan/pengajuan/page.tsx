import { createClient } from "@/lib/supabase/server";
import { wajibIzin } from "@/lib/auth/session";
import { boleh } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/ui/page-header";
import PengajuanClient from "./pengajuan-client";
import type { PaymentRequest, Project, Vendor } from "@/types";

export const metadata = { title: "Pengajuan Pembayaran — Medhartara Production" };

export default async function PengajuanPage() {
  const profil = await wajibIzin("lihatPengajuan");
  const supabase = await createClient();

  const [{ data: pengajuan }, { data: proyek }, { data: vendor }, { data: orang }] =
    await Promise.all([
      supabase.from("payment_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("projects").select("*").neq("status", "batal").order("nama"),
      supabase.from("vendors").select("*").order("nama"),
      supabase.from("users_profile").select("id, nama_lengkap"),
    ]);

  const namaOrang: Record<string, string> = {};
  for (const u of (orang as { id: string; nama_lengkap: string }[]) ?? []) {
    namaOrang[u.id] = u.nama_lengkap;
  }

  const daftarProyek = (proyek as Project[]) ?? [];

  return (
    <div>
      <PageHeader
        judul="Pengajuan Pembayaran"
        deskripsi="Ajukan pembayaran proyek — vendor, tenaga lepas, dan biaya proyek lain. Tercatat sebagai pengeluaran setelah disetujui Admin/Finance."
      />
      <PengajuanClient
        data={(pengajuan as PaymentRequest[]) ?? []}
        proyek={daftarProyek}
        vendor={(vendor as Vendor[]) ?? []}
        namaOrang={namaOrang}
        peran={profil.role}
        idSaya={profil.id}
        bisaAjukan={boleh(profil.role, "ajukanPembayaran")}
        bisaTinjau={boleh(profil.role, "tinjauPengajuan")}
      />
    </div>
  );
}
