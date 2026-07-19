export type UserRole = "direktur" | "admin_finance" | "pm";
export type QuotationStatus = "draft" | "terkirim" | "disetujui" | "ditolak" | "dikonversi" | "arsip";
export type InvoiceStatus = "draft" | "terkirim" | "sebagian_dibayar" | "lunas" | "jatuh_tempo" | "batal";
export type ProjectStatus = "prospek" | "berjalan" | "selesai" | "batal";
export type TxnType = "pemasukan" | "pengeluaran";
export type TxnMethod = "transfer" | "tunai" | "lainnya";

export interface Company {
  id: string;
  nama: string;
  npwp: string | null;
  alamat: string | null;
  telepon: string | null;
  email: string | null;
  logo_url: string | null;
  bank_nama: string | null;
  bank_rekening: string | null;
  bank_atas_nama: string | null;
}

export interface UsersProfile {
  id: string;
  company_id: string | null;
  nama_lengkap: string;
  telepon: string | null;
  role: UserRole;
  aktif: boolean;
  created_at: string;
}
