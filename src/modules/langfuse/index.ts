/**
 * @fileoverview Public API exports for the Langfuse observability and prompt management module
 * @module modules/langfuse
 * @requires ./types
 * @requires ./errors
 * @requires ./langfuse-module
 * @requires ./factory
 * @requires ./context
 * @requires ./sanitizer
 * @requires ./wrappers
 * 
 * This file provides the main public API for the Langfuse module, exporting
 * all interfaces, types, classes, and factory functions needed by consumers.
 * 
 * The Langfuse module provides comprehensive observability, tracing, and prompt
 * management for AI agent applications through a wrapped Langfuse SDK.
 * 
 * @example
 * ```typescript
 * import { createLangfuseModule, TraceOptions } from '@/modules/langfuse';
 * 
 * // Create and initialize module
 * const langfuse = createLangfuseModule({
 *   publicKey: process.env.LANGFUSE_PUBLIC_KEY!,
 *   secretKey: process.env.LANGFUSE_SECRET_KEY!
 * });
 * await langfuse.initialize(config);
 * 
 * // Start trace with automatic context management
 * const trace = langfuse.startTrace({
 *   name: 'agent-workflow',
 *   userId: 'user-123'
 * });
 * 
 * // Run operations in trace context
 * await langfuse.runInTraceContext(trace, async () => {
 *   const span = trace.span({ name: 'llm-call' });
 *   // ... do work
 *   span.end();
 * });
 * ```
 * 
 * @see https://langfuse.com/docs for Langfuse documentation
 * @since 1.0.0
 */

// Core interfaces and types
export type {
  ILangfuseModule,
  LangfuseConfig,
  TraceOptions,
  SpanOptions,
  GenerationOptions,
  EventOptions,
  TraceUpdate,
  SpanUpdate,
  SpanEnd,
  GenerationUpdate,
  GenerationEnd,
  Score,
  ITrace,
  ISpan,
  IGeneration,
  IPrompt,
  SanitizerConfig
} from './types';

// Error classes
export {
  LangfuseError,
  LangfuseAPIError,
  LangfuseTraceError,
  LangfusePromptError,
  LangfuseCostError,
  LangfuseDataError,
  LangfuseSessionError,
  LangfuseConfigurationError,
  isLangfuseError,
  getRetryInfo,
  createLangfuseErrorContext,
  sanitizeErrorContext
} from './errors';

// Main module implementation
export { LangfuseModule } from './langfuse-module';

// Factory functions
export {
  createLangfuseModule,
  createTestLangfuseModule
} from './factory';

// Context management (for advanced use cases)
export { TraceContextManager } from './context';

// Data sanitization (for advanced configuration)
export { DataSanitizer } from './sanitizer';

// Wrapper classes (for advanced use cases)
export {
  WrappedTrace,
  WrappedSpan,
  WrappedGeneration,
  WrappedPrompt,
  NoOpTrace,
  NoOpSpan,
  NoOpGeneration
} from './wrappers';

// Re-export commonly used types from registry for convenience
export type { HealthStatus } from '../registry/types';

/**
 * Module metadata and version information.
 */
export const MODULE_INFO = {
  name: 'Langfuse',
  version: '1.0.0',
  description: 'Observability and prompt management through wrapped Langfuse SDK',
  author: 'AgentHub Team',
  dependencies: ['langfuse'],
  capabilities: [
    'distributed_tracing',
    'automatic_context_management',
    'data_sanitization',
    'prompt_management',
    'quality_scoring',
    'performance_monitoring',
    'cost_tracking',
    'session_analytics',
    'no_op_mode'
  ]
} as const;

/**
 * Common trace level constants for consistent usage.
 */
export const TRACE_LEVELS = {
  DEBUG: 'DEBUG',
  DEFAULT: 'DEFAULT',
  WARNING: 'WARNING',
  ERROR: 'ERROR'
} as const;

/**
 * Common score data types for quality evaluation.
 */
export const SCORE_DATA_TYPES = {
  NUMERIC: 'NUMERIC',
  CATEGORICAL: 'CATEGORICAL',
  BOOLEAN: 'BOOLEAN'
} as const;

/**
 * Prompt types supported by Langfuse.
 */
export const PROMPT_TYPES = {
  TEXT: 'text',
  CHAT: 'chat'
} as const;

/**
 * Default configuration templates for common use cases.
 * 
 * These templates provide pre-configured setups for typical
 * Langfuse usage patterns.
 */
export const DEFAULT_CONFIGS = {
  /** Minimal configuration for development */
  DEVELOPMENT: {
    enabled: true,
    maskSensitiveData: true,
    samplingRate: 0.1,
    flushInterval: 5000,
    flushAt: 5
  },
  
  /** Production configuration with full observability */
  PRODUCTION: {
    enabled: true,
    maskSensitiveData: true,
    samplingRate: 1.0,
    flushInterval: 10000,
    flushAt: 15
  },
  
  /** Test configuration with no-op behavior */
  TEST: {
    enabled: false,
    maskSensitiveData: true,
    samplingRate: 0,
    flushInterval: 1000,
    flushAt: 1
  },
  
  /** High-performance configuration with reduced overhead */
  HIGH_PERFORMANCE: {
    enabled: true,
    maskSensitiveData: false, // Reduced sanitization overhead
    samplingRate: 0.1, // Reduced sampling
    flushInterval: 30000, // Less frequent flushing
    flushAt: 50 // Larger batches
  },
  
  /** Privacy-focused configuration with extensive sanitization */
  PRIVACY_FOCUSED: {
    enabled: true,
    maskSensitiveData: true,
    samplingRate: 1.0,
    flushInterval: 10000,
    flushAt: 15,
    redactPatterns: [
      // Comprehensive PII patterns
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email
      /\b(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/g, // Phone
      /\b\d{3}-\d{2}-\d{4}\b/g, // SSN
      /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, // Credit cards
      /[a-zA-Z0-9]{32,}/g // Long alphanumeric strings
    ],
    allowedMetadataKeys: ['model', 'provider', 'version', 'environment']
  }
} as const;

/**
 * Utility functions for common operations.
 */
export const LANGFUSE_UTILS = {
  /**
   * Generates a unique trace ID.
   * 
   * @returns Unique trace identifier
   */
  generateTraceId(): string {
    return `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  },
  
  /**
   * Generates a unique span ID.
   * 
   * @returns Unique span identifier
   */
  generateSpanId(): string {
    return `span-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  },
  
  /**
   * Creates a standardized trace name.
   * 
   * @param operation - Operation name
   * @param context - Optional context
   * @returns Formatted trace name
   */
  createTraceName(operation: string, context?: string): string {
    return context ? `${operation}-${context}` : operation;
  },
  
  /**
   * Creates standardized metadata for common use cases.
   * 
   * @param overrides - Metadata overrides
   * @returns Standard metadata object
   */
  createStandardMetadata(overrides: Record<string, any> = {}): Record<string, any> {
    return {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      ...overrides
    };
  },
  
  /**
   * Validates trace options for common issues.
   * 
   * @param options - Trace options to validate
   * @returns Validation result with issues
   */
  validateTraceOptions(options: import('./types').TraceOptions): {
    isValid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];
    
    if (!options.name || options.name.trim().length === 0) {
      issues.push('Trace name is required and cannot be empty');
    }
    
    if (options.name && options.name.length > 200) {
      issues.push('Trace name should be less than 200 characters');
    }
    
    if (options.userId && options.userId.length > 100) {
      issues.push('User ID should be less than 100 characters');
    }
    
    if (options.sessionId && options.sessionId.length > 100) {
      issues.push('Session ID should be less than 100 characters');
    }
    
    if (options.tags && options.tags.some(tag => tag.length > 50)) {
      issues.push('Tags should be less than 50 characters each');
    }
    
    return {
      isValid: issues.length === 0,
      issues
    };
  }
} as const;

/**
 * Common patterns for different types of operations.
 * 
 * These patterns can be used as templates for consistent tracing
 * across different types of agent operations.
 */
export const OPERATION_PATTERNS = {
  /** LLM completion patterns */
  LLM: {
    COMPLETION: 'llm-completion',
    STREAMING: 'llm-streaming',
    EMBEDDING: 'llm-embedding',
    FUNCTION_CALL: 'llm-function-call'
  },
  
  /** Agent operation patterns */
  AGENT: {
    EXECUTION: 'agent-execution',
    PLANNING: 'agent-planning',
    REASONING: 'agent-reasoning',
    REFLECTION: 'agent-reflection',
    TOOL_USE: 'agent-tool-use'
  },
  
  /** Memory operation patterns */
  MEMORY: {
    RETRIEVAL: 'memory-retrieval',
    STORAGE: 'memory-storage',
    SEARCH: 'memory-search',
    UPDATE: 'memory-update'
  },
  
  /** User interaction patterns */
  USER: {
    INPUT: 'user-input',
    FEEDBACK: 'user-feedback',
    SESSION: 'user-session',
    INTERACTION: 'user-interaction'
  },
  
  /** System operation patterns */
  SYSTEM: {
    INITIALIZATION: 'system-init',
    SHUTDOWN: 'system-shutdown',
    HEALTH_CHECK: 'system-health',
    ERROR_HANDLING: 'system-error'
  }
} as const;

/**
 * Best practice recommendations for using Langfuse tracing.
 */
export const BEST_PRACTICES = {
  TRACE_NAMING: [
    'Use descriptive, consistent names (e.g., "agent-conversation", "llm-completion")',
    'Include context when helpful (e.g., "agent-conversation-support")',
    'Avoid dynamic values in names (use metadata instead)',
    'Use kebab-case for consistency'
  ],
  
  METADATA: [
    'Include relevant context (model, provider, version)',
    'Avoid sensitive information in metadata',
    'Use consistent key names across traces',
    'Keep metadata focused and relevant'
  ],
  
  SPANS: [
    'Create spans for meaningful operations with duration',
    'End spans properly to avoid memory leaks',
    'Use nested spans for sub-operations',
    'Include input/output data when relevant'
  ],
  
  PERFORMANCE: [
    'Use sampling in high-volume scenarios',
    'Configure appropriate flush intervals',
    'Monitor batch sizes for efficiency',
    'Consider async flushing for performance'
  ],
  
  SECURITY: [
    'Always enable data sanitization in production',
    'Configure redaction patterns for your data',
    'Use metadata key whitelisting when needed',
    'Regularly audit traced data for sensitive content'
  ]
} as const;