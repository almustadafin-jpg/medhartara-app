"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/layout/logo";

/**
 * Tujuan tautan reset dari email. Browser client Supabase membaca token
 * pemulihan dari URL sendiri (detectSessionInUrl), lalu memunculkan sesi
 * bertipe PASSWORD_RECOVERY. Halaman ini hanya boleh dipakai untuk
 * mengganti kata sandi selama sesi pemulihan itu berlaku.
 */
export default function HalamanPerbaruiSandi() {
  const router = useRouter();
  const [siap, setSiap] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [sandi, setSandi] = useState("");
  const [ulang, setUlang] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [sukses, setSukses] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setTokenValid(true);
        setSiap(true);
      }
    });

    // Bila event sudah lewat sebelum listener terpasang, periksa sesi.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setTokenValid((v) => (v === null ? true : v));
      setSiap(true);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  async function simpan(ev: React.FormEvent) {
    ev.preventDefault();
    setError(undefined);

    if (sandi.length < 8 || !/[A-Za-z]/.test(sandi) || !/[0-9]/.test(sandi)) {
      setError("Kata sandi minimal 8 karakter dan memuat huruf serta angka.");
      return;
    }
    if (sandi !== ulang) {
      setError("Konfirmasi kata sandi tidak cocok.");
      return;
    }

    setPending(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.updateUser({ password: sandi });
    setPending(false);

    if (err) {
      setError("Gagal menyimpan. Tautan mungkin sudah kedaluwarsa — minta tautan baru.");
      return;
    }
    // Keluar dari sesi pemulihan agar login berikutnya bersih.
    await supabase.auth.signOut();
    setSukses(true);
    setTimeout(() => router.push("/login"), 2500);
  }

  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 ring-1 ring-slate-200">
        <div className="mb-6">
          <Logo nama="Medhartara Production" tinggi={72} />
          <p className="mt-3 text-sm text-slate-500">Kata sandi baru.</p>
        </div>

        {sukses ? (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 ring-1 ring-emerald-200">
            Kata sandi berhasil diganti. Mengarahkan ke halaman masuk…
          </p>
        ) : !siap ? (
          <p className="text-sm text-slate-500">Memeriksa tautan…</p>
        ) : tokenValid === false ? (
          <div className="space-y-4">
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">
              Tautan tidak berlaku atau sudah kedaluwarsa. Silakan minta tautan baru.
            </p>
            <Link
              href="/lupa-sandi"
              className="block text-center text-sm text-slate-500 hover:text-slate-800"
            >
              Minta tautan reset lagi
            </Link>
          </div>
        ) : (
          <form onSubmit={simpan} className="space-y-4">
            <div>
              <label htmlFor="sandi" className="text-xs font-medium text-slate-600">
                Kata Sandi Baru
              </label>
              <input
                id="sandi"
                type="password"
                required
                autoComplete="new-password"
                value={sandi}
                onChange={(e) => setSandi(e.target.value)}
                className="mt-1 w-full rounded-lg px-3 py-2 text-sm ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-slate-900"
              />
              <p className="mt-1 text-xs text-slate-400">
                Minimal 8 karakter, memuat huruf dan angka.
              </p>
            </div>

            <div>
              <label htmlFor="ulang" className="text-xs font-medium text-slate-600">
                Ulangi Kata Sandi
              </label>
              <input
                id="ulang"
                type="password"
                required
                autoComplete="new-password"
                value={ulang}
                onChange={(e) => setUlang(e.target.value)}
                className="mt-1 w-full rounded-lg px-3 py-2 text-sm ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            {error && (
              <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
            >
              {pending ? "Menyimpan…" : "Simpan kata sandi"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
