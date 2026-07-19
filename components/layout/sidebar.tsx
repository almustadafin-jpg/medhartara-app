"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { menuUntuk } from "@/lib/auth/roles";
import { Logo } from "@/components/layout/logo";
import type { UserRole } from "@/types/database";

export function Sidebar({ peran, namaPerusahaan }: { peran: UserRole; namaPerusahaan: string }) {
  const pathname = usePathname();
  const menu = menuUntuk(peran);

  return (
    <aside className="hidden w-60 shrink-0 flex-col bg-slate-900 text-slate-300 md:flex">
      <div className="px-5 pb-4 pt-6">
        <Logo nama={namaPerusahaan} varian="gelap" tinggi={76} />
        <p className="mt-2 text-xs text-slate-400">Sistem Finansial &amp; Proyek</p>
      </div>

      <nav className="flex-1 space-y-0.5 px-3">
        {menu.map((m) => {
          const aktif = pathname === m.href || pathname.startsWith(`${m.href}/`);
          return (
            <Link
              key={m.href}
              href={m.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${
                aktif ? "bg-slate-800 text-white" : "hover:bg-slate-800/60"
              }`}
            >
              <span aria-hidden>{m.ikon}</span>
              {m.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-800 px-5 py-4 text-xs text-slate-500">
        Fase 1 · Auth &amp; RBAC
      </div>
    </aside>
  );
}
