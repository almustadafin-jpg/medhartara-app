"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/layout/logo";

export default function HalamanLupaSandi() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [terkirim, setTerkirim] = useState(false);
  const [error, setError] = useState<string>();

  async function kirim(ev: React.FormEvent) {
    ev.preventDefault();
    setError(undefined);
    setPending(true);

    const supabase = createClient();
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/perbarui-sandi`,
    });
    setPending(false);

    if (err) {
      setError("Gagal mengirim tautan. Coba lagi beberapa saat.");
      return;
    }
    // Tampilkan pesan sama terlepas email terdaftar atau tidak —
    // supaya tidak membocorkan email mana yang punya akun.
    setTerkirim(true);
  }

  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 ring-1 ring-slate-200">
        <div className="mb-6">
          <Logo nama="Medhartara Production" tinggi={72} />
          <p className="mt-3 text-sm text-slate-500">Atur ulang kata sandi.</p>
        </div>

        {terkirim ? (
          <div className="space-y-4">
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 ring-1 ring-emerald-200">
              Bila email tersebut terdaftar, kami telah mengirim tautan untuk mengatur ulang
              kata sandi. Periksa kotak masuk — dan folder spam bila belum terlihat.
            </p>
            <Link
              href="/login"
              className="block text-center text-sm text-slate-500 hover:text-slate-800"
            >
              ← Kembali ke halaman masuk
            </Link>
          </div>
        ) : (
          <form onSubmit={kirim} className="space-y-4">
            <div>
              <label htmlFor="email" className="text-xs font-medium text-slate-600">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@medhartara.id"
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
              {pending ? "Mengirim…" : "Kirim tautan reset"}
            </button>

            <Link
              href="/login"
              className="block text-center text-sm text-slate-500 hover:text-slate-800"
            >
              ← Kembali ke halaman masuk
            </Link>
          </form>
        )}

        <p className="mt-6 text-xs text-slate-400">
          Tidak menerima email? Hubungi Admin/Finance — akun Anda dapat diatur ulang langsung.
        </p>
      </div>
    </main>
  );
}
