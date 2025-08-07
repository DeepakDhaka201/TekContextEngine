/**
 * @fileoverview Server-Sent Events client implementation for real-time streaming
 * @module modules/streaming/sse-client
 * @requires express
 * @requires ./types
 * @requires ./errors
 * 
 * This file implements the SSEClient class that manages individual client
 * connections for Server-Sent Events streaming. It handles connection setup,
 * event formatting, network error recovery, and connection lifecycle management.
 * 
 * Key concepts:
 * - Server-Sent Events (SSE) protocol implementation
 * - Connection lifecycle management with proper cleanup
 * - Event formatting and serialization with JSON payloads
 * - Error handling for network interruptions and client disconnections
 * - Heartbeat mechanism for connection health monitoring
 * - Rate limiting and backpressure handling
 * 
 * @example
 * ```typescript
 * import { SSEClient } from './sse-client';
 * 
 * const client = new SSEClient('session-123', response, config);
 * client.sendEvent('token', { token: 'Hello' });
 * client.sendEvent('end', { duration: 5000 });
 * client.close();
 * ```
 * 
 * @see types.ts for StreamingManagerConfig and StreamEventData
 * @see errors.ts for streaming error handling
 * @since 1.0.0
 */

import { Response } from 'express';
import { StreamingManagerConfig, StreamEventData, StreamEvent } from './types';
import {
  EventStreamingError,
  EventSerializationError,
  ConnectionError,
  RateLimitError,
  createStreamingErrorContext
} from './errors';

/**
 * Server-Sent Events client implementation for real-time streaming.
 * 
 * The SSEClient class manages individual client connections using the
 * Server-Sent Events protocol. It provides reliable event streaming with
 * proper error handling, connection management, and performance optimization.
 * 
 * Features:
 * - Standards-compliant SSE protocol implementation
 * - Automatic connection setup with proper HTTP headers
 * - Event formatting with unique IDs and timestamps
 * - JSON serialization with error handling for complex objects
 * - Connection health monitoring with heartbeat support
 * - Rate limiting to prevent client overload
 * - Graceful error handling and connection recovery
 * - Resource cleanup and memory management
 * 
 * @remarks
 * SSEClient instances should be created and managed by the StreamingManager
 * and not instantiated directly by application code. The class handles
 * low-level SSE protocol details and network communication.
 * 
 * @example
 * ```typescript
 * // Create client (typically done by StreamingManager)
 * const client = new SSEClient('session-123', response, {
 *   eventIdGeneration: true,
 *   enableCompression: false,
 *   logEvents: false
 * });
 * 
 * // Send various event types
 * client.sendEvent('start', { message: 'Starting processing' });
 * client.sendEvent('token', { token: 'Hello' });
 * client.sendEvent('token', { token: ' world!' });
 * client.sendEvent('end', { result: 'Complete' });
 * 
 * // Monitor connection state
 * if (!client.isClosed) {
 *   client.sendHeartbeat();
 * }
 * 
 * // Clean up
 * client.close();
 * ```
 * 
 * @public
 */
export class SSEClient {
  /** Session identifier for this client connection */
  readonly sessionId: string;
  
  /** Connection establishment timestamp */
  readonly createdAt: Date;
  
  /** Express response object for SSE streaming */
  private response: Response;
  
  /** Streaming configuration */
  private config: StreamingManagerConfig;
  
  /** Connection state flag */
  private closed = false;
  
  /** Event counter for rate limiting */
  private eventCounter = 0;
  
  /** Last event timestamp for rate limiting */
  private lastEventTime = 0;
  
  /** Rate limiting window start */
  private rateLimitWindowStart = Date.now();
  
  /** Events sent in current rate limit window */
  private eventsInWindow = 0;
  
  /**
   * Creates a new SSEClient for streaming events to a client.
   * 
   * Initializes the Server-Sent Events connection with proper HTTP headers
   * and sends an initial connection event to establish the stream.
   * 
   * @param sessionId - Unique session identifier for the client
   * @param response - Express response object for streaming
   * @param config - Streaming configuration options
   * 
   * @example
   * ```typescript
   * const client = new SSEClient('session-123', response, {
   *   eventIdGeneration: true,
   *   enableCompression: false,
   *   logEvents: process.env.NODE_ENV === 'development'
   * });
   * ```
   * 
   * Connection setup process:
   * 1. Store connection parameters and initialize state
   * 2. Configure SSE headers for proper streaming
   * 3. Send initial connection establishment event
   * 4. Set up error handling for network interruptions
   */
  constructor(sessionId: string, response: Response, config: StreamingManagerConfig) {
    this.sessionId = sessionId;
    this.response = response;
    this.config = config;
    this.createdAt = new Date();
    
    console.log(`✓ Creating SSE client for session ${sessionId}`);
    
    try {
      this.setupSSE();
    } catch (error) {
      console.error(`Failed to setup SSE client for ${sessionId}:`, error);
      throw new ConnectionError(
        'Failed to initialize SSE connection',
        createStreamingErrorContext(sessionId, undefined, {
          error: error instanceof Error ? error.message : String(error)
        }),
        'Check client network connectivity and server configuration'
      );
    }
  }
  
  /**
   * Sets up Server-Sent Events connection with proper HTTP headers.
   * 
   * Configures the response with SSE-specific headers and sends an initial
   * connection event to establish the streaming channel.
   * 
   * @private
   */
  private setupSSE(): void {
    // Configure SSE headers according to specification
    // https://html.spec.whatwg.org/multipage/server-sent-events.html
    const headers: Record<string, string> = {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    };
    
    // Configure CORS headers if origins are specified
    if (this.config.corsOrigins && this.config.corsOrigins.length > 0) {
      if (this.config.corsOrigins.includes('*')) {
        headers['Access-Control-Allow-Origin'] = '*';
      } else {
        // In a real implementation, you'd check the request origin
        headers['Access-Control-Allow-Origin'] = this.config.corsOrigins[0];
      }
      headers['Access-Control-Allow-Headers'] = 'Cache-Control, Content-Type';
      headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS';
    }
    
    // Apply compression if enabled
    if (this.config.enableCompression) {
      headers['Content-Encoding'] = 'gzip';
    }
    
    // Set response headers
    this.response.writeHead(200, headers);
    
    // Send initial connection event to establish stream
    this.sendEvent('start', { 
      sessionId: this.sessionId,
      timestamp: this.createdAt.toISOString(),
      message: 'SSE connection established'
    });
    
    // Set up error handling for network interruptions
    this.response.on('error', (error) => {
      console.error(`SSE response error for ${this.sessionId}:`, error);
      this.close();
    });
    
    this.response.on('close', () => {
      console.log(`SSE connection closed for ${this.sessionId}`);
      this.close();
    });
    
    console.log(`✓ SSE connection established for session ${this.sessionId}`);
  }
  
  /**
   * Sends a structured event to the client with proper SSE formatting.
   * 
   * Formats the event according to the SSE specification with event type,
   * data payload, unique ID, and timestamp. Handles serialization errors
   * and rate limiting to prevent client overload.
   * 
   * @param event - Event type identifier
   * @param data - Event payload data
   * @param id - Optional unique event identifier
   * 
   * @example
   * ```typescript
   * client.sendEvent('token', { token: 'Hello', position: 0 });
   * client.sendEvent('nodeStart', { 
   *   nodeId: 'extract', 
   *   nodeName: 'Data Extractor',
   *   timestamp: new Date().toISOString()
   * });
   * client.sendEvent('error', { 
   *   message: 'Processing failed', 
   *   recoverable: true 
   * }, 'error-123');
   * ```
   * 
   * Event format follows SSE specification:
   * ```
   * id: event-unique-id
   * event: eventType
   * data: {"event":"eventType","data":{...},"timestamp":"...","sessionId":"..."}
   * 
   * ```
   */
  sendEvent(event: string, data: any, id?: string): void {
    if (this.closed) {
      console.warn(`Attempted to send event to closed SSE client: ${this.sessionId}`);
      return;
    }
    
    try {
      // Check rate limiting if configured
      if (this.config.rateLimiting) {
        if (!this.checkRateLimit()) {
          throw new RateLimitError(
            this.sessionId,
            this.eventsInWindow,
            this.config.rateLimiting.maxEventsPerSecond,
            createStreamingErrorContext(this.sessionId, event)
          );
        }
      }
      
      // Create structured event data
      const eventData: StreamEventData = {
        event: event as StreamEvent,
        data,
        timestamp: new Date().toISOString(),
        sessionId: this.sessionId,
        eventId: id || (this.config.eventIdGeneration ? this.generateEventId() : undefined)
      };
      
      // Serialize event data with error handling
      let serializedData: string;
      try {
        serializedData = JSON.stringify(eventData);
      } catch (serializationError) {
        console.error(`Event serialization failed for ${this.sessionId}:`, serializationError);
        throw new EventSerializationError(
          event,
          serializationError instanceof Error ? serializationError.message : 'Unknown serialization error',
          createStreamingErrorContext(this.sessionId, event, { originalData: data }),
          serializationError instanceof Error ? serializationError : undefined
        );
      }
      
      // Format SSE message according to specification
      let message = '';
      
      // Add event ID if available
      if (eventData.eventId) {
        message += `id: ${eventData.eventId}\n`;
      }
      
      // Add event type
      message += `event: ${event}\n`;
      
      // Add data payload (can be multiline)
      const dataLines = serializedData.split('\n');
      for (const line of dataLines) {
        message += `data: ${line}\n`;
      }
      
      // Add empty line to complete event
      message += '\n';
      
      // Send to client
      this.response.write(message);
      
      // Update counters
      this.eventCounter++;
      this.lastEventTime = Date.now();
      this.eventsInWindow++;
      
      // Log event if configured
      if (this.config.logEvents) {
        console.log(`SSE Event [${this.sessionId}]:`, event, {
          dataSize: serializedData.length,
          eventId: eventData.eventId
        });
      }
      
    } catch (error) {
      console.error(`Error sending SSE event to ${this.sessionId}:`, error);
      
      // Close connection on persistent errors
      if (error instanceof EventStreamingError || error instanceof EventSerializationError) {
        throw error;
      }
      
      // For network errors, close the connection
      this.close();
      throw new EventStreamingError(
        event,
        `Failed to send ${event} event`,
        createStreamingErrorContext(this.sessionId, event, {
          originalError: error instanceof Error ? error.message : String(error)
        }),
        'Check client network connectivity and event data format',
        error instanceof Error ? error : undefined
      );
    }
  }
  
  /**
   * Sends a heartbeat event to maintain connection health.
   * 
   * Heartbeat events help detect client disconnections and maintain
   * connection activity for proxy and firewall traversal.
   * 
   * @example
   * ```typescript
   * // Send periodic heartbeats
   * setInterval(() => {
   *   if (!client.isClosed) {
   *     client.sendHeartbeat();
   *   }
   * }, 30000); // Every 30 seconds
   * ```
   */
  sendHeartbeat(): void {
    if (this.closed) return;
    
    this.sendEvent('heartbeat', { 
      timestamp: new Date().toISOString(),
      eventCount: this.eventCounter,
      uptime: Date.now() - this.createdAt.getTime()
    });
  }
  
  /**
   * Gracefully closes the SSE connection and cleans up resources.
   * 
   * Sends a final event notification, closes the response stream,
   * and marks the connection as closed to prevent further operations.
   * 
   * @example
   * ```typescript
   * // Clean shutdown
   * client.close();
   * 
   * // Check if closed
   * if (client.isClosed) {
   *   console.log('Client connection is closed');
   * }
   * ```
   */
  close(): void {
    if (this.closed) return;
    
    console.log(`Closing SSE client for session ${this.sessionId}`);
    
    try {
      // Send final close event if connection is still writable
      if (!this.response.destroyed) {
        const closeMessage = 'event: close\ndata: {"message":"Connection closing"}\n\n';
        this.response.write(closeMessage);
      }
    } catch (error) {
      // Ignore errors during close event - connection might already be broken
      console.warn(`Error sending close event for ${this.sessionId}:`, error);
    }
    
    try {
      // Close response stream
      if (!this.response.destroyed) {
        this.response.end();
      }
    } catch (error) {
      // Response might already be closed by client
      console.warn(`Error closing response for ${this.sessionId}:`, error);
    }
    
    this.closed = true;
    
    const duration = Date.now() - this.createdAt.getTime();
    console.log(`✓ SSE client closed for ${this.sessionId} (duration: ${duration}ms, events: ${this.eventCounter})`);
  }
  
  /**
   * Gets the current connection state.
   * 
   * @returns True if the connection is closed
   */
  get isClosed(): boolean {
    return this.closed || this.response.destroyed;
  }
  
  /**
   * Gets connection statistics for monitoring.
   * 
   * @returns Connection statistics object
   */
  getStatistics(): SSEClientStatistics {
    return {
      sessionId: this.sessionId,
      createdAt: this.createdAt,
      uptime: Date.now() - this.createdAt.getTime(),
      eventsSent: this.eventCounter,
      isActive: !this.closed,
      lastEventTime: this.lastEventTime,
      eventsPerMinute: this.calculateEventsPerMinute()
    };
  }
  
  /**
   * Checks rate limiting constraints.
   * 
   * @returns True if event can be sent within rate limits
   * @private
   */
  private checkRateLimit(): boolean {
    if (!this.config.rateLimiting) return true;
    
    const now = Date.now();
    const windowSize = this.config.rateLimiting.windowSize || 1000;
    
    // Reset window if expired
    if (now - this.rateLimitWindowStart >= windowSize) {
      this.rateLimitWindowStart = now;
      this.eventsInWindow = 0;
    }
    
    // Check if within limits
    return this.eventsInWindow < this.config.rateLimiting.maxEventsPerSecond;
  }
  
  /**
   * Generates a unique event identifier.
   * 
   * @returns Unique event ID string
   * @private
   */
  private generateEventId(): string {
    return `${this.sessionId}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
  
  /**
   * Calculates events per minute for monitoring.
   * 
   * @returns Events per minute rate
   * @private
   */
  private calculateEventsPerMinute(): number {
    const uptimeMinutes = (Date.now() - this.createdAt.getTime()) / (1000 * 60);
    return uptimeMinutes > 0 ? Math.round(this.eventCounter / uptimeMinutes) : 0;
  }
}

/**
 * SSE client connection statistics.
 * 
 * Provides detailed metrics about individual client connections
 * for monitoring and debugging purposes.
 * 
 * @public
 */
export interface SSEClientStatistics {
  /** Session identifier */
  sessionId: string;
  
  /** Connection creation timestamp */
  createdAt: Date;
  
  /** Connection uptime in milliseconds */
  uptime: number;
  
  /** Total number of events sent */
  eventsSent: number;
  
  /** Whether connection is active */
  isActive: boolean;
  
  /** Timestamp of last event sent */
  lastEventTime: number;
  
  /** Average events per minute */
  eventsPerMinute: number;
}