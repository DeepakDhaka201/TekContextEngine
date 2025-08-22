import { Annotation } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";

/**
 * Agent State Definition
 * This state is passed between nodes in the graph
 */
export const AgentStateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
    default: () => []
  }),
  memory: Annotation<string[]>({
    reducer: (x, y) => x.concat(y),
    default: () => []
  }),
  currentAgent: Annotation<string>({
    value: (x, y) => y || x,
    default: () => ""
  }),
  sessionId: Annotation<string>({
    value: (x, y) => y || x,
    default: () => ""
  }),
  metadata: Annotation<Record<string, any>>({
    value: (x, y) => ({ ...x, ...y }),
    default: () => ({})
  })
});

export type AgentState = typeof AgentStateAnnotation.State;

/**
 * Agent Configuration from JSON
 */
export interface AgentConfig {
  name: string;
  description: string;
  systemPrompt: string;  // The system prompt that defines the agent's behavior
  tools: string[];
  openAIApiKey?: string;  // OpenAI API key for this agent
  // Optional LLM configuration
  llmConfig?: {
    model?: string;  // e.g., "gpt-4", "gpt-3.5-turbo"
    temperature?: number;
    maxTokens?: number;
  };
}

/**
 * Graph Node Configuration
 */
export interface GraphNode {
  name: string;
  agent?: string;
  tool?: string;
}

/**
 * Graph Edge Configuration
 */
export interface GraphEdge {
  from: string;
  to: string;
  condition?: string;
}

/**
 * Graph Configuration from JSON
 */
export interface GraphConfig {
  name: string;
  nodes: GraphNode[];
  entryPoint: string;
  edges: GraphEdge[];
  conditionalEdges?: {
    from: string;
    conditions: {
      condition: string;
      to: string;
    }[];
  }[];
  finishPoint?: string;
}

/**
 * API Request/Response Types
 */
export interface CreateAgentRequest {
  agent: AgentConfig;
}

export interface CreateGraphRequest {
  graph: GraphConfig;
}

export interface InvokeGraphRequest {
  graphId: string;
  input: {
    messages?: BaseMessage[];
    [key: string]: any;
  };
  sessionId?: string;
}

export interface InvokeGraphResponse {
  result: any;
  sessionId: string;
  messages: BaseMessage[];
  memory: string[];
}

// Clean API Response Types
export interface CleanMessage {
  type: 'human' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export interface CleanInvokeResponse {
  sessionId: string;
  response: string;
  conversation: CleanMessage[];
  metadata: {
    agent: string;
    timestamp: string;
    messageCount: number;
  };
}