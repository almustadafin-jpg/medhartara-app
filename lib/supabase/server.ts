import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { UsersProfile } from "@/types/database";

/** Client sisi server (Server Component / Route Handler / Server Action). */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Dipanggil dari Server Component — diabaikan, sesi disegarkan middleware.
          }
        },
      },
    },
  );
}

/** Ambil profil pengguna yang sedang login. null bila belum login. */
export async function getProfil(): Promise<UsersProfile | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("users_profile")
    .select("id, company_id, nama_lengkap, role, aktif, created_at")
    .eq("id", user.id)
    .single();

  return (data as UsersProfile) ?? null;
}
