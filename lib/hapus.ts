import "server-only";

/**
 * Menerjemahkan kegagalan penghapusan menjadi pesan yang bisa dibaca.
 *
 * 23503 = foreign key violation. Ini justru pengaman utama: data yang
 * sudah dipakai dokumen lain menolak dihapus dengan sendirinya di
 * level database, tanpa perlu pengecekan manual yang bisa terlewat.
 */
export function pesanGagalHapus(
  kode: string | undefined,
  pesan: string,
  jenis: string,
): string {
  if (kode === "23503") {
    return `${jenis} ini sudah dipakai pada dokumen lain, jadi tidak dapat dihapus. Nonaktifkan atau arsipkan saja agar riwayatnya tetap utuh.`;
  }
  if (kode === "42501") {
    return `Anda tidak berwenang menghapus ${jenis.toLowerCase()} ini.`;
  }
  return pesan.replace(/^.*?(?:ERROR|error):\s*/, "").trim();
}

/** 0 baris terhapus berarti RLS menolak diam-diam — bukan error, tapi tetap gagal. */
export function pesanTakTerhapus(jenis: string, alasan: string): string {
  return `${jenis} tidak dapat dihapus. ${alasan}`;
}
