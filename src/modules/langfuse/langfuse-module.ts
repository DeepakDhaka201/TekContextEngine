/**
 * @fileoverview Main Langfuse module implementation for observability and prompt management
 * @module modules/langfuse/langfuse-module
 * @requires langfuse
 * @requires ./types
 * @requires ./context
 * @requires ./sanitizer
 * @requires ./wrappers
 * @requires ./errors
 * 
 * This file implements the core Langfuse module that provides controlled access to
 * Langfuse observability and prompt management features. It wraps the Langfuse SDK
 * to provide automatic context management, data sanitization, and seamless integration.
 * 
 * Key features:
 * - Wrapped Langfuse SDK for controlled access
 * - Automatic trace context management with AsyncLocalStorage
 * - Data sanitization before sending to Langfuse
 * - No-op mode for disabled tracing with zero overhead
 * - Prompt management with versioning support
 * - Quality scoring and analytics
 * - Comprehensive error handling and recovery
 * 
 * @example
 * ```typescript
 * import { LangfuseModule } from './langfuse-module';
 * 
 * const langfuse = new LangfuseModule();
 * await langfuse.initialize({
 *   publicKey: process.env.LANGFUSE_PUBLIC_KEY!,
 *   secretKey: process.env.LANGFUSE_SECRET_KEY!,
 *   enabled: true,
 *   maskSensitiveData: true
 * });
 * 
 * // Start trace with automatic context
 * const trace = langfuse.startTrace({
 *   name: 'agent-workflow',
 *   userId: 'user-123'
 * });
 * 
 * // Context is automatically managed
 * await langfuse.runInTraceContext(trace, async () => {
 *   const span = trace.span({ name: 'llm-call' });
 *   // ... do work
 *   span.end();
 * });
 * ```
 * 
 * @since 1.0.0
 */

import { Langfuse } from 'langfuse';
import {
  ILangfuseModule, LangfuseConfig, TraceOptions, ITrace, ISpan, IPrompt, Score
} from './types';
import { HealthStatus } from '../registry/types';
import { TraceContextManager } from './context';
import { DataSanitizer } from './sanitizer';
import {
  WrappedTrace, WrappedPrompt, NoOpTrace
} from './wrappers';
import {
  LangfuseError, LangfuseAPIError, LangfuseConfigurationError, LangfuseTraceError, LangfusePromptError
} from './errors';
import { generateId } from '../../shared/utils';

/**
 * Main Langfuse module implementation.
 * 
 * This module provides comprehensive observability and prompt management through
 * a wrapped Langfuse SDK. It ensures automatic context management, data sanitization,
 * and proper lifecycle management while hiding complexity from agent developers.
 * 
 * Architecture:
 * - Wraps Langfuse SDK for controlled access
 * - Uses AsyncLocalStorage for automatic context propagation
 * - Implements data sanitization before sending data
 * - Provides no-op mode for zero overhead when disabled
 * - Supports prompt management and versioning
 * - Includes comprehensive error handling and recovery
 * 
 * Features:
 * - Zero-config tracing that just works
 * - Automatic PII detection and redaction
 * - Context-aware span nesting
 * - Prompt versioning and A/B testing support
 * - Quality scoring and analytics
 * - Health monitoring and diagnostics
 * 
 * @example
 * ```typescript
 * // Initialize module
 * const langfuse = new LangfuseModule();
 * await langfuse.initialize(config);
 * 
 * // Start trace - context is automatic
 * const trace = langfuse.startTrace({ name: 'workflow' });
 * 
 * // All operations in this context are traced
 * await langfuse.runInTraceContext(trace, async () => {
 *   // Nested operations automatically get proper context
 *   await agent.execute(input);
 * });
 * 
 * // Clean shutdown
 * await langfuse.shutdown();
 * ```
 * 
 * @implements {ILangfuseModule}
 * @public
 */
export class LangfuseModule implements ILangfuseModule {
  /** Module name */
  public readonly name = 'langfuse';
  
  /** Module version */
  public readonly version = '1.0.0';
  
  /** Module dependencies (none for Langfuse) */
  public readonly dependencies: string[] = [];
  
  /** Underlying Langfuse client */
  private client?: Langfuse;
  
  /** Context manager for automatic trace propagation */
  private readonly contextManager: TraceContextManager;
  
  /** Data sanitizer for PII protection */
  private sanitizer?: DataSanitizer;
  
  /** Module configuration */
  private config?: LangfuseConfig;
  
  /** Auto-flush timer */
  private flushInterval?: NodeJS.Timeout;
  
  /** Initialization state */
  private initialized = false;
  
  /** Health status */
  private healthStatus: HealthStatus = {
    status: 'unhealthy',
    message: 'Langfuse module not initialized'
  };
  
  /** Usage statistics */
  private stats = {
    tracesCreated: 0,
    spansCreated: 0,
    generationsCreated: 0,
    eventsRecorded: 0,
    errorsEncountered: 0,
    startTime: Date.now()
  };
  
  /**
   * Creates a new Langfuse module instance.
   * 
   * The module is created in an uninitialized state and must be initialized
   * with proper configuration before use.
   * 
   * @example
   * ```typescript
   * const langfuse = new LangfuseModule();
   * await langfuse.initialize(config);
   * ```
   */
  constructor() {
    this.contextManager = new TraceContextManager();
    console.log('Langfuse module created, awaiting initialization');
  }
  
  /**
   * Initializes the Langfuse module.
   * 
   * Sets up the Langfuse client, data sanitizer, context management,
   * and optional auto-flushing. The module can be disabled for zero overhead.
   * 
   * @param config - Langfuse configuration
   * @returns Promise that resolves when initialization is complete
   * @throws {LangfuseConfigurationError} If configuration is invalid
   * @throws {LangfuseAPIError} If Langfuse connection fails
   * 
   * @example
   * ```typescript
   * await langfuse.initialize({
   *   publicKey: 'pk_...',
   *   secretKey: 'sk_...',
   *   enabled: true,
   *   maskSensitiveData: true,
   *   samplingRate: 1.0,
   *   flushInterval: 10000
   * });
   * ```
   */
  async initialize(config: LangfuseConfig): Promise<void> {
    if (this.initialized) {
      console.log('Langfuse module already initialized');
      return;
    }
    
    console.log('Initializing Langfuse module...');
    
    try {
      // Validate configuration
      this.validateConfiguration(config);
      this.config = config;
      
      // If disabled, set up no-op mode
      if (config.enabled === false) {
        console.log('Langfuse tracing disabled, using no-op mode');
        this.initialized = true;
        this.healthStatus = {
          status: 'healthy',
          message: 'Langfuse module initialized (disabled)'
        };
        return;
      }
      
      // Initialize data sanitizer
      this.sanitizer = new DataSanitizer({
        maskSensitiveData: config.maskSensitiveData ?? true,
        redactPatterns: config.redactPatterns || [],
        allowedMetadataKeys: config.allowedMetadataKeys
      });
      
      console.log('Data sanitizer configured:', this.sanitizer.getStatistics());
      
      // Initialize Langfuse client
      this.client = new Langfuse({
        publicKey: config.publicKey,
        secretKey: config.secretKey,
        baseUrl: config.baseUrl,
        flushAt: config.flushAt || 15,
        flushInterval: config.flushInterval || 10000
      });
      
      console.log('Langfuse client created with configuration:', {
        baseUrl: config.baseUrl || 'https://cloud.langfuse.com',
        flushAt: config.flushAt || 15,
        flushInterval: config.flushInterval || 10000
      });
      
      // Test connection with a simple health check
      await this.performHealthCheck();
      
      // Setup auto-flush if configured
      if (config.flushInterval && config.flushInterval > 0) {
        this.setupAutoFlush(config.flushInterval);
      }
      
      this.initialized = true;
      this.healthStatus = {
        status: 'healthy',
        message: 'Langfuse module initialized successfully'
      };
      
      console.log('✓ Langfuse module initialized successfully');
      
    } catch (error) {
      this.stats.errorsEncountered++;
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Failed to initialize Langfuse module:', errorMessage);
      
      this.healthStatus = {
        status: 'unhealthy',
        message: `Initialization failed: ${errorMessage}`
      };
      
      if (error instanceof Error) {
        throw error; // Re-throw known errors
      }
      
      throw new LangfuseConfigurationError(
        `Module initialization failed: ${errorMessage}`,
        'initialization',
        config
      );
    }
  }
  
  /**
   * Starts a new trace with automatic context management.
   * 
   * Creates a wrapped trace that automatically manages context and sanitizes
   * data. If tracing is disabled or sampling excludes the trace, returns
   * a no-op trace for zero overhead.
   * 
   * @param options - Trace configuration options
   * @returns Wrapped trace with automatic context management
   * 
   * @example
   * ```typescript
   * const trace = langfuse.startTrace({
   *   name: 'agent-conversation',
   *   userId: 'user-123',
   *   sessionId: 'session-456',
   *   metadata: { source: 'web-chat' }
   * });
   * ```
   */
  startTrace(options: TraceOptions): ITrace {
    try {
      // Return no-op if not initialized or disabled
      if (!this.initialized || !this.client || this.config?.enabled === false) {
        return new NoOpTrace();
      }
      
      // Apply sampling if configured
      if (this.config?.samplingRate !== undefined) {
        if (Math.random() > this.config.samplingRate) {
          console.log(`Trace '${options.name}' excluded by sampling`);
          return new NoOpTrace();
        }
      }
      
      console.log(`Starting trace: ${options.name}`);
      
      // Sanitize trace options
      const sanitized = this.sanitizer?.sanitizeData(options) || options;
      
      // Create underlying Langfuse trace
      const langfuseTrace = this.client.trace({
        id: options.id,
        name: sanitized.name,
        userId: sanitized.userId,
        sessionId: sanitized.sessionId,
        metadata: sanitized.metadata,
        tags: sanitized.tags,
        release: sanitized.release,
        version: sanitized.version,
        input: sanitized.input,
        timestamp: sanitized.timestamp
      });
      
      // Wrap trace for controlled access
      const wrappedTrace = new WrappedTrace(
        langfuseTrace,
        this.contextManager,
        this.sanitizer!
      );
      
      // Create and set trace context
      const context = this.contextManager.createContext(wrappedTrace, {
        traceName: options.name,
        startTime: Date.now()
      });
      this.contextManager.setContext(context);
      
      this.stats.tracesCreated++;
      console.log(`✓ Started trace ${wrappedTrace.id} (total traces: ${this.stats.tracesCreated})`);
      
      return wrappedTrace;
      
    } catch (error) {
      this.stats.errorsEncountered++;
      console.error(`Failed to start trace '${options.name}':`, error);
      
      // Return no-op trace to prevent breaking the application
      return new NoOpTrace();
    }
  }
  
  /**
   * Gets the current active trace from context.
   * 
   * @returns Current trace or null if no trace is active
   * 
   * @example
   * ```typescript
   * const currentTrace = langfuse.getCurrentTrace();
   * if (currentTrace) {
   *   const span = currentTrace.span({ name: 'operation' });
   * }
   * ```
   */
  getCurrentTrace(): ITrace | null {
    return this.contextManager.getCurrentTrace();
  }
  
  /**
   * Runs a function within a specific trace context.
   * 
   * This is the primary method for ensuring operations have proper trace context.
   * All nested operations will automatically have access to the trace.
   * 
   * @param trace - Trace to run the function in
   * @param fn - Function to execute within the trace context
   * @returns Promise resolving to the function's return value
   * 
   * @example
   * ```typescript
   * const result = await langfuse.runInTraceContext(trace, async () => {
   *   // All operations here automatically have trace context
   *   const data = await agent.process(input);
   *   const span = langfuse.getCurrentTrace()?.span({ name: 'processing' });
   *   return data;
   * });
   * ```
   */
  async runInTraceContext<T>(trace: ITrace, fn: () => Promise<T>): Promise<T> {
    if (trace instanceof NoOpTrace) {
      // No context needed for no-op traces
      return await fn();
    }
    
    try {
      const context = this.contextManager.createContext(trace, {
        executionType: 'runInTraceContext'
      });
      
      return await this.contextManager.runInContext(context, fn);
      
    } catch (error) {
      this.stats.errorsEncountered++;
      console.error('Error in trace context execution:', error);
      throw error;
    }
  }
  
  /**
   * Runs a function within a specific span context.
   * 
   * @param span - Span to run the function in
   * @param fn - Function to execute within the span context
   * @returns Promise resolving to the function's return value
   */
  async runInSpanContext<T>(span: ISpan, fn: () => Promise<T>): Promise<T> {
    // For now, delegate to trace context
    // In a more advanced implementation, we could manage span-specific context
    const currentTrace = this.getCurrentTrace();
    if (!currentTrace) {
      console.warn('No trace context available for span context');
      return await fn();
    }
    
    return await this.runInTraceContext(currentTrace, fn);
  }
  
  /**
   * Scores a trace for quality evaluation.
   * 
   * @param traceId - Trace identifier to score
   * @param score - Score data and metrics
   * @returns Promise that resolves when score is recorded
   * @throws {LangfuseAPIError} If scoring fails
   */
  async scoreTrace(traceId: string, score: Score): Promise<void> {
    if (!this.client || this.config?.enabled === false) {
      return;
    }
    
    try {
      console.log(`Scoring trace ${traceId}: ${score.name} = ${score.value}`);
      
      await this.client.score({
        traceId,
        name: score.name,
        value: score.value,
        comment: score.comment,
        dataType: score.dataType,
        configId: score.configId
      });
      
      console.log(`✓ Scored trace ${traceId}`);
      
    } catch (error) {
      this.stats.errorsEncountered++;
      console.error(`Failed to score trace ${traceId}:`, error);
      
      throw new LangfuseAPIError(
        `Failed to score trace: ${error instanceof Error ? error.message : String(error)}`,
        'POST',
        'scores',
        undefined,
        error instanceof Error ? error : undefined,
        { traceId, scoreName: score.name }
      );
    }
  }
  
  /**
   * Scores a generation for quality evaluation.
   * 
   * @param generationId - Generation identifier to score
   * @param score - Score data and metrics
   * @returns Promise that resolves when score is recorded
   */
  async scoreGeneration(generationId: string, score: Score): Promise<void> {
    if (!this.client || this.config?.enabled === false) {
      return;
    }
    
    try {
      console.log(`Scoring generation ${generationId}: ${score.name} = ${score.value}`);
      
      await this.client.score({
        traceId: generationId, // Langfuse uses traceId field for generation scoring
        name: score.name,
        value: score.value,
        comment: score.comment,
        dataType: score.dataType,
        configId: score.configId
      });
      
      console.log(`✓ Scored generation ${generationId}`);
      
    } catch (error) {
      this.stats.errorsEncountered++;
      console.error(`Failed to score generation ${generationId}:`, error);
      
      throw new LangfuseAPIError(
        `Failed to score generation: ${error instanceof Error ? error.message : String(error)}`,
        'POST',
        'scores',
        undefined,
        error instanceof Error ? error : undefined,
        { generationId, scoreName: score.name }
      );
    }
  }
  
  /**
   * Retrieves a prompt by name and version.
   * 
   * @param name - Prompt name
   * @param version - Prompt version (optional, defaults to latest)
   * @returns Promise resolving to wrapped prompt object
   * @throws {LangfusePromptError} If prompt retrieval fails
   */
  async getPrompt(name: string, version?: string): Promise<IPrompt> {
    if (!this.client) {
      throw new LangfuseConfigurationError(
        'Langfuse not initialized',
        'initialization',
        false
      );
    }
    
    try {
      console.log(`Retrieving prompt: ${name}${version ? ` v${version}` : ' (latest)'}`);
      
      const prompt = await this.client.getPrompt(
        name,
        version === 'latest' ? undefined : (version ? parseInt(version) : undefined)
      );
      
      const wrapped = new WrappedPrompt(prompt);
      console.log(`✓ Retrieved prompt ${name} v${wrapped.version}`);
      
      return wrapped;
      
    } catch (error) {
      this.stats.errorsEncountered++;
      console.error(`Failed to retrieve prompt ${name}:`, error);
      
      throw new LangfusePromptError(
        'prompt_retrieval',
        `Failed to retrieve prompt: ${error instanceof Error ? error.message : String(error)}`,
        { promptName: name, version },
        error instanceof Error ? error : undefined
      );
    }
  }
  
  /**
   * Flushes pending traces to Langfuse.
   * 
   * @returns Promise that resolves when flush is complete
   * @throws {LangfuseAPIError} If flush fails
   */
  async flush(): Promise<void> {
    if (!this.client) {
      return;
    }
    
    try {
      console.log('Flushing pending traces to Langfuse...');
      
      await this.client.flushAsync();
      
      console.log('✓ Successfully flushed traces to Langfuse');
      
    } catch (error) {
      this.stats.errorsEncountered++;
      console.error('Failed to flush traces:', error);
      
      throw new LangfuseAPIError(
        `Failed to flush traces: ${error instanceof Error ? error.message : String(error)}`,
        'POST',
        'flush',
        undefined,
        error instanceof Error ? error : undefined
      );
    }
  }
  
  /**
   * Gets module health status.
   * 
   * @returns Promise resolving to current health status
   */
  async health(): Promise<HealthStatus> {
    if (!this.initialized) {
      return {
        status: 'unhealthy',
        message: 'Langfuse module not initialized'
      };
    }
    
    if (this.config?.enabled === false) {
      return {
        status: 'healthy',
        message: 'Langfuse module operational (disabled mode)'
      };
    }
    
    try {
      // Perform health check
      await this.performHealthCheck();
      
      return {
        status: 'healthy',
        message: 'Langfuse module operational',
        details: {
          stats: this.getStatistics(),
          contextManager: this.contextManager.getDebugInfo(),
          uptime: Date.now() - this.stats.startTime
        }
      };
      
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `Health check failed: ${error instanceof Error ? error.message : String(error)}`,
        details: { error }
      };
    }
  }
  
  /**
   * Gracefully shuts down the module.
   * 
   * @returns Promise that resolves when shutdown is complete
   */
  async shutdown(): Promise<void> {
    console.log('Shutting down Langfuse module...');
    
    try {
      // Clear flush interval
      if (this.flushInterval) {
        clearInterval(this.flushInterval);
        this.flushInterval = undefined;
      }
      
      // Final flush
      if (this.client) {
        console.log('Performing final flush...');
        await this.flush();
        
        // Shutdown client
        console.log('Shutting down Langfuse client...');
        await this.client.shutdownAsync();
      }
      
      // Clear context
      this.contextManager.clearContext();
      
      // Reset state
      this.initialized = false;
      this.client = undefined;
      this.sanitizer = undefined;
      this.config = undefined;
      
      this.healthStatus = {
        status: 'unhealthy',
        message: 'Langfuse module shut down'
      };
      
      console.log('✓ Langfuse module shut down successfully');
      
    } catch (error) {
      console.error('Error during Langfuse shutdown:', error);
      throw error;
    }
  }
  
  // Private implementation methods
  
  /**
   * Validates the module configuration.
   * 
   * @param config - Configuration to validate
   * @throws {LangfuseConfigurationError} If configuration is invalid
   * @private
   */
  private validateConfiguration(config: LangfuseConfig): void {
    if (!config.publicKey) {
      throw new LangfuseConfigurationError(
        'Langfuse public key is required',
        'publicKey',
        config.publicKey
      );
    }
    
    if (!config.secretKey) {
      throw new LangfuseConfigurationError(
        'Langfuse secret key is required',
        'secretKey',
        config.secretKey
      );
    }
    
    // Validate key formats
    if (!config.publicKey.startsWith('pk_')) {
      throw new LangfuseConfigurationError(
        'Invalid Langfuse public key format (should start with pk_)',
        'publicKey',
        config.publicKey
      );
    }
    
    if (!config.secretKey.startsWith('sk_')) {
      throw new LangfuseConfigurationError(
        'Invalid Langfuse secret key format (should start with sk_)',
        'secretKey',
        config.secretKey
      );
    }
    
    // Validate optional numeric fields
    if (config.samplingRate !== undefined) {
      if (config.samplingRate < 0 || config.samplingRate > 1) {
        throw new LangfuseConfigurationError(
          'Sampling rate must be between 0 and 1',
          'samplingRate',
          config.samplingRate
        );
      }
    }
    
    if (config.flushInterval !== undefined) {
      if (config.flushInterval < 1000) {
        throw new LangfuseConfigurationError(
          'Flush interval must be at least 1000ms',
          'flushInterval',
          config.flushInterval
        );
      }
    }
    
    if (config.flushAt !== undefined) {
      if (config.flushAt < 1) {
        throw new LangfuseConfigurationError(
          'Flush batch size must be at least 1',
          'flushAt',
          config.flushAt
        );
      }
    }
  }
  
  /**
   * Performs a health check by creating a test trace.
   * 
   * @private
   */
  private async performHealthCheck(): Promise<void> {
    if (!this.client) {
      throw new LangfuseAPIError(
        'Langfuse client not available',
        'GET',
        'health-check'
      );
    }
    
    try {
      // Create a simple test trace
      const healthTrace = this.client.trace({
        name: 'health-check',
        metadata: {
          type: 'health-check',
          timestamp: Date.now()
        }
      });
      
      // Update trace to test API connectivity
      healthTrace.update({
        output: { status: 'healthy' }
      });
      
      // Flush to ensure connectivity
      await this.client.flushAsync();
      
    } catch (error) {
      throw new LangfuseAPIError(
        `Health check failed: ${error instanceof Error ? error.message : String(error)}`,
        'POST',
        'health-check',
        undefined,
        error instanceof Error ? error : undefined
      );
    }
  }
  
  /**
   * Sets up auto-flushing at regular intervals.
   * 
   * @param intervalMs - Flush interval in milliseconds
   * @private
   */
  private setupAutoFlush(intervalMs: number): void {
    console.log(`Setting up auto-flush every ${intervalMs}ms`);
    
    this.flushInterval = setInterval(async () => {
      try {
        await this.flush();
      } catch (error) {
        console.error('Auto-flush error:', error);
      }
    }, intervalMs);
  }
  
  /**
   * Gets usage statistics for monitoring.
   * 
   * @returns Current usage statistics
   * @private
   */
  private getStatistics(): {
    tracesCreated: number;
    spansCreated: number;
    generationsCreated: number;
    eventsRecorded: number;
    errorsEncountered: number;
    uptimeMs: number;
    enabled: boolean;
  } {
    return {
      ...this.stats,
      uptimeMs: Date.now() - this.stats.startTime,
      enabled: this.config?.enabled !== false
    };
  }
}