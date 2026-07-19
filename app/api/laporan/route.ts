import { NextResponse, type NextRequest } from "next/server";
import { createClient, getProfil } from "@/lib/supabase/server";
import { boleh } from "@/lib/auth/permissions";
import { buatCSV, namaBerkasLaporan } from "@/lib/csv";
import { formatTanggal } from "@/lib/format";

/**
 * Ekspor laporan periode sebagai CSV.
 * Memakai client biasa, jadi RLS tetap memfilter baris sesuai peran.
 */
export async function GET(request: NextRequest) {
  const profil = await getProfil();
  if (!profil) {
    return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  }
  if (!boleh(profil.role, "lihatLaporan")) {
    return NextResponse.json({ error: "Tanpa izin." }, { status: 403 });
  }

  const { searchParams } = request.nextUrl;
  const dari = searchParams.get("dari") ?? "";
  const sampai = searchParams.get("sampai") ?? "";

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dari) || !/^\d{4}-\d{2}-\d{2}$/.test(sampai)) {
    return NextResponse.json({ error: "Rentang tanggal tidak valid." }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: transaksi, error } = await supabase
    .from("transactions")
    .select("tanggal, tipe, kategori, metode, jumlah, deskripsi, project_id, vendor_id")
    .gte("tanggal", dari)
    .lte("tanggal", sampai)
    .order("tanggal");

  if (error) {
    return NextResponse.json({ error: "Gagal mengambil data." }, { status: 500 });
  }

  const [{ data: proyek }, { data: vendor }] = await Promise.all([
    supabase.from("projects").select("id, nama"),
    supabase.from("vendors").select("id, nama"),
  ]);

  const petaProyek = new Map((proyek ?? []).map((p) => [p.id, p.nama]));
  const petaVendor = new Map((vendor ?? []).map((v) => [v.id, v.nama]));

  const baris = (transaksi ?? []).map((t) => [
    formatTanggal(t.tanggal),
    t.tipe,
    t.kategori ?? "",
    t.metode,
    t.project_id ? petaProyek.get(t.project_id) ?? "" : "",
    t.vendor_id ? petaVendor.get(t.vendor_id) ?? "" : "",
    t.deskripsi ?? "",
    Number(t.jumlah),
  ]);

  const csv = buatCSV(
    ["Tanggal", "Tipe", "Kategori", "Metode", "Proyek", "Vendor", "Keterangan", "Jumlah"],
    baris,
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${namaBerkasLaporan(dari, sampai)}"`,
      "Cache-Control": "no-store",
    },
  });
}
