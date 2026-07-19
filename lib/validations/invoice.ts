import { z } from "zod";

export const skemaItemInvoice = z.object({
  deskripsi: z.string().trim().min(2, "Deskripsi item wajib diisi").max(300),
  kuantitas: z.number().positive("Kuantitas harus lebih dari 0"),
  satuan: z.string().trim().max(20).optional(),
  harga_satuan: z.number().min(0, "Harga tidak boleh negatif"),
});

export const skemaInvoice = z
  .object({
    customer_id: z.string().uuid("Pelanggan wajib dipilih"),
    project_id: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v === "" ? undefined : v))
      .pipe(z.string().uuid("Proyek tidak valid").optional()),
    tanggal: z.string().min(1, "Tanggal wajib diisi"),
    jatuh_tempo: z.string().min(1, "Tanggal jatuh tempo wajib diisi"),
    diskon_persen: z.number().min(0).max(100, "Diskon maksimal 100%"),
    pajak_persen: z.number().min(0).max(100, "Pajak maksimal 100%"),
    catatan: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v === "" ? undefined : v)),
    ttd_nama: z
      .string()
      .trim()
      .max(80)
      .optional()
      .transform((v) => (v === "" ? undefined : v)),
    ttd_jabatan: z
      .string()
      .trim()
      .max(80)
      .optional()
      .transform((v) => (v === "" ? undefined : v)),
    items: z.array(skemaItemInvoice).min(1, "Invoice harus memiliki minimal satu item"),
  })
  .refine((d) => d.jatuh_tempo >= d.tanggal, {
    message: "Jatuh tempo tidak boleh lebih awal dari tanggal invoice",
    path: ["jatuh_tempo"],
  });

export const skemaPembayaran = z.object({
  invoice_id: z.string().uuid(),
  jumlah: z.number().positive("Jumlah pembayaran harus lebih dari 0"),
  tanggal: z.string().min(1, "Tanggal pembayaran wajib diisi"),
  metode: z.enum(["transfer", "tunai", "lainnya"]),
  catatan: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
});

export type InputInvoice = z.infer<typeof skemaInvoice>;
export type InputPembayaran = z.infer<typeof skemaPembayaran>;
