import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import { formatIDR, formatTanggal } from "@/lib/format";
import { terbilangRupiah } from "@/lib/terbilang";

/**
 * Lampiran BOQ / RAB.
 *
 * Dua versi dari satu templat:
 *   - "klien"    : hanya harga jual — dilampirkan ke penawaran/invoice
 *   - "internal" : modal, jual, dan margin per baris
 *
 * Kolom HARI hanya dicetak bila ada baris yang harinya bukan 1,
 * supaya dokumen jasa non-harian tidak memuat kolom kosong.
 */

const warna = {
  teks: "#0f172a",
  redup: "#64748b",
  garis: "#e2e8f0",
  latar: "#f8fafc",
  kategori: "#fdf2f2",
  aksen: "#b91c1c",
  hijau: "#047857",
};

const s = StyleSheet.create({
  halaman: {
    paddingTop: 34, paddingBottom: 48, paddingHorizontal: 34,
    fontSize: 8.5, color: warna.teks, fontFamily: "Helvetica",
  },
  kepala: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
    marginBottom: 14, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: warna.garis,
  },
  logo: { width: 76, height: 64, objectFit: "contain", alignSelf: "flex-start", marginBottom: 8 },
  namaPT: { fontSize: 12, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  redup: { color: warna.redup, lineHeight: 1.4, fontSize: 8 },
  jenisDok: { fontSize: 8, color: warna.redup, letterSpacing: 1.2, textAlign: "right" },
  nomor: { fontSize: 14, fontFamily: "Helvetica-Bold", textAlign: "right", marginTop: 3 },
  judul: { fontSize: 10, fontFamily: "Helvetica-Bold", marginBottom: 2 },

  info: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  labelKecil: { fontSize: 7, color: warna.redup, letterSpacing: 0.8, marginBottom: 2 },

  thead: {
    flexDirection: "row", backgroundColor: warna.teks,
    paddingVertical: 6, paddingHorizontal: 6,
  },
  th: { fontFamily: "Helvetica-Bold", fontSize: 7.5, color: "#ffffff", letterSpacing: 0.4 },
  barisKategori: {
    flexDirection: "row", backgroundColor: warna.kategori,
    paddingVertical: 5, paddingHorizontal: 6,
    borderBottomWidth: 1, borderBottomColor: warna.garis,
  },
  teksKategori: {
    fontFamily: "Helvetica-Bold", fontSize: 8, color: warna.aksen, letterSpacing: 0.6,
  },
  tr: {
    flexDirection: "row", borderBottomWidth: 1, borderBottomColor: warna.garis,
    paddingVertical: 5, paddingHorizontal: 6,
  },
  namaItem: { fontFamily: "Helvetica-Bold", fontSize: 8.5 },
  deskItem: { fontSize: 7.5, color: warna.redup, marginTop: 1, lineHeight: 1.3 },
  barisSubtotal: {
    flexDirection: "row", paddingVertical: 5, paddingHorizontal: 6,
    borderBottomWidth: 1, borderBottomColor: warna.garis, backgroundColor: warna.latar,
  },

  cItem: { flex: 5 },
  cQty: { flex: 1, textAlign: "right" },
  cSat: { flex: 1.2, textAlign: "center", color: warna.redup },
  cHari: { flex: 1, textAlign: "right" },
  cAngka: { flex: 2, textAlign: "right" },

  ringkas: { marginTop: 12, alignSelf: "flex-end", width: 250 },
  barisRingkas: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  barisTotal: {
    flexDirection: "row", justifyContent: "space-between",
    borderTopWidth: 1, borderTopColor: warna.garis,
    paddingTop: 6, marginTop: 4, fontSize: 11, fontFamily: "Helvetica-Bold",
  },
  terbilang: {
    marginTop: 10, paddingVertical: 6, paddingHorizontal: 10,
    backgroundColor: warna.latar, borderRadius: 4,
  },
  terbilangIsi: { fontFamily: "Helvetica-Oblique", fontSize: 8.5, lineHeight: 1.35 },

  kaki: {
    position: "absolute", bottom: 24, left: 34, right: 34,
    borderTopWidth: 1, borderTopColor: warna.garis, paddingTop: 8,
    flexDirection: "row", justifyContent: "space-between",
    fontSize: 7, color: warna.redup,
  },
  cap: {
    marginTop: 10, alignSelf: "flex-start",
    paddingVertical: 3, paddingHorizontal: 8, borderRadius: 10,
    backgroundColor: warna.latar, fontSize: 7.5, color: warna.redup,
  },
});

export interface BarisBoqPDF {
  kategori: string | null;
  nama: string;
  deskripsi: string | null;
  kuantitas: number;
  satuan: string | null;
  hari: number;
  harga_modal: number;
  harga_jual: number;
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

export function BoqPDF({ data }: { data: DataBoqPDF }) {
  const internal = data.versi === "internal";
  const adaLogo = Boolean(data.perusahaan.logo_url);
  const adaHari = data.items.some((it) => Number(it.hari) !== 1);
  const margin = data.total_jual - data.total_modal;

  const kontak = [data.perusahaan.telepon, data.perusahaan.email].filter(Boolean).join("  ·  ");

  const kelompok: { kategori: string; baris: BarisBoqPDF[] }[] = [];
  for (const it of data.items) {
    const k = it.kategori?.trim() || "Lain-lain";
    const ada = kelompok.find((g) => g.kategori === k);
    if (ada) ada.baris.push(it);
    else kelompok.push({ kategori: k, baris: [it] });
  }

  return (
    <Document title={`BOQ ${data.nomor}`} author={data.perusahaan.nama}>
      <Page size="A4" style={s.halaman}>
        <View style={s.kepala}>
          <View style={{ maxWidth: 300 }}>
            {adaLogo && <Image src={data.perusahaan.logo_url!} style={s.logo} />}
            {!adaLogo && <Text style={s.namaPT}>{data.perusahaan.nama}</Text>}
            {data.perusahaan.alamat && <Text style={s.redup}>{data.perusahaan.alamat}</Text>}
            {kontak && <Text style={s.redup}>{kontak}</Text>}
          </View>

          <View>
            <Text style={s.jenisDok}>
              {internal ? "BOQ / RAB — INTERNAL" : "RINCIAN ANGGARAN"}
            </Text>
            <Text style={s.nomor}>{data.nomor}</Text>
            <Text style={s.cap}>{data.statusLabel}</Text>
          </View>
        </View>

        <View style={s.info}>
          <View style={{ maxWidth: 320 }}>
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
          <Text style={[s.th, s.cItem]}>ITEM &amp; DESKRIPSI</Text>
          <Text style={[s.th, s.cQty]}>QTY</Text>
          <Text style={[s.th, s.cSat, { color: "#ffffff" }]}>SATUAN</Text>
          {adaHari && <Text style={[s.th, s.cHari]}>HARI</Text>}
          {internal && <Text style={[s.th, s.cAngka]}>MODAL</Text>}
          <Text style={[s.th, s.cAngka]}>HARGA</Text>
          <Text style={[s.th, s.cAngka]}>TOTAL</Text>
        </View>

        {kelompok.map((g) => {
          const subJual = g.baris.reduce((t, it) => t + Number(it.subtotal_jual), 0);
          const subModal = g.baris.reduce((t, it) => t + Number(it.subtotal_modal), 0);

          return (
            <View key={g.kategori}>
              <View style={s.barisKategori} wrap={false}>
                <Text style={s.teksKategori}>{g.kategori.toUpperCase()}</Text>
              </View>

              {g.baris.map((it, i) => (
                <View key={i} style={s.tr} wrap={false}>
                  <View style={s.cItem}>
                    <Text style={s.namaItem}>{it.nama}</Text>
                    {it.deskripsi && <Text style={s.deskItem}>{it.deskripsi}</Text>}
                  </View>
                  <Text style={s.cQty}>{Number(it.kuantitas)}</Text>
                  <Text style={s.cSat}>{it.satuan ?? "—"}</Text>
                  {adaHari && <Text style={s.cHari}>{Number(it.hari)}</Text>}
                  {internal && (
                    <Text style={[s.cAngka, { color: warna.redup }]}>
                      {formatIDR(it.harga_modal)}
                    </Text>
                  )}
                  <Text style={s.cAngka}>{formatIDR(it.harga_jual)}</Text>
                  <Text style={[s.cAngka, { fontFamily: "Helvetica-Bold" }]}>
                    {formatIDR(it.subtotal_jual)}
                  </Text>
                </View>
              ))}

              <View style={s.barisSubtotal} wrap={false}>
                <Text style={[s.cItem, { fontFamily: "Helvetica-Bold", fontSize: 8 }]}>
                  Subtotal {g.kategori}
                </Text>
                <Text style={s.cQty} />
                <Text style={s.cSat} />
                {adaHari && <Text style={s.cHari} />}
                {internal && (
                  <Text style={[s.cAngka, { color: warna.redup }]}>{formatIDR(subModal)}</Text>
                )}
                <Text style={s.cAngka} />
                <Text style={[s.cAngka, { fontFamily: "Helvetica-Bold" }]}>
                  {formatIDR(subJual)}
                </Text>
              </View>
            </View>
          );
        })}

        <View style={s.ringkas} wrap={false}>
          {internal && (
            <>
              <View style={s.barisRingkas}>
                <Text style={s.redup}>Total modal</Text>
                <Text>{formatIDR(data.total_modal)}</Text>
              </View>
              <View style={s.barisRingkas}>
                <Text style={s.redup}>Margin</Text>
                <Text style={{ color: margin >= 0 ? warna.hijau : warna.aksen }}>
                  {formatIDR(margin)}
                  {data.total_jual > 0
                    ? `  (${((margin / data.total_jual) * 100).toFixed(1)}%)`
                    : ""}
                </Text>
              </View>
            </>
          )}
          <View style={s.barisTotal}>
            <Text>Total</Text>
            <Text>{formatIDR(data.total_jual)}</Text>
          </View>
        </View>

        <View style={s.terbilang} wrap={false}>
          <Text style={s.labelKecil}>TERBILANG</Text>
          <Text style={s.terbilangIsi}>{terbilangRupiah(data.total_jual)}</Text>
        </View>

        {data.catatan && (
          <View style={{ marginTop: 10 }} wrap={false}>
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
    </Document>
  );
}
