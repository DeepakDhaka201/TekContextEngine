/**
 * @fileoverview Type definitions for the LLM Agent
 * @module agents/llm/types
 * @requires ../base/types
 * 
 * This file defines comprehensive types for the LLM Agent implementation,
 * supporting direct interaction with language models through the modular
 * architecture. The LLM Agent provides automatic model selection, memory
 * management, tool usage, and streaming capabilities.
 * 
 * Key concepts:
 * - Extension of base agent types with LLM-specific functionality
 * - Model routing and selection strategies
 * - Prompting strategies and response formatting
 * - Memory management and conversation handling
 * - Tool integration with automatic execution
 * - Streaming response support with real-time updates
 * 
 * @example
 * ```typescript
 * import { LLMAgentConfig, LLMAgentInput } from './types';
 * 
 * const config: LLMAgentConfig = {
 *   name: 'Assistant',
 *   model: {
 *     primary: 'gpt-4',
 *     routing: 'balanced'
 *   },
 *   prompting: {
 *     systemPrompt: 'You are a helpful AI assistant.',
 *     format: 'text'
 *   },
 *   memory: {
 *     enabled: true,
 *     maxMessages: 20
 *   },
 *   tools: {
 *     autoExecute: true
 *   }
 * };
 * ```
 * 
 * @see ../base/types.ts for base agent interfaces
 * @see ../../modules/litellm/types.ts for LLM integration types
 * @since 1.0.0
 */

import { 
  IAgent,
  AgentConfig, 
  AgentInput, 
  AgentOutput,
  AgentStreamOutput,
  AgentCapabilities,
  ExecutionContext,
  ToolCall,
  ToolResult,
  ConversationTurn
} from '../base/types';

/**
 * Type alias for conversation messages.
 * 
 * @public
 */
export type Message = ConversationTurn;

/**
 * Agent type identifier for LLM agents.
 * 
 * @public
 */
export type LLMAgentType = 'llm';

/**
 * Configuration interface for LLM Agent.
 * 
 * Extends the base agent configuration with LLM-specific settings
 * including model selection, prompting strategies, memory management,
 * tool configuration, and behavioral parameters.
 * 
 * @public
 */
export interface LLMAgentConfig extends AgentConfig {
  /** Agent type identifier */
  type?: LLMAgentType;
  
  /** Agent description */
  description?: string;
  
  /** Agent version */
  version?: string;
  
  /** Module dependencies */
  modules?: string[];
  
  /** Model configuration and selection */
  model?: {
    /** Primary model to use for completions */
    primary?: string;
    
    /** Fallback models if primary fails */
    fallback?: string[];
    
    /** Model selection strategy */
    routing?: ModelRouting;
    
    /** Model-specific parameters */
    parameters?: ModelParameters;
  };
  
  /** Prompting configuration */
  prompting?: {
    /** System prompt for the conversation */
    systemPrompt?: string;
    
    /** Template for formatting user prompts */
    promptTemplate?: string;
    
    /** Few-shot examples for in-context learning */
    examples?: Example[];
    
    /** Expected response format */
    format?: ResponseFormat;
    
    /** Instructions for response structure */
    instructions?: string;
  };
  
  /** Memory management settings */
  memory?: {
    /** Whether to enable conversation memory */
    enabled?: boolean;
    
    /** Maximum number of messages to retain */
    maxMessages?: number;
    
    /** Trigger consolidation after N messages */
    summarizeAfter?: number;
    
    /** Include system prompt in memory calculations */
    includeSystemPrompt?: boolean;
    
    /** Memory persistence strategy */
    persistence?: MemoryPersistence;
  };
  
  /** Tool execution configuration */
  tools?: {
    /** Automatically execute tool calls */
    autoExecute?: boolean;
    
    /** Tools requiring explicit user confirmation */
    requireConfirmation?: string[];
    
    /** Maximum tool execution iterations */
    maxIterations?: number;
    
    /** Tool execution timeout in milliseconds */
    executionTimeout?: number;
    
    /** Whether to include tool results in response */
    includeResults?: boolean;
  };
  
  /** Model behavior parameters */
  behavior?: {
    /** Sampling temperature (0-2) */
    temperature?: number;
    
    /** Maximum tokens in response */
    maxTokens?: number;
    
    /** Nucleus sampling parameter (0-1) */
    topP?: number;
    
    /** Top-k sampling parameter */
    topK?: number;
    
    /** Stop sequences to end generation */
    stopSequences?: string[];
    
    /** Frequency penalty (-2 to 2) */
    frequencyPenalty?: number;
    
    /** Presence penalty (-2 to 2) */
    presencePenalty?: number;
    
    /** Response validation function */
    responseValidation?: ResponseValidator;
    
    /** Maximum retries for failed completions */
    maxRetries?: number;
  };
  
  /** Streaming configuration */
  streaming?: {
    /** Enable streaming responses */
    enabled?: boolean;
    
    /** Buffer size for streaming chunks */
    bufferSize?: number;
    
    /** Streaming timeout in milliseconds */
    timeout?: number;
  };
  
  /** Safety and moderation settings */
  safety?: {
    /** Enable content moderation */
    moderation?: boolean;
    
    /** Content filtering level */
    filterLevel?: ContentFilterLevel;
    
    /** Custom safety checks */
    customChecks?: SafetyCheck[];
  };
}

/**
 * Input interface for LLM Agent execution.
 * 
 * Extends base agent input with LLM-specific options for
 * system prompt overrides, memory control, tool selection,
 * and execution parameters.
 * 
 * @public
 */
export interface LLMAgentInput extends AgentInput {
  /** Primary prompt text for completion */
  prompt?: string;
  
  /** Conversation messages for multi-turn interactions */
  messages?: Message[];
  
  /** Override system prompt for this execution */
  systemPromptOverride?: string;
  
  /** Whether to include conversation memory */
  includeMemory?: boolean;
  
  /** Clear conversation memory before execution */
  clearMemory?: boolean;
  
  /** Tools to make available (names or true for all) */
  tools?: string[] | boolean;
  
  /** Model-specific parameters override */
  modelOverride?: {
    /** Specific model to use */
    model?: string;
    
    /** Temperature override */
    temperature?: number;
    
    /** Max tokens override */
    maxTokens?: number;
    
    /** Other parameters */
    [key: string]: any;
  };
  
  /** Response format override */
  formatOverride?: ResponseFormat;
  
  /** Whether to stream the response */
  stream?: boolean;
  
  /** Streaming configuration */
  streaming?: boolean;
  
  /** Context preservation settings */
  context?: {
    /** Preserve context across executions */
    preserve?: boolean;
    
    /** Context expiration time */
    ttl?: number;
    
    /** Additional context data */
    data?: Record<string, any>;
  };
}

/**
 * Output interface for LLM Agent execution.
 * 
 * Extends base agent output with LLM-specific information
 * including model used, token usage, tool execution results,
 * and memory management status.
 * 
 * @public
 */
export interface LLMAgentOutput extends AgentOutput {
  /** Generated text content */
  content?: string;
  
  /** Generated message for conversations */
  message?: string;
  
  /** Model actually used for completion */
  model: string;
  
  /** Chain-of-thought reasoning if available */
  reasoning?: string;
  
  /** Tool calls that were made during execution */
  toolCalls?: ToolCall[];
  
  /** Results from tool execution */
  toolResults?: ToolResult[];
  
  /** Whether conversation memory was updated */
  memoryUpdated?: boolean;
  
  /** Token usage statistics */
  usage?: TokenUsage;
  
  /** Response quality metrics */
  quality?: QualityMetrics;
  
  /** Safety and moderation results */
  safety?: SafetyResult;
  
  /** Streaming metadata if applicable */
  streaming?: StreamingMetadata;
}

/**
 * Streaming output interface for LLM Agent.
 * 
 * Provides real-time streaming of LLM responses with
 * incremental content delivery and completion status.
 * 
 * @public
 */
export interface LLMAgentStreamOutput extends AgentStreamOutput {
  /** Accumulated content so far */
  accumulated?: string;
  
  /** Tool calls being streamed */
  toolCalls?: Partial<ToolCall>[];
  
  /** Tool execution results */
  toolResults?: ToolResult[];
  
  /** Current reasoning step */
  reasoning?: string;
  
  /** Quality metrics for current response */
  quality?: Partial<QualityMetrics>;
  
  /** Whether this is the final chunk in the stream */
  finished?: boolean;
  
  /** Model being used for completion */
  model?: string;
  
  /** Whether conversation memory was updated */
  memoryUpdated?: boolean;
}

/**
 * Model routing strategies for intelligent model selection.
 * 
 * @public
 */
export type ModelRouting = 
  | 'cost'        // Optimize for lowest cost
  | 'quality'     // Optimize for highest quality
  | 'speed'       // Optimize for fastest response
  | 'balanced'    // Balance cost, quality, and speed
  | 'custom';     // Use custom routing logic

/**
 * Model-specific parameters for fine-tuning behavior.
 * 
 * @public
 */
export interface ModelParameters {
  /** Model-specific configuration */
  [modelName: string]: {
    /** Temperature for this model */
    temperature?: number;
    
    /** Max tokens for this model */
    maxTokens?: number;
    
    /** Model-specific parameters */
    parameters?: Record<string, any>;
    
    /** Capability requirements */
    capabilities?: string[];
  };
}

/**
 * Few-shot learning examples.
 * 
 * @public
 */
export interface Example {
  /** Example input/question */
  input: string;
  
  /** Expected output/answer */
  output: string;
  
  /** Optional explanation of the reasoning */
  explanation?: string;
  
  /** Example metadata */
  metadata?: {
    /** Example category */
    category?: string;
    
    /** Difficulty level */
    difficulty?: 'easy' | 'medium' | 'hard';
    
    /** Example priority */
    priority?: number;
  };
}

/**
 * Response format specifications.
 * 
 * @public
 */
export type ResponseFormat = 
  | 'text'        // Plain text response
  | 'json'        // Structured JSON object
  | 'markdown'    // Markdown formatted text
  | 'code'        // Code with syntax highlighting
  | 'structured'  // Structured data format
  | 'xml'         // XML formatted response
  | 'yaml';       // YAML formatted response

/**
 * Memory persistence strategies.
 * 
 * @public
 */
export type MemoryPersistence = 
  | 'session'     // Persist only during session
  | 'temporary'   // Temporary persistence with TTL
  | 'permanent'   // Permanent persistence
  | 'disabled';   // No persistence

/**
 * Response validation function type.
 * 
 * @public
 */
export type ResponseValidator = (
  response: string,
  context: ValidationContext
) => boolean | Promise<boolean>;

/**
 * Validation context for response validation.
 * 
 * @public
 */
export interface ValidationContext {
  /** Original input prompt */
  prompt: string;
  
  /** Model used for generation */
  model: string;
  
  /** Generation parameters */
  parameters: Record<string, any>;
  
  /** Session context */
  sessionId: string;
  
  /** Execution metadata */
  metadata: Record<string, any>;
}

/**
 * Content filtering levels for safety.
 * 
 * @public
 */
export type ContentFilterLevel = 
  | 'strict'      // Strict content filtering
  | 'moderate'    // Moderate filtering
  | 'permissive'  // Minimal filtering
  | 'disabled';   // No filtering

/**
 * Custom safety check function.
 * 
 * @public
 */
export interface SafetyCheck {
  /** Unique identifier for the check */
  id: string;
  
  /** Human-readable name */
  name: string;
  
  /** Check function */
  check: (content: string, context: SafetyContext) => Promise<SafetyCheckResult>;
  
  /** Check priority */
  priority?: number;
  
  /** Whether check is blocking */
  blocking?: boolean;
}

/**
 * Safety check context.
 * 
 * @public
 */
export interface SafetyContext {
  /** Type of content being checked */
  contentType: 'input' | 'output';
  
  /** Session identifier */
  sessionId: string;
  
  /** User identifier */
  userId?: string;
  
  /** Additional context */
  metadata: Record<string, any>;
}

/**
 * Result of a safety check.
 * 
 * @public
 */
export interface SafetyCheckResult {
  /** Whether content passes the check */
  passed: boolean;
  
  /** Confidence score (0-1) */
  confidence?: number;
  
  /** Reason for failure */
  reason?: string;
  
  /** Suggested action */
  action?: 'block' | 'warn' | 'flag';
  
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Tool execution result.
 * 
 * @public
 */
// ToolResult is now imported from base types for consistency

/**
 * Token usage statistics.
 * 
 * @public
 */
export interface TokenUsage {
  /** Tokens used in prompt */
  promptTokens: number;
  
  /** Tokens generated in completion */
  completionTokens: number;
  
  /** Total tokens used */
  totalTokens: number;
  
  /** Estimated cost in USD */
  cost?: number;
  
  /** Cost breakdown by component */
  costBreakdown?: {
    /** Prompt cost */
    prompt: number;
    
    /** Completion cost */
    completion: number;
    
    /** Tool usage cost */
    tools?: number;
  };
  
  /** Model-specific usage data */
  modelUsage?: Record<string, TokenUsage>;
}

/**
 * Response quality metrics.
 * 
 * @public
 */
export interface QualityMetrics {
  /** Response relevance score (0-1) */
  relevance?: number;
  
  /** Response coherence score (0-1) */
  coherence?: number;
  
  /** Response completeness score (0-1) */
  completeness?: number;
  
  /** Response accuracy score (0-1) */
  accuracy?: number;
  
  /** Overall quality score (0-1) */
  overall?: number;
  
  /** Quality assessment metadata */
  metadata?: {
    /** Assessment method */
    method?: string;
    
    /** Assessment timestamp */
    timestamp?: Date;
    
    /** Additional metrics */
    [key: string]: any;
  };
}

/**
 * Safety and moderation result.
 * 
 * @public
 */
export interface SafetyResult {
  /** Whether content is safe */
  safe: boolean;
  
  /** Safety confidence score (0-1) */
  confidence: number;
  
  /** Detected categories */
  categories?: string[];
  
  /** Safety check results */
  checks: SafetyCheckResult[];
  
  /** Flagged content segments */
  flagged?: {
    /** Start position */
    start: number;
    
    /** End position */
    end: number;
    
    /** Flagged text */
    text: string;
    
    /** Reason for flagging */
    reason: string;
  }[];
}

/**
 * Streaming metadata.
 * 
 * @public
 */
export interface StreamingMetadata {
  /** Total streaming duration */
  duration: number;
  
  /** Number of chunks streamed */
  chunks: number;
  
  /** Average chunk size */
  avgChunkSize: number;
  
  /** Streaming latency metrics */
  latency: {
    /** Time to first byte */
    firstByte: number;
    
    /** Average chunk latency */
    avgChunk: number;
    
    /** Maximum chunk latency */
    maxChunk: number;
  };
  
  /** Streaming errors */
  errors?: string[];
}

/**
 * LLM Agent capabilities specification.
 * 
 * @public
 */
export interface LLMAgentCapabilities extends AgentCapabilities {
  /** Maximum context window size */
  maxContextLength: number;
  
  /** Supported model families */
  supportedModels: string[];
  
  /** Whether agent supports function calling */
  supportsTools: boolean;
  
  /** Whether agent supports streaming */
  supportsStreaming: boolean;
  
  /** Whether agent supports vision inputs */
  supportsVision?: boolean;
  
  /** Whether agent supports audio inputs */
  supportsAudio?: boolean;
  
  /** Supported response formats */
  supportedFormats: ResponseFormat[];
  
  /** Maximum tool execution iterations */
  maxToolIterations: number;
}

/**
 * LLM Agent interface extending the base agent.
 * 
 * @public
 */
export interface ILLMAgent extends IAgent {
  /** Agent type */
  readonly type: LLMAgentType;
  
  /** LLM-specific detailed capabilities */
  readonly llmCapabilities: LLMAgentCapabilities;
  
  /**
   * Execute LLM completion with full configuration.
   * 
   * @param input - LLM agent input
   * @returns Promise resolving to LLM agent output
   */
  executeCompletion(input: LLMAgentInput): Promise<LLMAgentOutput>;
  
  /**
   * Stream LLM completion with real-time updates.
   * 
   * @param input - LLM agent input
   * @returns Async iterator for streaming output
   */
  stream(input: LLMAgentInput): AsyncIterableIterator<LLMAgentStreamOutput>;
  
  /**
   * Clear conversation memory for a session.
   * 
   * @param sessionId - Session identifier
   */
  clearMemory(sessionId: string): Promise<void>;
  
  /**
   * Get conversation memory for a session.
   * 
   * @param sessionId - Session identifier
   * @returns Conversation messages
   */
  getMemory(sessionId: string): Promise<Message[]>;
  
  /**
   * Estimate token count for input.
   * 
   * @param input - Input to estimate
   * @returns Estimated token count
   */
  estimateTokens(input: string | Message[]): Promise<number>;
}

/**
 * Internal response structure for LLM calls.
 * 
 * @private
 */
export interface LLMInternalResponse {
  /** Response message */
  message: Message;
  
  /** Tool calls if any */
  toolCalls?: ToolCall[];
  
  /** Token usage */
  usage?: TokenUsage;
  
  /** Model used */
  model: string;
  
  /** Response duration */
  duration: number;
  
  /** LiteLLM metadata */
  metadata?: Record<string, any>;
  
  /** Raw response data */
  raw?: any;
}

/**
 * LLM request structure for LiteLLM integration.
 * 
 * @private
 */
export interface LLMRequest {
  /** Model identifier */
  model: string;
  
  /** Conversation messages */
  messages: Message[];
  
  /** Available tools */
  tools?: any[];
  
  /** Tool choice strategy */
  tool_choice?: 'auto' | 'none' | string;
  
  /** Sampling temperature */
  temperature?: number;
  
  /** Maximum tokens */
  max_tokens?: number;
  
  /** Nucleus sampling */
  top_p?: number;
  
  /** Stop sequences */
  stop?: string[];
  
  /** Frequency penalty */
  frequency_penalty?: number;
  
  /** Presence penalty */
  presence_penalty?: number;
  
  /** User identifier */
  user?: string;
  
  /** Whether to stream response */
  stream?: boolean;
  
  /** Routing hints for LiteLLM */
  routing_hints?: {
    /** Routing priority */
    priority?: ModelRouting;
    
    /** Required capabilities */
    required_capabilities?: string[];
  };
}

/**
 * Conversation memory interface.
 * 
 * @private
 */
export interface ConversationMemory {
  /** Add message to memory */
  add(message: Message): void;
  
  /** Get all messages */
  getMessages(): Message[];
  
  /** Clear all messages */
  clear(): void;
  
  /** Estimate token count */
  getTokenEstimate(): number;
  
  /** Get memory size */
  size(): number;
  
  /** Check if memory is empty */
  isEmpty(): boolean;
}

/**
 * Model selection context.
 * 
 * @private
 */
export interface ModelSelectionContext {
  /** Input messages */
  messages: Message[];
  
  /** Number of messages */
  messageCount?: number;
  
  /** Required capabilities */
  capabilities?: string[];
  
  /** Routing strategy */
  routing?: ModelRouting;
  
  /** Preferred routing strategy */
  preferredRouting?: ModelRouting;
  
  /** Estimated token count */
  estimatedTokens?: number;
  
  /** User preferences */
  preferences?: Record<string, any>;
  
  /** Session metadata */
  sessionMetadata?: Record<string, any>;
}