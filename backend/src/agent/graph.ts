import { StateGraph, END, START } from "@langchain/langgraph";
import { HumanMessage, BaseMessage } from "@langchain/core/messages";
import { AgentState, AgentStateType } from "./state.js";
import { routerNode, routeByIntent } from "./nodes/router.node.js";
import { toolAgentNode } from "./nodes/toolAgent.node.js";

/**
 * MedAssist Agent Graph
 *
 * Hybrid architecture:
 * 1. Router classifies intent (deterministic routing for medical safety)
 * 2. Tool-calling agent executes with intent-appropriate tools
 *    (flexible — LLM decides which tools to use and how many times)
 *
 * Flow:
 *   START → router → (conditional by intent) → toolAgent → END
 *
 * The toolAgent node receives the intent and binds the relevant tools.
 * For rag_query: search_medicines
 * For interaction_check: search_medicines + check_interactions
 * For card_generation: search_medicines + create_dosage_card + create_patient_card
 * For general: all tools available (LLM can use them if the conversation needs it)
 */
const workflow = new StateGraph(AgentState)
  .addNode("router", routerNode)
  .addNode("toolAgent", toolAgentNode)

  // Start -> Router (classify intent)
  .addEdge(START, "router")

  // Router -> toolAgent for all intents
  // The toolAgent node reads state.intent and picks the right tools
  .addConditionalEdges("router", routeByIntent, {
    rag_query: "toolAgent",
    interaction_check: "toolAgent",
    card_generation: "toolAgent",
    patient_management: "toolAgent",
    general: "toolAgent",
  })

  // toolAgent -> END
  .addEdge("toolAgent", END);

// Compile the graph
export const graph = workflow.compile();

// Helper function to run the agent
export async function runAgent(
  messages: BaseMessage[],
  patientId?: string
): Promise<AgentStateType> {
  const result = await graph.invoke({
    messages,
    ...(patientId ? { patientId } : {}),
  });

  return result as AgentStateType;
}

// Convenience function to run with a simple string input
export async function runAgentWithText(
  text: string,
  patientId?: string
): Promise<AgentStateType> {
  return runAgent([new HumanMessage(text)], patientId);
}
