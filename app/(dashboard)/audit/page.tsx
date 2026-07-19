import { createClient } from "@/lib/supabase/server";
import { wajibIzin } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/page-header";
import AuditClient, { type BarisAudit } from "./audit-client";
import type { UsersProfile } from "@/types";

export const metadata = { title: "Audit Log — Medhartara Production" };

const BATAS = 300;

export default async function AuditPage() {
  await wajibIzin("lihatAudit");
  const supabase = await createClient();

  const [{ data: audit }, { data: pengguna }] = await Promise.all([
    supabase
      .from("audit_logs")
      .select("id, aksi, entity_type, entity_id, data_lama, data_baru, created_at, actor_id")
      .order("created_at", { ascending: false })
      .limit(BATAS),
    supabase.from("users_profile").select("id, nama_lengkap"),
  ]);

  const namaAktor = Object.fromEntries(
    ((pengguna as Pick<UsersProfile, "id" | "nama_lengkap">[]) ?? []).map((u) => [
      u.id,
      u.nama_lengkap,
    ]),
  );

  return (
    <div>
      <PageHeader
        judul="Audit Log"
        deskripsi={`${BATAS} catatan terakhir · ditulis oleh trigger database, tidak dapat diubah pengguna`}
      />
      <AuditClient data={(audit as BarisAudit[]) ?? []} namaAktor={namaAktor} />
      <p className="mt-4 text-xs text-slate-400">
        Catatan dibuat otomatis saat penawaran, invoice, pembayaran, dan transaksi
        berubah. Tidak ada policy INSERT/UPDATE/DELETE pada tabel ini untuk pengguna —
        hanya trigger yang boleh menulis.
      </p>
    </div>
  );
}
