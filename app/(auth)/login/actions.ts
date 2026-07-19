"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const SkemaLogin = z.object({
  email: z.string().email("Format email tidak valid."),
  password: z.string().min(6, "Kata sandi minimal 6 karakter."),
});

export interface StatusLogin {
  error?: string;
}

export async function login(_prev: StatusLogin, formData: FormData): Promise<StatusLogin> {
  const parsed = SkemaLogin.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    // Bedakan masalah konfigurasi dari kredensial yang salah.
    // Menyamakan keduanya membuat salah setel .env.local tampak
    // seperti "kata sandi salah" — dan itu menyesatkan.
    const kunci = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

    if (!kunci || !url || kunci.startsWith("TEMPEL") || kunci.length < 40) {
      return {
        error:
          "Konfigurasi Supabase belum lengkap. Isi NEXT_PUBLIC_SUPABASE_ANON_KEY di .env.local, lalu jalankan ulang npm run dev.",
      };
    }

    const pesan = error.message.toLowerCase();

    if (pesan.includes("email not confirmed")) {
      return { error: "Email belum dikonfirmasi. Minta admin mengaktifkan akun Anda." };
    }
    if (pesan.includes("invalid api key") || pesan.includes("fetch")) {
      return { error: "Gagal menghubungi server. Periksa URL dan anon key di .env.local." };
    }

    return { error: "Email atau kata sandi salah." };
  }

  const next = String(formData.get("next") || "/dashboard");
  revalidatePath("/", "layout");
  redirect(next.startsWith("/") ? next : "/dashboard");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
