/**
 * @fileoverview Error classes for the LiteLLM integration module
 * @module modules/litellm/errors
 * @requires None - Pure error definitions
 * 
 * This file defines all custom error classes for LiteLLM integration failures.
 * These errors provide specific context and actionable solutions for different
 * LLM provider and routing scenarios.
 * 
 * Key concepts:
 * - Hierarchical error structure with base LiteLLMError
 * - Provider-specific error handling and recovery
 * - Budget and quota management errors
 * - Network and authentication failure handling
 * - Model routing and fallback errors
 * 
 * @example
 * ```typescript
 * import { LLMProviderError, LLMQuotaExceededError } from './errors';
 * 
 * try {
 *   await litellm.complete(request);
 * } catch (error) {
 *   if (error instanceof LLMQuotaExceededError) {
 *     console.log('Budget limit reached:', error.quotaInfo);
 *     await notifyAdministrator(error);
 *   }
 * }
 * ```
 * 
 * @since 1.0.0
 */

/**
 * Base error class for all LiteLLM related errors.
 * 
 * Provides consistent error structure with context preservation,
 * provider information, and recovery suggestions for LLM operations.
 * 
 * Features:
 * - LLM-specific error codes and categorization
 * - Provider context for multi-provider scenarios
 * - Cost and usage information where relevant
 * - Automatic retry suggestions based on error type
 * - Integration with monitoring and alerting systems
 * 
 * @example
 * ```typescript
 * const error = new LiteLLMError(
 *   'LLM_REQUEST_FAILED',
 *   'Failed to complete LLM request',
 *   {
 *     model: 'gpt-4',
 *     provider: 'openai',
 *     tokens: 150,
 *     cost: 0.003
 *   },
 *   'Retry with exponential backoff or try fallback model',
 *   originalError
 * );
 * ```
 * 
 * @public
 */
export class LiteLLMError extends Error {
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
  
  /** Provider that generated the error */
  public readonly provider?: string;
  
  /** Model that was being used */
  public readonly model?: string;
  
  /** Whether this error is retryable */
  public readonly retryable: boolean;
  
  /** Suggested retry delay in milliseconds */
  public readonly retryDelay?: number;
  
  /**
   * Creates a new LiteLLMError instance.
   * 
   * @param code - Unique error code for identification
   * @param message - Human-readable error message
   * @param context - Context information for debugging (default: {})
   * @param solution - Optional solution suggestion
   * @param cause - Original error that caused this error
   * @param retryable - Whether this error is retryable (default: false)
   * @param retryDelay - Suggested retry delay in ms
   */
  constructor(
    code: string,
    message: string,
    context: Record<string, any> = {},
    solution?: string,
    cause?: Error,
    retryable: boolean = false,
    retryDelay?: number
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.context = context;
    this.solution = solution;
    this.timestamp = new Date();
    this.cause = cause;
    this.provider = context.provider;
    this.model = context.model;
    this.retryable = retryable;
    this.retryDelay = retryDelay;
    
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
      provider: this.provider,
      model: this.model,
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
 * Error thrown when LLM provider operations fail.
 * 
 * Covers authentication failures, network issues, API errors,
 * and provider-specific service problems.
 * 
 * @example
 * ```typescript
 * throw new LLMProviderError(
 *   'openai',
 *   'gpt-4',
 *   'Authentication failed with OpenAI API',
 *   authError,
 *   {
 *     apiKey: 'sk-...****',
 *     endpoint: 'https://api.openai.com/v1/chat/completions',
 *     statusCode: 401
 *   }
 * );
 * ```
 */
export class LLMProviderError extends LiteLLMError {
  constructor(
    provider: string,
    model: string,
    message: string,
    cause?: Error,
    context: Record<string, any> = {}
  ) {
    const isNetworkError = cause?.message?.includes('ECONNREFUSED') || 
                          cause?.message?.includes('timeout') ||
                          context.statusCode >= 500;
    
    const isAuthError = context.statusCode === 401 || 
                       context.statusCode === 403 ||
                       cause?.message?.includes('authentication');
    
    let solution = 'Check provider service status and try again.';
    
    if (isAuthError) {
      solution = `Verify API credentials for ${provider}. Check that the API key is valid and has sufficient permissions.`;
    } else if (isNetworkError) {
      solution = `Network issue with ${provider}. Check connectivity and try again with exponential backoff.`;
    } else if (context.statusCode === 429) {
      solution = `Rate limit exceeded for ${provider}. Implement backoff strategy or upgrade quota.`;
    }
    
    super(
      'LLM_PROVIDER_ERROR',
      `${provider} provider failed for model '${model}': ${message}`,
      {
        provider,
        model,
        statusCode: context.statusCode,
        endpoint: context.endpoint,
        ...context
      },
      solution,
      cause,
      isNetworkError || context.statusCode >= 500, // Retryable for network/server errors
      isNetworkError ? 5000 : context.statusCode === 429 ? 60000 : undefined
    );
  }
}

/**
 * Error thrown when budget or quota limits are exceeded.
 * 
 * Handles daily/monthly budget limits, user quotas, token limits,
 * and rate limiting scenarios with detailed usage information.
 * 
 * @example
 * ```typescript
 * throw new LLMQuotaExceededError(
 *   'daily_budget',
 *   'Daily budget limit of $100 exceeded',
 *   {
 *     limit: 100,
 *     used: 105.50,
 *     remaining: -5.50,
 *     period: 'daily',
 *     resetTime: new Date('2024-01-02T00:00:00Z')
 *   }
 * );
 * ```
 */
export class LLMQuotaExceededError extends LiteLLMError {
  /** Quota information */
  public readonly quotaInfo: {
    type: string;
    limit: number;
    used: number;
    remaining: number;
    period?: string;
    resetTime?: Date;
  };
  
  constructor(
    quotaType: string,
    message: string,
    quotaInfo: {
      limit: number;
      used: number;
      remaining: number;
      period?: string;
      resetTime?: Date;
    },
    context: Record<string, any> = {}
  ) {
    let solution = 'Reduce usage or increase quota limits.';
    
    if (quotaInfo.resetTime) {
      const resetIn = Math.ceil((quotaInfo.resetTime.getTime() - Date.now()) / 1000 / 60);
      solution = `Quota resets in ${resetIn} minutes. Wait for reset or increase limits.`;
    }
    
    if (quotaType === 'rate_limit') {
      solution = 'Implement exponential backoff and reduce request frequency.';
    } else if (quotaType === 'budget') {
      solution = 'Increase budget limits or optimize model usage for cost efficiency.';
    }
    
    super(
      'LLM_QUOTA_EXCEEDED',
      `LLM quota exceeded (${quotaType}): ${message}`,
      {
        quotaType,
        ...quotaInfo,
        ...context
      },
      solution,
      undefined,
      quotaType === 'rate_limit', // Rate limits are retryable
      quotaType === 'rate_limit' ? 30000 : undefined
    );
    
    this.quotaInfo = {
      type: quotaType,
      ...quotaInfo
    };
  }
}

/**
 * Error thrown when model routing or selection fails.
 * 
 * Occurs when requested models are unavailable, incompatible,
 * or when all fallback options are exhausted.
 * 
 * @example
 * ```typescript
 * throw new LLMModelError(
 *   'gpt-4-vision',
 *   'Model not available for vision tasks',
 *   {
 *     requestedCapabilities: ['vision', 'chat'],
 *     availableModels: ['gpt-4', 'gpt-3.5-turbo'],
 *     fallbacksAttempted: ['gpt-4', 'claude-3-opus']
 *   }
 * );
 * ```
 */
export class LLMModelError extends LiteLLMError {
  constructor(
    model: string,
    message: string,
    context: Record<string, any> = {}
  ) {
    const availableModels = context.availableModels || [];
    const suggestions = availableModels.length > 0 
      ? `Try one of: ${availableModels.slice(0, 3).join(', ')}`
      : 'Check available models with listModels()';
    
    super(
      'LLM_MODEL_ERROR',
      `Model '${model}' error: ${message}`,
      {
        model,
        availableAlternatives: availableModels,
        ...context
      },
      `${suggestions}. Verify model name and provider availability.`,
      undefined,
      false // Model errors are typically not retryable
    );
  }
}

/**
 * Error thrown when request validation fails.
 * 
 * Covers parameter validation, schema errors, content filtering,
 * and format specification issues.
 * 
 * @example
 * ```typescript
 * throw new LLMValidationError(
 *   'Invalid temperature value',
 *   'temperature',
 *   2.5,
 *   {
 *     validRange: '0.0 - 2.0',
 *     requestId: 'req-123',
 *     model: 'gpt-4'
 *   }
 * );
 * ```
 */
export class LLMValidationError extends LiteLLMError {
  constructor(
    message: string,
    field: string,
    value: any,
    context: Record<string, any> = {}
  ) {
    let solution = `Fix the '${field}' parameter in your request.`;
    
    if (field === 'temperature') {
      solution = 'Set temperature between 0.0 and 2.0.';
    } else if (field === 'max_tokens') {
      solution = 'Set max_tokens to a positive integer within model limits.';
    } else if (field === 'messages') {
      solution = 'Ensure messages array is not empty and follows the correct format.';
    } else if (field === 'functions') {
      solution = 'Verify function definitions follow JSON Schema format.';
    }
    
    super(
      'LLM_VALIDATION_ERROR',
      `Request validation failed: ${message}`,
      {
        field,
        value,
        ...context
      },
      solution,
      undefined,
      false // Validation errors are not retryable without fixing the request
    );
  }
}

/**
 * Error thrown when streaming operations fail.
 * 
 * Handles stream connection failures, chunk parsing errors,
 * and streaming protocol issues.
 * 
 * @example
 * ```typescript
 * throw new LLMStreamError(
 *   'Stream connection lost',
 *   streamError,
 *   {
 *     provider: 'anthropic',
 *     model: 'claude-3-opus',
 *     chunksReceived: 15,
 *     bytesReceived: 2048
 *   }
 * );
 * ```
 */
export class LLMStreamError extends LiteLLMError {
  constructor(
    message: string,
    cause?: Error,
    context: Record<string, any> = {}
  ) {
    const isConnectionError = cause?.message?.includes('connection') || 
                             cause?.message?.includes('network');
    
    super(
      'LLM_STREAM_ERROR',
      `Streaming failed: ${message}`,
      {
        streamingProtocol: 'SSE',
        ...context
      },
      isConnectionError 
        ? 'Check network connectivity and retry with non-streaming request as fallback.'
        : 'Validate streaming parameters and check provider streaming support.',
      cause,
      isConnectionError,
      isConnectionError ? 3000 : undefined
    );
  }
}

/**
 * Error thrown when batch processing fails.
 * 
 * Covers batch size limits, processing timeouts, partial failures,
 * and batch coordination issues.
 * 
 * @example
 * ```typescript
 * throw new LLMBatchError(
 *   'Batch processing partially failed',
 *   {
 *     totalRequests: 100,
 *     successful: 85,
 *     failed: 15,
 *     errors: failedRequestErrors
 *   }
 * );
 * ```
 */
export class LLMBatchError extends LiteLLMError {
  /** Batch processing results */
  public readonly batchInfo: {
    totalRequests: number;
    successful: number;
    failed: number;
    errors?: Error[];
  };
  
  constructor(
    message: string,
    batchInfo: {
      totalRequests: number;
      successful: number;
      failed: number;
      errors?: Error[];
    },
    context: Record<string, any> = {}
  ) {
    const successRate = batchInfo.successful / batchInfo.totalRequests;
    const isPartialFailure = batchInfo.successful > 0;
    
    let solution = 'Review failed requests and retry them individually.';
    
    if (successRate < 0.5) {
      solution = 'High failure rate detected. Check batch parameters and provider status.';
    } else if (isPartialFailure) {
      solution = 'Partial batch success. Extract successful results and retry failed requests.';
    }
    
    super(
      'LLM_BATCH_ERROR',
      `Batch processing failed: ${message}`,
      {
        ...batchInfo,
        successRate: Math.round(successRate * 100),
        ...context
      },
      solution,
      undefined,
      isPartialFailure // Partial failures are retryable
    );
    
    this.batchInfo = batchInfo;
  }
}

/**
 * Error thrown when function calling fails.
 * 
 * Covers function definition errors, execution failures,
 * parameter validation, and response parsing issues.
 * 
 * @example
 * ```typescript
 * throw new LLMFunctionError(
 *   'calculate_price',
 *   'Function execution failed with invalid parameters',
 *   functionError,
 *   {
 *     providedArgs: '{"quantity": "invalid"}',
 *     expectedSchema: priceCalculationSchema,
 *     model: 'gpt-4'
 *   }
 * );
 * ```
 */
export class LLMFunctionError extends LiteLLMError {
  constructor(
    functionName: string,
    message: string,
    cause?: Error,
    context: Record<string, any> = {}
  ) {
    super(
      'LLM_FUNCTION_ERROR',
      `Function '${functionName}' failed: ${message}`,
      {
        functionName,
        ...context
      },
      'Verify function definition, parameters, and execution logic. Check function schema validation.',
      cause,
      false // Function errors require fixing the function or its definition
    );
  }
}

/**
 * Error thrown when configuration is invalid.
 * 
 * Covers API key validation, endpoint configuration,
 * provider setup, and module initialization issues.
 * 
 * @example
 * ```typescript
 * throw new LLMConfigurationError(
 *   'Invalid OpenAI API key format',
 *   'api_key',
 *   'invalid-key',
 *   {
 *     provider: 'openai',
 *     expectedFormat: 'sk-...',
 *     configSource: 'environment'
 *   }
 * );
 * ```
 */
export class LLMConfigurationError extends LiteLLMError {
  constructor(
    message: string,
    configField: string,
    value: any,
    context: Record<string, any> = {}
  ) {
    let solution = `Fix the '${configField}' configuration parameter.`;
    
    if (configField === 'api_key') {
      solution = 'Provide a valid API key in the correct format for the provider.';
    } else if (configField === 'base_url') {
      solution = 'Ensure the base URL is valid and accessible.';
    } else if (configField === 'providers') {
      solution = 'Configure at least one valid provider with proper credentials.';
    }
    
    super(
      'LLM_CONFIGURATION_ERROR',
      `Configuration error: ${message}`,
      {
        configField,
        value,
        ...context
      },
      solution,
      undefined,
      false // Configuration errors require manual fixes
    );
  }
}

/**
 * Utility function to determine if an error is LLM-related.
 * 
 * @param error - Error to check
 * @returns True if error is an instance of LiteLLMError
 */
export function isLiteLLMError(error: any): error is LiteLLMError {
  return error instanceof LiteLLMError;
}

/**
 * Utility function to extract retry information from LLM errors.
 * 
 * @param error - LiteLLM error
 * @returns Retry information or null if not retryable
 */
export function getRetryInfo(error: LiteLLMError): { delay: number; maxAttempts: number } | null {
  if (!error.retryable) {
    return null;
  }
  
  const baseDelay = error.retryDelay || 1000;
  let maxAttempts = 3;
  
  // Adjust retry strategy based on error type
  if (error instanceof LLMProviderError) {
    if (error.context.statusCode === 429) {
      maxAttempts = 5; // More retries for rate limits
    } else if (error.context.statusCode >= 500) {
      maxAttempts = 3; // Standard retries for server errors
    }
  } else if (error instanceof LLMQuotaExceededError) {
    if (error.quotaInfo.type === 'rate_limit') {
      maxAttempts = 2; // Limited retries for rate limits
    }
  }
  
  return {
    delay: baseDelay,
    maxAttempts
  };
}

/**
 * Utility function to create context for LLM errors.
 * 
 * @param request - LLM request that failed
 * @param provider - Provider information
 * @param additionalContext - Additional context
 * @returns Error context object
 */
export function createLLMErrorContext(
  request?: any,
  provider?: string,
  additionalContext: Record<string, any> = {}
): Record<string, any> {
  return {
    model: request?.model,
    provider,
    requestId: request?.metadata?.requestId,
    userId: request?.user,
    timestamp: new Date().toISOString(),
    messageCount: request?.messages?.length,
    tokensRequested: request?.max_tokens,
    streaming: request?.stream,
    functions: request?.functions?.length || 0,
    ...additionalContext
  };
}