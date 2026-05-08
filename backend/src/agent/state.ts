import { Annotation, MessagesAnnotation } from "@langchain/langgraph";

export const AgentState = Annotation.Root({
  ...MessagesAnnotation.spec,
  intent: Annotation<string>({
    reducer: (_, b) => b,
    default: () => "general",
  }),
  retrievedDocs: Annotation<
    Array<{ content: string; source: string; score: number }>
  >({
    reducer: (_, b) => b,
    default: () => [],
  }),
  patientId: Annotation<string | null>({
    reducer: (_, b) => b,
    default: () => null,
  }),
  interactionResults: Annotation<
    Array<{
      drug1: string;
      drug2: string;
      severity: string;
      description: string;
    }>
  >({
    reducer: (_, b) => b,
    default: () => [],
  }),
  generatedCard: Annotation<Record<string, unknown> | null>({
    reducer: (_, b) => b,
    default: () => null,
  }),
});

export type AgentStateType = typeof AgentState.State;
