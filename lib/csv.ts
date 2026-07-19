/**
 * Membentuk CSV yang aman dibuka di Excel Indonesia.
 *
 * Dua hal yang mudah salah:
 * 1. Pemisah — Excel dengan locale id-ID mengharapkan titik koma, bukan koma.
 *    Baris `sep=;` di awal berkas memberi tahu Excel secara eksplisit.
 * 2. Formula injection — sel yang diawali = + - @ dapat dieksekusi Excel.
 *    Sel seperti itu diberi awalan tanda kutip tunggal.
 */
const BERBAHAYA = /^[=+\-@\t\r]/;

function sel(nilai: unknown): string {
  if (nilai === null || nilai === undefined) return "";

  let teks = String(nilai);
  if (BERBAHAYA.test(teks)) teks = `'${teks}`;

  if (/[";\n\r]/.test(teks)) {
    teks = `"${teks.replace(/"/g, '""')}"`;
  }
  return teks;
}

export function buatCSV(judul: string[], baris: unknown[][]): string {
  const isi = [judul, ...baris].map((b) => b.map(sel).join(";")).join("\r\n");
  // BOM agar Excel mengenali UTF-8 (huruf beraksen & Rp tidak rusak).
  return `﻿sep=;\r\n${isi}\r\n`;
}

export function namaBerkasLaporan(dari: string, sampai: string) {
  return `laporan-medhartara-${dari}-sd-${sampai}.csv`;
}
