import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";

interface Interaction {
  drug1: string;
  drug2: string;
  severity: string;
  description: string;
}

interface InteractionAlertProps {
  interactions: Interaction[];
}

const severityColors: Record<string, string> = {
  mild: "bg-yellow-100 text-yellow-800 border-yellow-300",
  moderate: "bg-orange-100 text-orange-800 border-orange-300",
  severe: "bg-red-100 text-red-800 border-red-300",
  contraindicated: "bg-red-200 text-red-900 border-red-500",
};

export function InteractionAlert({ interactions }: InteractionAlertProps) {
  if (interactions.length === 0) return null;

  return (
    <div className="space-y-2">
      {interactions.map((interaction, i) => (
        <Alert
          key={i}
          variant={interaction.severity === "mild" ? "default" : "destructive"}
        >
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="flex items-center gap-2">
            {interaction.drug1} + {interaction.drug2}
            <Badge className={severityColors[interaction.severity] || ""}>
              {interaction.severity}
            </Badge>
          </AlertTitle>
          <AlertDescription>{interaction.description}</AlertDescription>
        </Alert>
      ))}
    </div>
  );
}
