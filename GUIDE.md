# MedAssist — Complete Guide

> AI-powered medical assistant for healthcare professionals. Manage patients, track medications, check drug interactions and search medical knowledge — all through an intelligent chat interface backed by your own uploaded medical documents.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, TailwindCSS, shadcn/ui, Vite |
| Backend | Node.js, Express, LangChain, LangGraph |
| LLM | Google Gemini (gemini-3-flash-preview) |
| Embeddings | Google gemini-embedding-001 (768 dimensions) |
| Database | PostgreSQL 16 + pgvector |
| Vector Store | PGVector with HNSW indexing |
| Auth | JWT + bcrypt |
| Package Manager | pnpm (monorepo workspace) |

---

## Quick Start

### 1. Start the database

```bash
docker compose up -d
```

This spins up PostgreSQL 16 with pgvector on port 5432.

### 2. Configure environment

Create `backend/.env`:

```env
DATABASE_URL=postgresql://medassist:medassist_dev@localhost:5432/medassist
JWT_SECRET=your-secret-key-here
GOOGLE_API_KEY=your-google-genai-api-key
PORT=3001
```

### 3. Install dependencies and run migrations

```bash
pnpm install
pnpm --filter backend db:generate
pnpm --filter backend db:migrate
```

### 4. Start the app
```bash 
#run the project compltetely
npm run dev
```

```bash
# Terminal 1 — Backend (port 3001)
pnpm --filter backend dev

# Terminal 2 — Frontend (port 5173)
pnpm --filter frontend dev
```

---

## Architecture

```
User Message
    |
    v
[Router Node] — LLM classifies intent
    |
    |-- rag_query          --> [ToolAgent: search_medicines]
    |-- interaction_check  --> [ToolAgent: search_medicines, check_interactions]
    |-- card_generation    --> [ToolAgent: all patient + card tools]
    |-- patient_management --> [ToolAgent: patient CRUD tools]
    |-- general            --> [ToolAgent: all 8 tools available]
    |
    v
[ToolAgent Node] — ReAct loop (max 5 iterations)
    |
    |-- Calls tools as needed
    |-- Feeds results back to LLM
    |-- Forces final response on last iteration
    |
    v
SSE Stream → Frontend (tokens + tool events)
```

### SSE Event Types

| Event | When | Data |
|-------|------|------|
| `tool_start` | Tool invocation begins | `{type, tool, callId, args}` |
| `tool_end` | Tool returns result | `{type, tool, callId}` |
| `token` | LLM generates text | `{type, content}` |
| `done` | Response complete | `{type, content, sources, toolsUsed}` |
| `error` | Something failed | `{type, error}` |

---

## Agent Tools

MedAssist has 8 tools available to the AI agent:

### Medicine Tools

| Tool | Input | What it does |
|------|-------|-------------|
| `search_medicines` | `query` (text) | RAG search over uploaded medical PDFs. Returns relevant document chunks with source references. |
| `check_interactions` | `drug1`, `drug2` | Checks drug-drug interactions between two medications using the knowledge base. Returns interaction data and individual drug warnings. |

### Patient Tools

| Tool | Input | What it does |
|------|-------|-------------|
| `search_patients` | `query` (name) | Finds patients by name. Returns matching patients with IDs, demographics, and active medication names. |
| `get_patient_info` | `patientId` (UUID) | Full patient profile: demographics, allergies, illness history, all active and past medications. |
| `create_patient` | `name`, `dateOfBirth?`, `gender?`, `allergies?` | Creates a new patient record. Returns the patient ID for use with other tools. |
| `add_medication` | `patientId`, `medicineName`, `dosage?`, `frequency?`, `route?` | Adds a medication to a patient's active medication list. |

### Card Tools

| Tool | Input | What it does |
|------|-------|-------------|
| `create_dosage_card` | `patientId` (UUID) | Generates a dosage card with all active medications enriched with RAG data (food interactions, warnings, side effects). |
| `create_patient_card` | `patientId` (UUID) | Creates a patient summary card with demographics, allergies, active/past medications, and health history. |

---

## Features Overview

### PDF Knowledge Base
Upload medical PDFs (drug monographs, formularies, clinical guidelines). The system:
1. Extracts text from PDFs
2. Splits into chunks with overlap
3. Generates vector embeddings (768-dim)
4. Stores in pgvector for semantic search

The AI uses this knowledge base to answer drug questions, check interactions, and enrich dosage cards.

### Patient Management
- Create and manage patient records with demographics, allergies, and illness history
- Track active and past medications with dosage, frequency, route
- Generate AI clinical summaries
- Generate and store dosage cards (with printable HTML)
- Check drug interactions between a patient's medications

### Chat Interface
- Real-time SSE streaming with tool call visibility
- Shows which tools are running (spinner) and when they complete (checkmark)
- Source badges showing which PDFs were referenced
- Tool badges showing which tools were used
- Bookmark important responses for later reference
- Auto-generated session titles
- Full conversation history persisted to DB

### Drug Interactions
- Check interactions between any two drugs
- Severity classification (mild, moderate, severe, contraindicated)
- Available both in chat and on the patient detail page

### Dosage Cards
- Generated from patient's active medications
- Enriched with knowledge base data (food interactions, warnings)
- Stored and accessible from patient profile or the cards page
- Printable HTML format

### Bookmarks
- Save important AI responses from any chat session
- Add notes to bookmarks
- Browse all bookmarks from the dedicated page

---

## Example Prompt Sequences

Below are real conversation flows showing how to get the most out of MedAssist. Each section builds on common healthcare workflows.

---

### 1. Setting Up Your Knowledge Base

Before the AI can answer medical questions, upload relevant PDFs.

**Steps:**
1. Navigate to **PDFs** page
2. Upload drug monographs, formularies, or clinical guidelines (e.g., Amlodipine PIL, BNF extracts)
3. Wait for status to change from "Processing" to "Ready"

Now the chat can search these documents.

---

### 2. Asking Drug Questions (RAG Search)

```
You: What are the common side effects and recommended dosages for amlodipine?
```

**What happens behind the scenes:**
- Router classifies intent as `rag_query`
- ToolAgent calls `search_medicines` to find relevant chunks from your PDFs
- LLM synthesizes an answer citing your uploaded documents
- Source badges show which PDFs were referenced

```
You: What is the maximum daily dose of amoxicillin for adults?
```

```
You: Can amlodipine be taken on an empty stomach?
```

---

### 3. Checking Drug Interactions

```
You: Are there any interactions between metformin and lisinopril?
```

**What happens:**
- Router classifies as `interaction_check`
- ToolAgent calls `check_interactions` + `search_medicines`
- LLM analyzes severity and presents findings with warnings

```
You: Can a patient safely take amlodipine and atorvastatin together?
```

```
You: What happens if someone takes ibuprofen with warfarin?
```

---

### 4. Creating a Patient (Conversational Flow)

The AI will ask for clarification if needed — just like the examples below:

```
You: Create a patient named Sarah Johnson

AI: I'd like to set up a patient record for Sarah Johnson.
    Could you provide:
    - Date of birth?
    - Gender?
    - Any known allergies?

You: Born 1985-03-15, female, allergic to penicillin

AI: Patient "Sarah Johnson" created successfully.
    - DOB: 1985-03-15
    - Gender: Female
    - Allergies: Penicillin
    Patient ID: a1b2c3d4-...
```

---

### 5. Adding Medications to a Patient

```
You: Add amlodipine 5mg once daily oral to Sarah Johnson

AI: [Searches for Sarah Johnson]
    [Adds medication]

    Medication added to Sarah Johnson:
    - Amlodipine 5mg, once daily, oral route

You: Also add metformin 500mg twice daily

AI: [Adds medication]

    Added metformin 500mg twice daily to Sarah Johnson.
    She now has 2 active medications.
```

---

### 6. Generating a Dosage Card

```
You: Create a dosage card for Sarah Johnson
```

**What happens:**
- Router classifies as `card_generation`
- ToolAgent calls `search_patients` to find Sarah
- Calls `create_dosage_card` with her patient ID
- Tool fetches her active meds, enriches each with RAG data
- LLM presents a formatted dosage card:

```
AI: ## Dosage Card — Sarah Johnson
    **Generated:** 2026-03-21 | **Allergies:** Penicillin

    | Medication | Dosage | Frequency | Route |
    |-----------|--------|-----------|-------|
    | Amlodipine | 5mg | Once daily | Oral |
    | Metformin | 500mg | Twice daily | Oral |

    **Amlodipine:**
    - Take in the morning with or without food
    - Avoid grapefruit juice
    - May cause ankle swelling, dizziness

    **Metformin:**
    - Take with meals to reduce stomach upset
    - Monitor blood sugar levels regularly

    **General Notes:**
    - Keep all medications out of reach of children
    - Do not stop taking without consulting your doctor
```

---

### 7. Getting a Patient Summary

```
You: Show me a summary for Sarah Johnson
```

**What happens:**
- Calls `search_patients` → `create_patient_card`
- Presents demographics, allergies, medication list, health history

---

### 8. Full Workflow — New Patient End to End

This sequence shows the complete workflow from creating a patient to generating their dosage card:

```
You: I have a new patient, John Smith, 45 years old male,
     allergic to sulfa drugs. He needs lisinopril 10mg daily
     and atorvastatin 20mg at bedtime.

AI: Let me set that up for you.
    [Creates patient John Smith]
    [Adds lisinopril 10mg once daily]
    [Adds atorvastatin 20mg once daily]

    Patient record created:
    - John Smith, Male, DOB: 1981-01-01
    - Allergies: Sulfa drugs
    - Medications: Lisinopril 10mg daily, Atorvastatin 20mg at bedtime

You: Check if there are any interactions between his medications

AI: [Calls check_interactions for lisinopril + atorvastatin]

    No significant interactions found between lisinopril and
    atorvastatin. These are commonly prescribed together for
    patients with hypertension and high cholesterol.

You: Generate his dosage card

AI: ## Dosage Card — John Smith
    ...formatted card with enriched medication data...

You: Also, what are the main side effects of lisinopril he
     should watch for?

AI: [Searches medical knowledge base]

    Based on the medical documents:
    - Common: Dry cough, dizziness, headache
    - Less common: Hyperkalemia, angioedema (rare but serious)
    - Monitor: Kidney function, potassium levels
    ...
```

---

### 9. Managing Existing Patients

```
You: Show me John Smith's current medications

AI: [Searches for John Smith → gets patient info]

    John Smith has 2 active medications:
    1. Lisinopril — 10mg, once daily, oral
    2. Atorvastatin — 20mg, once daily, oral

You: Add metformin 500mg twice daily to him

AI: [Adds medication]

    Metformin 500mg twice daily added. John Smith now has
    3 active medications. Would you like me to check for
    any interactions with his existing medications?
```

---

### 10. Quick Reference Queries

These work anytime without needing a patient context:

```
You: What is hypertension?

You: Explain the difference between ACE inhibitors and ARBs

You: What class of drug is metformin?

You: List common beta-blockers and their indications
```

---

## API Endpoints Reference

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/auth/me` | Get current user |

### Chat
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat/sessions` | Create chat session |
| GET | `/api/chat/sessions` | List sessions |
| GET | `/api/chat/sessions/:id` | Get session + messages |
| POST | `/api/chat/sessions/:id/messages` | Send message (SSE) |
| DELETE | `/api/chat/sessions/:id` | Delete session |

### PDFs
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/pdfs/upload` | Upload PDF (multipart) |
| GET | `/api/pdfs` | List PDFs |
| DELETE | `/api/pdfs/:id` | Delete PDF + chunks |

### Patients
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/patients` | Create patient |
| GET | `/api/patients` | List patients |
| GET | `/api/patients/:id` | Get patient + meds |
| PUT | `/api/patients/:id` | Update patient |
| DELETE | `/api/patients/:id` | Delete patient |
| POST | `/api/patients/:id/medications` | Add medication |
| PUT | `/api/patients/:id/medications/:medId` | Update medication |
| DELETE | `/api/patients/:id/medications/:medId` | Delete medication |
| POST | `/api/patients/:id/summary` | Generate AI summary |
| POST | `/api/patients/:id/dosage-cards` | Generate dosage card |
| GET | `/api/patients/:id/dosage-cards` | List dosage cards |

### Medicines
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/medicines/check-interactions` | Check drug interactions |
| GET | `/api/medicines/dosage-cards/:id` | Get dosage card |

### Bookmarks
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/bookmarks` | Create bookmark |
| GET | `/api/bookmarks` | List bookmarks |
| DELETE | `/api/bookmarks/:id` | Delete bookmark |

---

## Database Schema

```
users
  ├── patients (1:many)
  │     ├── patient_medications (1:many)
  │     ├── dosage_cards (1:many)
  │     └── chat_sessions (1:many, optional)
  ├── pdf_documents (1:many)
  │     └── document_chunks (1:many, with pgvector embeddings)
  ├── chat_sessions (1:many)
  │     ├── chat_messages (1:many)
  │     └── bookmarks (1:many)
  └── bookmarks (1:many)
```

---

## Project Structure

```
LangChain_Langhraph_proj/
├── docker-compose.yml          # PostgreSQL + pgvector
├── pnpm-workspace.yaml         # Monorepo config
│
├── backend/
│   └── src/
│       ├── index.ts            # Express server entry
│       ├── env.ts              # Environment validation
│       ├── agent/
│       │   ├── graph.ts        # LangGraph workflow
│       │   ├── state.ts        # Agent state definition
│       │   ├── prompts.ts      # System prompts per intent
│       │   ├── nodes/
│       │   │   ├── router.node.ts     # Intent classifier
│       │   │   └── toolAgent.node.ts  # ReAct tool-calling agent
│       │   └── tools/
│       │       ├── index.ts               # Tool registry
│       │       ├── searchMedicines.tool.ts
│       │       ├── checkInteractions.tool.ts
│       │       ├── createDosageCard.tool.ts
│       │       ├── createPatientCard.tool.ts
│       │       ├── searchPatients.tool.ts
│       │       ├── getPatientInfo.tool.ts
│       │       ├── createPatient.tool.ts
│       │       └── addMedication.tool.ts
│       ├── auth/               # JWT auth
│       ├── chat/               # Chat sessions + SSE streaming
│       ├── pdf/                # PDF upload + processing
│       ├── patient/            # Patient CRUD
│       ├── medicine/           # Interactions + dosage cards
│       ├── bookmark/           # Bookmark management
│       ├── db/                 # Drizzle schema + connection
│       └── lib/                # LLM, embeddings, vectorstore
│
└── frontend/
    └── src/
        ├── App.tsx             # Router + auth provider
        ├── pages/              # 9 page components
        ├── components/
        │   ├── chat/           # ChatWindow, ChatMessage, ToolCallIndicator
        │   ├── pdf/            # PdfUploader, PdfList
        │   ├── patient/        # PatientCard, PatientForm
        │   ├── medicine/       # DosageCard, InteractionAlert
        │   └── ui/             # shadcn components
        ├── hooks/              # useChat, usePdfs, usePatients
        └── lib/                # API client, auth context, utils
```

---

## Tips for Best Results

1. **Upload relevant PDFs first** — The AI's medical knowledge comes from your documents. Upload drug monographs, formularies, and clinical guidelines for the medications you work with.

2. **Be specific with drug names** — "What are the side effects of amlodipine?" works better than "what are the side effects of that blood pressure pill?"

3. **Use natural language for patient management** — You don't need to know patient IDs. Say "add metformin to Sarah Johnson" and the AI will search and find the right patient.

4. **One conversation per topic** — Start a new chat session for different patients or topics. This keeps context clean and makes auto-generated titles useful.

5. **Bookmark important responses** — Use the bookmark button on AI responses you want to reference later. Add notes to remember why you saved them.

6. **Check interactions proactively** — Before adding a new medication, ask the AI to check for interactions with the patient's existing medications.

7. **Generate dosage cards after adding all medications** — The card includes all active medications with cross-references, so add everything first, then generate.
