import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Trash2, Loader2, CheckCircle, AlertCircle } from "lucide-react";

interface PdfDocument {
  id: string;
  originalName: string;
  size: number;
  pageCount?: number;
  status: "uploading" | "processing" | "ready" | "error";
  errorMessage?: string;
  createdAt: string;
}

interface PdfListProps {
  pdfs: PdfDocument[];
  onDelete: (id: string) => void;
}

const statusConfig = {
  uploading: { icon: Loader2, label: "Uploading", variant: "secondary" as const, spin: true },
  processing: { icon: Loader2, label: "Processing", variant: "secondary" as const, spin: true },
  ready: { icon: CheckCircle, label: "Ready", variant: "default" as const, spin: false },
  error: { icon: AlertCircle, label: "Error", variant: "destructive" as const, spin: false },
};

export function PdfList({ pdfs, onDelete }: PdfListProps) {
  if (pdfs.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        No PDFs uploaded yet
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {pdfs.map((pdf) => {
        const status = statusConfig[pdf.status];
        const Icon = status.icon;
        return (
          <div
            key={pdf.id}
            className="flex items-center gap-3 p-3 rounded-lg border"
          >
            <FileText className="h-8 w-8 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{pdf.originalName}</p>
              <p className="text-xs text-muted-foreground">
                {(pdf.size / 1024).toFixed(0)} KB
                {pdf.pageCount ? ` - ${pdf.pageCount} pages` : ""}
              </p>
              {pdf.errorMessage && (
                <p className="text-xs text-destructive mt-1">{pdf.errorMessage}</p>
              )}
            </div>
            <Badge variant={status.variant} className="gap-1">
              <Icon className={`h-3 w-3 ${status.spin ? "animate-spin" : ""}`} />
              {status.label}
            </Badge>
            <Button variant="ghost" size="icon" onClick={() => onDelete(pdf.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}
