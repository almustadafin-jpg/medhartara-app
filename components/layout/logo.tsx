"use client";

import { useState } from "react";

/**
 * Logo perusahaan.
 *
 * Dua berkas terpisah karena latarnya berbeda:
 *   public/logo.png       — versi warna, dipakai di halaman terang & PDF
 *   public/logo-putih.png — versi putih, dipakai di sidebar gelap
 *
 * Bila versi putih belum ada, komponen turun ke versi warna di atas
 * kotak putih; bila keduanya tidak ada, tampil nama perusahaan sebagai
 * teks. Aplikasi tidak pernah menampilkan ikon gambar rusak.
 */
export function Logo({
  nama,
  varian = "terang",
  tinggi = 40,
}: {
  nama: string;
  varian?: "terang" | "gelap";
  tinggi?: number;
}) {
  const [tahap, setTahap] = useState<"utama" | "cadangan" | "teks">("utama");

  if (tahap === "teks") {
    return (
      <p
        className={
          varian === "gelap"
            ? "text-sm font-semibold text-white"
            : "text-lg font-semibold text-slate-900"
        }
      >
        {nama}
      </p>
    );
  }

  // Di sidebar gelap: coba logo putih dulu, baru logo warna berkotak.
  const pakaiPutih = varian === "gelap" && tahap === "utama";
  const sumber = pakaiPutih ? "/logo-putih.png" : "/logo.png";

  const gambar = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      key={sumber}
      src={sumber}
      alt={nama}
      style={{ height: tinggi }}
      className="w-auto object-contain"
      onError={() => setTahap(pakaiPutih ? "cadangan" : "teks")}
    />
  );

  // Kotak putih hanya diperlukan bila logo warna dipaksa tampil di latar gelap.
  if (varian === "gelap" && !pakaiPutih) {
    return (
      <div className="inline-flex items-center justify-center rounded-lg bg-white px-3 py-2">
        {gambar}
      </div>
    );
  }

  return gambar;
}
