import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { wajibIzin } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/page-header";
import InvoiceForm from "../invoice-form";
import type { Customer, Project } from "@/types";

export const metadata = { title: "Invoice Baru — Medhartara Production" };

export default async function InvoiceBaruPage() {
  const profil = await wajibIzin("kelolaInvoice");
  const supabase = await createClient();

  const [{ data: pelanggan }, { data: proyek }] = await Promise.all([
    supabase.from("customers").select("*").eq("aktif", true).order("nama"),
    supabase.from("projects").select("*").neq("status", "batal").order("nama"),
  ]);

  return (
    <div>
      <Link href="/invoice" className="mb-4 inline-block text-sm text-slate-500 hover:text-slate-800">
        ← Kembali ke daftar invoice
      </Link>
      <PageHeader
        judul="Invoice Baru"
        deskripsi="Invoice manual. Untuk tagihan dari penawaran, gunakan tombol Konversi di halaman penawaran."
      />
      <InvoiceForm
        pelanggan={(pelanggan as Customer[]) ?? []}
        proyek={(proyek as Project[]) ?? []}
        penandaTanganBawaan={profil.nama_lengkap}
      />
    </div>
  );
}
