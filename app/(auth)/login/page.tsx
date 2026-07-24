"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { login, type StatusLogin } from "./actions";
import { Logo } from "@/components/layout/logo";

function FormLogin() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/dashboard";
  const [status, aksi, pending] = useActionState<StatusLogin, FormData>(login, {});

  return (
    <form action={aksi} className="space-y-4">
      <input type="hidden" name="next" value={next} />

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
          placeholder="nama@medhartara.id"
          className="mt-1 w-full rounded-lg px-3 py-2 text-sm ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-slate-900"
        />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label htmlFor="password" className="text-xs font-medium text-slate-600">
            Kata Sandi
          </label>
          <Link href="/lupa-sandi" className="text-xs text-slate-500 hover:text-slate-800">
            Lupa kata sandi?
          </Link>
        </div>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="mt-1 w-full rounded-lg px-3 py-2 text-sm ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-slate-900"
        />
      </div>

      {status.error && (
        <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">
          {status.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
      >
        {pending ? "Memproses…" : "Masuk"}
      </button>
    </form>
  );
}

export default function HalamanLogin() {
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 ring-1 ring-slate-200">
        <div className="mb-6">
          <Logo nama="Medhartara Production" tinggi={72} />
          <p className="mt-3 text-sm text-slate-500">Masuk untuk melanjutkan.</p>
        </div>
        <Suspense fallback={null}>
          <FormLogin />
        </Suspense>
        <p className="mt-6 text-xs text-slate-400">
          Akun dibuat oleh Admin/Finance. Hubungi admin bila belum memiliki akses.
        </p>
      </div>
    </main>
  );
}
