import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Printer, CreditCard, Trash2 } from "lucide-react";

interface DosageCardProps {
  id: string;
  title: string;
  cardData: Record<string, unknown>;
  htmlContent?: string;
  createdAt: string;
  onDelete?: (id: string) => void;
}

export function DosageCardComponent({ id, title, cardData, htmlContent, createdAt, onDelete }: DosageCardProps) {
  const meds = (cardData?.medications as Array<Record<string, unknown>>) || [];

  const handlePrint = () => {
    if (!htmlContent) return;
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            {title}
          </span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-1" />
              Print
            </Button>
            {onDelete && (
              <Button variant="outline" size="sm" onClick={() => onDelete(id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {new Date(createdAt).toLocaleDateString()}
        </p>
      </CardHeader>
      <CardContent>
        {meds.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Medicine</th>
                  <th className="text-left p-2">Dosage</th>
                  <th className="text-left p-2">Frequency</th>
                  <th className="text-left p-2">Timing</th>
                </tr>
              </thead>
              <tbody>
                {meds.map((m, i) => (
                  <tr key={i} className="border-b">
                    <td className="p-2 font-medium">{String(m.name || "")}</td>
                    <td className="p-2">{String(m.dosage || "")}</td>
                    <td className="p-2">{String(m.frequency || "")}</td>
                    <td className="p-2">{String(m.timing || "")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">No medication data</p>
        )}
      </CardContent>
    </Card>
  );
}
