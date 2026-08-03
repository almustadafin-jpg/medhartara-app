/**
 * PPN atas DPP Nilai Lain (mekanisme 2025).
 *
 * DPP Nilai Lain = 11/12 × Dasar Pengenaan Pajak.
 * PPN            = tarif% × DPP Nilai Lain = tarif% × (11/12) × dasar.
 *
 * Dengan tarif 12%, PPN efektif = 12% × 11/12 = 11% dari dasar — jadi
 * total tagihan sama seperti PPN 11% biasa, hanya penyajiannya mengikuti
 * faktur DPP Nilai Lain.
 *
 * Rumus yang sama dipakai di database (trigger total), form, halaman
 * detail, dan PDF supaya angkanya selalu cocok.
 */
export const FAKTOR_DPP = 11 / 12;

/** Nilai PPN dari dasar pengenaan pajak (setelah diskon). */
export function hitungPPN(dasar: number, pajakPersen: number): number {
  return dasar * (pajakPersen / 100) * FAKTOR_DPP;
}

/** DPP Nilai Lain (basis pajak) dari dasar pengenaan pajak. */
export function dppNilaiLain(dasar: number): number {
  return dasar * FAKTOR_DPP;
}

/** Label baris PPN untuk dokumen. */
export function labelPPN(pajakPersen: number | string): string {
  return `PPN ${pajakPersen}% (DPP Nilai Lain)`;
}
