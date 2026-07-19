import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { wajibIzin } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/page-header";
import InvoiceForm from "../../invoice-form";
import type { Invoice, InvoiceItem, Customer, Project } from "@/types";

export default async function UbahInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profil = await wajibIzin("kelolaInvoice");
  const supabase = await createClient();

  const { data: invoice } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!invoice) notFound();
  const inv = invoice as Invoice;

  // Invoice yang sudah diterbitkan tidak boleh disunting (§9.2).
  if (inv.status !== "draft") redirect(`/invoice/${id}`);

  const [{ data: items }, { data: pelanggan }, { data: proyek }] = await Promise.all([
    supabase.from("invoice_items").select("*").eq("invoice_id", id).order("urutan"),
    supabase.from("customers").select("*").eq("aktif", true).order("nama"),
    supabase.from("projects").select("*").neq("status", "batal").order("nama"),
  ]);

  return (
    <div>
      <Link
        href={`/invoice/${id}`}
        className="mb-4 inline-block text-sm text-slate-500 hover:text-slate-800"
      >
        ← Kembali ke invoice
      </Link>
      <PageHeader
        judul={`Ubah ${inv.nomor}`}
        deskripsi="Hanya invoice berstatus draft yang dapat diubah"
      />
      <InvoiceForm
        invoice={inv}
        itemAwal={(items as InvoiceItem[]) ?? []}
        pelanggan={(pelanggan as Customer[]) ?? []}
        proyek={(proyek as Project[]) ?? []}
        penandaTanganBawaan={profil.nama_lengkap}
      />
    </div>
  );
}
