/**
 * @fileoverview Streaming Manager Module - Main implementation for real-time SSE streaming
 * @module modules/streaming/streaming-manager
 * @requires express
 * @requires events
 * @requires ./types
 * @requires ./sse-client
 * @requires ./sse-streamer
 * @requires ./errors
 * @requires ../registry/types
 * 
 * This file implements the StreamingManager class, providing comprehensive real-time
 * streaming capabilities using Server-Sent Events (SSE). The manager handles multiple
 * concurrent client connections, event routing, workflow orchestration streaming,
 * and integration with human-in-the-loop interactions.
 * 
 * Key concepts:
 * - Multi-client session management with automatic cleanup
 * - Real-time event streaming with Flowise compatibility
 * - Connection health monitoring with heartbeat mechanism
 * - Performance optimization with compression and rate limiting
 * - Comprehensive error handling and recovery
 * - Integration with workflow execution and tool streaming
 * 
 * @example
 * ```typescript
 * import { StreamingManager } from './streaming-manager';
 * 
 * const streamingManager = new StreamingManager({
 *   maxClients: 500,
 *   heartbeatInterval: 30000,
 *   enableCompression: true,
 *   rateLimiting: { maxEventsPerSecond: 100, windowSize: 1000 }
 * });
 * 
 * await streamingManager.initialize();
 * 
 * // Add client connection
 * streamingManager.addClient('session-123', response);
 * 
 * // Stream events
 * streamingManager.streamToken('session-123', 'Processing...');
 * streamingManager.streamWorkflowStart('session-123', 'workflow-1');
 * ```
 * 
 * @see types.ts for IStreamingManager interface and configuration types
 * @see sse-client.ts for individual client connection management
 * @see sse-streamer.ts for session-specific streaming interface
 * @since 1.0.0
 */

import { Response } from 'express';
import { EventEmitter } from 'events';
import { 
  IStreamingManager, 
  IStreamer, 
  StreamingManagerConfig, 
  HumanPromptOptions, 
  WorkflowProgress, 
  UsedTool,
  StreamingStatistics
} from './types';
import { HealthStatus } from '../registry/types';
import { SSEClient } from './sse-client';
import { ServerSentEventStreamer } from './sse-streamer';
import {
  StreamingError,
  ConnectionError,
  ClientLimitError,
  SessionNotFoundError,
  StreamInitializationError,
  createStreamingErrorContext
} from './errors';

/**
 * StreamingManager provides comprehensive real-time streaming capabilities.
 * 
 * The StreamingManager serves as the central orchestrator for all streaming
 * operations in AgentHub. It manages client connections, routes events to
 * appropriate streams, handles connection lifecycle, and provides integration
 * points for workflow execution, tool streaming, and human interactions.
 * 
 * Architecture:
 * - Uses Server-Sent Events (SSE) for real-time communication
 * - Maintains separate maps for clients and streamers for efficient routing
 * - Implements automatic connection cleanup with configurable timeouts
 * - Provides comprehensive event types compatible with Flowise patterns
 * - Supports rate limiting and performance optimization features
 * - Integrates with monitoring and observability systems
 * 
 * Connection Management:
 * - Supports up to configurable maximum concurrent connections
 * - Automatic stale connection cleanup with heartbeat mechanism
 * - Graceful connection termination with proper resource cleanup
 * - Connection state tracking and health monitoring
 * 
 * Event Streaming:
 * - Real-time token streaming for LLM response display
 * - Workflow execution progress with node-level granularity
 * - Tool execution streaming with performance metrics
 * - Human-in-the-loop interaction events with timeout support
 * - Custom event support for application-specific requirements
 * - Flowise-compatible event patterns for seamless integration
 * 
 * @remarks
 * The StreamingManager is designed to be used as a singleton service within
 * the application. It should be initialized once during application startup
 * and registered with the module registry for dependency injection.
 * 
 * @example
 * ```typescript
 * // Initialize with configuration
 * const streamingManager = new StreamingManager({
 *   maxClients: 1000,
 *   connectionTimeout: 300000,
 *   heartbeatInterval: 30000,
 *   enableCompression: true,
 *   rateLimiting: {
 *     maxEventsPerSecond: 100,
 *     windowSize: 1000
 *   }
 * });
 * 
 * await streamingManager.initialize();
 * 
 * // Express route setup
 * app.get('/stream/:sessionId', (req, res) => {
 *   try {
 *     streamingManager.addClient(req.params.sessionId, res);
 *   } catch (error) {
 *     res.status(429).json({ error: 'Too many connections' });
 *   }
 * });
 * 
 * // Stream workflow execution
 * const streamer = streamingManager.getStreamer('session-123');
 * if (streamer?.isActive) {
 *   streamer.streamWorkflowStart('workflow-1', 'Data Processing');
 *   streamer.streamToken('Starting analysis...');
 * }
 * ```
 * 
 * @public
 */
export class StreamingManager extends EventEmitter implements IStreamingManager {
  /** Module name for registry identification */
  readonly name = 'streamingManager';
  
  /** Module version for compatibility tracking */
  readonly version = '1.0.0';
  
  /** Map of active client connections by session ID */
  private clients = new Map<string, SSEClient>();
  
  /** Map of active streamers by session ID */
  private streamers = new Map<string, ServerSentEventStreamer>();
  
  /** Streaming configuration */
  private config: Required<StreamingManagerConfig>;
  
  /** Heartbeat interval timer for connection cleanup */
  private heartbeatInterval?: NodeJS.Timeout;
  
  /** Statistics tracking for monitoring */
  private statistics: StreamingStatistics = {
    activeClients: 0,
    totalEventsStreamed: 0,
    eventsPerSecond: 0,
    averageEventSize: 0,
    memoryUsage: 0,
    clientStats: {
      totalConnections: 0,
      totalDisconnections: 0,
      averageSessionDuration: 0
    },
    errorStats: {
      connectionErrors: 0,
      streamingErrors: 0,
      rateLimitViolations: 0
    }
  };
  
  /** Performance metrics tracking */
  private performanceMetrics = {
    eventsSentInLastSecond: 0,
    lastSecondTimestamp: Date.now(),
    totalBytesStreamed: 0,
    connectionLifetimes: [] as number[]
  };
  
  /**
   * Creates a new StreamingManager with the specified configuration.
   * 
   * Initializes the streaming manager with comprehensive configuration options
   * for connection management, performance optimization, and monitoring.
   * 
   * @param config - Streaming configuration options with sensible defaults
   * 
   * @example
   * ```typescript
   * const streamingManager = new StreamingManager({
   *   maxClients: 500,
   *   connectionTimeout: 300000,
   *   heartbeatInterval: 30000,
   *   enableCompression: true,
   *   eventIdGeneration: true,
   *   rateLimiting: {
   *     maxEventsPerSecond: 50,
   *     windowSize: 1000
   *   },
   *   corsOrigins: ['http://localhost:3000'],
   *   enableMetrics: true,
   *   logEvents: process.env.NODE_ENV === 'development'
   * });
   * ```
   */
  constructor(config: StreamingManagerConfig = {}) {
    super();
    
    // Apply configuration with comprehensive defaults
    this.config = {
      maxClients: config.maxClients ?? 1000,
      connectionTimeout: config.connectionTimeout ?? 300000, // 5 minutes
      heartbeatInterval: config.heartbeatInterval ?? 30000,  // 30 seconds
      enableCompression: config.enableCompression ?? true,
      eventIdGeneration: config.eventIdGeneration ?? true,
      retrySettings: config.retrySettings ?? {
        maxRetries: 3,
        retryDelay: 1000
      },
      corsOrigins: config.corsOrigins ?? ['*'],
      requireAuth: config.requireAuth ?? false,
      rateLimiting: config.rateLimiting ?? {
        maxEventsPerSecond: 100,
        windowSize: 1000
      },
      enableMetrics: config.enableMetrics ?? true,
      logEvents: config.logEvents ?? false
    };
    
    console.log(`✓ StreamingManager created with config:`, {
      maxClients: this.config.maxClients,
      heartbeatInterval: this.config.heartbeatInterval,
      enableMetrics: this.config.enableMetrics
    });
  }
  
  /**
   * Initializes the StreamingManager and starts background processes.
   * 
   * Sets up periodic connection cleanup, metrics collection, and
   * monitoring systems for optimal performance and reliability.
   * 
   * @throws {StreamingError} If initialization fails
   * 
   * @example
   * ```typescript
   * try {
   *   await streamingManager.initialize();
   *   console.log('Streaming manager ready for connections');
   * } catch (error) {
   *   console.error('Failed to initialize streaming:', error);
   *   process.exit(1);
   * }
   * ```
   */
  async initialize(): Promise<void> {
    try {
      // Start heartbeat mechanism for connection health monitoring
      if (this.config.heartbeatInterval > 0) {
        this.heartbeatInterval = setInterval(
          () => this.performMaintenanceTasks(),
          this.config.heartbeatInterval
        );
        console.log(`✓ Heartbeat mechanism started (${this.config.heartbeatInterval}ms interval)`);
      }
      
      // Initialize metrics collection if enabled
      if (this.config.enableMetrics) {
        this.initializeMetricsCollection();
      }
      
      console.log('✓ StreamingManager initialized successfully');
      this.emit('initialized', { timestamp: new Date() });
      
    } catch (error) {
      const streamingError = new StreamInitializationError(
        'initialization',
        'Failed to initialize StreamingManager',
        createStreamingErrorContext('system', 'initialize', {
          error: error instanceof Error ? error.message : String(error)
        }),
        error instanceof Error ? error : undefined
      );
      
      console.error('StreamingManager initialization failed:', streamingError);
      throw streamingError;
    }
  }
  
  /**
   * Returns comprehensive health status with connection metrics.
   * 
   * Provides detailed health information including active connections,
   * performance metrics, error rates, and system resource usage.
   * 
   * @returns Health status with detailed metrics
   * 
   * @example
   * ```typescript
   * const health = await streamingManager.health();
   * console.log('Streaming health:', {
   *   status: health.status,
   *   clients: health.details.activeClients,
   *   eventsPerSecond: health.details.eventsPerSecond
   * });
   * ```
   */
  async health(): Promise<HealthStatus> {
    const now = Date.now();
    const memoryUsage = process.memoryUsage();
    
    // Calculate events per second
    const timeDiff = (now - this.performanceMetrics.lastSecondTimestamp) / 1000;
    if (timeDiff >= 1) {
      this.statistics.eventsPerSecond = this.performanceMetrics.eventsSentInLastSecond / timeDiff;
      this.performanceMetrics.eventsSentInLastSecond = 0;
      this.performanceMetrics.lastSecondTimestamp = now;
    }
    
    // Update statistics
    this.statistics.activeClients = this.clients.size;
    this.statistics.memoryUsage = memoryUsage.heapUsed;
    
    // Calculate average session duration
    if (this.performanceMetrics.connectionLifetimes.length > 0) {
      this.statistics.clientStats.averageSessionDuration = 
        this.performanceMetrics.connectionLifetimes.reduce((a, b) => a + b, 0) / 
        this.performanceMetrics.connectionLifetimes.length;
    }
    
    // Determine health status based on metrics
    const clientUtilization = this.clients.size / this.config.maxClients;
    const hasErrors = this.statistics.errorStats.connectionErrors > 0 || 
                     this.statistics.errorStats.streamingErrors > 0;
    
    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (hasErrors && clientUtilization > 0.9) {
      status = 'unhealthy';
    } else if (hasErrors || clientUtilization > 0.8) {
      status = 'degraded';
    } else {
      status = 'healthy';
    }
    
    return {
      status,
      details: {
        timestamp: new Date(),
        activeClients: this.clients.size,
        maxClients: this.config.maxClients,
        clientUtilization: Math.round(clientUtilization * 100),
        totalEventsStreamed: this.statistics.totalEventsStreamed,
        eventsPerSecond: Math.round(this.statistics.eventsPerSecond),
        averageEventSize: this.statistics.averageEventSize,
        memoryUsage: {
          heapUsed: memoryUsage.heapUsed,
          heapTotal: memoryUsage.heapTotal,
          rss: memoryUsage.rss
        },
        connectionStats: this.statistics.clientStats,
        errorStats: this.statistics.errorStats,
        uptime: process.uptime()
      }
    };
  }
  
  /**
   * Gracefully shuts down all connections and cleans up resources.
   * 
   * Performs comprehensive cleanup including connection termination,
   * timer cleanup, and resource deallocation.
   * 
   * @example
   * ```typescript
   * process.on('SIGTERM', async () => {
   *   console.log('Shutting down streaming manager...');
   *   await streamingManager.cleanup();
   *   process.exit(0);
   * });
   * ```
   */
  async cleanup(): Promise<void> {
    console.log(`Shutting down StreamingManager (${this.clients.size} active connections)`);
    
    // Clear heartbeat timer
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }
    
    // Close all client connections gracefully
    const closePromises: Promise<void>[] = [];
    const clientEntries = Array.from(this.clients.entries());
    for (const [sessionId, client] of clientEntries) {
      closePromises.push(this.gracefulClientDisconnect(sessionId, client));
    }
    
    // Wait for all connections to close (with timeout)
    await Promise.race([
      Promise.all(closePromises),
      new Promise(resolve => setTimeout(resolve, 5000)) // 5 second timeout
    ]);
    
    // Clear all maps
    this.clients.clear();
    this.streamers.clear();
    
    console.log('✓ StreamingManager cleanup completed');
    this.emit('cleanup', { timestamp: new Date() });
  }
  
  // Client Management Methods
  
  /**
   * Adds a new client connection for streaming.
   * 
   * Establishes Server-Sent Events connection with proper headers,
   * creates associated streamer, and sets up connection lifecycle management.
   * 
   * @param sessionId - Unique session identifier
   * @param response - Express response object for SSE streaming
   * @throws {ClientLimitError} If maximum client limit reached
   * @throws {ConnectionError} If connection setup fails
   * 
   * @example
   * ```typescript
   * app.get('/stream/:sessionId', (req, res) => {
   *   try {
   *     streamingManager.addClient(req.params.sessionId, res);
   *   } catch (error) {
   *     if (error instanceof ClientLimitError) {
   *       res.status(429).json({ error: 'Too many connections' });
   *     } else {
   *       res.status(500).json({ error: 'Connection failed' });
   *     }
   *   }
   * });
   * ```
   */
  addClient(sessionId: string, response: Response): void {
    // Remove existing client if present
    this.removeClient(sessionId);
    
    // Check client limit
    if (this.clients.size >= this.config.maxClients) {
      this.statistics.errorStats.connectionErrors++;
      throw new ClientLimitError(
        this.clients.size,
        this.config.maxClients,
        createStreamingErrorContext(sessionId, 'addClient')
      );
    }
    
    try {
      console.log(`Adding streaming client for session ${sessionId}`);
      
      // Create SSE client
      const client = new SSEClient(sessionId, response, this.config);
      this.clients.set(sessionId, client);
      
      // Create streamer for this session
      const streamer = new ServerSentEventStreamer(sessionId, client, this.config);
      this.streamers.set(sessionId, streamer);
      
      // Set up connection lifecycle handlers
      response.on('close', () => {
        console.log(`Client disconnected: ${sessionId}`);
        this.handleClientDisconnect(sessionId);
      });
      
      response.on('error', (error) => {
        console.error(`Client connection error for ${sessionId}:`, error);
        this.statistics.errorStats.connectionErrors++;
        this.removeClient(sessionId);
      });
      
      // Update statistics
      this.statistics.clientStats.totalConnections++;
      
      console.log(`✓ Client added: ${sessionId} (${this.clients.size}/${this.config.maxClients} active)`);
      this.emit('clientAdded', { sessionId, timestamp: new Date() });
      
    } catch (error) {
      this.statistics.errorStats.connectionErrors++;
      
      throw new ConnectionError(
        `Failed to add client for session ${sessionId}`,
        createStreamingErrorContext(sessionId, 'addClient', {
          error: error instanceof Error ? error.message : String(error),
          clientCount: this.clients.size
        }),
        'Check network connectivity and server resources'
      );
    }
  }
  
  /**
   * Removes client connection and cleans up resources.
   * 
   * Gracefully closes the SSE connection, removes streamers,
   * and updates connection statistics.
   * 
   * @param sessionId - Session identifier to remove
   * 
   * @example
   * ```typescript
   * // Manual client removal
   * streamingManager.removeClient('session-123');
   * 
   * // Automatic removal on timeout
   * setTimeout(() => {
   *   streamingManager.removeClient('idle-session');
   * }, 300000);
   * ```
   */
  removeClient(sessionId: string): void {
    const client = this.clients.get(sessionId);
    const streamer = this.streamers.get(sessionId);
    
    if (!client && !streamer) {
      return; // Nothing to remove
    }
    
    console.log(`Removing streaming client: ${sessionId}`);
    
    // Track session duration for statistics
    if (client) {
      const sessionDuration = Date.now() - client.createdAt.getTime();
      this.performanceMetrics.connectionLifetimes.push(sessionDuration);
      
      // Keep only last 100 connection lifetimes for memory efficiency
      if (this.performanceMetrics.connectionLifetimes.length > 100) {
        this.performanceMetrics.connectionLifetimes = 
          this.performanceMetrics.connectionLifetimes.slice(-100);
      }
    }
    
    // Close client connection
    if (client) {
      try {
        client.close();
      } catch (error) {
        console.warn(`Error closing client ${sessionId}:`, error);
      }
      this.clients.delete(sessionId);
    }
    
    // Close streamer
    if (streamer) {
      try {
        streamer.close();
      } catch (error) {
        console.warn(`Error closing streamer ${sessionId}:`, error);
      }
      this.streamers.delete(sessionId);
    }
    
    // Update statistics
    this.statistics.clientStats.totalDisconnections++;
    
    console.log(`✓ Client removed: ${sessionId} (${this.clients.size} remaining)`);
    this.emit('clientRemoved', { sessionId, timestamp: new Date() });
  }
  
  /**
   * Checks if a client connection exists for the session.
   * 
   * @param sessionId - Session identifier to check
   * @returns True if client connection exists and is active
   */
  hasClient(sessionId: string): boolean {
    const client = this.clients.get(sessionId);
    return client !== undefined && !client.isClosed;
  }
  
  /**
   * Gets the current number of active client connections.
   * 
   * @returns Number of active streaming clients
   */
  getClientCount(): number {
    return this.clients.size;
  }
  
  // Core Event Streaming Methods
  
  /**
   * Streams a text token to the client for real-time display.
   * 
   * @param sessionId - Target session identifier
   * @param token - Text token to stream
   * @throws {SessionNotFoundError} If session doesn't exist
   */
  streamToken(sessionId: string, token: string): void {
    const streamer = this.getActiveStreamer(sessionId);
    if (streamer) {
      streamer.streamToken(token);
      this.updateEventMetrics('token', JSON.stringify({ token }).length);
    }
  }
  
  /**
   * Streams execution start event with optional metadata.
   * 
   * @param sessionId - Target session identifier
   * @param metadata - Optional metadata about the execution
   */
  streamStart(sessionId: string, metadata?: any): void {
    const streamer = this.getActiveStreamer(sessionId);
    if (streamer) {
      streamer.streamStart(metadata);
      this.updateEventMetrics('start', JSON.stringify({ metadata }).length);
    }
  }
  
  /**
   * Streams execution completion event.
   * 
   * @param sessionId - Target session identifier
   */
  streamEnd(sessionId: string): void {
    const streamer = this.getActiveStreamer(sessionId);
    if (streamer) {
      streamer.streamEnd();
      this.updateEventMetrics('end', 50); // Estimated size
    }
  }
  
  /**
   * Streams error event with error details.
   * 
   * @param sessionId - Target session identifier
   * @param error - Error information to stream
   */
  streamError(sessionId: string, error: Error): void {
    const streamer = this.getActiveStreamer(sessionId);
    if (streamer) {
      streamer.streamError(error);
      this.updateEventMetrics('error', JSON.stringify({
        message: error.message,
        name: error.name
      }).length);
    }
  }
  
  // Node Execution Event Methods
  
  /**
   * Streams workflow node start event.
   * 
   * @param sessionId - Target session identifier
   * @param nodeId - Unique node identifier
   * @param nodeName - Human-readable node name
   * @param nodeType - Optional node type classification
   */
  streamNodeStart(sessionId: string, nodeId: string, nodeName: string, nodeType?: string): void {
    const streamer = this.getActiveStreamer(sessionId);
    if (streamer) {
      streamer.streamNodeStart(nodeId, nodeName, nodeType);
      this.updateEventMetrics('nodeStart', JSON.stringify({
        nodeId, nodeName, nodeType
      }).length);
    }
  }
  
  /**
   * Streams workflow node completion event.
   * 
   * @param sessionId - Target session identifier
   * @param nodeId - Node identifier that completed
   * @param result - Node execution result data
   * @param duration - Optional execution duration in milliseconds
   */
  streamNodeEnd(sessionId: string, nodeId: string, result: any, duration?: number): void {
    const streamer = this.getActiveStreamer(sessionId);
    if (streamer) {
      streamer.streamNodeEnd(nodeId, result, duration);
      this.updateEventMetrics('nodeEnd', JSON.stringify({
        nodeId, result, duration
      }).length);
    }
  }
  
  /**
   * Streams workflow node error event.
   * 
   * @param sessionId - Target session identifier
   * @param nodeId - Node identifier that failed
   * @param error - Error information
   */
  streamNodeError(sessionId: string, nodeId: string, error: Error): void {
    const streamer = this.getActiveStreamer(sessionId);
    if (streamer) {
      streamer.streamNodeError(nodeId, error);
      this.updateEventMetrics('nodeError', JSON.stringify({
        nodeId, error: { message: error.message, name: error.name }
      }).length);
    }
  }
  
  // Tool Execution Event Methods
  
  /**
   * Streams tool execution start event.
   * 
   * @param sessionId - Target session identifier
   * @param tool - Tool name being called
   * @param input - Input parameters passed to the tool
   */
  streamToolCall(sessionId: string, tool: string, input: any): void {
    const streamer = this.getActiveStreamer(sessionId);
    if (streamer) {
      streamer.streamToolCall(tool, input);
      this.updateEventMetrics('toolCall', JSON.stringify({ tool, input }).length);
    }
  }
  
  /**
   * Streams tool execution result event.
   * 
   * @param sessionId - Target session identifier
   * @param tool - Tool name that was executed
   * @param result - Tool execution result data
   * @param duration - Optional execution duration in milliseconds
   */
  streamToolResult(sessionId: string, tool: string, result: any, duration?: number): void {
    const streamer = this.getActiveStreamer(sessionId);
    if (streamer) {
      streamer.streamToolResult(tool, result, duration);
      this.updateEventMetrics('toolResult', JSON.stringify({
        tool, result, duration
      }).length);
    }
  }
  
  /**
   * Streams tool execution error event.
   * 
   * @param sessionId - Target session identifier
   * @param tool - Tool name that failed
   * @param error - Error information
   */
  streamToolError(sessionId: string, tool: string, error: Error): void {
    const streamer = this.getActiveStreamer(sessionId);
    if (streamer) {
      streamer.streamToolError(tool, error);
      this.updateEventMetrics('toolError', JSON.stringify({
        tool, error: { message: error.message, name: error.name }
      }).length);
    }
  }
  
  // Human Interaction Event Methods
  
  /**
   * Streams human interaction prompt event.
   * 
   * @param sessionId - Target session identifier
   * @param prompt - Human-readable prompt message
   * @param options - Human interaction configuration options
   */
  streamHumanPrompt(sessionId: string, prompt: string, options?: HumanPromptOptions): void {
    const streamer = this.getActiveStreamer(sessionId);
    if (streamer) {
      streamer.streamHumanPrompt(prompt, options);
      this.updateEventMetrics('humanPrompt', JSON.stringify({ prompt, options }).length);
    }
  }
  
  /**
   * Streams human response event.
   * 
   * @param sessionId - Target session identifier
   * @param response - Human-provided response data
   */
  streamHumanResponse(sessionId: string, response: any): void {
    const streamer = this.getActiveStreamer(sessionId);
    if (streamer) {
      streamer.streamHumanResponse(response);
      this.updateEventMetrics('humanResponse', JSON.stringify({ response }).length);
    }
  }
  
  // Workflow Orchestration Event Methods
  
  /**
   * Streams workflow start event.
   * 
   * @param sessionId - Target session identifier
   * @param workflowId - Unique workflow identifier
   * @param workflowName - Optional human-readable workflow name
   */
  streamWorkflowStart(sessionId: string, workflowId: string, workflowName?: string): void {
    const streamer = this.getActiveStreamer(sessionId);
    if (streamer) {
      streamer.streamWorkflowStart(workflowId, workflowName);
      this.updateEventMetrics('workflowStart', JSON.stringify({
        workflowId, workflowName
      }).length);
    }
  }
  
  /**
   * Streams workflow completion event.
   * 
   * @param sessionId - Target session identifier
   * @param workflowId - Workflow identifier that completed
   * @param result - Optional final workflow result data
   */
  streamWorkflowEnd(sessionId: string, workflowId: string, result?: any): void {
    const streamer = this.getActiveStreamer(sessionId);
    if (streamer) {
      streamer.streamWorkflowEnd(workflowId, result);
      this.updateEventMetrics('workflowEnd', JSON.stringify({
        workflowId, result
      }).length);
    }
  }
  
  /**
   * Streams workflow progress update event.
   * 
   * @param sessionId - Target session identifier
   * @param workflowId - Workflow identifier for progress update
   * @param progress - Detailed progress information
   */
  streamWorkflowProgress(sessionId: string, workflowId: string, progress: WorkflowProgress): void {
    const streamer = this.getActiveStreamer(sessionId);
    if (streamer) {
      streamer.streamWorkflowProgress(workflowId, progress);
      this.updateEventMetrics('workflowProgress', JSON.stringify({
        workflowId, progress
      }).length);
    }
  }
  
  // Flowise Compatibility Event Methods
  
  /**
   * Streams source documents event for RAG applications.
   * 
   * @param sessionId - Target session identifier
   * @param documents - Array of source document information
   */
  streamSourceDocuments(sessionId: string, documents: any[]): void {
    const streamer = this.getActiveStreamer(sessionId);
    if (streamer) {
      streamer.streamSourceDocuments(documents);
      this.updateEventMetrics('sourceDocuments', JSON.stringify({ documents }).length);
    }
  }
  
  /**
   * Streams used tools summary event.
   * 
   * @param sessionId - Target session identifier
   * @param tools - Array of tool usage information
   */
  streamUsedTools(sessionId: string, tools: UsedTool[]): void {
    const streamer = this.getActiveStreamer(sessionId);
    if (streamer) {
      streamer.streamUsedTools(tools);
      this.updateEventMetrics('usedTools', JSON.stringify({ tools }).length);
    }
  }
  
  /**
   * Streams generated artifacts event.
   * 
   * @param sessionId - Target session identifier
   * @param artifacts - Array of generated artifacts
   */
  streamArtifacts(sessionId: string, artifacts: any[]): void {
    const streamer = this.getActiveStreamer(sessionId);
    if (streamer) {
      streamer.streamArtifacts(artifacts);
      this.updateEventMetrics('artifacts', JSON.stringify({ artifacts }).length);
    }
  }
  
  // Custom Event Methods
  
  /**
   * Streams custom application-specific event.
   * 
   * @param sessionId - Target session identifier
   * @param eventType - Custom event type identifier
   * @param data - Custom event data payload
   */
  streamCustomEvent(sessionId: string, eventType: string, data: any): void {
    const streamer = this.getActiveStreamer(sessionId);
    if (streamer) {
      streamer.streamCustomEvent(eventType, data);
      this.updateEventMetrics('custom', JSON.stringify({ eventType, data }).length);
    }
  }
  
  // Streamer Management Methods
  
  /**
   * Gets the streamer instance for a session.
   * 
   * @param sessionId - Session identifier
   * @returns Streamer instance or null if not found
   */
  getStreamer(sessionId: string): IStreamer | null {
    return this.streamers.get(sessionId) || null;
  }
  
  /**
   * Creates a new streamer instance for a session.
   * 
   * @param sessionId - Session identifier
   * @returns New streamer instance
   * @throws {SessionNotFoundError} If no client connection exists
   */
  createStreamer(sessionId: string): IStreamer {
    const client = this.clients.get(sessionId);
    if (!client) {
      throw new SessionNotFoundError(
        sessionId,
        createStreamingErrorContext(sessionId, 'createStreamer')
      );
    }
    
    const streamer = new ServerSentEventStreamer(sessionId, client, this.config);
    this.streamers.set(sessionId, streamer);
    
    return streamer;
  }
  
  /**
   * Gets comprehensive streaming statistics.
   * 
   * @returns Current streaming statistics
   */
  getStatistics(): StreamingStatistics {
    return { ...this.statistics };
  }
  
  // Private Helper Methods
  
  /**
   * Gets an active streamer for the session, handling errors gracefully.
   * 
   * @param sessionId - Session identifier
   * @returns Active streamer or null if not available
   * @private
   */
  private getActiveStreamer(sessionId: string): ServerSentEventStreamer | null {
    const streamer = this.streamers.get(sessionId);
    
    if (!streamer) {
      if (this.config.logEvents) {
        console.warn(`No streamer found for session: ${sessionId}`);
      }
      return null;
    }
    
    if (!streamer.isActive) {
      if (this.config.logEvents) {
        console.warn(`Streamer not active for session: ${sessionId}`);
      }
      return null;
    }
    
    return streamer;
  }
  
  /**
   * Updates event metrics for monitoring.
   * 
   * @param eventType - Type of event streamed
   * @param eventSize - Size of event data in bytes
   * @private
   */
  private updateEventMetrics(eventType: string, eventSize: number): void {
    if (!this.config.enableMetrics) return;
    
    this.statistics.totalEventsStreamed++;
    this.performanceMetrics.eventsSentInLastSecond++;
    this.performanceMetrics.totalBytesStreamed += eventSize;
    
    // Update average event size (rolling average)
    this.statistics.averageEventSize = 
      (this.statistics.averageEventSize * 0.9) + (eventSize * 0.1);
  }
  
  /**
   * Handles client disconnection with cleanup and statistics update.
   * 
   * @param sessionId - Session that disconnected
   * @private
   */
  private handleClientDisconnect(sessionId: string): void {
    // Remove from active connections
    this.removeClient(sessionId);
    
    // Emit disconnect event for monitoring
    this.emit('clientDisconnected', { 
      sessionId, 
      timestamp: new Date(),
      remainingClients: this.clients.size 
    });
  }
  
  /**
   * Gracefully disconnects a client with proper cleanup.
   * 
   * @param sessionId - Session identifier
   * @param client - SSE client to disconnect
   * @returns Promise that resolves when cleanup is complete
   * @private
   */
  private async gracefulClientDisconnect(sessionId: string, client: SSEClient): Promise<void> {
    try {
      // Send close notification
      if (!client.isClosed) {
        client.sendEvent('close', { message: 'Server shutting down' });
      }
      
      // Small delay to allow message to be sent
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Close connection
      client.close();
      
    } catch (error) {
      console.warn(`Error during graceful disconnect of ${sessionId}:`, error);
    }
  }
  
  /**
   * Performs periodic maintenance tasks.
   * 
   * Includes stale connection cleanup, metrics updates,
   * and health monitoring.
   * 
   * @private
   */
  private performMaintenanceTasks(): void {
    try {
      // Clean up stale connections
      this.cleanupStaleConnections();
      
      // Send heartbeat to active connections
      if (this.clients.size > 0) {
        this.sendHeartbeats();
      }
      
      // Log performance metrics if enabled
      if (this.config.logEvents && this.clients.size > 0) {
        console.log(`StreamingManager: ${this.clients.size} clients, ${this.statistics.eventsPerSecond.toFixed(1)} events/sec`);
      }
      
    } catch (error) {
      console.error('Error during maintenance tasks:', error);
    }
  }
  
  /**
   * Cleans up stale connections based on timeout configuration.
   * 
   * @private
   */
  private cleanupStaleConnections(): void {
    const now = Date.now();
    const timeout = this.config.connectionTimeout;
    const staleConnections: string[] = [];
    
    const clientEntries = Array.from(this.clients.entries());
    for (const [sessionId, client] of clientEntries) {
      if (now - client.createdAt.getTime() > timeout || client.isClosed) {
        staleConnections.push(sessionId);
      }
    }
    
    if (staleConnections.length > 0) {
      console.log(`Cleaning up ${staleConnections.length} stale connections`);
      for (const sessionId of staleConnections) {
        this.removeClient(sessionId);
      }
    }
  }
  
  /**
   * Sends heartbeat events to all active connections.
   * 
   * @private
   */
  private sendHeartbeats(): void {
    const clients = Array.from(this.clients.values());
    for (const client of clients) {
      if (!client.isClosed) {
        try {
          client.sendHeartbeat();
        } catch (error) {
          console.warn(`Heartbeat failed for ${client.sessionId}:`, error);
        }
      }
    }
  }
  
  /**
   * Initializes metrics collection system.
   * 
   * @private
   */
  private initializeMetricsCollection(): void {
    // Set up periodic metrics reporting
    setInterval(() => {
      this.emit('metrics', {
        timestamp: new Date(),
        statistics: this.getStatistics()
      });
    }, 60000); // Every minute
    
    console.log('✓ Metrics collection initialized');
  }
}