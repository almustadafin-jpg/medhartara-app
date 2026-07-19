import { z } from "zod";

const opsionalUuid = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === "" ? undefined : v))
  .pipe(z.string().uuid("Referensi tidak valid").optional());

export const skemaTransaksi = z
  .object({
    tipe: z.enum(["pemasukan", "pengeluaran"]),
    jumlah: z.number().positive("Jumlah harus lebih dari 0"),
    tanggal: z.string().min(1, "Tanggal wajib diisi"),
    kategori: z.string().trim().max(60).optional(),
    metode: z.enum(["transfer", "tunai", "lainnya"]),
    project_id: opsionalUuid,
    vendor_id: opsionalUuid,
    deskripsi: z
      .string()
      .trim()
      .max(300)
      .optional()
      .transform((v) => (v === "" ? undefined : v)),
  })
  .refine((d) => d.tipe !== "pengeluaran" || (d.kategori && d.kategori.length > 0), {
    message: "Pengeluaran wajib memiliki kategori",
    path: ["kategori"],
  });

export const skemaBukti = z.object({
  entity_type: z.enum(["transaction", "invoice", "payment", "quotation", "vendor"]),
  entity_id: z.string().uuid(),
  file_url: z.string().min(1),
  file_nama: z.string().min(1),
  file_tipe: z.string().optional(),
  file_ukuran: z.number().int().nonnegative().optional(),
});

export type InputTransaksi = z.infer<typeof skemaTransaksi>;
