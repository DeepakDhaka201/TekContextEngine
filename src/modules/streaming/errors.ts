/**
 * @fileoverview Error handling system for the Streaming Manager Module
 * @module modules/streaming/errors
 * 
 * This file implements a comprehensive hierarchical error system for the
 * Streaming Manager Module with context preservation, error classification,
 * solution suggestions, and integration with monitoring systems.
 * 
 * Key concepts:
 * - StreamingError: Base error class with rich context and error codes
 * - Hierarchical error types for specific streaming scenarios
 * - Connection lifecycle error handling
 * - Event streaming error classification
 * - Network and client-specific error handling
 * - Integration with observability and monitoring systems
 * 
 * @example
 * ```typescript
 * import { ConnectionError, EventStreamingError } from './errors';
 * 
 * // Connection error
 * throw new ConnectionError(
 *   'Client connection failed',
 *   { sessionId: 'session-123', clientCount: 50 },
 *   'Check client network connectivity and server capacity'
 * );
 * 
 * // Event streaming error
 * throw new EventStreamingError(
 *   'token',
 *   'Failed to stream token event',
 *   { token: 'Hello', sessionId: 'session-123' },
 *   'Verify client connection is active and responsive'
 * );
 * ```
 * 
 * @see types.ts for StreamEventData interface
 * @since 1.0.0
 */

/**
 * Base error class for all Streaming Manager related errors.
 * 
 * Provides a comprehensive error system with:
 * - Structured error codes for programmatic handling
 * - Rich contextual information for debugging
 * - Solution suggestions for common error conditions
 * - Error severity classification for monitoring
 * - Chain of cause preservation for nested errors
 * - Integration with tracing and observability systems
 * 
 * @remarks
 * All errors in the Streaming Manager should extend this base class
 * to ensure consistent error handling and reporting across the system.
 * 
 * @example
 * ```typescript
 * class CustomStreamingError extends StreamingError {
 *   constructor(message: string, context?: Record<string, any>) {
 *     super('CUSTOM_ERROR', message, context, 'Check custom configuration');
 *   }
 * }
 * ```
 * 
 * @public
 */
export class StreamingError extends Error {
  /** Structured error code for programmatic handling */
  public readonly code: string;
  
  /** Rich contextual information for debugging and monitoring */
  public readonly context: Record<string, any>;
  
  /** Human-readable solution suggestion */
  public readonly solution?: string;
  
  /** Error occurrence timestamp */
  public readonly timestamp: Date;
  
  /** Original error that caused this error (if any) */
  public readonly cause?: Error;
  
  /** Error severity level for monitoring and alerting */
  public readonly severity: StreamingErrorSeverity;
  
  /**
   * Creates a new StreamingError with comprehensive error information.
   * 
   * @param code - Structured error code for programmatic handling
   * @param message - Human-readable error message
   * @param context - Additional context information for debugging
   * @param solution - Optional solution suggestion
   * @param severity - Error severity level (defaults to 'error')
   * @param cause - Original error that caused this error
   * 
   * @example
   * ```typescript
   * throw new StreamingError(
   *   'CONNECTION_LIMIT_EXCEEDED',
   *   'Maximum client connections reached',
   *   {
   *     currentClients: 1000,
   *     maxClients: 1000,
   *     sessionId: 'session-123'
   *   },
   *   'Increase max client limit or wait for existing connections to close',
   *   'warning'
   * );
   * ```
   */
  constructor(
    code: string,
    message: string,
    context: Record<string, any> = {},
    solution?: string,
    severity: StreamingErrorSeverity = 'error',
    cause?: Error
  ) {
    super(message);
    
    this.name = this.constructor.name;
    this.code = code;
    this.context = context;
    this.solution = solution;
    this.severity = severity;
    this.timestamp = new Date();
    this.cause = cause;
    
    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, StreamingError.prototype);
  }
  
  /**
   * Converts error to JSON representation for logging and monitoring.
   * 
   * @returns JSON representation of the error
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      context: this.context,
      solution: this.solution,
      severity: this.severity,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
      cause: this.cause ? {
        name: this.cause.name,
        message: this.cause.message,
        stack: this.cause.stack
      } : undefined
    };
  }
  
  /**
   * Creates a formatted error message with context information.
   * 
   * @returns Formatted error message
   */
  toString(): string {
    let result = `${this.name}: ${this.message}`;
    
    if (Object.keys(this.context).length > 0) {
      const contextStr = Object.entries(this.context)
        .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
        .join(', ');
      result += ` [Context: ${contextStr}]`;
    }
    
    if (this.solution) {
      result += ` [Solution: ${this.solution}]`;
    }
    
    return result;
  }
}

/**
 * Error severity levels for monitoring and alerting.
 * 
 * Used to classify error importance and determine appropriate
 * response actions in monitoring and alerting systems.
 * 
 * @public
 */
export type StreamingErrorSeverity = 
  | 'info'        // Informational, no action needed
  | 'warning'     // Warning condition, monitoring recommended
  | 'error'       // Error condition, immediate attention needed
  | 'critical';   // Critical error, service stability at risk

/**
 * Connection management errors.
 * 
 * Thrown when client connection establishment, maintenance,
 * or termination encounters issues.
 * 
 * @public
 */
export class ConnectionError extends StreamingError {
  constructor(
    message: string,
    context: Record<string, any> = {},
    solution?: string
  ) {
    super(
      'CONNECTION_ERROR',
      message,
      context,
      solution || 'Check network connectivity and server capacity',
      'error'
    );
  }
}

/**
 * Client limit exceeded errors.
 * 
 * Thrown when attempting to add clients beyond the configured
 * maximum concurrent connection limit.
 * 
 * @public
 */
export class ClientLimitError extends StreamingError {
  constructor(
    currentClients: number,
    maxClients: number,
    context: Record<string, any> = {}
  ) {
    super(
      'CLIENT_LIMIT_EXCEEDED',
      `Maximum client connections reached: ${currentClients}/${maxClients}`,
      { ...context, currentClients, maxClients },
      'Increase max client limit or wait for existing connections to close',
      'warning'
    );
  }
}

/**
 * Event streaming errors.
 * 
 * Thrown when individual event streaming operations fail due to
 * network issues, serialization problems, or client disconnection.
 * 
 * @public
 */
export class EventStreamingError extends StreamingError {
  /** Event type that failed to stream */
  public readonly eventType: string;
  
  constructor(
    eventType: string,
    message: string,
    context: Record<string, any> = {},
    solution?: string,
    cause?: Error
  ) {
    super(
      'EVENT_STREAMING_ERROR',
      message,
      { ...context, eventType },
      solution || 'Verify client connection is active and event data is valid',
      'error',
      cause
    );
    
    this.eventType = eventType;
  }
}

/**
 * Rate limiting errors.
 * 
 * Thrown when clients exceed configured rate limits for
 * event streaming or connection requests.
 * 
 * @public
 */
export class RateLimitError extends StreamingError {
  constructor(
    sessionId: string,
    eventsPerSecond: number,
    maxEventsPerSecond: number,
    context: Record<string, any> = {}
  ) {
    super(
      'RATE_LIMIT_EXCEEDED',
      `Rate limit exceeded: ${eventsPerSecond}/${maxEventsPerSecond} events/sec`,
      { ...context, sessionId, eventsPerSecond, maxEventsPerSecond },
      'Reduce event streaming frequency or increase rate limits',
      'warning'
    );
  }
}

/**
 * Session not found errors.
 * 
 * Thrown when attempting to stream events to a non-existent
 * or already closed session.
 * 
 * @public
 */
export class SessionNotFoundError extends StreamingError {
  constructor(
    sessionId: string,
    context: Record<string, any> = {}
  ) {
    super(
      'SESSION_NOT_FOUND',
      `Streaming session not found: ${sessionId}`,
      { ...context, sessionId },
      'Verify session ID is correct and connection is active',
      'warning'
    );
  }
}

/**
 * Event serialization errors.
 * 
 * Thrown when event data cannot be properly serialized for
 * streaming to clients, typically due to circular references
 * or invalid data structures.
 * 
 * @public
 */
export class EventSerializationError extends StreamingError {
  constructor(
    eventType: string,
    message: string,
    context: Record<string, any> = {},
    cause?: Error
  ) {
    super(
      'EVENT_SERIALIZATION_ERROR',
      `Failed to serialize ${eventType} event: ${message}`,
      { ...context, eventType },
      'Check event data for circular references and ensure all data is serializable',
      'error',
      cause
    );
  }
}

/**
 * Connection timeout errors.
 * 
 * Thrown when client connections exceed configured timeout
 * limits without activity or proper closure.
 * 
 * @public
 */
export class ConnectionTimeoutError extends StreamingError {
  constructor(
    sessionId: string,
    timeout: number,
    lastActivity: Date,
    context: Record<string, any> = {}
  ) {
    super(
      'CONNECTION_TIMEOUT',
      `Connection timeout for session ${sessionId} after ${timeout}ms`,
      { ...context, sessionId, timeout, lastActivity: lastActivity.toISOString() },
      'Increase connection timeout or implement heartbeat mechanism',
      'info'
    );
  }
}

/**
 * Heartbeat errors.
 * 
 * Thrown when heartbeat mechanisms fail to maintain connection
 * health monitoring or client responsiveness checking.
 * 
 * @public
 */
export class HeartbeatError extends StreamingError {
  constructor(
    message: string,
    context: Record<string, any> = {}
  ) {
    super(
      'HEARTBEAT_ERROR',
      message,
      context,
      'Check heartbeat configuration and client responsiveness',
      'warning'
    );
  }
}

/**
 * Stream initialization errors.
 * 
 * Thrown when Server-Sent Events stream setup fails due to
 * configuration issues or network problems.
 * 
 * @public
 */
export class StreamInitializationError extends StreamingError {
  constructor(
    sessionId: string,
    message: string,
    context: Record<string, any> = {},
    cause?: Error
  ) {
    super(
      'STREAM_INITIALIZATION_ERROR',
      `Failed to initialize stream for ${sessionId}: ${message}`,
      { ...context, sessionId },
      'Check SSE configuration and network connectivity',
      'error',
      cause
    );
  }
}

/**
 * Authentication errors for streaming connections.
 * 
 * Thrown when authentication is required but fails or
 * is not provided for streaming connections.
 * 
 * @public
 */
export class StreamingAuthenticationError extends StreamingError {
  constructor(
    sessionId: string,
    message: string,
    context: Record<string, any> = {}
  ) {
    super(
      'STREAMING_AUTHENTICATION_ERROR',
      `Authentication failed for streaming session ${sessionId}: ${message}`,
      { ...context, sessionId },
      'Provide valid authentication credentials for streaming access',
      'error'
    );
  }
}

/**
 * CORS (Cross-Origin Resource Sharing) errors.
 * 
 * Thrown when streaming connections are blocked due to
 * CORS policy violations.
 * 
 * @public
 */
export class CORSError extends StreamingError {
  constructor(
    origin: string,
    allowedOrigins: string[],
    context: Record<string, any> = {}
  ) {
    super(
      'CORS_ERROR',
      `Origin ${origin} not allowed for streaming connections`,
      { ...context, origin, allowedOrigins },
      'Add origin to allowed CORS origins or update CORS configuration',
      'error'
    );
  }
}

/**
 * Buffer overflow errors.
 * 
 * Thrown when internal streaming buffers exceed capacity
 * limits due to high event volume or slow client consumption.
 * 
 * @public
 */
export class BufferOverflowError extends StreamingError {
  constructor(
    sessionId: string,
    bufferSize: number,
    maxBufferSize: number,
    context: Record<string, any> = {}
  ) {
    super(
      'BUFFER_OVERFLOW',
      `Streaming buffer overflow for ${sessionId}: ${bufferSize}/${maxBufferSize}`,
      { ...context, sessionId, bufferSize, maxBufferSize },
      'Increase buffer size limits or reduce event streaming frequency',
      'warning'
    );
  }
}

/**
 * Type guard to check if an error is a StreamingError.
 * 
 * @param error - Error to check
 * @returns True if error is a StreamingError
 * 
 * @example
 * ```typescript
 * try {
 *   await streamingManager.streamToken('session-123', 'Hello');
 * } catch (error) {
 *   if (isStreamingError(error)) {
 *     console.log('Streaming error:', error.code, error.context);
 *   }
 * }
 * ```
 * 
 * @public
 */
export function isStreamingError(error: any): error is StreamingError {
  return error instanceof StreamingError;
}

/**
 * Creates error context with common streaming information.
 * 
 * Helper function to create standardized error context objects
 * with common streaming information for consistent error reporting.
 * 
 * @param sessionId - Session identifier
 * @param eventType - Optional event type that failed
 * @param additionalContext - Additional context information
 * @returns Standardized error context
 * 
 * @example
 * ```typescript
 * const context = createStreamingErrorContext(
 *   'session-123',
 *   'token',
 *   { clientCount: 50, eventSize: 1024 }
 * );
 * 
 * throw new EventStreamingError(
 *   'token',
 *   'Token streaming failed',
 *   context
 * );
 * ```
 * 
 * @public
 */
export function createStreamingErrorContext(
  sessionId: string,
  eventType?: string,
  additionalContext: Record<string, any> = {}
): Record<string, any> {
  return {
    sessionId,
    eventType,
    timestamp: new Date().toISOString(),
    ...additionalContext
  };
}

/**
 * Gets the severity level of a streaming error.
 * 
 * Determines the appropriate severity level for an error based on
 * its type and context for monitoring and alerting systems.
 * 
 * @param error - Error to evaluate
 * @returns Error severity level
 * 
 * @example
 * ```typescript
 * try {
 *   await streamingManager.addClient('session-123', response);
 * } catch (error) {
 *   const severity = getStreamingErrorSeverity(error);
 *   if (severity === 'critical') {
 *     alerting.triggerAlert('streaming_critical_error', error);
 *   }
 * }
 * ```
 * 
 * @public
 */
export function getStreamingErrorSeverity(error: any): StreamingErrorSeverity {
  if (isStreamingError(error)) {
    return error.severity;
  }
  
  // Default severity based on error type
  if (error instanceof Error) {
    // Network errors are typically warnings
    if (error.message.includes('ECONNRESET') || error.message.includes('EPIPE')) {
      return 'warning';
    }
    
    // Authentication errors are errors
    if (error.message.includes('auth') || error.message.includes('unauthorized')) {
      return 'error';
    }
    
    // System errors are typically critical
    if (error.name.includes('System') || error.message.includes('ENOTFOUND')) {
      return 'critical';
    }
  }
  
  // Unknown errors default to error level
  return 'error';
}

/**
 * Maps streaming errors to HTTP status codes for API responses.
 * 
 * Provides consistent HTTP status code mapping for different
 * streaming error types in API endpoints.
 * 
 * @param error - Error to map
 * @returns Appropriate HTTP status code
 * 
 * @example
 * ```typescript
 * app.get('/stream/:sessionId', (req, res) => {
 *   try {
 *     streamingManager.addClient(req.params.sessionId, res);
 *   } catch (error) {
 *     const statusCode = mapStreamingErrorToHttpStatus(error);
 *     res.status(statusCode).json({ error: error.message });
 *   }
 * });
 * ```
 * 
 * @public
 */
export function mapStreamingErrorToHttpStatus(error: any): number {
  if (isStreamingError(error)) {
    switch (error.code) {
      case 'CONNECTION_ERROR':
        return 503; // Service Unavailable
      
      case 'CLIENT_LIMIT_EXCEEDED':
        return 429; // Too Many Requests
      
      case 'EVENT_STREAMING_ERROR':
        return 500; // Internal Server Error
      
      case 'RATE_LIMIT_EXCEEDED':
        return 429; // Too Many Requests
      
      case 'SESSION_NOT_FOUND':
        return 404; // Not Found
      
      case 'EVENT_SERIALIZATION_ERROR':
        return 422; // Unprocessable Entity
      
      case 'CONNECTION_TIMEOUT':
        return 408; // Request Timeout
      
      case 'HEARTBEAT_ERROR':
        return 502; // Bad Gateway
      
      case 'STREAM_INITIALIZATION_ERROR':
        return 500; // Internal Server Error
      
      case 'STREAMING_AUTHENTICATION_ERROR':
        return 401; // Unauthorized
      
      case 'CORS_ERROR':
        return 403; // Forbidden
      
      case 'BUFFER_OVERFLOW':
        return 507; // Insufficient Storage
      
      default:
        return 500; // Internal Server Error
    }
  }
  
  // Default for unknown errors
  return 500;
}

/**
 * Creates a sanitized error response for API clients.
 * 
 * Produces client-safe error responses that exclude sensitive
 * internal information while preserving useful debugging context.
 * 
 * @param error - Error to sanitize
 * @param includeContext - Whether to include context information
 * @returns Sanitized error response
 * 
 * @example
 * ```typescript
 * app.get('/stream/:sessionId', (req, res) => {
 *   try {
 *     streamingManager.addClient(req.params.sessionId, res);
 *   } catch (error) {
 *     const sanitizedError = sanitizeErrorForClient(error, true);
 *     res.status(500).json(sanitizedError);
 *   }
 * });
 * ```
 * 
 * @public
 */
export function sanitizeErrorForClient(
  error: any, 
  includeContext: boolean = false
): Record<string, any> {
  const baseResponse = {
    error: true,
    message: error.message || 'A streaming error occurred',
    timestamp: new Date().toISOString()
  };
  
  if (isStreamingError(error)) {
    const response: Record<string, any> = {
      ...baseResponse,
      code: error.code,
      severity: error.severity
    };
    
    if (error.solution) {
      response.solution = error.solution;
    }
    
    if (includeContext && error.context) {
      // Filter out sensitive context information
      const sanitizedContext: Record<string, any> = {};
      for (const [key, value] of Object.entries(error.context)) {
        // Exclude potentially sensitive keys
        if (!key.toLowerCase().includes('password') && 
            !key.toLowerCase().includes('token') && 
            !key.toLowerCase().includes('secret') &&
            !key.toLowerCase().includes('auth')) {
          sanitizedContext[key] = value;
        }
      }
      response.context = sanitizedContext;
    }
    
    return response;
  }
  
  return baseResponse;
}

/**
 * Error recovery suggestions based on error types.
 * 
 * Provides automated recovery suggestions for common streaming
 * errors to help with automatic retry and recovery mechanisms.
 * 
 * @public
 */
export const ERROR_RECOVERY_SUGGESTIONS = {
  CONNECTION_ERROR: [
    'Check network connectivity and server status',
    'Retry connection with exponential backoff',
    'Verify firewall and proxy settings',
    'Implement connection pooling for better reliability'
  ],
  
  CLIENT_LIMIT_EXCEEDED: [
    'Increase max client connection limits',
    'Implement connection queueing system',
    'Scale horizontally with multiple streaming instances',
    'Optimize client connection lifecycle management'
  ],
  
  EVENT_STREAMING_ERROR: [
    'Retry with exponential backoff',
    'Check client connection health',
    'Verify event data structure and size',
    'Implement event buffering for resilience'
  ],
  
  RATE_LIMIT_EXCEEDED: [
    'Implement client-side rate limiting',
    'Use event batching to reduce frequency',
    'Increase server-side rate limits if appropriate',
    'Implement priority-based event streaming'
  ],
  
  SESSION_NOT_FOUND: [
    'Verify session lifecycle management',
    'Implement session reconnection logic',
    'Check session timeout configuration',
    'Add session validation before streaming'
  ],
  
  EVENT_SERIALIZATION_ERROR: [
    'Validate event data structure before streaming',
    'Remove circular references from event data',
    'Implement custom serialization for complex objects',
    'Add data sanitization before serialization'
  ],
  
  CONNECTION_TIMEOUT: [
    'Increase connection timeout limits',
    'Implement heartbeat mechanism',
    'Add connection health monitoring',
    'Optimize network configuration'
  ],
  
  STREAMING_AUTHENTICATION_ERROR: [
    'Verify authentication credentials',
    'Implement token refresh mechanism',
    'Check authentication middleware configuration',
    'Add proper error handling for auth failures'
  ],
  
  BUFFER_OVERFLOW: [
    'Increase streaming buffer sizes',
    'Implement backpressure handling',
    'Optimize event processing speed',
    'Add flow control mechanisms'
  ]
} as const;