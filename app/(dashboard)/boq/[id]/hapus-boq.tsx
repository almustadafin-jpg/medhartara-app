"use client";

import { TombolHapus } from "@/components/ui/tombol-hapus";
import { hapusBoq } from "../actions";

export default function HapusBoq({ id, nama }: { id: string; nama: string }) {
  return (
    <TombolHapus
      nama={nama}
      jenis="BOQ"
      gaya="tombol"
      redirectKe="/boq"
      onHapus={() => hapusBoq(id)}
    />
  );
}
