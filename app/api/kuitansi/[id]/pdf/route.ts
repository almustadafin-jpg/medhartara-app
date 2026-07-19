import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient, getProfil } from "@/lib/supabase/server";
import { boleh } from "@/lib/auth/permissions";
import { logoUntukPDF } from "@/lib/logo-pdf";
import { LABEL_METODE } from "@/lib/status";
import { KuitansiPDF, type DataKuitansiPDF } from "@/components/pdf/kuitansi-pdf";
import type { TxnMethod } from "@/types";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const profil = await getProfil();
  if (!profil) return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  if (!boleh(profil.role, "lihatKuitansi")) {
    return NextResponse.json({ error: "Tanpa izin." }, { status: 403 });
  }

  const supabase = await createClient();

  const { data: k } = await supabase.from("kuitansi").select("*").eq("id", id).maybeSingle();
  if (!k) return NextResponse.json({ error: "Kuitansi tidak ditemukan." }, { status: 404 });

  const { data: bayar } = await supabase
    .from("payments")
    .select("*")
    .eq("id", k.payment_id)
    .maybeSingle();

  if (!bayar) return NextResponse.json({ error: "Pembayaran tidak ditemukan." }, { status: 404 });

  // View ringkas dipakai agar sisa tagihan konsisten dengan halaman invoice.
  const [{ data: inv }, { data: perusahaan }] = await Promise.all([
    supabase.from("invoice_ringkas").select("*").eq("id", bayar.invoice_id).maybeSingle(),
    supabase.from("companies").select("*").eq("id", k.company_id).maybeSingle(),
  ]);

  const { data: pelanggan } = inv
    ? await supabase.from("customers").select("nama").eq("id", inv.customer_id).maybeSingle()
    : { data: null };

  const data: DataKuitansiPDF = {
    nomor: k.nomor,
    tanggal: k.tanggal,
    jumlah: Number(bayar.jumlah),
    metode: LABEL_METODE[bayar.metode as TxnMethod],
    untukPembayaran: k.untuk_pembayaran,
    dariPelanggan: pelanggan?.nama ?? "—",
    invoiceNomor: inv?.nomor ?? null,
    sisaTagihan: inv ? Number(inv.sisa_tagihan) : null,
    perusahaan: {
      nama: perusahaan?.nama ?? "Medhartara Production",
      alamat: perusahaan?.alamat ?? null,
      telepon: perusahaan?.telepon ?? null,
      email: perusahaan?.email ?? null,
      logo_url: logoUntukPDF(perusahaan?.logo_url),
    },
    penandaTangan: { nama: k.ttd_nama, jabatan: k.ttd_jabatan },
    // Kota diambil dari kata terakhir alamat perusahaan bila ada.
    kota: "Jakarta",
  };

  const berkas = await renderToBuffer(KuitansiPDF({ data }));

  return new NextResponse(new Uint8Array(berkas), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${k.nomor}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
