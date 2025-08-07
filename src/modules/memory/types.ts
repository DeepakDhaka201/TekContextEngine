/**
 * @fileoverview Type definitions for the Enhanced Memory Module
 * @module modules/memory/types
 * @requires None - Pure type definitions
 * 
 * This file defines all interfaces, types, and enums used throughout the Enhanced Memory
 * system. These types handle working memory, long-term persistent memory, vector embeddings,
 * runtime state management, conversational memory buffers, and multiple memory strategies
 * including Flowise patterns.
 * 
 * Key concepts:
 * - Working memory for short-term conversation context
 * - Long-term memory for persistent storage and retrieval
 * - Vector embeddings for semantic search capabilities
 * - Runtime state management for workflow continuation
 * - Conversational memory buffers with different strategies
 * - Form data persistence for user interactions
 * - Agent reasoning chain tracking
 * - Multi-backend storage abstraction
 * 
 * @example
 * ```typescript
 * import { IMemoryModule, MemoryItem, LongTermMemory } from './types';
 * 
 * const memory = await memoryModule.addWorkingMemory({
 *   sessionId: 'sess-123',
 *   timestamp: new Date(),
 *   type: 'user',
 *   content: 'Hello, how are you?'
 * });
 * 
 * const longTerm = await memoryModule.store({
 *   content: 'User prefers formal communication style',
 *   metadata: {
 *     type: 'preference',
 *     importance: 0.8,
 *     confidence: 0.9
 *   }
 * });
 * ```
 * 
 * @since 1.0.0
 */

import { IModule, HealthStatus } from '../registry/types';

/**
 * Core interface for the Enhanced Memory Module.
 * 
 * Manages different types of memory including working memory for conversation context,
 * long-term persistent memory for facts and experiences, vector embeddings for semantic
 * search, runtime state for workflow continuation, and conversational memory buffers.
 * 
 * Key responsibilities:
 * - Working memory management with compression and cleanup
 * - Long-term memory storage and retrieval with vector search
 * - Runtime state persistence for workflow resume capabilities
 * - Conversational memory buffers with multiple strategies
 * - Form data persistence for user interactions
 * - Memory consolidation and summarization
 * - Multi-backend storage support
 * 
 * @example
 * ```typescript
 * class MemoryModule implements IMemoryModule {
 *   async addWorkingMemory(item: MemoryItem): Promise<void> {
 *     // Add to working memory with importance scoring
 *     // Trigger consolidation if threshold reached
 *   }
 *   
 *   async setRuntimeState(sessionId: string, state: ICommonObject): Promise<void> {
 *     // Persist runtime state for workflow continuation
 *   }
 * }
 * ```
 * 
 * @public
 */
export interface IMemoryModule extends IModule {
  // Lifecycle
  initialize(config: MemoryConfig): Promise<void>;
  health(): Promise<HealthStatus>;
  shutdown(): Promise<void>;
  
  // Working Memory (Short-term)
  /**
   * Adds an item to working memory with automatic importance scoring.
   * 
   * @param item - Memory item to add
   * @returns Promise that resolves when item is added
   */
  addWorkingMemory(item: MemoryItem): Promise<void>;
  
  /**
   * Retrieves working memory items with filtering options.
   * 
   * @param options - Optional filtering and retrieval options
   * @returns Promise resolving to array of memory items
   */
  getWorkingMemory(options?: WorkingMemoryOptions): Promise<MemoryItem[]>;
  
  /**
   * Clears working memory for a specific session or all sessions.
   * 
   * @param sessionId - Optional session ID to clear specific session
   * @returns Promise that resolves when memory is cleared
   */
  clearWorkingMemory(sessionId?: string): Promise<void>;
  
  /**
   * Creates a summary of working memory for a session.
   * 
   * @param sessionId - Session identifier
   * @returns Promise resolving to memory summary
   */
  summarizeWorkingMemory(sessionId: string): Promise<MemorySummary>;
  
  // Flowise-style conversational memory
  /**
   * Adds messages to conversational memory buffer.
   * 
   * @param sessionId - Session identifier
   * @param messages - Array of messages to add
   * @returns Promise that resolves when messages are added
   */
  addConversationalMemory(sessionId: string, messages: IMessage[]): Promise<void>;
  
  /**
   * Retrieves conversational memory with optional limit.
   * 
   * @param sessionId - Session identifier
   * @param limit - Optional limit for number of messages
   * @returns Promise resolving to array of messages
   */
  getConversationalMemory(sessionId: string, limit?: number): Promise<IMessage[]>;
  
  // Runtime state management (Flowise pattern)
  /**
   * Sets runtime state for workflow continuation.
   * 
   * @param sessionId - Session identifier
   * @param state - Runtime state object
   * @returns Promise that resolves when state is set
   */
  setRuntimeState(sessionId: string, state: ICommonObject): Promise<void>;
  
  /**
   * Retrieves runtime state for a session.
   * 
   * @param sessionId - Session identifier
   * @returns Promise resolving to runtime state object
   */
  getRuntimeState(sessionId: string): Promise<ICommonObject>;
  
  /**
   * Updates runtime state with specific operations.
   * 
   * @param sessionId - Session identifier
   * @param updates - Array of state updates
   * @returns Promise that resolves when updates are applied
   */
  updateRuntimeState(sessionId: string, updates: StateUpdate[]): Promise<void>;
  
  // Form data persistence
  /**
   * Persists form data for user interactions.
   * 
   * @param sessionId - Session identifier
   * @param form - Form data to persist
   * @returns Promise that resolves when form is saved
   */
  setFormData(sessionId: string, form: Record<string, any>): Promise<void>;
  
  /**
   * Retrieves persisted form data.
   * 
   * @param sessionId - Session identifier
   * @returns Promise resolving to form data
   */
  getFormData(sessionId: string): Promise<Record<string, any>>;
  
  // Memory buffer management
  /**
   * Creates a memory buffer of specified type.
   * 
   * @param type - Type of memory buffer to create
   * @param config - Optional buffer configuration
   * @returns Memory buffer instance
   */
  createMemoryBuffer(type: MemoryBufferType, config?: MemoryBufferConfig): IMemoryBuffer;
  
  /**
   * Retrieves or creates a memory buffer for a session.
   * 
   * @param sessionId - Session identifier
   * @param type - Type of memory buffer
   * @returns Promise resolving to memory buffer
   */
  getMemoryBuffer(sessionId: string, type: MemoryBufferType): Promise<IMemoryBuffer>;
  
  // Long-term Memory
  /**
   * Stores a long-term memory with vector embedding.
   * 
   * @param memory - Long-term memory to store
   * @returns Promise resolving to memory ID
   */
  store(memory: LongTermMemory): Promise<string>;
  
  /**
   * Retrieves memories based on query criteria.
   * 
   * @param query - Memory query with filtering options
   * @returns Promise resolving to array of search results
   */
  retrieve(query: MemoryQuery): Promise<MemorySearchResult[]>;
  
  /**
   * Updates an existing long-term memory.
   * 
   * @param memoryId - Memory identifier
   * @param updates - Partial updates to apply
   * @returns Promise that resolves when memory is updated
   */
  update(memoryId: string, updates: Partial<LongTermMemory>): Promise<void>;
  
  /**
   * Deletes a long-term memory.
   * 
   * @param memoryId - Memory identifier
   * @returns Promise that resolves when memory is deleted
   */
  delete(memoryId: string): Promise<void>;
  
  // Vector Operations
  /**
   * Generates embeddings for text or array of texts.
   * 
   * @param text - Text to embed (string or array)
   * @returns Promise resolving to array of embeddings
   */
  embed(text: string | string[]): Promise<Embedding[]>;
  
  /**
   * Searches for similar vectors based on query.
   * 
   * @param query - Vector search query
   * @returns Promise resolving to search results
   */
  search(query: VectorSearchQuery): Promise<VectorSearchResult[]>;
  
  // Memory Management
  /**
   * Consolidates working memory into long-term storage.
   * 
   * @param sessionId - Session identifier
   * @returns Promise resolving to consolidation result
   */
  consolidate(sessionId: string): Promise<ConsolidationResult>;
  
  /**
   * Exports memory data for backup or migration.
   * 
   * @param options - Export configuration options
   * @returns Promise resolving to memory export
   */
  export(options: ExportOptions): Promise<MemoryExport>;
  
  /**
   * Imports memory data from backup or migration.
   * 
   * @param data - Memory export data to import
   * @returns Promise resolving to import result
   */
  import(data: MemoryExport): Promise<ImportResult>;
}

/**
 * Configuration for the Enhanced Memory Module.
 * 
 * Defines settings for different storage backends, processing options,
 * and enhanced features like runtime state and memory buffers.
 */
export interface MemoryConfig {
  /** Working memory configuration */
  workingMemory: {
    /** Storage backend type */
    type: 'memory' | 'redis' | 'session-state';
    
    /** Maximum items in working memory per session */
    maxItems?: number;
    
    /** Time to live in seconds for memory items */
    ttl?: number;
    
    /** Compress working memory after N items */
    compressionThreshold?: number;
    
    // Enhanced Flowise memory patterns
    /** Enabled memory buffer types */
    bufferTypes?: MemoryBufferType[];
    
    /** Window buffer size for sliding window memory */
    windowSize?: number;
    
    /** Summary buffer threshold for triggering summarization */
    summaryThreshold?: number;
    
    /** Conversation buffer limit for full conversation history */
    conversationLimit?: number;
  };
  
  /** Long-term memory storage configuration */
  longTermMemory: {
    /** Database type for persistent storage */
    type: 'postgres' | 'mongodb' | 'dynamodb';
    
    /** Database connection string */
    connectionString?: string;
    
    /** Additional database configuration */
    config?: any;
  };
  
  /** Vector store configuration */
  vectorStore: {
    /** Vector database type */
    type: 'pinecone' | 'weaviate' | 'qdrant' | 'chroma' | 'memory';
    
    /** Vector store specific configuration */
    config: VectorStoreConfig;
  };
  
  /** Embedding generation configuration */
  embedding: {
    /** Embedding provider */
    provider: 'openai' | 'cohere' | 'huggingface' | 'litellm';
    
    /** Embedding model name */
    model?: string;
    
    /** Vector dimensions */
    dimensions?: number;
    
    /** Batch size for embedding requests */
    batchSize?: number;
  };
  
  /** Memory processing configuration */
  processing: {
    /** Model for memory summarization */
    summarizationModel?: string;
    
    /** Threshold for triggering summarization */
    summarizationThreshold?: number;
    
    /** Interval for automatic consolidation */
    consolidationInterval?: number;
    
    /** Enable importance scoring */
    importanceScoring?: boolean;
    
    // Enhanced Flowise patterns
    /** Enable runtime state tracking */
    runtimeStateEnabled?: boolean;
    
    /** Enable form data persistence */
    formDataEnabled?: boolean;
    
    /** Track agent reasoning chains */
    reasoningChains?: boolean;
    
    /** Track human interaction history */
    humanInteractionHistory?: boolean;
    
    /** Support variable templating and resolution */
    variableResolution?: boolean;
    
    /** Threshold for triggering memory consolidation */
    consolidationThreshold?: number;
  };
}

/**
 * Individual memory item for working memory.
 * 
 * Represents a single piece of information in working memory with
 * metadata for processing and enhanced features.
 */
export interface MemoryItem {
  /** Unique identifier */
  id?: string;
  
  /** Session this memory belongs to */
  sessionId: string;
  
  /** Timestamp when memory was created */
  timestamp: Date;
  
  /** Type of memory item */
  type: 'user' | 'assistant' | 'system' | 'tool' | 'observation' | 'human' | 'reasoning';
  
  /** Content of the memory */
  content: string;
  
  /** Additional metadata */
  metadata?: {
    /** Token count for the content */
    tokens?: number;
    
    /** Importance score (0-1) */
    importance?: number;
    
    /** Tags for categorization */
    tags?: string[];
    
    /** References to other memories */
    references?: string[];
    
    // Enhanced metadata for Flowise patterns
    /** Agent that created this memory */
    agentId?: string;
    
    /** Execution context identifier */
    executionId?: string;
    
    /** Workflow node context */
    nodeId?: string;
    
    /** Tool that was called */
    toolCall?: string;
    
    /** Agent reasoning chain */
    reasoning?: string;
    
    /** Human interaction marker */
    humanInteraction?: boolean;
    
    /** Associated form data */
    formData?: Record<string, any>;
    
    /** Variable resolution context */
    variables?: Record<string, any>;
    
    /** Source documents for RAG */
    sourceDocuments?: any[];
    
    /** Artifacts generated */
    artifacts?: any[];
    
    /** Conversational memory marker */
    conversationalMemory?: boolean;
    
    /** User ID for this memory */
    userId?: string;
  };
}

/**
 * Flowise-style message interface for conversational memory.
 * 
 * Compatible with Flowise message format for seamless integration.
 */
export interface IMessage {
  /** Role of the message sender */
  role: 'user' | 'assistant' | 'system' | 'tool';
  
  /** Message content */
  content: string;
  
  /** Message metadata */
  metadata?: {
    /** Source documents for context */
    sourceDocuments?: any[];
    
    /** Tools used in generating this message */
    usedTools?: any[];
    
    /** Artifacts generated with this message */
    artifacts?: any[];
    
    /** Agent reasoning for this message */
    agentReasoning?: string;
    
    /** Timestamp of the message */
    timestamp?: string;
    
    /** Cost information */
    cost?: {
      inputCost: number;
      outputCost: number;
      totalCost: number;
    };
    
    /** Token usage information */
    tokenUsage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
    
    /** Performance metrics */
    performance?: {
      latency: number;
      processingTime: number;
    };
  };
}

/**
 * Runtime state management for workflow continuation.
 * 
 * Supports any serializable object for flexible state storage.
 */
export interface ICommonObject {
  [key: string]: any;
}

/**
 * State update operation for runtime state management.
 */
export interface StateUpdate {
  /** Key to update */
  key: string;
  
  /** Value to set */
  value: any;
  
  /** Operation type */
  operation: 'set' | 'append' | 'merge' | 'delete';
}

/**
 * Memory buffer types for different memory strategies.
 */
export type MemoryBufferType = 
  | 'window'       // Fixed-size sliding window
  | 'summary'      // Summarized historical context
  | 'conversation' // Full conversation history
  | 'working'      // Current working context
  | 'episodic';    // Episode-based memory

/**
 * Interface for memory buffer implementations.
 * 
 * Provides a consistent API for different memory buffer strategies.
 */
export interface IMemoryBuffer {
  /** Buffer type identifier */
  readonly type: MemoryBufferType;
  
  /** Session this buffer belongs to */
  readonly sessionId: string;
  
  /** Maximum size of the buffer */
  readonly maxSize: number;
  
  /**
   * Adds a message to the buffer.
   * 
   * @param message - Message to add
   * @returns Promise that resolves when message is added
   */
  add(message: IMessage): Promise<void>;
  
  /**
   * Retrieves all messages in the buffer.
   * 
   * @returns Promise resolving to array of messages
   */
  getMessages(): Promise<IMessage[]>;
  
  /**
   * Clears all messages from the buffer.
   * 
   * @returns Promise that resolves when buffer is cleared
   */
  clear(): Promise<void>;
  
  /**
   * Summarizes the buffer content (if supported).
   * 
   * @returns Promise resolving to summary string
   */
  summarize?(): Promise<string>;
  
  // Buffer-specific methods
  
  /**
   * Gets context representation of the buffer.
   * 
   * @returns Promise resolving to context string
   */
  getContext?(): Promise<string>;
  
  /**
   * Trims the buffer to remove old messages.
   * 
   * @returns Promise that resolves when buffer is trimmed
   */
  trim?(): Promise<void>;
}

/**
 * Configuration for memory buffers.
 */
export interface MemoryBufferConfig {
  /** Maximum size of the buffer */
  maxSize?: number;
  
  /** Threshold for triggering summarization */
  summarizationThreshold?: number;
  
  /** Enable compression for buffer content */
  compressionEnabled?: boolean;
  
  /** Model to use for summarization */
  summaryModel?: string;
}

/**
 * Long-term memory record for persistent storage.
 * 
 * Represents a persistent memory with vector embedding and metadata.
 */
export interface LongTermMemory {
  /** Unique identifier */
  id?: string;
  
  /** User this memory belongs to */
  userId?: string;
  
  /** Session this memory was created in */
  sessionId?: string;
  
  /** Memory content */
  content: string;
  
  /** Summary of the memory content */
  summary?: string;
  
  /** Vector embedding for semantic search */
  embedding?: number[];
  
  /** Memory metadata */
  metadata: {
    /** Type of memory */
    type: 'fact' | 'experience' | 'preference' | 'context' | 'skill';
    
    /** Importance score (0-1) */
    importance: number;
    
    /** Confidence score (0-1) */
    confidence: number;
    
    /** Source of the memory */
    source?: string;
    
    /** Tags for categorization */
    tags?: string[];
    
    /** Relations to other memories */
    relations?: MemoryRelation[];
  };
  
  /** Timestamp information */
  timestamps: {
    /** When memory was created */
    created: Date;
    
    /** When memory was last accessed */
    lastAccessed: Date;
    
    /** When memory was last modified */
    lastModified: Date;
    
    /** When memory expires (optional) */
    expiresAt?: Date;
  };
}

/**
 * Relation between memories for graph-like connections.
 */
export interface MemoryRelation {
  /** ID of the related memory */
  memoryId: string;
  
  /** Type of relation */
  type: 'implies' | 'contradicts' | 'supports' | 'similar' | 'context';
  
  /** Strength of the relation (0-1) */
  strength: number;
}

/**
 * Query for retrieving memories with various filters.
 */
export interface MemoryQuery {
  /** Text query for semantic search */
  text?: string;
  
  /** Vector query for direct vector search */
  vector?: number[];
  
  /** Filter by user ID */
  userId?: string;
  
  /** Filter by session ID */
  sessionId?: string;
  
  /** Filter by memory types */
  types?: string[];
  
  /** Filter by tags */
  tags?: string[];
  
  /** Minimum importance score */
  minImportance?: number;
  
  /** Minimum confidence score */
  minConfidence?: number;
  
  /** Maximum number of results */
  limit?: number;
  
  /** Time range filter */
  timeRange?: {
    start?: Date;
    end?: Date;
  };
}

/**
 * Result of memory search with relevance scoring.
 */
export interface MemorySearchResult {
  /** The retrieved memory */
  memory: LongTermMemory;
  
  /** Relevance score (0-1) */
  score: number;
  
  /** Distance metric (lower is more similar) */
  distance: number;
  
  /** Additional result metadata */
  metadata?: {
    /** Why this memory was retrieved */
    reason?: string;
    
    /** Matching tags */
    matchingTags?: string[];
    
    /** Context relevance */
    contextRelevance?: number;
  };
}

/**
 * Vector search query for semantic similarity.
 */
export interface VectorSearchQuery {
  /** Query vector for similarity search */
  vector?: number[];
  
  /** Text query (will be converted to vector) */
  text?: string;
  
  /** Metadata filters */
  filter?: Record<string, any>;
  
  /** Maximum number of results */
  limit?: number;
  
  /** Include metadata in results */
  includeMetadata?: boolean;
  
  /** Minimum similarity score */
  minScore?: number;
}

/**
 * Result of vector search.
 */
export interface VectorSearchResult {
  /** Record identifier */
  id: string;
  
  /** Similarity score */
  score: number;
  
  /** Record metadata */
  metadata?: Record<string, any>;
  
  /** The actual vector (optional) */
  vector?: number[];
}

/**
 * Working memory query options.
 */
export interface WorkingMemoryOptions {
  /** Session to retrieve memories from */
  sessionId?: string;
  
  /** Maximum number of memories to return */
  limit?: number;
  
  /** Filter by memory types */
  types?: MemoryItem['type'][];
  
  /** Only return memories after this date */
  since?: Date;
  
  /** Include metadata in results */
  includeMetadata?: boolean;
}

/**
 * Summary of working memory for a session.
 */
export interface MemorySummary {
  /** Session identifier */
  sessionId: string;
  
  /** Generated summary text */
  summary: string;
  
  /** Key points extracted */
  keyPoints: string[];
  
  /** Topics discussed */
  topics: string[];
  
  /** Overall sentiment */
  sentiment?: 'positive' | 'neutral' | 'negative';
  
  /** Summary metadata */
  metadata: {
    /** Number of items summarized */
    itemCount: number;
    
    /** Total token count */
    tokenCount: number;
    
    /** Time span of the memories */
    timespan: { start: Date; end: Date };
    
    // Enhanced metadata for Flowise patterns
    /** Number of executions in session */
    executionCount?: number;
    
    /** Number of agent interactions */
    agentInteractions?: number;
    
    /** Number of human interactions */
    humanInteractions?: number;
    
    /** Tool usage statistics */
    toolUsage?: Record<string, number>;
    
    /** Current runtime state snapshot */
    runtimeState?: ICommonObject;
    
    /** Current form data snapshot */
    formData?: Record<string, any>;
  };
}

/**
 * Vector store configuration interface.
 */
export interface VectorStoreConfig {
  /** API key for the vector store */
  apiKey?: string;
  
  /** Environment or region */
  environment?: string;
  
  /** Index name */
  indexName?: string;
  
  /** Vector dimensions */
  dimensions?: number;
  
  /** Additional configuration options */
  options?: Record<string, any>;
}

/**
 * Embedding with metadata.
 */
export interface Embedding {
  /** Original text that was embedded */
  text: string;
  
  /** Generated vector */
  vector: number[];
  
  /** Model used for embedding */
  model: string;
  
  /** Additional metadata */
  metadata?: {
    /** Token count */
    tokens?: number;
    
    /** Processing time */
    processingTime?: number;
    
    /** Cache hit indicator */
    cached?: boolean;
  };
}

/**
 * Result of memory consolidation process.
 */
export interface ConsolidationResult {
  /** Consolidation status */
  status: 'success' | 'failed' | 'skipped';
  
  /** Reason for the status */
  reason?: string;
  
  /** Number of long-term memories created */
  memoriesCreated?: number;
  
  /** Number of working memories processed */
  memoriesProcessed?: number;
  
  /** Number of facts extracted */
  facts?: number;
  
  /** Number of experiences extracted */
  experiences?: number;
  
  /** Processing time in milliseconds */
  processingTime?: number;
  
  /** Any errors encountered */
  errors?: string[];
}

/**
 * Export options for memory backup.
 */
export interface ExportOptions {
  /** Include working memory */
  includeWorkingMemory?: boolean;
  
  /** Include long-term memory */
  includeLongTermMemory?: boolean;
  
  /** Include vector embeddings */
  includeEmbeddings?: boolean;
  
  /** Filter by user ID */
  userId?: string;
  
  /** Filter by session ID */
  sessionId?: string;
  
  /** Date range filter */
  dateRange?: {
    start: Date;
    end: Date;
  };
  
  /** Export format */
  format?: 'json' | 'csv' | 'binary';
}

/**
 * Memory export data structure.
 */
export interface MemoryExport {
  /** Export metadata */
  metadata: {
    /** Export timestamp */
    exportedAt: Date;
    
    /** Module version */
    version: string;
    
    /** Total records */
    totalRecords: number;
    
    /** Export options used */
    options: ExportOptions;
  };
  
  /** Working memory data */
  workingMemory?: MemoryItem[];
  
  /** Long-term memory data */
  longTermMemory?: LongTermMemory[];
  
  /** Runtime state data */
  runtimeStates?: Record<string, ICommonObject>;
  
  /** Form data */
  formData?: Record<string, Record<string, any>>;
}

/**
 * Result of memory import process.
 */
export interface ImportResult {
  /** Import status */
  status: 'success' | 'failed' | 'partial';
  
  /** Number of records imported */
  recordsImported: number;
  
  /** Number of records failed */
  recordsFailed: number;
  
  /** Processing time in milliseconds */
  processingTime: number;
  
  /** Any errors encountered */
  errors: string[];
  
  /** Import summary by type */
  summary: {
    workingMemory: number;
    longTermMemory: number;
    runtimeStates: number;
    formData: number;
  };
}