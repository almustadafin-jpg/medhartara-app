import type { ProjectStatus, QuotationStatus, InvoiceStatus, TxnMethod, TxnType } from "./database";

export * from "./database";
export { LABEL_PERAN } from "@/lib/auth/roles";

export interface Customer {
  id: string;
  company_id: string;
  nama: string;
  narahubung: string | null;
  telepon: string | null;
  email: string | null;
  alamat: string | null;
  npwp: string | null;
  catatan: string | null;
  aktif: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Vendor {
  id: string;
  company_id: string;
  nama: string;
  kategori: string;
  narahubung: string | null;
  telepon: string | null;
  email: string | null;
  alamat: string | null;
  bank_nama: string | null;
  bank_rekening: string | null;
  bank_atas_nama: string | null;
  catatan: string | null;
  aktif: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  company_id: string;
  kode: string | null;
  nama: string;
  customer_id: string;
  pm_id: string | null;
  status: ProjectStatus;
  tanggal_mulai: string | null;
  tanggal_selesai: string | null;
  lokasi: string | null;
  nilai_kontrak: number | null;
  deskripsi: string | null;
  arsip_pada: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuotationItem {
  id: string;
  quotation_id: string;
  deskripsi: string;
  kuantitas: number;
  satuan: string | null;
  harga_satuan: number;
  subtotal: number;
  urutan: number;
}

export interface Quotation {
  id: string;
  company_id: string;
  nomor: string;
  customer_id: string;
  project_id: string | null;
  status: QuotationStatus;
  tanggal: string;
  berlaku_hingga: string | null;
  catatan: string | null;
  diskon_persen: number;
  pajak_persen: number;
  subtotal: number;
  total: number;
  disetujui_oleh: string | null;
  disetujui_pada: string | null;
  final_pada: string | null;
  ttd_nama: string | null;
  ttd_jabatan: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  deskripsi: string;
  kuantitas: number;
  satuan: string | null;
  harga_satuan: number;
  subtotal: number;
  urutan: number;
}

export interface Invoice {
  id: string;
  company_id: string;
  nomor: string;
  quotation_id: string | null;
  customer_id: string;
  project_id: string | null;
  status: InvoiceStatus;
  tanggal: string;
  jatuh_tempo: string;
  diskon_persen: number;
  pajak_persen: number;
  subtotal: number;
  total: number;
  catatan: string | null;
  ttd_nama: string | null;
  ttd_jabatan: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/** Baris view `invoice_ringkas` — invoice + kolom turunan. */
export interface InvoiceRingkas extends Invoice {
  total_dibayar: number;
  sisa_tagihan: number;
  status_efektif: InvoiceStatus;
}

export interface Payment {
  id: string;
  company_id: string;
  invoice_id: string;
  jumlah: number;
  tanggal: string;
  metode: TxnMethod;
  termin_ke: number | null;
  catatan: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Transaction {
  id: string;
  company_id: string;
  tipe: TxnType;
  jumlah: number;
  tanggal: string;
  kategori: string | null;
  metode: TxnMethod;
  project_id: string | null;
  vendor_id: string | null;
  invoice_id: string | null;
  payment_id: string | null;
  deskripsi: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Attachment {
  id: string;
  company_id: string;
  entity_type: string;
  entity_id: string;
  file_url: string;
  file_nama: string | null;
  file_tipe: string | null;
  file_ukuran: number | null;
  uploaded_by: string | null;
  created_at: string;
}

export interface ProfitProyek {
  project_id: string;
  company_id: string;
  nama: string;
  total_pemasukan: number;
  total_pengeluaran: number;
  profit: number;
}

export type BoqStatus = "draft" | "diajukan" | "disetujui" | "ditolak" | "arsip";

export interface Boq {
  id: string;
  company_id: string;
  nomor: string;
  judul: string;
  project_id: string | null;
  customer_id: string | null;
  quotation_id: string | null;
  invoice_id: string | null;
  status: BoqStatus;
  tanggal: string;
  catatan: string | null;
  total_modal: number;
  total_jual: number;
  disetujui_oleh: string | null;
  disetujui_pada: string | null;
  final_pada: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface BoqItem {
  id: string;
  boq_id: string;
  kategori: string | null;
  nama: string;
  deskripsi: string | null;
  kuantitas: number;
  satuan: string | null;
  hari: number;
  waktu: number;
  harga_modal: number;
  harga_jual: number;
  keterangan: string | null;
  subtotal_modal: number;
  subtotal_jual: number;
  urutan: number;
}

export interface Kuitansi {
  id: string;
  company_id: string;
  nomor: string;
  payment_id: string;
  tanggal: string;
  untuk_pembayaran: string | null;
  ttd_nama: string | null;
  ttd_jabatan: string | null;
  created_at: string;
}

export type PengajuanStatus = "diajukan" | "disetujui" | "ditolak";

export interface PaymentRequest {
  id: string;
  company_id: string;
  nomor: string;
  project_id: string;
  vendor_id: string | null;
  kategori: string;
  jumlah: number;
  tanggal: string;
  metode: TxnMethod;
  deskripsi: string | null;
  rekening_tujuan: string | null;
  status: PengajuanStatus;
  diajukan_oleh: string | null;
  ditinjau_oleh: string | null;
  ditinjau_pada: string | null;
  catatan_tinjauan: string | null;
  transaction_id: string | null;
  created_at: string;
  updated_at: string;
}
