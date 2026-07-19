import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { wajibIzin } from "@/lib/auth/session";
import { boleh } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import InvoiceClient from "./invoice-client";
import type { InvoiceRingkas, Customer, Project } from "@/types";

export const metadata = { title: "Invoice — Medhartara Production" };

export default async function InvoicePage() {
  const profil = await wajibIzin("lihatInvoice");
  const supabase = await createClient();

  // View `invoice_ringkas` sudah memuat total dibayar, sisa, dan status efektif.
  const [{ data: invoice }, { data: pelanggan }, { data: proyek }] = await Promise.all([
    supabase.from("invoice_ringkas").select("*").order("tanggal", { ascending: false }),
    supabase.from("customers").select("*").order("nama"),
    supabase.from("projects").select("*").order("nama"),
  ]);

  return (
    <div>
      <PageHeader
        judul="Invoice"
        deskripsi="Tagihan, pembayaran termin, dan sisa piutang"
        aksi={
          boleh(profil.role, "kelolaInvoice") ? (
            <Link href="/invoice/baru">
              <Button>+ Invoice Baru</Button>
            </Link>
          ) : undefined
        }
      />
      <InvoiceClient
        data={(invoice as InvoiceRingkas[]) ?? []}
        pelanggan={(pelanggan as Customer[]) ?? []}
        proyek={(proyek as Project[]) ?? []}
      />
    </div>
  );
}
