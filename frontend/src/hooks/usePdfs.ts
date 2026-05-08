import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";

interface PdfDocument {
  id: string;
  filename: string;
  originalName: string;
  size: number;
  pageCount?: number;
  status: "uploading" | "processing" | "ready" | "error";
  errorMessage?: string;
  createdAt: string;
}

export function usePdfs() {
  const [pdfs, setPdfs] = useState<PdfDocument[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPdfs = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.get<PdfDocument[]>("/pdfs");
      setPdfs(data);
    } catch (err) {
      console.error("Failed to fetch PDFs:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPdfs();
  }, [fetchPdfs]);

  const uploadPdf = useCallback(
    async (file: File) => {
      const formData = new FormData();
      formData.append("pdf", file);

      const token = localStorage.getItem("medassist_token");
      const res = await fetch("/api/pdfs/upload", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");
      const result = await res.json();
      await fetchPdfs();
      return result;
    },
    [fetchPdfs]
  );

  const deletePdf = useCallback(
    async (id: string) => {
      await api.delete(`/pdfs/${id}`);
      await fetchPdfs();
    },
    [fetchPdfs]
  );

  return { pdfs, loading, uploadPdf, deletePdf, refetch: fetchPdfs };
}
