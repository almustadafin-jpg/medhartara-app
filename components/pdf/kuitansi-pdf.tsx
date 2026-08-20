import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import { formatIDR, formatTanggal } from "@/lib/format";
import { terbilangRupiah } from "@/lib/terbilang";

/**
 * Kuitansi bergaya Indonesia.
 *
 * Empat baris wajib yang lazim ada pada kuitansi resmi:
 *   Sudah terima dari · Uang sejumlah (terbilang) · Untuk pembayaran · Nominal
 *
 * Dicetak setengah halaman A4 agar hemat kertas — dua kuitansi muat
 * satu lembar bila dicetak bolak-balik atau dipotong.
 */

const warna = {
  teks: "#0f172a",
  redup: "#64748b",
  garis: "#cbd5e1",
  latar: "#f8fafc",
  aksen: "#b91c1c",
};

const s = StyleSheet.create({
  halaman: {
    paddingTop: 22, paddingBottom: 22, paddingHorizontal: 30,
    fontSize: 10, color: warna.teks, fontFamily: "Helvetica",
  },
  bingkai: {
    borderWidth: 1, borderColor: warna.garis, borderRadius: 6, padding: 16,
  },
  kepala: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
    marginBottom: 12, paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: warna.garis,
  },
  logo: { width: 58, height: 49, objectFit: "contain", alignSelf: "flex-start", marginBottom: 6 },
  namaPT: { fontSize: 12, fontFamily: "Helvetica-Bold", marginBottom: 3 },
  redup: { color: warna.redup, fontSize: 8, lineHeight: 1.4 },

  judul: { fontSize: 18, fontFamily: "Helvetica-Bold", letterSpacing: 2, textAlign: "right" },
  nomor: { fontSize: 10, color: warna.redup, textAlign: "right", marginTop: 3 },

  baris: { flexDirection: "row", marginBottom: 7 },
  label: { width: 108, color: warna.redup, fontSize: 9.5 },
  isi: { flex: 1, fontSize: 10, lineHeight: 1.4 },
  isiTebal: { flex: 1, fontSize: 10.5, fontFamily: "Helvetica-Bold" },
  isiMiring: { flex: 1, fontSize: 10, fontFamily: "Helvetica-Oblique", lineHeight: 1.4 },

  kakiBaris: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end",
    marginTop: 12,
  },
  kotakNominal: {
    borderWidth: 1.5, borderColor: warna.teks, borderRadius: 4,
    paddingVertical: 8, paddingHorizontal: 16, alignSelf: "flex-start",
  },
  labelNominal: { fontSize: 7, color: warna.redup, letterSpacing: 0.8, marginBottom: 2 },
  nominal: { fontSize: 15, fontFamily: "Helvetica-Bold" },

  kolomTtd: { width: 215, alignItems: "center" },
  ttdKota: { fontSize: 9, color: warna.teks, marginBottom: 4 },
  ttdSalam: { fontSize: 9, color: warna.teks, marginBottom: 78 },
  ttdNama: {
    width: 205, fontSize: 8.5, fontFamily: "Helvetica-Bold",
    borderTopWidth: 1, borderTopColor: warna.teks,
    paddingTop: 4, textAlign: "center",
  },
  ttdJabatan: { width: 205, fontSize: 8, color: warna.redup, marginTop: 2, textAlign: "center" },

  catatanKaki: {
    marginTop: 10, paddingTop: 6,
    borderTopWidth: 1, borderTopColor: warna.garis,
    fontSize: 7.5, color: warna.redup, lineHeight: 1.4,
  },
});

export interface DataKuitansiPDF {
  nomor: string;
  tanggal: string;
  jumlah: number;
  metode: string;
  untukPembayaran: string | null;
  dariPelanggan: string;
  invoiceNomor: string | null;
  sisaTagihan: number | null;
  perusahaan: {
    nama: string; alamat: string | null; telepon: string | null;
    email: string | null; logo_url: string | null;
  };
  penandaTangan: { nama: string | null; jabatan: string | null } | null;
  kota: string;
}

export function KuitansiPDF({ data }: { data: DataKuitansiPDF }) {
  const adaLogo = Boolean(data.perusahaan.logo_url);
  const kontak = [data.perusahaan.telepon, data.perusahaan.email].filter(Boolean).join("  ·  ");

  return (
    <Document title={`Kuitansi ${data.nomor}`} author={data.perusahaan.nama}>
      <Page size="A4" style={s.halaman}>
        <View style={s.bingkai}>
          <View style={s.kepala}>
            <View style={{ maxWidth: 260 }}>
              {adaLogo && <Image src={data.perusahaan.logo_url!} style={s.logo} />}
              {!adaLogo && <Text style={s.namaPT}>{data.perusahaan.nama}</Text>}
              {data.perusahaan.alamat && <Text style={s.redup}>{data.perusahaan.alamat}</Text>}
              {kontak && <Text style={s.redup}>{kontak}</Text>}
            </View>

            <View>
              <Text style={s.judul}>KUITANSI</Text>
              <Text style={s.nomor}>No. {data.nomor}</Text>
            </View>
          </View>

          <View style={s.baris}>
            <Text style={s.label}>Sudah terima dari</Text>
            <Text style={s.isiTebal}>{data.dariPelanggan}</Text>
          </View>

          <View style={s.baris}>
            <Text style={s.label}>Uang sejumlah</Text>
            <Text style={s.isiMiring}>{terbilangRupiah(data.jumlah)}</Text>
          </View>

          <View style={s.baris}>
            <Text style={s.label}>Untuk pembayaran</Text>
            <Text style={s.isi}>
              {data.untukPembayaran ?? "—"}
              {data.metode ? ` (${data.metode})` : ""}
            </Text>
          </View>

          <View style={s.kakiBaris}>
            <View>
              <View style={s.kotakNominal}>
                <Text style={s.labelNominal}>JUMLAH DITERIMA</Text>
                <Text style={s.nominal}>{formatIDR(data.jumlah)}</Text>
              </View>
            </View>

            <View style={s.kolomTtd}>
              <Text style={s.ttdKota}>
                {data.kota}, {formatTanggal(data.tanggal)}
              </Text>
              <Text style={s.ttdSalam}>Penerima,</Text>
              <Text style={s.ttdNama}>{data.penandaTangan?.nama ?? data.perusahaan.nama}</Text>
              {data.penandaTangan?.jabatan && (
                <Text style={s.ttdJabatan}>{data.penandaTangan.jabatan}</Text>
              )}
            </View>
          </View>

          <Text style={s.catatanKaki}>
            {data.invoiceNomor ? `Terhadap invoice ${data.invoiceNomor}. ` : ""}
            {data.sisaTagihan !== null && data.sisaTagihan > 0
              ? `Sisa tagihan setelah pembayaran ini: ${formatIDR(data.sisaTagihan)}.`
              : data.sisaTagihan === 0
                ? "Dengan pembayaran ini tagihan dinyatakan LUNAS."
                : ""}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
