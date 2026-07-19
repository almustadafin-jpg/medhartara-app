import { z } from "zod";

export const skemaItem = z.object({
  deskripsi: z.string().trim().min(2, "Deskripsi item wajib diisi").max(300),
  kuantitas: z.number().positive("Kuantitas harus lebih dari 0"),
  satuan: z.string().trim().max(20).optional(),
  harga_satuan: z.number().min(0, "Harga tidak boleh negatif"),
});

export const skemaPenawaran = z
  .object({
    customer_id: z.string().uuid("Pelanggan wajib dipilih"),
    project_id: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v === "" ? undefined : v))
      .pipe(z.string().uuid("Proyek tidak valid").optional()),
    tanggal: z.string().min(1, "Tanggal wajib diisi"),
    berlaku_hingga: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v === "" ? undefined : v)),
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
    items: z.array(skemaItem).min(1, "Penawaran harus memiliki minimal satu item"),
  })
  .refine((d) => !d.berlaku_hingga || d.berlaku_hingga >= d.tanggal, {
    message: "Masa berlaku tidak boleh lebih awal dari tanggal penawaran",
    path: ["berlaku_hingga"],
  });

export type InputPenawaran = z.infer<typeof skemaPenawaran>;
