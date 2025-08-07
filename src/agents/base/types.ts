/**
 * @fileoverview Type definitions for the Base Agent system
 * @module agents/base/types
 * @requires None - Pure type definitions
 * 
 * This file defines all interfaces, types, and enums used throughout the Base Agent
 * system. These types serve as the foundation for all agent implementations in
 * AgentHub and ensure type safety and consistency.
 * 
 * Key concepts:
 * - Agent interface defining core agent behavior
 * - Execution context for agent operations
 * - Tool integration and management
 * - State management and persistence
 * - Event handling and notifications
 * 
 * @example
 * ```typescript
 * import { IAgent, AgentConfig, ExecutionContext } from './types';
 * 
 * class MyAgent implements IAgent {
 *   async execute(context: ExecutionContext): Promise<AgentResult> {
 *     // Implementation
 *   }
 * }
 * ```
 * 
 * @since 1.0.0
 */

/**
 * Core interface that all agents must implement.
 * 
 * This interface defines the fundamental contract that every agent in AgentHub
 * must follow. It provides a consistent API for agent execution, lifecycle
 * management, and integration with the broader system.
 * 
 * Key responsibilities:
 * - Execute tasks based on input and context
 * - Manage internal state and configuration
 * - Integrate with tools and external services
 * - Provide health monitoring and status reporting
 * - Handle graceful initialization and shutdown
 * 
 * @example
 * ```typescript
 * class CustomAgent implements IAgent {
 *   readonly id = 'custom-agent';
 *   readonly name = 'Custom Agent';
 *   readonly version = '1.0.0';
 *   readonly capabilities = ['text-processing', 'api-calls'];
 *   
 *   async initialize(config: AgentConfig): Promise<void> {
 *     // Setup logic
 *   }
 *   
 *   async execute(context: ExecutionContext): Promise<AgentResult> {
 *     // Main execution logic
 *     return {
 *       success: true,
 *       output: 'Task completed',
 *       metadata: { duration: 1500 }
 *     };
 *   }
 * }
 * ```
 * 
 * @public
 */
export interface IAgent {
  /** Unique identifier for this agent instance */
  readonly id: string;
  
  /** Human-readable name for the agent */
  readonly name: string;
  
  /** Semantic version of the agent implementation */
  readonly version: string;
  
  /** List of capabilities this agent provides */
  readonly capabilities: string[];
  
  /** Optional description of what this agent does */
  readonly description?: string;
  
  /** Dependencies on other modules or services */
  readonly dependencies?: string[];
  
  /**
   * Initializes the agent with the provided configuration.
   * 
   * This method is called during agent registration and should set up
   * all necessary resources, connections, and internal state.
   * 
   * @param config - Agent-specific configuration
   * @returns Promise that resolves when initialization is complete
   * @throws {AgentInitializationError} If initialization fails
   */
  initialize?(config: AgentConfig): Promise<void>;
  
  /**
   * Executes a task with the given context.
   * 
   * This is the primary method that defines what the agent does. It receives
   * an execution context containing the task, input data, available tools,
   * and environment information.
   * 
   * @param context - Complete execution context for the task
   * @returns Promise resolving to the execution result
   * @throws {AgentExecutionError} If execution fails
   */
  execute(context: ExecutionContext): Promise<AgentResult>;
  
  /**
   * Validates whether this agent can handle the given task.
   * 
   * Allows agents to declare whether they are capable of processing
   * a specific task before execution begins.
   * 
   * @param task - The task to validate
   * @returns Promise resolving to true if agent can handle the task
   */
  canHandle?(task: AgentTask): Promise<boolean>;
  
  /**
   * Provides health status information for monitoring.
   * 
   * @returns Promise resolving to current health status
   */
  health?(): Promise<AgentHealth>;
  
  /**
   * Gracefully shuts down the agent and cleans up resources.
   * 
   * @returns Promise that resolves when shutdown is complete
   */
  shutdown?(): Promise<void>;
  
  /**
   * Handles events from the agent system.
   * 
   * @param event - The event to handle
   * @returns Promise that resolves when event is processed
   */
  onEvent?(event: AgentEvent): Promise<void>;
}

/**
 * Configuration object for agent initialization.
 * 
 * Contains all the settings and parameters needed to configure
 * an agent instance. Different agent types may extend this
 * interface with their own specific configuration options.
 */
export interface AgentConfig {
  /** Agent instance identifier */
  id: string;
  
  /** Human-readable agent name */
  name?: string;
  
  /** Agent type identifier */
  type?: string;
  
  /** Agent-specific configuration parameters */
  config?: Record<string, any>;
  
  /** Environment-specific settings */
  environment?: 'development' | 'staging' | 'production';
  
  /** Logging configuration */
  logging?: {
    level: 'debug' | 'info' | 'warn' | 'error';
    enabled: boolean;
  };
  
  /** Timeout settings for various operations */
  timeouts?: {
    initialization?: number;
    execution?: number;
    shutdown?: number;
  };
  
  /** Resource limits */
  limits?: {
    maxConcurrentTasks?: number;
    maxMemoryUsage?: number;
    maxExecutionTime?: number;
  };
  
  /** Integration settings */
  integrations?: {
    /** Enable Langfuse tracing and observability */
    langfuse?: boolean | {
      enabled: boolean;
      traceExecutions?: boolean;
      traceStreaming?: boolean;
      traceTools?: boolean;
      traceMemory?: boolean;
      trackTokens?: boolean;
      trackCosts?: boolean;
      sessionTracking?: boolean;
      metadata?: Record<string, any>;
    };
    /** Enable system monitoring */
    monitoring?: boolean;
    /** Enable telemetry collection */
    telemetry?: boolean;
  };
}

/**
 * Complete execution context provided to agents.
 * 
 * Contains all the information an agent needs to execute a task,
 * including the task definition, input data, available tools,
 * session state, and system configuration.
 */
export interface ExecutionContext {
  /** Unique identifier for this execution */
  readonly executionId: string;
  
  /** The task to be executed */
  readonly task: AgentTask;
  
  /** Available tools for the agent to use */
  readonly tools: ToolRegistry;
  
  /** Current session state and memory */
  readonly session: SessionContext;
  
  /** System and environment information */
  readonly system: SystemContext;
  
  /** Execution metadata and tracking */
  readonly metadata: ExecutionMetadata;
  
  /**
   * Requests human input for interactive workflows.
   * 
   * @param prompt - The prompt to show to the human
   * @param options - Additional options for the request
   * @returns Promise resolving to human response
   */
  requestHumanInput(prompt: string, options?: HumanInputOptions): Promise<string>;
  
  /**
   * Streams output to connected clients.
   * 
   * @param chunk - Data chunk to stream
   * @param type - Type of the chunk
   */
  stream(chunk: string, type?: StreamChunkType): void;
  
  /**
   * Updates execution progress.
   * 
   * @param progress - Progress information
   */
  updateProgress(progress: ExecutionProgress): void;
  
  /**
   * Logs execution information.
   * 
   * @param level - Log level
   * @param message - Log message
   * @param data - Additional data to log
   */
  log(level: LogLevel, message: string, data?: any): void;
}

/**
 * Definition of a task to be executed by an agent.
 * 
 * Tasks represent units of work that agents can process. They contain
 * the input data, expected output format, and any constraints or
 * requirements for execution.
 */
export interface AgentTask {
  /** Unique identifier for this task */
  id: string;
  
  /** Type of task (e.g., 'text-generation', 'code-analysis', 'api-call') */
  type: string;
  
  /** Human-readable description of the task */
  description?: string;
  
  /** Input data for the task */
  input: TaskInput;
  
  /** Expected output format and constraints */
  output?: TaskOutput;
  
  /** Task-specific parameters and options */
  parameters?: Record<string, any>;
  
  /** Priority level for task scheduling */
  priority?: TaskPriority;
  
  /** Maximum execution time allowed */
  timeout?: number;
  
  /** Retry policy for failed executions */
  retry?: RetryPolicy;
  
  /** Tags for categorization and filtering */
  tags?: string[];
  
  /** Creation timestamp */
  createdAt: Date;
  
  /** Optional deadline for task completion */
  deadline?: Date;
}

/**
 * Input data for a task execution.
 */
export interface TaskInput {
  /** Primary input content */
  content: string;
  
  /** Input content type/format */
  type?: string;
  
  /** Additional context or background information */
  context?: string;
  
  /** Structured data parameters */
  data?: Record<string, any>;
  
  /** File attachments or references */
  files?: FileReference[];
  
  /** Previous conversation or interaction history */
  history?: ConversationTurn[];
}

/**
 * Output specification for a task.
 */
export interface TaskOutput {
  /** Expected output format */
  format: 'text' | 'json' | 'markdown' | 'html' | 'code' | 'structured';
  
  /** Schema for structured outputs */
  schema?: Record<string, any>;
  
  /** Maximum output length */
  maxLength?: number;
  
  /** Required output fields */
  required?: string[];
  
  /** Output validation rules */
  validation?: ValidationRule[];
}

/**
 * Result of an agent execution.
 * 
 * Contains the output generated by the agent, metadata about the execution,
 * and any additional information needed for further processing.
 */
export interface AgentResult {
  /** Whether the execution was successful */
  success: boolean;
  
  /** Generated output from the agent */
  output?: string | Record<string, any>;
  
  /** Error information if execution failed */
  error?: AgentError;
  
  /** Execution metadata and metrics */
  metadata: ExecutionResultMetadata;
  
  /** Tools that were used during execution */
  toolsUsed?: ToolUsage[];
  
  /** Generated artifacts (files, code, etc.) */
  artifacts?: Artifact[];
  
  /** Follow-up tasks or recommendations */
  followUp?: FollowUpAction[];
  
  /** Confidence score for the result (0-1) */
  confidence?: number;
}

/**
 * Health status information for an agent.
 */
export interface AgentHealth {
  /** Overall health status */
  status: 'healthy' | 'degraded' | 'unhealthy';
  
  /** Human-readable status message */
  message?: string;
  
  /** Last health check timestamp */
  lastCheck: Date;
  
  /** Detailed health metrics */
  metrics?: {
    uptime?: number;
    executionCount?: number;
    successRate?: number;
    averageExecutionTime?: number;
    errorRate?: number;
    memoryUsage?: number;
  };
  
  /** Current resource utilization */
  resources?: {
    cpu?: number;
    memory?: number;
    diskSpace?: number;
    networkConnections?: number;
  };
  
  /** Dependency health status */
  dependencies?: Record<string, 'healthy' | 'unhealthy'>;
  
  /** Any health issues or warnings */
  issues?: HealthIssue[];
}

/**
 * System event that agents can respond to.
 */
export interface AgentEvent {
  /** Event type identifier */
  type: string;
  
  /** Event timestamp */
  timestamp: Date;
  
  /** Event source information */
  source: {
    module: string;
    component?: string;
    id?: string;
  };
  
  /** Event payload data */
  data?: Record<string, any>;
  
  /** Event metadata */
  metadata?: {
    traceId?: string;
    sessionId?: string;
    userId?: string;
  };
}

/**
 * Session context for agent execution.
 * 
 * Provides access to session-specific state, memory, and configuration
 * that persists across multiple agent executions.
 */
export interface SessionContext {
  /** Session identifier */
  id: string;
  
  /** User associated with this session */
  userId?: string;
  
  /** Session metadata */
  metadata: SessionMetadata;
  
  /** Conversation history */
  history: ConversationTurn[];
  
  /** Session-specific memory and context */
  memory: SessionMemory;
  
  /** Session configuration and preferences */
  config: SessionConfig;
  
  /**
   * Gets a value from session state.
   * 
   * @param key - The state key
   * @returns The stored value or undefined
   */
  get(key: string): Promise<any>;
  
  /**
   * Sets a value in session state.
   * 
   * @param key - The state key
   * @param value - The value to store
   */
  set(key: string, value: any): Promise<void>;
  
  /**
   * Removes a value from session state.
   * 
   * @param key - The state key to remove
   */
  delete(key: string): Promise<void>;
  
  /**
   * Adds a turn to the conversation history.
   * 
   * @param turn - The conversation turn to add
   */
  addTurn(turn: ConversationTurn): Promise<void>;
}

/**
 * System context providing environment and configuration information.
 */
export interface SystemContext {
  /** System environment */
  environment: 'development' | 'staging' | 'production';
  
  /** System version information */
  version: string;
  
  /** Available system resources */
  resources: SystemResources;
  
  /** System configuration */
  config: SystemConfig;
  
  /** Current system time */
  timestamp: Date;
  
  /** System capabilities and features */
  capabilities: string[];
}

/**
 * Tool registry interface for agent tool access.
 */
export interface ToolRegistry {
  /**
   * Gets a tool by name.
   * 
   * @param name - Tool name
   * @returns The tool instance or undefined
   */
  get(name: string): ITool | undefined;
  
  /**
   * Lists all available tools.
   * 
   * @returns Array of available tool names
   */
  list(): string[];
  
  /**
   * Checks if a tool is available.
   * 
   * @param name - Tool name to check
   * @returns True if tool is available
   */
  has(name: string): boolean;
  
  /**
   * Executes a tool with the given parameters.
   * 
   * @param name - Tool name
   * @param parameters - Tool parameters
   * @returns Promise resolving to tool result
   */
  execute(name: string, parameters: Record<string, any>): Promise<ToolResult>;
}

/**
 * Interface for individual tools.
 */
export interface ITool {
  /** Tool name */
  name: string;
  
  /** Tool description */
  description: string;
  
  /** Parameter schema */
  parameters: Record<string, any>;
  
  /**
   * Executes the tool with given parameters.
   * 
   * @param parameters - Execution parameters
   * @returns Promise resolving to tool result
   */
  execute(parameters: Record<string, any>): Promise<ToolResult>;
}

/**
 * Result of a tool execution.
 */
export interface ToolResult {
  /** Whether execution was successful */
  success: boolean;
  
  /** Tool name that was executed */
  tool?: string;
  
  /** Tool output */
  output?: any;
  
  /** Input provided to the tool */
  input?: any;
  
  /** Error information if failed */
  error?: string;
  
  /** Tool call ID */
  toolCallId?: string;
  
  /** Execution duration in milliseconds */
  duration?: number;
  
  /** Execution metadata */
  metadata?: Record<string, any>;
}

// Supporting types and enums

export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type StreamChunkType = 'text' | 'json' | 'error' | 'metadata';

export interface RetryPolicy {
  maxAttempts: number;
  backoffStrategy: 'linear' | 'exponential';
  initialDelay: number;
  maxDelay: number;
}

export interface FileReference {
  id: string;
  name: string;
  type: string;
  size: number;
  url?: string;
  content?: string | Buffer;
}

export interface ConversationTurn {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
  /** Tool calls made in this message */
  tool_calls?: ToolCall[];
}

export interface ValidationRule {
  field: string;
  type: 'required' | 'format' | 'length' | 'range';
  params?: any;
}

export interface AgentError {
  code: string;
  message: string;
  details?: Record<string, any>;
  stack?: string;
}

export interface ExecutionMetadata {
  startTime: Date;
  timeout: number;
  traceId: string;
  parentId?: string;
  tags: string[];
}

export interface ExecutionResultMetadata {
  duration: number;
  endTime: Date;
  tokensUsed?: number;
  cost?: number;
  model?: string;
  temperature?: number;
}

export interface ToolUsage {
  name: string;
  parameters: Record<string, any>;
  result: ToolResult;
  duration: number;
}

export interface Artifact {
  id: string;
  type: string;
  name: string;
  content: string | Buffer;
  metadata?: Record<string, any>;
}

export interface FollowUpAction {
  type: 'task' | 'question' | 'clarification';
  description: string;
  parameters?: Record<string, any>;
}

export interface HumanInputOptions {
  type?: 'text' | 'choice' | 'confirmation';
  choices?: string[];
  timeout?: number;
  required?: boolean;
}

export interface ExecutionProgress {
  percentage: number;
  stage: string;
  message?: string;
  details?: Record<string, any>;
}

export interface HealthIssue {
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  code?: string;
  details?: Record<string, any>;
}

export interface SessionMetadata {
  createdAt: Date;
  updatedAt: Date;
  userAgent?: string;
  ipAddress?: string;
  tags: string[];
}

export interface SessionMemory {
  shortTerm: Record<string, any>;
  longTerm: Record<string, any>;
  context: string[];
  entities: Record<string, any>;
}

export interface SessionConfig {
  language: string;
  timezone: string;
  preferences: Record<string, any>;
  limits: {
    maxHistoryLength: number;
    maxMemorySize: number;
  };
}

export interface SystemResources {
  availableMemory: number;
  totalMemory: number;
  cpuCount: number;
  diskSpace: number;
}

export interface SystemConfig {
  maxConcurrentAgents: number;
  defaultTimeout: number;
  loggingLevel: LogLevel;
  features: Record<string, boolean>;
}

/**
 * Base input interface for agent execution.
 * 
 * Provides a standardized input structure that all agents
 * can understand and process. Specific agent types can
 * extend this interface with their own input requirements.
 * 
 * @public
 */
export interface AgentInput {
  /** The input content or data for processing */
  input?: any;
  
  /** Session identifier for tracking */
  sessionId?: string;
  
  /** User identifier */
  userId?: string;
  
  /** Additional context information */
  context?: Record<string, any>;
  
  /** Input metadata */
  metadata?: Record<string, any>;
}

/**
 * Base output interface for agent execution results.
 * 
 * Provides a standardized output structure that all agents
 * return. Contains the execution result and associated metadata.
 * 
 * @public
 */
export interface AgentOutput {
  /** Whether the execution was successful */
  success: boolean;
  
  /** The output content or result */
  output?: any;
  
  /** Error information if execution failed */
  error?: string;
  
  /** Execution metadata */
  metadata?: Record<string, any>;
  
  /** Execution duration in milliseconds */
  duration?: number;
  
  /** Token usage information if applicable */
  usage?: TokenUsage;
}

/**
 * Token usage information for LLM operations.
 * 
 * @public
 */
export interface TokenUsage {
  /** Number of tokens in the prompt */
  prompt: number;
  
  /** Number of tokens in the completion */
  completion: number;
  
  /** Total number of tokens used */
  total: number;
  
  /** Cost information if available */
  cost?: {
    input: number;
    output: number;
    total: number;
    currency: string;
  };
}

/**
 * Base factory interface for creating agent instances.
 * 
 * Provides a consistent interface for factory classes that create
 * agent instances with proper configuration and validation.
 * 
 * @template TConfig - The configuration type for the agent
 * @template TAgent - The agent instance type
 * @public
 */
export interface AgentFactory<TConfig extends AgentConfig, TAgent extends IAgent> {
  /**
   * Creates an agent instance with the provided configuration.
   * 
   * @param config - Agent configuration object
   * @returns Promise resolving to the configured agent instance
   */
  create(config: TConfig): Promise<TAgent>;
  
  /**
   * Validates the provided configuration.
   * 
   * @param config - Configuration object to validate
   * @returns True if configuration is valid
   * @throws Error with validation details if invalid
   */
  validateConfig(config: TConfig): boolean;
  
  /**
   * Gets the default configuration for this agent type.
   * 
   * @returns Default configuration object
   */
  getDefaultConfig(): Partial<TConfig>;
}

/**
 * Message interface for conversations and communication.
 * 
 * @public
 */
export interface Message {
  /** Message identifier */
  id: string;
  
  /** Message role (user, assistant, system) */
  role: 'user' | 'assistant' | 'system';
  
  /** Message content */
  content: string;
  
  /** Message timestamp */
  timestamp: Date;
  
  /** Optional metadata */
  metadata?: Record<string, any>;
}

/**
 * Tool call representation.
 * 
 * @public
 */
export interface ToolCall {
  /** Tool call identifier */
  id: string;
  
  /** Name of the tool to call */
  name: string;
  
  /** Arguments for the tool */
  arguments: Record<string, any>;
  
  /** Function call information (OpenAI format compatibility) */
  function?: {
    name: string;
    arguments?: string;
  };
  
  /** Tool execution result */
  result?: any;
}

/**
 * Agent capabilities definition.
 * 
 * @public
 */
export interface AgentCapabilities {
  /** Maximum context length supported */
  maxContextLength?: number;
  
  /** Supported model types */
  supportedModels?: string[];
  
  /** Whether agent supports tools */
  supportsTools?: boolean;
  
  /** Whether agent supports streaming */
  supportsStreaming?: boolean;
  
  /** Whether agent supports memory */
  supportsMemory?: boolean;
  
  /** Custom capability flags */
  custom?: Record<string, boolean>;
}

/**
 * Streaming output chunk from agent.
 * 
 * @public
 */
export interface AgentStreamOutput {
  /** Chunk identifier */
  id: string;
  
  /** Content delta */
  delta: string;
  
  /** Whether this is the final chunk */
  done: boolean;
  
  /** Optional metadata */
  metadata?: Record<string, any>;
}