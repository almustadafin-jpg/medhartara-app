import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient, getProfil } from "@/lib/supabase/server";
import { boleh } from "@/lib/auth/permissions";
import { STATUS_INVOICE, LABEL_METODE } from "@/lib/status";
import { DokumenPDF, type DataDokumenPDF } from "@/components/pdf/dokumen-pdf";
import { logoUntukPDF } from "@/lib/logo-pdf";
import { rentangJadwal } from "@/lib/jadwal";
import type { TxnMethod } from "@/types";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const profil = await getProfil();
  if (!profil) return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  if (!boleh(profil.role, "lihatInvoice")) {
    return NextResponse.json({ error: "Tanpa izin." }, { status: 403 });
  }

  const supabase = await createClient();

  // View ringkas sudah memuat sisa tagihan & status efektif.
  const { data: inv } = await supabase
    .from("invoice_ringkas")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!inv) return NextResponse.json({ error: "Invoice tidak ditemukan." }, { status: 404 });

  const [{ data: items }, { data: pembayaran }, { data: pelanggan }, { data: perusahaan }, { data: proyek }] =
    await Promise.all([
      supabase.from("invoice_items").select("*").eq("invoice_id", id).order("urutan"),
      supabase.from("payments").select("*").eq("invoice_id", id).order("tanggal"),
      supabase.from("customers").select("*").eq("id", inv.customer_id).maybeSingle(),
      supabase.from("companies").select("*").eq("id", inv.company_id).maybeSingle(),
      inv.project_id
        ? supabase.from("projects").select("nama, lokasi, tanggal_mulai, tanggal_selesai").eq("id", inv.project_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

  const data: DataDokumenPDF = {
    jenis: "invoice",
    nomor: inv.nomor,
    statusLabel: STATUS_INVOICE[inv.status_efektif as keyof typeof STATUS_INVOICE].label,
    tanggal: inv.tanggal,
    tanggalKeduaLabel: "Jatuh tempo",
    tanggalKedua: inv.jatuh_tempo,
    perusahaan: {
      nama: perusahaan?.nama ?? "Medhartara Production",
      alamat: perusahaan?.alamat ?? null,
      telepon: perusahaan?.telepon ?? null,
      email: perusahaan?.email ?? null,
      npwp: perusahaan?.npwp ?? null,
      logo_url: logoUntukPDF(perusahaan?.logo_url),
      bank_nama: perusahaan?.bank_nama ?? null,
      bank_rekening: perusahaan?.bank_rekening ?? null,
      bank_atas_nama: perusahaan?.bank_atas_nama ?? null,
    },
    pelanggan: {
      nama: pelanggan?.nama ?? "—",
      narahubung: pelanggan?.narahubung ?? null,
      alamat: pelanggan?.alamat ?? null,
      npwp: pelanggan?.npwp ?? null,
    },
    proyek: proyek?.nama ?? null,
    lokasi: proyek?.lokasi ?? null,
    jadwal: rentangJadwal(proyek?.tanggal_mulai, proyek?.tanggal_selesai),
    items: (items ?? []).map((it) => ({
      deskripsi: it.deskripsi,
      kuantitas: Number(it.kuantitas),
      satuan: it.satuan,
      harga_satuan: Number(it.harga_satuan),
      subtotal: Number(it.subtotal),
    })),
    subtotal: Number(inv.subtotal),
    diskon_persen: Number(inv.diskon_persen),
    pajak_persen: Number(inv.pajak_persen),
    total: Number(inv.total),
    dibayar: Number(inv.total_dibayar),
    sisa: Number(inv.sisa_tagihan),
    pembayaran: (pembayaran ?? []).map((p) => ({
      termin_ke: p.termin_ke,
      tanggal: p.tanggal,
      metode: LABEL_METODE[p.metode as TxnMethod],
      jumlah: Number(p.jumlah),
    })),
    catatan: inv.catatan,
    ditandatangani: null,
    // Invoice hasil konversi penawaran tidak membawa penanda tangan; agar
    // blok tanda tangan tetap tercetak, jatuh ke nama perusahaan.
    penandaTangan: {
      nama: inv.ttd_nama || perusahaan?.ttd_nama || perusahaan?.nama || "Medhartara Production",
      jabatan: inv.ttd_jabatan || perusahaan?.ttd_jabatan || "Direktur",
    },
  };

  const berkas = await renderToBuffer(DokumenPDF({ data }));

  return new NextResponse(new Uint8Array(berkas), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${inv.nomor}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
