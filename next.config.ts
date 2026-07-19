import type { NextConfig } from "next";

/**
 * outputFileTracingIncludes
 * -------------------------
 * Route handler PDF membaca `public/logo.png` langsung dari disk
 * (lihat lib/logo-pdf.ts). Di Vercel, isi folder `public/` dilayani
 * lewat CDN dan TIDAK ikut masuk ke bundel fungsi serverless —
 * akibatnya `existsSync` mengembalikan false dan logo hilang dari
 * seluruh PDF, tanpa error apa pun.
 *
 * Baris di bawah memaksa berkas logo ikut dikemas ke fungsi API.
 *
 * distDir
 * -------
 * Saat `npm run verify`, hasil build diarahkan ke `.next-verify`
 * agar tidak menimpa `.next` milik `npm run dev` yang sedang jalan.
 */
const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/**": ["./public/logo.png", "./public/logo-putih.png"],
  },
  ...(process.env.VERIFY_BUILD ? { distDir: ".next-verify" } : {}),
};

export default nextConfig;
