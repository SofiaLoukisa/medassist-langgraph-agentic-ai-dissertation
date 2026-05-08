import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { usePatient } from "@/hooks/usePatients";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { InteractionAlert } from "@/components/medicine/InteractionAlert";
import { DosageCardComponent } from "@/components/medicine/DosageCard";
import { api } from "@/lib/api";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Trash2, Plus, Sparkles, CreditCard, AlertTriangle, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { patient, loading, refetch } = usePatient(id);
  const [medDialog, setMedDialog] = useState(false);
  const [medName, setMedName] = useState("");
  const [medDosage, setMedDosage] = useState("");
  const [medFreq, setMedFreq] = useState("");
  const [interactions, setInteractions] = useState<Array<{drug1: string; drug2: string; severity: string; description: string}>>([]);
  const [cards, setCards] = useState<Array<{id: string; title: string; cardData: Record<string,unknown>; htmlContent: string; createdAt: string}>>([]);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [cardsLoading, setCardsLoading] = useState(false);
  const [interactionsLoading, setInteractionsLoading] = useState(false);

  if (loading) return <p className="text-muted-foreground p-4">Loading...</p>;
  if (!patient) return <p className="text-muted-foreground p-4">Patient not found</p>;

  const activeMeds = patient.medications?.filter((m) => m.isActive) || [];

  const addMedication = async () => {
    if (!medName.trim()) return;
    await api.post(`/patients/${id}/medications`, {
      medicineName: medName,
      dosage: medDosage || undefined,
      frequency: medFreq || undefined,
    });
    setMedName(""); setMedDosage(""); setMedFreq("");
    setMedDialog(false);
    refetch();
  };

  const deleteMedication = async (medId: string) => {
    await api.delete(`/patients/${id}/medications/${medId}`);
    refetch();
  };

  const checkInteractions = async () => {
    if (activeMeds.length < 2) return;
    setInteractionsLoading(true);
    try {
      const result = await api.post<{interactions: typeof interactions}>("/medicines/check-interactions", {
        medicines: activeMeds.map((m) => m.medicineName),
      });
      setInteractions(result.interactions);
    } finally {
      setInteractionsLoading(false);
    }
  };

  const generateSummary = async () => {
    setSummaryLoading(true);
    try {
      await api.post(`/patients/${id}/summary`);
      refetch();
    } finally {
      setSummaryLoading(false);
    }
  };

  const generateCard = async () => {
    setCardsLoading(true);
    try {
      await api.post(`/patients/${id}/dosage-cards`);
      const cardList = await api.get<typeof cards>(`/patients/${id}/dosage-cards`);
      setCards(cardList);
    } finally {
      setCardsLoading(false);
    }
  };

  const loadCards = async () => {
    const cardList = await api.get<typeof cards>(`/patients/${id}/dosage-cards`);
    setCards(cardList);
  };

  const deleteCard = async (cardId: string) => {
    await api.delete(`/patients/${id}/dosage-cards/${cardId}`);
    setCards((prev) => prev.filter((c) => c.id !== cardId));
  };

  const deletePatient = async () => {
    await api.delete(`/patients/${id}`);
    navigate("/patients");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{patient.name}</h2>
        <Button variant="destructive" size="sm" onClick={deletePatient}>
          <Trash2 className="h-4 w-4 mr-1" /> Delete
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Patient Info</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {patient.dateOfBirth && <p><strong>DOB:</strong> {patient.dateOfBirth}</p>}
            {patient.gender && <p><strong>Gender:</strong> {patient.gender}</p>}
            {patient.allergies && patient.allergies.length > 0 && (
              <div className="flex flex-wrap gap-1">
                <strong>Allergies:</strong>
                {patient.allergies.map((a, i) => (
                  <Badge key={i} variant="destructive">{a}</Badge>
                ))}
              </div>
            )}
            {patient.illnessHistory && <p><strong>History:</strong> {patient.illnessHistory}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">AI Summary</CardTitle>
            <Button variant="outline" size="sm" onClick={generateSummary} disabled={summaryLoading}>
              <Sparkles className="h-4 w-4 mr-1" />
              {summaryLoading ? "Generating..." : "Generate"}
            </Button>
          </CardHeader>
          <CardContent>
            {patient.aiSummary ? (
              <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:text-base prose-headings:font-semibold prose-p:my-1.5 prose-ul:my-1.5 prose-li:my-0.5 prose-strong:text-foreground">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{patient.aiSummary}</ReactMarkdown>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No summary yet. Click Generate to create one.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="medications" onValueChange={(v) => { if (v === "cards") loadCards(); }}>
        <TabsList>
          <TabsTrigger value="medications">Medications</TabsTrigger>
          <TabsTrigger value="interactions">Interactions</TabsTrigger>
          <TabsTrigger value="cards">Dosage Cards</TabsTrigger>
        </TabsList>

        <TabsContent value="medications">
          <div className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={medDialog} onOpenChange={setMedDialog}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Medication</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add Medication</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <Input placeholder="Medicine name *" value={medName} onChange={(e) => setMedName(e.target.value)} />
                    <Input placeholder="Dosage (e.g. 500mg)" value={medDosage} onChange={(e) => setMedDosage(e.target.value)} />
                    <Input placeholder="Frequency (e.g. twice daily)" value={medFreq} onChange={(e) => setMedFreq(e.target.value)} />
                    <Button onClick={addMedication} disabled={!medName.trim()}>Add</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {activeMeds.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">No active medications</p>
            ) : (
              <div className="space-y-2">
                {activeMeds.map((med) => (
                  <div key={med.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{med.medicineName}</p>
                      <p className="text-sm text-muted-foreground">
                        {[med.dosage, med.frequency].filter(Boolean).join(" - ")}
                      </p>
                      {med.warnings && med.warnings.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {med.warnings.map((w, i) => (
                            <Badge key={i} variant="outline" className="text-xs">{w}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => deleteMedication(med.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="interactions">
          <div className="space-y-4">
            <Button onClick={checkInteractions} disabled={activeMeds.length < 2 || interactionsLoading}>
              {interactionsLoading ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <AlertTriangle className="h-4 w-4 mr-1" />
              )}
              {interactionsLoading ? "Checking..." : `Check Interactions (${activeMeds.length} meds)`}
            </Button>
            <InteractionAlert interactions={interactions} />
          </div>
        </TabsContent>

        <TabsContent value="cards">
          <div className="space-y-4">
            <Button onClick={generateCard} disabled={cardsLoading}>
              {cardsLoading ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <CreditCard className="h-4 w-4 mr-1" />
              )}
              {cardsLoading ? "Generating..." : "Generate Dosage Card"}
            </Button>
            {cards.map((card) => (
              <DosageCardComponent key={card.id} {...card} onDelete={deleteCard} />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
