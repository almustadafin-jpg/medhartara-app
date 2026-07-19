import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { wajibIzin } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/page-header";
import { KartuMetrik } from "@/components/ui/kartu-metrik";
import { Tabel, Thead, Th, Td, Tr, KondisiKosong } from "@/components/ui/table";
import { formatIDR, formatTanggal } from "@/lib/format";
import FilterPeriode from "./filter-periode";

export const metadata = { title: "Laporan — Medhartara Production" };

interface Rekap {
  tipe: "pemasukan" | "pengeluaran";
  kategori: string;
  total: number;
  jumlah: number;
}

interface ProfitPeriode {
  project_id: string;
  nama: string;
  kode: string | null;
  pemasukan: number;
  pengeluaran: number;
  profit: number;
}

const awalTahun = () => `${new Date().getFullYear()}-01-01`;
const hariIni = () => new Date().toISOString().slice(0, 10);
const validTanggal = (v: string | undefined) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);

export default async function LaporanPage({
  searchParams,
}: {
  searchParams: Promise<{ dari?: string; sampai?: string }>;
}) {
  await wajibIzin("lihatLaporan");
  const sp = await searchParams;

  const dari = validTanggal(sp.dari) ?? awalTahun();
  const sampai = validTanggal(sp.sampai) ?? hariIni();

  const supabase = await createClient();

  const [{ data: ringkasan }, { data: rekap }, { data: profit }] = await Promise.all([
    supabase.rpc("laporan_periode", { p_dari: dari, p_sampai: sampai }),
    supabase.rpc("rekap_kategori", { p_dari: dari, p_sampai: sampai }),
    supabase.rpc("profit_proyek_periode", { p_dari: dari, p_sampai: sampai }),
  ]);

  const r = (ringkasan as { total_pemasukan: number; total_pengeluaran: number; laba_bersih: number; jumlah_transaksi: number }[] | null)?.[0] ?? {
    total_pemasukan: 0, total_pengeluaran: 0, laba_bersih: 0, jumlah_transaksi: 0,
  };

  const semuaRekap = (rekap as Rekap[]) ?? [];
  const pengeluaran = semuaRekap.filter((x) => x.tipe === "pengeluaran");
  const pemasukan = semuaRekap.filter((x) => x.tipe === "pemasukan");
  const maksPengeluaran = Math.max(...pengeluaran.map((x) => Number(x.total)), 1);

  const daftarProfit = ((profit as ProfitPeriode[]) ?? []).filter(
    (p) => Number(p.pemasukan) > 0 || Number(p.pengeluaran) > 0,
  );

  const margin =
    Number(r.total_pemasukan) > 0
      ? (Number(r.laba_bersih) / Number(r.total_pemasukan)) * 100
      : 0;

  return (
    <div>
      <PageHeader
        judul="Laporan"
        deskripsi={`${formatTanggal(dari)} – ${formatTanggal(sampai)}`}
      />

      <Suspense fallback={null}>
        <FilterPeriode dari={dari} sampai={sampai} />
      </Suspense>

      <div className="grid gap-4 sm:grid-cols-4">
        <KartuMetrik judul="Pemasukan" nilai={formatIDR(r.total_pemasukan)} nada="positif" />
        <KartuMetrik judul="Pengeluaran" nilai={formatIDR(r.total_pengeluaran)} nada="negatif" />
        <KartuMetrik
          judul="Laba Bersih"
          nilai={formatIDR(r.laba_bersih)}
          sub={`margin ${margin.toFixed(1)}%`}
          nada={Number(r.laba_bersih) >= 0 ? "positif" : "negatif"}
        />
        <KartuMetrik
          judul="Jumlah Transaksi"
          nilai={String(r.jumlah_transaksi)}
          sub="dalam periode ini"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-slate-700">Pengeluaran per Kategori</h3>
          <div className="mt-4 space-y-3">
            {pengeluaran.length === 0 && (
              <p className="text-sm text-slate-400">Tidak ada pengeluaran pada periode ini.</p>
            )}
            {pengeluaran.map((k) => (
              <div key={k.kategori}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-slate-600">
                    {k.kategori}{" "}
                    <span className="text-xs text-slate-400">({k.jumlah}×)</span>
                  </span>
                  <span className="font-medium">{formatIDR(k.total)}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full bg-red-400"
                    style={{ width: `${(Number(k.total) / maksPengeluaran) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-slate-700">Pemasukan per Kategori</h3>
          <ul className="mt-4 space-y-2 text-sm">
            {pemasukan.length === 0 && (
              <li className="text-slate-400">Tidak ada pemasukan pada periode ini.</li>
            )}
            {pemasukan.map((k) => (
              <li key={k.kategori} className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-600">
                  {k.kategori} <span className="text-xs text-slate-400">({k.jumlah}×)</span>
                </span>
                <span className="font-medium text-emerald-700">{formatIDR(k.total)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <h3 className="mb-3 mt-6 text-sm font-semibold text-slate-700">
        Profit per Proyek (dalam periode)
      </h3>
      <Tabel>
        <Thead>
          <Tr>
            <Th>Proyek</Th>
            <Th className="text-right">Pemasukan</Th>
            <Th className="text-right">Pengeluaran</Th>
            <Th className="text-right">Profit</Th>
            <Th className="text-right">Margin</Th>
          </Tr>
        </Thead>
        <tbody>
          {daftarProfit.length === 0 ? (
            <KondisiKosong kolom={5} pesan="Tidak ada aktivitas proyek pada periode ini." />
          ) : (
            daftarProfit.map((p) => {
              const m =
                Number(p.pemasukan) > 0 ? (Number(p.profit) / Number(p.pemasukan)) * 100 : 0;
              return (
                <Tr key={p.project_id}>
                  <Td>
                    <Link href={`/proyek/${p.project_id}`} className="font-medium hover:underline">
                      {p.nama}
                    </Link>
                    <div className="font-mono text-xs text-slate-400">{p.kode ?? "—"}</div>
                  </Td>
                  <Td className="text-right text-slate-600">{formatIDR(p.pemasukan)}</Td>
                  <Td className="text-right text-slate-600">{formatIDR(p.pengeluaran)}</Td>
                  <Td
                    className={`text-right font-semibold ${
                      Number(p.profit) >= 0 ? "text-emerald-700" : "text-red-600"
                    }`}
                  >
                    {formatIDR(p.profit)}
                  </Td>
                  <Td className="text-right text-slate-500">{m.toFixed(1)}%</Td>
                </Tr>
              );
            })
          )}
        </tbody>
      </Tabel>

      <p className="mt-4 text-xs text-slate-400">
        Laporan berbasis kas tercatat (pemasukan − pengeluaran), bukan akrual akuntansi.
        Baris yang tampil mengikuti wewenang peran Anda.
      </p>
    </div>
  );
}
