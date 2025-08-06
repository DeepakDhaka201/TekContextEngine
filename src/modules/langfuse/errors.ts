/**
 * @fileoverview Error classes for the Langfuse observability and prompt management module
 * @module modules/langfuse/errors
 * @requires None - Pure error definitions
 * 
 * This file defines all custom error classes for Langfuse integration failures.
 * These errors provide specific context and actionable solutions for different
 * observability, tracing, and prompt management scenarios.
 * 
 * Key concepts:
 * - Hierarchical error structure with base LangfuseError
 * - Tracing and observability specific error handling
 * - Prompt management and versioning errors
 * - Cost tracking and analytics errors
 * - API communication and authentication failures
 * - Data privacy and compliance error handling
 * 
 * @example
 * ```typescript
 * import { LangfuseTraceError, LangfusePromptError } from './errors';
 * 
 * try {
 *   await langfuse.startTrace(config);
 * } catch (error) {
 *   if (error instanceof LangfuseTraceError) {
 *     console.log('Trace creation failed:', error.traceContext);
 *     await retryWithBackoff(error);
 *   }
 * }
 * ```
 * 
 * @since 1.0.0
 */

/**
 * Base error class for all Langfuse related errors.
 * 
 * Provides consistent error structure with context preservation,
 * observability information, and recovery suggestions for Langfuse operations.
 * 
 * Features:
 * - Langfuse-specific error codes and categorization
 * - Trace and span context for debugging
 * - Cost and usage information where relevant
 * - Automatic retry suggestions based on error type
 * - Integration with monitoring and alerting systems
 * - Prompt management context for prompt-related errors
 * 
 * @example
 * ```typescript
 * const error = new LangfuseError(
 *   'LANGFUSE_API_FAILED',
 *   'Failed to send trace data to Langfuse',
 *   {
 *     traceId: 'trace-123',
 *     apiEndpoint: 'traces',
 *     statusCode: 429
 *   },
 *   'Retry with exponential backoff or check API limits',
 *   originalError
 * );
 * ```
 * 
 * @public
 */
export class LangfuseError extends Error {
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
  
  /** Trace ID if error occurred within a trace */
  public readonly traceId?: string;
  
  /** Span ID if error occurred within a span */
  public readonly spanId?: string;
  
  /** Whether this error is retryable */
  public readonly retryable: boolean;
  
  /** Suggested retry delay in milliseconds */
  public readonly retryDelay?: number;
  
  /** Error severity level */
  public readonly severity: 'low' | 'medium' | 'high' | 'critical';
  
  /**
   * Creates a new LangfuseError instance.
   * 
   * @param code - Unique error code for identification
   * @param message - Human-readable error message
   * @param context - Context information for debugging (default: {})
   * @param solution - Optional solution suggestion
   * @param cause - Original error that caused this error
   * @param retryable - Whether this error is retryable (default: false)
   * @param retryDelay - Suggested retry delay in ms
   * @param severity - Error severity level (default: 'medium')
   */
  constructor(
    code: string,
    message: string,
    context: Record<string, any> = {},
    solution?: string,
    cause?: Error,
    retryable: boolean = false,
    retryDelay?: number,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.context = context;
    this.solution = solution;
    this.timestamp = new Date();
    this.cause = cause;
    this.traceId = context.traceId;
    this.spanId = context.spanId;
    this.retryable = retryable;
    this.retryDelay = retryDelay;
    this.severity = severity;
    
    // Maintain proper prototype chain
    Object.setPrototypeOf(this, new.target.prototype);
    
    // Capture stack trace if available
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
  
  /**
   * Creates a JSON representation of the error.
   * 
   * @returns JSON-serializable error object
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      severity: this.severity,
      traceId: this.traceId,
      spanId: this.spanId,
      retryable: this.retryable,
      retryDelay: this.retryDelay,
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
}

/**
 * Error thrown when Langfuse API operations fail.
 * 
 * Covers authentication failures, network issues, API errors,
 * rate limiting, and service unavailability.
 * 
 * @example
 * ```typescript
 * throw new LangfuseAPIError(
 *   'Authentication failed with Langfuse API',
 *   'POST',
 *   'https://cloud.langfuse.com/api/public/traces',
 *   401,
 *   apiError,
 *   {
 *     publicKey: 'pk_...****',
 *     traceCount: 5
 *   }
 * );
 * ```
 */
export class LangfuseAPIError extends LangfuseError {
  constructor(
    message: string,
    method: string,
    endpoint: string,
    statusCode?: number,
    cause?: Error,
    context: Record<string, any> = {}
  ) {
    const isNetworkError = cause?.message?.includes('ECONNREFUSED') || 
                          cause?.message?.includes('timeout') ||
                          statusCode === undefined;
    
    const isAuthError = statusCode === 401 || statusCode === 403;
    const isRateLimit = statusCode === 429;
    const isServerError = statusCode && statusCode >= 500;
    
    let solution = 'Check Langfuse service status and API configuration.';
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';
    
    if (isAuthError) {
      solution = 'Verify Langfuse API credentials (publicKey and secretKey). Check key permissions and expiration.';
      severity = 'high';
    } else if (isRateLimit) {
      solution = 'API rate limit exceeded. Implement exponential backoff or upgrade Langfuse plan.';
      severity = 'medium';
    } else if (isNetworkError) {
      solution = 'Network connectivity issue. Check internet connection and Langfuse service status.';
      severity = 'high';
    } else if (isServerError) {
      solution = 'Langfuse service error. Monitor service status and retry with backoff.';
      severity = 'high';
    }
    
    super(
      'LANGFUSE_API_ERROR',
      `Langfuse API error (${method} ${endpoint}): ${message}`,
      {
        method,
        endpoint,
        statusCode,
        ...context
      },
      solution,
      cause,
      isNetworkError || isServerError || isRateLimit, // Retryable conditions
      isRateLimit ? 60000 : isNetworkError ? 5000 : 10000,
      severity
    );
  }
}

/**
 * Error thrown when trace operations fail.
 * 
 * Handles trace creation, span management, trace completion,
 * and distributed tracing coordination issues.
 * 
 * @example
 * ```typescript
 * throw new LangfuseTraceError(
 *   'trace_creation_failed',
 *   'Failed to create new trace',
 *   {
 *     traceName: 'agent-conversation',
 *     userId: 'user-123',
 *     sessionId: 'session-456'
 *   },
 *   traceError
 * );
 * ```
 */
export class LangfuseTraceError extends LangfuseError {
  /** Trace context information */
  public readonly traceContext: {
    traceName?: string;
    traceId?: string;
    userId?: string;
    sessionId?: string;
    spanCount?: number;
  };
  
  constructor(
    operation: 'trace_creation' | 'span_creation' | 'trace_completion' | 'span_completion' | 'trace_retrieval',
    message: string,
    traceContext: {
      traceName?: string;
      traceId?: string;
      userId?: string;
      sessionId?: string;
      spanCount?: number;
    },
    cause?: Error,
    context: Record<string, any> = {}
  ) {
    let solution = 'Review trace configuration and retry operation.';
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';
    
    switch (operation) {
      case 'trace_creation':
        solution = 'Verify trace configuration parameters and ensure unique trace names per session.';
        severity = 'high';
        break;
      case 'span_creation':
        solution = 'Ensure parent trace exists and span configuration is valid.';
        break;
      case 'trace_completion':
        solution = 'Check that all child spans are completed before completing trace.';
        break;
      case 'span_completion':
        solution = 'Verify span exists and is in active state before completion.';
        break;
      case 'trace_retrieval':
        solution = 'Verify trace ID exists and you have access permissions.';
        break;
    }
    
    super(
      'LANGFUSE_TRACE_ERROR',
      `Trace operation failed (${operation}): ${message}`,
      {
        operation,
        ...traceContext,
        ...context
      },
      solution,
      cause,
      operation !== 'trace_creation', // Most operations are retryable except creation
      operation === 'trace_creation' ? undefined : 2000,
      severity
    );
    
    this.traceContext = traceContext;
  }
}

/**
 * Error thrown when prompt management operations fail.
 * 
 * Covers prompt creation, versioning, retrieval, compilation,
 * and template rendering issues.
 * 
 * @example
 * ```typescript
 * throw new LangfusePromptError(
 *   'prompt_compilation_failed',
 *   'Failed to compile prompt template',
 *   {
 *     promptName: 'chat-assistant',
 *     version: 2,
 *     variables: { user_name: 'John', context: 'support' }
 *   },
 *   compilationError
 * );
 * ```
 */
export class LangfusePromptError extends LangfuseError {
  /** Prompt context information */
  public readonly promptContext: {
    promptName?: string;
    version?: number | 'latest';
    variables?: Record<string, any>;
    template?: string;
  };
  
  constructor(
    operation: 'prompt_creation' | 'prompt_retrieval' | 'prompt_compilation' | 'prompt_versioning' | 'template_rendering',
    message: string,
    promptContext: {
      promptName?: string;
      version?: number | 'latest';
      variables?: Record<string, any>;
      template?: string;
    },
    cause?: Error,
    context: Record<string, any> = {}
  ) {
    let solution = 'Review prompt configuration and template syntax.';
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';
    
    switch (operation) {
      case 'prompt_creation':
        solution = 'Verify prompt name is unique and template syntax is valid.';
        severity = 'medium';
        break;
      case 'prompt_retrieval':
        solution = 'Check that prompt exists and version is available. Verify access permissions.';
        severity = 'high';
        break;
      case 'prompt_compilation':
        solution = 'Fix template syntax errors and ensure all required variables are provided.';
        severity = 'high';
        break;
      case 'prompt_versioning':
        solution = 'Ensure version number is valid and previous versions exist.';
        break;
      case 'template_rendering':
        solution = 'Verify all template variables are provided with correct types.';
        severity = 'high';
        break;
    }
    
    super(
      'LANGFUSE_PROMPT_ERROR',
      `Prompt operation failed (${operation}): ${message}`,
      {
        operation,
        ...promptContext,
        ...context
      },
      solution,
      cause,
      operation !== 'prompt_creation', // Most operations are retryable
      operation === 'template_rendering' ? 1000 : 3000,
      severity
    );
    
    this.promptContext = promptContext;
  }
}

/**
 * Error thrown when cost tracking and analytics fail.
 * 
 * Covers cost calculation errors, budget limit violations,
 * analytics query failures, and reporting issues.
 * 
 * @example
 * ```typescript
 * throw new LangfuseCostError(
 *   'budget_exceeded',
 *   'Daily budget limit exceeded',
 *   {
 *     budgetType: 'daily',
 *     limit: 100,
 *     current: 105.50,
 *     currency: 'USD'
 *   }
 * );
 * ```
 */
export class LangfuseCostError extends LangfuseError {
  /** Cost context information */
  public readonly costContext: {
    budgetType?: string;
    limit?: number;
    current?: number;
    currency?: string;
    model?: string;
    provider?: string;
  };
  
  constructor(
    operation: 'cost_calculation' | 'budget_exceeded' | 'analytics_query' | 'cost_reporting',
    message: string,
    costContext: {
      budgetType?: string;
      limit?: number;
      current?: number;
      currency?: string;
      model?: string;
      provider?: string;
    },
    cause?: Error,
    context: Record<string, any> = {}
  ) {
    let solution = 'Review cost configuration and usage patterns.';
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';
    
    switch (operation) {
      case 'cost_calculation':
        solution = 'Verify model pricing configuration and token count accuracy.';
        break;
      case 'budget_exceeded':
        solution = 'Increase budget limits or optimize model usage to reduce costs.';
        severity = 'high';
        break;
      case 'analytics_query':
        solution = 'Check query parameters and ensure sufficient data exists for the time range.';
        break;
      case 'cost_reporting':
        solution = 'Verify reporting configuration and data availability.';
        break;
    }
    
    super(
      'LANGFUSE_COST_ERROR',
      `Cost operation failed (${operation}): ${message}`,
      {
        operation,
        ...costContext,
        ...context
      },
      solution,
      cause,
      operation !== 'budget_exceeded', // Budget violations aren't retryable
      operation === 'budget_exceeded' ? undefined : 3000,
      severity
    );
    
    this.costContext = costContext;
  }
}

/**
 * Error thrown when data handling and privacy operations fail.
 * 
 * Covers data masking, PII detection, compliance violations,
 * and data export/import issues.
 * 
 * @example
 * ```typescript
 * throw new LangfuseDataError(
 *   'pii_detected',
 *   'PII data detected in trace input',
 *   {
 *     dataType: 'trace_input',
 *     piiTypes: ['email', 'phone'],
 *     complianceRule: 'GDPR'
 *   }
 * );
 * ```
 */
export class LangfuseDataError extends LangfuseError {
  constructor(
    operation: 'data_masking' | 'pii_detection' | 'compliance_violation' | 'data_export' | 'data_import',
    message: string,
    cause?: Error,
    context: Record<string, any> = {}
  ) {
    let solution = 'Review data handling configuration and privacy settings.';
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';
    
    switch (operation) {
      case 'data_masking':
        solution = 'Check data masking rules and field patterns.';
        break;
      case 'pii_detection':
        solution = 'Configure PII detection patterns or disable PII checking if not required.';
        severity = 'high';
        break;
      case 'compliance_violation':
        solution = 'Review compliance settings and ensure data handling meets regulatory requirements.';
        severity = 'critical';
        break;
      case 'data_export':
        solution = 'Verify export permissions and data format requirements.';
        break;
      case 'data_import':
        solution = 'Check import data format and schema compatibility.';
        break;
    }
    
    super(
      'LANGFUSE_DATA_ERROR',
      `Data operation failed (${operation}): ${message}`,
      {
        operation,
        ...context
      },
      solution,
      cause,
      operation !== 'compliance_violation', // Compliance violations aren't retryable
      operation === 'compliance_violation' ? undefined : 2000,
      severity
    );
  }
}

/**
 * Error thrown when session management fails.
 * 
 * Covers session creation, tracking, analytics,
 * and user behavior analysis issues.
 * 
 * @example
 * ```typescript
 * throw new LangfuseSessionError(
 *   'session_tracking_failed',
 *   'Failed to track user session',
 *   {
 *     sessionId: 'session-123',
 *     userId: 'user-456',
 *     duration: 1800000
 *   }
 * );
 * ```
 */
export class LangfuseSessionError extends LangfuseError {
  constructor(
    operation: 'session_creation' | 'session_tracking' | 'session_analytics' | 'session_completion',
    message: string,
    cause?: Error,
    context: Record<string, any> = {}
  ) {
    let solution = 'Review session configuration and user tracking settings.';
    
    switch (operation) {
      case 'session_creation':
        solution = 'Verify session parameters and ensure unique session IDs.';
        break;
      case 'session_tracking':
        solution = 'Check session tracking configuration and user identification.';
        break;
      case 'session_analytics':
        solution = 'Verify analytics query parameters and data availability.';
        break;
      case 'session_completion':
        solution = 'Ensure session exists and is in active state before completion.';
        break;
    }
    
    super(
      'LANGFUSE_SESSION_ERROR',
      `Session operation failed (${operation}): ${message}`,
      {
        operation,
        ...context
      },
      solution,
      cause,
      true, // Session operations are generally retryable
      2000
    );
  }
}

/**
 * Error thrown when configuration is invalid or missing.
 * 
 * Covers API key validation, endpoint configuration,
 * module initialization, and settings validation.
 * 
 * @example
 * ```typescript
 * throw new LangfuseConfigurationError(
 *   'Invalid Langfuse API key format',
 *   'publicKey',
 *   'invalid-key',
 *   {
 *     expectedFormat: 'pk_...',
 *     configSource: 'environment'
 *   }
 * );
 * ```
 */
export class LangfuseConfigurationError extends LangfuseError {
  constructor(
    message: string,
    configField: string,
    value: any,
    context: Record<string, any> = {}
  ) {
    let solution = `Fix the '${configField}' configuration parameter.`;
    
    if (configField === 'publicKey') {
      solution = 'Provide a valid Langfuse public key in format pk_[environment]_[key].';
    } else if (configField === 'secretKey') {
      solution = 'Provide a valid Langfuse secret key in format sk_[environment]_[key].';
    } else if (configField === 'baseUrl') {
      solution = 'Ensure the Langfuse base URL is valid and accessible.';
    } else if (configField === 'flushInterval') {
      solution = 'Set flush interval to a positive number (milliseconds).';
    } else if (configField === 'retryConfig') {
      solution = 'Configure retry settings with valid maxAttempts, backoffFactor, and maxDelay.';
    }
    
    super(
      'LANGFUSE_CONFIGURATION_ERROR',
      `Configuration error: ${message}`,
      {
        configField,
        value,
        ...context
      },
      solution,
      undefined,
      false, // Configuration errors require manual fixes
      undefined,
      'high'
    );
  }
}

/**
 * Utility function to determine if an error is Langfuse-related.
 * 
 * @param error - Error to check
 * @returns True if error is an instance of LangfuseError
 */
export function isLangfuseError(error: any): error is LangfuseError {
  return error instanceof LangfuseError;
}

/**
 * Utility function to extract retry information from Langfuse errors.
 * 
 * @param error - Langfuse error
 * @returns Retry information or null if not retryable
 */
export function getRetryInfo(error: LangfuseError): { delay: number; maxAttempts: number } | null {
  if (!error.retryable) {
    return null;
  }
  
  const baseDelay = error.retryDelay || 2000;
  let maxAttempts = 3;
  
  // Adjust retry strategy based on error type
  if (error instanceof LangfuseAPIError) {
    if (error.context.statusCode === 429) {
      maxAttempts = 5; // More retries for rate limits
    } else if (error.context.statusCode >= 500) {
      maxAttempts = 3; // Standard retries for server errors
    }
  } else if (error instanceof LangfuseTraceError) {
    maxAttempts = 2; // Limited retries for trace operations
  } else if (error instanceof LangfusePromptError) {
    maxAttempts = 2; // Limited retries for prompt operations
  }
  
  return {
    delay: baseDelay,
    maxAttempts
  };
}

/**
 * Utility function to create context for Langfuse errors.
 * 
 * @param operation - Operation that failed
 * @param traceId - Trace ID if available
 * @param spanId - Span ID if available
 * @param additionalContext - Additional context
 * @returns Error context object
 */
export function createLangfuseErrorContext(
  operation?: string,
  traceId?: string,
  spanId?: string,
  additionalContext: Record<string, any> = {}
): Record<string, any> {
  return {
    operation,
    traceId,
    spanId,
    timestamp: new Date().toISOString(),
    module: 'langfuse',
    ...additionalContext
  };
}

/**
 * Utility function to sanitize error context for logging.
 * 
 * Removes sensitive information like API keys and PII data
 * while preserving debugging information.
 * 
 * @param context - Error context to sanitize
 * @returns Sanitized context safe for logging
 */
export function sanitizeErrorContext(context: Record<string, any>): Record<string, any> {
  const sensitiveFields = [
    'secretKey', 'apiKey', 'password', 'token',
    'email', 'phone', 'ssn', 'credit_card'
  ];
  
  const sanitized: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(context)) {
    if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
      sanitized[key] = typeof value === 'string' 
        ? value.slice(0, 4) + '****' 
        : '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeErrorContext(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}