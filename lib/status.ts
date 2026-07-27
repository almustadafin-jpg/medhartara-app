import type { ProjectStatus, QuotationStatus, InvoiceStatus, TxnMethod, BoqStatus, PengajuanStatus } from "@/types";

type Warna = "abu" | "hijau" | "merah" | "kuning" | "biru" | "ungu";

export const STATUS_PROYEK: Record<ProjectStatus, { label: string; warna: Warna }> = {
  prospek:  { label: "Prospek",  warna: "abu" },
  berjalan: { label: "Berjalan", warna: "biru" },
  selesai:  { label: "Selesai",  warna: "hijau" },
  batal:    { label: "Batal",    warna: "merah" },
};

export const STATUS_PENAWARAN: Record<QuotationStatus, { label: string; warna: Warna }> = {
  draft:      { label: "Draft",      warna: "abu" },
  terkirim:   { label: "Terkirim",   warna: "biru" },
  disetujui:  { label: "Disetujui",  warna: "hijau" },
  ditolak:    { label: "Ditolak",    warna: "merah" },
  dikonversi: { label: "Dikonversi", warna: "ungu" },
  arsip:      { label: "Arsip",      warna: "abu" },
};

export const STATUS_INVOICE: Record<InvoiceStatus, { label: string; warna: Warna }> = {
  draft:            { label: "Draft",            warna: "abu" },
  terkirim:         { label: "Terkirim",         warna: "biru" },
  sebagian_dibayar: { label: "Sebagian Dibayar", warna: "kuning" },
  lunas:            { label: "Lunas",            warna: "hijau" },
  jatuh_tempo:      { label: "Jatuh Tempo",      warna: "merah" },
  batal:            { label: "Batal",            warna: "abu" },
};

/** Transisi yang diizinkan — cerminan trigger `jaga_transisi_quotation` di DB. */
export const TRANSISI_PENAWARAN: Record<QuotationStatus, QuotationStatus[]> = {
  draft:      ["terkirim", "arsip"],
  terkirim:   ["disetujui", "ditolak", "draft"],
  disetujui:  ["dikonversi", "arsip"],
  ditolak:    ["arsip", "draft"],
  dikonversi: [],
  arsip:      [],
};

export function bisaTransisi(dari: QuotationStatus, ke: QuotationStatus) {
  return TRANSISI_PENAWARAN[dari].includes(ke);
}

/** Transisi invoice — cerminan trigger `jaga_transisi_invoice` di DB. */
export const TRANSISI_INVOICE: Record<InvoiceStatus, InvoiceStatus[]> = {
  draft:            ["terkirim", "batal"],
  terkirim:         ["sebagian_dibayar", "lunas", "batal"],
  sebagian_dibayar: ["lunas", "terkirim", "batal"],
  jatuh_tempo:      ["sebagian_dibayar", "lunas", "batal"],
  lunas:            [],
  batal:            [],
};

export const STATUS_PENGAJUAN: Record<PengajuanStatus, { label: string; warna: Warna }> = {
  diajukan:  { label: "Diajukan",  warna: "kuning" },
  disetujui: { label: "Disetujui", warna: "hijau" },
  ditolak:   { label: "Ditolak",   warna: "merah" },
};

export const LABEL_METODE: Record<TxnMethod, string> = {
  transfer: "Transfer",
  tunai: "Tunai",
  lainnya: "Lainnya",
};

export const STATUS_BOQ: Record<BoqStatus, { label: string; warna: Warna }> = {
  draft:     { label: "Draft",     warna: "abu" },
  diajukan:  { label: "Diajukan",  warna: "biru" },
  disetujui: { label: "Disetujui", warna: "hijau" },
  ditolak:   { label: "Ditolak",   warna: "merah" },
  arsip:     { label: "Arsip",     warna: "abu" },
};

/** Cerminan trigger `jaga_transisi_boq` di database. */
export const TRANSISI_BOQ: Record<BoqStatus, BoqStatus[]> = {
  draft:     ["diajukan", "arsip"],
  diajukan:  ["disetujui", "ditolak", "draft"],
  disetujui: ["arsip"],
  ditolak:   ["draft", "arsip"],
  arsip:     [],
};
