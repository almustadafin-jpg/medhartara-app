import { cn } from "@/lib/utils";

export function KartuMetrik({
  judul,
  nilai,
  sub,
  nada = "netral",
}: {
  judul: string;
  nilai: string;
  sub?: string;
  nada?: "netral" | "positif" | "negatif" | "peringatan";
}) {
  const warna = {
    netral: "text-slate-900",
    positif: "text-emerald-700",
    negatif: "text-red-600",
    peringatan: "text-amber-700",
  }[nada];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-500">{judul}</p>
      <p className={cn("mt-2 text-2xl font-semibold tracking-tight", warna)}>{nilai}</p>
      {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}
