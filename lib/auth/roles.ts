import type { UserRole } from "@/types/database";

export const LABEL_PERAN: Record<UserRole, string> = {
  direktur: "Direktur",
  admin_finance: "Admin/Finance",
  pm: "Project Manager",
};

export interface ItemMenu {
  href: string;
  label: string;
  ikon: string;
  peran: UserRole[];
}

/** Sumber tunggal struktur menu (§6 dokumen perencanaan). */
export const MENU: ItemMenu[] = [
  { href: "/dashboard",              label: "Dashboard",  ikon: "📊", peran: ["direktur", "admin_finance", "pm"] },
  { href: "/pelanggan",              label: "Pelanggan",  ikon: "👥", peran: ["direktur", "admin_finance", "pm"] },
  { href: "/vendor",                 label: "Vendor",     ikon: "🏢", peran: ["direktur", "admin_finance", "pm"] },
  { href: "/proyek",                 label: "Proyek",     ikon: "📁", peran: ["direktur", "admin_finance", "pm"] },
  { href: "/boq",                    label: "BOQ / RAB",  ikon: "📐", peran: ["direktur", "admin_finance", "pm"] },
  { href: "/penawaran",              label: "Penawaran",  ikon: "📄", peran: ["direktur", "admin_finance", "pm"] },
  { href: "/invoice",                label: "Invoice",    ikon: "🧾", peran: ["direktur", "admin_finance"] },
  { href: "/kuitansi",               label: "Kuitansi",   ikon: "🧿", peran: ["direktur", "admin_finance"] },
  { href: "/keuangan/pemasukan",     label: "Pemasukan",  ikon: "📥", peran: ["direktur", "admin_finance"] },
  { href: "/keuangan/pengeluaran",   label: "Pengeluaran",ikon: "📤", peran: ["direktur", "admin_finance", "pm"] },
  { href: "/keuangan/pengajuan",     label: "Pengajuan Bayar", ikon: "🧾", peran: ["direktur", "admin_finance", "pm"] },
  { href: "/laporan",                label: "Laporan",    ikon: "📈", peran: ["direktur", "admin_finance", "pm"] },
  { href: "/pengaturan/perusahaan",  label: "Perusahaan", ikon: "⚙️", peran: ["direktur", "admin_finance"] },
  { href: "/pengaturan/pengguna",    label: "Pengguna",   ikon: "🔑", peran: ["admin_finance"] },
  { href: "/audit",                  label: "Audit Log",  ikon: "🔍", peran: ["direktur", "admin_finance"] },
];

export function menuUntuk(peran: UserRole): ItemMenu[] {
  return MENU.filter((m) => m.peran.includes(peran));
}

/**
 * Guard lapis-UI. Penegak sesungguhnya tetap RLS di PostgreSQL —
 * fungsi ini hanya mencegah pengguna melihat rute yang tidak relevan.
 */
export function bolehAksesRute(peran: UserRole, pathname: string): boolean {
  const cocok = MENU.filter((m) => pathname === m.href || pathname.startsWith(`${m.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];
  if (!cocok) return true; // rute di luar menu (mis. /profil) — biarkan halaman yang menentukan
  return cocok.peran.includes(peran);
}
