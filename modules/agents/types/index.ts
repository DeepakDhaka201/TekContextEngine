import { Annotation } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";
import { END } from "@langchain/langgraph";

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
  apiKeyRef?: string;     // Reference to environment variable containing API key
  // Deprecated - use apiKeyRef instead
  openAIApiKey?: string;  // Direct API key (deprecated, for backwards compatibility)
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
 * Routing Expression Types
 */
export interface RoutingExpression {
  type: 'javascript' | 'simple'; // Expression type
  expression: string; // The actual expression/condition
  description?: string; // Human readable description
}

/**
 * Conditional Route Configuration
 */
export interface ConditionalRoute {
  condition: RoutingExpression;
  to: string; // Target node
}

/**
 * Conditional Edge Configuration
 */
export interface ConditionalEdgeConfig {
  from: string;
  routes: ConditionalRoute[];
  defaultTo?: string; // Default route if no conditions match
  pathMap?: Record<string, string>; // Maps function outputs to node names
}

/**
 * Graph Configuration from JSON
 */
export interface GraphConfig {
  name: string;
  description?: string;
  nodes: GraphNode[];
  entryPoint: string;
  edges: GraphEdge[];
  conditionalEdges?: ConditionalEdgeConfig[];
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

// Graph Node Types for proper TypeScript typing
export type NodeName = string;
export type EdgeTarget = NodeName | typeof END;
export type EdgeSource = NodeName | "__start__";

// Routing function return type
export type RoutingResult = NodeName | typeof END | string;