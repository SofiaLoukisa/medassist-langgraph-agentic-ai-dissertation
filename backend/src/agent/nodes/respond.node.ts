import { AIMessage, SystemMessage, HumanMessage } from "@langchain/core/messages";
import { streamingLlm } from "../../lib/llm.js";
import { AgentStateType } from "../state.js";
import { GENERAL_PROMPT } from "../prompts.js";

export async function generalRespondNode(
  state: AgentStateType
): Promise<Partial<AgentStateType>> {
  const messages = state.messages;
  const lastMessage = messages[messages.length - 1];

  const userContent =
    typeof lastMessage.content === "string"
      ? lastMessage.content
      : JSON.stringify(lastMessage.content);

  const response = await streamingLlm.invoke([
    new SystemMessage(GENERAL_PROMPT),
    new HumanMessage(userContent),
  ]);

  const responseContent =
    typeof response.content === "string"
      ? response.content
      : JSON.stringify(response.content);

  return {
    messages: [new AIMessage(responseContent)],
  };
}
