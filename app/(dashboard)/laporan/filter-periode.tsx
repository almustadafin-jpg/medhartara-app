"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const PINTASAN = [
  { label: "Bulan ini", bulan: 0 },
  { label: "3 bulan", bulan: 3 },
  { label: "6 bulan", bulan: 6 },
  { label: "Tahun ini", bulan: -1 },
];

export default function FilterPeriode({ dari, sampai }: { dari: string; sampai: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [d, setD] = useState(dari);
  const [s, setS] = useState(sampai);

  function terapkan(dariBaru = d, sampaiBaru = s) {
    const q = new URLSearchParams(params.toString());
    q.set("dari", dariBaru);
    q.set("sampai", sampaiBaru);
    router.push(`/laporan?${q.toString()}`);
  }

  function pintasan(bulan: number) {
    const kini = new Date();
    const akhir = kini.toISOString().slice(0, 10);
    let mulai: string;

    if (bulan === -1) {
      mulai = `${kini.getFullYear()}-01-01`;
    } else if (bulan === 0) {
      mulai = new Date(kini.getFullYear(), kini.getMonth(), 1).toISOString().slice(0, 10);
    } else {
      mulai = new Date(kini.getFullYear(), kini.getMonth() - bulan + 1, 1)
        .toISOString()
        .slice(0, 10);
    }

    setD(mulai);
    setS(akhir);
    terapkan(mulai, akhir);
  }

  return (
    <div className="mb-6 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-4">
      <label htmlFor="dari" className="text-sm text-slate-500">
        Periode
      </label>
      <input
        id="dari"
        type="date"
        value={d}
        onChange={(e) => setD(e.target.value)}
        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-slate-900"
      />
      <span className="text-slate-400">–</span>
      <input
        id="sampai"
        type="date"
        value={s}
        onChange={(e) => setS(e.target.value)}
        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-slate-900"
      />
      <Button onClick={() => terapkan()}>Terapkan</Button>

      <div className="ml-2 flex flex-wrap gap-1">
        {PINTASAN.map((p) => (
          <button
            key={p.label}
            onClick={() => pintasan(p.bulan)}
            className="rounded-lg px-2.5 py-1 text-xs text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50"
          >
            {p.label}
          </button>
        ))}
      </div>

      <a
        href={`/api/laporan?dari=${d}&sampai=${s}`}
        className="ml-auto rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
      >
        ⬇ Unduh CSV
      </a>
    </div>
  );
}
