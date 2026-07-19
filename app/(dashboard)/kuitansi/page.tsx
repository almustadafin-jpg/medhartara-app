import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { wajibIzin } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/page-header";
import { Tabel, Thead, Th, Td, Tr, KondisiKosong } from "@/components/ui/table";
import { formatIDR, formatTanggalPendek } from "@/lib/format";
import { LABEL_METODE } from "@/lib/status";
import type { Kuitansi, Payment, InvoiceRingkas, Customer, TxnMethod } from "@/types";

export const metadata = { title: "Kuitansi — Medhartara Production" };

export default async function KuitansiPage() {
  await wajibIzin("lihatKuitansi");
  const supabase = await createClient();

  const [{ data: kuitansi }, { data: bayar }, { data: invoice }, { data: pelanggan }] =
    await Promise.all([
      supabase.from("kuitansi").select("*").order("nomor", { ascending: false }),
      supabase.from("payments").select("*"),
      supabase.from("invoice_ringkas").select("*"),
      supabase.from("customers").select("*"),
    ]);

  const daftar = (kuitansi as Kuitansi[]) ?? [];
  const daftarBayar = (bayar as Payment[]) ?? [];
  const daftarInvoice = (invoice as InvoiceRingkas[]) ?? [];
  const daftarPelanggan = (pelanggan as Customer[]) ?? [];

  const cariBayar = (id: string) => daftarBayar.find((p) => p.id === id);
  const cariInvoice = (id: string | undefined) => daftarInvoice.find((i) => i.id === id);
  const namaPelanggan = (id: string | undefined) =>
    daftarPelanggan.find((c) => c.id === id)?.nama ?? "—";

  const total = daftar.reduce((s, k) => s + Number(cariBayar(k.payment_id)?.jumlah ?? 0), 0);

  return (
    <div>
      <PageHeader
        judul="Kuitansi"
        deskripsi="Terbit otomatis setiap pembayaran dicatat — tidak dibuat manual"
      />

      <p className="mb-4 text-sm text-slate-500">
        {daftar.length} kuitansi ·{" "}
        <span className="font-semibold text-slate-900">{formatIDR(total)}</span>
      </p>

      <Tabel>
        <Thead>
          <Tr>
            <Th>Nomor</Th>
            <Th>Tanggal</Th>
            <Th>Dari</Th>
            <Th>Untuk</Th>
            <Th>Metode</Th>
            <Th className="text-right">Jumlah</Th>
            <Th className="w-20" />
          </Tr>
        </Thead>
        <tbody>
          {daftar.length === 0 ? (
            <KondisiKosong
              kolom={7}
              pesan="Belum ada kuitansi. Kuitansi terbit sendiri begitu pembayaran invoice dicatat."
            />
          ) : (
            daftar.map((k) => {
              const p = cariBayar(k.payment_id);
              const inv = cariInvoice(p?.invoice_id);
              return (
                <Tr key={k.id}>
                  <Td className="font-mono font-medium">{k.nomor}</Td>
                  <Td className="text-xs text-slate-500">{formatTanggalPendek(k.tanggal)}</Td>
                  <Td>{namaPelanggan(inv?.customer_id)}</Td>
                  <Td className="text-sm text-slate-600">
                    {k.untuk_pembayaran ?? "—"}
                    {inv && (
                      <Link
                        href={`/invoice/${inv.id}`}
                        className="ml-1 font-mono text-xs text-slate-400 hover:underline"
                      >
                        {inv.nomor}
                      </Link>
                    )}
                  </Td>
                  <Td className="text-xs text-slate-500">
                    {p ? LABEL_METODE[p.metode as TxnMethod] : "—"}
                  </Td>
                  <Td className="text-right font-medium text-emerald-700">
                    {formatIDR(p?.jumlah ?? 0)}
                  </Td>
                  <Td>
                    <a
                      href={`/api/kuitansi/${k.id}/pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      ⬇ PDF
                    </a>
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
