import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { wajibIzin } from "@/lib/auth/session";
import { boleh } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabel, Thead, Th, Td, Tr, KondisiKosong } from "@/components/ui/table";
import { STATUS_BOQ } from "@/lib/status";
import { formatIDR, formatTanggalPendek } from "@/lib/format";
import type { Boq, Customer, Project } from "@/types";

export const metadata = { title: "BOQ / RAB — Medhartara Production" };

export default async function BoqPage() {
  const profil = await wajibIzin("lihatBOQ");
  const supabase = await createClient();

  const [{ data: boq }, { data: pelanggan }, { data: proyek }] = await Promise.all([
    supabase.from("boq").select("*").order("tanggal", { ascending: false }),
    supabase.from("customers").select("*"),
    supabase.from("projects").select("*"),
  ]);

  const daftar = (boq as Boq[]) ?? [];
  const daftarPelanggan = (pelanggan as Customer[]) ?? [];
  const daftarProyek = (proyek as Project[]) ?? [];

  const namaPelanggan = (id: string | null) =>
    id ? daftarPelanggan.find((c) => c.id === id)?.nama ?? "—" : "—";
  const namaProyek = (id: string | null) =>
    id ? daftarProyek.find((p) => p.id === id)?.nama ?? "—" : "—";

  // PM hanya berurusan dengan harga modal; jual & margin disembunyikan.
  const tampilJual = profil.role !== "pm";

  return (
    <div>
      <PageHeader
        judul="BOQ / RAB"
        deskripsi="Rincian anggaran per proyek — disusun PM, disetujui Admin atau Direktur"
        aksi={
          boleh(profil.role, "kelolaBOQ") ? (
            <Link href="/boq/baru">
              <Button>+ BOQ Baru</Button>
            </Link>
          ) : undefined
        }
      />

      <Tabel>
        <Thead>
          <Tr>
            <Th>Nomor &amp; Judul</Th>
            <Th>Pelanggan</Th>
            <Th>Proyek</Th>
            <Th>Tanggal</Th>
            <Th className="text-right">Modal</Th>
            {tampilJual && <Th className="text-right">Jual</Th>}
            {tampilJual && <Th className="text-right">Margin</Th>}
            <Th>Status</Th>
          </Tr>
        </Thead>
        <tbody>
          {daftar.length === 0 ? (
            <KondisiKosong kolom={tampilJual ? 8 : 6} pesan="Belum ada BOQ. Susun yang pertama." />
          ) : (
            daftar.map((b) => {
              const margin = Number(b.total_jual) - Number(b.total_modal);
              return (
                <Tr key={b.id}>
                  <Td>
                    <Link href={`/boq/${b.id}`} className="font-medium hover:underline">
                      {b.judul}
                    </Link>
                    <div className="font-mono text-xs text-slate-400">{b.nomor}</div>
                  </Td>
                  <Td className="text-sm">{namaPelanggan(b.customer_id)}</Td>
                  <Td className="text-sm text-slate-500">{namaProyek(b.project_id)}</Td>
                  <Td className="text-xs text-slate-500">{formatTanggalPendek(b.tanggal)}</Td>
                  <Td className="text-right text-slate-600">{formatIDR(b.total_modal)}</Td>
                  {tampilJual && (
                    <Td className="text-right font-medium">{formatIDR(b.total_jual)}</Td>
                  )}
                  {tampilJual && (
                    <Td
                      className={`text-right font-semibold ${
                        margin >= 0 ? "text-emerald-700" : "text-red-600"
                      }`}
                    >
                      {formatIDR(margin)}
                    </Td>
                  )}
                  <Td>
                    <Badge warna={STATUS_BOQ[b.status].warna}>{STATUS_BOQ[b.status].label}</Badge>
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
