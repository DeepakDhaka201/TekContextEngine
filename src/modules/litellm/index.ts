/**
 * @fileoverview Public API exports for the LiteLLM integration module
 * @module modules/litellm
 * @requires ./types
 * @requires ./errors
 * @requires ./litellm-module
 * @requires ./factory
 * 
 * This file provides the main public API for the LiteLLM module, exporting
 * all interfaces, types, classes, and factory functions needed by consumers.
 * 
 * The LiteLLM module provides unified access to 100+ LLM APIs through a single
 * interface, with automatic fallbacks, cost tracking, and performance monitoring.
 * 
 * @example
 * ```typescript
 * import { createLiteLLMModule, LLMRequest } from '@/modules/litellm';
 * 
 * // Create and initialize module
 * const litellm = createLiteLLMModule({
 *   providers: {
 *     openai: { api_key: process.env.OPENAI_API_KEY! }
 *   }
 * });
 * await litellm.initialize();
 * 
 * // Use for chat completion
 * const response = await litellm.complete({
 *   model: 'gpt-4',
 *   messages: [{ role: 'user', content: 'Hello!' }]
 * });
 * 
 * // Use for streaming
 * for await (const chunk of litellm.stream(request)) {
 *   console.log(chunk.choices[0].delta.content);
 * }
 * ```
 * 
 * @see https://docs.litellm.ai/ for LiteLLM documentation
 * @since 1.0.0
 */

// Core interfaces and types
export type {
  ILiteLLMModule,
  LLMRequest,
  LLMResponse,
  LLMRequestOptions,
  LLMBatchOptions,
  LLMStreamChunk,
  LLMMessage,
  LLMFunction,
  LLMChoice,
  StreamChoice,
  TokenUsage,
  CostInfo,
  PerformanceMetrics,
  EmbeddingOptions,
  EmbeddingResponse,
  EmbeddingData,
  ModelInfo,
  UsageStats,
  CredentialValidation,
  BudgetConfig,
  TimeFrame,
  ProviderConfig
} from './types';

// Error classes
export {
  LiteLLMError,
  LLMProviderError,
  LLMQuotaExceededError,
  LLMModelError,
  LLMValidationError,
  LLMStreamError,
  LLMBatchError,
  LLMFunctionError,
  LLMConfigurationError,
  isLiteLLMError,
  getRetryInfo,
  createLLMErrorContext
} from './errors';

// Main module implementation
export { LiteLLMModule } from './litellm-module';

// Factory functions
export {
  createLiteLLMModule,
  createTestLiteLLMModule
} from './factory';

// Re-export commonly used types from registry for convenience
export type { HealthStatus } from '../registry/types';

/**
 * Module metadata and version information.
 */
export const MODULE_INFO = {
  name: 'LiteLLM',
  version: '1.0.0',
  description: 'Unified LLM provider access with automatic fallbacks and cost tracking',
  author: 'AgentHub Team',
  dependencies: [],
  capabilities: [
    'multi_provider_llm_access',
    'automatic_fallback',
    'cost_tracking',
    'rate_limiting',
    'streaming_support',
    'batch_processing',
    'function_calling',
    'embedding_generation',
    'performance_monitoring'
  ]
} as const;

/**
 * Supported LLM providers and their model prefixes.
 * 
 * This information can be used for model routing and validation.
 */
export const SUPPORTED_PROVIDERS = {
  openai: {
    name: 'OpenAI',
    models: ['gpt-4', 'gpt-3.5-turbo', 'text-embedding-ada-002'],
    capabilities: ['chat', 'functions', 'streaming', 'embeddings'],
    pricing_unit: 'token'
  },
  anthropic: {
    name: 'Anthropic',
    models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
    capabilities: ['chat', 'functions', 'streaming'],
    pricing_unit: 'token'
  },
  google: {
    name: 'Google (Vertex AI)',
    models: ['gemini-pro', 'gemini-pro-vision', 'text-embedding-004'],
    capabilities: ['chat', 'functions', 'streaming', 'multimodal', 'embeddings'],
    pricing_unit: 'token'
  },
  cohere: {
    name: 'Cohere',
    models: ['command', 'command-light', 'embed-english-v3.0'],
    capabilities: ['chat', 'embeddings'],
    pricing_unit: 'token'
  },
  huggingface: {
    name: 'Hugging Face',
    models: ['meta-llama/Llama-2-70b-chat-hf', 'mistralai/Mistral-7B-Instruct-v0.1'],
    capabilities: ['chat', 'streaming'],
    pricing_unit: 'token'
  },
  replicate: {
    name: 'Replicate',
    models: ['meta/llama-2-70b-chat', 'stability-ai/stable-diffusion'],
    capabilities: ['chat', 'image_generation'],
    pricing_unit: 'second'
  },
  azure: {
    name: 'Azure OpenAI',
    models: ['gpt-4', 'gpt-35-turbo'],
    capabilities: ['chat', 'functions', 'streaming', 'embeddings'],
    pricing_unit: 'token'
  }
} as const;

/**
 * Common model aliases for easier usage.
 * 
 * These aliases map commonly requested models to their provider-specific
 * identifiers, enabling easier model selection and fallback configuration.
 */
export const MODEL_ALIASES = {
  // OpenAI models
  'gpt-4': 'openai/gpt-4',
  'gpt-4-turbo': 'openai/gpt-4-1106-preview',
  'gpt-3.5': 'openai/gpt-3.5-turbo',
  'gpt-3.5-turbo': 'openai/gpt-3.5-turbo',
  
  // Anthropic models
  'claude-3-opus': 'anthropic/claude-3-opus-20240229',
  'claude-3-sonnet': 'anthropic/claude-3-sonnet-20240229',
  'claude-3-haiku': 'anthropic/claude-3-haiku-20240307',
  'claude-opus': 'anthropic/claude-3-opus-20240229',
  'claude-sonnet': 'anthropic/claude-3-sonnet-20240229',
  'claude': 'anthropic/claude-3-sonnet-20240229',
  
  // Google models
  'gemini-pro': 'google/gemini-pro',
  'gemini': 'google/gemini-pro',
  'palm': 'google/chat-bison-001',
  
  // Common embeddings
  'ada': 'openai/text-embedding-ada-002',
  'ada-002': 'openai/text-embedding-ada-002',
  'embedding': 'openai/text-embedding-ada-002'
} as const;

/**
 * Default fallback chains for different use cases.
 * 
 * These pre-configured fallback chains provide reliable model
 * routing for common scenarios.
 */
export const DEFAULT_FALLBACK_CHAINS = {
  /** High-quality chat completion with cost optimization */
  chat_premium: [
    'gpt-4',
    'claude-3-opus',
    'gemini-pro',
    'gpt-3.5-turbo'
  ],
  
  /** Cost-optimized chat completion */
  chat_balanced: [
    'gpt-3.5-turbo',
    'claude-3-haiku',
    'gemini-pro'
  ],
  
  /** Fast, cost-effective responses */
  chat_fast: [
    'gpt-3.5-turbo',
    'claude-3-haiku'
  ],
  
  /** Function calling optimized */
  functions: [
    'gpt-4',
    'gpt-3.5-turbo'
  ],
  
  /** Long context tasks */
  long_context: [
    'claude-3-opus',
    'claude-3-sonnet',
    'gpt-4-turbo'
  ],
  
  /** Code generation and analysis */
  coding: [
    'gpt-4',
    'claude-3-opus',
    'gpt-3.5-turbo'
  ],
  
  /** Creative writing and content */
  creative: [
    'claude-3-opus',
    'gpt-4',
    'gemini-pro'
  ],
  
  /** Embeddings generation */
  embeddings: [
    'openai/text-embedding-ada-002',
    'google/text-embedding-004'
  ]
} as const;

/**
 * Quick start configuration templates for common use cases.
 * 
 * These templates provide pre-configured setups for typical
 * LiteLLM usage patterns.
 */
export const QUICK_START_CONFIGS = {
  /** Minimal configuration for development */
  development: {
    providers: {
      openai: {
        name: 'openai' as const,
        api_key: '${OPENAI_API_KEY}',
        enabled: true
      }
    },
    routing: {
      fallback_models: DEFAULT_FALLBACK_CHAINS.chat_balanced
    },
    cache: { enabled: false },
    monitoring: { enabled: true }
  },
  
  /** Production configuration with multiple providers */
  production: {
    providers: {
      openai: {
        name: 'openai' as const,
        api_key: '${OPENAI_API_KEY}',
        enabled: true,
        priority: 2
      },
      anthropic: {
        name: 'anthropic' as const,
        api_key: '${ANTHROPIC_API_KEY}',
        enabled: true,
        priority: 1
      }
    },
    routing: {
      fallback_models: DEFAULT_FALLBACK_CHAINS.chat_premium,
      load_balancing: true
    },
    cache: {
      enabled: true,
      ttl: 300000,
      storage: 'redis' as const
    },
    monitoring: {
      enabled: true,
      track_costs: true,
      track_performance: true
    },
    budget: {
      daily_limit: 100,
      alert_thresholds: [75, 90, 95]
    }
  },
  
  /** Cost-optimized configuration */
  cost_optimized: {
    providers: {
      openai: {
        name: 'openai' as const,
        api_key: '${OPENAI_API_KEY}',
        enabled: true
      }
    },
    routing: {
      fallback_models: DEFAULT_FALLBACK_CHAINS.chat_balanced
    },
    cache: {
      enabled: true,
      ttl: 600000 // 10 minute cache
    },
    budget: {
      daily_limit: 20,
      alert_thresholds: [80, 95]
    },
    defaults: {
      temperature: 0.7,
      max_tokens: 1000
    }
  }
} as const;