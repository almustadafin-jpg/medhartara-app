import { NextResponse, type NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient, getProfil } from "@/lib/supabase/server";
import { boleh } from "@/lib/auth/permissions";
import { STATUS_BOQ } from "@/lib/status";
import { logoUntukPDF } from "@/lib/logo-pdf";
import { rentangJadwal } from "@/lib/jadwal";
import { BoqPDF, type DataBoqPDF, type BarisBoqPDF } from "@/components/pdf/boq-pdf";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const profil = await getProfil();
  if (!profil) return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  if (!boleh(profil.role, "lihatBOQ")) {
    return NextResponse.json({ error: "Tanpa izin." }, { status: 403 });
  }

  const versi = request.nextUrl.searchParams.get("versi") === "internal" ? "internal" : "klien";

  const supabase = await createClient();

  const { data: boq } = await supabase.from("boq").select("*").eq("id", id).maybeSingle();
  if (!boq) return NextResponse.json({ error: "BOQ tidak ditemukan." }, { status: 404 });

  const [{ data: items }, { data: pelanggan }, { data: proyek }, { data: perusahaan }, { data: penyetuju }] =
    await Promise.all([
      supabase.from("boq_items").select("*").eq("boq_id", id).order("urutan"),
      boq.customer_id
        ? supabase.from("customers").select("nama").eq("id", boq.customer_id).maybeSingle()
        : Promise.resolve({ data: null }),
      boq.project_id
        ? supabase.from("projects").select("nama, lokasi, tanggal_mulai, tanggal_selesai").eq("id", boq.project_id).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase.from("companies").select("*").eq("id", boq.company_id).maybeSingle(),
      boq.disetujui_oleh
        ? supabase.from("users_profile").select("nama_lengkap").eq("id", boq.disetujui_oleh).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

  const data: DataBoqPDF = {
    versi,
    nomor: boq.nomor,
    judul: boq.judul,
    statusLabel: STATUS_BOQ[boq.status as keyof typeof STATUS_BOQ].label,
    tanggal: boq.tanggal,
    perusahaan: {
      nama: perusahaan?.nama ?? "Medhartara Production",
      alamat: perusahaan?.alamat ?? null,
      telepon: perusahaan?.telepon ?? null,
      email: perusahaan?.email ?? null,
      npwp: perusahaan?.npwp ?? null,
      logo_url: logoUntukPDF(perusahaan?.logo_url),
    },
    pelanggan: pelanggan?.nama ?? null,
    proyek: proyek?.nama ?? null,
    lokasi: proyek?.lokasi ?? null,
    jadwal: rentangJadwal(proyek?.tanggal_mulai, proyek?.tanggal_selesai),
    items: (items ?? []).map(
      (it): BarisBoqPDF => ({
        kategori: it.kategori,
        nama: it.nama,
        deskripsi: it.deskripsi,
        kuantitas: Number(it.kuantitas),
        satuan: it.satuan,
        hari: Number(it.hari),
        waktu: Number(it.waktu ?? 1),
        harga_modal: Number(it.harga_modal),
        harga_jual: Number(it.harga_jual),
        keterangan: it.keterangan ?? null,
        subtotal_modal: Number(it.subtotal_modal),
        subtotal_jual: Number(it.subtotal_jual),
      }),
    ),
    total_modal: Number(boq.total_modal),
    total_jual: Number(boq.total_jual),
    catatan: boq.catatan,
    disetujui:
      penyetuju && boq.disetujui_pada
        ? { oleh: penyetuju.nama_lengkap, pada: boq.disetujui_pada }
        : null,
  };

  const berkas = await renderToBuffer(BoqPDF({ data }));

  return new NextResponse(new Uint8Array(berkas), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${boq.nomor}-${versi}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
