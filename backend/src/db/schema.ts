import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  date,
  vector,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Users ────────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").unique().notNull(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  pdfDocuments: many(pdfDocuments),
  chatSessions: many(chatSessions),
  patients: many(patients),
  dosageCards: many(dosageCards),
  bookmarks: many(bookmarks),
}));

// ─── PDF Documents ────────────────────────────────────────────────────────────

export const pdfDocuments = pgTable("pdf_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  size: integer("size").notNull(),
  pageCount: integer("page_count"),
  status: text("status", {
    enum: ["uploading", "processing", "ready", "error"],
  })
    .default("uploading")
    .notNull(),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const pdfDocumentsRelations = relations(pdfDocuments, ({ one, many }) => ({
  user: one(users, { fields: [pdfDocuments.userId], references: [users.id] }),
  chunks: many(documentChunks),
}));

// ─── Document Chunks (with pgvector) ──────────────────────────────────────────

export const documentChunks = pgTable(
  "document_chunks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pdfDocumentId: uuid("pdf_document_id")
      .references(() => pdfDocuments.id, { onDelete: "cascade" })
      .notNull(),
    content: text("content").notNull(),
    metadata: jsonb("metadata"),
    embedding: vector("embedding", { dimensions: 768 }),
    pageNumber: integer("page_number"),
    chunkIndex: integer("chunk_index"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("document_chunks_embedding_idx").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops")
    ),
  ]
);

export const documentChunksRelations = relations(documentChunks, ({ one }) => ({
  pdfDocument: one(pdfDocuments, {
    fields: [documentChunks.pdfDocumentId],
    references: [pdfDocuments.id],
  }),
}));

// ─── Patients ─────────────────────────────────────────────────────────────────

export const patients = pgTable("patients", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  name: text("name").notNull(),
  dateOfBirth: date("date_of_birth"),
  gender: text("gender"),
  allergies: text("allergies").array().default([]),
  illnessHistory: text("illness_history"),
  aiSummary: text("ai_summary"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const patientsRelations = relations(patients, ({ one, many }) => ({
  user: one(users, { fields: [patients.userId], references: [users.id] }),
  medications: many(patientMedications),
  chatSessions: many(chatSessions),
  dosageCards: many(dosageCards),
}));

// ─── Chat Sessions ────────────────────────────────────────────────────────────

export const chatSessions = pgTable("chat_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  patientId: uuid("patient_id").references(() => patients.id),
  title: text("title"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const chatSessionsRelations = relations(chatSessions, ({ one, many }) => ({
  user: one(users, { fields: [chatSessions.userId], references: [users.id] }),
  patient: one(patients, { fields: [chatSessions.patientId], references: [patients.id] }),
  messages: many(chatMessages),
  bookmarks: many(bookmarks),
}));

// ─── Chat Messages ────────────────────────────────────────────────────────────

export const chatMessages = pgTable("chat_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id")
    .references(() => chatSessions.id, { onDelete: "cascade" })
    .notNull(),
  role: text("role", { enum: ["user", "assistant", "system"] }).notNull(),
  content: text("content").notNull(),
  toolName: text("tool_name"),
  toolData: jsonb("tool_data"),
  sources: jsonb("sources"),
  isBookmarked: boolean("is_bookmarked").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const chatMessagesRelations = relations(chatMessages, ({ one, many }) => ({
  session: one(chatSessions, {
    fields: [chatMessages.sessionId],
    references: [chatSessions.id],
  }),
  bookmarks: many(bookmarks),
}));

// ─── Patient Medications ──────────────────────────────────────────────────────

export const patientMedications = pgTable("patient_medications", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientId: uuid("patient_id")
    .references(() => patients.id, { onDelete: "cascade" })
    .notNull(),
  medicineName: text("medicine_name").notNull(),
  dosage: text("dosage"),
  frequency: text("frequency"),
  route: text("route"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  foodInteraction: text("food_interaction"),
  warnings: text("warnings").array().default([]),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const patientMedicationsRelations = relations(patientMedications, ({ one }) => ({
  patient: one(patients, {
    fields: [patientMedications.patientId],
    references: [patients.id],
  }),
}));

// ─── Dosage Cards ─────────────────────────────────────────────────────────────

export const dosageCards = pgTable("dosage_cards", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientId: uuid("patient_id")
    .references(() => patients.id, { onDelete: "cascade" })
    .notNull(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  title: text("title"),
  cardData: jsonb("card_data"),
  htmlContent: text("html_content"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const dosageCardsRelations = relations(dosageCards, ({ one }) => ({
  patient: one(patients, { fields: [dosageCards.patientId], references: [patients.id] }),
  user: one(users, { fields: [dosageCards.userId], references: [users.id] }),
}));

// ─── Bookmarks ────────────────────────────────────────────────────────────────

export const bookmarks = pgTable("bookmarks", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  messageId: uuid("message_id")
    .references(() => chatMessages.id, { onDelete: "cascade" })
    .notNull(),
  sessionId: uuid("session_id")
    .references(() => chatSessions.id)
    .notNull(),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const bookmarksRelations = relations(bookmarks, ({ one }) => ({
  user: one(users, { fields: [bookmarks.userId], references: [users.id] }),
  message: one(chatMessages, { fields: [bookmarks.messageId], references: [chatMessages.id] }),
  session: one(chatSessions, { fields: [bookmarks.sessionId], references: [chatSessions.id] }),
}));

// ─── Type Exports ─────────────────────────────────────────────────────────────

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type PdfDocument = typeof pdfDocuments.$inferSelect;
export type NewPdfDocument = typeof pdfDocuments.$inferInsert;

export type DocumentChunk = typeof documentChunks.$inferSelect;
export type NewDocumentChunk = typeof documentChunks.$inferInsert;

export type Patient = typeof patients.$inferSelect;
export type NewPatient = typeof patients.$inferInsert;

export type ChatSession = typeof chatSessions.$inferSelect;
export type NewChatSession = typeof chatSessions.$inferInsert;

export type ChatMessage = typeof chatMessages.$inferSelect;
export type NewChatMessage = typeof chatMessages.$inferInsert;

export type PatientMedication = typeof patientMedications.$inferSelect;
export type NewPatientMedication = typeof patientMedications.$inferInsert;

export type DosageCard = typeof dosageCards.$inferSelect;
export type NewDosageCard = typeof dosageCards.$inferInsert;

export type Bookmark = typeof bookmarks.$inferSelect;
export type NewBookmark = typeof bookmarks.$inferInsert;
