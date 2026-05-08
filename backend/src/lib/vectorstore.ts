import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";
import { embeddings } from "./embeddings.js";
import { env } from "../env.js";

export async function getVectorStore(): Promise<PGVectorStore> {
  return PGVectorStore.initialize(embeddings, {
    postgresConnectionOptions: {
      connectionString: env.DATABASE_URL,
    },
    tableName: "document_chunks",
    columns: {
      idColumnName: "id",
      vectorColumnName: "embedding",
      contentColumnName: "content",
      metadataColumnName: "metadata",
    },
  });
}

export async function getRetriever(k = 5) {
  const store = await getVectorStore();
  return store.asRetriever(k);
}
