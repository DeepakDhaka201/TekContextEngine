/**
 * @fileoverview Error classes for the Enhanced Memory Module
 * @module modules/memory/errors
 * @requires None - Pure error definitions
 * 
 * This file defines all custom error classes used throughout the Enhanced Memory
 * system. These errors provide specific context and actionable solutions for
 * different memory-related failure scenarios including working memory, long-term
 * storage, vector operations, consolidation, and enhanced Flowise patterns.
 * 
 * Key concepts:
 * - Hierarchical error structure with base MemoryError
 * - Specific error types for different memory operations
 * - Context preservation for debugging and monitoring
 * - Actionable error messages with recovery suggestions
 * - Error codes for programmatic handling
 * - Integration with monitoring and alerting systems
 * 
 * @example
 * ```typescript
 * import { MemoryStorageError, VectorSearchError } from './errors';
 * 
 * throw new MemoryStorageError(
 *   'pinecone',
 *   'upsert',
 *   'Failed to store vector embeddings',
 *   originalError,
 *   { vectorCount: 100, batchSize: 10 }
 * );
 * 
 * throw new VectorSearchError(
 *   'similarity-search',
 *   'No similar vectors found above threshold',
 *   undefined,
 *   { query, minScore: 0.8, resultsFound: 0 }
 * );
 * ```
 * 
 * @since 1.0.0
 */

/**
 * Base error class for all memory-related errors.
 * 
 * Provides a consistent foundation for all memory errors with context
 * preservation, error codes, and suggested solutions for recovery.
 * 
 * Features:
 * - Memory-specific error codes for identification
 * - Context object for debugging information
 * - Optional solution suggestions for recovery
 * - Proper error chaining with cause preservation
 * - Structured metadata for error reporting
 * - Integration with monitoring and logging systems
 * 
 * @example
 * ```typescript
 * const error = new MemoryError(
 *   'MEMORY_001',
 *   'Memory operation failed',
 *   { sessionId: 'sess-123', operation: 'store' },
 *   'Check memory backend connectivity and retry',
 *   originalError
 * );
 * 
 * console.log(error.code);     // 'MEMORY_001'
 * console.log(error.context);  // { sessionId: 'sess-123', operation: 'store' }
 * console.log(error.solution); // 'Check memory backend connectivity and retry'
 * ```
 * 
 * @public
 */
export class MemoryError extends Error {
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
  
  /** Session ID if applicable */
  public readonly sessionId?: string;
  
  /** Memory operation type */
  public readonly operation?: string;
  
  /**
   * Creates a new MemoryError instance.
   * 
   * @param code - Unique error code for identification
   * @param message - Human-readable error message
   * @param context - Context information for debugging (default: {})
   * @param solution - Optional solution suggestion
   * @param cause - Original error that caused this error
   * 
   * @example
   * ```typescript
   * throw new MemoryError(
   *   'MEMORY_CONSOLIDATION_ERROR',
   *   'Failed to consolidate working memory into long-term storage',
   *   { sessionId: 'sess-456', itemCount: 25, operation: 'consolidate' },
   *   'Verify LLM availability and check memory storage connectivity',
   *   llmError
   * );
   * ```
   */
  constructor(
    code: string,
    message: string,
    context: Record<string, any> = {},
    solution?: string,
    cause?: Error
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.context = context;
    this.solution = solution;
    this.timestamp = new Date();
    this.cause = cause;
    this.sessionId = context.sessionId;
    this.operation = context.operation;
    
    // Maintain proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);
    
    // Capture stack trace if available
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
  
  /**
   * Creates a JSON representation of the error.
   * 
   * Useful for logging, error reporting, and API responses.
   * 
   * @returns JSON-serializable error object
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      sessionId: this.sessionId,
      operation: this.operation,
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
  
  /**
   * Creates a detailed error description for logging.
   * 
   * @returns Formatted error description with context
   */
  toString(): string {
    let result = `${this.name} [${this.code}]: ${this.message}`;
    
    if (this.sessionId) {
      result += `\nSession ID: ${this.sessionId}`;
    }
    
    if (this.operation) {
      result += `\nOperation: ${this.operation}`;
    }
    
    if (Object.keys(this.context).length > 0) {
      result += `\nContext: ${JSON.stringify(this.context, null, 2)}`;
    }
    
    if (this.solution) {
      result += `\nSolution: ${this.solution}`;
    }
    
    if (this.cause) {
      result += `\nCause: ${this.cause.message}`;
    }
    
    return result;
  }
}

/**
 * Error thrown when working memory operations fail.
 * 
 * This error occurs during working memory operations such as adding items,
 * retrieving memories, compression, or buffer management.
 * 
 * Common causes:
 * - Memory capacity exceeded
 * - Invalid memory item data
 * - Storage backend failures
 * - Compression failures
 * 
 * @example
 * ```typescript
 * throw new WorkingMemoryError(
 *   'sess-123',
 *   'add',
 *   'Working memory capacity exceeded',
 *   capacityError,
 *   { 
 *     currentSize: 500,
 *     maxSize: 450,
 *     itemType: 'assistant',
 *     compressionEnabled: true
 *   }
 * );
 * ```
 */
export class WorkingMemoryError extends MemoryError {
  constructor(
    sessionId: string,
    operation: string,
    message: string,
    cause?: Error,
    context: Record<string, any> = {}
  ) {
    super(
      'WORKING_MEMORY_ERROR',
      `Working memory operation '${operation}' failed for session '${sessionId}': ${message}`,
      {
        sessionId,
        operation,
        memoryType: 'working',
        ...context
      },
      'Check memory configuration limits, verify storage backend health, and ' +
      'consider enabling compression or adjusting memory thresholds.',
      cause
    );
  }
}

/**
 * Error thrown when long-term memory storage operations fail.
 * 
 * This error occurs during long-term memory operations such as storing,
 * retrieving, updating, or deleting persistent memories.
 * 
 * Common causes:
 * - Database connection failures
 * - Vector store unavailable
 * - Embedding generation failures
 * - Data validation errors
 * 
 * @example
 * ```typescript
 * throw new LongTermMemoryError(
 *   'store',
 *   'Failed to generate embeddings for memory content',
 *   embeddingError,
 *   { 
 *     memoryId: 'ltm-789',
 *     contentLength: 1500,
 *     embeddingProvider: 'openai',
 *     model: 'text-embedding-ada-002'
 *   }
 * );
 * ```
 */
export class LongTermMemoryError extends MemoryError {
  constructor(
    operation: string,
    message: string,
    cause?: Error,
    context: Record<string, any> = {}
  ) {
    super(
      'LONG_TERM_MEMORY_ERROR',
      `Long-term memory operation '${operation}' failed: ${message}`,
      {
        operation,
        memoryType: 'long-term',
        ...context
      },
      'Verify database and vector store connectivity, check embedding service health, ' +
      'and ensure all required configuration is properly set.',
      cause
    );
  }
}

/**
 * Error thrown when vector operations fail.
 * 
 * This error occurs during vector-related operations such as embedding
 * generation, vector search, indexing, or vector store management.
 * 
 * Common causes:
 * - Embedding service failures
 * - Vector store connection issues
 * - Invalid vector dimensions
 * - Search query errors
 * 
 * @example
 * ```typescript
 * throw new VectorOperationError(
 *   'embed',
 *   'Embedding service rate limit exceeded',
 *   rateLimitError,
 *   { 
 *     provider: 'openai',
 *     model: 'text-embedding-ada-002',
 *     textCount: 50,
 *     batchSize: 25,
 *     rateLimitReset: new Date(Date.now() + 60000)
 *   }
 * );
 * ```
 */
export class VectorOperationError extends MemoryError {
  constructor(
    operation: string,
    message: string,
    cause?: Error,
    context: Record<string, any> = {}
  ) {
    super(
      'VECTOR_OPERATION_ERROR',
      `Vector operation '${operation}' failed: ${message}`,
      {
        operation,
        operationType: 'vector',
        ...context
      },
      'Check embedding service availability and configuration, verify vector store connectivity, ' +
      'and ensure vector dimensions match between operations.',
      cause
    );
  }
}

/**
 * Error thrown when memory consolidation fails.
 * 
 * This error occurs during the memory consolidation process when working
 * memory is analyzed and converted to long-term memories.
 * 
 * Common causes:
 * - LLM analysis failures
 * - Insufficient memory items
 * - Storage failures during consolidation
 * - Analysis model unavailable
 * 
 * @example
 * ```typescript
 * throw new ConsolidationError(
 *   'sess-101',
 *   'LLM analysis failed during memory consolidation',
 *   llmError,
 *   { 
 *     sessionId: 'sess-101',
 *     memoryItemCount: 45,
 *     analysisModel: 'gpt-3.5-turbo',
 *     consolidationThreshold: 30,
 *     stage: 'analysis'
 *   }
 * );
 * ```
 */
export class ConsolidationError extends MemoryError {
  constructor(
    sessionId: string,
    message: string,
    cause?: Error,
    context: Record<string, any> = {}
  ) {
    super(
      'CONSOLIDATION_ERROR',
      `Memory consolidation failed for session '${sessionId}': ${message}`,
      {
        sessionId,
        operation: 'consolidate',
        ...context
      },
      'Verify LLM availability and configuration, check working memory content quality, ' +
      'and ensure sufficient memory items meet consolidation threshold.',
      cause
    );
  }
}

/**
 * Error thrown when memory storage backend operations fail.
 * 
 * This error occurs when interacting with storage backends such as
 * databases, vector stores, or caching systems.
 * 
 * Common causes:
 * - Database connection failures
 * - Vector store unavailable
 * - Authentication failures
 * - Storage capacity exceeded
 * 
 * @example
 * ```typescript
 * throw new MemoryStorageError(
 *   'redis',
 *   'set',
 *   'Redis connection timeout during working memory storage',
 *   timeoutError,
 *   { 
 *     backend: 'redis',
 *     operation: 'set',
 *     timeout: 5000,
 *     retryAttempts: 3,
 *     connectionString: 'redis://localhost:6379'
 *   }
 * );
 * ```
 */
export class MemoryStorageError extends MemoryError {
  constructor(
    backend: string,
    operation: string,
    message: string,
    cause?: Error,
    context: Record<string, any> = {}
  ) {
    super(
      'MEMORY_STORAGE_ERROR',
      `Memory storage operation '${operation}' failed on '${backend}' backend: ${message}`,
      {
        storageBackend: backend,
        operation,
        ...context
      },
      'Check storage backend health and connectivity, verify authentication credentials, ' +
      'and ensure sufficient storage capacity. Consider implementing retry logic.',
      cause
    );
  }
}

/**
 * Error thrown when memory validation fails.
 * 
 * This error occurs when memory data, configuration, or operations
 * don't meet validation requirements or schema constraints.
 * 
 * Common causes:
 * - Invalid memory item structure
 * - Missing required fields
 * - Configuration validation failures
 * - Data type mismatches
 * 
 * @example
 * ```typescript
 * throw new MemoryValidationError(
 *   'memory-item',
 *   'Memory item missing required timestamp field',
 *   'timestamp',
 *   undefined,
 *   {
 *     itemId: 'mem-123',
 *     sessionId: 'sess-456',
 *     type: 'user',
 *     requiredFields: ['timestamp', 'content', 'sessionId']
 *   }
 * );
 * ```
 */
export class MemoryValidationError extends MemoryError {
  constructor(
    target: string,
    message: string,
    field: string,
    value: any,
    context: Record<string, any> = {}
  ) {
    super(
      'MEMORY_VALIDATION_ERROR',
      `Memory validation failed for '${target}': ${message}`,
      {
        validationTarget: target,
        validationField: field,
        invalidValue: value,
        ...context
      },
      'Review memory data structure and configuration against the expected schema. ' +
      'Ensure all required fields are provided and meet validation criteria.'
    );
  }
}

/**
 * Error thrown when embedding operations fail.
 * 
 * This error occurs when generating, caching, or processing text embeddings
 * for semantic search and similarity operations.
 * 
 * Common causes:
 * - Embedding service unavailable
 * - API rate limits exceeded
 * - Invalid input text
 * - Model configuration errors
 * 
 * @example
 * ```typescript
 * throw new EmbeddingError(
 *   'generate',
 *   'OpenAI API rate limit exceeded',
 *   rateLimitError,
 *   { 
 *     provider: 'openai',
 *     model: 'text-embedding-ada-002',
 *     inputTexts: 25,
 *     totalTokens: 5000,
 *     rateLimitType: 'requests_per_minute',
 *     resetTime: new Date(Date.now() + 60000)
 *   }
 * );
 * ```
 */
export class EmbeddingError extends MemoryError {
  constructor(
    operation: string,
    message: string,
    cause?: Error,
    context: Record<string, any> = {}
  ) {
    super(
      'EMBEDDING_ERROR',
      `Embedding operation '${operation}' failed: ${message}`,
      {
        operation,
        operationType: 'embedding',
        ...context
      },
      'Check embedding service availability and API limits, verify model configuration, ' +
      'and consider implementing exponential backoff for rate-limited operations.',
      cause
    );
  }
}

/**
 * Error thrown when vector search operations fail.
 * 
 * This error occurs when performing similarity searches, vector queries,
 * or index operations in vector stores.
 * 
 * Common causes:
 * - Vector store connection issues
 * - Invalid query parameters
 * - Index not found or corrupted
 * - Dimension mismatches
 * 
 * @example
 * ```typescript
 * throw new VectorSearchError(
 *   'similarity-search',
 *   'Vector dimension mismatch between query and index',
 *   undefined,
 *   { 
 *     queryDimensions: 1536,
 *     indexDimensions: 768,
 *     vectorStore: 'pinecone',
 *     indexName: 'memory-vectors',
 *     queryVector: queryVector.slice(0, 10) // First 10 dims for logging
 *   }
 * );
 * ```
 */
export class VectorSearchError extends MemoryError {
  constructor(
    operation: string,
    message: string,
    cause?: Error,
    context: Record<string, any> = {}
  ) {
    super(
      'VECTOR_SEARCH_ERROR',
      `Vector search operation '${operation}' failed: ${message}`,
      {
        operation,
        operationType: 'vector-search',
        ...context
      },
      'Verify vector store connectivity and index configuration, ensure query vector ' +
      'dimensions match the index, and check search parameters are within valid ranges.',
      cause
    );
  }
}

/**
 * Error thrown when memory buffer operations fail.
 * 
 * This error occurs when working with memory buffers such as window,
 * summary, or conversation buffers.
 * 
 * Common causes:
 * - Buffer capacity exceeded
 * - Summarization failures
 * - Invalid buffer configuration
 * - Message format errors
 * 
 * @example
 * ```typescript
 * throw new MemoryBufferError(
 *   'sess-202',
 *   'summary',
 *   'trim',
 *   'Failed to summarize buffer content before trimming',
 *   summarizationError,
 *   { 
 *     bufferType: 'summary',
 *     bufferSize: 50,
 *     summarizationThreshold: 30,
 *     summaryModel: 'gpt-3.5-turbo',
 *     stage: 'summarization'
 *   }
 * );
 * ```
 */
export class MemoryBufferError extends MemoryError {
  constructor(
    sessionId: string,
    bufferType: string,
    operation: string,
    message: string,
    cause?: Error,
    context: Record<string, any> = {}
  ) {
    super(
      'MEMORY_BUFFER_ERROR',
      `Memory buffer operation '${operation}' failed for '${bufferType}' buffer in session '${sessionId}': ${message}`,
      {
        sessionId,
        bufferType,
        operation,
        ...context
      },
      'Check buffer configuration and capacity limits, verify summarization model availability, ' +
      'and ensure message format compatibility with the buffer type.',
      cause
    );
  }
}

/**
 * Error thrown when runtime state operations fail.
 * 
 * This error occurs when managing runtime state for workflow continuation,
 * including state persistence, updates, and retrieval.
 * 
 * Common causes:
 * - State serialization errors
 * - Storage backend failures
 * - Invalid state operations
 * - State size limits exceeded
 * 
 * @example
 * ```typescript
 * throw new RuntimeStateError(
 *   'sess-303',
 *   'update',
 *   'State serialization failed due to circular references',
 *   serializationError,
 *   { 
 *     sessionId: 'sess-303',
 *     operation: 'update',
 *     stateKeys: ['currentStep', 'variables', 'context'],
 *     updateOperations: ['set', 'merge', 'append'],
 *     stateSize: 1024000 // bytes
 *   }
 * );
 * ```
 */
export class RuntimeStateError extends MemoryError {
  constructor(
    sessionId: string,
    operation: string,
    message: string,
    cause?: Error,
    context: Record<string, any> = {}
  ) {
    super(
      'RUNTIME_STATE_ERROR',
      `Runtime state operation '${operation}' failed for session '${sessionId}': ${message}`,
      {
        sessionId,
        operation,
        stateType: 'runtime',
        ...context
      },
      'Ensure state data is serializable, check storage backend connectivity, ' +
      'and verify state operations are valid for the current state structure.',
      cause
    );
  }
}

/**
 * Error thrown when form data operations fail.
 * 
 * This error occurs when persisting, retrieving, or updating form data
 * for user interactions and workflow state.
 * 
 * Common causes:
 * - Form data validation errors
 * - Storage persistence failures
 * - Data size limits exceeded
 * - Invalid form structure
 * 
 * @example
 * ```typescript
 * throw new FormDataError(
 *   'sess-404',
 *   'set',
 *   'Form data exceeds maximum size limit',
 *   undefined,
 *   { 
 *     sessionId: 'sess-404',
 *     formFields: ['name', 'email', 'preferences', 'documents'],
 *     formSize: 5120000, // bytes
 *     maxSize: 1048576,  // 1MB
 *     largestField: 'documents'
 *   }
 * );
 * ```
 */
export class FormDataError extends MemoryError {
  constructor(
    sessionId: string,
    operation: string,
    message: string,
    cause?: Error,
    context: Record<string, any> = {}
  ) {
    super(
      'FORM_DATA_ERROR',
      `Form data operation '${operation}' failed for session '${sessionId}': ${message}`,
      {
        sessionId,
        operation,
        dataType: 'form',
        ...context
      },
      'Validate form data structure and size, check field types and constraints, ' +
      'and ensure storage backend supports the data format.',
      cause
    );
  }
}

/**
 * Utility function to determine if an error is memory-related.
 * 
 * @param error - Error to check
 * @returns True if error is an instance of MemoryError
 * 
 * @example
 * ```typescript
 * try {
 *   await memory.store(longTermMemory);
 * } catch (error) {
 *   if (isMemoryError(error)) {
 *     console.log('Memory error code:', error.code);
 *     console.log('Session ID:', error.sessionId);
 *     console.log('Suggested solution:', error.solution);
 *   } else {
 *     console.log('Unexpected error:', error.message);
 *   }
 * }
 * ```
 */
export function isMemoryError(error: any): error is MemoryError {
  return error instanceof MemoryError;
}

/**
 * Utility function to create error context from memory and operation data.
 * 
 * Extracts relevant information to include in error objects for better
 * debugging and monitoring.
 * 
 * @param memoryData - Memory-related data
 * @param operation - Operation being performed
 * @param additionalContext - Additional context to include
 * @returns Context object suitable for error reporting
 * 
 * @example
 * ```typescript
 * try {
 *   await vectorStore.upsert(vectors);
 * } catch (error) {
 *   throw new MemoryStorageError(
 *     'pinecone',
 *     'upsert',
 *     'Failed to store vectors',
 *     error,
 *     createMemoryErrorContext(vectors, 'upsert', {
 *       batchSize: vectors.length,
 *       dimensions: vectors[0]?.vector?.length
 *     })
 *   );
 * }
 * ```
 */
export function createMemoryErrorContext(
  memoryData: any,
  operation: string,
  additionalContext: Record<string, any> = {}
): Record<string, any> {
  return {
    sessionId: memoryData?.sessionId,
    userId: memoryData?.userId,
    operation,
    timestamp: new Date().toISOString(),
    dataType: memoryData?.type || memoryData?.metadata?.type,
    dataSize: JSON.stringify(memoryData || {}).length,
    ...additionalContext
  };
}

/**
 * Error severity levels for categorizing memory errors.
 */
export enum MemoryErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Utility function to determine error severity based on error type and context.
 * 
 * @param error - Memory error instance
 * @returns Error severity level
 * 
 * @example
 * ```typescript
 * const error = new MemoryStorageError('redis', 'connect', 'Connection failed');
 * const severity = getMemoryErrorSeverity(error);
 * 
 * if (severity === MemoryErrorSeverity.CRITICAL) {
 *   // Alert operations team
 *   sendAlert(error);
 * }
 * ```
 */
export function getMemoryErrorSeverity(error: MemoryError): MemoryErrorSeverity {
  // Critical errors - affect system availability
  if (error.code.includes('STORAGE_ERROR') || 
      error.code.includes('CONSOLIDATION_ERROR')) {
    return MemoryErrorSeverity.CRITICAL;
  }
  
  // High errors - affect core functionality
  if (error.code.includes('VECTOR_SEARCH_ERROR') || 
      error.code.includes('EMBEDDING_ERROR') ||
      error.code.includes('LONG_TERM_MEMORY_ERROR')) {
    return MemoryErrorSeverity.HIGH;
  }
  
  // Medium errors - affect user experience
  if (error.code.includes('WORKING_MEMORY_ERROR') || 
      error.code.includes('MEMORY_BUFFER_ERROR') ||
      error.code.includes('RUNTIME_STATE_ERROR')) {
    return MemoryErrorSeverity.MEDIUM;
  }
  
  // Low errors - minor issues or expected failures
  return MemoryErrorSeverity.LOW;
}