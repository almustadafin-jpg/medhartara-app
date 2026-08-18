import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import { formatIDR, formatTanggal } from "@/lib/format";
import { terbilangRupiah } from "@/lib/terbilang";

/**
 * Lampiran BOQ / RAB — tata letak lanskap ringkas (versi awal).
 *
 * Satu tingkat: Kategori besar (pita) → Item bernomor → Subtotal kategori.
 *
 * Dua versi dari satu templat:
 *   - "internal" : Harga Modal, Jumlah Modal, Harga Jual, Jumlah Jual + margin.
 *   - "klien"    : hanya Harga Jual & Jumlah Jual.
 *
 * Kolom HARI hanya dicetak bila ada baris yang harinya bukan 1.
 * Blok kategori dibiarkan boleh terpotong antar-halaman supaya hemat halaman;
 * hanya tiap baris yang dijaga utuh.
 */

const warna = {
  teks: "#0f172a",
  redup: "#64748b",
  garis: "#cbd5e1",
  latar: "#f1f5f9",
  pita: "#cdddf3",
  aksen: "#b91c1c",
  hijau: "#047857",
};

const s = StyleSheet.create({
  halaman: {
    paddingTop: 26, paddingBottom: 32, paddingHorizontal: 28,
    fontSize: 8, color: warna.teks, fontFamily: "Helvetica",
  },
  kepala: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
    marginBottom: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: warna.garis,
  },
  logo: { width: 60, height: 50, objectFit: "contain", alignSelf: "flex-start", marginBottom: 4 },
  namaPT: { fontSize: 11, fontFamily: "Helvetica-Bold", marginBottom: 3 },
  redup: { color: warna.redup, lineHeight: 1.35, fontSize: 7.2 },
  jenisDok: { fontSize: 7.2, color: warna.redup, letterSpacing: 1.1, textAlign: "right" },
  nomor: { fontSize: 12, fontFamily: "Helvetica-Bold", textAlign: "right", marginTop: 2 },
  cap: {
    marginTop: 6, alignSelf: "flex-end", paddingVertical: 2, paddingHorizontal: 7,
    borderRadius: 9, backgroundColor: warna.latar, fontSize: 7, color: warna.redup,
  },
  judul: { fontSize: 10, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  info: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  labelKecil: { fontSize: 6.5, color: warna.redup, letterSpacing: 0.8, marginBottom: 2 },

  thead: { flexDirection: "row", backgroundColor: warna.teks, paddingVertical: 4, paddingHorizontal: 5 },
  th: { fontFamily: "Helvetica-Bold", fontSize: 7, color: "#ffffff", letterSpacing: 0.3 },

  pita: { flexDirection: "row", backgroundColor: warna.pita, paddingVertical: 3.5, paddingHorizontal: 5 },
  teksPita: { fontFamily: "Helvetica-Bold", fontSize: 8, color: warna.teks, letterSpacing: 0.5 },

  tr: {
    flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: warna.garis,
    paddingVertical: 2.6, paddingHorizontal: 5, alignItems: "flex-start",
  },
  namaItem: { fontFamily: "Helvetica-Bold", fontSize: 8 },
  deskItem: { fontSize: 6.8, color: warna.redup, marginTop: 0.5, lineHeight: 1.25 },
  subtotal: {
    flexDirection: "row", paddingVertical: 3, paddingHorizontal: 5,
    backgroundColor: warna.latar, borderTopWidth: 0.6, borderTopColor: warna.redup,
  },

  cNo: { width: 20, textAlign: "center" },
  cItem: { flex: 4.4 },
  cQty: { flex: 0.9, textAlign: "right" },
  cSat: { flex: 1.1, textAlign: "center", color: warna.redup },
  cHari: { flex: 0.8, textAlign: "right" },
  cWaktu: { flex: 0.8, textAlign: "right" },
  cAngka: { flex: 2, textAlign: "right" },
  cKet: { flex: 2.4, color: warna.redup, paddingLeft: 4 },

  ringkas: {
    marginTop: 10, alignSelf: "flex-end", flexDirection: "row",
  },
  kotakTotal: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 6, paddingHorizontal: 10, marginLeft: 6, borderRadius: 4,
  },
  labelTotal: { fontFamily: "Helvetica-Bold", fontSize: 7.5, color: "#ffffff", marginRight: 8 },
  nilaiTotal: { fontFamily: "Helvetica-Bold", fontSize: 9.5, color: "#ffffff" },

  terbilang: {
    marginTop: 8, paddingVertical: 5, paddingHorizontal: 9, backgroundColor: warna.latar, borderRadius: 4,
  },
  terbilangIsi: { fontFamily: "Helvetica-Oblique", fontSize: 8, lineHeight: 1.3 },

  kaki: {
    position: "absolute", bottom: 14, left: 28, right: 28,
    borderTopWidth: 1, borderTopColor: warna.garis, paddingTop: 6,
    flexDirection: "row", justifyContent: "space-between", fontSize: 6.5, color: warna.redup,
  },
});

export interface BarisBoqPDF {
  kategori: string | null;
  nama: string;
  deskripsi: string | null;
  kuantitas: number;
  satuan: string | null;
  hari: number;
  waktu: number;
  harga_modal: number;
  harga_jual: number;
  keterangan: string | null;
  subtotal_modal: number;
  subtotal_jual: number;
}

export interface DataBoqPDF {
  versi: "klien" | "internal";
  nomor: string;
  judul: string;
  statusLabel: string;
  tanggal: string;
  perusahaan: {
    nama: string; alamat: string | null; telepon: string | null;
    email: string | null; npwp: string | null; logo_url: string | null;
  };
  pelanggan: string | null;
  proyek: string | null;
  lokasi: string | null;
  jadwal: string | null;
  items: BarisBoqPDF[];
  total_modal: number;
  total_jual: number;
  catatan: string | null;
  disetujui: { oleh: string; pada: string } | null;
}

/** Halaman lampiran BOQ (tanpa pembungkus Document) — bisa digabung ke dokumen lain. */
export function HalamanBoq({ data }: { data: DataBoqPDF }) {
  const internal = data.versi === "internal";
  const adaLogo = Boolean(data.perusahaan.logo_url);
  const adaHari = data.items.some((it) => Number(it.hari) !== 1);
  const adaWaktu = data.items.some((it) => Number(it.waktu) !== 1);
  const adaKet = data.items.some((it) => (it.keterangan ?? "").trim() !== "");
  const margin = data.total_jual - data.total_modal;
  const kontak = [data.perusahaan.telepon, data.perusahaan.email].filter(Boolean).join("  ·  ");

  const kelompok: { kategori: string; baris: BarisBoqPDF[] }[] = [];
  for (const it of data.items) {
    const k = it.kategori?.trim() || "Lain-lain";
    const ada = kelompok.find((g) => g.kategori === k);
    if (ada) ada.baris.push(it);
    else kelompok.push({ kategori: k, baris: [it] });
  }

  let no = 0;

  return (
      <Page size="A4" orientation="landscape" style={s.halaman}>
        <View style={s.kepala}>
          <View style={{ maxWidth: 380 }}>
            {adaLogo && <Image src={data.perusahaan.logo_url!} style={s.logo} />}
            {!adaLogo && <Text style={s.namaPT}>{data.perusahaan.nama}</Text>}
            {data.perusahaan.alamat && <Text style={s.redup}>{data.perusahaan.alamat}</Text>}
            {kontak && <Text style={s.redup}>{kontak}</Text>}
          </View>
          <View>
            <Text style={s.jenisDok}>{internal ? "BOQ / RAB — INTERNAL" : "RINCIAN ANGGARAN"}</Text>
            <Text style={s.nomor}>{data.nomor}</Text>
            <Text style={s.cap}>{data.statusLabel}</Text>
          </View>
        </View>

        <View style={s.info}>
          <View style={{ maxWidth: 420 }}>
            <Text style={s.judul}>{data.judul}</Text>
            {data.pelanggan && <Text style={s.redup}>Pelanggan: {data.pelanggan}</Text>}
            {data.proyek && <Text style={s.redup}>Proyek: {data.proyek}</Text>}
            {data.jadwal && <Text style={s.redup}>Pelaksanaan: {data.jadwal}</Text>}
            {data.lokasi && <Text style={s.redup}>Lokasi: {data.lokasi}</Text>}
          </View>
          <View style={{ textAlign: "right" }}>
            <Text style={s.redup}>Tanggal: {formatTanggal(data.tanggal)}</Text>
            {data.disetujui && (
              <Text style={s.redup}>
                Disetujui: {data.disetujui.oleh} · {formatTanggal(data.disetujui.pada)}
              </Text>
            )}
          </View>
        </View>

        <View style={s.thead} fixed>
          <Text style={[s.th, s.cNo]}>NO</Text>
          <Text style={[s.th, s.cItem]}>DESCRIPTION</Text>
          <Text style={[s.th, s.cQty]}>QTY</Text>
          <Text style={[s.th, s.cSat, { color: "#ffffff" }]}>SAT</Text>
          {adaHari && <Text style={[s.th, s.cHari]}>DAYS</Text>}
          {adaWaktu && <Text style={[s.th, s.cWaktu]}>TIME</Text>}
          {internal && <Text style={[s.th, s.cAngka]}>HARGA MODAL</Text>}
          {internal && <Text style={[s.th, s.cAngka]}>JUMLAH MODAL</Text>}
          <Text style={[s.th, s.cAngka]}>{internal ? "HARGA JUAL" : "HARGA"}</Text>
          <Text style={[s.th, s.cAngka]}>{internal ? "JUMLAH JUAL" : "JUMLAH"}</Text>
          {adaKet && <Text style={[s.th, s.cKet, { color: "#ffffff" }]}>KETERANGAN</Text>}
        </View>

        {kelompok.map((g) => {
          const subJual = g.baris.reduce((t, it) => t + Number(it.subtotal_jual), 0);
          const subModal = g.baris.reduce((t, it) => t + Number(it.subtotal_modal), 0);
          return (
            <View key={g.kategori}>
              <View style={s.pita} wrap={false}>
                <Text style={s.teksPita}>{g.kategori.toUpperCase()}</Text>
              </View>

              {g.baris.map((it, i) => {
                no += 1;
                return (
                  <View key={i} style={s.tr} wrap={false}>
                    <Text style={[s.cNo, { fontSize: 7.5 }]}>{no}</Text>
                    <View style={s.cItem}>
                      <Text style={s.namaItem}>{it.nama}</Text>
                      {it.deskripsi && <Text style={s.deskItem}>{it.deskripsi}</Text>}
                    </View>
                    <Text style={s.cQty}>{Number(it.kuantitas)}</Text>
                    <Text style={s.cSat}>{it.satuan ?? "—"}</Text>
                    {adaHari && (
                      <Text style={s.cHari}>{String(Number(it.hari)).replace(".", ",")}</Text>
                    )}
                    {adaWaktu && (
                      <Text style={s.cWaktu}>{String(Number(it.waktu)).replace(".", ",")}</Text>
                    )}
                    {internal && (
                      <Text style={[s.cAngka, { color: warna.redup }]}>{formatIDR(it.harga_modal)}</Text>
                    )}
                    {internal && (
                      <Text style={[s.cAngka, { color: warna.redup }]}>{formatIDR(it.subtotal_modal)}</Text>
                    )}
                    <Text style={s.cAngka}>{formatIDR(it.harga_jual)}</Text>
                    <Text style={[s.cAngka, { fontFamily: "Helvetica-Bold" }]}>
                      {formatIDR(it.subtotal_jual)}
                    </Text>
                    {adaKet && <Text style={s.cKet}>{it.keterangan ?? ""}</Text>}
                  </View>
                );
              })}

              <View style={s.subtotal} wrap={false}>
                <Text style={s.cNo} />
                <Text style={[s.cItem, { fontFamily: "Helvetica-Bold", fontSize: 7.5 }]}>
                  Subtotal {g.kategori}
                </Text>
                <Text style={s.cQty} />
                <Text style={s.cSat} />
                {adaHari && <Text style={s.cHari} />}
                {adaWaktu && <Text style={s.cWaktu} />}
                {internal && <Text style={s.cAngka} />}
                {internal && (
                  <Text style={[s.cAngka, { fontFamily: "Helvetica-Bold", color: warna.redup }]}>
                    {formatIDR(subModal)}
                  </Text>
                )}
                <Text style={s.cAngka} />
                <Text style={[s.cAngka, { fontFamily: "Helvetica-Bold" }]}>{formatIDR(subJual)}</Text>
                {adaKet && <Text style={s.cKet} />}
              </View>
            </View>
          );
        })}

        <View style={s.ringkas} wrap={false}>
          {internal && (
            <View style={[s.kotakTotal, { backgroundColor: warna.teks }]}>
              <Text style={s.labelTotal}>TOTAL MODAL</Text>
              <Text style={s.nilaiTotal}>{formatIDR(data.total_modal)}</Text>
            </View>
          )}
          <View style={[s.kotakTotal, { backgroundColor: warna.teks }]}>
            <Text style={s.labelTotal}>TOTAL JUAL</Text>
            <Text style={s.nilaiTotal}>{formatIDR(data.total_jual)}</Text>
          </View>
          {internal && (
            <View style={[s.kotakTotal, { backgroundColor: margin >= 0 ? warna.hijau : warna.aksen }]}>
              <Text style={s.labelTotal}>MARGIN</Text>
              <Text style={s.nilaiTotal}>
                {formatIDR(margin)}
                {data.total_jual > 0 ? `  (${((margin / data.total_jual) * 100).toFixed(1)}%)` : ""}
              </Text>
            </View>
          )}
        </View>

        <View style={s.terbilang} wrap={false}>
          <Text style={s.labelKecil}>TERBILANG</Text>
          <Text style={s.terbilangIsi}>{terbilangRupiah(data.total_jual)}</Text>
        </View>

        {data.catatan && (
          <View style={{ marginTop: 8 }} wrap={false}>
            <Text style={s.labelKecil}>CATATAN</Text>
            <Text style={s.redup}>{data.catatan}</Text>
          </View>
        )}

        <View style={s.kaki} fixed>
          <Text>
            {data.perusahaan.nama} · {data.nomor}
            {internal ? " · DOKUMEN INTERNAL" : ""}
          </Text>
          <Text render={({ pageNumber, totalPages }) => `Halaman ${pageNumber} dari ${totalPages}`} />
        </View>
      </Page>
  );
}

export function BoqPDF({ data }: { data: DataBoqPDF }) {
  return (
    <Document title={`BOQ ${data.nomor}`} author={data.perusahaan.nama}>
      <HalamanBoq data={data} />
    </Document>
  );
}
