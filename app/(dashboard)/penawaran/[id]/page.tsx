import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { wajibIzin } from "@/lib/auth/session";
import { boleh } from "@/lib/auth/permissions";
import { Badge } from "@/components/ui/badge";
import { Tabel, Thead, Th, Td, Tr } from "@/components/ui/table";
import { STATUS_PENAWARAN } from "@/lib/status";
import { formatIDR, formatTanggal, formatWaktu } from "@/lib/format";
import { hitungPPN, labelPPN } from "@/lib/pajak";
import { rentangJadwal } from "@/lib/jadwal";
import AksiPenawaran from "./aksi-penawaran";
import HapusPenawaran from "./hapus-penawaran";
import type { Quotation, QuotationItem, Customer, Project, Company, UsersProfile } from "@/types";

export default async function DetailPenawaranPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profil = await wajibIzin("lihatPenawaran");
  const supabase = await createClient();

  const { data: penawaran } = await supabase
    .from("quotations")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!penawaran) notFound();
  const q = penawaran as Quotation;

  const [{ data: items }, { data: pelanggan }, { data: proyek }, { data: perusahaan }] =
    await Promise.all([
      supabase.from("quotation_items").select("*").eq("quotation_id", id).order("urutan"),
      supabase.from("customers").select("*").eq("id", q.customer_id).maybeSingle(),
      q.project_id
        ? supabase.from("projects").select("*").eq("id", q.project_id).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase.from("companies").select("*").eq("id", q.company_id).maybeSingle(),
    ]);

  const daftarItem = (items as QuotationItem[]) ?? [];
  const c = pelanggan as Customer | null;
  const pt = perusahaan as Company | null;

  const potongan = Number(q.subtotal) * Number(q.diskon_persen) / 100;
  const dasar = Number(q.subtotal) - potongan;
  const ppn = hitungPPN(dasar, Number(q.pajak_persen));

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <Link href="/penawaran" className="text-sm text-slate-500 hover:text-slate-800">
          ← Kembali ke daftar penawaran
        </Link>
        <div className="flex items-center gap-4">
          {boleh(profil.role, "kelolaPenawaran") && (
            <Link
              href={`/penawaran/${q.id}/ubah`}
              className="text-sm text-slate-500 hover:text-slate-800"
            >
              Ubah penawaran
            </Link>
          )}
          <a
            href={`/api/penawaran/${q.id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            ⬇ Ekspor PDF
          </a>
        </div>
      </div>

      <article className="rounded-xl border border-slate-200 bg-white">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 px-8 py-6">
          <div>
            <p className="text-lg font-semibold">{pt?.nama ?? "Medhartara Production"}</p>
            <p className="text-xs leading-5 text-slate-500">
              {pt?.alamat}
              <br />
              {pt?.telepon} · {pt?.email}
              {pt?.npwp && (
                <>
                  <br />
                  NPWP {pt.npwp}
                </>
              )}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-widest text-slate-400">Penawaran Harga</p>
            <p className="font-mono text-xl font-semibold">{q.nomor}</p>
            <div className="mt-2">
              <Badge warna={STATUS_PENAWARAN[q.status].warna}>
                {STATUS_PENAWARAN[q.status].label}
              </Badge>
            </div>
          </div>
        </header>

        <div className="grid gap-6 px-8 py-6 sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Kepada</p>
            <p className="mt-1 font-medium">{c?.nama ?? "—"}</p>
            <p className="text-sm text-slate-500">
              {c?.narahubung}
              {c?.alamat && (
                <>
                  <br />
                  {c.alamat}
                </>
              )}
            </p>
          </div>
          <div className="text-sm text-slate-600 sm:text-right">
            <p>
              <span className="text-slate-400">Tanggal:</span> {formatTanggal(q.tanggal)}
            </p>
            <p>
              <span className="text-slate-400">Berlaku hingga:</span>{" "}
              {formatTanggal(q.berlaku_hingga)}
            </p>
            {proyek && (
              <p>
                <span className="text-slate-400">Proyek:</span> {(proyek as Project).nama}
              </p>
            )}
            {proyek && rentangJadwal((proyek as Project).tanggal_mulai, (proyek as Project).tanggal_selesai) && (
              <p>
                <span className="text-slate-400">Pelaksanaan:</span>{" "}
                {rentangJadwal((proyek as Project).tanggal_mulai, (proyek as Project).tanggal_selesai)}
              </p>
            )}
            {proyek && (proyek as Project).lokasi && (
              <p>
                <span className="text-slate-400">Lokasi:</span> {(proyek as Project).lokasi}
              </p>
            )}
          </div>
        </div>

        <Tabel className="rounded-none border-x-0">
          <Thead>
            <Tr>
              <Th>Deskripsi</Th>
              <Th className="text-right">Qty</Th>
              <Th>Satuan</Th>
              <Th className="text-right">Harga Satuan</Th>
              <Th className="text-right">Subtotal</Th>
            </Tr>
          </Thead>
          <tbody>
            {daftarItem.map((it) => (
              <Tr key={it.id}>
                <Td>{it.deskripsi}</Td>
                <Td className="text-right">{Number(it.kuantitas)}</Td>
                <Td className="text-slate-500">{it.satuan ?? "—"}</Td>
                <Td className="text-right">{formatIDR(it.harga_satuan)}</Td>
                <Td className="text-right font-medium">{formatIDR(it.subtotal)}</Td>
              </Tr>
            ))}
          </tbody>
        </Tabel>

        <div className="flex justify-end px-8 py-5">
          <dl className="w-full max-w-xs space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Subtotal</dt>
              <dd>{formatIDR(q.subtotal)}</dd>
            </div>
            {Number(q.diskon_persen) > 0 && (
              <div className="flex justify-between">
                <dt className="text-slate-500">Diskon {Number(q.diskon_persen)}%</dt>
                <dd className="text-red-600">−{formatIDR(potongan)}</dd>
              </div>
            )}
            {Number(q.pajak_persen) > 0 && (
              <div className="flex justify-between">
                <dt className="text-slate-500">{labelPPN(Number(q.pajak_persen))}</dt>
                <dd>{formatIDR(ppn)}</dd>
              </div>
            )}
            <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-semibold">
              <dt>Total</dt>
              <dd>{formatIDR(q.total)}</dd>
            </div>
          </dl>
        </div>

        {q.catatan && (
          <div className="border-t border-slate-100 px-8 py-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Catatan</p>
            <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{q.catatan}</p>
          </div>
        )}

        <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 bg-slate-50 px-8 py-4">
          <div className="text-xs text-slate-500">
            {pt?.bank_nama && (
              <p>
                Pembayaran: {pt.bank_nama} {pt.bank_rekening} a.n. {pt.bank_atas_nama}
              </p>
            )}
            {q.final_pada ? (
              <p className="mt-1 font-medium text-emerald-700">
                ✓ Final pada {formatWaktu(q.final_pada)}
              </p>
            ) : (
              <p className="mt-1 text-slate-400">
                Belum Final — tandai Final dulu agar bisa dikonversi ke invoice.
              </p>
            )}
          </div>

          {boleh(profil.role, "kelolaPenawaran") && (
            <HapusPenawaran id={q.id} nomor={q.nomor} />
          )}

          <AksiPenawaran
            id={q.id}
            status={q.status}
            sudahFinal={Boolean(q.final_pada)}
            bisaKelola={boleh(profil.role, "kelolaPenawaran")}
            bisaKonversi={boleh(profil.role, "kelolaInvoice")}
          />
        </footer>
      </article>
    </div>
  );
}
