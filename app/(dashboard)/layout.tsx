import { createClient } from "@/lib/supabase/server";
import { wajibLogin } from "@/lib/auth/session";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default async function LayoutDashboard({ children }: { children: React.ReactNode }) {
  const profil = await wajibLogin();

  const supabase = await createClient();
  const { data: perusahaan } = await supabase
    .from("companies")
    .select("nama")
    .eq("id", profil.company_id ?? "")
    .maybeSingle();

  return (
    <div className="flex min-h-screen">
      <Sidebar peran={profil.role} namaPerusahaan={perusahaan?.nama ?? "Medhartara"} />
      <main className="min-w-0 flex-1">
        <Header profil={profil} />
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
