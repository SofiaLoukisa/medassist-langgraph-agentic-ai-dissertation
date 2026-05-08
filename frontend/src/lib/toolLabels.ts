const TOOL_LABELS: Record<string, string> = {
  search_medicines: "Search Medicines",
  check_interactions: "Check Interactions",
  create_dosage_card: "Create Dosage Card",
  create_patient_card: "Create Patient Card",
  search_patients: "Search Patients",
  get_patient_info: "Get Patient Info",
  create_patient: "Create Patient",
  add_medication: "Add Medication",
};

export function getToolLabel(toolName: string): string {
  return TOOL_LABELS[toolName] || toolName.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
