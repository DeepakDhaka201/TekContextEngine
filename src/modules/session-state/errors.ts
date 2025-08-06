/**
 * @fileoverview Error classes for the Session State system
 * @module modules/session-state/errors
 * @requires None - Pure error definitions
 * 
 * This file defines all custom error classes used throughout the Session State
 * system. These errors provide specific context and actionable solutions
 * for different session-related failure scenarios.
 * 
 * Key concepts:
 * - Hierarchical error structure with base SessionStateError
 * - Specific error types for different session operations
 * - Actionable error messages with recovery suggestions
 * - Context preservation for debugging and monitoring
 * - Error codes for programmatic handling
 * 
 * @example
 * ```typescript
 * import { SessionCreationError } from './errors';
 * 
 * throw new SessionCreationError(
 *   'user-123',
 *   'Database connection failed during session creation',
 *   connectionError,
 *   { userId: 'user-123', config: sessionConfig }
 * );
 * ```
 * 
 * @since 1.0.0
 */

/**
 * Base error class for all session state related errors.
 * 
 * Provides a consistent foundation for all session errors with context
 * preservation, error codes, and suggested solutions for recovery.
 * 
 * Features:
 * - Session-specific error codes for identification
 * - Context object for debugging information
 * - Optional solution suggestions for recovery
 * - Proper error chaining with cause preservation
 * - Structured metadata for error reporting
 * - Integration with monitoring and logging systems
 * 
 * @example
 * ```typescript
 * const error = new SessionStateError(
 *   'SESSION_001',
 *   'Session operation failed',
 *   { sessionId: 'sess-123', operation: 'create' },
 *   'Check database connectivity and retry',
 *   originalError
 * );
 * 
 * console.log(error.code);     // 'SESSION_001'
 * console.log(error.context);  // { sessionId: 'sess-123', operation: 'create' }
 * console.log(error.solution); // 'Check database connectivity and retry'
 * ```
 * 
 * @public
 */
export class SessionStateError extends Error {
  /** Error code for programmatic identification */
  public readonly code: string;
  
  /** Context information for debugging */
  public readonly context: Record<string, any>;
  
  /** Optional solution suggestion */
  public readonly solution?: string;
  
  /** Timestamp when error occurred */
  public readonly timestamp: Date;
  
  /** Original error that caused this error (if any) */
  public readonly cause?: Error;
  
  /** Session ID if applicable */
  public readonly sessionId?: string;
  
  /**
   * Creates a new SessionStateError instance.
   * 
   * @param code - Unique error code for identification
   * @param message - Human-readable error message
   * @param context - Context information for debugging (default: {})
   * @param solution - Optional solution suggestion
   * @param cause - Original error that caused this error
   * 
   * @example
   * ```typescript
   * throw new SessionStateError(
   *   'SESSION_STORAGE_ERROR',
   *   'Failed to save session data to Redis',
   *   { sessionId: 'sess-456', operation: 'save', backend: 'redis' },
   *   'Verify Redis connection and check for sufficient memory',
   *   redisError
   * );
   * ```
   */
  constructor(
    code: string,
    message: string,
    context: Record<string, any> = {},
    solution?: string,
    cause?: Error
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.context = context;
    this.solution = solution;
    this.timestamp = new Date();
    this.cause = cause;
    this.sessionId = context.sessionId;
    
    // Maintain proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);
    
    // Capture stack trace if available
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
  
  /**
   * Creates a JSON representation of the error.
   * 
   * Useful for logging, error reporting, and API responses.
   * 
   * @returns JSON-serializable error object
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      sessionId: this.sessionId,
      context: this.context,
      solution: this.solution,
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
   * Creates a detailed error description for logging.
   * 
   * @returns Formatted error description with context
   */
  toString(): string {
    let result = `${this.name} [${this.code}]: ${this.message}`;
    
    if (this.sessionId) {
      result += `\nSession ID: ${this.sessionId}`;
    }
    
    if (Object.keys(this.context).length > 0) {
      result += `\nContext: ${JSON.stringify(this.context, null, 2)}`;
    }
    
    if (this.solution) {
      result += `\nSolution: ${this.solution}`;
    }
    
    if (this.cause) {
      result += `\nCause: ${this.cause.message}`;
    }
    
    return result;
  }
}

/**
 * Error thrown when session creation fails.
 * 
 * This error occurs during the session creation process when configuration
 * validation, storage operations, or resource allocation fails.
 * 
 * Common causes:
 * - Invalid session configuration
 * - Database connection failures
 * - Storage quota exceeded
 * - User authentication issues
 * 
 * @example
 * ```typescript
 * throw new SessionCreationError(
 *   'user-789',
 *   'Storage quota exceeded for user',
 *   quotaError,
 *   { 
 *     userId: 'user-789',
 *     requestedStorage: 1000000,
 *     availableStorage: 500000,
 *     backend: 'redis'
 *   }
 * );
 * ```
 */
export class SessionCreationError extends SessionStateError {
  constructor(
    userId: string,
    message: string,
    cause?: Error,
    context: Record<string, any> = {}
  ) {
    super(
      'SESSION_CREATION_FAILED',
      `Session creation failed for user '${userId}': ${message}`,
      {
        userId,
        operation: 'create',
        ...context
      },
      'Verify user permissions, check storage availability, and ensure all ' +
      'required configuration parameters are provided. Review storage backend health.',
      cause
    );
  }
}

/**
 * Error thrown when session retrieval fails.
 * 
 * Occurs when attempting to load a session from storage due to
 * storage failures, corruption, or access permission issues.
 * 
 * Common causes:
 * - Session not found in storage
 * - Corrupted session data
 * - Storage backend unavailable
 * - Insufficient read permissions
 * 
 * @example
 * ```typescript
 * throw new SessionRetrievalError(
 *   'sess-101',
 *   'Session data corrupted in storage',
 *   corruptionError,
 *   { 
 *     sessionId: 'sess-101',
 *     backend: 'database',
 *     corruptionType: 'invalid-json',
 *     lastValidAccess: lastAccessTime
 *   }
 * );
 * ```
 */
export class SessionRetrievalError extends SessionStateError {
  constructor(
    sessionId: string,
    message: string,
    cause?: Error,
    context: Record<string, any> = {}
  ) {
    super(
      'SESSION_RETRIEVAL_FAILED',
      `Failed to retrieve session '${sessionId}': ${message}`,
      {
        sessionId,
        operation: 'retrieve',
        ...context
      },
      'Verify session ID is correct, check storage backend connectivity, and ' +
      'ensure session has not been deleted or archived. Consider session recovery options.',
      cause
    );
  }
}

/**
 * Error thrown when session update operations fail.
 * 
 * Occurs when attempting to modify session data, metadata, or configuration
 * and the operation cannot be completed successfully.
 * 
 * Common causes:
 * - Concurrent modification conflicts
 * - Invalid update data
 * - Storage write failures
 * - Session in read-only state
 * 
 * @example
 * ```typescript
 * throw new SessionUpdateError(
 *   'sess-202',
 *   'Concurrent modification detected',
 *   conflictError,
 *   { 
 *     sessionId: 'sess-202',
 *     operation: 'updateMetadata',
 *     conflictingField: 'updatedAt',
 *     expectedVersion: 5,
 *     actualVersion: 7
 *   }
 * );
 * ```
 */
export class SessionUpdateError extends SessionStateError {
  constructor(
    sessionId: string,
    message: string,
    cause?: Error,
    context: Record<string, any> = {}
  ) {
    super(
      'SESSION_UPDATE_FAILED',
      `Failed to update session '${sessionId}': ${message}`,
      {
        sessionId,
        operation: 'update',
        ...context
      },
      'Refresh session data and retry the operation. Check for concurrent modifications ' +
      'and ensure session is not in a read-only or archived state.',
      cause
    );
  }
}

/**
 * Error thrown when session deletion fails.
 * 
 * Occurs when attempting to delete a session and associated data
 * but the operation cannot be completed successfully.
 * 
 * Common causes:
 * - Session dependencies exist
 * - Storage deletion failures
 * - Insufficient delete permissions
 * - Session already deleted
 * 
 * @example
 * ```typescript
 * throw new SessionDeletionError(
 *   'sess-303',
 *   'Cannot delete session with active dependencies',
 *   dependencyError,
 *   { 
 *     sessionId: 'sess-303',
 *     dependencies: ['memory-store-1', 'active-agent-2'],
 *     deletionType: 'hard',
 *     cascadeDelete: false
 *   }
 * );
 * ```
 */
export class SessionDeletionError extends SessionStateError {
  constructor(
    sessionId: string,
    message: string,
    cause?: Error,
    context: Record<string, any> = {}
  ) {
    super(
      'SESSION_DELETION_FAILED',
      `Failed to delete session '${sessionId}': ${message}`,
      {
        sessionId,
        operation: 'delete',
        ...context
      },
      'Ensure session exists and is not in use. Check for active dependencies ' +
      'and consider using cascade deletion if appropriate. Verify deletion permissions.',
      cause
    );
  }
}

/**
 * Error thrown when conversation history operations fail.
 * 
 * Occurs when manipulating conversation turns, including adding,
 * updating, retrieving, or deleting conversation history.
 * 
 * Common causes:
 * - Invalid turn data
 * - History size limits exceeded
 * - Turn sequence conflicts
 * - Storage serialization errors
 * 
 * @example
 * ```typescript
 * throw new ConversationHistoryError(
 *   'sess-404',
 *   'addTurn',
 *   'Maximum history length exceeded',
 *   limitError,
 *   { 
 *     sessionId: 'sess-404',
 *     operation: 'addTurn',
 *     currentLength: 1000,
 *     maxLength: 1000,
 *     turnSize: 2048
 *   }
 * );
 * ```
 */
export class ConversationHistoryError extends SessionStateError {
  constructor(
    sessionId: string,
    operation: string,
    message: string,
    cause?: Error,
    context: Record<string, any> = {}
  ) {
    super(
      'CONVERSATION_HISTORY_ERROR',
      `Conversation history operation '${operation}' failed for session '${sessionId}': ${message}`,
      {
        sessionId,
        operation,
        historyOperation: operation,
        ...context
      },
      'Check conversation history limits, validate turn data format, and ensure ' +
      'session has sufficient storage capacity. Consider archiving old turns.',
      cause
    );
  }
}

/**
 * Error thrown when session context operations fail.
 * 
 * Occurs when manipulating session context data, including
 * getting, setting, or deleting context values.
 * 
 * Common causes:
 * - Context size limits exceeded
 * - Invalid context data types
 * - Serialization/deserialization errors
 * - Context key conflicts
 * 
 * @example
 * ```typescript
 * throw new SessionContextError(
 *   'sess-505',
 *   'setContext',
 *   'Context data too large for storage',
 *   sizeError,
 *   { 
 *     sessionId: 'sess-505',
 *     contextKey: 'largeObject',
 *     dataSize: 5000000,
 *     maxSize: 1000000,
 *     backend: 'redis'
 *   }
 * );
 * ```
 */
export class SessionContextError extends SessionStateError {
  constructor(
    sessionId: string,
    operation: string,
    message: string,
    cause?: Error,
    context: Record<string, any> = {}
  ) {
    super(
      'SESSION_CONTEXT_ERROR',
      `Session context operation '${operation}' failed for session '${sessionId}': ${message}`,
      {
        sessionId,
        operation,
        contextOperation: operation,
        ...context
      },
      'Verify context data size and format. Consider breaking large objects into ' +
      'smaller chunks or using external storage references for large data.',
      cause
    );
  }
}

/**
 * Error thrown when session validation fails.
 * 
 * Occurs when session data, configuration, or metadata doesn't
 * meet the required schema or business rules.
 * 
 * Common causes:
 * - Invalid configuration parameters
 * - Missing required fields
 * - Schema validation failures
 * - Business rule violations
 * 
 * @example
 * ```typescript
 * throw new SessionValidationError(
 *   'sess-606',
 *   'Invalid session configuration',
 *   'maxHistoryLength',
 *   -100,
 *   {
 *     sessionId: 'sess-606',
 *     field: 'maxHistoryLength',
 *     expectedType: 'positive integer',
 *     actualValue: -100,
 *     validationRule: 'must be positive'
 *   }
 * );
 * ```
 */
export class SessionValidationError extends SessionStateError {
  constructor(
    sessionId: string,
    message: string,
    field: string,
    value: any,
    context: Record<string, any> = {}
  ) {
    super(
      'SESSION_VALIDATION_FAILED',
      `Session validation failed for '${sessionId}': ${message}`,
      {
        sessionId,
        validationField: field,
        invalidValue: value,
        ...context
      },
      'Review session configuration and data against the expected schema. ' +
      'Ensure all required fields are provided and meet validation rules.'
    );
  }
}

/**
 * Error thrown when session storage operations fail.
 * 
 * Occurs when interacting with the underlying storage backend
 * for session persistence operations.
 * 
 * Common causes:
 * - Storage backend unavailable
 * - Network connectivity issues
 * - Authentication/authorization failures
 * - Storage capacity exceeded
 * 
 * @example
 * ```typescript
 * throw new SessionStorageError(
 *   'redis',
 *   'save',
 *   'Redis connection timeout',
 *   timeoutError,
 *   { 
 *     backend: 'redis',
 *     operation: 'save',
 *     timeout: 5000,
 *     retryAttempts: 3,
 *     lastError: 'ECONNREFUSED'
 *   }
 * );
 * ```
 */
export class SessionStorageError extends SessionStateError {
  constructor(
    backend: string,
    operation: string,
    message: string,
    cause?: Error,
    context: Record<string, any> = {}
  ) {
    super(
      'SESSION_STORAGE_ERROR',
      `Session storage operation '${operation}' failed on '${backend}' backend: ${message}`,
      {
        storageBackend: backend,
        storageOperation: operation,
        ...context
      },
      'Check storage backend health and connectivity. Verify authentication credentials ' +
      'and ensure sufficient storage capacity. Consider implementing retry logic with exponential backoff.',
      cause
    );
  }
}

/**
 * Error thrown when session expiration handling fails.
 * 
 * Occurs when dealing with expired sessions, session cleanup,
 * or expiration time management.
 * 
 * Common causes:
 * - Clock synchronization issues
 * - Invalid expiration dates
 * - Cleanup process failures
 * - Timezone handling errors
 * 
 * @example
 * ```typescript
 * throw new SessionExpirationError(
 *   'sess-707',
 *   'Cannot extend expired session',
 *   expirationError,
 *   { 
 *     sessionId: 'sess-707',
 *     currentTime: new Date(),
 *     expiredAt: expiredTimestamp,
 *     requestedExtension: 3600000,
 *     status: 'expired'
 *   }
 * );
 * ```
 */
export class SessionExpirationError extends SessionStateError {
  constructor(
    sessionId: string,
    message: string,
    cause?: Error,
    context: Record<string, any> = {}
  ) {
    super(
      'SESSION_EXPIRATION_ERROR',
      `Session expiration error for '${sessionId}': ${message}`,
      {
        sessionId,
        operation: 'expiration-handling',
        ...context
      },
      'Verify system time synchronization and expiration policies. Consider session ' +
      'recovery options or creating a new session if extension is not possible.',
      cause
    );
  }
}

/**
 * Error thrown when session capacity limits are exceeded.
 * 
 * Occurs when session operations would exceed configured limits
 * for storage, history length, or other capacity constraints.
 * 
 * Common causes:
 * - History length limits exceeded
 * - Context size limits exceeded
 * - User session count limits exceeded
 * - Storage quota exhausted
 * 
 * @example
 * ```typescript
 * throw new SessionCapacityError(
 *   'user-808',
 *   'concurrent-sessions',
 *   10,
 *   11,
 *   {
 *     userId: 'user-808',
 *     resource: 'concurrent-sessions',
 *     limit: 10,
 *     currentUsage: 10,
 *     attemptedIncrease: 1
 *   }
 * );
 * ```
 */
export class SessionCapacityError extends SessionStateError {
  constructor(
    identifier: string,
    resource: string,
    limit: number,
    attempted: number,
    context: Record<string, any> = {}
  ) {
    super(
      'SESSION_CAPACITY_EXCEEDED',
      `Session capacity exceeded for '${identifier}' - '${resource}': limit ${limit}, attempted ${attempted}`,
      {
        identifier,
        resource,
        limit,
        attempted,
        ...context
      },
      'Consider increasing capacity limits, implementing data archival, or ' +
      'cleaning up unused sessions and data to free capacity.'
    );
  }
}

/**
 * Error thrown when session archival operations fail.
 * 
 * Occurs when attempting to archive sessions or when working
 * with archived session data.
 * 
 * Common causes:
 * - Archival storage unavailable
 * - Compression failures
 * - Index update failures
 * - Metadata corruption
 * 
 * @example
 * ```typescript
 * throw new SessionArchivalError(
 *   'sess-909',
 *   'archive',
 *   'Compression failed during archival',
 *   compressionError,
 *   { 
 *     sessionId: 'sess-909',
 *     operation: 'archive',
 *     dataSize: 1000000,
 *     compressionAlgorithm: 'gzip',
 *     stage: 'compression'
 *   }
 * );
 * ```
 */
export class SessionArchivalError extends SessionStateError {
  constructor(
    sessionId: string,
    operation: string,
    message: string,
    cause?: Error,
    context: Record<string, any> = {}
  ) {
    super(
      'SESSION_ARCHIVAL_ERROR',
      `Session archival operation '${operation}' failed for '${sessionId}': ${message}`,
      {
        sessionId,
        archivalOperation: operation,
        ...context
      },
      'Check archival storage health and capacity. Verify compression settings and ' +
      'ensure sufficient permissions for archival operations. Consider manual intervention.',
      cause
    );
  }
}

/**
 * Utility function to determine if an error is session-related.
 * 
 * @param error - Error to check
 * @returns True if error is an instance of SessionStateError
 * 
 * @example
 * ```typescript
 * try {
 *   await sessionState.createSession(config);
 * } catch (error) {
 *   if (isSessionStateError(error)) {
 *     console.log('Session error code:', error.code);
 *     console.log('Session ID:', error.sessionId);
 *     console.log('Suggested solution:', error.solution);
 *   } else {
 *     console.log('Unexpected error:', error.message);
 *   }
 * }
 * ```
 */
export function isSessionStateError(error: any): error is SessionStateError {
  return error instanceof SessionStateError;
}

/**
 * Utility function to create error context from session and operation data.
 * 
 * Extracts relevant information to include in error objects for better
 * debugging and monitoring.
 * 
 * @param sessionData - Session-related data
 * @param operation - Operation being performed
 * @returns Context object suitable for error reporting
 * 
 * @example
 * ```typescript
 * try {
 *   await storage.saveSession(session);
 * } catch (error) {
 *   throw new SessionStorageError(
 *     'database',
 *     'save',
 *     'Database write failed',
 *     error,
 *     createSessionErrorContext(session, 'save')
 *   );
 * }
 * ```
 */
export function createSessionErrorContext(
  sessionData: any,
  operation: string,
  additionalContext: Record<string, any> = {}
): Record<string, any> {
  return {
    sessionId: sessionData?.id,
    userId: sessionData?.userId,
    operation,
    timestamp: new Date().toISOString(),
    sessionStatus: sessionData?.status,
    sessionSize: JSON.stringify(sessionData || {}).length,
    ...additionalContext
  };
}

/**
 * Error severity levels for categorizing session errors.
 */
export enum SessionErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Utility function to determine error severity based on error type and context.
 * 
 * @param error - Session state error
 * @returns Error severity level
 * 
 * @example
 * ```typescript
 * const error = new SessionStorageError('redis', 'save', 'Connection failed');
 * const severity = getSessionErrorSeverity(error);
 * 
 * if (severity === SessionErrorSeverity.CRITICAL) {
 *   // Alert operations team
 *   sendAlert(error);
 * }
 * ```
 */
export function getSessionErrorSeverity(error: SessionStateError): SessionErrorSeverity {
  // Critical errors - affect system availability
  if (error.code.includes('STORAGE_ERROR') || 
      error.code.includes('CREATION_FAILED')) {
    return SessionErrorSeverity.CRITICAL;
  }
  
  // High errors - affect user experience significantly
  if (error.code.includes('RETRIEVAL_FAILED') || 
      error.code.includes('CAPACITY_EXCEEDED')) {
    return SessionErrorSeverity.HIGH;
  }
  
  // Medium errors - affect functionality but recoverable
  if (error.code.includes('UPDATE_FAILED') || 
      error.code.includes('VALIDATION_FAILED')) {
    return SessionErrorSeverity.MEDIUM;
  }
  
  // Low errors - minor issues or expected failures
  return SessionErrorSeverity.LOW;
}