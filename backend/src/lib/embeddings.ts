import { GoogleGenAI } from "@google/genai";
import { Embeddings, type EmbeddingsParams } from "@langchain/core/embeddings";
import { env } from "../env.js";

interface GoogleGenAIEmbeddingsParams extends EmbeddingsParams {
  model?: string;
  outputDimensionality?: number;
}

class GoogleGenAIEmbeddings extends Embeddings {
  private client: GoogleGenAI;
  private model: string;
  private outputDimensionality: number;

  constructor(params: GoogleGenAIEmbeddingsParams = {}) {
    super(params);
    this.client = new GoogleGenAI({ apiKey: env.GOOGLE_API_KEY });
    this.model = params.model ?? "gemini-embedding-001";
    this.outputDimensionality = params.outputDimensionality ?? 768;
  }

  async embedQuery(text: string): Promise<number[]> {
    const response = await this.client.models.embedContent({
      model: this.model,
      contents: text,
      config: { outputDimensionality: this.outputDimensionality },
    });
    return response.embeddings?.[0]?.values ?? [];
  }

  async embedDocuments(documents: string[]): Promise<number[][]> {
    return Promise.all(documents.map((doc) => this.embedQuery(doc)));
  }
}

export const embeddings = new GoogleGenAIEmbeddings({
  model: "gemini-embedding-001",
  outputDimensionality: 768,
});
