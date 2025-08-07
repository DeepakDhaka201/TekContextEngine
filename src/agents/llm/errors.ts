/**
 * @fileoverview Error handling system for the LLM Agent
 * @module agents/llm/errors
 * @requires ../base/errors
 * 
 * This file implements a comprehensive hierarchical error system for the
 * LLM Agent with specialized error classes for model interactions, tool
 * execution, memory management, and response validation.
 * 
 * Key concepts:
 * - LLMAgentError: Base error class with model context
 * - Hierarchical error types for specific LLM scenarios
 * - Model interaction error handling (completion, streaming, tools)
 * - Memory and conversation error handling
 * - Validation and safety error handling
 * - Integration with monitoring and observability systems
 * 
 * @example
 * ```typescript
 * import { ModelCompletionError, ToolExecutionError } from './errors';
 * 
 * // Model completion error
 * throw new ModelCompletionError(
 *   'gpt-4',
 *   'Rate limit exceeded',
 *   { requestId: 'req-123', retryAfter: 60 }
 * );
 * 
 * // Tool execution error
 * throw new ToolExecutionError(
 *   'weather_api',
 *   'API key invalid',
 *   { toolCallId: 'call-456', input: { location: 'NYC' } }
 * );
 * ```
 * 
 * @see ../base/errors.ts for base agent error classes
 * @since 1.0.0
 */

import { AgentError } from '../base/errors';

/**
 * Base error class for all LLM Agent related errors.
 * 
 * Extends the base AgentError with LLM-specific context including
 * model information, token usage, and completion details.
 * 
 * @public
 */
export class LLMAgentError extends AgentError {
  /** Model involved in the error */
  public readonly model?: string;
  
  /** Token usage when error occurred */
  public readonly usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    cost?: number;
  };
  
  /** Request details when error occurred */
  public readonly request?: {
    id?: string;
    messages?: any[];
    tools?: string[];
    parameters?: Record<string, any>;
  };
  
  /**
   * Creates a new LLMAgentError with comprehensive context.
   * 
   * @param code - Structured error code
   * @param message - Human-readable error message
   * @param context - Error context information
   * @param model - Model involved in the error
   * @param usage - Token usage information
   * @param request - Request details
   * @param cause - Original error that caused this error
   */
  constructor(
    code: string,
    message: string,
    context: Record<string, any> = {},
    model?: string,
    usage?: any,
    request?: any,
    cause?: Error
  ) {
    super(code, message, {
      ...context,
      model,
      usage,
      request
    }, cause);
    
    this.name = 'LLMAgentError';
    this.model = model;
    this.usage = usage;
    this.request = request;
    
    // Ensure proper prototype chain
    Object.setPrototypeOf(this, LLMAgentError.prototype);
  }
}

/**
 * Model completion errors.
 * 
 * Thrown when LLM completion requests fail due to
 * model issues, rate limits, or service problems.
 * 
 * @public
 */
export class ModelCompletionError extends LLMAgentError {
  constructor(
    model: string,
    message: string,
    context: Record<string, any> = {},
    cause?: Error
  ) {
    super(
      'MODEL_COMPLETION_ERROR',
      `Model completion failed for ${model}: ${message}`,
      context,
      model,
      undefined,
      undefined,
      cause
    );
    
    this.name = 'ModelCompletionError';
  }
}

/**
 * Model streaming errors.
 * 
 * Thrown when streaming completion encounters issues
 * such as connection drops or chunk parsing failures.
 * 
 * @public
 */
export class ModelStreamingError extends LLMAgentError {
  constructor(
    model: string,
    message: string,
    context: Record<string, any> = {},
    cause?: Error
  ) {
    super(
      'MODEL_STREAMING_ERROR',
      `Model streaming failed for ${model}: ${message}`,
      context,
      model,
      undefined,
      undefined,
      cause
    );
    
    this.name = 'ModelStreamingError';
  }
}

/**
 * Model selection errors.
 * 
 * Thrown when automatic model selection fails due to
 * routing issues or unavailable models.
 * 
 * @public
 */
export class ModelSelectionError extends LLMAgentError {
  constructor(
    routing: string,
    message: string,
    context: Record<string, any> = {},
    availableModels?: string[]
  ) {
    super(
      'MODEL_SELECTION_ERROR',
      `Model selection failed for routing '${routing}': ${message}`,
      { ...context, routing, availableModels }
    );
    
    this.name = 'ModelSelectionError';
  }
}

/**
 * Tool execution errors.
 * 
 * Thrown when tool execution fails during LLM
 * agent workflow execution.
 * 
 * @public
 */
export class ToolExecutionError extends LLMAgentError {
  constructor(
    toolName: string,
    message: string,
    context: Record<string, any> = {},
    cause?: Error
  ) {
    super(
      'TOOL_EXECUTION_ERROR',
      `Tool execution failed for '${toolName}': ${message}`,
      { ...context, toolName },
      undefined,
      undefined,
      undefined,
      cause
    );
    
    this.name = 'ToolExecutionError';
  }
}

/**
 * Tool call parsing errors.
 * 
 * Thrown when LLM generates invalid tool calls that
 * cannot be parsed or executed.
 * 
 * @public
 */
export class ToolCallParsingError extends LLMAgentError {
  constructor(
    toolCall: string,
    message: string,
    context: Record<string, any> = {},
    model?: string
  ) {
    super(
      'TOOL_CALL_PARSING_ERROR',
      `Tool call parsing failed: ${message}`,
      { ...context, toolCall },
      model
    );
    
    this.name = 'ToolCallParsingError';
  }
}

/**
 * Memory management errors.
 * 
 * Thrown when conversation memory operations fail
 * such as storage issues or memory consolidation.
 * 
 * @public
 */
export class MemoryError extends LLMAgentError {
  constructor(
    operation: string,
    sessionId: string,
    message: string,
    context: Record<string, any> = {},
    cause?: Error
  ) {
    super(
      'MEMORY_ERROR',
      `Memory ${operation} failed for session ${sessionId}: ${message}`,
      { ...context, operation, sessionId },
      undefined,
      undefined,
      undefined,
      cause
    );
    
    this.name = 'MemoryError';
  }
}

/**
 * Response validation errors.
 * 
 * Thrown when LLM responses fail configured
 * validation rules or safety checks.
 * 
 * @public
 */
export class ResponseValidationError extends LLMAgentError {
  constructor(
    validationType: string,
    message: string,
    context: Record<string, any> = {},
    model?: string,
    response?: string
  ) {
    super(
      'RESPONSE_VALIDATION_ERROR',
      `Response validation failed (${validationType}): ${message}`,
      { ...context, validationType, response: response?.substring(0, 200) },
      model
    );
    
    this.name = 'ResponseValidationError';
  }
}

/**
 * Content safety errors.
 * 
 * Thrown when content fails safety checks or
 * moderation policies.
 * 
 * @public
 */
export class ContentSafetyError extends LLMAgentError {
  constructor(
    checkType: string,
    message: string,
    context: Record<string, any> = {},
    flaggedContent?: string
  ) {
    super(
      'CONTENT_SAFETY_ERROR',
      `Content safety violation (${checkType}): ${message}`,
      { ...context, checkType, flaggedContent: flaggedContent?.substring(0, 100) }
    );
    
    this.name = 'ContentSafetyError';
  }
}

/**
 * Context length errors.
 * 
 * Thrown when conversation context exceeds
 * model's maximum context window.
 * 
 * @public
 */
export class ContextLengthError extends LLMAgentError {
  constructor(
    model: string,
    tokenCount: number,
    maxTokens: number,
    context: Record<string, any> = {}
  ) {
    super(
      'CONTEXT_LENGTH_ERROR',
      `Context length ${tokenCount} exceeds maximum ${maxTokens} for model ${model}`,
      { ...context, tokenCount, maxTokens },
      model
    );
    
    this.name = 'ContextLengthError';
  }
}

/**
 * Rate limit errors.
 * 
 * Thrown when model API rate limits are exceeded
 * and requests cannot be completed.
 * 
 * @public
 */
export class RateLimitError extends LLMAgentError {
  constructor(
    model: string,
    message: string,
    retryAfter?: number,
    context: Record<string, any> = {}
  ) {
    super(
      'RATE_LIMIT_ERROR',
      `Rate limit exceeded for model ${model}: ${message}`,
      { ...context, retryAfter },
      model
    );
    
    this.name = 'RateLimitError';
  }
}

/**
 * Quota exceeded errors.
 * 
 * Thrown when API quotas or usage limits
 * have been exceeded.
 * 
 * @public
 */
export class QuotaExceededError extends LLMAgentError {
  constructor(
    model: string,
    quotaType: string,
    message: string,
    context: Record<string, any> = {}
  ) {
    super(
      'QUOTA_EXCEEDED_ERROR',
      `Quota exceeded for ${quotaType} on model ${model}: ${message}`,
      { ...context, quotaType },
      model
    );
    
    this.name = 'QuotaExceededError';
  }
}

/**
 * Configuration errors for LLM Agent.
 * 
 * Thrown when agent configuration is invalid
 * or incompatible with requirements.
 * 
 * @public
 */
export class LLMConfigurationError extends LLMAgentError {
  constructor(
    configField: string,
    message: string,
    context: Record<string, any> = {}
  ) {
    super(
      'LLM_CONFIGURATION_ERROR',
      `LLM configuration error in field '${configField}': ${message}`,
      { ...context, configField }
    );
    
    this.name = 'LLMConfigurationError';
  }
}

/**
 * Prompt engineering errors.
 * 
 * Thrown when prompt construction or templating
 * fails due to invalid templates or missing data.
 * 
 * @public
 */
export class PromptEngineeringError extends LLMAgentError {
  constructor(
    stage: string,
    message: string,
    context: Record<string, any> = {},
    template?: string
  ) {
    super(
      'PROMPT_ENGINEERING_ERROR',
      `Prompt engineering failed at ${stage}: ${message}`,
      { ...context, stage, template }
    );
    
    this.name = 'PromptEngineeringError';
  }
}

/**
 * Model authentication errors.
 * 
 * Thrown when model API authentication fails
 * due to invalid credentials or expired tokens.
 * 
 * @public
 */
export class ModelAuthenticationError extends LLMAgentError {
  constructor(
    model: string,
    message: string,
    context: Record<string, any> = {}
  ) {
    super(
      'MODEL_AUTHENTICATION_ERROR',
      `Authentication failed for model ${model}: ${message}`,
      context,
      model
    );
    
    this.name = 'ModelAuthenticationError';
  }
}

/**
 * Token estimation errors.
 * 
 * Thrown when token counting or estimation
 * fails for input text or conversations.
 * 
 * @public
 */
export class TokenEstimationError extends LLMAgentError {
  constructor(
    model: string,
    message: string,
    context: Record<string, any> = {},
    input?: string
  ) {
    super(
      'TOKEN_ESTIMATION_ERROR',
      `Token estimation failed for model ${model}: ${message}`,
      { ...context, inputLength: input?.length },
      model
    );
    
    this.name = 'TokenEstimationError';
  }
}

/**
 * Type guard to check if an error is an LLMAgentError.
 * 
 * @param error - Error to check
 * @returns True if error is an LLMAgentError
 * 
 * @public
 */
export function isLLMAgentError(error: any): error is LLMAgentError {
  return error instanceof LLMAgentError;
}

/**
 * Creates error context with common LLM information.
 * 
 * @param model - Model involved in the error
 * @param sessionId - Session identifier
 * @param operation - Operation being performed
 * @param additionalContext - Additional context information
 * @returns Standardized error context
 * 
 * @public
 */
export function createLLMErrorContext(
  model?: string,
  sessionId?: string,
  operation?: string,
  additionalContext: Record<string, any> = {}
): Record<string, any> {
  return {
    model,
    sessionId,
    operation,
    timestamp: new Date().toISOString(),
    ...additionalContext
  };
}

/**
 * Maps LLM agent errors to appropriate retry strategies.
 * 
 * @param error - Error to analyze
 * @returns Retry strategy recommendation
 * 
 * @public
 */
export function getRetryStrategy(error: any): {
  shouldRetry: boolean;
  delay: number;
  maxRetries: number;
  backoffMultiplier: number;
} {
  if (error instanceof RateLimitError) {
    return {
      shouldRetry: true,
      delay: error.context.retryAfter ? error.context.retryAfter * 1000 : 30000,
      maxRetries: 3,
      backoffMultiplier: 2.0
    };
  }
  
  if (error instanceof QuotaExceededError) {
    return {
      shouldRetry: false,
      delay: 0,
      maxRetries: 0,
      backoffMultiplier: 1.0
    };
  }
  
  if (error instanceof ModelCompletionError) {
    return {
      shouldRetry: true,
      delay: 5000,
      maxRetries: 2,
      backoffMultiplier: 1.5
    };
  }
  
  if (error instanceof ModelStreamingError) {
    return {
      shouldRetry: true,
      delay: 2000,
      maxRetries: 1,
      backoffMultiplier: 1.0
    };
  }
  
  if (error instanceof ToolExecutionError) {
    return {
      shouldRetry: true,
      delay: 1000,
      maxRetries: 1,
      backoffMultiplier: 1.0
    };
  }
  
  // Default: no retry for unknown errors
  return {
    shouldRetry: false,
    delay: 0,
    maxRetries: 0,
    backoffMultiplier: 1.0
  };
}

/**
 * Error recovery suggestions for common LLM agent errors.
 * 
 * @public
 */
export const LLM_ERROR_RECOVERY_SUGGESTIONS = {
  MODEL_COMPLETION_ERROR: [
    'Check model availability and status',
    'Verify API credentials and permissions',
    'Retry with exponential backoff',
    'Switch to fallback model if configured',
    'Reduce prompt length if context limit exceeded'
  ],
  
  MODEL_STREAMING_ERROR: [
    'Check network connectivity',
    'Retry with non-streaming completion',
    'Verify streaming is supported by model',
    'Implement stream error recovery',
    'Use smaller chunk sizes for streaming'
  ],
  
  TOOL_EXECUTION_ERROR: [
    'Verify tool is properly configured and available',
    'Check tool input parameters and validation',
    'Implement tool execution timeout',
    'Provide fallback behavior for tool failures',
    'Log tool execution details for debugging'
  ],
  
  MEMORY_ERROR: [
    'Check memory storage connectivity',
    'Implement memory cleanup and consolidation',
    'Verify memory configuration settings',
    'Use fallback to stateless operation',
    'Monitor memory usage and limits'
  ],
  
  RESPONSE_VALIDATION_ERROR: [
    'Review and adjust validation rules',
    'Implement graceful validation failure handling',
    'Provide clearer instructions in prompts',
    'Use response format constraints',
    'Implement validation retry with different prompts'
  ],
  
  CONTEXT_LENGTH_ERROR: [
    'Implement conversation summarization',
    'Truncate older messages from context',
    'Use models with larger context windows',
    'Implement sliding window context management',
    'Optimize prompt length and structure'
  ],
  
  RATE_LIMIT_ERROR: [
    'Implement exponential backoff retry',
    'Use rate limiting and request queuing',
    'Switch to different model providers',
    'Monitor and track rate limit usage',
    'Implement request priority management'
  ],
  
  CONTENT_SAFETY_ERROR: [
    'Review and adjust safety policies',
    'Implement content filtering for inputs',
    'Use alternative models with different policies',
    'Implement human review for flagged content',
    'Provide user feedback on safety violations'
  ]
} as const;

/**
 * Gets recovery suggestions for a specific error.
 * 
 * @param error - Error to get suggestions for
 * @returns Array of recovery suggestions
 * 
 * @public
 */
export function getRecoverySuggestions(error: any): string[] {
  if (isLLMAgentError(error)) {
    return LLM_ERROR_RECOVERY_SUGGESTIONS[error.code as keyof typeof LLM_ERROR_RECOVERY_SUGGESTIONS] || [];
  }
  
  return [];
}

/**
 * Creates a sanitized error response for API clients.
 * 
 * @param error - Error to sanitize
 * @param includeDetails - Whether to include detailed context
 * @returns Sanitized error response
 * 
 * @public
 */
export function sanitizeLLMError(
  error: any,
  includeDetails: boolean = false
): Record<string, any> {
  const baseResponse = {
    error: true,
    message: error.message || 'An LLM agent error occurred',
    timestamp: new Date().toISOString()
  };
  
  if (isLLMAgentError(error)) {
    const response: Record<string, any> = {
      ...baseResponse,
      code: error.code,
      type: error.name
    };
    
    if (error.model) {
      response.model = error.model;
    }
    
    if (includeDetails && error.context) {
      // Filter out sensitive information
      const sanitizedContext: Record<string, any> = {};
      for (const [key, value] of Object.entries(error.context)) {
        if (!key.toLowerCase().includes('key') && 
            !key.toLowerCase().includes('token') && 
            !key.toLowerCase().includes('auth')) {
          sanitizedContext[key] = value;
        }
      }
      response.context = sanitizedContext;
    }
    
    // Add recovery suggestions
    const suggestions = getRecoverySuggestions(error);
    if (suggestions.length > 0) {
      response.suggestions = suggestions.slice(0, 3); // Limit to top 3
    }
    
    return response;
  }
  
  return baseResponse;
}