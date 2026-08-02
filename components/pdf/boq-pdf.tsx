import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import { formatIDR, formatTanggal } from "@/lib/format";
import { terbilangRupiah } from "@/lib/terbilang";

/**
 * Lampiran BOQ / RAB — struktur dua tingkat mengikuti rujukan budget:
 *
 *   Kategori besar (pita biru)
 *     └─ Sub-kelompok (baris tebal, opsional)
 *         └─ Item
 *
 * Dua versi dari satu templat:
 *   - "internal" : lanskap, menampilkan Harga Modal, Jumlah Modal,
 *                  Harga Jual, Jumlah Jual, + margin (Admin/Direktur).
 *   - "klien"    : potret, hanya harga jual (lampiran penawaran/invoice).
 *
 * Kolom HARI hanya dicetak bila ada baris yang harinya bukan 1.
 */

const warna = {
  teks: "#0f172a",
  redup: "#64748b",
  garis: "#cbd5e1",
  latar: "#f1f5f9",
  pita: "#cdddf3",
  subLatar: "#eef3fb",
  subTeks: "#1d4ed8",
  aksen: "#b91c1c",
  hijau: "#047857",
};

const s = StyleSheet.create({
  halaman: {
    paddingTop: 32, paddingBottom: 46, paddingHorizontal: 30,
    fontSize: 8, color: warna.teks, fontFamily: "Helvetica",
  },
  kepala: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
    marginBottom: 12, paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: warna.garis,
  },
  logo: { width: 72, height: 60, objectFit: "contain", alignSelf: "flex-start", marginBottom: 6 },
  namaPT: { fontSize: 12, fontFamily: "Helvetica-Bold", marginBottom: 3 },
  redup: { color: warna.redup, lineHeight: 1.4, fontSize: 7.5 },
  jenisDok: { fontSize: 7.5, color: warna.redup, letterSpacing: 1.2, textAlign: "right" },
  nomor: { fontSize: 13, fontFamily: "Helvetica-Bold", textAlign: "right", marginTop: 3 },
  cap: {
    marginTop: 8, alignSelf: "flex-end",
    paddingVertical: 2, paddingHorizontal: 8, borderRadius: 10,
    backgroundColor: warna.latar, fontSize: 7, color: warna.redup,
  },
  judul: { fontSize: 11, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  info: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  labelKecil: { fontSize: 6.5, color: warna.redup, letterSpacing: 0.8, marginBottom: 2 },

  thead: {
    flexDirection: "row", backgroundColor: warna.teks,
    paddingVertical: 5, paddingHorizontal: 5,
  },
  th: { fontFamily: "Helvetica-Bold", fontSize: 7, color: "#ffffff", letterSpacing: 0.3 },

  pita: {
    flexDirection: "row", backgroundColor: warna.pita,
    paddingVertical: 5, paddingHorizontal: 6,
  },
  teksPita: { fontFamily: "Helvetica-Bold", fontSize: 8.5, color: warna.teks, letterSpacing: 0.5 },

  subRow: {
    flexDirection: "row", backgroundColor: warna.subLatar,
    paddingVertical: 4, paddingHorizontal: 6,
  },
  teksSub: { fontFamily: "Helvetica-Bold", fontSize: 7.5, color: warna.subTeks, letterSpacing: 0.4 },

  tr: {
    flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: warna.garis,
    paddingVertical: 4, paddingHorizontal: 5, alignItems: "flex-start",
  },
  namaItem: { fontFamily: "Helvetica-Bold", fontSize: 8 },
  deskItem: { fontSize: 6.8, color: warna.redup, marginTop: 1, lineHeight: 1.3 },

  subtotal: {
    flexDirection: "row", paddingVertical: 4, paddingHorizontal: 5,
    backgroundColor: warna.latar, borderTopWidth: 0.6, borderTopColor: warna.redup,
  },

  ringkas: { marginTop: 12, alignSelf: "flex-end", width: 260 },
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
  terbilangIsi: { fontFamily: "Helvetica-Oblique", fontSize: 8, lineHeight: 1.35 },

  kaki: {
    position: "absolute", bottom: 22, left: 30, right: 30,
    borderTopWidth: 1, borderTopColor: warna.garis, paddingTop: 7,
    flexDirection: "row", justifyContent: "space-between",
    fontSize: 6.5, color: warna.redup,
  },
});

export interface BarisBoqPDF {
  kategori: string | null;
  sub_kategori: string | null;
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

interface Sub { sub: string; baris: BarisBoqPDF[] }
interface Kategori { kategori: string; subs: Sub[] }

/** Kelompokkan dua tingkat: kategori → sub-kelompok → item (urutan kemunculan). */
function kelompokkan(items: BarisBoqPDF[]): Kategori[] {
  const out: Kategori[] = [];
  for (const it of items) {
    const k = it.kategori?.trim() || "Lain-lain";
    const sg = it.sub_kategori?.trim() || "";
    let kat = out.find((x) => x.kategori === k);
    if (!kat) { kat = { kategori: k, subs: [] }; out.push(kat); }
    let sub = kat.subs.find((x) => x.sub === sg);
    if (!sub) { sub = { sub: sg, baris: [] }; kat.subs.push(sub); }
    sub.baris.push(it);
  }
  return out;
}

export function BoqPDF({ data }: { data: DataBoqPDF }) {
  const internal = data.versi === "internal";
  const adaLogo = Boolean(data.perusahaan.logo_url);
  const adaHari = data.items.some((it) => Number(it.hari) !== 1);
  const margin = data.total_jual - data.total_modal;
  const kontak = [data.perusahaan.telepon, data.perusahaan.email].filter(Boolean).join("  ·  ");
  const kelompok = kelompokkan(data.items);

  // Lebar kolom (flex). Modal hanya untuk versi internal.
  const cNo = { width: 22, textAlign: "center" as const };
  const cItem = { flex: internal ? 5 : 6 };
  const cVol = { flex: 0.9, textAlign: "right" as const };
  const cSat = { flex: 1.1, textAlign: "center" as const, color: warna.redup };
  const cHari = { flex: 0.8, textAlign: "right" as const };
  const cAngka = { flex: 2, textAlign: "right" as const };

  // Lebar penuh baris tabel = jumlah kolom item; band/sub memakai full row.
  let no = 0;

  return (
    <Document title={`BOQ ${data.nomor}`} author={data.perusahaan.nama}>
      <Page size="A4" orientation={internal ? "landscape" : "portrait"} style={s.halaman}>
        <View style={s.kepala}>
          <View style={{ maxWidth: 340 }}>
            {adaLogo && <Image src={data.perusahaan.logo_url!} style={s.logo} />}
            {!adaLogo && <Text style={s.namaPT}>{data.perusahaan.nama}</Text>}
            {data.perusahaan.alamat && <Text style={s.redup}>{data.perusahaan.alamat}</Text>}
            {kontak && <Text style={s.redup}>{kontak}</Text>}
          </View>
          <View>
            <Text style={s.jenisDok}>
              {internal ? "BOQ / RAB — INTERNAL" : "RINCIAN ANGGARAN BIAYA"}
            </Text>
            <Text style={s.nomor}>{data.nomor}</Text>
            <Text style={s.cap}>{data.statusLabel}</Text>
          </View>
        </View>

        <View style={s.info}>
          <View style={{ maxWidth: 360 }}>
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
          <Text style={[s.th, cNo]}>NO</Text>
          <Text style={[s.th, cItem]}>URAIAN PEKERJAAN</Text>
          <Text style={[s.th, cVol]}>VOL</Text>
          <Text style={[s.th, cSat, { color: "#ffffff" }]}>SAT</Text>
          {adaHari && <Text style={[s.th, cHari]}>HARI</Text>}
          {internal && <Text style={[s.th, cAngka]}>HARGA MODAL</Text>}
          {internal && <Text style={[s.th, cAngka]}>JUMLAH MODAL</Text>}
          <Text style={[s.th, cAngka]}>HARGA JUAL</Text>
          <Text style={[s.th, cAngka]}>JUMLAH JUAL</Text>
        </View>

        {kelompok.map((kat) => {
          const subModal = kat.subs.reduce(
            (t, sg) => t + sg.baris.reduce((a, it) => a + Number(it.subtotal_modal), 0), 0);
          const subJual = kat.subs.reduce(
            (t, sg) => t + sg.baris.reduce((a, it) => a + Number(it.subtotal_jual), 0), 0);

          return (
            <View key={kat.kategori}>
              <View style={s.pita} wrap={false}>
                <Text style={s.teksPita}>{kat.kategori.toUpperCase()}</Text>
              </View>

              {kat.subs.map((sg, si) => (
                <View key={si}>
                  {sg.sub !== "" && (
                    <View style={s.subRow} wrap={false}>
                      <Text style={s.teksSub}>{sg.sub.toUpperCase()}</Text>
                    </View>
                  )}
                  {sg.baris.map((it, i) => {
                    no += 1;
                    return (
                      <View key={i} style={s.tr} wrap={false}>
                        <Text style={[cNo, { fontSize: 7.5 }]}>{no}</Text>
                        <View style={cItem}>
                          <Text style={s.namaItem}>{it.nama}</Text>
                          {it.deskripsi && <Text style={s.deskItem}>{it.deskripsi}</Text>}
                        </View>
                        <Text style={cVol}>{Number(it.kuantitas)}</Text>
                        <Text style={cSat}>{it.satuan ?? "—"}</Text>
                        {adaHari && <Text style={cHari}>{Number(it.hari)}</Text>}
                        {internal && (
                          <Text style={[cAngka, { color: warna.redup }]}>{formatIDR(it.harga_modal)}</Text>
                        )}
                        {internal && (
                          <Text style={[cAngka, { color: warna.redup }]}>{formatIDR(it.subtotal_modal)}</Text>
                        )}
                        <Text style={cAngka}>{formatIDR(it.harga_jual)}</Text>
                        <Text style={[cAngka, { fontFamily: "Helvetica-Bold" }]}>
                          {formatIDR(it.subtotal_jual)}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              ))}

              <View style={s.subtotal} wrap={false}>
                <Text style={cNo} />
                <Text style={[cItem, { fontFamily: "Helvetica-Bold", fontSize: 7.5 }]}>
                  Subtotal {kat.kategori}
                </Text>
                <Text style={cVol} />
                <Text style={cSat} />
                {adaHari && <Text style={cHari} />}
                {internal && <Text style={cAngka} />}
                {internal && (
                  <Text style={[cAngka, { fontFamily: "Helvetica-Bold", color: warna.redup }]}>
                    {formatIDR(subModal)}
                  </Text>
                )}
                <Text style={cAngka} />
                <Text style={[cAngka, { fontFamily: "Helvetica-Bold" }]}>{formatIDR(subJual)}</Text>
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
                  {data.total_jual > 0 ? `  (${((margin / data.total_jual) * 100).toFixed(1)}%)` : ""}
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
