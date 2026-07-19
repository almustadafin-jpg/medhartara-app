import { formatTanggal, formatTanggalPendek } from "@/lib/format";

/**
 * Merangkai rentang pelaksanaan proyek menjadi satu baris.
 *
 *   1–3 Agustus 2026    → bila keduanya ada
 *   mulai 1 Agustus 2026 → bila hanya tanggal mulai
 *   null                 → bila keduanya kosong, agar barisnya tidak dicetak
 */
export function rentangJadwal(
  mulai: string | null | undefined,
  selesai: string | null | undefined,
): string | null {
  if (!mulai && !selesai) return null;
  if (mulai && !selesai) return `mulai ${formatTanggal(mulai)}`;
  if (!mulai && selesai) return `hingga ${formatTanggal(selesai)}`;
  if (mulai === selesai) return formatTanggal(mulai);
  return `${formatTanggalPendek(mulai)} – ${formatTanggalPendek(selesai)}`;
}
