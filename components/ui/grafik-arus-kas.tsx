import { formatIDR, formatIDRSingkat } from "@/lib/format";

export interface BarisArusKas {
  bulan: string;
  pemasukan: number;
  pengeluaran: number;
}

const NAMA_BULAN = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];

/**
 * Grafik batang sederhana tanpa pustaka eksternal.
 * Dirender di server — tidak menambah JavaScript ke klien.
 */
export function GrafikArusKas({ data }: { data: BarisArusKas[] }) {
  const maks = Math.max(...data.flatMap((d) => [Number(d.pemasukan), Number(d.pengeluaran)]), 1);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="text-sm font-semibold text-slate-700">Arus Kas 6 Bulan Terakhir</h3>

      <div className="mt-4 flex items-end justify-between gap-3" style={{ height: 160 }}>
        {data.map((d) => {
          const masuk = Number(d.pemasukan);
          const keluar = Number(d.pengeluaran);
          const bulan = new Date(`${d.bulan.slice(0, 10)}T00:00:00`);

          return (
            <div key={d.bulan} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex h-32 w-full items-end justify-center gap-1">
                <div
                  className="w-1/3 rounded-t bg-emerald-400"
                  style={{ height: `${(masuk / maks) * 100}%` }}
                  title={`Pemasukan ${formatIDR(masuk)}`}
                />
                <div
                  className="w-1/3 rounded-t bg-red-300"
                  style={{ height: `${(keluar / maks) * 100}%` }}
                  title={`Pengeluaran ${formatIDR(keluar)}`}
                />
              </div>
              <span className="text-xs text-slate-400">
                {NAMA_BULAN[bulan.getMonth()]}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
        <div className="flex gap-4">
          <span className="flex items-center gap-1">
            <i className="inline-block h-2 w-2 rounded-sm bg-emerald-400" />
            Pemasukan
          </span>
          <span className="flex items-center gap-1">
            <i className="inline-block h-2 w-2 rounded-sm bg-red-300" />
            Pengeluaran
          </span>
        </div>
        <span className="text-slate-400">skala maks {formatIDRSingkat(maks)}</span>
      </div>
    </div>
  );
}
