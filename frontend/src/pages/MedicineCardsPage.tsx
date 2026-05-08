import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { DosageCardComponent } from "@/components/medicine/DosageCard";
import { usePatients } from "@/hooks/usePatients";

interface DosageCard {
  id: string;
  title: string;
  patientId: string;
  cardData: Record<string, unknown>;
  htmlContent: string;
  createdAt: string;
}

export default function MedicineCardsPage() {
  const { patients } = usePatients();
  const [cards, setCards] = useState<DosageCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCards() {
      const allCards: DosageCard[] = [];
      for (const patient of patients) {
        try {
          const patientCards = await api.get<DosageCard[]>(
            `/patients/${patient.id}/dosage-cards`
          );
          allCards.push(...patientCards);
        } catch {
          // skip errors
        }
      }
      allCards.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setCards(allCards);
      setLoading(false);
    }

    if (patients.length > 0) {
      loadCards();
    } else {
      setLoading(false);
    }
  }, [patients]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Medicine Cards</h2>
      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : cards.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">
          No dosage cards generated yet. Go to a patient's page to create one.
        </p>
      ) : (
        <div className="space-y-4">
          {cards.map((card) => (
            <DosageCardComponent key={card.id} {...card} />
          ))}
        </div>
      )}
    </div>
  );
}
