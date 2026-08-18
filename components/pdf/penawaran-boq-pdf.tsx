import { Document } from "@react-pdf/renderer";
import { HalamanDokumen, type DataDokumenPDF } from "./dokumen-pdf";
import { HalamanBoq, type DataBoqPDF } from "./boq-pdf";

/**
 * Penawaran + lampiran BOQ dalam SATU dokumen PDF.
 * Dipakai untuk penawaran yang dikonversi dari BOQ: halaman penawaran
 * (potret) diikuti lampiran rincian BOQ (lanskap).
 */
export function PenawaranDenganBoqPDF({
  dok,
  boq,
}: {
  dok: DataDokumenPDF;
  boq: DataBoqPDF | null;
}) {
  return (
    <Document title={`Penawaran ${dok.nomor}`} author={dok.perusahaan.nama}>
      <HalamanDokumen data={dok} />
      {boq && <HalamanBoq data={boq} />}
    </Document>
  );
}
