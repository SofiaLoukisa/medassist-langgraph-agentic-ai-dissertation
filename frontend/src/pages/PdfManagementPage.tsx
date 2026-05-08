import { usePdfs } from "@/hooks/usePdfs";
import { PdfUploader } from "@/components/pdf/PdfUploader";
import { PdfList } from "@/components/pdf/PdfList";
import { useEffect } from "react";

export default function PdfManagementPage() {
  const { pdfs, loading, uploadPdf, deletePdf, refetch } = usePdfs();

  // Poll for status updates when any PDF is processing
  useEffect(() => {
    const hasProcessing = pdfs.some(
      (p) => p.status === "uploading" || p.status === "processing"
    );
    if (!hasProcessing) return;

    const interval = setInterval(refetch, 3000);
    return () => clearInterval(interval);
  }, [pdfs, refetch]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">PDF Documents</h2>
      <PdfUploader onUpload={uploadPdf} />
      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <PdfList pdfs={pdfs} onDelete={deletePdf} />
      )}
    </div>
  );
}
