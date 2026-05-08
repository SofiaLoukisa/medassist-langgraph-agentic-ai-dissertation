import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";

interface Patient {
  id: string;
  name: string;
  dateOfBirth?: string;
  gender?: string;
  allergies?: string[];
  illnessHistory?: string;
  aiSummary?: string;
  createdAt: string;
  medications?: Medication[];
}

interface Medication {
  id: string;
  medicineName: string;
  dosage?: string;
  frequency?: string;
  route?: string;
  startDate?: string;
  endDate?: string;
  foodInteraction?: string;
  warnings?: string[];
  isActive: boolean;
}

export function usePatients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPatients = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.get<Patient[]>("/patients");
      setPatients(data);
    } catch (err) {
      console.error("Failed to fetch patients:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  return { patients, loading, refetch: fetchPatients };
}

export function usePatient(id: string | undefined) {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPatient = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await api.get<Patient>(`/patients/${id}`);
      setPatient(data);
    } catch (err) {
      console.error("Failed to fetch patient:", err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPatient();
  }, [fetchPatient]);

  return { patient, loading, refetch: fetchPatient };
}
