import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { wajibIzin } from "@/lib/auth/session";
import { boleh } from "@/lib/auth/permissions";
import { Badge } from "@/components/ui/badge";
import { Tabel, Thead, Th, Td, Tr } from "@/components/ui/table";
import { STATUS_INVOICE, LABEL_METODE } from "@/lib/status";
import { formatIDR, formatTanggal } from "@/lib/format";
import { hitungPPN, labelPPN } from "@/lib/pajak";
import PanelInvoice from "./panel-invoice";
import HapusInvoice from "./hapus-invoice";
import type {
  InvoiceRingkas, InvoiceItem, Payment, Customer, Project, Company, Quotation,
} from "@/types";

export default async function DetailInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profil = await wajibIzin("lihatInvoice");
  const supabase = await createClient();

  const { data: invoice } = await supabase
    .from("invoice_ringkas")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!invoice) notFound();
  const inv = invoice as InvoiceRingkas;

  const [
    { data: items },
    { data: pembayaran },
    { data: kuitansi },
    { data: pelanggan },
    { data: proyek },
    { data: perusahaan },
    { data: penawaran },
  ] = await Promise.all([
    supabase.from("invoice_items").select("*").eq("invoice_id", id).order("urutan"),
    supabase.from("payments").select("*").eq("invoice_id", id).order("tanggal"),
    supabase.from("kuitansi").select("id, nomor, payment_id"),
    supabase.from("customers").select("*").eq("id", inv.customer_id).maybeSingle(),
    inv.project_id
      ? supabase.from("projects").select("*").eq("id", inv.project_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("companies").select("*").eq("id", inv.company_id).maybeSingle(),
    inv.quotation_id
      ? supabase.from("quotations").select("*").eq("id", inv.quotation_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const daftarItem = (items as InvoiceItem[]) ?? [];
  const daftarBayar = (pembayaran as Payment[]) ?? [];
  const daftarKuitansi = (kuitansi as { id: string; nomor: string; payment_id: string }[]) ?? [];
  const kuitansiUntuk = (paymentId: string) =>
    daftarKuitansi.find((k) => k.payment_id === paymentId);
  const c = pelanggan as Customer | null;
  const pt = perusahaan as Company | null;
  const qt = penawaran as Quotation | null;

  const potongan = (Number(inv.subtotal) * Number(inv.diskon_persen)) / 100;
  const dasar = Number(inv.subtotal) - potongan;
  const ppn = hitungPPN(dasar, Number(inv.pajak_persen));

  const bisaKelola = boleh(profil.role, "kelolaInvoice");
  const bisaBayar =
    boleh(profil.role, "catatPembayaran") &&
    Number(inv.sisa_tagihan) > 0 &&
    !["draft", "batal"].includes(inv.status);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <Link href="/invoice" className="text-sm text-slate-500 hover:text-slate-800">
          ← Kembali ke daftar invoice
        </Link>
        <div className="flex items-center gap-4">
          {inv.status === "draft" && bisaKelola && (
            <Link href={`/invoice/${inv.id}/ubah`} className="text-sm text-slate-500 hover:text-slate-800">
              Ubah invoice
            </Link>
          )}
          <a
            href={`/api/invoice/${inv.id}/pdf`}
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
            <p className="text-xs uppercase tracking-widest text-slate-400">Invoice</p>
            <p className="font-mono text-xl font-semibold">{inv.nomor}</p>
            <div className="mt-2">
              <Badge warna={STATUS_INVOICE[inv.status_efektif].warna}>
                {STATUS_INVOICE[inv.status_efektif].label}
              </Badge>
            </div>
          </div>
        </header>

        <div className="grid gap-6 px-8 py-6 sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Ditagihkan kepada</p>
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
              <span className="text-slate-400">Tanggal:</span> {formatTanggal(inv.tanggal)}
            </p>
            <p>
              <span className="text-slate-400">Jatuh tempo:</span> {formatTanggal(inv.jatuh_tempo)}
            </p>
            {proyek && (
              <p>
                <span className="text-slate-400">Proyek:</span> {(proyek as Project).nama}
              </p>
            )}
            {qt && (
              <p>
                <span className="text-slate-400">Dari penawaran:</span>{" "}
                <Link href={`/penawaran/${qt.id}`} className="font-mono hover:underline">
                  {qt.nomor}
                </Link>
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
              <dd>{formatIDR(inv.subtotal)}</dd>
            </div>
            {Number(inv.diskon_persen) > 0 && (
              <div className="flex justify-between">
                <dt className="text-slate-500">Diskon {Number(inv.diskon_persen)}%</dt>
                <dd className="text-red-600">−{formatIDR(potongan)}</dd>
              </div>
            )}
            {Number(inv.pajak_persen) > 0 && (
              <div className="flex justify-between">
                <dt className="text-slate-500">{labelPPN(Number(inv.pajak_persen))}</dt>
                <dd>{formatIDR(ppn)}</dd>
              </div>
            )}
            <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-semibold">
              <dt>Total</dt>
              <dd>{formatIDR(inv.total)}</dd>
            </div>
            <div className="flex justify-between text-emerald-700">
              <dt>Sudah dibayar</dt>
              <dd>{formatIDR(inv.total_dibayar)}</dd>
            </div>
            <div className="flex justify-between font-semibold">
              <dt>Sisa tagihan</dt>
              <dd>{formatIDR(inv.sisa_tagihan)}</dd>
            </div>
          </dl>
        </div>

        {daftarBayar.length > 0 && (
          <div className="border-t border-slate-100">
            <p className="px-8 pt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Riwayat Pembayaran
            </p>
            <Tabel className="rounded-none border-x-0 border-b-0">
              <Thead>
                <Tr>
                  <Th>Termin</Th>
                  <Th>Tanggal</Th>
                  <Th>Metode</Th>
                  <Th>Catatan</Th>
                  <Th className="text-right">Jumlah</Th>
                  <Th className="w-24">Kuitansi</Th>
                </Tr>
              </Thead>
              <tbody>
                {daftarBayar.map((p) => (
                  <Tr key={p.id}>
                    <Td>Termin {p.termin_ke ?? "—"}</Td>
                    <Td className="text-slate-500">{formatTanggal(p.tanggal)}</Td>
                    <Td>{LABEL_METODE[p.metode]}</Td>
                    <Td className="text-slate-500">{p.catatan ?? "—"}</Td>
                    <Td className="text-right text-emerald-700">{formatIDR(p.jumlah)}</Td>
                    <Td>
                      {kuitansiUntuk(p.id) ? (
                        <a
                          href={`/api/kuitansi/${kuitansiUntuk(p.id)!.id}/pdf`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-xs text-slate-600 hover:underline"
                        >
                          {kuitansiUntuk(p.id)!.nomor}
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Tabel>
          </div>
        )}

        {inv.catatan && (
          <div className="border-t border-slate-100 px-8 py-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Catatan</p>
            <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{inv.catatan}</p>
          </div>
        )}

        <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 bg-slate-50 px-8 py-4">
          <p className="text-xs text-slate-500">
            {pt?.bank_nama &&
              `Pembayaran: ${pt.bank_nama} ${pt.bank_rekening} a.n. ${pt.bank_atas_nama}`}
          </p>
          {["draft", "batal"].includes(inv.status) && bisaKelola && daftarBayar.length === 0 && (
            <HapusInvoice id={inv.id} nomor={inv.nomor} />
          )}

          <PanelInvoice
            id={inv.id}
            status={inv.status}
            sisa={Number(inv.sisa_tagihan)}
            bisaKelola={bisaKelola}
            bisaBayar={bisaBayar}
          />
        </footer>
      </article>

    </div>
  );
}
