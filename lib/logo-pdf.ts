import "server-only";
import { existsSync } from "node:fs";
import path from "node:path";

/**
 * Menentukan sumber logo untuk dokumen PDF.
 *
 * Urutan prioritas:
 * 1. `companies.logo_url` bila berupa URL http(s) yang dapat diakses server
 * 2. berkas lokal `public/logo.png`
 * 3. null — template PDF akan melewati blok logo
 *
 * Berkas lokal dipakai lebih dulu daripada Storage karena bucket bukti
 * bersifat privat: URL-nya butuh tanda tangan dan kedaluwarsa, sehingga
 * tidak cocok disematkan ke dokumen.
 */
export function logoUntukPDF(logoUrl: string | null | undefined): string | null {
  if (logoUrl && /^https?:\/\//i.test(logoUrl)) return logoUrl;

  const lokal = path.join(process.cwd(), "public", "logo.png");
  return existsSync(lokal) ? lokal : null;
}
