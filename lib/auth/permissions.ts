import type { UserRole } from "@/types";

/**
 * Matriks wewenang (§3.1 dokumen perencanaan).
 * Ini guard lapis-UI/aplikasi. Penegak sesungguhnya tetap RLS di PostgreSQL.
 */
export const IZIN = {
  lihatPelanggan:   ["direktur", "admin_finance", "pm"],
  kelolaPelanggan:  ["admin_finance", "pm"],
  lihatVendor:      ["direktur", "admin_finance", "pm"],
  kelolaVendor:     ["admin_finance", "pm"],
  lihatPerusahaan:  ["direktur", "admin_finance"],
  ubahPerusahaan:   ["direktur", "admin_finance"],
  kelolaPengguna:   ["admin_finance"],
  lihatProyek:      ["direktur", "admin_finance", "pm"],
  kelolaProyek:     ["direktur", "admin_finance", "pm"],
  lihatPenawaran:   ["direktur", "admin_finance", "pm"],
  kelolaPenawaran:  ["admin_finance"],
  setujuiPenawaran: ["direktur", "admin_finance"],
  lihatBOQ:         ["direktur", "admin_finance", "pm"],
  kelolaBOQ:        ["direktur", "admin_finance", "pm"],
  setujuiBOQ:       ["direktur", "admin_finance"],
  lihatInvoice:     ["direktur", "admin_finance"],
  kelolaInvoice:    ["admin_finance"],
  catatPembayaran:  ["admin_finance"],
  lihatKuitansi:    ["direktur", "admin_finance"],
  lihatKeuangan:    ["direktur", "admin_finance"],
  kelolaKeuangan:   ["admin_finance"],
  catatPengeluaran: ["admin_finance", "pm"],
  lihatPengajuan:   ["direktur", "admin_finance", "pm"],
  ajukanPembayaran: ["admin_finance", "pm"],
  tinjauPengajuan:  ["admin_finance"],
  lihatLaporan:     ["direktur", "admin_finance", "pm"],
  lihatAudit:       ["direktur", "admin_finance"],
} as const satisfies Record<string, readonly UserRole[]>;

export type Izin = keyof typeof IZIN;

export function boleh(peran: UserRole, izin: Izin): boolean {
  return (IZIN[izin] as readonly UserRole[]).includes(peran);
}
