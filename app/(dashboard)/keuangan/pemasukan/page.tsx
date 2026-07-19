import { createClient } from "@/lib/supabase/server";
import { wajibIzin } from "@/lib/auth/session";
import { boleh } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/ui/page-header";
import TransaksiClient from "../transaksi-client";
import type { Transaction, Project, Vendor, Attachment } from "@/types";

export const metadata = { title: "Pemasukan — Medhartara Production" };

export default async function PemasukanPage() {
  const profil = await wajibIzin("lihatKeuangan");
  const supabase = await createClient();

  const [{ data: transaksi }, { data: proyek }, { data: vendor }, { data: bukti }] =
    await Promise.all([
      supabase
        .from("transactions")
        .select("*")
        .eq("tipe", "pemasukan")
        .order("tanggal", { ascending: false }),
      supabase.from("projects").select("*").order("nama"),
      supabase.from("vendors").select("*").order("nama"),
      supabase.from("attachments").select("*").eq("entity_type", "transaction"),
    ]);

  return (
    <div>
      <PageHeader
        judul="Pemasukan"
        deskripsi="Pembayaran invoice tercatat otomatis; pemasukan lain dapat ditambahkan manual"
      />
      <TransaksiClient
        tipe="pemasukan"
        data={(transaksi as Transaction[]) ?? []}
        proyek={(proyek as Project[]) ?? []}
        vendor={(vendor as Vendor[]) ?? []}
        bukti={(bukti as Attachment[]) ?? []}
        companyId={profil.company_id ?? ""}
        peran={profil.role}
        bisaCatat={boleh(profil.role, "kelolaKeuangan")}
      />
    </div>
  );
}
