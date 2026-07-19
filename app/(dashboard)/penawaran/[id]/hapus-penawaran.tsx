"use client";

import { TombolHapus } from "@/components/ui/tombol-hapus";
import { hapusPenawaran } from "../actions";

export default function HapusPenawaran({ id, nomor }: { id: string; nomor: string }) {
  return (
    <TombolHapus
      nama={nomor}
      jenis="Penawaran"
      gaya="tombol"
      redirectKe="/penawaran"
      onHapus={() => hapusPenawaran(id)}
    />
  );
}
