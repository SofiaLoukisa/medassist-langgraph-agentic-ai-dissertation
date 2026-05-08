import { z } from "zod";
import { llm } from "../../lib/llm.js";
import { AgentStateType } from "../state.js";
import { ROUTER_PROMPT } from "../prompts.js";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

const intentSchema = z.object({
  intent: z.enum([
    "rag_query",
    "interaction_check",
    "card_generation",
    "patient_management",
    "general",
  ]),
});

export async function routerNode(
  state: AgentStateType
): Promise<Partial<AgentStateType>> {
  const messages = state.messages;
  const lastMessage = messages[messages.length - 1];

  const lastContent =
    typeof lastMessage.content === "string"
      ? lastMessage.content
      : JSON.stringify(lastMessage.content);

  const structuredLlm = llm.withStructuredOutput(intentSchema);

  console.log(`[Router] Classifying intent for: "${lastContent.slice(0, 100)}${lastContent.length > 100 ? "..." : ""}"`);

  const result = await structuredLlm.invoke([
    new SystemMessage(ROUTER_PROMPT),
    new HumanMessage(lastContent),
  ]);

  console.log(`[Router] Classified intent: ${result.intent}`);

  return { intent: result.intent };
}

export function routeByIntent(
  state: AgentStateType
): string {
  return state.intent;
}
