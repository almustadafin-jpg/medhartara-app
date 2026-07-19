import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { wajibIzin } from "@/lib/auth/session";
import { boleh } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import PenawaranClient from "./penawaran-client";
import type { Quotation, Customer, Project } from "@/types";

export const metadata = { title: "Penawaran — Medhartara Production" };

export default async function PenawaranPage() {
  const profil = await wajibIzin("lihatPenawaran");
  const supabase = await createClient();

  // RLS: PM hanya menerima penawaran proyeknya sendiri / buatannya.
  const [{ data: penawaran }, { data: pelanggan }, { data: proyek }] = await Promise.all([
    supabase.from("quotations").select("*").order("tanggal", { ascending: false }),
    supabase.from("customers").select("*").order("nama"),
    supabase.from("projects").select("*").order("nama"),
  ]);

  return (
    <div>
      <PageHeader
        judul="Penawaran"
        deskripsi="Penawaran harga dan status persetujuannya"
        aksi={
          boleh(profil.role, "kelolaPenawaran") ? (
            <Link href="/penawaran/baru">
              <Button>+ Penawaran Baru</Button>
            </Link>
          ) : undefined
        }
      />
      <PenawaranClient
        data={(penawaran as Quotation[]) ?? []}
        pelanggan={(pelanggan as Customer[]) ?? []}
        proyek={(proyek as Project[]) ?? []}
      />
    </div>
  );
}
