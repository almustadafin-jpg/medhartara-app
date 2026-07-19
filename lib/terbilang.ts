const SATUAN = [
  "", "satu", "dua", "tiga", "empat", "lima",
  "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas",
];

const SKALA = ["", "ribu", "juta", "miliar", "triliun", "kuadriliun"];

/**
 * Mengubah bilangan bulat menjadi kata bahasa Indonesia.
 *
 * Tiga aturan yang mudah keliru dan sudah ditangani di sini:
 * - 11–19 memakai bentuk "belas": 11 = sebelas, 15 = lima belas
 * - 100–199 memakai "seratus", bukan "satu ratus"
 * - 1000–1999 memakai "seribu", bukan "satu ribu"
 */
function keKata(n: number): string {
  if (n < 12) return SATUAN[n];
  if (n < 20) return `${SATUAN[n - 10]} belas`;

  if (n < 100) {
    const puluh = Math.floor(n / 10);
    const sisa = n % 10;
    return `${SATUAN[puluh]} puluh${sisa ? ` ${SATUAN[sisa]}` : ""}`;
  }

  if (n < 200) {
    const sisa = n - 100;
    return `seratus${sisa ? ` ${keKata(sisa)}` : ""}`;
  }

  if (n < 1000) {
    const ratus = Math.floor(n / 100);
    const sisa = n % 100;
    return `${SATUAN[ratus]} ratus${sisa ? ` ${keKata(sisa)}` : ""}`;
  }

  if (n < 2000) {
    const sisa = n - 1000;
    return `seribu${sisa ? ` ${keKata(sisa)}` : ""}`;
  }

  // Pecah per tiga digit, lalu beri nama skala dari yang terbesar.
  const kelompok: number[] = [];
  let sisa = n;
  while (sisa > 0) {
    kelompok.push(sisa % 1000);
    sisa = Math.floor(sisa / 1000);
  }

  const bagian: string[] = [];
  for (let i = kelompok.length - 1; i >= 0; i--) {
    const nilai = kelompok[i];
    if (nilai === 0) continue;
    bagian.push(`${keKata(nilai)}${SKALA[i] ? ` ${SKALA[i]}` : ""}`);
  }

  return bagian.join(" ");
}

/**
 * "Dua ratus sepuluh juta sembilan ratus ribu rupiah"
 *
 * Nilai dibulatkan ke rupiah terdekat — dokumen resmi Indonesia
 * lazimnya tidak menuliskan sen dalam terbilang.
 */
export function terbilangRupiah(nilai: number | string | null | undefined): string {
  const angka = Math.round(Number(nilai ?? 0));

  if (!Number.isFinite(angka)) return "nol rupiah";
  if (angka === 0) return "Nol rupiah";

  const negatif = angka < 0;
  const kata = `${keKata(Math.abs(angka))} rupiah`;
  const hasil = negatif ? `minus ${kata}` : kata;

  return hasil.charAt(0).toUpperCase() + hasil.slice(1);
}
