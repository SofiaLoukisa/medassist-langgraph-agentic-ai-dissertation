import { useState } from "react";
import { usePatients } from "@/hooks/usePatients";
import { PatientCard } from "@/components/patient/PatientCard";
import { PatientForm } from "@/components/patient/PatientForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { Plus, Search } from "lucide-react";

export default function PatientsPage() {
  const { patients, loading, refetch } = usePatients();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const filtered = patients.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async (data: Record<string, unknown>) => {
    setCreating(true);
    try {
      await api.post("/patients", data);
      await refetch();
      setOpen(false);
    } catch (err) {
      console.error("Failed to create patient:", err);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Patients</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Patient
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Patient</DialogTitle>
            </DialogHeader>
            <PatientForm onSubmit={handleCreate} loading={creating} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search patients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">No patients found</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <PatientCard
              key={p.id}
              id={p.id}
              name={p.name}
              gender={p.gender}
              dateOfBirth={p.dateOfBirth}
              allergies={p.allergies}
            />
          ))}
        </div>
      )}
    </div>
  );
}
