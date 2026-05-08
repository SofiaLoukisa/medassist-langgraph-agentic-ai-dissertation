import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { getRetriever } from "../../lib/vectorstore.js";

export const checkInteractionsTool = tool(
  async ({ drug1, drug2 }) => {
    const retriever = await getRetriever();

    // Search for interaction info between the two drugs
    const interactionQuery = `drug interaction between ${drug1} and ${drug2}`;
    const interactionDocs = await retriever.invoke(interactionQuery);

    // Also search for each drug individually for context
    const drug1Docs = await retriever.invoke(`${drug1} warnings contraindications`);
    const drug2Docs = await retriever.invoke(`${drug2} warnings contraindications`);

    const results = {
      interactionResults: interactionDocs.map((doc) => ({
        content: doc.pageContent,
        source: (doc.metadata?.pdfName as string) || (doc.metadata?.source as string) || "unknown",
      })),
      drug1Info: drug1Docs.slice(0, 2).map((doc) => ({
        content: doc.pageContent,
        source: (doc.metadata?.pdfName as string) || (doc.metadata?.source as string) || "unknown",
      })),
      drug2Info: drug2Docs.slice(0, 2).map((doc) => ({
        content: doc.pageContent,
        source: (doc.metadata?.pdfName as string) || (doc.metadata?.source as string) || "unknown",
      })),
    };

    return JSON.stringify(results, null, 2);
  },
  {
    name: "check_interactions",
    description:
      "Check for potential drug interactions between two medicines. Searches the medical knowledge base for interaction data, warnings, and contraindications.",
    schema: z.object({
      drug1: z.string().describe("The first drug/medicine name"),
      drug2: z.string().describe("The second drug/medicine name"),
    }),
  }
);
