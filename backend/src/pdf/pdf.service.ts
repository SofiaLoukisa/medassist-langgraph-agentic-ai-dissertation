import fs from "fs/promises";
import pdfParse from "pdf-parse";
import { db } from "../db/index.js";
import { pdfDocuments, documentChunks } from "../db/schema.js";
import { textSplitter } from "../lib/splitter.js";
import { embeddings } from "../lib/embeddings.js";
import { eq, and, desc } from "drizzle-orm";

export async function processPdf(pdfId: string, filePath: string): Promise<void> {
  try {
    // 1. Update status to processing
    await db
      .update(pdfDocuments)
      .set({ status: "processing", updatedAt: new Date() })
      .where(eq(pdfDocuments.id, pdfId));

    // 2. Read file from disk
    const buffer = await fs.readFile(filePath);

    // 3. Extract text with pdf-parse
    const { text, numpages } = await pdfParse(buffer);

    // 4. Update pageCount
    await db
      .update(pdfDocuments)
      .set({ pageCount: numpages, updatedAt: new Date() })
      .where(eq(pdfDocuments.id, pdfId));

    // 5. Split text into chunks
    const chunks = await textSplitter.splitText(text);

    // 6. Get the pdf record for metadata
    const [pdfRecord] = await db
      .select()
      .from(pdfDocuments)
      .where(eq(pdfDocuments.id, pdfId));

    // 7. Embed each chunk and insert into document_chunks
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = await embeddings.embedQuery(chunk);

      await db.insert(documentChunks).values({
        pdfDocumentId: pdfId,
        content: chunk,
        metadata: { pdfId, pdfName: pdfRecord.originalName },
        embedding,
        chunkIndex: i,
      });
    }

    // 8. Update status to ready
    await db
      .update(pdfDocuments)
      .set({ status: "ready", updatedAt: new Date() })
      .where(eq(pdfDocuments.id, pdfId));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error during PDF processing";
    await db
      .update(pdfDocuments)
      .set({ status: "error", errorMessage: message, updatedAt: new Date() })
      .where(eq(pdfDocuments.id, pdfId));
  }
}

export async function getUserPdfs(userId: string) {
  return db
    .select()
    .from(pdfDocuments)
    .where(eq(pdfDocuments.userId, userId))
    .orderBy(desc(pdfDocuments.createdAt));
}

export async function deletePdf(pdfId: string, userId: string): Promise<boolean> {
  // Verify ownership
  const [pdf] = await db
    .select()
    .from(pdfDocuments)
    .where(and(eq(pdfDocuments.id, pdfId), eq(pdfDocuments.userId, userId)));

  if (!pdf) return false;

  // Delete the record (cascade deletes chunks)
  await db.delete(pdfDocuments).where(eq(pdfDocuments.id, pdfId));

  // Delete the file from disk
  try {
    await fs.unlink(`uploads/${pdf.filename}`);
  } catch {
    // File may already be deleted, ignore
  }

  return true;
}
