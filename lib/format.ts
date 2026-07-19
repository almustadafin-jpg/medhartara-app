const NF_IDR = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** 1000000 -> "Rp 1.000.000" */
export function formatIDR(nilai: number | string | null | undefined): string {
  const n = typeof nilai === "string" ? Number(nilai) : nilai;
  if (n === null || n === undefined || Number.isNaN(n)) return "Rp 0";
  return NF_IDR.format(n).replace(/ /g, " ");
}

/** 1500000 -> "1,5 jt" — untuk kartu ringkas & grafik */
export function formatIDRSingkat(nilai: number): string {
  const abs = Math.abs(nilai);
  if (abs >= 1_000_000_000) return `${(nilai / 1_000_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} M`;
  if (abs >= 1_000_000) return `${(nilai / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt`;
  return nilai.toLocaleString("id-ID");
}

/** "2026-07-18" -> "18 Juli 2026" */
export function formatTanggal(tanggal: string | Date | null | undefined): string {
  if (!tanggal) return "—";
  const d = typeof tanggal === "string" ? new Date(`${tanggal.slice(0, 10)}T00:00:00`) : tanggal;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
}

/** "2026-07-18" -> "18 Jul 2026" */
export function formatTanggalPendek(tanggal: string | Date | null | undefined): string {
  if (!tanggal) return "—";
  const d = typeof tanggal === "string" ? new Date(`${tanggal.slice(0, 10)}T00:00:00`) : tanggal;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatWaktu(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleString("id-ID", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}
