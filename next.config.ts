import type { NextConfig } from "next";

/**
 * Saat `npm run verify`, hasil build diarahkan ke `.next-verify`.
 * Tujuannya agar pemeriksaan build tidak menimpa `.next` milik
 * `npm run dev` yang sedang berjalan — penyebab error
 * "Cannot find module './xxxx.js'" pada dev server.
 */
const nextConfig: NextConfig = {
  ...(process.env.VERIFY_BUILD ? { distDir: ".next-verify" } : {}),
};

export default nextConfig;
