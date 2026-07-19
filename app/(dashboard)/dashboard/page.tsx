import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { wajibLogin } from "@/lib/auth/session";
import { boleh } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { KartuMetrik } from "@/components/ui/kartu-metrik";
import { GrafikArusKas, type BarisArusKas } from "@/components/ui/grafik-arus-kas";
import { Badge } from "@/components/ui/badge";
import { Tabel, Thead, Th, Td, Tr, KondisiKosong } from "@/components/ui/table";
import { STATUS_INVOICE, STATUS_PROYEK } from "@/lib/status";
import { formatIDR, formatTanggalPendek, formatWaktu } from "@/lib/format";
import { LABEL_PERAN } from "@/lib/auth/roles";
import type {
  InvoiceRingkas, Customer, Project, ProfitProyek,
} from "@/types";

export const metadata = { title: "Dashboard — Medhartara Production" };

interface Ringkasan {
  total_pemasukan: number;
  total_pengeluaran: number;
  saldo_kas: number;
  piutang: number;
  invoice_jatuh_tempo: number;
  proyek_berjalan: number;
  penawaran_menunggu: number;
}

interface BarisAudit {
  id: string;
  aksi: string;
  entity_type: string;
  data_baru: { nomor?: string; status?: string } | null;
  created_at: string;
}

export default async function HalamanDashboard() {
  const profil = await wajibLogin();
  const supabase = await createClient();

  // PM tidak melihat saldo perusahaan — hanya metrik proyeknya (§3.1).
  if (!boleh(profil.role, "lihatKeuangan")) {
    return <DashboardPM nama={profil.nama_lengkap} idSaya={profil.id} />;
  }

  const [
    { data: ringkasan },
    { data: arusKas },
    { data: invoice },
    { data: pelanggan },
    { data: profit },
    { data: audit },
  ] = await Promise.all([
    supabase.from("dashboard_ringkasan").select("*").maybeSingle(),
    supabase.rpc("arus_kas_bulanan", { p_jumlah_bulan: 6 }),
    supabase
      .from("invoice_ringkas")
      .select("*")
      .not("status", "in", '("draft","batal")')
      .gt("sisa_tagihan", 0)
      .order("jatuh_tempo"),
    supabase.from("customers").select("*"),
    supabase.from("project_profitability").select("*"),
    supabase
      .from("audit_logs")
      .select("id, aksi, entity_type, data_baru, created_at")
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  const r = (ringkasan as Ringkasan | null) ?? {
    total_pemasukan: 0, total_pengeluaran: 0, saldo_kas: 0,
    piutang: 0, invoice_jatuh_tempo: 0, proyek_berjalan: 0, penawaran_menunggu: 0,
  };

  const daftarPiutang = (invoice as InvoiceRingkas[]) ?? [];
  const daftarPelanggan = (pelanggan as Customer[]) ?? [];
  const daftarProfit = ((profit as ProfitProyek[]) ?? [])
    .sort((a, b) => Number(b.profit) - Number(a.profit))
    .slice(0, 6);

  const namaPelanggan = (id: string) =>
    daftarPelanggan.find((c) => c.id === id)?.nama ?? "—";

  return (
    <div>
      <PageHeader
        judul="Dashboard"
        deskripsi={`Ringkasan keuangan · ${LABEL_PERAN[profil.role]}`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KartuMetrik
          judul="Saldo Kas"
          nilai={formatIDR(r.saldo_kas)}
          sub="berbasis transaksi tercatat"
          nada={Number(r.saldo_kas) >= 0 ? "netral" : "negatif"}
        />
        <KartuMetrik
          judul="Total Pemasukan"
          nilai={formatIDR(r.total_pemasukan)}
          nada="positif"
        />
        <KartuMetrik
          judul="Total Pengeluaran"
          nilai={formatIDR(r.total_pengeluaran)}
          nada="negatif"
        />
        <KartuMetrik
          judul="Piutang Berjalan"
          nilai={formatIDR(r.piutang)}
          sub={`${r.invoice_jatuh_tempo} invoice jatuh tempo`}
          nada={Number(r.invoice_jatuh_tempo) > 0 ? "peringatan" : "netral"}
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm">
          <span className="text-slate-500">Proyek berjalan: </span>
          <Link href="/proyek" className="font-semibold hover:underline">
            {r.proyek_berjalan}
          </Link>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm">
          <span className="text-slate-500">Penawaran menunggu persetujuan: </span>
          <Link href="/penawaran" className="font-semibold hover:underline">
            {r.penawaran_menunggu}
          </Link>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div>
            <h3 className="mb-3 text-sm font-semibold text-slate-700">
              Invoice Perlu Perhatian
            </h3>
            <Tabel>
              <Thead>
                <Tr>
                  <Th>Nomor</Th>
                  <Th>Pelanggan</Th>
                  <Th>Jatuh Tempo</Th>
                  <Th className="text-right">Sisa</Th>
                  <Th>Status</Th>
                </Tr>
              </Thead>
              <tbody>
                {daftarPiutang.length === 0 ? (
                  <KondisiKosong kolom={5} pesan="Tidak ada tagihan berjalan. " />
                ) : (
                  daftarPiutang.slice(0, 8).map((i) => (
                    <Tr key={i.id}>
                      <Td>
                        <Link
                          href={`/invoice/${i.id}`}
                          className="font-mono font-medium hover:underline"
                        >
                          {i.nomor}
                        </Link>
                      </Td>
                      <Td>{namaPelanggan(i.customer_id)}</Td>
                      <Td className="text-xs text-slate-500">
                        {formatTanggalPendek(i.jatuh_tempo)}
                      </Td>
                      <Td className="text-right font-medium">{formatIDR(i.sisa_tagihan)}</Td>
                      <Td>
                        <Badge warna={STATUS_INVOICE[i.status_efektif].warna}>
                          {STATUS_INVOICE[i.status_efektif].label}
                        </Badge>
                      </Td>
                    </Tr>
                  ))
                )}
              </tbody>
            </Tabel>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold text-slate-700">
              Profitabilitas per Proyek
            </h3>
            <Tabel>
              <Thead>
                <Tr>
                  <Th>Proyek</Th>
                  <Th className="text-right">Pemasukan</Th>
                  <Th className="text-right">Pengeluaran</Th>
                  <Th className="text-right">Profit</Th>
                </Tr>
              </Thead>
              <tbody>
                {daftarProfit.length === 0 ? (
                  <KondisiKosong kolom={4} pesan="Belum ada data profitabilitas." />
                ) : (
                  daftarProfit.map((p) => (
                    <Tr key={p.project_id}>
                      <Td>
                        <Link
                          href={`/proyek/${p.project_id}`}
                          className="font-medium hover:underline"
                        >
                          {p.nama}
                        </Link>
                      </Td>
                      <Td className="text-right text-slate-600">
                        {formatIDR(p.total_pemasukan)}
                      </Td>
                      <Td className="text-right text-slate-600">
                        {formatIDR(p.total_pengeluaran)}
                      </Td>
                      <Td
                        className={`text-right font-semibold ${
                          Number(p.profit) >= 0 ? "text-emerald-700" : "text-red-600"
                        }`}
                      >
                        {formatIDR(p.profit)}
                      </Td>
                    </Tr>
                  ))
                )}
              </tbody>
            </Tabel>
          </div>
        </div>

        <div className="space-y-6">
          <GrafikArusKas data={(arusKas as BarisArusKas[]) ?? []} />

          <div className="rounded-xl border border-slate-200 bg-white">
            <h3 className="border-b border-slate-100 px-5 py-3 text-sm font-semibold text-slate-700">
              Aktivitas Terakhir
            </h3>
            <ul className="divide-y divide-slate-100">
              {((audit as BarisAudit[]) ?? []).length === 0 && (
                <li className="px-5 py-4 text-sm text-slate-400">Belum ada aktivitas.</li>
              )}
              {((audit as BarisAudit[]) ?? []).map((a) => (
                <li key={a.id} className="px-5 py-3 text-sm">
                  <p className="text-slate-700">
                    {a.data_baru?.nomor ?? a.entity_type}
                    {a.data_baru?.status && (
                      <span className="text-slate-400"> → {a.data_baru.status}</span>
                    )}
                  </p>
                  <p className="text-xs text-slate-400">
                    {a.aksi} · {formatWaktu(a.created_at)}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Dashboard PM — tanpa saldo perusahaan, hanya proyek yang ia pegang. */
async function DashboardPM({ nama, idSaya }: { nama: string; idSaya: string }) {
  const supabase = await createClient();

  const [{ data: proyek }, { data: profit }] = await Promise.all([
    supabase.from("projects").select("*").eq("pm_id", idSaya).order("tanggal_mulai"),
    supabase.from("project_profitability").select("*"),
  ]);

  const daftarProyek = (proyek as Project[]) ?? [];
  const semuaProfit = (profit as ProfitProyek[]) ?? [];
  const milikSaya = semuaProfit.filter((f) =>
    daftarProyek.some((p) => p.id === f.project_id),
  );

  const totalBiaya = milikSaya.reduce((s, f) => s + Number(f.total_pengeluaran), 0);
  const totalProfit = milikSaya.reduce((s, f) => s + Number(f.profit), 0);

  return (
    <div>
      <PageHeader judul="Dashboard" deskripsi={`Halo, ${nama.split(" ").slice(-1)[0]}`} />

      <p className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">
        Sebagai Project Manager, Anda melihat metrik proyek yang Anda pegang — bukan
        saldo perusahaan.
      </p>

      <div className="grid gap-4 sm:grid-cols-3">
        <KartuMetrik
          judul="Proyek Berjalan"
          nilai={String(daftarProyek.filter((p) => p.status === "berjalan").length)}
          sub={`dari ${daftarProyek.length} proyek`}
        />
        <KartuMetrik judul="Total Biaya Proyek" nilai={formatIDR(totalBiaya)} nada="negatif" />
        <KartuMetrik
          judul="Profit Proyek Saya"
          nilai={formatIDR(totalProfit)}
          nada={totalProfit >= 0 ? "positif" : "negatif"}
        />
      </div>

      <h3 className="mb-3 mt-6 text-sm font-semibold text-slate-700">Proyek Saya</h3>
      <Tabel>
        <Thead>
          <Tr>
            <Th>Proyek</Th>
            <Th>Periode</Th>
            <Th>Status</Th>
            <Th className="text-right">Profit</Th>
          </Tr>
        </Thead>
        <tbody>
          {daftarProyek.length === 0 ? (
            <KondisiKosong kolom={4} pesan="Belum ada proyek yang ditugaskan kepada Anda." />
          ) : (
            daftarProyek.map((p) => {
              const f = milikSaya.find((x) => x.project_id === p.id);
              const nilai = Number(f?.profit ?? 0);
              return (
                <Tr key={p.id}>
                  <Td>
                    <Link href={`/proyek/${p.id}`} className="font-medium hover:underline">
                      {p.nama}
                    </Link>
                    <div className="font-mono text-xs text-slate-400">{p.kode ?? "—"}</div>
                  </Td>
                  <Td className="text-xs text-slate-500">
                    {formatTanggalPendek(p.tanggal_mulai)} – {formatTanggalPendek(p.tanggal_selesai)}
                  </Td>
                  <Td>
                    <Badge warna={STATUS_PROYEK[p.status].warna}>
                      {STATUS_PROYEK[p.status].label}
                    </Badge>
                  </Td>
                  <Td
                    className={`text-right font-semibold ${
                      nilai >= 0 ? "text-emerald-700" : "text-red-600"
                    }`}
                  >
                    {formatIDR(nilai)}
                  </Td>
                </Tr>
              );
            })
          )}
        </tbody>
      </Tabel>
    </div>
  );
}
