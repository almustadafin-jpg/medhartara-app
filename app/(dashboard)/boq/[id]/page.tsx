import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { wajibIzin } from "@/lib/auth/session";
import { boleh } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { KartuMetrik } from "@/components/ui/kartu-metrik";
import { Tabel, Thead, Th, Td, Tr } from "@/components/ui/table";
import { STATUS_BOQ } from "@/lib/status";
import { formatIDR, formatTanggal } from "@/lib/format";
import AksiBoq from "./aksi-boq";
import HapusBoq from "./hapus-boq";
import type { Boq, BoqItem, Customer, Project, Quotation, UsersProfile } from "@/types";

export default async function DetailBoqPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profil = await wajibIzin("lihatBOQ");
  const supabase = await createClient();

  const { data: boq } = await supabase.from("boq").select("*").eq("id", id).maybeSingle();
  if (!boq) notFound();
  const b = boq as Boq;

  const [{ data: items }, { data: pelanggan }, { data: proyek }, { data: penawaran }, { data: penyetuju }] =
    await Promise.all([
      supabase.from("boq_items").select("*").eq("boq_id", id).order("urutan"),
      b.customer_id
        ? supabase.from("customers").select("*").eq("id", b.customer_id).maybeSingle()
        : Promise.resolve({ data: null }),
      b.project_id
        ? supabase.from("projects").select("*").eq("id", b.project_id).maybeSingle()
        : Promise.resolve({ data: null }),
      b.quotation_id
        ? supabase.from("quotations").select("*").eq("id", b.quotation_id).maybeSingle()
        : Promise.resolve({ data: null }),
      b.disetujui_oleh
        ? supabase.from("users_profile").select("*").eq("id", b.disetujui_oleh).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

  const daftar = (items as BoqItem[]) ?? [];
  const margin = Number(b.total_jual) - Number(b.total_modal);
  const persen = Number(b.total_jual) > 0 ? (margin / Number(b.total_jual)) * 100 : 0;

  // Kelompokkan per kategori, urutan mengikuti kemunculan pertama.
  const kelompok: { kategori: string; baris: BoqItem[] }[] = [];
  for (const it of daftar) {
    const k = it.kategori?.trim() || "Lain-lain";
    const ada = kelompok.find((g) => g.kategori === k);
    if (ada) ada.baris.push(it);
    else kelompok.push({ kategori: k, baris: [it] });
  }

  const adaHari = daftar.some((it) => Number(it.hari) !== 1);
  const bisaUbah =
    boleh(profil.role, "kelolaBOQ") && ["draft", "ditolak", "diajukan"].includes(b.status);
  // Hapus tetap terbatas draft/ditolak (sesuai kebijakan DELETE di database).
  const bisaHapus =
    boleh(profil.role, "kelolaBOQ") && ["draft", "ditolak"].includes(b.status);
  // PM hanya berurusan dengan harga modal; jual & margin disembunyikan.
  const tampilJual = profil.role !== "pm";

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <Link href="/boq" className="text-sm text-slate-500 hover:text-slate-800">
          ← Kembali ke daftar BOQ
        </Link>
        <div className="flex items-center gap-3">
          {bisaUbah && (
            <Link
              href={`/boq/${b.id}/ubah`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-700"
            >
              ✏️ Ubah BOQ
            </Link>
          )}
          <a
            href={`/api/boq/${b.id}/pdf?versi=internal`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            ⬇ PDF Internal
          </a>
          <a
            href={`/api/boq/${b.id}/pdf?versi=klien`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            ⬇ Lampiran Klien
          </a>
        </div>
      </div>

      <PageHeader
        judul={b.judul}
        deskripsi={`${b.nomor} · ${formatTanggal(b.tanggal)}`}
        aksi={<Badge warna={STATUS_BOQ[b.status].warna}>{STATUS_BOQ[b.status].label}</Badge>}
      />

      <div className={`grid gap-4 ${tampilJual ? "sm:grid-cols-3" : "sm:grid-cols-1"}`}>
        <KartuMetrik judul="Total Modal" nilai={formatIDR(b.total_modal)} />
        {tampilJual && <KartuMetrik judul="Total Jual" nilai={formatIDR(b.total_jual)} />}
        {tampilJual && (
          <KartuMetrik
            judul="Margin"
            nilai={formatIDR(margin)}
            sub={`${persen.toFixed(1)}% dari harga jual`}
            nada={margin >= 0 ? "positif" : "negatif"}
          />
        )}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm">
          <span className="text-slate-500">Pelanggan: </span>
          {(pelanggan as Customer | null)?.nama ?? "belum ditentukan"}
          <br />
          <span className="text-slate-500">Proyek: </span>
          {(proyek as Project | null)?.nama ?? "—"}
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm">
          {b.disetujui_pada ? (
            <>
              <span className="text-slate-500">
                {b.status === "ditolak" ? "Ditolak oleh: " : "Disetujui oleh: "}
              </span>
              {(penyetuju as UsersProfile | null)?.nama_lengkap ?? "—"}
              <br />
              <span className="text-slate-500">Pada: </span>
              {formatTanggal(b.disetujui_pada)}
            </>
          ) : (
            <span className="text-slate-400">Belum ada persetujuan.</span>
          )}
          {penawaran && (
            <>
              <br />
              <span className="text-slate-500">Ditarik jadi: </span>
              <Link href={`/penawaran/${(penawaran as Quotation).id}`} className="font-mono hover:underline">
                {(penawaran as Quotation).nomor}
              </Link>
            </>
          )}
        </div>
      </div>

      <h3 className="mb-3 mt-6 text-sm font-semibold text-slate-700">Rincian Item</h3>
      <Tabel>
        <Thead>
          <Tr>
            <Th>Item &amp; Deskripsi</Th>
            <Th className="text-right">Qty</Th>
            <Th>Satuan</Th>
            {adaHari && <Th className="text-right">Hari</Th>}
            <Th className="text-right">Modal</Th>
            {tampilJual && <Th className="text-right">Jual</Th>}
            <Th className="text-right">{tampilJual ? "Total Jual" : "Total Modal"}</Th>
          </Tr>
        </Thead>
        <tbody>
          {kelompok.map((g) => {
            const subJual = g.baris.reduce((s, it) => s + Number(it.subtotal_jual), 0);
            const subModal = g.baris.reduce((s, it) => s + Number(it.subtotal_modal), 0);
            return (
              <>
                <Tr key={`k-${g.kategori}`} className="bg-slate-50">
                  <Td className="font-semibold uppercase tracking-wide text-slate-600">
                    {g.kategori}
                  </Td>
                  <Td /><Td />
                  {adaHari && <Td />}
                  <Td />{tampilJual && <Td />}<Td />
                </Tr>
                {g.baris.map((it) => (
                  <Tr key={it.id}>
                    <Td>
                      <p className="font-medium text-slate-900">{it.nama}</p>
                      {it.deskripsi && (
                        <p className="text-xs text-slate-500">{it.deskripsi}</p>
                      )}
                    </Td>
                    <Td className="text-right">{Number(it.kuantitas)}</Td>
                    <Td className="text-slate-500">{it.satuan ?? "—"}</Td>
                    {adaHari && (
                      <Td className="text-right">{String(Number(it.hari)).replace(".", ",")}</Td>
                    )}
                    <Td className="text-right text-slate-500">{formatIDR(it.harga_modal)}</Td>
                    {tampilJual && <Td className="text-right">{formatIDR(it.harga_jual)}</Td>}
                    <Td className="text-right font-medium">
                      {formatIDR(tampilJual ? it.subtotal_jual : it.subtotal_modal)}
                    </Td>
                  </Tr>
                ))}
                <Tr key={`s-${g.kategori}`}>
                  <Td className="text-right text-xs font-medium text-slate-500" >
                    Subtotal {g.kategori}
                  </Td>
                  <Td /><Td />
                  {adaHari && <Td />}
                  <Td />{tampilJual && <Td />}
                  <Td className="text-right font-semibold">
                    {formatIDR(tampilJual ? subJual : subModal)}
                  </Td>
                </Tr>
              </>
            );
          })}
        </tbody>
      </Tabel>

      {b.catatan && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs uppercase tracking-wide text-slate-400">Catatan</p>
          <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{b.catatan}</p>
        </div>
      )}

      <div className="mt-6 flex items-start justify-between gap-4">
        {bisaHapus ? <HapusBoq id={b.id} nama={b.judul} /> : <span />}
        <AksiBoq
          id={b.id}
          status={b.status}
          sudahDitarik={Boolean(b.quotation_id)}
          bisaKelola={boleh(profil.role, "kelolaBOQ")}
          bisaSetujui={boleh(profil.role, "setujuiBOQ")}
          bisaBuatPenawaran={boleh(profil.role, "kelolaPenawaran")}
        />
      </div>
    </div>
  );
}
