import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { wajibIzin } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Tabel, Thead, Th, Td, Tr, KondisiKosong } from "@/components/ui/table";
import { STATUS_PROYEK, STATUS_PENAWARAN } from "@/lib/status";
import { formatIDR, formatTanggal, formatTanggalPendek } from "@/lib/format";
import type {
  Project, Customer, UsersProfile, Quotation, Transaction, ProfitProyek,
} from "@/types";

export default async function DetailProyekPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await wajibIzin("lihatProyek");
  const supabase = await createClient();

  const { data: proyek } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!proyek) notFound();
  const p = proyek as Project;

  const [{ data: pelanggan }, { data: pm }, { data: penawaran }, { data: profit }, { data: transaksi }] =
    await Promise.all([
      supabase.from("customers").select("*").eq("id", p.customer_id).maybeSingle(),
      p.pm_id
        ? supabase.from("users_profile").select("*").eq("id", p.pm_id).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase.from("quotations").select("*").eq("project_id", id).order("tanggal", { ascending: false }),
      supabase.from("project_profitability").select("*").eq("project_id", id).maybeSingle(),
      supabase
        .from("transactions")
        .select("*")
        .eq("project_id", id)
        .order("tanggal", { ascending: false }),
    ]);

  const daftarPenawaran = (penawaran as Quotation[]) ?? [];
  const daftarTransaksi = (transaksi as Transaction[]) ?? [];
  const biaya = daftarTransaksi.filter((t) => t.tipe === "pengeluaran");

  const f = (profit as ProfitProyek | null) ?? {
    total_pemasukan: 0,
    total_pengeluaran: 0,
    profit: 0,
  };
  const margin =
    Number(f.total_pemasukan) > 0
      ? (Number(f.profit) / Number(f.total_pemasukan)) * 100
      : 0;
  const nilaiDisetujui = daftarPenawaran
    .filter((q) => q.status === "disetujui" || q.status === "dikonversi")
    .reduce((s, q) => s + Number(q.total), 0);

  return (
    <div>
      <Link href="/proyek" className="mb-4 inline-block text-sm text-slate-500 hover:text-slate-800">
        ← Kembali ke daftar proyek
      </Link>

      <PageHeader
        judul={p.nama}
        deskripsi={`${p.kode ?? "—"} · ${(pelanggan as Customer | null)?.nama ?? "—"}`}
        aksi={<Badge warna={STATUS_PROYEK[p.status].warna}>{STATUS_PROYEK[p.status].label}</Badge>}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Kartu judul="Penanggung Jawab" nilai={(pm as UsersProfile | null)?.nama_lengkap ?? "Belum ditugaskan"} />
        <Kartu
          judul="Periode"
          nilai={`${formatTanggal(p.tanggal_mulai)} – ${formatTanggal(p.tanggal_selesai)}`}
        />
        <Kartu judul="Lokasi Acara" nilai={p.lokasi ?? "Belum diisi"} />
        <Kartu
          judul="Nilai Kontrak"
          nilai={p.nilai_kontrak ? formatIDR(p.nilai_kontrak) : "Belum ditetapkan"}
        />
      </div>

      {p.deskripsi && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-slate-700">Deskripsi</h3>
          <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{p.deskripsi}</p>
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Kartu judul="Pemasukan" nilai={formatIDR(f.total_pemasukan)} />
        <Kartu judul="Pengeluaran" nilai={formatIDR(f.total_pengeluaran)} />
        <div
          className={`rounded-xl border p-5 ${
            Number(f.profit) >= 0
              ? "border-emerald-200 bg-emerald-50"
              : "border-red-200 bg-red-50"
          }`}
        >
          <p className="text-xs text-slate-500">Profit</p>
          <p
            className={`mt-1 text-lg font-semibold ${
              Number(f.profit) >= 0 ? "text-emerald-700" : "text-red-700"
            }`}
          >
            {formatIDR(f.profit)}
          </p>
          <p className="text-xs text-slate-500">margin {margin.toFixed(1)}%</p>
        </div>
      </div>

      <p className="mt-2 text-xs text-slate-400">
        Profit dihitung dari kas tercatat (pemasukan − pengeluaran), bukan akrual.
      </p>

      <div className="mt-6">
        <h3 className="mb-3 text-sm font-semibold text-slate-700">Biaya Proyek</h3>
        <Tabel>
          <Thead>
            <Tr>
              <Th>Tanggal</Th>
              <Th>Keterangan</Th>
              <Th>Kategori</Th>
              <Th className="text-right">Jumlah</Th>
            </Tr>
          </Thead>
          <tbody>
            {biaya.length === 0 ? (
              <KondisiKosong kolom={4} pesan="Belum ada biaya tercatat untuk proyek ini." />
            ) : (
              biaya.map((t) => (
                <Tr key={t.id}>
                  <Td className="text-xs text-slate-500">{formatTanggalPendek(t.tanggal)}</Td>
                  <Td>{t.deskripsi ?? "—"}</Td>
                  <Td className="text-slate-500">{t.kategori ?? "—"}</Td>
                  <Td className="text-right text-red-600">{formatIDR(t.jumlah)}</Td>
                </Tr>
              ))
            )}
          </tbody>
        </Tabel>
      </div>

      <div className="mt-6">
        <div className="mb-3 flex items-baseline justify-between">
          <h3 className="text-sm font-semibold text-slate-700">Penawaran Proyek Ini</h3>
          <p className="text-sm text-slate-500">
            Nilai disetujui:{" "}
            <span className="font-semibold text-slate-900">{formatIDR(nilaiDisetujui)}</span>
          </p>
        </div>

        <Tabel>
          <Thead>
            <Tr>
              <Th>Nomor</Th>
              <Th>Tanggal</Th>
              <Th className="text-right">Total</Th>
              <Th>Status</Th>
            </Tr>
          </Thead>
          <tbody>
            {daftarPenawaran.length === 0 ? (
              <KondisiKosong kolom={4} pesan="Belum ada penawaran untuk proyek ini." />
            ) : (
              daftarPenawaran.map((q) => (
                <Tr key={q.id}>
                  <Td>
                    <Link href={`/penawaran/${q.id}`} className="font-medium hover:underline">
                      {q.nomor}
                    </Link>
                  </Td>
                  <Td className="text-slate-500">{formatTanggal(q.tanggal)}</Td>
                  <Td className="text-right">{formatIDR(q.total)}</Td>
                  <Td>
                    <Badge warna={STATUS_PENAWARAN[q.status].warna}>
                      {STATUS_PENAWARAN[q.status].label}
                    </Badge>
                  </Td>
                </Tr>
              ))
            )}
          </tbody>
        </Tabel>
      </div>

    </div>
  );
}

function Kartu({ judul, nilai }: { judul: string; nilai: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <p className="text-xs text-slate-500">{judul}</p>
      <p className="mt-1 text-sm font-medium text-slate-900">{nilai}</p>
    </div>
  );
}
