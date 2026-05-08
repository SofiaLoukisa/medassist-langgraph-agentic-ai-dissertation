import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User } from "lucide-react";

interface PatientCardProps {
  id: string;
  name: string;
  gender?: string;
  dateOfBirth?: string;
  allergies?: string[];
}

export function PatientCard({ id, name, gender, dateOfBirth, allergies }: PatientCardProps) {
  return (
    <Link to={`/patients/${id}`}>
      <Card className="hover:border-primary transition-colors cursor-pointer">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4" />
            {name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground space-y-1">
            {gender && <p>Gender: {gender}</p>}
            {dateOfBirth && <p>DOB: {dateOfBirth}</p>}
          </div>
          {allergies && allergies.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {allergies.map((a, i) => (
                <Badge key={i} variant="destructive" className="text-xs">
                  {a}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
