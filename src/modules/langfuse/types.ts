/**
 * @fileoverview Type definitions for the Langfuse observability and prompt management module
 * @module modules/langfuse/types
 * @requires None - Pure type definitions
 * 
 * This file defines all interfaces, types, and enums for Langfuse integration.
 * Langfuse provides comprehensive observability, tracing, prompt management, and analytics 
 * for LLM applications with detailed monitoring of costs, performance, and quality.
 * 
 * Key concepts:
 * - Wrapped Langfuse SDK for controlled access
 * - Automatic trace context management with AsyncLocalStorage
 * - Span nesting without manual management
 * - Prompt versioning and management
 * - Async context propagation
 * - Data sanitization before sending
 * - No-op mode for disabled tracing
 * 
 * @example
 * ```typescript
 * import { ILangfuseModule, TraceOptions, SpanOptions } from './types';
 * 
 * // Start trace with automatic context management
 * const trace = langfuse.startTrace({
 *   name: 'agent-conversation',
 *   userId: 'user-123',
 *   sessionId: 'session-456',
 *   metadata: { source: 'web-chat' }
 * });
 * 
 * // Spans automatically use current context
 * const span = trace.span({
 *   name: 'llm-completion',
 *   input: messages,
 *   metadata: { model: 'gpt-4', provider: 'openai' }
 * });
 * ```
 * 
 * @see https://langfuse.com/docs for Langfuse documentation
 * @since 1.0.0
 */

import { IModule, HealthStatus } from '../registry/types';

/**
 * Core interface for the Langfuse integration module.
 * 
 * This module wraps the Langfuse SDK to provide controlled access, automatic 
 * context management, and seamless integration with the AgentHub module system. 
 * The goal is to make tracing completely transparent to agent developers.
 * 
 * Key features:
 * - Wrapped Langfuse SDK for controlled access
 * - Automatic trace context management
 * - Span nesting without manual management
 * - Prompt versioning and management
 * - Async context propagation
 * - Data sanitization before sending
 * - No-op mode when disabled
 * 
 * @example
 * ```typescript
 * const langfuse = new LangfuseModule();
 * await langfuse.initialize(config);
 * 
 * // Start trace - context is automatically managed
 * const trace = langfuse.startTrace({
 *   name: 'agent-workflow',
 *   userId: 'user-123'
 * });
 * 
 * // Run operation in trace context
 * await langfuse.runInTraceContext(trace, async () => {
 *   // All operations here are automatically traced
 *   const span = trace.span({ name: 'llm-call' });
 *   // ... do work
 *   span.end();
 * });
 * ```
 * 
 * @public
 */
export interface ILangfuseModule extends IModule {
  /** Module name identifier */
  name: string;
  
  /** Module version */
  version: string;
  
  // Lifecycle management
  
  /**
   * Initializes the Langfuse module.
   * 
   * @param config - Langfuse configuration
   * @returns Promise that resolves when module is initialized
   */
  initialize(config: LangfuseConfig): Promise<void>;
  
  /**
   * Gets module health status.
   * 
   * @returns Promise resolving to health status
   */
  health(): Promise<HealthStatus>;
  
  /**
   * Gracefully shuts down the module.
   * 
   * @returns Promise that resolves when shutdown is complete
   */
  shutdown(): Promise<void>;
  
  /**
   * Flushes pending traces to Langfuse.
   * 
   * @returns Promise that resolves when flush is complete
   */
  flush(): Promise<void>;
  
  // Tracing operations
  
  /**
   * Starts a new trace with automatic context management.
   * 
   * @param options - Trace configuration options
   * @returns Trace handle for creating spans
   */
  startTrace(options: TraceOptions): ITrace;
  
  /**
   * Gets the current trace from context.
   * 
   * @returns Current trace or null if none active
   */
  getCurrentTrace(): ITrace | null;
  
  // Scoring operations
  
  /**
   * Scores a trace for quality evaluation.
   * 
   * @param traceId - Trace identifier to score
   * @param score - Score data and metrics
   * @returns Promise that resolves when score is recorded
   */
  scoreTrace(traceId: string, score: Score): Promise<void>;
  
  /**
   * Scores a generation for quality evaluation.
   * 
   * @param generationId - Generation identifier to score
   * @param score - Score data and metrics
   * @returns Promise that resolves when score is recorded
   */
  scoreGeneration(generationId: string, score: Score): Promise<void>;
  
  // Prompt management
  
  /**
   * Retrieves a prompt by name and version.
   * 
   * @param name - Prompt name
   * @param version - Prompt version (optional, defaults to latest)
   * @returns Promise resolving to prompt object
   */
  getPrompt(name: string, version?: string): Promise<IPrompt>;
  
  // Context management
  
  /**
   * Runs a function within a trace context.
   * 
   * @param trace - Trace to run function in
   * @param fn - Function to execute in trace context
   * @returns Promise resolving to function result
   */
  runInTraceContext<T>(trace: ITrace, fn: () => Promise<T>): Promise<T>;
  
  /**
   * Runs a function within a span context.
   * 
   * @param span - Span to run function in
   * @param fn - Function to execute in span context
   * @returns Promise resolving to function result
   */
  runInSpanContext<T>(span: ISpan, fn: () => Promise<T>): Promise<T>;
}

/**
 * Configuration for the Langfuse module.
 * 
 * Provides comprehensive configuration options for behavior, privacy,
 * performance, and integration settings.
 */
export interface LangfuseConfig {
  /** Langfuse public key */
  publicKey: string;
  
  /** Langfuse secret key */
  secretKey: string;
  
  /** Langfuse base URL (optional, defaults to cloud) */
  baseUrl?: string;
  
  // Behavior options
  
  /** Enable/disable tracing (default: true) */
  enabled?: boolean;
  
  /** Auto-flush interval in milliseconds */
  flushInterval?: number;
  
  /** Batch size for flushing */
  flushAt?: number;
  
  // Privacy options
  
  /** Mask sensitive data automatically (default: true) */
  maskSensitiveData?: boolean;
  
  /** Custom patterns to redact from data */
  redactPatterns?: RegExp[];
  
  /** Allowed metadata keys (whitelist) */
  allowedMetadataKeys?: string[];
  
  // Performance options
  
  /** Sampling rate (0-1, percentage of traces to capture) */
  samplingRate?: number;
  
  /** Use async flushing (default: true) */
  asyncFlush?: boolean;
  
  /** Request timeout in milliseconds */
  timeout?: number;
}

/**
 * Options for starting a new trace.
 */
export interface TraceOptions {
  /** Trace name identifier */
  name: string;
  
  /** Custom trace ID (optional, auto-generated if not provided) */
  id?: string;
  
  /** User identifier */
  userId?: string;
  
  /** Session identifier for grouping traces */
  sessionId?: string;
  
  /** Trace metadata */
  metadata?: Record<string, any>;
  
  /** Trace tags for organization */
  tags?: string[];
  
  /** Release version */
  release?: string;
  
  /** Application version */
  version?: string;
  
  /** Trace input data */
  input?: any;
  
  /** Expected output structure */
  expectedOutput?: any;
  
  /** Trace timestamp (defaults to now) */
  timestamp?: Date;
  
  /** Public visibility */
  public?: boolean;
}

/**
 * Wrapped trace interface with automatic context management.
 * 
 * Provides methods for creating spans, generations, and events
 * while managing context automatically.
 */
export interface ITrace {
  /** Unique trace identifier */
  readonly id: string;
  
  // Span management
  
  /**
   * Creates a new span within this trace.
   * 
   * @param options - Span configuration options
   * @returns Span handle with automatic context
   */
  span(options: SpanOptions): ISpan;
  
  /**
   * Creates a new generation within this trace.
   * 
   * @param options - Generation configuration options
   * @returns Generation handle with automatic context
   */
  generation(options: GenerationOptions): IGeneration;
  
  /**
   * Records an event in this trace.
   * 
   * @param options - Event configuration options
   */
  event(options: EventOptions): void;
  
  // Updates
  
  /**
   * Updates trace data.
   * 
   * @param data - Data to update trace with
   */
  update(data: TraceUpdate): void;
  
  // Metadata management
  
  /**
   * Sets user identifier for this trace.
   * 
   * @param userId - User identifier
   */
  setUser(userId: string): void;
  
  /**
   * Sets session identifier for this trace.
   * 
   * @param sessionId - Session identifier
   */
  setSession(sessionId: string): void;
  
  /**
   * Adds tags to this trace.
   * 
   * @param tags - Tags to add
   */
  addTags(tags: string[]): void;
  
  /**
   * Sets metadata on this trace.
   * 
   * @param key - Metadata key
   * @param value - Metadata value
   */
  setMetadata(key: string, value: any): void;
}

/**
 * Options for creating a span.
 */
export interface SpanOptions {
  /** Span name */
  name: string;
  
  /** Span input data */
  input?: any;
  
  /** Expected output structure */
  output?: any;
  
  /** Span metadata */
  metadata?: Record<string, any>;
  
  /** Span tags */
  tags?: string[];
  
  /** Parent span ID (auto-managed by context) */
  parentSpanId?: string;
  
  /** Span timestamp (defaults to now) */
  timestamp?: Date;
  
  /** Span level for filtering */
  level?: 'DEBUG' | 'DEFAULT' | 'WARNING' | 'ERROR';
  
  /** Span type for categorization */
  type?: string;
  
  /** Span version */
  version?: string;
}

/**
 * Wrapped span interface with automatic context management.
 */
export interface ISpan {
  /** Unique span identifier */
  readonly id: string;
  
  // Nested operations
  
  /**
   * Creates a nested span within this span.
   * 
   * @param options - Span configuration options
   * @returns Nested span handle
   */
  span(options: SpanOptions): ISpan;
  
  /**
   * Creates a generation within this span.
   * 
   * @param options - Generation configuration options
   * @returns Generation handle
   */
  generation(options: GenerationOptions): IGeneration;
  
  /**
   * Records an event in this span.
   * 
   * @param options - Event configuration options
   */
  event(options: EventOptions): void;
  
  // Lifecycle
  
  /**
   * Ends this span with optional completion data.
   * 
   * @param data - Span completion data
   */
  end(data?: SpanEnd): void;
  
  // Updates
  
  /**
   * Updates span data.
   * 
   * @param data - Data to update span with
   */
  update(data: SpanUpdate): void;
  
  /**
   * Sets metadata on this span.
   * 
   * @param key - Metadata key
   * @param value - Metadata value
   */
  setMetadata(key: string, value: any): void;
}

/**
 * Options for creating a generation.
 */
export interface GenerationOptions {
  /** Generation name */
  name: string;
  
  /** Model identifier */
  model?: string;
  
  /** Model parameters */
  modelParameters?: Record<string, any>;
  
  /** Generation input */
  input?: any;
  
  /** Generation output */
  output?: any;
  
  /** Usage statistics */
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  
  /** Cost information */
  cost?: {
    inputCost?: number;
    outputCost?: number;
    totalCost?: number;
    currency?: string;
  };
  
  /** Generation metadata */
  metadata?: Record<string, any>;
  
  /** Generation timestamp */
  timestamp?: Date;
  
  /** Generation level */
  level?: 'DEBUG' | 'DEFAULT' | 'WARNING' | 'ERROR';
  
  /** Generation version */
  version?: string;
  
  /** Completion start time */
  startTime?: Date;
  
  /** Completion end time */
  endTime?: Date;
}

/**
 * Wrapped generation interface.
 */
export interface IGeneration {
  /** Unique generation identifier */
  readonly id: string;
  
  /**
   * Updates generation data.
   * 
   * @param data - Data to update generation with
   */
  update(data: GenerationUpdate): void;
  
  /**
   * Ends this generation with completion data.
   * 
   * @param data - Generation completion data
   */
  end(data?: GenerationEnd): void;
}

/**
 * Options for creating an event.
 */
export interface EventOptions {
  /** Event name */
  name: string;
  
  /** Event input data */
  input?: any;
  
  /** Event output data */
  output?: any;
  
  /** Event metadata */
  metadata?: Record<string, any>;
  
  /** Event level */
  level?: 'DEBUG' | 'DEFAULT' | 'WARNING' | 'ERROR';
  
  /** Event timestamp */
  timestamp?: Date;
  
  /** Event version */
  version?: string;
}

/**
 * Data for updating a trace.
 */
export interface TraceUpdate {
  /** Updated input */
  input?: any;
  
  /** Updated output */
  output?: any;
  
  /** Updated metadata */
  metadata?: Record<string, any>;
  
  /** Updated tags */
  tags?: string[];
  
  /** Updated user ID */
  userId?: string;
  
  /** Updated session ID */
  sessionId?: string;
  
  /** Updated release */
  release?: string;
  
  /** Updated version */
  version?: string;
  
  /** Public visibility */
  public?: boolean;
}

/**
 * Data for updating a span.
 */
export interface SpanUpdate {
  /** Updated input */
  input?: any;
  
  /** Updated output */
  output?: any;
  
  /** Updated metadata */
  metadata?: Record<string, any>;
  
  /** Updated tags */
  tags?: string[];
  
  /** Updated level */
  level?: 'DEBUG' | 'DEFAULT' | 'WARNING' | 'ERROR';
  
  /** Updated version */
  version?: string;
}

/**
 * Data for ending a span.
 */
export interface SpanEnd {
  /** Final output */
  output?: any;
  
  /** Final metadata */
  metadata?: Record<string, any>;
  
  /** Completion level */
  level?: 'DEBUG' | 'DEFAULT' | 'WARNING' | 'ERROR';
  
  /** Status message */
  statusMessage?: string;
  
  /** End timestamp */
  timestamp?: Date;
}

/**
 * Data for updating a generation.
 */
export interface GenerationUpdate {
  /** Updated output */
  output?: any;
  
  /** Updated metadata */
  metadata?: Record<string, any>;
  
  /** Updated usage statistics */
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  
  /** Updated cost information */
  cost?: {
    inputCost?: number;
    outputCost?: number;
    totalCost?: number;
    currency?: string;
  };
  
  /** Completion start time */
  startTime?: Date;
  
  /** Completion end time */
  endTime?: Date;
  
  /** Model parameters */
  modelParameters?: Record<string, any>;
  
  /** Updated level */
  level?: 'DEBUG' | 'DEFAULT' | 'WARNING' | 'ERROR';
}

/**
 * Data for ending a generation.
 */
export interface GenerationEnd {
  /** Final output */
  output?: any;
  
  /** Final metadata */
  metadata?: Record<string, any>;
  
  /** Final usage statistics */
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  
  /** Final cost information */
  cost?: {
    inputCost?: number;
    outputCost?: number;
    totalCost?: number;
    currency?: string;
  };
  
  /** End timestamp */
  timestamp?: Date;
  
  /** Completion level */
  level?: 'DEBUG' | 'DEFAULT' | 'WARNING' | 'ERROR';
  
  /** Status message */
  statusMessage?: string;
}

/**
 * Score data for quality evaluation.
 */
export interface Score {
  /** Score name */
  name: string;
  
  /** Score value */
  value: number;
  
  /** Score comment */
  comment?: string;
  
  /** Score source */
  source?: string;
  
  /** Score data type */
  dataType?: 'NUMERIC' | 'CATEGORICAL' | 'BOOLEAN';
  
  /** Score configuration */
  config?: Record<string, any>;
}

/**
 * Wrapped prompt interface.
 */
export interface IPrompt {
  /** Prompt identifier */
  readonly id: string;
  
  /** Prompt name */
  readonly name: string;
  
  /** Prompt version */
  readonly version: number;
  
  /** Prompt content */
  readonly prompt: string;
  
  /** Prompt type */
  readonly type: 'text' | 'chat';
  
  /** Prompt labels/tags */
  readonly labels: string[];
  
  /** Prompt configuration */
  readonly config?: Record<string, any>;
  
  /**
   * Compiles the prompt with provided variables.
   * 
   * @param variables - Variables to substitute in prompt
   * @returns Compiled prompt content
   */
  compile(variables?: Record<string, any>): string;
  
  /**
   * Gets chat messages if prompt is chat type.
   * 
   * @param variables - Variables to substitute
   * @returns Array of chat messages
   */
  getChatMessages(variables?: Record<string, any>): Array<{
    role: string;
    content: string;
  }>;
}

/**
 * Data sanitizer configuration.
 */
export interface SanitizerConfig {
  /** Enable sensitive data masking */
  maskSensitiveData: boolean;
  
  /** Patterns to redact */
  redactPatterns?: RegExp[];
  
  /** Allowed metadata keys */
  allowedMetadataKeys?: string[];
  
  /** Custom sanitization rules */
  customRules?: Array<{
    pattern: RegExp;
    replacement: string;
  }>;
}