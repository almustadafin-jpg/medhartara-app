import { logout } from "@/app/(auth)/login/actions";
import { LABEL_PERAN } from "@/lib/auth/roles";
import type { UsersProfile } from "@/types";

function inisial(nama: string) {
  return nama.split(" ").filter(Boolean).slice(0, 2).map((k) => k[0]).join("").toUpperCase();
}

export function Header({ profil }: { profil: UsersProfile }) {
  const hariIni = new Date().toLocaleDateString("id-ID", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
  });

  return (
    <header className="sticky top-0 z-30 flex items-center gap-4 border-b border-slate-200 bg-white/90 px-6 py-3 backdrop-blur">
      <p className="text-xs text-slate-400">{hariIni}</p>

      <div className="ml-auto flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-full bg-slate-900 text-xs font-semibold text-white">
            {inisial(profil.nama_lengkap)}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium leading-tight">{profil.nama_lengkap}</p>
            <p className="text-xs text-slate-400">{LABEL_PERAN[profil.role]}</p>
          </div>
        </div>

        <form action={logout}>
          <button
            type="submit"
            className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
          >
            Keluar
          </button>
        </form>
      </div>
    </header>
  );
}
