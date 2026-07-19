import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient, getProfil } from "@/lib/supabase/server";
import { boleh } from "@/lib/auth/permissions";
import { STATUS_PENAWARAN } from "@/lib/status";
import { DokumenPDF, type DataDokumenPDF } from "@/components/pdf/dokumen-pdf";
import { logoUntukPDF } from "@/lib/logo-pdf";
import { rentangJadwal } from "@/lib/jadwal";

// @react-pdf/renderer butuh API Node — bukan runtime Edge.
export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const profil = await getProfil();
  if (!profil) return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  if (!boleh(profil.role, "lihatPenawaran")) {
    return NextResponse.json({ error: "Tanpa izin." }, { status: 403 });
  }

  const supabase = await createClient();

  // RLS memutuskan: penawaran yang tidak boleh dilihat akan kembali kosong.
  const { data: q } = await supabase.from("quotations").select("*").eq("id", id).maybeSingle();
  if (!q) return NextResponse.json({ error: "Penawaran tidak ditemukan." }, { status: 404 });

  const [{ data: items }, { data: pelanggan }, { data: perusahaan }, { data: proyek }, { data: penyetuju }] =
    await Promise.all([
      supabase.from("quotation_items").select("*").eq("quotation_id", id).order("urutan"),
      supabase.from("customers").select("*").eq("id", q.customer_id).maybeSingle(),
      supabase.from("companies").select("*").eq("id", q.company_id).maybeSingle(),
      q.project_id
        ? supabase.from("projects").select("nama, lokasi, tanggal_mulai, tanggal_selesai").eq("id", q.project_id).maybeSingle()
        : Promise.resolve({ data: null }),
      q.disetujui_oleh
        ? supabase.from("users_profile").select("nama_lengkap").eq("id", q.disetujui_oleh).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

  const data: DataDokumenPDF = {
    jenis: "penawaran",
    nomor: q.nomor,
    statusLabel: STATUS_PENAWARAN[q.status as keyof typeof STATUS_PENAWARAN].label,
    tanggal: q.tanggal,
    tanggalKeduaLabel: "Berlaku hingga",
    tanggalKedua: q.berlaku_hingga,
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
    subtotal: Number(q.subtotal),
    diskon_persen: Number(q.diskon_persen),
    pajak_persen: Number(q.pajak_persen),
    total: Number(q.total),
    catatan: q.catatan,
    ditandatangani:
      penyetuju && q.disetujui_pada
        ? { oleh: penyetuju.nama_lengkap, pada: q.disetujui_pada }
        : null,
    penandaTangan: { nama: q.ttd_nama, jabatan: q.ttd_jabatan },
  };

  const berkas = await renderToBuffer(DokumenPDF({ data }));

  return new NextResponse(new Uint8Array(berkas), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${q.nomor}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
