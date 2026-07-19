"use client";

import { TombolHapus } from "@/components/ui/tombol-hapus";
import { hapusInvoice } from "../actions";

export default function HapusInvoice({ id, nomor }: { id: string; nomor: string }) {
  return (
    <TombolHapus
      nama={nomor}
      jenis="Invoice"
      gaya="tombol"
      redirectKe="/invoice"
      onHapus={() => hapusInvoice(id)}
    />
  );
}
