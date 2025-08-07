/**
 * @fileoverview Type definitions for the Streaming Manager Module
 * @module modules/streaming/types
 * @requires express
 * @requires ../registry/types
 * 
 * This file defines comprehensive types for the Streaming Manager Module,
 * supporting real-time Server-Sent Events (SSE) streaming, event-driven communication,
 * workflow progress updates, human-in-the-loop interactions, and Flowise compatibility.
 * 
 * Key concepts:
 * - IStreamingManager: Primary interface for streaming management
 * - IStreamer: Individual session streaming interface
 * - StreamEvent: Comprehensive event type system with Flowise patterns
 * - SSE client management with connection lifecycle
 * - Event data structures for all streaming scenarios
 * - Configuration for performance and security optimization
 * 
 * @example
 * ```typescript
 * import { IStreamingManager, StreamingManagerConfig } from './types';
 * 
 * const config: StreamingManagerConfig = {
 *   maxClients: 1000,
 *   heartbeatInterval: 30000,
 *   enableCompression: true,
 *   rateLimiting: {
 *     maxEventsPerSecond: 100,
 *     windowSize: 1000
 *   }
 * };
 * 
 * const streamer = streamingManager.getStreamer('session-123');
 * streamer.streamToken('Hello world!');
 * ```
 * 
 * @see ../registry/types.ts for base module types
 * @since 1.0.0
 */

import { Response } from 'express';
import { HealthStatus } from '../registry/types';

/**
 * Primary interface for the Streaming Manager Module.
 * 
 * The Streaming Manager provides comprehensive real-time streaming capabilities
 * using Server-Sent Events (SSE) for bi-directional communication with clients.
 * It supports multiple concurrent sessions, various event types, and integration
 * with workflow execution, human interactions, and agent operations.
 * 
 * Features:
 * - Multi-client session management with automatic cleanup
 * - Comprehensive event streaming with Flowise compatibility
 * - Node execution progress and tool call streaming
 * - Human-in-the-loop interaction events
 * - Workflow orchestration progress updates
 * - Security features with rate limiting and CORS support
 * - Performance optimization with compression and batching
 * - Health monitoring and metrics collection
 * 
 * @remarks
 * Implementation must ensure thread safety for concurrent client management
 * and provide robust error handling for network interruptions and client disconnections.
 * 
 * @example
 * ```typescript
 * const streamingManager = new StreamingManager({
 *   maxClients: 500,
 *   heartbeatInterval: 30000,
 *   enableCompression: true
 * });
 * 
 * // Add client connection
 * streamingManager.addClient('session-123', response);
 * 
 * // Stream events
 * streamingManager.streamToken('session-123', 'Processing...');
 * streamingManager.streamWorkflowStart('session-123', 'workflow-1', 'Data Pipeline');
 * ```
 * 
 * @public
 */
export interface IStreamingManager {
  /** Module identification */
  readonly name: string;
  readonly version: string;
  
  // Lifecycle management
  /**
   * Initializes the Streaming Manager with configuration.
   * 
   * @throws {StreamingError} If initialization fails
   */
  initialize(): Promise<void>;
  
  /**
   * Returns the health status of the Streaming Manager.
   * 
   * @returns Health status with client connection metrics
   */
  health(): Promise<HealthStatus>;
  
  /**
   * Gracefully shuts down all connections and cleans up resources.
   */
  cleanup(): Promise<void>;
  
  // Client management
  /**
   * Adds a new client connection for streaming.
   * 
   * Establishes Server-Sent Events connection with proper headers
   * and initializes streaming context for the session.
   * 
   * @param sessionId - Unique session identifier
   * @param response - Express response object for SSE streaming
   * @throws {StreamingError} If maximum client limit reached
   * 
   * @example
   * ```typescript
   * app.get('/stream/:sessionId', (req, res) => {
   *   streamingManager.addClient(req.params.sessionId, res);
   * });
   * ```
   */
  addClient(sessionId: string, response: Response): void;
  
  /**
   * Removes client connection and cleans up resources.
   * 
   * Gracefully closes the SSE connection and removes all associated
   * streaming contexts and event handlers.
   * 
   * @param sessionId - Session identifier to remove
   * 
   * @example
   * ```typescript
   * streamingManager.removeClient('session-123');
   * ```
   */
  removeClient(sessionId: string): void;
  
  /**
   * Checks if a client connection exists for the session.
   * 
   * @param sessionId - Session identifier to check
   * @returns True if client connection exists
   */
  hasClient(sessionId: string): boolean;
  
  /**
   * Gets the current number of active client connections.
   * 
   * @returns Number of active streaming clients
   */
  getClientCount(): number;
  
  // Core event streaming
  /**
   * Streams a text token to the client.
   * 
   * Used for streaming LLM responses token by token for real-time
   * text generation display.
   * 
   * @param sessionId - Target session identifier
   * @param token - Text token to stream
   * 
   * @example
   * ```typescript
   * streamingManager.streamToken('session-123', 'Hello ');
   * streamingManager.streamToken('session-123', 'world!');
   * ```
   */
  streamToken(sessionId: string, token: string): void;
  
  /**
   * Streams execution start event with optional metadata.
   * 
   * @param sessionId - Target session identifier
   * @param metadata - Optional metadata about the execution
   */
  streamStart(sessionId: string, metadata?: any): void;
  
  /**
   * Streams execution completion event.
   * 
   * @param sessionId - Target session identifier
   */
  streamEnd(sessionId: string): void;
  
  /**
   * Streams error event with error details.
   * 
   * @param sessionId - Target session identifier
   * @param error - Error information to stream
   */
  streamError(sessionId: string, error: Error): void;
  
  // Node execution events
  /**
   * Streams workflow node start event.
   * 
   * Indicates that a specific node in a workflow has begun execution.
   * Provides real-time visibility into workflow progress.
   * 
   * @param sessionId - Target session identifier
   * @param nodeId - Unique node identifier
   * @param nodeName - Human-readable node name
   * @param nodeType - Optional node type classification
   * 
   * @example
   * ```typescript
   * streamingManager.streamNodeStart(
   *   'session-123',
   *   'node-extract',
   *   'Data Extractor',
   *   'llm'
   * );
   * ```
   */
  streamNodeStart(sessionId: string, nodeId: string, nodeName: string, nodeType?: string): void;
  
  /**
   * Streams workflow node completion event.
   * 
   * Indicates successful completion of a workflow node with results
   * and optional performance metrics.
   * 
   * @param sessionId - Target session identifier
   * @param nodeId - Node identifier that completed
   * @param result - Node execution result data
   * @param duration - Optional execution duration in milliseconds
   */
  streamNodeEnd(sessionId: string, nodeId: string, result: any, duration?: number): void;
  
  /**
   * Streams workflow node error event.
   * 
   * Indicates that a workflow node encountered an error during execution.
   * 
   * @param sessionId - Target session identifier
   * @param nodeId - Node identifier that failed
   * @param error - Error information
   */
  streamNodeError(sessionId: string, nodeId: string, error: Error): void;
  
  // Tool execution events
  /**
   * Streams tool execution start event.
   * 
   * Indicates that an agent is calling a tool with specific input parameters.
   * 
   * @param sessionId - Target session identifier
   * @param tool - Tool name being called
   * @param input - Input parameters passed to the tool
   * 
   * @example
   * ```typescript
   * streamingManager.streamToolCall(
   *   'session-123',
   *   'web_search',
   *   { query: 'latest AI developments', limit: 5 }
   * );
   * ```
   */
  streamToolCall(sessionId: string, tool: string, input: any): void;
  
  /**
   * Streams tool execution result event.
   * 
   * Provides the result of tool execution with optional performance metrics.
   * 
   * @param sessionId - Target session identifier
   * @param tool - Tool name that was executed
   * @param result - Tool execution result data
   * @param duration - Optional execution duration in milliseconds
   */
  streamToolResult(sessionId: string, tool: string, result: any, duration?: number): void;
  
  /**
   * Streams tool execution error event.
   * 
   * Indicates that tool execution failed with error details.
   * 
   * @param sessionId - Target session identifier
   * @param tool - Tool name that failed
   * @param error - Error information
   */
  streamToolError(sessionId: string, tool: string, error: Error): void;
  
  // Human interaction events
  /**
   * Streams human interaction prompt event.
   * 
   * Requests human input or approval with configuration options for
   * interaction type, timeout, and available choices.
   * 
   * @param sessionId - Target session identifier
   * @param prompt - Human-readable prompt message
   * @param options - Human interaction configuration options
   * 
   * @example
   * ```typescript
   * streamingManager.streamHumanPrompt(
   *   'session-123',
   *   'Please select the data processing method:',
   *   {
   *     type: 'choice',
   *     choices: ['fast', 'accurate', 'balanced'],
   *     timeout: 60000,
   *     required: true
   *   }
   * );
   * ```
   */
  streamHumanPrompt(sessionId: string, prompt: string, options?: HumanPromptOptions): void;
  
  /**
   * Streams human response event.
   * 
   * Indicates that human input has been received and processed.
   * 
   * @param sessionId - Target session identifier
   * @param response - Human-provided response data
   */
  streamHumanResponse(sessionId: string, response: any): void;
  
  // Workflow orchestration events
  /**
   * Streams workflow start event.
   * 
   * Indicates the beginning of workflow execution with identification
   * and optional descriptive information.
   * 
   * @param sessionId - Target session identifier
   * @param workflowId - Unique workflow identifier
   * @param workflowName - Optional human-readable workflow name
   * 
   * @example
   * ```typescript
   * streamingManager.streamWorkflowStart(
   *   'session-123',
   *   'workflow-data-pipeline',
   *   'Customer Data Processing Pipeline'
   * );
   * ```
   */
  streamWorkflowStart(sessionId: string, workflowId: string, workflowName?: string): void;
  
  /**
   * Streams workflow completion event.
   * 
   * Indicates successful completion of workflow execution with final results.
   * 
   * @param sessionId - Target session identifier
   * @param workflowId - Workflow identifier that completed
   * @param result - Optional final workflow result data
   */
  streamWorkflowEnd(sessionId: string, workflowId: string, result?: any): void;
  
  /**
   * Streams workflow progress update event.
   * 
   * Provides real-time progress information during workflow execution
   * including completion percentage and time estimates.
   * 
   * @param sessionId - Target session identifier
   * @param workflowId - Workflow identifier for progress update
   * @param progress - Detailed progress information
   */
  streamWorkflowProgress(sessionId: string, workflowId: string, progress: WorkflowProgress): void;
  
  // Flowise compatibility events
  /**
   * Streams source documents event for RAG applications.
   * 
   * Provides visibility into documents used as context for generation.
   * Compatible with Flowise document streaming patterns.
   * 
   * @param sessionId - Target session identifier
   * @param documents - Array of source document information
   */
  streamSourceDocuments(sessionId: string, documents: any[]): void;
  
  /**
   * Streams used tools summary event.
   * 
   * Provides a summary of all tools used during execution with
   * performance metrics and results. Compatible with Flowise patterns.
   * 
   * @param sessionId - Target session identifier
   * @param tools - Array of tool usage information
   */
  streamUsedTools(sessionId: string, tools: UsedTool[]): void;
  
  /**
   * Streams generated artifacts event.
   * 
   * Streams files, images, or other artifacts generated during execution.
   * 
   * @param sessionId - Target session identifier
   * @param artifacts - Array of generated artifacts
   */
  streamArtifacts(sessionId: string, artifacts: any[]): void;
  
  // Custom events
  /**
   * Streams custom application-specific event.
   * 
   * Allows applications to stream custom events not covered by
   * standard event types.
   * 
   * @param sessionId - Target session identifier
   * @param eventType - Custom event type identifier
   * @param data - Custom event data payload
   * 
   * @example
   * ```typescript
   * streamingManager.streamCustomEvent(
   *   'session-123',
   *   'model_metrics',
   *   { accuracy: 0.95, confidence: 0.87 }
   * );
   * ```
   */
  streamCustomEvent(sessionId: string, eventType: string, data: any): void;
  
  // Streamer management
  /**
   * Gets the streamer instance for a session.
   * 
   * Returns the IStreamer interface for direct streaming control,
   * or null if no active connection exists.
   * 
   * @param sessionId - Session identifier
   * @returns Streamer instance or null if not found
   */
  getStreamer(sessionId: string): IStreamer | null;
  
  /**
   * Creates a new streamer instance for a session.
   * 
   * @param sessionId - Session identifier
   * @returns New streamer instance
   * @throws {StreamingError} If no client connection exists
   */
  createStreamer(sessionId: string): IStreamer;
}

/**
 * Individual streaming session interface for direct streaming control.
 * 
 * IStreamer provides a session-specific interface for streaming events
 * without requiring session ID parameters. It maintains connection state
 * and provides convenient methods for all supported event types.
 * 
 * @remarks
 * Streamer instances are automatically managed by the StreamingManager
 * and should not be created directly by application code.
 * 
 * @example
 * ```typescript
 * const streamer = streamingManager.getStreamer('session-123');
 * if (streamer && streamer.isActive) {
 *   streamer.streamToken('Processing your request...');
 *   streamer.streamNodeStart('extract', 'Data Extractor', 'llm');
 * }
 * ```
 * 
 * @public
 */
export interface IStreamer {
  /** Session identifier for this streaming instance */
  readonly sessionId: string;
  
  /** Whether the streaming connection is active */
  readonly isActive: boolean;
  
  /** Timestamp when streaming session started */
  readonly startedAt: Date;
  
  // Core streaming methods
  /**
   * Streams a text token for real-time text generation.
   * 
   * @param token - Text token to stream
   */
  streamToken(token: string): void;
  
  /**
   * Streams execution start event.
   * 
   * @param metadata - Optional metadata about the execution
   */
  streamStart(metadata?: any): void;
  
  /**
   * Streams execution completion event.
   */
  streamEnd(): void;
  
  /**
   * Streams error event.
   * 
   * @param error - Error information to stream
   */
  streamError(error: Error): void;
  
  // Node execution events
  /**
   * Streams workflow node start event.
   * 
   * @param nodeId - Unique node identifier
   * @param nodeName - Human-readable node name
   * @param nodeType - Optional node type classification
   */
  streamNodeStart(nodeId: string, nodeName: string, nodeType?: string): void;
  
  /**
   * Streams workflow node completion event.
   * 
   * @param nodeId - Node identifier that completed
   * @param result - Node execution result data
   * @param duration - Optional execution duration in milliseconds
   */
  streamNodeEnd(nodeId: string, result: any, duration?: number): void;
  
  /**
   * Streams workflow node error event.
   * 
   * @param nodeId - Node identifier that failed
   * @param error - Error information
   */
  streamNodeError(nodeId: string, error: Error): void;
  
  // Tool execution events
  /**
   * Streams tool execution start event.
   * 
   * @param tool - Tool name being called
   * @param input - Input parameters passed to the tool
   */
  streamToolCall(tool: string, input: any): void;
  
  /**
   * Streams tool execution result event.
   * 
   * @param tool - Tool name that was executed
   * @param result - Tool execution result data
   * @param duration - Optional execution duration in milliseconds
   */
  streamToolResult(tool: string, result: any, duration?: number): void;
  
  /**
   * Streams tool execution error event.
   * 
   * @param tool - Tool name that failed
   * @param error - Error information
   */
  streamToolError(tool: string, error: Error): void;
  
  // Human interaction events
  /**
   * Streams human interaction prompt event.
   * 
   * @param prompt - Human-readable prompt message
   * @param options - Human interaction configuration options
   */
  streamHumanPrompt(prompt: string, options?: HumanPromptOptions): void;
  
  /**
   * Streams human response event.
   * 
   * @param response - Human-provided response data
   */
  streamHumanResponse(response: any): void;
  
  // Workflow orchestration events
  /**
   * Streams workflow start event.
   * 
   * @param workflowId - Unique workflow identifier
   * @param workflowName - Optional human-readable workflow name
   */
  streamWorkflowStart(workflowId: string, workflowName?: string): void;
  
  /**
   * Streams workflow completion event.
   * 
   * @param workflowId - Workflow identifier that completed
   * @param result - Optional final workflow result data
   */
  streamWorkflowEnd(workflowId: string, result?: any): void;
  
  /**
   * Streams workflow progress update event.
   * 
   * @param workflowId - Workflow identifier for progress update
   * @param progress - Detailed progress information
   */
  streamWorkflowProgress(workflowId: string, progress: WorkflowProgress): void;
  
  // Flowise compatibility events
  /**
   * Streams source documents event.
   * 
   * @param documents - Array of source document information
   */
  streamSourceDocuments(documents: any[]): void;
  
  /**
   * Streams used tools summary event.
   * 
   * @param tools - Array of tool usage information
   */
  streamUsedTools(tools: UsedTool[]): void;
  
  /**
   * Streams generated artifacts event.
   * 
   * @param artifacts - Array of generated artifacts
   */
  streamArtifacts(artifacts: any[]): void;
  
  // Custom events
  /**
   * Streams custom application-specific event.
   * 
   * @param eventType - Custom event type identifier
   * @param data - Custom event data payload
   */
  streamCustomEvent(eventType: string, data: any): void;
  
  // Connection control
  /**
   * Closes the streaming connection gracefully.
   */
  close(): void;
}

/**
 * Comprehensive event type enumeration based on Flowise patterns.
 * 
 * Defines all supported streaming event types for consistent
 * event handling and client-side processing.
 * 
 * @public
 */
export type StreamEvent = 
  | 'start'              // Execution start
  | 'token'              // Text token streaming
  | 'end'                // Execution completion
  | 'error'              // Error event
  | 'nodeStart'          // Workflow node start
  | 'nodeEnd'            // Workflow node completion
  | 'nodeError'          // Workflow node error
  | 'toolCall'           // Tool execution start
  | 'toolResult'         // Tool execution result
  | 'toolError'          // Tool execution error
  | 'humanPrompt'        // Human interaction request
  | 'humanResponse'      // Human interaction response
  | 'workflowStart'      // Workflow execution start
  | 'workflowEnd'        // Workflow execution completion
  | 'workflowProgress'   // Workflow progress update
  | 'sourceDocuments'    // RAG source documents
  | 'usedTools'          // Tool usage summary
  | 'artifacts'          // Generated artifacts
  | 'heartbeat'          // Connection heartbeat
  | 'custom';            // Custom application events

/**
 * Standardized event data structure for all streaming events.
 * 
 * Provides consistent structure for event serialization and
 * client-side event handling with metadata and timing information.
 * 
 * @public
 */
export interface StreamEventData {
  /** Event type identifier */
  event: StreamEvent;
  
  /** Event payload data */
  data: any;
  
  /** Event timestamp in ISO format */
  timestamp: string;
  
  /** Session identifier for event context */
  sessionId: string;
  
  /** Optional unique event identifier */
  eventId?: string;
}

/**
 * Configuration options for human interaction prompts.
 * 
 * Defines the structure for human-in-the-loop interaction
 * configuration including timeout, choices, and metadata.
 * 
 * @public
 */
export interface HumanPromptOptions {
  /** Type of human interaction required */
  type?: 'approval' | 'input' | 'choice' | 'confirmation';
  
  /** Timeout for human response in milliseconds */
  timeout?: number;
  
  /** Available choices for choice-type interactions */
  choices?: string[];
  
  /** Whether response is required to continue */
  required?: boolean;
  
  /** Additional metadata for the interaction */
  metadata?: any;
}

/**
 * Workflow execution progress information.
 * 
 * Provides detailed progress tracking for workflow execution
 * with completion metrics and time estimates.
 * 
 * @public
 */
export interface WorkflowProgress {
  /** Total number of nodes in the workflow */
  totalNodes: number;
  
  /** Number of completed nodes */
  completedNodes: number;
  
  /** Currently executing node identifier */
  currentNode: string;
  
  /** Optional human-readable current node name */
  currentNodeName?: string;
  
  /** Completion percentage (0-100) */
  percentage: number;
  
  /** Optional estimated time remaining in milliseconds */
  estimatedTimeRemaining?: number;
}

/**
 * Tool usage information for execution summaries.
 * 
 * Captures comprehensive information about tool usage during
 * workflow execution including performance metrics.
 * 
 * @public
 */
export interface UsedTool {
  /** Tool name or identifier */
  tool: string;
  
  /** Input parameters passed to the tool */
  input: any;
  
  /** Tool execution output */
  output: any;
  
  /** Optional execution duration in milliseconds */
  duration?: number;
  
  /** Error message if tool execution failed */
  error?: string;
}

/**
 * Streaming Manager configuration options.
 * 
 * Comprehensive configuration for streaming behavior including
 * performance optimization, security settings, and monitoring options.
 * 
 * @public
 */
export interface StreamingManagerConfig {
  // Connection management
  /** Maximum number of concurrent client connections */
  maxClients?: number;
  
  /** Connection timeout in milliseconds */
  connectionTimeout?: number;
  
  /** Heartbeat interval for connection health checks */
  heartbeatInterval?: number;
  
  // Event processing
  /** Enable gzip compression for event streams */
  enableCompression?: boolean;
  
  /** Generate unique IDs for each event */
  eventIdGeneration?: boolean;
  
  /** Retry configuration for failed events */
  retrySettings?: {
    maxRetries: number;
    retryDelay: number;
  };
  
  // Security settings
  /** CORS allowed origins for streaming connections */
  corsOrigins?: string[];
  
  /** Require authentication for streaming connections */
  requireAuth?: boolean;
  
  /** Rate limiting configuration */
  rateLimiting?: {
    maxEventsPerSecond: number;
    windowSize: number;
  };
  
  // Monitoring and debugging
  /** Enable metrics collection for streaming operations */
  enableMetrics?: boolean;
  
  /** Log all streaming events for debugging */
  logEvents?: boolean;
}

/**
 * Client connection information for internal tracking.
 * 
 * Used internally by the StreamingManager for connection
 * lifecycle management and resource tracking.
 * 
 * @internal
 */
export interface SSEClientInfo {
  /** Session identifier */
  sessionId: string;
  
  /** Express response object */
  response: Response;
  
  /** Connection establishment timestamp */
  createdAt: Date;
  
  /** Last activity timestamp */
  lastActivity: Date;
  
  /** Connection state */
  isActive: boolean;
  
  /** Number of events sent */
  eventsSent: number;
}

/**
 * Streaming statistics for monitoring and debugging.
 * 
 * Provides comprehensive metrics about streaming performance
 * and resource utilization.
 * 
 * @public
 */
export interface StreamingStatistics {
  /** Number of active client connections */
  activeClients: number;
  
  /** Total events streamed since startup */
  totalEventsStreamed: number;
  
  /** Events streamed per second (current rate) */
  eventsPerSecond: number;
  
  /** Average event size in bytes */
  averageEventSize: number;
  
  /** Memory usage for streaming buffers */
  memoryUsage: number;
  
  /** Client connection statistics */
  clientStats: {
    totalConnections: number;
    totalDisconnections: number;
    averageSessionDuration: number;
  };
  
  /** Error statistics */
  errorStats: {
    connectionErrors: number;
    streamingErrors: number;
    rateLimitViolations: number;
  };
}