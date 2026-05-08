import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface PatientFormProps {
  onSubmit: (data: {
    name: string;
    dateOfBirth?: string;
    gender?: string;
    allergies?: string[];
    illnessHistory?: string;
  }) => void;
  initial?: {
    name?: string;
    dateOfBirth?: string;
    gender?: string;
    allergies?: string[];
    illnessHistory?: string;
  };
  loading?: boolean;
}

export function PatientForm({ onSubmit, initial, loading }: PatientFormProps) {
  const [name, setName] = useState(initial?.name || "");
  const [dob, setDob] = useState(initial?.dateOfBirth || "");
  const [gender, setGender] = useState(initial?.gender || "");
  const [allergies, setAllergies] = useState(initial?.allergies?.join(", ") || "");
  const [history, setHistory] = useState(initial?.illnessHistory || "");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      dateOfBirth: dob || undefined,
      gender: gender || undefined,
      allergies: allergies ? allergies.split(",").map((a) => a.trim()) : undefined,
      illnessHistory: history || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium">Name *</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Date of Birth</label>
          <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-medium">Gender</label>
          <select
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={gender}
            onChange={(e) => setGender(e.target.value)}
          >
            <option value="">Select</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>
      <div>
        <label className="text-sm font-medium">Allergies (comma-separated)</label>
        <Input value={allergies} onChange={(e) => setAllergies(e.target.value)} placeholder="Penicillin, Aspirin..." />
      </div>
      <div>
        <label className="text-sm font-medium">Illness History</label>
        <Textarea value={history} onChange={(e) => setHistory(e.target.value)} rows={3} />
      </div>
      <Button type="submit" disabled={!name.trim() || loading}>
        {loading ? "Saving..." : initial ? "Update Patient" : "Create Patient"}
      </Button>
    </form>
  );
}
