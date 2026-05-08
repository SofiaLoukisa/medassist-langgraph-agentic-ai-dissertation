import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { env } from "../env.js";

const MODEL = "gemini-3-flash-preview";
console.log(`[LLM] Using model: ${MODEL}`);

export const llm = new ChatGoogleGenerativeAI({
  model: MODEL,
  apiKey: env.GOOGLE_API_KEY,
});

export const streamingLlm = new ChatGoogleGenerativeAI({
  model: MODEL,
  apiKey: env.GOOGLE_API_KEY,
  streaming: true,
});
