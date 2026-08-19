import {
  Document, Page, Text, View, StyleSheet, Image, Font,
} from "@react-pdf/renderer";
import { formatIDR, formatTanggal } from "@/lib/format";
import { terbilangRupiah } from "@/lib/terbilang";
import { hitungPPN, labelPPN } from "@/lib/pajak";

// Cegah pemenggalan kata di tengah (mis. "In-donesia"): kata dibiarkan utuh,
// pindah baris hanya di antar-kata. Berlaku global untuk semua dokumen PDF.
Font.registerHyphenationCallback((kata) => [kata]);

/**
 * Template PDF bersama untuk Penawaran & Invoice.
 *
 * Memakai @react-pdf/renderer, bukan Chromium headless: tidak perlu
 * mengemas peramban 50 MB ke serverless, dan hasilnya deterministik.
 * Font bawaan Helvetica sudah memuat seluruh karakter Latin yang
 * dibutuhkan bahasa Indonesia.
 */

const warna = {
  // Seluruh teks dokumen memakai hitam agar kontras & tegas saat dicetak.
  teks: "#000000",
  redup: "#000000",
  garis: "#e2e8f0",
  latar: "#f8fafc",
  merah: "#000000",
  hijau: "#000000",
};

const s = StyleSheet.create({
  halaman: {
    paddingTop: 34, paddingBottom: 48, paddingHorizontal: 40,
    fontSize: 9, color: warna.teks, fontFamily: "Helvetica",
  },
  kepala: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
    marginBottom: 14, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: warna.garis,
  },
  kolomPT: { maxWidth: 300 },
  namaPT: { fontSize: 13, fontFamily: "Helvetica-Bold", marginBottom: 5 },
  // fontSize WAJIB eksplisit: @react-pdf menghitung lineHeight terhadap
  // fontSize milik Text itu sendiri; tanpa ini spasinya jadi terlalu lebar.
  redup: { color: warna.redup, fontSize: 9, lineHeight: 1.15 },

  /**
   * Logo Medhartara: 571 x 480 px → rasio 1,19 : 1.
   * 76 x 64 pt mempertahankan rasio itu (76/64 = 1,1875).
   *
   * Kedua dimensi WAJIB ditulis. Bila hanya tinggi yang diisi, gambar
   * ikut aturan flexbox dan melar selebar kolom (300pt) — logo jadi
   * tertarik mendatar. `alignSelf` mencegahnya meregang.
   */
  logo: {
    width: 76,
    height: 64,
    objectFit: "contain",
    alignSelf: "flex-start",
    marginBottom: 10,
  },

  barisAlamat: { color: warna.redup, fontSize: 8.5, lineHeight: 1.45 },
  barisKontak: { color: warna.redup, fontSize: 8.5, lineHeight: 1.45, marginTop: 2 },

  jenisDok: { fontSize: 8, color: warna.redup, letterSpacing: 1.2, textAlign: "right" },
  nomor: { fontSize: 15, fontFamily: "Helvetica-Bold", textAlign: "right", marginTop: 3 },
  status: {
    marginTop: 7, alignSelf: "flex-end", paddingVertical: 3, paddingHorizontal: 8,
    borderRadius: 10, backgroundColor: warna.latar, fontSize: 8, color: warna.redup,
  },

  pihak: { flexDirection: "row", justifyContent: "space-between", marginBottom: 14 },
  labelKecil: { fontSize: 7, color: warna.redup, letterSpacing: 0.8, marginBottom: 3 },

  thead: {
    flexDirection: "row", backgroundColor: warna.latar,
    borderBottomWidth: 1, borderBottomColor: warna.garis,
    paddingVertical: 6, paddingHorizontal: 6,
  },
  tr: {
    flexDirection: "row", borderBottomWidth: 1, borderBottomColor: warna.garis,
    paddingVertical: 5, paddingHorizontal: 6,
  },
  th: { fontFamily: "Helvetica-Bold", fontSize: 8, color: warna.redup },
  cDeskripsi: { flex: 4 },
  cQty: { flex: 1, textAlign: "right" },
  cSatuan: { flex: 1, textAlign: "center", color: warna.redup },
  cHarga: { flex: 2, textAlign: "right" },
  cSubtotal: { flex: 2, textAlign: "right" },

  barisPenutupTabel: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "flex-start", marginTop: 10,
  },
  ringkas: { width: 220 },
  barisRingkas: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2.5 },
  barisTotal: {
    flexDirection: "row", justifyContent: "space-between", paddingTop: 6, marginTop: 4,
    borderTopWidth: 1, borderTopColor: warna.garis,
    fontSize: 11, fontFamily: "Helvetica-Bold",
  },

  terbilang: {
    flex: 1, maxWidth: 260, marginRight: 24,
    paddingVertical: 6, paddingHorizontal: 10,
    backgroundColor: warna.latar, borderRadius: 4,
  },
  terbilangIsi: {
    fontFamily: "Helvetica-Oblique", fontSize: 9, lineHeight: 1.4, color: warna.teks,
  },

  barisPenutup: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "flex-start", marginTop: 12,
  },
  kolomBayar: { flex: 1, maxWidth: 300, marginRight: 24 },
  barisBank: { color: warna.teks, fontSize: 9, lineHeight: 1.15 },

  // Diberi jarak atas agar "Hormat kami" tidak menempel pada
  // blok ringkasan total yang berakhir tepat di atasnya.
  kolomTtd: { width: 190, alignItems: "center", marginTop: 38 },
  ttdSalam: { fontSize: 9, color: warna.teks, marginBottom: 62 },
  ttdNama: {
    width: 160,
    fontSize: 9.5, fontFamily: "Helvetica-Bold",
    borderTopWidth: 1, borderTopColor: warna.teks,
    paddingTop: 4, textAlign: "center",
  },
  ttdJabatan: {
    width: 160,
    fontSize: 8.5, color: warna.redup, marginTop: 2, textAlign: "center",
  },

  bagian: { marginTop: 10 },
  judulBagian: { fontSize: 9, fontFamily: "Helvetica-Bold", marginBottom: 3 },
  kotakCatatan: {
    marginTop: 8, padding: 8, backgroundColor: warna.latar, borderRadius: 4, lineHeight: 1.4,
  },

  kaki: {
    position: "absolute", bottom: 24, left: 40, right: 40,
    borderTopWidth: 1, borderTopColor: warna.garis, paddingTop: 8,
    flexDirection: "row", justifyContent: "space-between",
    fontSize: 7, color: warna.redup,
  },
});

export interface BarisItemPDF {
  deskripsi: string;
  kuantitas: number;
  satuan: string | null;
  harga_satuan: number;
  subtotal: number;
}

export interface PembayaranPDF {
  termin_ke: number | null;
  tanggal: string;
  metode: string;
  jumlah: number;
}

export interface DataDokumenPDF {
  jenis: "penawaran" | "invoice";
  nomor: string;
  statusLabel: string;
  tanggal: string;
  tanggalKeduaLabel: string;
  tanggalKedua: string | null;

  perusahaan: {
    nama: string; alamat: string | null; telepon: string | null;
    email: string | null; npwp: string | null; logo_url: string | null;
    bank_nama: string | null; bank_rekening: string | null; bank_atas_nama: string | null;
  };
  pelanggan: {
    nama: string; narahubung: string | null; alamat: string | null; npwp: string | null;
  };
  proyek: string | null;
  lokasi?: string | null;
  jadwal?: string | null;

  items: BarisItemPDF[];
  subtotal: number;
  diskon_persen: number;
  pajak_persen: number;
  total: number;

  dibayar?: number;
  sisa?: number;
  pembayaran?: PembayaranPDF[];

  catatan: string | null;
  ditandatangani?: { oleh: string; pada: string } | null;
  penandaTangan?: { nama: string | null; jabatan: string | null } | null;
}

/** Halaman dokumen (tanpa pembungkus Document) — agar bisa digabung dengan lampiran. */
export function HalamanDokumen({ data }: { data: DataDokumenPDF }) {
  const potongan = (data.subtotal * data.diskon_persen) / 100;
  const dasar = data.subtotal - potongan;
  const ppn = hitungPPN(dasar, data.pajak_persen);
  const adalahInvoice = data.jenis === "invoice";
  const adaLogo = Boolean(data.perusahaan.logo_url);

  // Telepon dan email digabung hanya bila keduanya ada, sehingga tidak
  // pernah muncul pemisah menggantung seperti " · email@..."
  const kontak = [data.perusahaan.telepon, data.perusahaan.email]
    .filter(Boolean)
    .join("  ·  ");

  return (
      <Page size="A4" style={s.halaman}>
        <View style={s.kepala}>
          <View style={s.kolomPT}>
            {adaLogo && <Image src={data.perusahaan.logo_url!} style={s.logo} />}

            {/* Nama hanya dicetak sebagai teks bila TIDAK ada logo —
                logo Medhartara sudah memuat wordmark, mencetaknya dua
                kali membuat kop terlihat amatir. */}
            {!adaLogo && <Text style={s.namaPT}>{data.perusahaan.nama}</Text>}

            {data.perusahaan.alamat && (
              <Text style={s.barisAlamat}>{data.perusahaan.alamat}</Text>
            )}
            {kontak && <Text style={s.barisKontak}>{kontak}</Text>}
            {data.perusahaan.npwp && (
              <Text style={s.barisKontak}>NPWP {data.perusahaan.npwp}</Text>
            )}
          </View>

          <View>
            <Text style={s.jenisDok}>
              {adalahInvoice ? "INVOICE" : "PENAWARAN HARGA"}
            </Text>
            <Text style={s.nomor}>{data.nomor}</Text>
          </View>
        </View>

        <View style={s.pihak}>
          <View style={{ flex: 1, paddingRight: 24 }}>
            <Text style={s.labelKecil}>
              {adalahInvoice ? "DITAGIHKAN KEPADA" : "KEPADA"}
            </Text>
            <Text style={{ fontFamily: "Helvetica-Bold", lineHeight: 1.25, marginBottom: 3 }}>
              {data.pelanggan.nama}
            </Text>
            {data.pelanggan.narahubung && (
              <Text style={s.barisKontak}>{data.pelanggan.narahubung}</Text>
            )}
            {data.pelanggan.alamat && (
              <Text style={s.barisKontak}>{data.pelanggan.alamat}</Text>
            )}
            {data.pelanggan.npwp && (
              <Text style={s.barisKontak}>NPWP {data.pelanggan.npwp}</Text>
            )}
          </View>

          <View style={{ width: 200, textAlign: "right" }}>
            {/* Satu Text dengan baris \n: spasi antar baris rapat & konsisten.
                Detail proyek hanya di penawaran, bukan invoice. */}
            <Text style={s.redup}>
              {[
                `Tanggal: ${formatTanggal(data.tanggal)}`,
                `${data.tanggalKeduaLabel}: ${formatTanggal(data.tanggalKedua)}`,
                ...(!adalahInvoice && data.proyek ? [`Proyek: ${data.proyek}`] : []),
                ...(!adalahInvoice && data.jadwal ? [`Pelaksanaan: ${data.jadwal}`] : []),
                ...(!adalahInvoice && data.lokasi ? [`Lokasi: ${data.lokasi}`] : []),
              ].join("\n")}
            </Text>
          </View>
        </View>

        <View style={s.thead}>
          <Text style={[s.th, s.cDeskripsi]}>DESKRIPSI</Text>
          <Text style={[s.th, s.cQty]}>QTY</Text>
          <Text style={[s.th, s.cSatuan]}>SATUAN</Text>
          <Text style={[s.th, s.cHarga]}>HARGA</Text>
          <Text style={[s.th, s.cSubtotal]}>SUBTOTAL</Text>
        </View>

        {data.items.map((it, i) => (
          <View key={i} style={s.tr} wrap={false}>
            <Text style={s.cDeskripsi}>{it.deskripsi}</Text>
            <Text style={s.cQty}>{Number(it.kuantitas)}</Text>
            <Text style={s.cSatuan}>{it.satuan ?? "—"}</Text>
            <Text style={s.cHarga}>{formatIDR(it.harga_satuan)}</Text>
            <Text style={s.cSubtotal}>{formatIDR(it.subtotal)}</Text>
          </View>
        ))}

        <View style={s.barisPenutupTabel}>
          {/* Terbilang mengacu pada nilai total dokumen, bukan sisa tagihan —
              itu yang lazim dijadikan rujukan pada dokumen resmi.
              Ditempatkan di sebelah kiri ringkasan agar mengisi ruang yang
              selama ini kosong, bukan menambah tinggi halaman. */}
          <View style={s.terbilang} wrap={false}>
            <Text style={s.labelKecil}>TERBILANG</Text>
            <Text style={s.terbilangIsi}>{terbilangRupiah(data.total)}</Text>
          </View>

          <View style={s.ringkas}>
          <View style={s.barisRingkas}>
            <Text style={s.redup}>Subtotal</Text>
            <Text>{formatIDR(data.subtotal)}</Text>
          </View>

          {data.diskon_persen > 0 && (
            <View style={s.barisRingkas}>
              <Text style={s.redup}>Diskon {data.diskon_persen}%</Text>
              <Text style={{ color: warna.merah }}>-{formatIDR(potongan)}</Text>
            </View>
          )}

          {data.pajak_persen > 0 && (
            <View style={s.barisRingkas}>
              <Text style={s.redup}>{labelPPN(data.pajak_persen)}</Text>
              <Text>{formatIDR(ppn)}</Text>
            </View>
          )}

          <View style={s.barisTotal}>
            <Text>Total</Text>
            <Text>{formatIDR(data.total)}</Text>
          </View>

          {/* "Sudah dibayar" & "Sisa tagihan" sengaja TIDAK dicetak di invoice —
              itu catatan administrasi internal, bukan bagian tagihan ke pelanggan.
              Riwayat pembayaran tetap ada di halaman detail invoice & kuitansi. */}
          </View>
        </View>

        {adalahInvoice && (data.pembayaran?.length ?? 0) > 0 && (
          <View style={s.bagian}>
            <Text style={s.judulBagian}>Riwayat Pembayaran</Text>
            {data.pembayaran!.map((p, i) => (
              <View key={i} style={s.tr} wrap={false}>
                <Text style={{ flex: 2 }}>Termin {p.termin_ke ?? "—"}</Text>
                <Text style={{ flex: 3, color: warna.redup }}>{formatTanggal(p.tanggal)}</Text>
                <Text style={{ flex: 2, color: warna.redup }}>{p.metode}</Text>
                <Text style={{ flex: 3, textAlign: "right", color: warna.hijau }}>
                  {formatIDR(p.jumlah)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Pembayaran di kiri, tanda tangan di kanan — keduanya dalam satu
            baris agar teks rekening tidak melebar sampai tepi kanan. */}
        <View style={s.barisPenutup} wrap={false}>
          <View style={s.kolomBayar}>
            {data.catatan && (
              <View style={s.kotakCatatan}>
                <Text style={s.labelKecil}>CATATAN</Text>
                <Text>{data.catatan}</Text>
              </View>
            )}

            {/* Instruksi transfer hanya relevan pada invoice.
                Penawaran belum menagih apa pun. */}
            {adalahInvoice && data.perusahaan.bank_nama && (
              <>
                <Text style={[s.judulBagian, { marginTop: data.catatan ? 10 : 0 }]}>
                  Pembayaran
                </Text>
                <Text style={s.barisBank}>{data.perusahaan.bank_nama}</Text>
                {data.perusahaan.bank_rekening && (
                  <Text style={s.barisBank}>
                    Nomor Rekening {data.perusahaan.bank_rekening}
                  </Text>
                )}
                {data.perusahaan.bank_atas_nama && (
                  <Text style={s.barisBank}>
                    atas nama {data.perusahaan.bank_atas_nama}
                  </Text>
                )}
              </>
            )}

          </View>

          {data.penandaTangan?.nama && (
            <View style={s.kolomTtd}>
              <Text style={s.ttdSalam}>Hormat kami,</Text>
              <Text style={s.ttdNama}>{data.penandaTangan.nama}</Text>
              {data.penandaTangan.jabatan && (
                <Text style={s.ttdJabatan}>{data.penandaTangan.jabatan}</Text>
              )}
            </View>
          )}
        </View>

        <View style={s.kaki} fixed>
          <Text>
            {data.perusahaan.nama} · {data.nomor}
          </Text>
          <Text
            render={({ pageNumber, totalPages }) => `Halaman ${pageNumber} dari ${totalPages}`}
          />
        </View>
      </Page>
  );
}

export function DokumenPDF({ data }: { data: DataDokumenPDF }) {
  const adalahInvoice = data.jenis === "invoice";
  return (
    <Document
      title={`${adalahInvoice ? "Invoice" : "Penawaran"} ${data.nomor}`}
      author={data.perusahaan.nama}
    >
      <HalamanDokumen data={data} />
    </Document>
  );
}
