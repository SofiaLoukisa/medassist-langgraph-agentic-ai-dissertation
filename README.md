# 🏥 MedAssist — Intelligent Medical Assistant

<div align="center">

![Dashboard](assets/dashboard.png)

**An agentic AI-powered medical assistant built with LangGraph, Retrieval-Augmented Generation and real-time tool-calling for healthcare professionals.**

[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React_18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js_20-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL_16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![LangChain](https://img.shields.io/badge/LangChain-1C3C3C?style=for-the-badge&logo=langchain&logoColor=white)](https://langchain.com/)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)

</div>

---

## 📖 Overview

MedAssist is a full-stack intelligent medical assistant that allows healthcare professionals to interact with pharmaceutical knowledge through **natural language**. Instead of searching through textbooks or databases, a clinician can simply ask:

> *"Can my patient take Azithromycin alongside Atorvastatin?"*
> *"What are the contraindications of Amlodipine in elderly patients?"*
> *"Generate a dosage card for Sofia Loukisa."*

The system understands the intent, queries the right tools, retrieves grounded information from real pharmaceutical PDFs and delivers a structured, cited response — all in real time.

> 🎓 Built as a **BSc Computer Science First-Class Dissertation** at the University of York Europe Campus, Athens Tech (2025–2026).

---

## ✨ Key Features

| Feature | Description |
|---|---|
| 💬 **Conversational Interface** | Natural language chat with real-time token streaming |
| 🔍 **RAG-Powered Queries** | Answers grounded in uploaded pharmaceutical PDFs, not AI hallucination |
| ⚠️ **Drug Interaction Detection** | Severity-rated DDI checking (mild / moderate / severe / contraindicated) |
| 📋 **Dosage Card Generation** | Auto-generated structured medication cards per patient |
| 👤 **Patient Management** | Full CRUD for patients, medications, allergies, and medical history |
| 🧠 **Agentic Tool-Calling** | ReAct loop with 10 specialised tools, visible in real time |
| 🔖 **Bookmarks** | Save any critical AI response for later reference |
| 🔐 **Secure Auth** | JWT authentication with bcrypt-hashed passwords |

---

## 🖥️ Application Screenshots

### Login & Account Creation
![Login](assets/login.png)
![Create Account](assets/create-account.png)

---

### Patient Management
![Patients](assets/patients.png)
![New Patient](assets/manual-new-patient.png)
![Patient Card](assets/patient-card.png)

---

### AI Chat — Drug Interactions
![Drug Interactions Chat](assets/chat-drug-interactions.png)

---

### AI Chat — Dosage Card Generation
![Dosage Card Chat](assets/chat-dosage-card.png)

---

### Medicine Cards
![Medicine Cards](assets/medicine-cards.png)
![Dosage Card PDF](assets/dosage-card-pdf.png)

---

### PDF Document Management
![PDF Management](assets/pdf.png)

---

### Bookmarks
![Bookmarks](assets/bookmarks.png)

---

### New Chat Session
![New Chat](assets/new-chat.png)

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    React 18 Frontend                    │
│         (TypeScript · Tailwind CSS · Vite)              │
│   Chat UI · Patient Dashboard · PDF Manager · Cards     │
└────────────────────────┬────────────────────────────────┘
                         │ REST + SSE Streaming
┌────────────────────────▼────────────────────────────────┐
│                   Hono Backend (Node.js)                │
│              JWT Auth · Chat Service · CRUD             │
│                                                         │
│   ┌─────────────────────────────────────────────────┐   │
│   │              LangGraph Agent                    │   │
│   │                                                 │   │
│   │   ┌──────────┐    ┌───────────────────────┐     │   │
│   │   │  Router  │───▶│      toolAgent        │     │   │
│   │   │ (Intent  │    │   (ReAct Loop × 5)    │     │   │
│   │   │Classify) │    │  10 LangChain Tools   │     │   │
│   │   └──────────┘    └───────────────────────┘     │   │
│   └─────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────┘
                         │ Drizzle ORM
┌────────────────────────▼────────────────────────────────┐
│              PostgreSQL 16 + pgvector                   │
│    Relational Data         Vector Store (HNSW index)    │
│  Users · Patients ·      768-dim Embeddings             │
│  Medications · Chat       Cosine Similarity Search      │
└─────────────────────────────────────────────────────────┘
                         │
              ┌──────────▼──────────┐
              │   Google Gemini API │
              │  Flash (LLM) +      │
              │  Embedding-001 (RAG)│
              └─────────────────────┘
```

---

## 🤖 How the AI Works

### 1. Intent Classification (Router Node)
Every message is first passed through a **structured-output Gemini classifier** that deterministically routes it to one of five intent categories:

```
rag_query          → search pharmaceutical PDFs
interaction_check  → check drug-drug interactions  
card_generation    → generate patient dosage card
patient_management → CRUD on patient records
general            → open conversation
```

### 2. ReAct Agent Loop (toolAgent Node)
The agent executes a **Reason → Act → Observe** loop powered by LangGraph's StateGraph:

```
User Message
     ↓
  [THINK]  "I need to check the interaction between these two drugs"
     ↓
  [ACT]    calls check_interactions("Atorvastatin", "Azithromycin")
     ↓
  [OBSERVE] receives DDI data from pgvector RAG retrieval
     ↓
  [THINK]  "I now have enough context to answer"
     ↓
  [RESPOND] streams severity-rated response to user
```

### 3. RAG Pipeline
```
PDF Upload
   ↓
pdf-parse (text extraction)
   ↓
RecursiveCharacterTextSplitter (chunk: 1000 / overlap: 200)
   ↓
gemini-embedding-001 (768-dimensional vectors)
   ↓
pgvector HNSW index (cosine similarity)
   ↓
Top-5 semantically similar chunks → injected as LLM context
```

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS | SPA with real-time streaming UI |
| **Backend** | Hono, Node.js 20 LTS, TypeScript | Lightweight REST API server |
| **AI Orchestration** | LangGraph 0.2, LangChain 0.3 | Stateful agentic graph execution |
| **LLM** | Google Gemini Flash | Natural language generation + tool-calling |
| **Embeddings** | Google Gemini Embedding-001 | 768-dim semantic text vectors |
| **Vector Store** | PostgreSQL + pgvector (HNSW) | Sub-100ms approximate nearest-neighbour search |
| **ORM** | Drizzle ORM | Type-safe SQL with zero code generation |
| **Auth** | JWT + bcrypt | Stateless sessions, hashed passwords |
| **PDF Parsing** | pdf-parse | Text extraction from pharmaceutical documents |
| **Streaming** | Server-Sent Events (SSE) | Real-time token-by-token response delivery |
| **Infrastructure** | Docker Compose | One-command database provisioning |

---

## 📊 Evaluation Results

The system was evaluated across **30 novel test queries** spanning all intent categories:

| Metric | Result |
|---|---|
| 🎯 Intent Classification Accuracy | **93.3%** (28/30 queries) |
| 📚 RAG Retrieval Quality Score | **83.3%** (50/60 weighted points) |
| 📋 Dosage Card Consistency | **80%** (4/5 fully BNF-consistent) |
| ✅ Unit Tests Passing | **20/20** |
| ✅ Integration Tests Passing | **15/15** |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20 LTS
- pnpm (`npm install -g pnpm`)
- Docker Desktop
- Google API Key (Gemini)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/YOUR_USERNAME/medassist.git
cd medassist

# 2. Start the database
docker-compose up -d

# 3. Install all dependencies
pnpm install

# 4. Configure environment
cp backend/.env.example backend/.env
# Fill in: DATABASE_URL, GOOGLE_API_KEY, JWT_SECRET

# 5. Run migrations
cd backend && pnpm drizzle-kit migrate

# 6. Start backend (port 3000)
cd backend && pnpm dev

# 7. Start frontend (port 5173)
cd frontend && pnpm dev
```

Open [http://localhost:5173](http://localhost:5173), register an account, upload pharmaceutical PDFs and start chatting.

### Environment Variables

```env
DATABASE_URL=postgresql://medassist:medassist_dev@localhost:5432/medassist
GOOGLE_API_KEY=your_google_api_key_here
JWT_SECRET=your_secure_random_secret_here
```

---

## 📁 Project Structure

```
medassist/
├── assets/                   # Screenshots for README
├── frontend/                 # React SPA
│   └── src/
│       ├── pages/            # Route-level components
│       └── components/       # Reusable UI components
│
└── backend/                  # Hono API server
    └── src/
        ├── agent/            # LangGraph agent
        │   ├── graph.ts      # StateGraph definition
        │   ├── state.ts      # AgentState schema
        │   ├── nodes/        # router + toolAgent
        │   └── tools/        # 10 LangChain tools
        ├── db/               # Drizzle schema + migrations
        ├── auth/             # JWT authentication
        ├── chat/             # Chat service + SSE streaming
        ├── patient/          # Patient CRUD
        ├── pdf/              # PDF ingestion pipeline
        └── medicine/         # Dosage card generation
```

---

## 🎓 Academic Context

This project was developed as a **BSc Computer Science Dissertation** at the University of York Europe Campus, Athens Tech, achieving a **First-Class** grade.

**Research Questions addressed:**
- How effectively can a graph-based agentic architecture produce clinically appropriate pharmaceutical responses?
- How does RAG over user-uploaded documents reduce hallucination compared to ungrounded LLM responses?
- What architectural and safety constraints must be satisfied before clinical deployment?

---

## ⚠️ Disclaimer

MedAssist is a **research prototype** developed for academic purposes. It is **not intended for real clinical use** without independent validation, regulatory compliance review and integration with authoritative pharmaceutical databases.

---

## 👤 Author

**Sofia Loukisa**
BSc Computer Science — University of York Europe Campus, Athens Tech
Supervisor: Dr. Odysseas Efremidis | Academic Year 2025–2026

