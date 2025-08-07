/**
 * @fileoverview Public API exports for the Enhanced Memory Module
 * @module modules/memory
 * @requires ./types
 * @requires ./errors
 * @requires ./memory-module
 * @requires ./factory
 * @requires ./working-memory
 * @requires ./storage/base-storage
 * @requires ./storage/memory-storage
 * @requires ./vector-store/base-vector-store
 * @requires ./vector-store/memory-vector-store
 * @requires ./buffers/window-buffer
 * @requires ./buffers/summary-buffer
 * @requires ./buffers/conversation-buffer
 * @requires ./buffers/working-buffer
 * @requires ./buffers/episodic-buffer
 * 
 * This file provides the main public API for the Enhanced Memory Module, exporting
 * all interfaces, types, classes, and factory functions needed by consumers.
 * 
 * The Enhanced Memory Module provides comprehensive memory management for AI agent
 * applications including working memory, long-term persistent memory, vector embeddings,
 * runtime state management, conversational memory buffers, and memory consolidation
 * with full Flowise pattern integration.
 * 
 * @example
 * ```typescript
 * import { createMemoryModule, MemoryConfig } from '@/modules/memory';
 * 
 * // Create and initialize module
 * const memory = createMemoryModule({
 *   workingMemory: {
 *     type: 'memory',
 *     bufferTypes: ['window', 'summary'],
 *     maxItems: 500
 *   },
 *   longTermMemory: {
 *     type: 'postgres',
 *     connectionString: process.env.DATABASE_URL
 *   },
 *   vectorStore: {
 *     type: 'pinecone',
 *     config: {
 *       apiKey: process.env.PINECONE_API_KEY,
 *       environment: 'us-west1-gcp'
 *     }
 *   },
 *   embedding: {
 *     provider: 'openai',
 *     model: 'text-embedding-ada-002'
 *   }
 * });
 * 
 * await memory.initialize(config);
 * 
 * // Add working memory
 * await memory.addWorkingMemory({
 *   sessionId: 'sess-123',
 *   timestamp: new Date(),
 *   type: 'user',
 *   content: 'Hello, how can you help me?'
 * });
 * 
 * // Store long-term memory
 * const memoryId = await memory.store({
 *   content: 'User prefers detailed technical explanations',
 *   metadata: {
 *     type: 'preference',
 *     importance: 0.9,
 *     confidence: 0.8
 *   }
 * });
 * 
 * // Search memories
 * const results = await memory.retrieve({
 *   text: 'user preferences about explanations',
 *   limit: 5
 * });
 * ```
 * 
 * @since 1.0.0
 */

// Core interfaces and types
export type {
  IMemoryModule,
  MemoryConfig,
  MemoryItem,
  IMessage,
  ICommonObject,
  StateUpdate,
  MemoryBufferType,
  IMemoryBuffer,
  MemoryBufferConfig,
  WorkingMemoryOptions,
  MemorySummary,
  LongTermMemory,
  MemoryRelation,
  MemoryQuery,
  MemorySearchResult,
  VectorSearchQuery,
  VectorSearchResult,
  VectorStoreConfig,
  Embedding,
  ConsolidationResult,
  ExportOptions,
  MemoryExport,
  ImportResult
} from './types';

// Error classes
export {
  MemoryError,
  WorkingMemoryError,
  LongTermMemoryError,
  VectorOperationError,
  ConsolidationError,
  MemoryStorageError,
  MemoryValidationError,
  EmbeddingError,
  VectorSearchError,
  MemoryBufferError,
  RuntimeStateError,
  FormDataError,
  isMemoryError,
  createMemoryErrorContext,
  MemoryErrorSeverity,
  getMemoryErrorSeverity
} from './errors';

// Main module implementation
export { MemoryModule } from './memory-module';

// Factory functions
export {
  createMemoryModule,
  createTestMemoryModule
} from './factory';

// Working memory implementation (for advanced use cases)
export { WorkingMemory, type IWorkingMemoryStorage } from './working-memory';

// Storage implementations (for advanced use cases)
export { BaseWorkingMemoryStorage } from './storage/base-storage';
export { MemoryWorkingMemoryStorage } from './storage/memory-storage';

// Vector store implementations (for advanced use cases)
export { BaseVectorStore, type VectorRecord } from './vector-store/base-vector-store';
export { MemoryVectorStore } from './vector-store/memory-vector-store';

// Memory buffer implementations (for advanced use cases)
export { WindowBuffer } from './buffers/window-buffer';
export { SummaryBuffer } from './buffers/summary-buffer';
export { ConversationBuffer } from './buffers/conversation-buffer';
export { WorkingBuffer } from './buffers/working-buffer';
export { EpisodicBuffer } from './buffers/episodic-buffer';

// Re-export commonly used types from registry for convenience
export type { HealthStatus } from '../registry/types';

/**
 * Module metadata and version information.
 */
export const MODULE_INFO = {
  name: 'Enhanced Memory',
  version: '1.0.0',
  description: 'Comprehensive memory management with vector search and Flowise integration',
  author: 'AgentHub Team',
  dependencies: ['vector-store (optional)', 'database (optional)', 'embedding-service'],
  capabilities: [
    'working_memory_management',
    'long_term_memory_storage',
    'vector_embeddings_search',
    'runtime_state_persistence',
    'conversational_memory_buffers',
    'memory_consolidation',
    'form_data_persistence',
    'agent_reasoning_chains',
    'human_interaction_history',
    'variable_templating',
    'multi_backend_storage',
    'flowise_pattern_integration'
  ]
} as const;

/**
 * Supported working memory storage types.
 */
export const WORKING_MEMORY_TYPES = {
  MEMORY: 'memory',
  REDIS: 'redis',
  SESSION_STATE: 'session-state'
} as const;

/**
 * Supported vector store types.
 */
export const VECTOR_STORE_TYPES = {
  PINECONE: 'pinecone',
  WEAVIATE: 'weaviate',
  QDRANT: 'qdrant',
  CHROMA: 'chroma',
  MEMORY: 'memory'
} as const;

/**
 * Supported embedding providers.
 */
export const EMBEDDING_PROVIDERS = {
  OPENAI: 'openai',
  COHERE: 'cohere',
  HUGGINGFACE: 'huggingface',
  LITELLM: 'litellm'
} as const;

/**
 * Memory buffer types for different strategies.
 */
export const MEMORY_BUFFER_TYPES = {
  WINDOW: 'window',
  SUMMARY: 'summary',
  CONVERSATION: 'conversation',
  WORKING: 'working',
  EPISODIC: 'episodic'
} as const;

/**
 * Long-term memory types for classification.
 */
export const MEMORY_TYPES = {
  FACT: 'fact',
  EXPERIENCE: 'experience',
  PREFERENCE: 'preference',
  CONTEXT: 'context',
  SKILL: 'skill'
} as const;

/**
 * Default configuration templates for common use cases.
 * 
 * These templates provide pre-configured setups for typical
 * memory management scenarios.
 */
export const DEFAULT_CONFIGS = {
  /** Minimal configuration for development */
  DEVELOPMENT: {
    workingMemory: {
      type: 'memory' as const,
      maxItems: 100,
      compressionThreshold: 50,
      bufferTypes: ['window', 'summary'] as const
    },
    vectorStore: {
      type: 'memory' as const,
      config: { maxVectors: 1000 }
    },
    embedding: {
      provider: 'openai' as const,
      model: 'text-embedding-ada-002',
      dimensions: 1536
    },
    processing: {
      consolidationThreshold: 20,
      importanceScoring: true,
      runtimeStateEnabled: true
    }
  },
  
  /** Production configuration with external services */
  PRODUCTION: {
    workingMemory: {
      type: 'memory' as const,
      maxItems: 1000,
      compressionThreshold: 500,
      bufferTypes: ['window', 'summary', 'conversation'] as const
    },
    vectorStore: {
      type: 'pinecone' as const,
      config: {
        apiKey: process.env.PINECONE_API_KEY,
        environment: process.env.PINECONE_ENVIRONMENT,
        indexName: 'memory-vectors'
      }
    },
    embedding: {
      provider: 'openai' as const,
      model: 'text-embedding-ada-002',
      dimensions: 1536
    },
    processing: {
      consolidationThreshold: 100,
      importanceScoring: true,
      runtimeStateEnabled: true
    }
  },
  
  /** Test configuration with minimal settings */
  TEST: {
    workingMemory: {
      type: 'memory' as const,
      maxItems: 10,
      compressionThreshold: 5,
      bufferTypes: ['window'] as const
    },
    vectorStore: {
      type: 'memory' as const,
      config: { maxVectors: 100 }
    },
    embedding: {
      provider: 'openai' as const,
      model: 'text-embedding-ada-002',
      dimensions: 1536
    },
    processing: {
      consolidationThreshold: 5,
      importanceScoring: false,
      runtimeStateEnabled: true
    }
  }
} as const;

/**
 * Utility functions for common operations.
 */
export const MEMORY_UTILS = {
  /**
   * Generates a unique memory ID.
   * 
   * @param prefix - Optional prefix for the ID
   * @returns Unique memory identifier
   */
  generateMemoryId(prefix: string = 'mem'): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  },
  
  /**
   * Generates a unique session ID.
   * 
   * @param prefix - Optional prefix for the ID
   * @returns Unique session identifier
   */
  generateSessionId(prefix: string = 'sess'): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  },
  
  /**
   * Calculates importance score for memory content.
   * 
   * @param content - Memory content to analyze
   * @param metadata - Optional metadata for context
   * @returns Importance score between 0 and 1
   */
  calculateImportance(content: string, metadata?: any): number {
    let importance = 0.5; // Base importance
    
    // Length-based adjustment
    const lengthBoost = Math.min(content.length / 1000, 0.2);
    importance += lengthBoost;
    
    // Question-based boost
    if (content.includes('?')) {
      importance += 0.1;
    }
    
    // Exclamation-based boost
    if (content.includes('!')) {
      importance += 0.05;
    }
    
    // Metadata-based adjustments
    if (metadata?.humanInteraction) {
      importance += 0.2;
    }
    
    if (metadata?.toolCall) {
      importance += 0.1;
    }
    
    return Math.min(importance, 1.0);
  },
  
  /**
   * Extracts key topics from text content.
   * 
   * @param content - Text content to analyze
   * @returns Array of extracted topics
   */
  extractTopics(content: string): string[] {
    const topics: string[] = [];
    const lowerContent = content.toLowerCase();
    
    // Common AI/tech topics
    const commonTopics = [
      'machine learning', 'ai', 'data analysis', 'programming', 'coding',
      'database', 'api', 'authentication', 'security', 'performance',
      'testing', 'deployment', 'debugging', 'optimization', 'architecture'
    ];
    
    commonTopics.forEach(topic => {
      if (lowerContent.includes(topic)) {
        topics.push(topic);
      }
    });
    
    return topics.slice(0, 5); // Limit to top 5
  },
  
  /**
   * Validates memory item structure.
   * 
   * @param item - Memory item to validate
   * @returns True if valid, throws error if invalid
   */
  validateMemoryItem(item: any): boolean {
    if (!item.sessionId) {
      throw new Error('Memory item must have a session ID');
    }
    
    if (!item.content || typeof item.content !== 'string') {
      throw new Error('Memory item must have valid content');
    }
    
    if (!item.timestamp || !(item.timestamp instanceof Date)) {
      throw new Error('Memory item must have a valid timestamp');
    }
    
    const validTypes = ['user', 'assistant', 'system', 'tool', 'observation', 'human', 'reasoning'];
    if (!validTypes.includes(item.type)) {
      throw new Error(`Invalid memory item type: ${item.type}`);
    }
    
    return true;
  }
} as const;

/**
 * Best practice recommendations for using the Enhanced Memory Module.
 */
export const BEST_PRACTICES = {
  WORKING_MEMORY: [
    'Set appropriate buffer types based on use case requirements',
    'Configure reasonable item limits to prevent memory bloat',
    'Use importance scoring to prioritize significant memories',
    'Enable compression for sessions with high message volume',
    'Monitor working memory statistics for optimization'
  ],
  
  LONG_TERM_MEMORY: [
    'Use descriptive metadata for better search and organization',
    'Set appropriate importance and confidence scores',
    'Create meaningful relations between related memories',
    'Implement regular consolidation from working memory',
    'Use vector search for semantic similarity queries'
  ],
  
  VECTOR_STORAGE: [
    'Choose vector store based on scale and performance requirements',
    'Use consistent embedding models for compatibility',
    'Set appropriate vector dimensions for your embedding model',
    'Implement proper error handling for vector operations',
    'Monitor vector store capacity and performance'
  ],
  
  RUNTIME_STATE: [
    'Use structured state objects for better organization',
    'Implement proper serialization for complex state data',
    'Clear unused state regularly to optimize storage',
    'Use state updates for atomic changes to runtime data',
    'Monitor state size to prevent storage issues'
  ],
  
  PERFORMANCE: [
    'Use appropriate batch sizes for embedding operations',
    'Implement caching for frequently accessed memories',
    'Configure reasonable consolidation thresholds',
    'Monitor memory usage and implement cleanup policies',
    'Use pagination for large result sets'
  ],
  
  SECURITY: [
    'Validate all input data before storage operations',
    'Implement proper access controls for sensitive memories',
    'Use encryption for sensitive memory content',
    'Sanitize memory content before embedding generation',
    'Regularly audit stored memories for compliance'
  ]
} as const;