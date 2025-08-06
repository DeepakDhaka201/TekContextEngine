/**
 * @fileoverview Trace context management for Langfuse integration
 * @module modules/langfuse/context
 * @requires async_hooks
 * @requires ./types
 * 
 * This file implements automatic trace context management using Node.js AsyncLocalStorage.
 * It provides transparent context propagation across async operations without manual
 * context passing, making tracing completely invisible to agent developers.
 * 
 * Key concepts:
 * - AsyncLocalStorage for automatic context propagation
 * - Trace and span stack management
 * - Memory leak prevention with proper cleanup
 * - Thread-safe context operations
 * - Nested span handling with automatic parent-child relationships
 * 
 * @example
 * ```typescript
 * import { TraceContextManager } from './context';
 * 
 * const contextManager = new TraceContextManager();
 * 
 * // Context automatically propagates through async operations
 * await contextManager.runInContext(traceContext, async () => {
 *   // This function and all nested async calls have access to trace context
 *   const currentTrace = contextManager.getCurrentTrace();
 *   const span = currentTrace?.span({ name: 'operation' });
 * });
 * ```
 * 
 * @see https://nodejs.org/api/async_hooks.html#asynclocalstorage for AsyncLocalStorage
 * @since 1.0.0
 */

import { AsyncLocalStorage } from 'async_hooks';
import { ITrace, ISpan } from './types';

/**
 * Complete trace context information.
 * 
 * Contains the current trace, span stack, and metadata for automatic
 * context management across async operations.
 */
interface TraceContext {
  /** Current active trace */
  trace: ITrace;
  
  /** Stack of active spans (most recent last) */
  spans: ISpan[];
  
  /** Context metadata and additional information */
  metadata: Map<string, any>;
  
  /** Context creation timestamp for debugging */
  createdAt: Date;
  
  /** Context identifier for debugging */
  contextId: string;
}

/**
 * Manages trace context using AsyncLocalStorage for automatic propagation.
 * 
 * This class provides the core functionality for transparent trace context
 * management. It uses Node.js AsyncLocalStorage to automatically propagate
 * trace context across async operations without requiring manual context
 * passing throughout the codebase.
 * 
 * Features:
 * - Automatic context propagation across async calls
 * - Span stack management with proper nesting
 * - Memory leak prevention through context cleanup
 * - Thread-safe operations
 * - Context debugging and inspection
 * - Metadata management for additional context data
 * 
 * Architecture:
 * - Uses AsyncLocalStorage as the core storage mechanism
 * - Maintains a stack of active spans within each trace
 * - Provides safe context operations with error handling
 * - Automatically manages parent-child relationships
 * 
 * @example
 * ```typescript
 * const contextManager = new TraceContextManager();
 * 
 * // Start trace with automatic context
 * const trace = startTrace({ name: 'workflow' });
 * contextManager.setContext({
 *   trace,
 *   spans: [],
 *   metadata: new Map(),
 *   createdAt: new Date(),
 *   contextId: generateId()
 * });
 * 
 * // Context automatically available in async operations
 * await someAsyncOperation(); // Can access trace via getCurrentTrace()
 * 
 * // Nested spans are automatically managed
 * const span = trace.span({ name: 'step1' }); // Automatically pushed to stack
 * await anotherAsyncOperation(); // Has access to span via getCurrentSpan()
 * span.end(); // Automatically popped from stack
 * ```
 * 
 * Memory management:
 * - Contexts are automatically cleaned up when async operations complete
 * - Explicit cleanup methods provided for long-running operations
 * - Span stacks are properly managed to prevent memory leaks
 * - Metadata maps are cleared when contexts are destroyed
 * 
 * @public
 */
export class TraceContextManager {
  /**
   * AsyncLocalStorage instance for context management.
   * 
   * This provides automatic context propagation across async boundaries
   * without requiring manual context passing.
   */
  private readonly storage = new AsyncLocalStorage<TraceContext>();
  
  /**
   * Context creation counter for debugging.
   * 
   * Used to generate unique context identifiers for debugging
   * and monitoring context creation/destruction.
   */
  private contextCounter = 0;
  
  /**
   * Sets the current trace context.
   * 
   * This method sets the active trace context using AsyncLocalStorage.enterWith(),
   * making it available to all subsequent async operations within the current
   * execution context.
   * 
   * @param context - The trace context to set as current
   * 
   * @example
   * ```typescript
   * const context: TraceContext = {
   *   trace: myTrace,
   *   spans: [],
   *   metadata: new Map(),
   *   createdAt: new Date(),
   *   contextId: 'ctx-123'
   * };
   * 
   * contextManager.setContext(context);
   * // All subsequent async operations can access this context
   * ```
   * 
   * Warning: This method should be used carefully as it affects the global
   * context for the current execution path. Prefer runInContext() for
   * isolated context execution.
   */
  setContext(context: TraceContext): void {
    console.log(`Setting trace context: ${context.contextId} for trace: ${context.trace.id}`);
    this.storage.enterWith(context);
  }
  
  /**
   * Gets the current trace context.
   * 
   * Retrieves the active trace context from AsyncLocalStorage. Returns
   * undefined if no context is currently active.
   * 
   * @returns Current trace context or undefined if none active
   * 
   * @example
   * ```typescript
   * const context = contextManager.getContext();
   * if (context) {
   *   console.log(`Current trace: ${context.trace.id}`);
   *   console.log(`Active spans: ${context.spans.length}`);
   * }
   * ```
   * 
   * Thread safety: This method is thread-safe and will return the correct
   * context for the current async execution context.
   */
  getContext(): TraceContext | undefined {
    return this.storage.getStore();
  }
  
  /**
   * Runs a function within a specific trace context.
   * 
   * This is the primary method for executing operations within a trace context.
   * It creates an isolated context scope where the provided context is active,
   * executes the function, and automatically cleans up afterward.
   * 
   * @param context - The trace context to run the function in
   * @param fn - The async function to execute within the context
   * @returns Promise resolving to the function's return value
   * 
   * @example
   * ```typescript
   * const result = await contextManager.runInContext(traceContext, async () => {
   *   // This function has access to the trace context
   *   const trace = contextManager.getCurrentTrace();
   *   const span = trace?.span({ name: 'operation' });
   *   
   *   // All nested async calls also have access to the context
   *   const data = await fetchData();
   *   await processData(data);
   *   
   *   span?.end();
   *   return data;
   * });
   * ```
   * 
   * Error handling: If the function throws an error, the context is still
   * properly cleaned up and the error is re-thrown.
   * 
   * Isolation: Each call to runInContext creates an isolated context scope
   * that doesn't interfere with other concurrent operations.
   */
  async runInContext<T>(
    context: TraceContext,
    fn: () => Promise<T>
  ): Promise<T> {
    console.log(`Running function in context: ${context.contextId}`);
    
    try {
      return await this.storage.run(context, fn);
    } catch (error) {
      console.error(`Error in context ${context.contextId}:`, error);
      throw error;
    }
  }
  
  /**
   * Gets the current active trace.
   * 
   * Convenience method to retrieve the current trace from the active context.
   * Returns null if no context is active or no trace is set.
   * 
   * @returns Current trace or null if none active
   * 
   * @example
   * ```typescript
   * const trace = contextManager.getCurrentTrace();
   * if (trace) {
   *   const span = trace.span({ name: 'operation' });
   *   // ... do work
   *   span.end();
   * }
   * ```
   * 
   * Usage pattern: This method is commonly used within agent operations
   * to automatically access the current trace without manual context passing.
   */
  getCurrentTrace(): ITrace | null {
    const context = this.getContext();
    return context?.trace || null;
  }
  
  /**
   * Gets the current active span.
   * 
   * Returns the most recently created span from the span stack. This
   * represents the current "active" span that new operations should be
   * nested under.
   * 
   * @returns Current span or null if none active
   * 
   * @example
   * ```typescript
   * const currentSpan = contextManager.getCurrentSpan();
   * if (currentSpan) {
   *   // Create nested span
   *   const nestedSpan = currentSpan.span({ name: 'nested-operation' });
   *   // ... do work
   *   nestedSpan.end();
   * }
   * ```
   * 
   * Stack management: The span stack is maintained automatically as spans
   * are created and ended, ensuring proper parent-child relationships.
   */
  getCurrentSpan(): ISpan | null {
    const context = this.getContext();
    if (!context || context.spans.length === 0) {
      return null;
    }
    
    // Return the most recent span (top of stack)
    return context.spans[context.spans.length - 1];
  }
  
  /**
   * Pushes a new span onto the context stack.
   * 
   * Adds a span to the current context's span stack, making it the new
   * "current" span. This is typically called automatically when spans
   * are created.
   * 
   * @param span - The span to push onto the stack
   * @throws Error if no trace context is available
   * 
   * @example
   * ```typescript
   * const span = trace.span({ name: 'operation' });
   * contextManager.pushSpan(span); // Usually done automatically
   * ```
   * 
   * Automatic usage: This method is typically called automatically by
   * the wrapped trace/span objects and doesn't need to be called manually.
   */
  pushSpan(span: ISpan): void {
    const context = this.getContext();
    if (!context) {
      throw new Error('No trace context available - cannot push span');
    }
    
    console.log(`Pushing span ${span.id} to context ${context.contextId}`);
    context.spans.push(span);
    console.log(`Context ${context.contextId} now has ${context.spans.length} active spans`);
  }
  
  /**
   * Pops the most recent span from the context stack.
   * 
   * Removes and returns the most recently added span from the stack.
   * This is typically called automatically when spans are ended.
   * 
   * @returns The popped span or undefined if stack is empty
   * @throws Error if no trace context is available
   * 
   * @example
   * ```typescript
   * const span = contextManager.popSpan(); // Usually done automatically
   * if (span) {
   *   console.log(`Ended span: ${span.id}`);
   * }
   * ```
   * 
   * Stack integrity: This method maintains the integrity of the span stack
   * and ensures proper cleanup of completed spans.
   */
  popSpan(): ISpan | undefined {
    const context = this.getContext();
    if (!context) {
      throw new Error('No trace context available - cannot pop span');
    }
    
    const poppedSpan = context.spans.pop();
    if (poppedSpan) {
      console.log(`Popped span ${poppedSpan.id} from context ${context.contextId}`);
      console.log(`Context ${context.contextId} now has ${context.spans.length} active spans`);
    }
    
    return poppedSpan;
  }
  
  /**
   * Adds metadata to the current context.
   * 
   * Sets a key-value pair in the current context's metadata map. This
   * metadata is available to all operations within the context.
   * 
   * @param key - The metadata key
   * @param value - The metadata value
   * 
   * @example
   * ```typescript
   * contextManager.setMetadata('userId', 'user-123');
   * contextManager.setMetadata('sessionId', 'session-456');
   * 
   * // Later, retrieve metadata
   * const userId = contextManager.getMetadata('userId');
   * ```
   * 
   * Persistence: Metadata persists for the lifetime of the context and
   * is automatically cleaned up when the context is destroyed.
   */
  setMetadata(key: string, value: any): void {
    const context = this.getContext();
    if (!context) {
      console.warn('No trace context available - metadata not set');
      return;
    }
    
    console.log(`Setting metadata ${key} in context ${context.contextId}`);
    context.metadata.set(key, value);
  }
  
  /**
   * Gets metadata from the current context.
   * 
   * Retrieves a metadata value by key from the current context's metadata map.
   * 
   * @param key - The metadata key to retrieve
   * @returns The metadata value or undefined if not found
   * 
   * @example
   * ```typescript
   * const userId = contextManager.getMetadata('userId');
   * if (userId) {
   *   console.log(`Current user: ${userId}`);
   * }
   * ```
   */
  getMetadata(key: string): any {
    const context = this.getContext();
    return context?.metadata.get(key);
  }
  
  /**
   * Gets all metadata from the current context.
   * 
   * Returns a copy of all metadata key-value pairs from the current context.
   * 
   * @returns Object containing all metadata or empty object if no context
   * 
   * @example
   * ```typescript
   * const allMetadata = contextManager.getAllMetadata();
   * console.log('Context metadata:', allMetadata);
   * ```
   */
  getAllMetadata(): Record<string, any> {
    const context = this.getContext();
    if (!context) {
      return {};
    }
    
    const metadata: Record<string, any> = {};
    for (const [key, value] of context.metadata.entries()) {
      metadata[key] = value;
    }
    
    return metadata;
  }
  
  /**
   * Clears the current context.
   * 
   * Performs cleanup of the current context by clearing the span stack
   * and metadata map. This helps prevent memory leaks in long-running
   * operations.
   * 
   * @example
   * ```typescript
   * // After completing a long-running operation
   * contextManager.clearContext();
   * ```
   * 
   * Important: This method clears the context data but doesn't remove the
   * context itself from AsyncLocalStorage. The context will still exist
   * but with empty data structures.
   * 
   * Use case: Primarily used for cleanup in long-running operations or
   * when explicitly resetting context state.
   */
  clearContext(): void {
    const context = this.getContext();
    if (!context) {
      return;
    }
    
    console.log(`Clearing context ${context.contextId}`);
    
    // Clear span stack
    context.spans = [];
    
    // Clear metadata
    context.metadata.clear();
    
    console.log(`Context ${context.contextId} cleared`);
  }
  
  /**
   * Creates a new trace context with proper initialization.
   * 
   * Factory method for creating properly initialized trace contexts with
   * unique identifiers and timestamps.
   * 
   * @param trace - The trace to create context for
   * @param initialMetadata - Optional initial metadata
   * @returns New trace context
   * 
   * @example
   * ```typescript
   * const context = contextManager.createContext(trace, {
   *   userId: 'user-123',
   *   operation: 'data-processing'
   * });
   * 
   * await contextManager.runInContext(context, async () => {
   *   // ... do work
   * });
   * ```
   * 
   * Context lifecycle: Contexts created with this method are properly
   * initialized and ready for use with runInContext().
   */
  createContext(
    trace: ITrace,
    initialMetadata: Record<string, any> = {}
  ): TraceContext {
    const contextId = `ctx-${++this.contextCounter}-${Date.now()}`;
    
    const context: TraceContext = {
      trace,
      spans: [],
      metadata: new Map(Object.entries(initialMetadata)),
      createdAt: new Date(),
      contextId
    };
    
    console.log(`Created trace context ${contextId} for trace ${trace.id}`);
    
    return context;
  }
  
  /**
   * Gets context debugging information.
   * 
   * Returns detailed information about the current context state for
   * debugging and monitoring purposes.
   * 
   * @returns Context debug information or null if no context
   * 
   * @example
   * ```typescript
   * const debugInfo = contextManager.getDebugInfo();
   * if (debugInfo) {
   *   console.log('Context Debug Info:', debugInfo);
   * }
   * ```
   * 
   * Debug data includes:
   * - Context ID and creation time
   * - Trace information
   * - Active span count and IDs
   * - Metadata keys
   * - Context age
   */
  getDebugInfo(): {
    contextId: string;
    traceId: string;
    spanCount: number;
    spanIds: string[];
    metadataKeys: string[];
    createdAt: Date;
    ageMs: number;
  } | null {
    const context = this.getContext();
    if (!context) {
      return null;
    }
    
    return {
      contextId: context.contextId,
      traceId: context.trace.id,
      spanCount: context.spans.length,
      spanIds: context.spans.map(span => span.id),
      metadataKeys: Array.from(context.metadata.keys()),
      createdAt: context.createdAt,
      ageMs: Date.now() - context.createdAt.getTime()
    };
  }
  
  /**
   * Checks if a context is currently active.
   * 
   * @returns True if a context is currently active, false otherwise
   * 
   * @example
   * ```typescript
   * if (contextManager.hasActiveContext()) {
   *   const trace = contextManager.getCurrentTrace();
   *   // Use trace...
   * } else {
   *   // Start new trace...
   * }
   * ```
   */
  hasActiveContext(): boolean {
    return this.getContext() !== undefined;
  }
  
  /**
   * Validates the current context integrity.
   * 
   * Performs validation checks on the current context to ensure it's
   * in a valid state. Useful for debugging context-related issues.
   * 
   * @returns Validation result with any issues found
   * 
   * @example
   * ```typescript
   * const validation = contextManager.validateContext();
   * if (!validation.isValid) {
   *   console.error('Context validation failed:', validation.issues);
   * }
   * ```
   */
  validateContext(): {
    isValid: boolean;
    issues: string[];
  } {
    const context = this.getContext();
    const issues: string[] = [];
    
    if (!context) {
      issues.push('No active context');
      return { isValid: false, issues };
    }
    
    if (!context.trace) {
      issues.push('Context missing trace');
    }
    
    if (!context.contextId) {
      issues.push('Context missing ID');
    }
    
    if (!context.createdAt) {
      issues.push('Context missing creation timestamp');
    }
    
    if (!context.spans) {
      issues.push('Context missing spans array');
    }
    
    if (!context.metadata) {
      issues.push('Context missing metadata map');
    }
    
    // Check for very old contexts (potential memory leaks)
    const ageMs = Date.now() - context.createdAt?.getTime();
    if (ageMs > 24 * 60 * 60 * 1000) { // 24 hours
      issues.push(`Context is very old (${Math.round(ageMs / 1000 / 60)} minutes)`);
    }
    
    return {
      isValid: issues.length === 0,
      issues
    };
  }
}