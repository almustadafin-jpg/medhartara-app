import { z } from "zod";

export const skemaItemBoq = z.object({
  kategori: z
    .string()
    .trim()
    .max(60)
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
  nama: z.string().trim().min(2, "Nama item wajib diisi").max(160),
  deskripsi: z
    .string()
    .trim()
    .max(400)
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
  kuantitas: z.number().positive("Kuantitas harus lebih dari 0"),
  satuan: z.string().trim().max(20).optional(),
  hari: z.number().positive("Hari harus lebih dari 0"),
  harga_modal: z.number().min(0, "Harga modal tidak boleh negatif"),
  harga_jual: z.number().min(0, "Harga jual tidak boleh negatif"),
});

export const skemaBoq = z.object({
  judul: z.string().trim().min(3, "Judul BOQ wajib diisi").max(160),
  customer_id: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === "" ? undefined : v))
    .pipe(z.string().uuid("Pelanggan tidak valid").optional()),
  project_id: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === "" ? undefined : v))
    .pipe(z.string().uuid("Proyek tidak valid").optional()),
  tanggal: z.string().min(1, "Tanggal wajib diisi"),
  catatan: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
  items: z.array(skemaItemBoq).min(1, "BOQ harus memiliki minimal satu item"),
});

export type InputBoq = z.infer<typeof skemaBoq>;
