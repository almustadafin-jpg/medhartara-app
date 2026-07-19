import { redirect } from "next/navigation";
import { getProfil } from "@/lib/supabase/server";
import { boleh, type Izin } from "@/lib/auth/permissions";
import type { UsersProfile } from "@/types";

/** Pastikan ada sesi aktif. Melempar ke /login bila tidak. */
export async function wajibLogin(): Promise<UsersProfile> {
  const profil = await getProfil();
  if (!profil) redirect("/login");
  if (!profil.aktif) redirect("/login?error=nonaktif");
  return profil;
}

/** Pastikan sesi aktif DAN punya izin tertentu. */
export async function wajibIzin(izin: Izin): Promise<UsersProfile> {
  const profil = await wajibLogin();
  if (!boleh(profil.role, izin)) redirect("/dashboard?error=tanpa-izin");
  return profil;
}
