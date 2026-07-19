import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Client service_role — MELEWATI RLS.
 * HANYA untuk operasi tepercaya di server (penomoran dokumen, audit log,
 * konversi penawaran→invoice). Jangan pernah diimpor dari komponen klien.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY belum diset di environment.");

  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
