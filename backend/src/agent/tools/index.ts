export { searchMedicinesTool } from "./searchMedicines.tool.js";
export { checkInteractionsTool } from "./checkInteractions.tool.js";
export { createDosageCardTool } from "./createDosageCard.tool.js";
export { createPatientCardTool } from "./createPatientCard.tool.js";
export { searchPatientsTool } from "./searchPatients.tool.js";
export { getPatientInfoTool } from "./getPatientInfo.tool.js";
export { createPatientTool } from "./createPatient.tool.js";
export { addMedicationTool } from "./addMedication.tool.js";
export { deletePatientTool } from "./deletePatient.tool.js";
export { updatePatientTool } from "./updatePatient.tool.js";

import { searchMedicinesTool } from "./searchMedicines.tool.js";
import { checkInteractionsTool } from "./checkInteractions.tool.js";
import { createDosageCardTool } from "./createDosageCard.tool.js";
import { createPatientCardTool } from "./createPatientCard.tool.js";
import { searchPatientsTool } from "./searchPatients.tool.js";
import { getPatientInfoTool } from "./getPatientInfo.tool.js";
import { createPatientTool } from "./createPatient.tool.js";
import { addMedicationTool } from "./addMedication.tool.js";
import { deletePatientTool } from "./deletePatient.tool.js";
import { updatePatientTool } from "./updatePatient.tool.js";

// Patient management tools
const patientTools = [
  searchPatientsTool,
  getPatientInfoTool,
  createPatientTool,
  addMedicationTool,
  deletePatientTool,
  updatePatientTool,
];

export const allTools = [
  searchMedicinesTool,
  checkInteractionsTool,
  createDosageCardTool,
  createPatientCardTool,
  ...patientTools,
];

// Tool sets per intent — guides which tools are most relevant
export const toolsByIntent: Record<string, typeof allTools> = {
  rag_query: [searchMedicinesTool],
  interaction_check: [searchMedicinesTool, checkInteractionsTool],
  card_generation: [
    searchPatientsTool,
    getPatientInfoTool,
    createPatientTool,
    addMedicationTool,
    deletePatientTool,
    updatePatientTool,
    searchMedicinesTool,
    createDosageCardTool,
    createPatientCardTool,
  ],
  patient_management: [
    searchPatientsTool,
    getPatientInfoTool,
    createPatientTool,
    addMedicationTool,
    deletePatientTool,
    updatePatientTool,
  ],
  general: allTools,
};
