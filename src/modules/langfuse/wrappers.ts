/**
 * @fileoverview Wrapped Langfuse objects for controlled access and context management
 * @module modules/langfuse/wrappers
 * @requires langfuse
 * @requires ./types
 * @requires ./context
 * @requires ./sanitizer
 * 
 * This file implements wrapped versions of Langfuse objects (Trace, Span, Generation, Prompt)
 * that provide controlled access, automatic context management, and data sanitization.
 * These wrappers hide the complexity of Langfuse SDK while ensuring proper usage.
 * 
 * Key concepts:
 * - Wrapped objects that hide raw Langfuse SDK complexity
 * - Automatic context management for spans and traces
 * - Data sanitization before sending to Langfuse
 * - No-op implementations for disabled tracing
 * - Proper lifecycle management with cleanup
 * - Error handling and recovery
 * 
 * @example
 * ```typescript
 * import { WrappedTrace, WrappedSpan } from './wrappers';
 * 
 * // Wrapped trace automatically manages context
 * const trace = new WrappedTrace(langfuseTrace, contextManager, sanitizer);
 * 
 * // Spans are automatically added to context stack
 * const span = trace.span({ name: 'operation' });
 * // ... do work
 * span.end(); // Automatically removed from context stack
 * ```
 * 
 * @since 1.0.0
 */

import { 
  ITrace, ISpan, IGeneration, IPrompt,
  SpanOptions, GenerationOptions, EventOptions,
  TraceUpdate, SpanUpdate, SpanEnd,
  GenerationUpdate, GenerationEnd
} from './types';
import { TraceContextManager } from './context';
import { DataSanitizer } from './sanitizer';
import { LangfuseTraceError, LangfusePromptError } from './errors';

/**
 * Wrapped trace object that provides controlled access to Langfuse traces.
 * 
 * This wrapper provides automatic context management, data sanitization,
 * and proper lifecycle management for Langfuse traces. It ensures that
 * all operations are properly sanitized and context is maintained.
 * 
 * Features:
 * - Automatic data sanitization before sending to Langfuse
 * - Context management for nested spans
 * - Error handling with proper context
 * - Lifecycle management with cleanup
 * - No-op behavior when tracing is disabled
 * 
 * @example
 * ```typescript
 * const trace = new WrappedTrace(langfuseTrace, contextManager, sanitizer);
 * 
 * // Create span with automatic context management
 * const span = trace.span({
 *   name: 'llm-call',
 *   input: { prompt: 'Hello world' }
 * });
 * 
 * // Span is automatically tracked in context
 * const currentSpan = contextManager.getCurrentSpan(); // Returns the span
 * 
 * span.end(); // Automatically removes from context
 * ```
 * 
 * @public
 */
export class WrappedTrace implements ITrace {
  /** Whether this trace has been completed */
  private completed = false;
  
  /** Child span count for debugging */
  private spanCount = 0;
  
  /**
   * Creates a new wrapped trace.
   * 
   * @param trace - The underlying Langfuse trace client
   * @param contextManager - Context manager for span tracking
   * @param sanitizer - Data sanitizer for cleaning sensitive data
   * 
   * @example
   * ```typescript
   * const wrapped = new WrappedTrace(
   *   langfuseTrace,
   *   contextManager,
   *   sanitizer
   * );
   * ```
   */
  constructor(
    private readonly trace: any, // LangfuseTraceClient type
    private readonly contextManager: TraceContextManager,
    private readonly sanitizer: DataSanitizer
  ) {
    console.log(`Created wrapped trace: ${this.id}`);
  }
  
  /**
   * Gets the trace identifier.
   * 
   * @returns Unique trace identifier
   */
  get id(): string {
    return this.trace.id;
  }
  
  /**
   * Creates a new span within this trace.
   * 
   * The span is automatically added to the context stack and will be
   * properly tracked for nested operations.
   * 
   * @param options - Span configuration options
   * @returns Wrapped span with automatic context management
   * @throws {LangfuseTraceError} If trace is completed or span creation fails
   * 
   * @example
   * ```typescript
   * const span = trace.span({
   *   name: 'llm-completion',
   *   input: { messages: [...] },
   *   metadata: { model: 'gpt-4' }
   * });
   * ```
   */
  span(options: SpanOptions): ISpan {
    if (this.completed) {
      throw new LangfuseTraceError(
        'span_creation',
        'Cannot create span on completed trace',
        { traceId: this.id, traceName: options.name }
      );
    }
    
    try {
      console.log(`Creating span '${options.name}' in trace ${this.id}`);
      
      // Sanitize options before sending to Langfuse
      const sanitized = this.sanitizer.sanitizeSpanOptions(options);
      
      // Create underlying Langfuse span
      const langfuseSpan = this.trace.span(sanitized);
      
      // Wrap the span
      const wrappedSpan = new WrappedSpan(
        langfuseSpan,
        this.contextManager,
        this.sanitizer,
        this.id
      );
      
      // Add to context stack
      this.contextManager.pushSpan(wrappedSpan);
      
      this.spanCount++;
      console.log(`✓ Created span ${wrappedSpan.id} (total spans: ${this.spanCount})`);
      
      return wrappedSpan;
      
    } catch (error) {
      console.error(`Failed to create span '${options.name}':`, error);
      throw new LangfuseTraceError(
        'span_creation',
        `Failed to create span: ${error instanceof Error ? error.message : String(error)}`,
        { traceId: this.id, spanName: options.name },
        error instanceof Error ? error : undefined
      );
    }
  }
  
  /**
   * Creates a new generation within this trace.
   * 
   * Generations represent LLM completions and are automatically sanitized
   * to remove sensitive information from inputs and outputs.
   * 
   * @param options - Generation configuration options
   * @returns Wrapped generation
   * @throws {LangfuseTraceError} If trace is completed or generation creation fails
   * 
   * @example
   * ```typescript
   * const generation = trace.generation({
   *   name: 'chat-completion',
   *   model: 'gpt-4',
   *   input: { messages: [...] },
   *   usage: { promptTokens: 100, completionTokens: 50 }
   * });
   * ```
   */
  generation(options: GenerationOptions): IGeneration {
    if (this.completed) {
      throw new LangfuseTraceError(
        'span_creation',
        'Cannot create generation on completed trace',
        { traceId: this.id }
      );
    }
    
    try {
      console.log(`Creating generation '${options.name}' in trace ${this.id}`);
      
      // Sanitize options
      const sanitized = this.sanitizer.sanitizeGenerationOptions(options);
      
      // Create underlying Langfuse generation
      const langfuseGeneration = this.trace.generation(sanitized);
      
      // Wrap and return
      const wrapped = new WrappedGeneration(langfuseGeneration, this.sanitizer);
      
      console.log(`✓ Created generation ${wrapped.id}`);
      return wrapped;
      
    } catch (error) {
      console.error(`Failed to create generation '${options.name}':`, error);
      throw new LangfuseTraceError(
        'span_creation',
        `Failed to create generation: ${error instanceof Error ? error.message : String(error)}`,
        { traceId: this.id, generationName: options.name },
        error instanceof Error ? error : undefined
      );
    }
  }
  
  /**
   * Records an event in this trace.
   * 
   * Events are point-in-time occurrences that don't have duration
   * like spans or generations.
   * 
   * @param options - Event configuration options
   * 
   * @example
   * ```typescript
   * trace.event({
   *   name: 'user-interaction',
   *   input: { action: 'button_click' },
   *   metadata: { buttonId: 'submit' }
   * });
   * ```
   */
  event(options: EventOptions): void {
    if (this.completed) {
      console.warn(`Cannot create event on completed trace ${this.id}`);
      return;
    }
    
    try {
      console.log(`Recording event '${options.name}' in trace ${this.id}`);
      
      // Sanitize options
      const sanitized = this.sanitizer.sanitizeEventOptions(options);
      
      // Create event
      this.trace.event(sanitized);
      
      console.log(`✓ Recorded event ${options.name}`);
      
    } catch (error) {
      console.error(`Failed to record event '${options.name}':`, error);
      // Don't throw for events, just log the error
    }
  }
  
  /**
   * Updates trace data.
   * 
   * @param data - Data to update the trace with
   * 
   * @example
   * ```typescript
   * trace.update({
   *   output: { result: 'success' },
   *   metadata: { duration: 1500 }
   * });
   * ```
   */
  update(data: TraceUpdate): void {
    if (this.completed) {
      console.warn(`Cannot update completed trace ${this.id}`);
      return;
    }
    
    try {
      console.log(`Updating trace ${this.id}`);
      
      // Sanitize update data
      const sanitized = this.sanitizer.sanitizeTraceUpdate(data);
      
      // Update underlying trace
      this.trace.update(sanitized);
      
      console.log(`✓ Updated trace ${this.id}`);
      
    } catch (error) {
      console.error(`Failed to update trace ${this.id}:`, error);
      // Don't throw for updates, just log the error
    }
  }
  
  /**
   * Sets user identifier for this trace.
   * 
   * @param userId - User identifier (will be sanitized)
   */
  setUser(userId: string): void {
    try {
      const sanitizedUserId = this.sanitizer.sanitizeUserId(userId);
      this.trace.update({ userId: sanitizedUserId });
      console.log(`Set user for trace ${this.id}`);
    } catch (error) {
      console.error(`Failed to set user for trace ${this.id}:`, error);
    }
  }
  
  /**
   * Sets session identifier for this trace.
   * 
   * @param sessionId - Session identifier
   */
  setSession(sessionId: string): void {
    try {
      this.trace.update({ sessionId });
      console.log(`Set session for trace ${this.id}`);
    } catch (error) {
      console.error(`Failed to set session for trace ${this.id}:`, error);
    }
  }
  
  /**
   * Adds tags to this trace.
   * 
   * @param tags - Tags to add (will be sanitized)
   */
  addTags(tags: string[]): void {
    try {
      const sanitizedTags = this.sanitizer.sanitizeArray(tags) || [];
      const currentTags = this.trace.tags || [];
      this.trace.update({ tags: [...currentTags, ...sanitizedTags] });
      console.log(`Added ${tags.length} tags to trace ${this.id}`);
    } catch (error) {
      console.error(`Failed to add tags to trace ${this.id}:`, error);
    }
  }
  
  /**
   * Sets metadata on this trace.
   * 
   * @param key - Metadata key
   * @param value - Metadata value (will be sanitized)
   */
  setMetadata(key: string, value: any): void {
    if (!this.sanitizer.isAllowedMetadataKey(key)) {
      console.warn(`Metadata key '${key}' not allowed, skipping`);
      return;
    }
    
    try {
      const sanitizedValue = this.sanitizer.sanitizeData(value);
      const currentMetadata = this.trace.metadata || {};
      
      this.trace.update({
        metadata: {
          ...currentMetadata,
          [key]: sanitizedValue
        }
      });
      
      console.log(`Set metadata '${key}' on trace ${this.id}`);
    } catch (error) {
      console.error(`Failed to set metadata on trace ${this.id}:`, error);
    }
  }
  
  /**
   * Marks this trace as completed.
   * 
   * @internal Used by module for lifecycle management
   */
  markCompleted(): void {
    this.completed = true;
    console.log(`Marked trace ${this.id} as completed`);
  }
  
  /**
   * Gets debug information about this trace.
   * 
   * @returns Debug information
   */
  getDebugInfo(): {
    id: string;
    completed: boolean;
    spanCount: number;
  } {
    return {
      id: this.id,
      completed: this.completed,
      spanCount: this.spanCount
    };
  }
}

/**
 * Wrapped span object that provides controlled access to Langfuse spans.
 * 
 * Spans represent operations with duration and are automatically managed
 * within the trace context. They support nesting and proper lifecycle management.
 * 
 * @public
 */
export class WrappedSpan implements ISpan {
  /** Whether this span has been ended */
  private ended = false;
  
  /** Child span count for debugging */
  private childSpanCount = 0;
  
  /**
   * Creates a new wrapped span.
   * 
   * @param span - The underlying Langfuse span
   * @param contextManager - Context manager for span tracking
   * @param sanitizer - Data sanitizer
   * @param traceId - Parent trace ID
   */
  constructor(
    private readonly span: any, // Langfuse span type
    private readonly contextManager: TraceContextManager,
    private readonly sanitizer: DataSanitizer,
    private readonly traceId: string
  ) {
    console.log(`Created wrapped span: ${this.id} in trace ${traceId}`);
  }
  
  /**
   * Gets the span identifier.
   */
  get id(): string {
    return this.span.id;
  }
  
  /**
   * Creates a nested span within this span.
   * 
   * @param options - Span configuration options
   * @returns Nested wrapped span
   * @throws {LangfuseTraceError} If span is ended
   */
  span(options: SpanOptions): ISpan {
    if (this.ended) {
      throw new LangfuseTraceError(
        'span_creation',
        'Cannot create nested span on ended span',
        { spanId: this.id, traceId: this.traceId }
      );
    }
    
    try {
      console.log(`Creating nested span '${options.name}' in span ${this.id}`);
      
      // Sanitize options
      const sanitized = this.sanitizer.sanitizeSpanOptions(options);
      
      // Create nested span
      const nestedSpan = this.span.span(sanitized);
      
      // Wrap the span
      const wrappedSpan = new WrappedSpan(
        nestedSpan,
        this.contextManager,
        this.sanitizer,
        this.traceId
      );
      
      // Add to context stack
      this.contextManager.pushSpan(wrappedSpan);
      
      this.childSpanCount++;
      console.log(`✓ Created nested span ${wrappedSpan.id}`);
      
      return wrappedSpan;
      
    } catch (error) {
      console.error(`Failed to create nested span:`, error);
      throw new LangfuseTraceError(
        'span_creation',
        `Failed to create nested span: ${error instanceof Error ? error.message : String(error)}`,
        { spanId: this.id, traceId: this.traceId },
        error instanceof Error ? error : undefined
      );
    }
  }
  
  /**
   * Creates a generation within this span.
   * 
   * @param options - Generation configuration options
   * @returns Wrapped generation
   */
  generation(options: GenerationOptions): IGeneration {
    if (this.ended) {
      throw new LangfuseTraceError(
        'span_creation',
        'Cannot create generation on ended span',
        { spanId: this.id, traceId: this.traceId }
      );
    }
    
    try {
      console.log(`Creating generation '${options.name}' in span ${this.id}`);
      
      // Sanitize options
      const sanitized = this.sanitizer.sanitizeGenerationOptions(options);
      
      // Create generation
      const langfuseGeneration = this.span.generation(sanitized);
      
      // Wrap and return
      const wrapped = new WrappedGeneration(langfuseGeneration, this.sanitizer);
      
      console.log(`✓ Created generation ${wrapped.id}`);
      return wrapped;
      
    } catch (error) {
      console.error(`Failed to create generation:`, error);
      throw new LangfuseTraceError(
        'span_creation',
        `Failed to create generation: ${error instanceof Error ? error.message : String(error)}`,
        { spanId: this.id, traceId: this.traceId },
        error instanceof Error ? error : undefined
      );
    }
  }
  
  /**
   * Records an event in this span.
   * 
   * @param options - Event configuration options
   */
  event(options: EventOptions): void {
    if (this.ended) {
      console.warn(`Cannot create event on ended span ${this.id}`);
      return;
    }
    
    try {
      console.log(`Recording event '${options.name}' in span ${this.id}`);
      
      // Sanitize options
      const sanitized = this.sanitizer.sanitizeEventOptions(options);
      
      // Create event
      this.span.event(sanitized);
      
      console.log(`✓ Recorded event ${options.name}`);
      
    } catch (error) {
      console.error(`Failed to record event:`, error);
    }
  }
  
  /**
   * Ends this span with optional completion data.
   * 
   * The span is automatically removed from the context stack when ended.
   * 
   * @param data - Optional span completion data
   * 
   * @example
   * ```typescript
   * span.end({
   *   output: { result: 'success' },
   *   level: 'DEFAULT'
   * });
   * ```
   */
  end(data?: SpanEnd): void {
    if (this.ended) {
      console.warn(`Span ${this.id} already ended`);
      return;
    }
    
    try {
      console.log(`Ending span ${this.id}`);
      
      // Sanitize end data if provided
      const sanitized = data ? this.sanitizer.sanitizeSpanEnd(data) : undefined;
      
      // End underlying span
      this.span.end(sanitized);
      
      // Mark as ended
      this.ended = true;
      
      // Remove from context stack
      try {
        const poppedSpan = this.contextManager.popSpan();
        if (poppedSpan?.id !== this.id) {
          console.warn(`Context stack mismatch: expected ${this.id}, got ${poppedSpan?.id || 'none'}`);
        }
      } catch (error) {
        console.warn(`Failed to pop span from context:`, error);
      }
      
      console.log(`✓ Ended span ${this.id} (child spans: ${this.childSpanCount})`);
      
    } catch (error) {
      console.error(`Failed to end span ${this.id}:`, error);
      // Mark as ended even if underlying call failed
      this.ended = true;
    }
  }
  
  /**
   * Updates span data.
   * 
   * @param data - Data to update the span with
   */
  update(data: SpanUpdate): void {
    if (this.ended) {
      console.warn(`Cannot update ended span ${this.id}`);
      return;
    }
    
    try {
      // Sanitize update data
      const sanitized = this.sanitizer.sanitizeSpanUpdate(data);
      
      // Update underlying span
      this.span.update(sanitized);
      
      console.log(`✓ Updated span ${this.id}`);
      
    } catch (error) {
      console.error(`Failed to update span ${this.id}:`, error);
    }
  }
  
  /**
   * Sets metadata on this span.
   * 
   * @param key - Metadata key
   * @param value - Metadata value
   */
  setMetadata(key: string, value: any): void {
    if (!this.sanitizer.isAllowedMetadataKey(key)) {
      console.warn(`Metadata key '${key}' not allowed, skipping`);
      return;
    }
    
    if (this.ended) {
      console.warn(`Cannot set metadata on ended span ${this.id}`);
      return;
    }
    
    try {
      const sanitizedValue = this.sanitizer.sanitizeData(value);
      
      this.span.update({
        metadata: {
          ...this.span.metadata,
          [key]: sanitizedValue
        }
      });
      
      console.log(`Set metadata '${key}' on span ${this.id}`);
    } catch (error) {
      console.error(`Failed to set metadata on span ${this.id}:`, error);
    }
  }
  
  /**
   * Gets debug information about this span.
   */
  getDebugInfo(): {
    id: string;
    ended: boolean;
    childSpanCount: number;
    traceId: string;
  } {
    return {
      id: this.id,
      ended: this.ended,
      childSpanCount: this.childSpanCount,
      traceId: this.traceId
    };
  }
}

/**
 * Wrapped generation object for LLM completions.
 * 
 * @public
 */
export class WrappedGeneration implements IGeneration {
  /** Whether this generation has been ended */
  private ended = false;
  
  /**
   * Creates a new wrapped generation.
   * 
   * @param generation - The underlying Langfuse generation
   * @param sanitizer - Data sanitizer
   */
  constructor(
    private readonly generation: any, // Langfuse generation type
    private readonly sanitizer: DataSanitizer
  ) {
    console.log(`Created wrapped generation: ${this.id}`);
  }
  
  /**
   * Gets the generation identifier.
   */
  get id(): string {
    return this.generation.id;
  }
  
  /**
   * Updates generation data.
   * 
   * @param data - Data to update the generation with
   */
  update(data: GenerationUpdate): void {
    if (this.ended) {
      console.warn(`Cannot update ended generation ${this.id}`);
      return;
    }
    
    try {
      // Note: would implement sanitizeGenerationUpdate if needed
      this.generation.update(data);
      console.log(`✓ Updated generation ${this.id}`);
    } catch (error) {
      console.error(`Failed to update generation ${this.id}:`, error);
    }
  }
  
  /**
   * Ends this generation with completion data.
   * 
   * @param data - Optional generation completion data
   */
  end(data?: GenerationEnd): void {
    if (this.ended) {
      console.warn(`Generation ${this.id} already ended`);
      return;
    }
    
    try {
      console.log(`Ending generation ${this.id}`);
      
      // Sanitize end data if provided
      const sanitized = data ? this.sanitizer.sanitizeGenerationEnd(data) : undefined;
      
      // End underlying generation
      this.generation.end(sanitized);
      
      this.ended = true;
      console.log(`✓ Ended generation ${this.id}`);
      
    } catch (error) {
      console.error(`Failed to end generation ${this.id}:`, error);
      this.ended = true; // Mark as ended even if call failed
    }
  }
}

/**
 * Wrapped prompt object for prompt management.
 * 
 * @public
 */
export class WrappedPrompt implements IPrompt {
  /**
   * Creates a new wrapped prompt.
   * 
   * @param prompt - The underlying Langfuse prompt
   */
  constructor(private readonly prompt: any) {
    console.log(`Created wrapped prompt: ${this.name} v${this.version}`);
  }
  
  get id(): string {
    return this.prompt.id;
  }
  
  get name(): string {
    return this.prompt.name;
  }
  
  get version(): number {
    return this.prompt.version;
  }
  
  get prompt(): string {
    return this.prompt.prompt;
  }
  
  get type(): 'text' | 'chat' {
    return this.prompt.type || 'text';
  }
  
  get labels(): string[] {
    return this.prompt.labels || [];
  }
  
  get config(): Record<string, any> | undefined {
    return this.prompt.config;
  }
  
  /**
   * Compiles the prompt with provided variables.
   * 
   * @param variables - Variables to substitute in prompt
   * @returns Compiled prompt content
   * @throws {LangfusePromptError} If compilation fails
   */
  compile(variables?: Record<string, any>): string {
    try {
      if (this.prompt.compile) {
        return this.prompt.compile(variables);
      }
      
      // Simple variable substitution if no compile method
      let compiled = this.prompt;
      if (variables) {
        for (const [key, value] of Object.entries(variables)) {
          const placeholder = `{{${key}}}`;
          compiled = compiled.replace(new RegExp(placeholder, 'g'), String(value));
        }
      }
      
      return compiled;
      
    } catch (error) {
      throw new LangfusePromptError(
        'prompt_compilation',
        `Failed to compile prompt: ${error instanceof Error ? error.message : String(error)}`,
        {
          promptName: this.name,
          version: this.version,
          variables
        },
        error instanceof Error ? error : undefined
      );
    }
  }
  
  /**
   * Gets chat messages if prompt is chat type.
   * 
   * @param variables - Variables to substitute
   * @returns Array of chat messages
   * @throws {LangfusePromptError} If prompt is not chat type or compilation fails
   */
  getChatMessages(variables?: Record<string, any>): Array<{ role: string; content: string }> {
    if (this.type !== 'chat') {
      throw new LangfusePromptError(
        'template_rendering',
        'getChatMessages() can only be called on chat-type prompts',
        { promptName: this.name, version: this.version, type: this.type }
      );
    }
    
    try {
      if (this.prompt.getChatMessages) {
        return this.prompt.getChatMessages(variables);
      }
      
      // Simple implementation if no getChatMessages method
      const compiled = this.compile(variables);
      return [{ role: 'user', content: compiled }];
      
    } catch (error) {
      throw new LangfusePromptError(
        'template_rendering',
        `Failed to render chat messages: ${error instanceof Error ? error.message : String(error)}`,
        {
          promptName: this.name,
          version: this.version,
          variables
        },
        error instanceof Error ? error : undefined
      );
    }
  }
}

// No-op implementations for when tracing is disabled

/**
 * No-op trace implementation for when tracing is disabled.
 * Provides zero overhead while maintaining the same interface.
 * 
 * @public
 */
export class NoOpTrace implements ITrace {
  readonly id = 'noop-trace';
  
  span(options: SpanOptions): ISpan {
    return new NoOpSpan();
  }
  
  generation(options: GenerationOptions): IGeneration {
    return new NoOpGeneration();
  }
  
  event(options: EventOptions): void {
    // No-op
  }
  
  update(data: TraceUpdate): void {
    // No-op
  }
  
  setUser(userId: string): void {
    // No-op
  }
  
  setSession(sessionId: string): void {
    // No-op
  }
  
  addTags(tags: string[]): void {
    // No-op
  }
  
  setMetadata(key: string, value: any): void {
    // No-op
  }
}

/**
 * No-op span implementation for when tracing is disabled.
 * 
 * @public
 */
export class NoOpSpan implements ISpan {
  readonly id = 'noop-span';
  
  span(options: SpanOptions): ISpan {
    return new NoOpSpan();
  }
  
  generation(options: GenerationOptions): IGeneration {
    return new NoOpGeneration();
  }
  
  event(options: EventOptions): void {
    // No-op
  }
  
  end(data?: SpanEnd): void {
    // No-op
  }
  
  update(data: SpanUpdate): void {
    // No-op
  }
  
  setMetadata(key: string, value: any): void {
    // No-op
  }
}

/**
 * No-op generation implementation for when tracing is disabled.
 * 
 * @public
 */
export class NoOpGeneration implements IGeneration {
  readonly id = 'noop-generation';
  
  update(data: GenerationUpdate): void {
    // No-op
  }
  
  end(data?: GenerationEnd): void {
    // No-op
  }
}