/**
 * @fileoverview LLM Agent module exports
 * @module agents/llm
 * 
 * This file serves as the central export point for the LLM Agent module,
 * providing access to all public interfaces, classes, and utilities needed
 * for creating and using LLM agents that provide direct interaction with
 * language models.
 * 
 * The LLM Agent module enables sophisticated language model interactions
 * with automatic model selection, conversation memory, tool integration,
 * streaming responses, and comprehensive safety mechanisms.
 * 
 * Key exports:
 * - ILLMAgent: Primary interface for LLM agent interactions
 * - LLMAgent: Main implementation class
 * - LLMAgentFactory: Factory for creating configured agent instances
 * - LLMAgentPresets: Pre-built configurations for common use cases
 * - Type definitions: Comprehensive types for all LLM agent features
 * - Error classes: Specialized error handling for LLM scenarios
 * 
 * @example
 * ```typescript
 * import { 
 *   createLLMAgent,
 *   LLMAgentPresets,
 *   LLMAgentConfig,
 *   ModelRouting
 * } from '@/agents/llm';
 * 
 * // Create agent with preset
 * const agent = await createLLMAgent({
 *   ...LLMAgentPresets.codeAssistant,
 *   name: 'My Code Helper'
 * });
 * 
 * // Execute completion
 * const response = await agent.execute({
 *   prompt: 'Write a function to sort an array',
 *   sessionId: 'session-123'
 * });
 * 
 * // Stream response
 * for await (const chunk of agent.stream({
 *   prompt: 'Explain machine learning',
 *   sessionId: 'session-123'
 * })) {
 *   process.stdout.write(chunk.delta);
 * }
 * ```
 * 
 * @public
 * @since 1.0.0
 */

// Core agent interface and implementation
export type { ILLMAgent } from './types';
export { LLMAgent } from './llm-agent';

// Factory for agent creation
export {
  LLMAgentFactory,
  LLMAgentPresets,
  createLLMAgent,
  createLLMAgentWithPreset,
  createMultipleLLMAgents,
  llmAgentFactory
} from './factory';

// Memory management
export { ConversationMemory } from './conversation-memory';

// Import types for internal usage
import type {
  LLMAgentConfig,
  LLMAgentType,
  ModelRouting,
  ResponseFormat,
  TokenUsage
} from './types';

// Import all exports for re-export
import { LLMAgent } from './llm-agent';
import {
  LLMAgentFactory,
  LLMAgentPresets,
  createLLMAgent,
  createLLMAgentWithPreset,
  createMultipleLLMAgents,
  llmAgentFactory
} from './factory';
import { ConversationMemory } from './conversation-memory';

// Comprehensive type definitions
export type {
  // Core types
  LLMAgentType,
  LLMAgentConfig,
  LLMAgentInput,
  LLMAgentOutput,
  LLMAgentStreamOutput,
  LLMAgentCapabilities,
  
  // Model and routing types
  ModelRouting,
  ModelParameters,
  ModelSelectionContext,
  
  // Prompting types
  Example,
  ResponseFormat,
  ResponseValidator,
  ValidationContext,
  
  // Memory types
  MemoryPersistence,
  ConversationMemory as IConversationMemory,
  
  // Tool types (ToolResult is exported from base types)
  
  // Usage and metrics types
  TokenUsage,
  QualityMetrics,
  StreamingMetadata,
  
  // Safety types
  ContentFilterLevel,
  SafetyCheck,
  SafetyContext,
  SafetyCheckResult,
  SafetyResult,
  
  // Internal types
  LLMInternalResponse,
  LLMRequest
} from './types';

// Error handling system
export {
  // Base error class
  LLMAgentError,
  
  // Specific error classes
  ModelCompletionError,
  ModelStreamingError,
  ModelSelectionError,
  ToolExecutionError,
  ToolCallParsingError,
  MemoryError,
  ResponseValidationError,
  ContentSafetyError,
  ContextLengthError,
  RateLimitError,
  QuotaExceededError,
  LLMConfigurationError,
  PromptEngineeringError,
  ModelAuthenticationError,
  TokenEstimationError,
  
  // Error utilities
  isLLMAgentError,
  createLLMErrorContext,
  getRetryStrategy,
  getRecoverySuggestions,
  sanitizeLLMError,
  LLM_ERROR_RECOVERY_SUGGESTIONS
} from './errors';

/**
 * Module metadata for registry integration.
 * 
 * @public
 */
export const LLM_AGENT_MODULE_METADATA = {
  name: 'llmAgent',
  version: '1.0.0',
  description: 'LLM Agent for direct language model interaction',
  author: 'AgentHub Team',
  license: 'MIT',
  keywords: [
    'llm-agent',
    'language-model',
    'conversation',
    'tool-integration',
    'streaming',
    'memory-management'
  ],
  dependencies: [
    'litellm',
    'memory',
    'base-agent'
  ],
  optionalDependencies: [
    'streaming',
    'human-loop'
  ],
  capabilities: [
    'text-completion',
    'conversation-memory',
    'tool-execution',
    'streaming-responses',
    'model-routing',
    'safety-validation',
    'context-management',
    'prompt-engineering'
  ],
  supportedModels: [
    'gpt-4',
    'gpt-4-32k',
    'gpt-3.5-turbo',
    'gpt-3.5-turbo-16k',
    'claude-3-opus',
    'claude-3-sonnet',
    'claude-3-haiku'
  ],
  configurationSchema: {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 1 },
      description: { type: 'string' },
      model: {
        type: 'object',
        properties: {
          primary: { type: 'string' },
          fallback: { type: 'array', items: { type: 'string' } },
          routing: { type: 'string', enum: ['cost', 'quality', 'speed', 'balanced', 'custom'] }
        }
      },
      prompting: {
        type: 'object',
        properties: {
          systemPrompt: { type: 'string' },
          promptTemplate: { type: 'string' },
          format: { type: 'string', enum: ['text', 'json', 'markdown', 'code', 'structured', 'xml', 'yaml'] },
          examples: { type: 'array' }
        }
      },
      memory: {
        type: 'object',
        properties: {
          enabled: { type: 'boolean' },
          maxMessages: { type: 'number', minimum: 1 },
          summarizeAfter: { type: 'number', minimum: 1 },
          persistence: { type: 'string', enum: ['session', 'temporary', 'permanent', 'disabled'] }
        }
      },
      tools: {
        type: 'object',
        properties: {
          autoExecute: { type: 'boolean' },
          maxIterations: { type: 'number', minimum: 1 },
          executionTimeout: { type: 'number', minimum: 1000 }
        }
      },
      behavior: {
        type: 'object',
        properties: {
          temperature: { type: 'number', minimum: 0, maximum: 2 },
          maxTokens: { type: 'number', minimum: 1 },
          topP: { type: 'number', minimum: 0, maximum: 1 }
        }
      }
    },
    required: ['name']
  }
} as const;

/**
 * Common LLM agent patterns and utilities.
 * 
 * @public
 */
export const LLMAgentPatterns = {
  /**
   * Creates a conversational agent configuration.
   * 
   * @param options - Configuration options
   * @returns Conversation-optimized configuration
   */
  createConversational: (
    options: Partial<LLMAgentConfig> = {}
  ): LLMAgentConfig => ({
    id: options.id || `conversational-${Date.now()}`,
    ...LLMAgentPresets.chatbot,
    ...options,
    memory: {
      enabled: true,
      maxMessages: 25,
      summarizeAfter: 40,
      ...options.memory
    },
    behavior: {
      temperature: 0.7,
      maxTokens: 1000,
      ...options.behavior
    }
  }),
  
  /**
   * Creates a task-focused agent configuration.
   * 
   * @param task - Task description
   * @param options - Configuration options
   * @returns Task-optimized configuration
   */
  createTaskFocused: (
    task: string,
    options: Partial<LLMAgentConfig> = {}
  ): LLMAgentConfig => ({
    id: options.id || `task-${task.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
    name: `${task} Agent`,
    type: 'llm',
    model: {
      primary: 'gpt-4',
      routing: 'quality'
    },
    prompting: {
      systemPrompt: `You are an AI assistant specialized in ${task}. Provide accurate, helpful responses focused on this domain.`,
      format: 'text'
    },
    memory: {
      enabled: true,
      maxMessages: 15
    },
    tools: {
      autoExecute: true
    },
    behavior: {
      temperature: 0.3,
      maxTokens: 2000
    },
    ...options
  }),
  
  /**
   * Creates a streaming-optimized agent configuration.
   * 
   * @param options - Configuration options
   * @returns Streaming-optimized configuration
   */
  createStreamingOptimized: (
    options: Partial<LLMAgentConfig> = {}
  ): LLMAgentConfig => ({
    id: options.id || `streaming-${Date.now()}`,
    name: 'Streaming Agent',
    type: 'llm',
    model: {
      primary: 'gpt-3.5-turbo',
      routing: 'speed'
    },
    streaming: {
      enabled: true,
      bufferSize: 512,
      timeout: 10000
    },
    behavior: {
      temperature: 0.7,
      maxTokens: 1500
    },
    ...options
  })
} as const;

/**
 * Version information for the LLM Agent module.
 * 
 * @public
 */
export const VERSION = '1.0.0';

/**
 * Default export for convenient module access.
 * 
 * @public
 */
const defaultExport = {
  LLMAgent,
  LLMAgentFactory,
  LLMAgentPresets,
  ConversationMemory,
  createLLMAgent,
  createLLMAgentWithPreset,
  llmAgentFactory,
  LLMAgentPatterns,
  VERSION,
  metadata: LLM_AGENT_MODULE_METADATA
};

export default defaultExport;

/**
 * Re-export commonly used types for convenience.
 * 
 * @public
 */
export namespace Types {
  export type Config = import('./types').LLMAgentConfig;
  export type Input = import('./types').LLMAgentInput;
  export type Output = import('./types').LLMAgentOutput;
  export type StreamOutput = import('./types').LLMAgentStreamOutput;
  export type Capabilities = import('./types').LLMAgentCapabilities;
  export type Routing = import('./types').ModelRouting;
  export type Format = import('./types').ResponseFormat;
  export type Usage = import('./types').TokenUsage;
  export type Memory = import('./types').ConversationMemory;
  // ToolResult is available from base types: import('../base/types').ToolResult
}

/**
 * Utility functions namespace.
 * 
 * @public
 */
export namespace Utils {
  /**
   * Checks if an agent instance is an LLM Agent.
   */
  export function isLLMAgent(agent: any): agent is import('./llm-agent').LLMAgent {
    return agent &&
           typeof agent === 'object' &&
           agent.type === 'llm' &&
           typeof agent.execute === 'function' &&
           typeof agent.stream === 'function';
  }
  
  /**
   * Estimates tokens for text content.
   */
  export function estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }
  
  /**
   * Validates LLM agent configuration.
   */
  export function validateConfig(config: any): config is LLMAgentConfig {
    return config &&
           typeof config === 'object' &&
           typeof config.name === 'string' &&
           config.name.length > 0;
  }
  
  /**
   * Creates a simple model configuration.
   */
  export function createModelConfig(
    primary: string,
    routing: ModelRouting = 'balanced'
  ): NonNullable<LLMAgentConfig['model']> {
    return {
      primary,
      routing,
      fallback: [],
      parameters: {}
    };
  }
  
  /**
   * Creates a simple prompting configuration.
   */
  export function createPromptingConfig(
    systemPrompt: string,
    format: ResponseFormat = 'text'
  ): NonNullable<LLMAgentConfig['prompting']> {
    return {
      systemPrompt,
      format,
      examples: []
    };
  }
  
  /**
   * Formats token usage for display.
   */
  export function formatTokenUsage(usage: TokenUsage): string {
    const { promptTokens, completionTokens, totalTokens, cost } = usage;
    let formatted = `${totalTokens} tokens (${promptTokens} prompt + ${completionTokens} completion)`;
    
    if (cost) {
      formatted += ` - $${cost.toFixed(4)}`;
    }
    
    return formatted;
  }
  
  /**
   * Merges two configurations with intelligent defaults.
   */
  export function mergeConfigs(
    base: Partial<LLMAgentConfig>,
    overrides: Partial<LLMAgentConfig>
  ): LLMAgentConfig {
    const merged: any = { ...base };
    
    for (const [key, value] of Object.entries(overrides)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        merged[key] = { ...merged[key], ...value };
      } else {
        merged[key] = value;
      }
    }
    
    return merged as LLMAgentConfig;
  }
}