import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { getRetriever } from "../../lib/vectorstore.js";

export const searchMedicinesTool = tool(
  async ({ query }) => {
    const retriever = await getRetriever();
    const docs = await retriever.invoke(query);

    const results = docs.map((doc, i) => ({
      index: i + 1,
      content: doc.pageContent,
      source: (doc.metadata?.pdfName as string) || (doc.metadata?.source as string) || "unknown",
    }));

    return JSON.stringify(results, null, 2);
  },
  {
    name: "search_medicines",
    description:
      "Search the medical knowledge base for information about medicines, drugs, dosages, side effects, or treatments. Returns relevant document chunks from uploaded medical PDFs.",
    schema: z.object({
      query: z
        .string()
        .describe(
          "The search query about medicines or medical topics"
        ),
    }),
  }
);
