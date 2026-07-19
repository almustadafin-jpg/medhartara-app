"use client";

import { useState } from "react";
import AksiInvoice from "./aksi-invoice";
import PembayaranForm from "./pembayaran-form";
import { Modal } from "@/components/ui/modal";
import type { InvoiceStatus } from "@/types";

/**
 * Menggabungkan tombol aksi dengan modal pembayaran.
 * Dipisah dari halaman agar halaman detail tetap Server Component.
 */
export default function PanelInvoice({
  id,
  status,
  sisa,
  bisaKelola,
  bisaBayar,
}: {
  id: string;
  status: InvoiceStatus;
  sisa: number;
  bisaKelola: boolean;
  bisaBayar: boolean;
}) {
  const [modalBuka, setModalBuka] = useState(false);

  return (
    <>
      <AksiInvoice
        id={id}
        status={status}
        bisaKelola={bisaKelola}
        bisaBayar={bisaBayar}
        onCatatPembayaran={() => setModalBuka(true)}
      />

      <Modal judul="Catat Pembayaran" buka={modalBuka} onTutup={() => setModalBuka(false)}>
        <PembayaranForm
          invoiceId={id}
          sisa={sisa}
          onSelesai={() => setModalBuka(false)}
        />
      </Modal>
    </>
  );
}
