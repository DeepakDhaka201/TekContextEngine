/**
 * @fileoverview Server-Sent Events streamer implementation for session-specific streaming
 * @module modules/streaming/sse-streamer
 * @requires ./types
 * @requires ./sse-client
 * 
 * This file implements the ServerSentEventStreamer class that provides a
 * session-specific interface for streaming events. It wraps the SSEClient
 * with a convenient API that doesn't require session ID parameters.
 * 
 * Key concepts:
 * - Session-specific streaming interface without session ID parameters
 * - Comprehensive event streaming with Flowise compatibility
 * - Connection state management and lifecycle tracking
 * - Event type validation and error handling
 * - Integration with workflow execution and human interactions
 * - Performance monitoring and usage statistics
 * 
 * @example
 * ```typescript
 * import { ServerSentEventStreamer } from './sse-streamer';
 * 
 * const streamer = new ServerSentEventStreamer('session-123', client, config);
 * 
 * streamer.streamToken('Hello ');
 * streamer.streamToken('world!');
 * streamer.streamWorkflowStart('workflow-1', 'Data Pipeline');
 * streamer.streamNodeStart('extract', 'Data Extractor', 'llm');
 * ```
 * 
 * @see types.ts for IStreamer interface and event types
 * @see sse-client.ts for SSEClient implementation
 * @since 1.0.0
 */

import {
  IStreamer,
  StreamingManagerConfig,
  HumanPromptOptions,
  WorkflowProgress,
  UsedTool
} from './types';
import { SSEClient } from './sse-client';
import { EventStreamingError, createStreamingErrorContext } from './errors';

/**
 * Server-Sent Events streamer for session-specific streaming operations.
 * 
 * The ServerSentEventStreamer provides a convenient, session-specific interface
 * for streaming events without requiring session ID parameters. It wraps an
 * SSEClient instance and provides comprehensive event streaming capabilities
 * for workflow execution, human interactions, and real-time updates.
 * 
 * Features:
 * - Session-specific streaming interface (no session ID required)
 * - Comprehensive event types with Flowise compatibility
 * - Connection state monitoring and lifecycle management
 * - Error handling with automatic recovery attempts
 * - Performance tracking and usage statistics
 * - Event validation and serialization handling
 * - Integration with workflow orchestration systems
 * - Human-in-the-loop interaction support
 * 
 * @remarks
 * ServerSentEventStreamer instances are created and managed by the
 * StreamingManager and should not be instantiated directly. The streamer
 * maintains a reference to the underlying SSEClient and provides a
 * higher-level interface for event streaming.
 * 
 * @example
 * ```typescript
 * // Get streamer from StreamingManager
 * const streamer = streamingManager.getStreamer('session-123');
 * 
 * if (streamer && streamer.isActive) {
 *   // Stream workflow execution
 *   streamer.streamWorkflowStart('workflow-1', 'Data Processing');
 *   streamer.streamNodeStart('extract', 'Extract Data', 'llm');
 *   
 *   // Stream real-time tokens
 *   for (const token of ['Processing', ' your', ' request...']) {
 *     streamer.streamToken(token);
 *   }
 *   
 *   // Stream tool execution
 *   streamer.streamToolCall('database_query', { 
 *     query: 'SELECT * FROM users', 
 *     limit: 100 
 *   });
 *   
 *   streamer.streamToolResult('database_query', {
 *     rows: [...],
 *     count: 42
 *   }, 150);
 *   
 *   // Complete workflow
 *   streamer.streamNodeEnd('extract', { records: 42 }, 1500);
 *   streamer.streamWorkflowEnd('workflow-1', { status: 'completed' });
 * }
 * ```
 * 
 * @public
 */
export class ServerSentEventStreamer implements IStreamer {
  /** Session identifier for this streaming instance */
  readonly sessionId: string;
  
  /** Timestamp when streaming session started */
  readonly startedAt: Date;
  
  /** Underlying SSE client for network communication */
  private client: SSEClient;
  
  /** Streaming configuration */
  private config: StreamingManagerConfig;
  
  /** Internal active state flag */
  private _isActive = true;
  
  /** Event counter for performance tracking */
  private eventCount = 0;
  
  /** Last event timestamp for activity tracking */
  private lastEventTime = Date.now();
  
  /**
   * Creates a new ServerSentEventStreamer for session-specific streaming.
   * 
   * @param sessionId - Unique session identifier
   * @param client - SSE client for network communication
   * @param config - Streaming configuration options
   * 
   * @example
   * ```typescript
   * // Created by StreamingManager
   * const streamer = new ServerSentEventStreamer(
   *   'session-123',
   *   sseClient,
   *   { logEvents: true, eventIdGeneration: true }
   * );
   * ```
   */
  constructor(sessionId: string, client: SSEClient, config: StreamingManagerConfig) {
    this.sessionId = sessionId;
    this.client = client;
    this.config = config;
    this.startedAt = new Date();
    
    console.log(`✓ Created streamer for session ${sessionId}`);
  }
  
  /**
   * Gets the current active state of the streaming connection.
   * 
   * @returns True if streaming is active and client connection is open
   */
  get isActive(): boolean {
    return this._isActive && !this.client.isClosed;
  }
  
  // Core streaming methods
  
  /**
   * Streams a text token for real-time text generation display.
   * 
   * Used primarily for streaming LLM responses token by token to provide
   * real-time text generation experience to users.
   * 
   * @param token - Text token to stream
   * 
   * @example
   * ```typescript
   * // Stream individual tokens for real-time display
   * streamer.streamToken('The ');
   * streamer.streamToken('quick ');
   * streamer.streamToken('brown ');
   * streamer.streamToken('fox...');
   * ```
   */
  streamToken(token: string): void {
    if (!this.isActive) return;
    
    try {
      this.client.sendEvent('token', { token });
      this.updateEventTracking();
      
      if (this.config.logEvents) {
        console.log(`[${this.sessionId}] Token: "${token}"`);
      }
    } catch (error) {
      this.handleStreamingError('token', error, { token });
    }
  }
  
  /**
   * Streams execution start event with optional metadata.
   * 
   * Indicates the beginning of an execution session with context
   * information and configuration details.
   * 
   * @param metadata - Optional metadata about the execution
   * 
   * @example
   * ```typescript
   * streamer.streamStart({
   *   workflowId: 'workflow-123',
   *   userId: 'user-456',
   *   model: 'gpt-4',
   *   context: 'data-analysis'
   * });
   * ```
   */
  streamStart(metadata?: any): void {
    if (!this.isActive) return;
    
    try {
      this.client.sendEvent('start', { 
        metadata,
        startedAt: this.startedAt.toISOString(),
        sessionId: this.sessionId
      });
      this.updateEventTracking();
      
      if (this.config.logEvents) {
        console.log(`[${this.sessionId}] Execution started:`, metadata);
      }
    } catch (error) {
      this.handleStreamingError('start', error, { metadata });
    }
  }
  
  /**
   * Streams execution completion event with timing information.
   * 
   * Indicates successful completion of an execution session with
   * performance metrics and final status.
   * 
   * @example
   * ```typescript
   * streamer.streamEnd();
   * ```
   */
  streamEnd(): void {
    if (!this.isActive) return;
    
    try {
      const duration = Date.now() - this.startedAt.getTime();
      
      this.client.sendEvent('end', { 
        duration,
        eventCount: this.eventCount,
        endedAt: new Date().toISOString()
      });
      this.updateEventTracking();
      
      if (this.config.logEvents) {
        console.log(`[${this.sessionId}] Execution completed (${duration}ms, ${this.eventCount} events)`);
      }
    } catch (error) {
      this.handleStreamingError('end', error, {});
    }
  }
  
  /**
   * Streams error event with comprehensive error information.
   * 
   * Provides error details, recovery suggestions, and context
   * information for debugging and user notification.
   * 
   * @param error - Error information to stream
   * 
   * @example
   * ```typescript
   * try {
   *   await processData();
   * } catch (error) {
   *   streamer.streamError(error);
   * }
   * ```
   */
  streamError(error: Error): void {
    if (!this.isActive) return;
    
    try {
      this.client.sendEvent('error', {
        message: error.message,
        name: error.name,
        stack: this.config.logEvents ? error.stack : undefined,
        timestamp: new Date().toISOString(),
        recoverable: true // Could be determined by error type
      });
      this.updateEventTracking();
      
      console.error(`[${this.sessionId}] Error streamed:`, error.message);
    } catch (streamingError) {
      console.error(`Failed to stream error for ${this.sessionId}:`, streamingError);
      // Don't throw here to prevent error cascade
    }
  }
  
  // Node execution events
  
  /**
   * Streams workflow node start event with node information.
   * 
   * Indicates that a specific node in a workflow has begun execution,
   * providing visibility into workflow progress and current operations.
   * 
   * @param nodeId - Unique node identifier
   * @param nodeName - Human-readable node name
   * @param nodeType - Optional node type classification
   * 
   * @example
   * ```typescript
   * streamer.streamNodeStart(
   *   'extract-data',
   *   'Extract Customer Data',
   *   'llm'
   * );
   * ```
   */
  streamNodeStart(nodeId: string, nodeName: string, nodeType?: string): void {
    if (!this.isActive) return;
    
    try {
      this.client.sendEvent('nodeStart', {
        nodeId,
        nodeName,
        nodeType,
        timestamp: new Date().toISOString()
      });
      this.updateEventTracking();
      
      if (this.config.logEvents) {
        console.log(`[${this.sessionId}] Node started: ${nodeName} (${nodeId})`);
      }
    } catch (error) {
      this.handleStreamingError('nodeStart', error, { nodeId, nodeName, nodeType });
    }
  }
  
  /**
   * Streams workflow node completion event with results.
   * 
   * Indicates successful completion of a workflow node with output
   * data and performance metrics.
   * 
   * @param nodeId - Node identifier that completed
   * @param result - Node execution result data
   * @param duration - Optional execution duration in milliseconds
   * 
   * @example
   * ```typescript
   * streamer.streamNodeEnd(
   *   'extract-data',
   *   { records: 1250, format: 'json' },
   *   2340
   * );
   * ```
   */
  streamNodeEnd(nodeId: string, result: any, duration?: number): void {
    if (!this.isActive) return;
    
    try {
      this.client.sendEvent('nodeEnd', {
        nodeId,
        result,
        duration,
        timestamp: new Date().toISOString()
      });
      this.updateEventTracking();
      
      if (this.config.logEvents) {
        console.log(`[${this.sessionId}] Node completed: ${nodeId} (${duration || 'unknown'}ms)`);
      }
    } catch (error) {
      this.handleStreamingError('nodeEnd', error, { nodeId, result, duration });
    }
  }
  
  /**
   * Streams workflow node error event with error details.
   * 
   * Indicates that a workflow node encountered an error during execution,
   * providing error information and recovery context.
   * 
   * @param nodeId - Node identifier that failed
   * @param error - Error information
   * 
   * @example
   * ```typescript
   * try {
   *   await executeNode(nodeId);
   * } catch (error) {
   *   streamer.streamNodeError(nodeId, error);
   * }
   * ```
   */
  streamNodeError(nodeId: string, error: Error): void {
    if (!this.isActive) return;
    
    try {
      this.client.sendEvent('nodeError', {
        nodeId,
        error: {
          message: error.message,
          name: error.name,
          stack: this.config.logEvents ? error.stack : undefined
        },
        timestamp: new Date().toISOString()
      });
      this.updateEventTracking();
      
      console.error(`[${this.sessionId}] Node error: ${nodeId} - ${error.message}`);
    } catch (streamingError) {
      this.handleStreamingError('nodeError', streamingError, { nodeId, originalError: error.message });
    }
  }
  
  // Tool execution events
  
  /**
   * Streams tool execution start event with input parameters.
   * 
   * Indicates that an agent is calling a tool with specific parameters,
   * providing visibility into tool usage and execution flow.
   * 
   * @param tool - Tool name being called
   * @param input - Input parameters passed to the tool
   * 
   * @example
   * ```typescript
   * streamer.streamToolCall('web_search', {
   *   query: 'latest AI developments',
   *   limit: 5,
   *   timeframe: '1week'
   * });
   * ```
   */
  streamToolCall(tool: string, input: any): void {
    if (!this.isActive) return;
    
    try {
      this.client.sendEvent('toolCall', {
        tool,
        input,
        timestamp: new Date().toISOString()
      });
      this.updateEventTracking();
      
      if (this.config.logEvents) {
        console.log(`[${this.sessionId}] Tool called: ${tool}`);
      }
    } catch (error) {
      this.handleStreamingError('toolCall', error, { tool, input });
    }
  }
  
  /**
   * Streams tool execution result event with output data.
   * 
   * Provides the result of tool execution with optional performance
   * metrics and success indicators.
   * 
   * @param tool - Tool name that was executed
   * @param result - Tool execution result data
   * @param duration - Optional execution duration in milliseconds
   * 
   * @example
   * ```typescript
   * streamer.streamToolResult('web_search', {
   *   results: [
   *     { title: 'AI News', url: 'https://...', summary: '...' }
   *   ],
   *   count: 5
   * }, 1250);
   * ```
   */
  streamToolResult(tool: string, result: any, duration?: number): void {
    if (!this.isActive) return;
    
    try {
      this.client.sendEvent('toolResult', {
        tool,
        result,
        duration,
        timestamp: new Date().toISOString()
      });
      this.updateEventTracking();
      
      if (this.config.logEvents) {
        console.log(`[${this.sessionId}] Tool result: ${tool} (${duration || 'unknown'}ms)`);
      }
    } catch (error) {
      this.handleStreamingError('toolResult', error, { tool, result, duration });
    }
  }
  
  /**
   * Streams tool execution error event with error information.
   * 
   * Indicates that tool execution failed with detailed error
   * information for debugging and recovery.
   * 
   * @param tool - Tool name that failed
   * @param error - Error information
   * 
   * @example
   * ```typescript
   * try {
   *   const result = await executeTool('web_search', params);
   * } catch (error) {
   *   streamer.streamToolError('web_search', error);
   * }
   * ```
   */
  streamToolError(tool: string, error: Error): void {
    if (!this.isActive) return;
    
    try {
      this.client.sendEvent('toolError', {
        tool,
        error: {
          message: error.message,
          name: error.name,
          stack: this.config.logEvents ? error.stack : undefined
        },
        timestamp: new Date().toISOString()
      });
      this.updateEventTracking();
      
      console.error(`[${this.sessionId}] Tool error: ${tool} - ${error.message}`);
    } catch (streamingError) {
      this.handleStreamingError('toolError', streamingError, { tool, originalError: error.message });
    }
  }
  
  // Human interaction events
  
  /**
   * Streams human interaction prompt event with configuration options.
   * 
   * Requests human input or approval with detailed configuration including
   * interaction type, timeout, choices, and requirements.
   * 
   * @param prompt - Human-readable prompt message
   * @param options - Human interaction configuration options
   * 
   * @example
   * ```typescript
   * streamer.streamHumanPrompt(
   *   'Please approve the data processing configuration:',
   *   {
   *     type: 'approval',
   *     timeout: 300000,
   *     required: true,
   *     metadata: { configId: 'config-123' }
   *   }
   * );
   * 
   * streamer.streamHumanPrompt(
   *   'Select processing method:',
   *   {
   *     type: 'choice',
   *     choices: ['fast', 'accurate', 'balanced'],
   *     timeout: 60000
   *   }
   * );
   * ```
   */
  streamHumanPrompt(prompt: string, options?: HumanPromptOptions): void {
    if (!this.isActive) return;
    
    try {
      this.client.sendEvent('humanPrompt', {
        prompt,
        options,
        timestamp: new Date().toISOString()
      });
      this.updateEventTracking();
      
      if (this.config.logEvents) {
        console.log(`[${this.sessionId}] Human prompt: ${options?.type || 'input'} - ${prompt.substring(0, 50)}...`);
      }
    } catch (error) {
      this.handleStreamingError('humanPrompt', error, { prompt, options });
    }
  }
  
  /**
   * Streams human response event with provided input data.
   * 
   * Indicates that human input has been received and is being processed,
   * providing the response data and confirmation of receipt.
   * 
   * @param response - Human-provided response data
   * 
   * @example
   * ```typescript
   * streamer.streamHumanResponse({
   *   approved: true,
   *   comments: 'Looks good, proceed with processing'
   * });
   * 
   * streamer.streamHumanResponse({
   *   choice: 'balanced',
   *   reasoning: 'Need good accuracy but reasonable speed'
   * });
   * ```
   */
  streamHumanResponse(response: any): void {
    if (!this.isActive) return;
    
    try {
      this.client.sendEvent('humanResponse', {
        response,
        timestamp: new Date().toISOString()
      });
      this.updateEventTracking();
      
      if (this.config.logEvents) {
        console.log(`[${this.sessionId}] Human response received`);
      }
    } catch (error) {
      this.handleStreamingError('humanResponse', error, { response });
    }
  }
  
  // Workflow orchestration events
  
  /**
   * Streams workflow start event with identification and metadata.
   * 
   * Indicates the beginning of workflow execution with comprehensive
   * context information and execution parameters.
   * 
   * @param workflowId - Unique workflow identifier
   * @param workflowName - Optional human-readable workflow name
   * 
   * @example
   * ```typescript
   * streamer.streamWorkflowStart(
   *   'workflow-data-pipeline-v2',
   *   'Customer Data Processing Pipeline v2.1'
   * );
   * ```
   */
  streamWorkflowStart(workflowId: string, workflowName?: string): void {
    if (!this.isActive) return;
    
    try {
      this.client.sendEvent('workflowStart', {
        workflowId,
        workflowName,
        timestamp: new Date().toISOString()
      });
      this.updateEventTracking();
      
      if (this.config.logEvents) {
        console.log(`[${this.sessionId}] Workflow started: ${workflowName || workflowId}`);
      }
    } catch (error) {
      this.handleStreamingError('workflowStart', error, { workflowId, workflowName });
    }
  }
  
  /**
   * Streams workflow completion event with final results.
   * 
   * Indicates successful completion of workflow execution with
   * final output data and execution summary.
   * 
   * @param workflowId - Workflow identifier that completed
   * @param result - Optional final workflow result data
   * 
   * @example
   * ```typescript
   * streamer.streamWorkflowEnd('workflow-data-pipeline-v2', {
   *   status: 'completed',
   *   recordsProcessed: 15420,
   *   duration: 45000,
   *   outputLocation: 's3://bucket/processed-data/'
   * });
   * ```
   */
  streamWorkflowEnd(workflowId: string, result?: any): void {
    if (!this.isActive) return;
    
    try {
      this.client.sendEvent('workflowEnd', {
        workflowId,
        result,
        timestamp: new Date().toISOString()
      });
      this.updateEventTracking();
      
      if (this.config.logEvents) {
        console.log(`[${this.sessionId}] Workflow completed: ${workflowId}`);
      }
    } catch (error) {
      this.handleStreamingError('workflowEnd', error, { workflowId, result });
    }
  }
  
  /**
   * Streams workflow progress update event with detailed metrics.
   * 
   * Provides real-time progress information during workflow execution
   * including completion percentage, current operations, and time estimates.
   * 
   * @param workflowId - Workflow identifier for progress update
   * @param progress - Detailed progress information
   * 
   * @example
   * ```typescript
   * streamer.streamWorkflowProgress('workflow-data-pipeline-v2', {
   *   totalNodes: 8,
   *   completedNodes: 5,
   *   currentNode: 'transform-data',
   *   currentNodeName: 'Transform Customer Data',
   *   percentage: 62.5,
   *   estimatedTimeRemaining: 18000
   * });
   * ```
   */
  streamWorkflowProgress(workflowId: string, progress: WorkflowProgress): void {
    if (!this.isActive) return;
    
    try {
      this.client.sendEvent('workflowProgress', {
        workflowId,
        progress,
        timestamp: new Date().toISOString()
      });
      this.updateEventTracking();
      
      if (this.config.logEvents) {
        console.log(`[${this.sessionId}] Workflow progress: ${workflowId} - ${progress.percentage}%`);
      }
    } catch (error) {
      this.handleStreamingError('workflowProgress', error, { workflowId, progress });
    }
  }
  
  // Flowise compatibility events
  
  /**
   * Streams source documents event for RAG applications.
   * 
   * Provides visibility into documents used as context for generation,
   * compatible with Flowise document streaming patterns.
   * 
   * @param documents - Array of source document information
   * 
   * @example
   * ```typescript
   * streamer.streamSourceDocuments([
   *   {
   *     id: 'doc-1',
   *     title: 'Customer Requirements',
   *     url: 'https://docs.company.com/requirements',
   *     relevanceScore: 0.95,
   *     excerpt: 'Customer data processing requirements...'
   *   }
   * ]);
   * ```
   */
  streamSourceDocuments(documents: any[]): void {
    if (!this.isActive) return;
    
    try {
      this.client.sendEvent('sourceDocuments', { documents });
      this.updateEventTracking();
      
      if (this.config.logEvents) {
        console.log(`[${this.sessionId}] Source documents: ${documents.length} documents`);
      }
    } catch (error) {
      this.handleStreamingError('sourceDocuments', error, { documentCount: documents.length });
    }
  }
  
  /**
   * Streams used tools summary event with comprehensive tool usage information.
   * 
   * Provides a summary of all tools used during execution with performance
   * metrics and results, compatible with Flowise patterns.
   * 
   * @param tools - Array of tool usage information
   * 
   * @example
   * ```typescript
   * streamer.streamUsedTools([
   *   {
   *     tool: 'web_search',
   *     input: { query: 'AI developments' },
   *     output: { results: [...] },
   *     duration: 1200
   *   },
   *   {
   *     tool: 'database_query',
   *     input: { query: 'SELECT * FROM users' },
   *     output: { rows: [...] },
   *     duration: 350,
   *     error: 'Connection timeout'
   *   }
   * ]);
   * ```
   */
  streamUsedTools(tools: UsedTool[]): void {
    if (!this.isActive) return;
    
    try {
      this.client.sendEvent('usedTools', { tools });
      this.updateEventTracking();
      
      if (this.config.logEvents) {
        console.log(`[${this.sessionId}] Used tools summary: ${tools.length} tools`);
      }
    } catch (error) {
      this.handleStreamingError('usedTools', error, { toolCount: tools.length });
    }
  }
  
  /**
   * Streams generated artifacts event with file and media information.
   * 
   * Streams files, images, or other artifacts generated during execution
   * for download or display to users.
   * 
   * @param artifacts - Array of generated artifacts
   * 
   * @example
   * ```typescript
   * streamer.streamArtifacts([
   *   {
   *     type: 'csv',
   *     name: 'processed_data.csv',
   *     size: 2048000,
   *     url: '/download/processed_data.csv',
   *     description: 'Processed customer data in CSV format'
   *   },
   *   {
   *     type: 'chart',
   *     name: 'analysis_chart.png',
   *     size: 156000,
   *     url: '/download/analysis_chart.png',
   *     description: 'Data analysis visualization'
   *   }
   * ]);
   * ```
   */
  streamArtifacts(artifacts: any[]): void {
    if (!this.isActive) return;
    
    try {
      this.client.sendEvent('artifacts', { artifacts });
      this.updateEventTracking();
      
      if (this.config.logEvents) {
        console.log(`[${this.sessionId}] Artifacts: ${artifacts.length} artifacts`);
      }
    } catch (error) {
      this.handleStreamingError('artifacts', error, { artifactCount: artifacts.length });
    }
  }
  
  // Custom events
  
  /**
   * Streams custom application-specific event with flexible data payload.
   * 
   * Allows applications to stream custom events not covered by standard
   * event types, providing extensibility for specific use cases.
   * 
   * @param eventType - Custom event type identifier
   * @param data - Custom event data payload
   * 
   * @example
   * ```typescript
   * // Stream custom metrics
   * streamer.streamCustomEvent('model_metrics', {
   *   accuracy: 0.95,
   *   precision: 0.87,
   *   recall: 0.92,
   *   f1Score: 0.89
   * });
   * 
   * // Stream application state
   * streamer.streamCustomEvent('app_state', {
   *   currentUser: 'user-123',
   *   activeFeatures: ['feature-a', 'feature-b'],
   *   memoryUsage: 45.2
   * });
   * ```
   */
  streamCustomEvent(eventType: string, data: any): void {
    if (!this.isActive) return;
    
    try {
      this.client.sendEvent('custom', {
        eventType,
        data,
        timestamp: new Date().toISOString()
      });
      this.updateEventTracking();
      
      if (this.config.logEvents) {
        console.log(`[${this.sessionId}] Custom event: ${eventType}`);
      }
    } catch (error) {
      this.handleStreamingError('custom', error, { eventType, data });
    }
  }
  
  // Connection control
  
  /**
   * Closes the streaming connection gracefully.
   * 
   * Sends a final close event, terminates the underlying SSE connection,
   * and cleans up resources associated with the streaming session.
   * 
   * @example
   * ```typescript
   * // Clean shutdown
   * streamer.close();
   * 
   * // Check if closed
   * if (!streamer.isActive) {
   *   console.log('Streamer connection is closed');
   * }
   * ```
   */
  close(): void {
    if (!this._isActive) return;
    
    const duration = Date.now() - this.startedAt.getTime();
    console.log(`Closing streamer for session ${this.sessionId} (${duration}ms, ${this.eventCount} events)`);
    
    this._isActive = false;
    this.client.close();
  }
  
  /**
   * Gets comprehensive streaming statistics for monitoring.
   * 
   * @returns Detailed streaming statistics object
   */
  getStatistics(): StreamerStatistics {
    const uptime = Date.now() - this.startedAt.getTime();
    
    return {
      sessionId: this.sessionId,
      startedAt: this.startedAt,
      uptime,
      eventCount: this.eventCount,
      eventsPerMinute: uptime > 0 ? Math.round((this.eventCount / uptime) * 60000) : 0,
      lastEventTime: this.lastEventTime,
      isActive: this.isActive,
      clientStatistics: this.client.getStatistics()
    };
  }
  
  // Private helper methods
  
  /**
   * Updates event tracking counters and timestamps.
   * 
   * @private
   */
  private updateEventTracking(): void {
    this.eventCount++;
    this.lastEventTime = Date.now();
  }
  
  /**
   * Handles streaming errors with logging and optional recovery.
   * 
   * @param eventType - Event type that failed to stream
   * @param error - Error that occurred
   * @param context - Additional error context
   * @private
   */
  private handleStreamingError(eventType: string, error: any, context: Record<string, any>): void {
    const errorContext = createStreamingErrorContext(this.sessionId, eventType, context);
    
    console.error(`Streaming error for ${this.sessionId}:`, {
      eventType,
      error: error.message,
      context: errorContext
    });
    
    // Close connection on persistent errors
    if (error instanceof EventStreamingError) {
      this.close();
    }
  }
}

/**
 * Comprehensive streaming statistics for monitoring and debugging.
 * 
 * @public
 */
export interface StreamerStatistics {
  /** Session identifier */
  sessionId: string;
  
  /** Streaming session start time */
  startedAt: Date;
  
  /** Session uptime in milliseconds */
  uptime: number;
  
  /** Total events streamed */
  eventCount: number;
  
  /** Events per minute rate */
  eventsPerMinute: number;
  
  /** Last event timestamp */
  lastEventTime: number;
  
  /** Current active status */
  isActive: boolean;
  
  /** Underlying client statistics */
  clientStatistics: any;
}