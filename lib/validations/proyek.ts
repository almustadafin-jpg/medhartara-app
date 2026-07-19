import { z } from "zod";

const teksOpsional = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === "" ? undefined : v));

const tanggalOpsional = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === "" ? undefined : v));

export const skemaProyek = z
  .object({
    nama: z.string().trim().min(3, "Nama proyek minimal 3 karakter").max(160),
    customer_id: z.string().uuid("Pelanggan wajib dipilih"),
    pm_id: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v === "" ? undefined : v))
      .pipe(z.string().uuid("PM tidak valid").optional()),
    status: z.enum(["prospek", "berjalan", "selesai", "batal"]),
    tanggal_mulai: tanggalOpsional,
    tanggal_selesai: tanggalOpsional,
    nilai_kontrak: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v === "" || v === undefined ? undefined : Number(v.replace(/[^\d]/g, ""))))
      .pipe(z.number().min(0, "Nilai kontrak tidak boleh negatif").optional()),
    lokasi: teksOpsional,
    deskripsi: teksOpsional,
  })
  .refine(
    (d) => !d.tanggal_mulai || !d.tanggal_selesai || d.tanggal_selesai >= d.tanggal_mulai,
    { message: "Tanggal selesai tidak boleh lebih awal dari tanggal mulai", path: ["tanggal_selesai"] },
  );

export type InputProyek = z.infer<typeof skemaProyek>;
