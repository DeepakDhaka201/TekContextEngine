/**
 * @fileoverview Type definitions for the LiteLLM integration module
 * @module modules/litellm/types
 * @requires None - Pure type definitions
 * 
 * This file defines all interfaces, types, and enums for LiteLLM integration.
 * LiteLLM provides unified access to 100+ LLM APIs with standardized interfaces,
 * automatic fallbacks, cost tracking, and performance monitoring.
 * 
 * Key concepts:
 * - Unified LLM interface across all providers (OpenAI, Anthropic, Google, etc.)
 * - Automatic failover and load balancing
 * - Cost tracking and budget management
 * - Rate limiting and quota management
 * - Model routing and selection
 * - Streaming and batch processing
 * 
 * @example
 * ```typescript
 * import { ILiteLLMModule, LLMRequest, LLMResponse } from './types';
 * 
 * const request: LLMRequest = {
 *   model: 'gpt-4',
 *   messages: [{ role: 'user', content: 'Hello!' }],
 *   temperature: 0.7
 * };
 * 
 * const response = await litellm.complete(request);
 * console.log(response.choices[0].message.content);
 * ```
 * 
 * @see https://docs.litellm.ai/ for LiteLLM documentation
 * @since 1.0.0
 */

import { IModule, HealthStatus } from '../registry/types';

/**
 * Core interface for the LiteLLM integration module.
 * 
 * Provides unified access to multiple LLM providers through a single interface.
 * Handles authentication, routing, fallbacks, cost tracking, and monitoring
 * transparently to consuming agents.
 * 
 * Features:
 * - Universal LLM API compatible with OpenAI format
 * - Automatic provider fallback and load balancing
 * - Real-time cost tracking and budget alerts
 * - Rate limiting and quota management
 * - Streaming support with Server-Sent Events
 * - Batch processing for efficiency
 * - Model performance monitoring
 * - Usage analytics and reporting
 * 
 * @example
 * ```typescript
 * class LiteLLMModule implements ILiteLLMModule {
 *   async complete(request: LLMRequest): Promise<LLMResponse> {
 *     // Route to appropriate provider based on model
 *     const provider = this.selectProvider(request.model);
 *     
 *     // Execute with fallback and monitoring
 *     return await this.executeWithFallback(provider, request);
 *   }
 * }
 * ```
 * 
 * @public
 */
export interface ILiteLLMModule extends IModule {
  /**
   * Completes a chat conversation request.
   * 
   * @param request - Chat completion request
   * @param options - Optional request configuration
   * @returns Promise resolving to completion response
   * @throws {LLMProviderError} If all providers fail
   * @throws {LLMQuotaExceededError} If usage limits exceeded
   */
  complete(request: LLMRequest, options?: LLMRequestOptions): Promise<LLMResponse>;
  
  /**
   * Streams a chat conversation response.
   * 
   * @param request - Chat completion request
   * @param options - Optional request configuration
   * @returns AsyncGenerator yielding response chunks
   * @throws {LLMProviderError} If streaming fails
   */
  stream(request: LLMRequest, options?: LLMRequestOptions): AsyncGenerator<LLMStreamChunk, void, unknown>;
  
  /**
   * Processes multiple requests in batch.
   * 
   * @param requests - Array of completion requests
   * @param options - Optional batch configuration
   * @returns Promise resolving to array of responses
   */
  batch(requests: LLMRequest[], options?: LLMBatchOptions): Promise<LLMResponse[]>;
  
  /**
   * Gets embeddings for input text.
   * 
   * @param input - Text to embed
   * @param options - Optional embedding configuration
   * @returns Promise resolving to embedding vectors
   */
  embed(input: string | string[], options?: EmbeddingOptions): Promise<EmbeddingResponse>;
  
  /**
   * Lists available models and their capabilities.
   * 
   * @param provider - Optional provider filter
   * @returns Promise resolving to model information
   */
  listModels(provider?: string): Promise<ModelInfo[]>;
  
  /**
   * Gets current usage statistics and costs.
   * 
   * @param timeframe - Optional time range for statistics
   * @returns Promise resolving to usage data
   */
  getUsage(timeframe?: TimeFrame): Promise<UsageStats>;
  
  /**
   * Validates API credentials for providers.
   * 
   * @param provider - Optional provider to validate
   * @returns Promise resolving to validation results
   */
  validateCredentials(provider?: string): Promise<CredentialValidation>;
  
  /**
   * Sets budget limits and alerts.
   * 
   * @param config - Budget configuration
   * @returns Promise that resolves when budget is configured
   */
  configureBudget(config: BudgetConfig): Promise<void>;
}

/**
 * LLM completion request following OpenAI format.
 */
export interface LLMRequest {
  /** Model identifier (e.g., 'gpt-4', 'claude-3-opus', 'gemini-pro') */
  model: string;
  
  /** Array of conversation messages */
  messages: LLMMessage[];
  
  /** Sampling temperature (0-2, default: 1) */
  temperature?: number;
  
  /** Maximum tokens to generate */
  max_tokens?: number;
  
  /** Top-p nucleus sampling (0-1) */
  top_p?: number;
  
  /** Frequency penalty (-2 to 2) */
  frequency_penalty?: number;
  
  /** Presence penalty (-2 to 2) */
  presence_penalty?: number;
  
  /** Stop sequences */
  stop?: string | string[];
  
  /** Number of completions to generate */
  n?: number;
  
  /** Whether to stream the response */
  stream?: boolean;
  
  /** Unique identifier for tracking */
  user?: string;
  
  /** Available functions/tools */
  functions?: LLMFunction[];
  
  /** Function calling behavior */
  function_call?: 'none' | 'auto' | { name: string };
  
  /** Response format specification */
  response_format?: { type: 'text' | 'json_object' };
  
  /** Random seed for deterministic outputs */
  seed?: number;
  
  /** Custom metadata */
  metadata?: Record<string, any>;
}

/**
 * Individual message in conversation.
 */
export interface LLMMessage {
  /** Message role */
  role: 'system' | 'user' | 'assistant' | 'function';
  
  /** Message content */
  content: string | null;
  
  /** Function name (for function role) */
  name?: string;
  
  /** Function call data (for assistant role) */
  function_call?: {
    name: string;
    arguments: string;
  };
  
  /** Message metadata */
  metadata?: Record<string, any>;
}

/**
 * Function/tool definition.
 */
export interface LLMFunction {
  /** Function name */
  name: string;
  
  /** Function description */
  description?: string;
  
  /** Parameter schema (JSON Schema) */
  parameters: Record<string, any>;
  
  /** Whether function is required */
  required?: boolean;
}

/**
 * LLM completion response.
 */
export interface LLMResponse {
  /** Unique response identifier */
  id: string;
  
  /** Object type (always 'chat.completion') */
  object: string;
  
  /** Creation timestamp */
  created: number;
  
  /** Model used for generation */
  model: string;
  
  /** Generated choices */
  choices: LLMChoice[];
  
  /** Token usage information */
  usage: TokenUsage;
  
  /** Provider-specific metadata */
  provider_metadata?: Record<string, any>;
  
  /** Cost information */
  cost?: CostInfo;
  
  /** Performance metrics */
  performance?: PerformanceMetrics;
}

/**
 * Individual completion choice.
 */
export interface LLMChoice {
  /** Choice index */
  index: number;
  
  /** Generated message */
  message: LLMMessage;
  
  /** Finish reason */
  finish_reason: 'stop' | 'length' | 'function_call' | 'content_filter' | null;
  
  /** Log probabilities (if requested) */
  logprobs?: any;
}

/**
 * Streaming response chunk.
 */
export interface LLMStreamChunk {
  /** Unique chunk identifier */
  id: string;
  
  /** Object type (always 'chat.completion.chunk') */
  object: string;
  
  /** Creation timestamp */
  created: number;
  
  /** Model used */
  model: string;
  
  /** Chunk choices */
  choices: StreamChoice[];
  
  /** Usage data (final chunk only) */
  usage?: TokenUsage;
  
  /** Whether this is the final chunk */
  finished?: boolean;
}

/**
 * Streaming choice delta.
 */
export interface StreamChoice {
  /** Choice index */
  index: number;
  
  /** Message delta */
  delta: {
    role?: string;
    content?: string;
    function_call?: {
      name?: string;
      arguments?: string;
    };
  };
  
  /** Finish reason (final chunk only) */
  finish_reason?: 'stop' | 'length' | 'function_call' | 'content_filter' | null;
}

/**
 * Token usage statistics.
 */
export interface TokenUsage {
  /** Prompt tokens consumed */
  prompt_tokens: number;
  
  /** Completion tokens generated */
  completion_tokens: number;
  
  /** Total tokens used */
  total_tokens: number;
  
  /** Cached tokens (if applicable) */
  cached_tokens?: number;
}

/**
 * Cost information for request.
 */
export interface CostInfo {
  /** Input cost in USD */
  input_cost: number;
  
  /** Output cost in USD */
  output_cost: number;
  
  /** Total cost in USD */
  total_cost: number;
  
  /** Currency code */
  currency: string;
  
  /** Cost breakdown by component */
  breakdown?: Record<string, number>;
}

/**
 * Performance metrics.
 */
export interface PerformanceMetrics {
  /** Total request latency (ms) */
  latency: number;
  
  /** Time to first token (ms) */
  ttft?: number;
  
  /** Tokens per second */
  tokens_per_second?: number;
  
  /** Provider response time (ms) */
  provider_latency: number;
  
  /** Queue time (ms) */
  queue_time?: number;
  
  /** Retry count */
  retry_count: number;
  
  /** Provider used */
  provider: string;
}

/**
 * Request options and configuration.
 */
export interface LLMRequestOptions {
  /** Request timeout in milliseconds */
  timeout?: number;
  
  /** Maximum retry attempts */
  max_retries?: number;
  
  /** Fallback models to try */
  fallback_models?: string[];
  
  /** Preferred provider */
  preferred_provider?: string;
  
  /** Cache configuration */
  cache?: {
    enabled: boolean;
    ttl?: number;
    key_prefix?: string;
  };
  
  /** Budget tracking */
  budget?: {
    max_cost?: number;
    track_usage?: boolean;
  };
  
  /** Logging configuration */
  logging?: {
    enabled: boolean;
    log_prompts?: boolean;
    log_responses?: boolean;
  };
  
  /** Custom headers */
  headers?: Record<string, string>;
  
  /** Request metadata */
  metadata?: Record<string, any>;
}

/**
 * Batch processing options.
 */
export interface LLMBatchOptions {
  /** Maximum batch size */
  batch_size?: number;
  
  /** Timeout for entire batch */
  batch_timeout?: number;
  
  /** Whether to fail fast on first error */
  fail_fast?: boolean;
  
  /** Parallelism level */
  concurrency?: number;
  
  /** Progress callback */
  on_progress?: (completed: number, total: number) => void;
}

/**
 * Embedding request options.
 */
export interface EmbeddingOptions {
  /** Embedding model */
  model?: string;
  
  /** Encoding format */
  encoding_format?: 'float' | 'base64';
  
  /** Dimensions (for models that support it) */
  dimensions?: number;
  
  /** User identifier */
  user?: string;
}

/**
 * Embedding response.
 */
export interface EmbeddingResponse {
  /** Object type */
  object: string;
  
  /** Embedding data */
  data: EmbeddingData[];
  
  /** Model used */
  model: string;
  
  /** Token usage */
  usage: TokenUsage;
  
  /** Cost information */
  cost?: CostInfo;
}

/**
 * Individual embedding data.
 */
export interface EmbeddingData {
  /** Object type */
  object: string;
  
  /** Embedding vector */
  embedding: number[];
  
  /** Index in request */
  index: number;
}

/**
 * Model information and capabilities.
 */
export interface ModelInfo {
  /** Model identifier */
  id: string;
  
  /** Model name */
  name: string;
  
  /** Provider name */
  provider: string;
  
  /** Model type */
  type: 'completion' | 'chat' | 'embedding' | 'image' | 'audio';
  
  /** Model capabilities */
  capabilities: {
    functions?: boolean;
    streaming?: boolean;
    max_tokens?: number;
    context_length?: number;
    multimodal?: boolean;
    json_mode?: boolean;
  };
  
  /** Pricing information */
  pricing?: {
    input_cost_per_token: number;
    output_cost_per_token: number;
    currency: string;
  };
  
  /** Performance characteristics */
  performance?: {
    avg_latency: number;
    tokens_per_second: number;
    availability: number;
  };
  
  /** Model status */
  status: 'active' | 'deprecated' | 'beta';
  
  /** Deprecation date if applicable */
  deprecated_at?: string;
}

/**
 * Usage statistics and analytics.
 */
export interface UsageStats {
  /** Time period for statistics */
  period: {
    start: string;
    end: string;
  };
  
  /** Request statistics */
  requests: {
    total: number;
    successful: number;
    failed: number;
    cached: number;
  };
  
  /** Token usage */
  tokens: {
    total: number;
    prompt_tokens: number;
    completion_tokens: number;
  };
  
  /** Cost breakdown */
  costs: {
    total_cost: number;
    by_model: Record<string, number>;
    by_provider: Record<string, number>;
    by_user: Record<string, number>;
  };
  
  /** Performance metrics */
  performance: {
    avg_latency: number;
    p95_latency: number;
    avg_tokens_per_second: number;
    error_rate: number;
  };
  
  /** Top models by usage */
  top_models: Array<{
    model: string;
    requests: number;
    cost: number;
  }>;
  
  /** Usage trends */
  trends?: {
    requests_per_hour: number[];
    cost_per_hour: number[];
    error_rate_per_hour: number[];
  };
}

/**
 * Credential validation result.
 */
export interface CredentialValidation {
  /** Provider name */
  provider: string;
  
  /** Whether credentials are valid */
  valid: boolean;
  
  /** Validation error if any */
  error?: string;
  
  /** Available models with these credentials */
  available_models?: string[];
  
  /** Account information */
  account_info?: {
    organization?: string;
    quota_remaining?: number;
    rate_limits?: Record<string, number>;
  };
  
  /** Validation timestamp */
  validated_at: string;
}

/**
 * Budget configuration and limits.
 */
export interface BudgetConfig {
  /** Daily budget limit in USD */
  daily_limit?: number;
  
  /** Monthly budget limit in USD */
  monthly_limit?: number;
  
  /** Per-user budget limit in USD */
  user_limit?: number;
  
  /** Per-model budget limits */
  model_limits?: Record<string, number>;
  
  /** Alert thresholds (percentage of budget) */
  alert_thresholds?: number[];
  
  /** Alert webhook URL */
  alert_webhook?: string;
  
  /** Whether to hard stop at limit */
  hard_limit?: boolean;
  
  /** Grace period after limit (minutes) */
  grace_period?: number;
}

/**
 * Time frame specification.
 */
export interface TimeFrame {
  /** Start time (ISO string) */
  start?: string;
  
  /** End time (ISO string) */
  end?: string;
  
  /** Relative period */
  period?: 'hour' | 'day' | 'week' | 'month' | 'year';
  
  /** Number of periods to go back */
  periods_back?: number;
}

/**
 * Provider configuration.
 */
export interface ProviderConfig {
  /** Provider name */
  name: string;
  
  /** API key */
  api_key: string;
  
  /** Base URL (if custom) */
  base_url?: string;
  
  /** API version */
  api_version?: string;
  
  /** Organization ID (if applicable) */
  organization?: string;
  
  /** Rate limiting configuration */
  rate_limits?: {
    requests_per_minute?: number;
    tokens_per_minute?: number;
  };
  
  /** Retry configuration */
  retry_config?: {
    max_attempts?: number;
    backoff_factor?: number;
    max_delay?: number;
  };
  
  /** Health check configuration */
  health_check?: {
    enabled: boolean;
    interval?: number;
    timeout?: number;
  };
  
  /** Priority for load balancing */
  priority?: number;
  
  /** Whether this provider is enabled */
  enabled?: boolean;
}