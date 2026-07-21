import { createClient } from "@/lib/supabase/server";
import { wajibIzin } from "@/lib/auth/session";
import { boleh } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/ui/page-header";
import TransaksiClient from "../transaksi-client";
import type { Transaction, Project, Vendor, Attachment } from "@/types";

export const metadata = { title: "Pengeluaran — Medhartara Production" };

export default async function PengeluaranPage() {
  const profil = await wajibIzin("catatPengeluaran");
  const supabase = await createClient();

  // RLS: PM hanya menerima transaksi proyek yang ia pegang.
  const [{ data: transaksi }, { data: proyek }, { data: vendor }, { data: bukti }] =
    await Promise.all([
      supabase
        .from("transactions")
        .select("*")
        .eq("tipe", "pengeluaran")
        .order("tanggal", { ascending: false }),
      supabase.from("projects").select("*").order("nama"),
      supabase.from("vendors").select("*").eq("aktif", true).order("nama"),
      supabase.from("attachments").select("*").eq("entity_type", "transaction"),
    ]);

  const daftarProyek = (proyek as Project[]) ?? [];

  return (
    <div>
      <PageHeader
        judul="Pengeluaran"
        deskripsi="Biaya proyek dan operasional, lengkap dengan bukti transaksi"
      />
      <TransaksiClient
        tipe="pengeluaran"
        data={(transaksi as Transaction[]) ?? []}
        proyek={
          profil.role === "pm"
            ? daftarProyek.filter((p) => p.pm_id === profil.id)
            : daftarProyek
        }
        vendor={(vendor as Vendor[]) ?? []}
        bukti={(bukti as Attachment[]) ?? []}
        companyId={profil.company_id ?? ""}
        peran={profil.role}
        bisaCatat={boleh(profil.role, "catatPengeluaran")}
        bisaHapus={boleh(profil.role, "kelolaKeuangan")}
      />
    </div>
  );
}
