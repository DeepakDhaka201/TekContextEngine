/**
 * @fileoverview Error handling system for the Human-in-the-Loop Module
 * @module modules/human-loop/errors
 * 
 * This file implements a comprehensive hierarchical error system for the
 * Human-in-the-Loop Module with context preservation, error classification,
 * solution suggestions, and integration with monitoring systems.
 * 
 * Key concepts:
 * - HumanLoopError: Base error class with rich context and error codes
 * - Hierarchical error types for specific interaction scenarios
 * - Interaction lifecycle error handling (creation, response, timeout)
 * - Validation error handling for input constraints
 * - Auto-approval error handling for rule evaluation
 * - Integration with observability and monitoring systems
 * 
 * @example
 * ```typescript
 * import { InteractionTimeoutError, ValidationError } from './errors';
 * 
 * // Interaction timeout error
 * throw new InteractionTimeoutError(
 *   'interaction-123',
 *   300000,
 *   { sessionId: 'session-456', interactionType: 'approval' }
 * );
 * 
 * // Validation error
 * throw new ValidationError(
 *   'email',
 *   'invalid@',
 *   'Input does not match email pattern',
 *   { pattern: '^[^@]+@[^@]+\\.[^@]+$' }
 * );
 * ```
 * 
 * @see types.ts for InteractionState and related interfaces
 * @since 1.0.0
 */

/**
 * Base error class for all Human-in-the-Loop Module related errors.
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
 * All errors in the Human-in-the-Loop Module should extend this base class
 * to ensure consistent error handling and reporting across the system.
 * 
 * @example
 * ```typescript
 * class CustomHumanLoopError extends HumanLoopError {
 *   constructor(message: string, context?: Record<string, any>) {
 *     super('CUSTOM_ERROR', message, context, 'Check custom configuration');
 *   }
 * }
 * ```
 * 
 * @public
 */
export class HumanLoopError extends Error {
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
  public readonly severity: HumanLoopErrorSeverity;
  
  /**
   * Creates a new HumanLoopError with comprehensive error information.
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
   * throw new HumanLoopError(
   *   'INTERACTION_LIMIT_EXCEEDED',
   *   'Maximum concurrent interactions reached',
   *   {
   *     currentInteractions: 10,
   *     maxInteractions: 10,
   *     sessionId: 'session-123'
   *   },
   *   'Wait for existing interactions to complete or increase limit',
   *   'warning'
   * );
   * ```
   */
  constructor(
    code: string,
    message: string,
    context: Record<string, any> = {},
    solution?: string,
    severity: HumanLoopErrorSeverity = 'error',
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
    Object.setPrototypeOf(this, HumanLoopError.prototype);
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
export type HumanLoopErrorSeverity = 
  | 'info'        // Informational, no action needed
  | 'warning'     // Warning condition, monitoring recommended
  | 'error'       // Error condition, immediate attention needed
  | 'critical';   // Critical error, service stability at risk

/**
 * Interaction creation and lifecycle errors.
 * 
 * Thrown when interaction creation, state management,
 * or lifecycle operations encounter issues.
 * 
 * @public
 */
export class InteractionError extends HumanLoopError {
  constructor(
    interactionId: string,
    operation: string,
    message: string,
    context: Record<string, any> = {},
    solution?: string
  ) {
    super(
      'INTERACTION_ERROR',
      `Interaction ${operation} failed: ${message}`,
      { ...context, interactionId, operation },
      solution || 'Check interaction state and retry operation',
      'error'
    );
  }
}

/**
 * Interaction timeout errors.
 * 
 * Thrown when interactions exceed configured timeout limits
 * without receiving a human response.
 * 
 * @public
 */
export class InteractionTimeoutError extends HumanLoopError {
  constructor(
    interactionId: string,
    timeout: number,
    context: Record<string, any> = {}
  ) {
    super(
      'INTERACTION_TIMEOUT',
      `Interaction ${interactionId} timed out after ${timeout}ms`,
      { ...context, interactionId, timeout },
      'Increase timeout value or implement fallback handling',
      'warning'
    );
  }
}

/**
 * Interaction cancellation errors.
 * 
 * Thrown when interactions cannot be cancelled due to
 * state constraints or system issues.
 * 
 * @public
 */
export class InteractionCancellationError extends HumanLoopError {
  constructor(
    interactionId: string,
    currentStatus: string,
    context: Record<string, any> = {}
  ) {
    super(
      'INTERACTION_CANCELLATION_ERROR',
      `Cannot cancel interaction ${interactionId} in status ${currentStatus}`,
      { ...context, interactionId, currentStatus },
      'Check interaction status before attempting cancellation',
      'error'
    );
  }
}

/**
 * Interaction not found errors.
 * 
 * Thrown when attempting to operate on non-existent interactions
 * or interactions that have been cleaned up.
 * 
 * @public
 */
export class InteractionNotFoundError extends HumanLoopError {
  constructor(
    interactionId: string,
    context: Record<string, any> = {}
  ) {
    super(
      'INTERACTION_NOT_FOUND',
      `Interaction not found: ${interactionId}`,
      { ...context, interactionId },
      'Verify interaction ID exists and has not expired',
      'warning'
    );
  }
}

/**
 * Input validation errors.
 * 
 * Thrown when human-provided input fails validation rules
 * or does not meet specified constraints.
 * 
 * @public
 */
export class ValidationError extends HumanLoopError {
  constructor(
    field: string,
    value: any,
    message: string,
    context: Record<string, any> = {},
    cause?: Error
  ) {
    super(
      'VALIDATION_ERROR',
      `Validation failed for field '${field}': ${message}`,
      { ...context, field, value, validationMessage: message },
      'Provide input that meets validation requirements',
      'error',
      cause
    );
  }
}

/**
 * Rate limiting errors.
 * 
 * Thrown when interaction requests exceed configured rate limits
 * for session or system-wide constraints.
 * 
 * @public
 */
export class RateLimitError extends HumanLoopError {
  constructor(
    sessionId: string,
    requestCount: number,
    maxRequests: number,
    context: Record<string, any> = {}
  ) {
    super(
      'RATE_LIMIT_EXCEEDED',
      `Rate limit exceeded for session ${sessionId}: ${requestCount}/${maxRequests} requests`,
      { ...context, sessionId, requestCount, maxRequests },
      'Reduce interaction frequency or increase rate limits',
      'warning'
    );
  }
}

/**
 * Auto-approval engine errors.
 * 
 * Thrown when auto-approval rule evaluation fails or
 * encounters configuration issues.
 * 
 * @public
 */
export class AutoApprovalError extends HumanLoopError {
  constructor(
    ruleId: string,
    message: string,
    context: Record<string, any> = {},
    cause?: Error
  ) {
    super(
      'AUTO_APPROVAL_ERROR',
      `Auto-approval rule ${ruleId} failed: ${message}`,
      { ...context, ruleId },
      'Check auto-approval rule configuration and conditions',
      'error',
      cause
    );
  }
}

/**
 * Configuration errors for the Human-in-the-Loop Module.
 * 
 * Thrown when module configuration is invalid or
 * incompatible with system requirements.
 * 
 * @public
 */
export class ConfigurationError extends HumanLoopError {
  constructor(
    configField: string,
    message: string,
    context: Record<string, any> = {}
  ) {
    super(
      'CONFIGURATION_ERROR',
      `Configuration error in field '${configField}': ${message}`,
      { ...context, configField },
      'Review and correct configuration settings',
      'error'
    );
  }
}

/**
 * Persistence layer errors.
 * 
 * Thrown when interaction persistence operations fail due to
 * storage issues or data corruption.
 * 
 * @public
 */
export class PersistenceError extends HumanLoopError {
  constructor(
    operation: string,
    message: string,
    context: Record<string, any> = {},
    cause?: Error
  ) {
    super(
      'PERSISTENCE_ERROR',
      `Persistence ${operation} failed: ${message}`,
      { ...context, operation },
      'Check storage system health and connectivity',
      'error',
      cause
    );
  }
}

/**
 * Integration errors with external systems.
 * 
 * Thrown when integration with streaming, registry, or
 * other modules encounters issues.
 * 
 * @public
 */
export class IntegrationError extends HumanLoopError {
  constructor(
    system: string,
    operation: string,
    message: string,
    context: Record<string, any> = {},
    cause?: Error
  ) {
    super(
      'INTEGRATION_ERROR',
      `Integration with ${system} failed during ${operation}: ${message}`,
      { ...context, system, operation },
      'Check external system connectivity and configuration',
      'error',
      cause
    );
  }
}

/**
 * Custom interaction errors.
 * 
 * Thrown when custom interaction types fail schema validation,
 * UI rendering, or response processing.
 * 
 * @public
 */
export class CustomInteractionError extends HumanLoopError {
  constructor(
    interactionType: string,
    message: string,
    context: Record<string, any> = {},
    cause?: Error
  ) {
    super(
      'CUSTOM_INTERACTION_ERROR',
      `Custom interaction '${interactionType}' failed: ${message}`,
      { ...context, interactionType },
      'Check custom interaction schema and validator configuration',
      'error',
      cause
    );
  }
}

/**
 * Concurrent interaction limit errors.
 * 
 * Thrown when the number of concurrent interactions exceeds
 * configured limits for session or system-wide constraints.
 * 
 * @public
 */
export class ConcurrencyLimitError extends HumanLoopError {
  constructor(
    sessionId: string,
    currentInteractions: number,
    maxInteractions: number,
    context: Record<string, any> = {}
  ) {
    super(
      'CONCURRENCY_LIMIT_EXCEEDED',
      `Too many concurrent interactions for session ${sessionId}: ${currentInteractions}/${maxInteractions}`,
      { ...context, sessionId, currentInteractions, maxInteractions },
      'Wait for existing interactions to complete or increase concurrency limit',
      'warning'
    );
  }
}

/**
 * Authentication errors for interaction responses.
 * 
 * Thrown when interaction responses fail authentication
 * or authorization checks.
 * 
 * @public
 */
export class AuthenticationError extends HumanLoopError {
  constructor(
    interactionId: string,
    message: string,
    context: Record<string, any> = {}
  ) {
    super(
      'AUTHENTICATION_ERROR',
      `Authentication failed for interaction ${interactionId}: ${message}`,
      { ...context, interactionId },
      'Provide valid authentication credentials for interaction response',
      'error'
    );
  }
}

/**
 * Type guard to check if an error is a HumanLoopError.
 * 
 * @param error - Error to check
 * @returns True if error is a HumanLoopError
 * 
 * @example
 * ```typescript
 * try {
 *   await humanLoop.requestApproval('session-123', 'Approve action?');
 * } catch (error) {
 *   if (isHumanLoopError(error)) {
 *     console.log('Human loop error:', error.code, error.context);
 *   }
 * }
 * ```
 * 
 * @public
 */
export function isHumanLoopError(error: any): error is HumanLoopError {
  return error instanceof HumanLoopError;
}

/**
 * Creates error context with common interaction information.
 * 
 * Helper function to create standardized error context objects
 * with common interaction information for consistent error reporting.
 * 
 * @param interactionId - Interaction identifier
 * @param sessionId - Session identifier
 * @param interactionType - Type of interaction
 * @param additionalContext - Additional context information
 * @returns Standardized error context
 * 
 * @example
 * ```typescript
 * const context = createHumanLoopErrorContext(
 *   'interaction-123',
 *   'session-456',
 *   'approval',
 *   { riskLevel: 'high', timeout: 300000 }
 * );
 * 
 * throw new InteractionError(
 *   'interaction-123',
 *   'validation',
 *   'Invalid approval configuration',
 *   context
 * );
 * ```
 * 
 * @public
 */
export function createHumanLoopErrorContext(
  interactionId?: string,
  sessionId?: string,
  interactionType?: string,
  additionalContext: Record<string, any> = {}
): Record<string, any> {
  return {
    interactionId,
    sessionId,
    interactionType,
    timestamp: new Date().toISOString(),
    ...additionalContext
  };
}

/**
 * Gets the severity level of a human loop error.
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
 *   await humanLoop.requestApproval('session-123', 'Approve?');
 * } catch (error) {
 *   const severity = getHumanLoopErrorSeverity(error);
 *   if (severity === 'critical') {
 *     alerting.triggerAlert('human_loop_critical_error', error);
 *   }
 * }
 * ```
 * 
 * @public
 */
export function getHumanLoopErrorSeverity(error: any): HumanLoopErrorSeverity {
  if (isHumanLoopError(error)) {
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
    
    // Timeout errors are warnings
    if (error.message.includes('timeout') || error.message.includes('TIMEOUT')) {
      return 'warning';
    }
  }
  
  // Unknown errors default to error level
  return 'error';
}

/**
 * Maps human loop errors to HTTP status codes for API responses.
 * 
 * Provides consistent HTTP status code mapping for different
 * human loop error types in API endpoints.
 * 
 * @param error - Error to map
 * @returns Appropriate HTTP status code
 * 
 * @example
 * ```typescript
 * app.post('/interactions/:id/respond', (req, res) => {
 *   try {
 *     await humanLoop.respondToInteraction(req.params.id, req.body.response);
 *     res.json({ success: true });
 *   } catch (error) {
 *     const statusCode = mapHumanLoopErrorToHttpStatus(error);
 *     res.status(statusCode).json({ error: error.message });
 *   }
 * });
 * ```
 * 
 * @public
 */
export function mapHumanLoopErrorToHttpStatus(error: any): number {
  if (isHumanLoopError(error)) {
    switch (error.code) {
      case 'INTERACTION_ERROR':
        return 400; // Bad Request
      
      case 'INTERACTION_TIMEOUT':
        return 408; // Request Timeout
      
      case 'INTERACTION_CANCELLATION_ERROR':
        return 409; // Conflict
      
      case 'INTERACTION_NOT_FOUND':
        return 404; // Not Found
      
      case 'VALIDATION_ERROR':
        return 422; // Unprocessable Entity
      
      case 'RATE_LIMIT_EXCEEDED':
        return 429; // Too Many Requests
      
      case 'AUTO_APPROVAL_ERROR':
        return 500; // Internal Server Error
      
      case 'CONFIGURATION_ERROR':
        return 500; // Internal Server Error
      
      case 'PERSISTENCE_ERROR':
        return 503; // Service Unavailable
      
      case 'INTEGRATION_ERROR':
        return 502; // Bad Gateway
      
      case 'CUSTOM_INTERACTION_ERROR':
        return 422; // Unprocessable Entity
      
      case 'CONCURRENCY_LIMIT_EXCEEDED':
        return 429; // Too Many Requests
      
      case 'AUTHENTICATION_ERROR':
        return 401; // Unauthorized
      
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
 * app.post('/interactions', (req, res) => {
 *   try {
 *     const result = await humanLoop.requestApproval(req.body.sessionId, req.body.prompt);
 *     res.json({ result });
 *   } catch (error) {
 *     const sanitizedError = sanitizeErrorForClient(error, true);
 *     res.status(400).json(sanitizedError);
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
    message: error.message || 'A human loop error occurred',
    timestamp: new Date().toISOString()
  };
  
  if (isHumanLoopError(error)) {
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
 * Provides automated recovery suggestions for common human loop
 * errors to help with automatic retry and recovery mechanisms.
 * 
 * @public
 */
export const ERROR_RECOVERY_SUGGESTIONS = {
  INTERACTION_ERROR: [
    'Check interaction state and configuration',
    'Retry operation with exponential backoff',
    'Verify session is active and valid',
    'Implement fallback handling for failed interactions'
  ],
  
  INTERACTION_TIMEOUT: [
    'Increase timeout value for complex operations',
    'Implement fallback values for non-critical interactions',
    'Add retry mechanism with extended timeout',
    'Consider auto-approval for low-risk operations'
  ],
  
  VALIDATION_ERROR: [
    'Validate input format and constraints',
    'Provide clearer validation messages to users',
    'Implement input sanitization and formatting',
    'Add client-side validation for immediate feedback'
  ],
  
  RATE_LIMIT_EXCEEDED: [
    'Implement exponential backoff for retry attempts',
    'Increase rate limit configuration if appropriate',
    'Queue interactions for gradual processing',
    'Implement priority-based interaction scheduling'
  ],
  
  INTERACTION_NOT_FOUND: [
    'Verify interaction lifecycle and cleanup policies',
    'Implement interaction state persistence',
    'Add interaction recovery mechanisms',
    'Check for race conditions in interaction management'
  ],
  
  AUTO_APPROVAL_ERROR: [
    'Review and validate auto-approval rule configuration',
    'Test rule conditions with sample data',
    'Implement rule validation during configuration',
    'Add fallback to manual approval on rule failures'
  ],
  
  PERSISTENCE_ERROR: [
    'Check storage system health and connectivity',
    'Implement storage redundancy and failover',
    'Add data integrity validation',
    'Monitor storage capacity and performance'
  ],
  
  CONCURRENCY_LIMIT_EXCEEDED: [
    'Increase concurrent interaction limits',
    'Implement interaction queueing system',
    'Add interaction priority management',
    'Optimize interaction processing speed'
  ],
  
  AUTHENTICATION_ERROR: [
    'Verify authentication credentials and tokens',
    'Implement token refresh mechanisms',
    'Add proper error handling for auth failures',
    'Check authentication middleware configuration'
  ]
} as const;