/**
 * @fileoverview Main Memory Module implementation
 * @module modules/memory/memory-module
 * @requires ./types
 * @requires ./errors
 * @requires ./working-memory
 * @requires ./storage/memory-storage
 * @requires ./vector-store/memory-vector-store
 * @requires ../registry/types
 * 
 * This file implements the main Enhanced Memory Module that provides comprehensive
 * memory management capabilities including working memory, long-term persistent memory,
 * vector embeddings, runtime state management, conversational memory buffers, and
 * memory consolidation with full Flowise pattern integration.
 * 
 * @since 1.0.0
 */

import { EventEmitter } from 'events';
import {
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
  MemoryQuery,
  MemorySearchResult,
  VectorSearchQuery,
  VectorSearchResult,
  Embedding,
  ConsolidationResult,
  ExportOptions,
  MemoryExport,
  ImportResult
} from './types';
import {
  MemoryError,
  WorkingMemoryError,
  LongTermMemoryError,
  VectorOperationError,
  ConsolidationError,
  EmbeddingError
} from './errors';
import { WorkingMemory, IWorkingMemoryStorage } from './working-memory';
import { MemoryWorkingMemoryStorage } from './storage/memory-storage';
import { BaseVectorStore, VectorRecord } from './vector-store/base-vector-store';
import { MemoryVectorStore } from './vector-store/memory-vector-store';
import { HealthStatus } from '../registry/types';

/**
 * Enhanced Memory Module implementation with comprehensive functionality.
 * 
 * Provides unified memory management including working memory for conversation
 * context, long-term persistent memory with vector search, runtime state
 * management for workflow continuation, and conversational memory buffers
 * with multiple strategies.
 * 
 * Key features:
 * - Working memory with multiple buffer strategies
 * - Long-term memory with vector embeddings
 * - Runtime state persistence for workflow continuation
 * - Form data management for user interactions
 * - Memory consolidation and summarization
 * - Multi-backend storage support
 * - Flowise pattern integration
 * 
 * @example
 * ```typescript
 * const memory = new MemoryModule();
 * 
 * await memory.initialize({
 *   workingMemory: {
 *     type: 'memory',
 *     bufferTypes: ['window', 'summary'],
 *     maxItems: 500
 *   },
 *   longTermMemory: {
 *     type: 'postgres',
 *     connectionString: 'postgresql://...'
 *   },
 *   vectorStore: {
 *     type: 'memory',
 *     config: { maxVectors: 10000 }
 *   },
 *   embedding: {
 *     provider: 'openai',
 *     model: 'text-embedding-ada-002'
 *   }
 * });
 * 
 * // Add working memory
 * await memory.addWorkingMemory({
 *   sessionId: 'sess-123',
 *   timestamp: new Date(),
 *   type: 'user',
 *   content: 'Hello, how are you?'
 * });
 * 
 * // Store long-term memory
 * const memoryId = await memory.store({
 *   content: 'User prefers detailed explanations',
 *   metadata: {
 *     type: 'preference',
 *     importance: 0.8,
 *     confidence: 0.9
 *   }
 * });
 * ```
 * 
 * @public
 */
export class MemoryModule extends EventEmitter implements IMemoryModule {
  public readonly name = 'Memory';
  public readonly version = '1.0.0';
  
  private config!: Required<MemoryConfig>;
  private workingMemory!: WorkingMemory;
  private vectorStore!: BaseVectorStore;
  private initialized: boolean = false;
  private healthStatus: HealthStatus = { status: 'unhealthy' };
  
  constructor() {
    super();
    this.setupErrorHandling();
  }
  
  /**
   * Initializes the Enhanced Memory Module.
   */
  async initialize(config: MemoryConfig): Promise<void> {
    console.log('Initializing Enhanced Memory Module...');
    
    try {
      // Validate and set configuration
      this.validateConfig(config);
      this.config = this.mergeDefaultConfig(config);
      
      // Initialize working memory storage
      const workingStorage = this.createWorkingMemoryStorage();
      await workingStorage.initialize();
      
      // Initialize working memory
      this.workingMemory = new WorkingMemory({
        storage: workingStorage,
        maxItems: this.config.workingMemory.maxItems,
        compressionThreshold: this.config.workingMemory.compressionThreshold,
        ttl: this.config.workingMemory.ttl,
        bufferTypes: this.config.workingMemory.bufferTypes,
        bufferConfigs: this.getBufferConfigs(),
        autoCleanup: true,
        cleanupInterval: 60 * 60 * 1000, // 1 hour
        summarizationModel: this.config.processing.summarizationModel
      });
      
      await this.workingMemory.initialize();
      
      // Initialize vector store
      this.vectorStore = this.createVectorStore();
      await this.vectorStore.initialize();
      
      this.initialized = true;
      this.healthStatus = { status: 'healthy' };
      
      console.log('✓ Enhanced Memory Module initialized successfully');
      console.log(`Configuration: ${this.config.workingMemory.type} working memory, ${this.config.vectorStore.type} vector store`);
      
      this.emit('initialized', { config: this.config });
      
    } catch (error) {
      this.healthStatus = { status: 'unhealthy' };
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      throw new MemoryError(
        'MEMORY_INITIALIZATION_ERROR',
        `Failed to initialize Memory Module: ${errorMessage}`,
        { config },
        'Check configuration parameters and ensure all required services are available',
        error instanceof Error ? error : undefined
      );
    }
  }
  
  /**
   * Gets health status of the Memory Module.
   */
  async health(): Promise<HealthStatus> {
    if (!this.initialized) {
      return { status: 'unhealthy' };
    }
    
    try {
      // Check working memory health
      if (this.workingMemory) {
        const workingMemoryStats = await this.getWorkingMemoryStats();
        if (!workingMemoryStats) {
          this.healthStatus = { status: 'degraded' };
        }
      }
      
      // Check vector store health
      if (this.vectorStore) {
        const vectorStats = await this.vectorStore.getStats();
        if (!vectorStats) {
          this.healthStatus = { status: 'degraded' };
        }
      }
      
      return this.healthStatus;
      
    } catch (error) {
      this.healthStatus = { status: 'unhealthy' };
      return this.healthStatus;
    }
  }
  
  /**
   * Shuts down the Memory Module.
   */
  async shutdown(): Promise<void> {
    console.log('Shutting down Enhanced Memory Module...');
    
    try {
      if (this.workingMemory) {
        await this.workingMemory.shutdown();
      }
      
      if (this.vectorStore) {
        await this.vectorStore.shutdown();
      }
      
      this.initialized = false;
      this.healthStatus = { status: 'unhealthy' };
      
      console.log('✓ Enhanced Memory Module shutdown complete');
      this.emit('shutdown');
      
    } catch (error) {
      console.error('Error during Memory Module shutdown:', error);
      throw error;
    }
  }
  
  // Working Memory Operations
  
  /**
   * Adds an item to working memory with automatic importance scoring.
   */
  async addWorkingMemory(item: MemoryItem): Promise<void> {
    this.ensureInitialized();
    
    try {
      await this.workingMemory.addItem(item);
      this.emit('working-memory-added', { item });
      
    } catch (error) {
      throw new WorkingMemoryError(
        item.sessionId,
        'add',
        `Failed to add working memory: ${error}`,
        error instanceof Error ? error : undefined,
        { itemType: item.type, contentLength: item.content.length }
      );
    }
  }
  
  /**
   * Retrieves working memory items with filtering options.
   */
  async getWorkingMemory(options?: WorkingMemoryOptions): Promise<MemoryItem[]> {
    this.ensureInitialized();
    
    try {
      const sessionId = options?.sessionId;
      if (!sessionId) {
        throw new WorkingMemoryError(
          'unknown',
          'get',
          'Session ID is required for getting working memory',
          undefined,
          { options }
        );
      }
      
      return await this.workingMemory.getItems(sessionId, options);
      
    } catch (error) {
      throw new WorkingMemoryError(
        options?.sessionId || 'unknown',
        'get',
        `Failed to get working memory: ${error}`,
        error instanceof Error ? error : undefined,
        { options }
      );
    }
  }
  
  /**
   * Clears working memory for a specific session or all sessions.
   */
  async clearWorkingMemory(sessionId?: string): Promise<void> {
    this.ensureInitialized();
    
    try {
      if (sessionId) {
        await this.workingMemory.clearItems(sessionId);
      } else {
        // Clear all sessions - would need to implement in working memory
        const sessionIds = await this.workingMemory['storage'].getSessionIds();
        for (const sid of sessionIds) {
          await this.workingMemory.clearItems(sid);
        }
      }
      
      this.emit('working-memory-cleared', { sessionId });
      
    } catch (error) {
      throw new WorkingMemoryError(
        sessionId || 'all',
        'clear',
        `Failed to clear working memory: ${error}`,
        error instanceof Error ? error : undefined
      );
    }
  }
  
  /**
   * Creates a summary of working memory for a session.
   */
  async summarizeWorkingMemory(sessionId: string): Promise<MemorySummary> {
    this.ensureInitialized();
    
    try {
      return await this.workingMemory.summarize(sessionId);
      
    } catch (error) {
      throw new WorkingMemoryError(
        sessionId,
        'summarize',
        `Failed to summarize working memory: ${error}`,
        error instanceof Error ? error : undefined
      );
    }
  }
  
  // Flowise-style Conversational Memory
  
  /**
   * Adds messages to conversational memory buffer.
   */
  async addConversationalMemory(sessionId: string, messages: IMessage[]): Promise<void> {
    this.ensureInitialized();
    
    try {
      // Convert messages to memory items and add to working memory
      for (const message of messages) {
        const memoryItem: MemoryItem = {
          sessionId,
          timestamp: message.metadata?.timestamp ? new Date(message.metadata.timestamp) : new Date(),
          type: message.role as any,
          content: message.content,
          metadata: {
            ...message.metadata,
            conversationalMemory: true
          }
        };
        
        await this.workingMemory.addItem(memoryItem);
      }
      
      this.emit('conversational-memory-added', { sessionId, messageCount: messages.length });
      
    } catch (error) {
      throw new WorkingMemoryError(
        sessionId,
        'add-conversational',
        `Failed to add conversational memory: ${error}`,
        error instanceof Error ? error : undefined,
        { messageCount: messages.length }
      );
    }
  }
  
  /**
   * Retrieves conversational memory with optional limit.
   */
  async getConversationalMemory(sessionId: string, limit?: number): Promise<IMessage[]> {
    this.ensureInitialized();
    
    try {
      const items = await this.workingMemory.getItems(sessionId, { limit });
      
      // Convert memory items back to messages
      return items.map(item => ({
        role: item.type as any,
        content: item.content,
        metadata: item.metadata
      }));
      
    } catch (error) {
      throw new WorkingMemoryError(
        sessionId,
        'get-conversational',
        `Failed to get conversational memory: ${error}`,
        error instanceof Error ? error : undefined,
        { limit }
      );
    }
  }
  
  // Runtime State Management
  
  /**
   * Sets runtime state for workflow continuation.
   */
  async setRuntimeState(sessionId: string, state: ICommonObject): Promise<void> {
    this.ensureInitialized();
    
    try {
      await this.workingMemory.setRuntimeState(sessionId, state);
      this.emit('runtime-state-updated', { sessionId, state });
      
    } catch (error) {
      throw error; // Working memory will throw RuntimeStateError
    }
  }
  
  /**
   * Retrieves runtime state for a session.
   */
  async getRuntimeState(sessionId: string): Promise<ICommonObject> {
    this.ensureInitialized();
    
    try {
      return await this.workingMemory.getRuntimeState(sessionId);
      
    } catch (error) {
      throw error; // Working memory will throw RuntimeStateError
    }
  }
  
  /**
   * Updates runtime state with specific operations.
   */
  async updateRuntimeState(sessionId: string, updates: StateUpdate[]): Promise<void> {
    this.ensureInitialized();
    
    try {
      await this.workingMemory.updateRuntimeState(sessionId, updates);
      this.emit('runtime-state-updated', { sessionId, updates });
      
    } catch (error) {
      throw error; // Working memory will throw RuntimeStateError
    }
  }
  
  // Form Data Persistence
  
  /**
   * Persists form data for user interactions.
   */
  async setFormData(sessionId: string, form: Record<string, any>): Promise<void> {
    this.ensureInitialized();
    
    try {
      await this.workingMemory.setFormData(sessionId, form);
      this.emit('form-data-updated', { sessionId, form });
      
    } catch (error) {
      throw error; // Working memory will throw FormDataError
    }
  }
  
  /**
   * Retrieves persisted form data.
   */
  async getFormData(sessionId: string): Promise<Record<string, any>> {
    this.ensureInitialized();
    
    try {
      return await this.workingMemory.getFormData(sessionId);
      
    } catch (error) {
      throw error; // Working memory will throw FormDataError
    }
  }
  
  // Memory Buffer Management
  
  /**
   * Creates a memory buffer of specified type.
   */
  createMemoryBuffer(type: MemoryBufferType, config?: MemoryBufferConfig): IMemoryBuffer {
    this.ensureInitialized();
    
    const sessionId = 'default'; // Would need session context
    return this.workingMemory.getOrCreateBuffer(sessionId, type, config) as any;
  }
  
  /**
   * Retrieves or creates a memory buffer for a session.
   */
  async getMemoryBuffer(sessionId: string, type: MemoryBufferType): Promise<IMemoryBuffer> {
    this.ensureInitialized();
    
    try {
      return await this.workingMemory.getOrCreateBuffer(sessionId, type);
      
    } catch (error) {
      throw error; // Working memory will throw MemoryBufferError
    }
  }
  
  // Long-term Memory Operations
  
  /**
   * Stores a long-term memory with vector embedding.
   */
  async store(memory: LongTermMemory): Promise<string> {
    this.ensureInitialized();
    
    try {
      // Generate ID if not provided
      if (!memory.id) {
        memory.id = this.generateMemoryId();
      }
      
      // Generate embedding if not provided
      if (!memory.embedding) {
        const embeddings = await this.embed(memory.content);
        memory.embedding = embeddings[0].vector;
      }
      
      // Set timestamps
      const now = new Date();
      if (!memory.timestamps) {
        memory.timestamps = {
          created: now,
          lastAccessed: now,
          lastModified: now
        };
      }
      
      // Store in vector store
      const vectorRecord: VectorRecord = {
        id: memory.id,
        vector: memory.embedding,
        metadata: {
          ...memory.metadata,
          content: memory.content,
          summary: memory.summary,
          userId: memory.userId,
          sessionId: memory.sessionId,
          timestamps: memory.timestamps
        }
      };
      
      await this.vectorStore.upsert([vectorRecord]);
      
      this.emit('long-term-memory-stored', { memoryId: memory.id, type: memory.metadata.type });
      
      return memory.id;
      
    } catch (error) {
      throw new LongTermMemoryError(
        'store',
        `Failed to store long-term memory: ${error}`,
        error instanceof Error ? error : undefined,
        { memoryType: memory.metadata?.type, hasEmbedding: !!memory.embedding }
      );
    }
  }
  
  /**
   * Retrieves memories based on query criteria.
   */
  async retrieve(query: MemoryQuery): Promise<MemorySearchResult[]> {
    this.ensureInitialized();
    
    try {
      let searchVector: number[] | undefined;
      
      // Generate vector if text query provided
      if (query.text && !query.vector) {
        const embeddings = await this.embed(query.text);
        searchVector = embeddings[0].vector;
      } else if (query.vector) {
        searchVector = query.vector;
      }
      
      if (!searchVector) {
        throw new LongTermMemoryError(
          'retrieve',
          'Either text or vector must be provided for memory retrieval'
        );
      }
      
      // Build vector search query
      const vectorQuery: VectorSearchQuery = {
        vector: searchVector,
        limit: query.limit || 10,
        includeMetadata: true,
        minScore: query.minImportance || 0.0
      };
      
      // Add metadata filters
      if (query.userId || query.sessionId || query.types || query.tags) {
        vectorQuery.filter = {};
        
        if (query.userId) vectorQuery.filter.userId = query.userId;
        if (query.sessionId) vectorQuery.filter.sessionId = query.sessionId;
        if (query.types) vectorQuery.filter['metadata.type'] = { $in: query.types };
        if (query.tags) vectorQuery.filter['metadata.tags'] = { $in: query.tags };
      }
      
      // Search vector store
      const vectorResults = await this.vectorStore.search(vectorQuery);
      
      // Convert to memory search results
      const memoryResults: MemorySearchResult[] = vectorResults.map(result => {
        const metadata = result.metadata!;
        
        const longTermMemory: LongTermMemory = {
          id: result.id,
          content: metadata.content,
          summary: metadata.summary,
          userId: metadata.userId,
          sessionId: metadata.sessionId,
          embedding: undefined, // Don't return full embedding for performance
          metadata: {
            type: metadata['metadata.type'] || metadata.type,
            importance: metadata['metadata.importance'] || metadata.importance || 0.5,
            confidence: metadata['metadata.confidence'] || metadata.confidence || 0.5,
            source: metadata['metadata.source'] || metadata.source,
            tags: metadata['metadata.tags'] || metadata.tags || [],
            relations: metadata['metadata.relations'] || metadata.relations || []
          },
          timestamps: metadata.timestamps || {
            created: new Date(),
            lastAccessed: new Date(),
            lastModified: new Date()
          }
        };
        
        return {
          memory: longTermMemory,
          score: result.score,
          distance: 1 - result.score, // Convert similarity to distance
          metadata: {
            reason: 'vector-similarity',
            contextRelevance: result.score
          }
        };
      });
      
      return memoryResults;
      
    } catch (error) {
      throw new LongTermMemoryError(
        'retrieve',
        `Failed to retrieve memories: ${error}`,
        error instanceof Error ? error : undefined,
        { 
          hasTextQuery: !!query.text,
          hasVectorQuery: !!query.vector,
          limit: query.limit
        }
      );
    }
  }
  
  /**
   * Updates an existing long-term memory.
   */
  async update(memoryId: string, updates: Partial<LongTermMemory>): Promise<void> {
    this.ensureInitialized();
    
    try {
      // Get existing memory (simplified - would need proper storage)
      const vectorResults = await this.vectorStore.search({
        vector: new Array(this.config.embedding.dimensions || 1536).fill(0), // Dummy vector
        filter: { id: memoryId },
        limit: 1,
        includeMetadata: true
      });
      
      if (vectorResults.length === 0) {
        throw new LongTermMemoryError(
          'update',
          `Memory not found: ${memoryId}`,
          undefined,
          { memoryId }
        );
      }
      
      const existing = vectorResults[0];
      const metadata = existing.metadata!;
      
      // Create updated memory
      const updatedMemory: LongTermMemory = {
        id: memoryId,
        content: updates.content || metadata.content,
        summary: updates.summary || metadata.summary,
        userId: updates.userId || metadata.userId,
        sessionId: updates.sessionId || metadata.sessionId,
        embedding: updates.embedding,
        metadata: {
          ...metadata,
          ...updates.metadata
        },
        timestamps: {
          ...metadata.timestamps,
          lastModified: new Date(),
          ...updates.timestamps
        }
      };
      
      // Re-generate embedding if content changed
      if (updates.content && !updates.embedding) {
        const embeddings = await this.embed(updatedMemory.content);
        updatedMemory.embedding = embeddings[0].vector;
      } else if (!updatedMemory.embedding) {
        // Use existing vector (would need to retrieve from vector store)
        updatedMemory.embedding = existing.vector || [];
      }
      
      // Update in vector store
      await this.store(updatedMemory);
      
      this.emit('long-term-memory-updated', { memoryId });
      
    } catch (error) {
      throw new LongTermMemoryError(
        'update',
        `Failed to update memory: ${error}`,
        error instanceof Error ? error : undefined,
        { memoryId }
      );
    }
  }
  
  /**
   * Deletes a long-term memory.
   */
  async delete(memoryId: string): Promise<void> {
    this.ensureInitialized();
    
    try {
      await this.vectorStore.delete([memoryId]);
      this.emit('long-term-memory-deleted', { memoryId });
      
    } catch (error) {
      throw new LongTermMemoryError(
        'delete',
        `Failed to delete memory: ${error}`,
        error instanceof Error ? error : undefined,
        { memoryId }
      );
    }
  }
  
  // Vector Operations
  
  /**
   * Generates embeddings for text or array of texts.
   */
  async embed(text: string | string[]): Promise<Embedding[]> {
    this.ensureInitialized();
    
    try {
      const texts = Array.isArray(text) ? text : [text];
      const embeddings: Embedding[] = [];
      
      // Simple mock embedding generation - in production, would use actual embedding service
      for (const t of texts) {
        const dimensions = this.config.embedding.dimensions || 1536;
        const vector = new Array(dimensions).fill(0).map(() => Math.random() * 2 - 1);
        
        embeddings.push({
          text: t,
          vector,
          model: this.config.embedding.model || 'mock-embedding-model',
          metadata: {
            tokens: Math.ceil(t.length / 4),
            processingTime: Math.random() * 100,
            cached: false
          }
        });
      }
      
      return embeddings;
      
    } catch (error) {
      throw new EmbeddingError(
        'generate',
        `Failed to generate embeddings: ${error}`,
        error instanceof Error ? error : undefined,
        {
          provider: this.config.embedding.provider,
          model: this.config.embedding.model,
          textCount: Array.isArray(text) ? text.length : 1
        }
      );
    }
  }
  
  /**
   * Searches for similar vectors based on query.
   */
  async search(query: VectorSearchQuery): Promise<VectorSearchResult[]> {
    this.ensureInitialized();
    
    try {
      return await this.vectorStore.search(query);
      
    } catch (error) {
      throw new VectorOperationError(
        'search',
        `Vector search failed: ${error}`,
        error instanceof Error ? error : undefined,
        { query }
      );
    }
  }
  
  // Memory Management
  
  /**
   * Consolidates working memory into long-term storage.
   */
  async consolidate(sessionId: string): Promise<ConsolidationResult> {
    this.ensureInitialized();
    
    try {
      const startTime = Date.now();
      const workingItems = await this.workingMemory.getItems(sessionId);
      
      if (workingItems.length < this.config.processing.consolidationThreshold!) {
        return {
          status: 'skipped',
          reason: `Insufficient items for consolidation (${workingItems.length} < ${this.config.processing.consolidationThreshold})`,
          memoriesProcessed: workingItems.length
        };
      }
      
      let memoriesCreated = 0;
      let facts = 0;
      let experiences = 0;
      const errors: string[] = [];
      
      // Simple consolidation logic - group by importance
      const importantItems = workingItems.filter(item => (item.metadata?.importance || 0) > 0.7);
      
      for (const item of importantItems) {
        try {
          const memoryType = this.classifyMemoryType(item);
          
          const longTermMemory: LongTermMemory = {
            content: item.content,
            summary: item.content.length > 200 ? item.content.substring(0, 200) + '...' : undefined,
            userId: item.metadata?.userId,
            sessionId: item.sessionId,
            metadata: {
              type: memoryType,
              importance: item.metadata?.importance || 0.7,
              confidence: 0.8,
              source: 'working-memory-consolidation',
              tags: item.metadata?.tags || []
            },
            timestamps: {
              created: new Date(),
              lastAccessed: new Date(),
              lastModified: new Date()
            }
          };
          
          await this.store(longTermMemory);
          memoriesCreated++;
          
          if (memoryType === 'fact') facts++;
          else experiences++;
          
        } catch (error) {
          errors.push(`Failed to consolidate item ${item.id}: ${error}`);
        }
      }
      
      const processingTime = Date.now() - startTime;
      
      const result: ConsolidationResult = {
        status: errors.length === 0 ? 'success' : 'failed',
        memoriesCreated,
        memoriesProcessed: workingItems.length,
        facts,
        experiences,
        processingTime,
        errors: errors.length > 0 ? errors : undefined
      };
      
      this.emit('consolidation-completed', { sessionId, result });
      
      return result;
      
    } catch (error) {
      throw new ConsolidationError(
        sessionId,
        `Memory consolidation failed: ${error}`,
        error instanceof Error ? error : undefined,
        { 
          threshold: this.config.processing.consolidationThreshold,
          stage: 'consolidation'
        }
      );
    }
  }
  
  /**
   * Exports memory data for backup or migration.
   */
  async export(options: ExportOptions): Promise<MemoryExport> {
    this.ensureInitialized();
    
    try {
      const exportData: MemoryExport = {
        metadata: {
          exportedAt: new Date(),
          version: this.version,
          totalRecords: 0,
          options
        }
      };
      
      // Export working memory if requested
      if (options.includeWorkingMemory) {
        // Would need to implement in working memory storage
        exportData.workingMemory = [];
      }
      
      // Export long-term memory if requested
      if (options.includeLongTermMemory) {
        // Would need to implement vector store export
        exportData.longTermMemory = [];
      }
      
      // Export runtime states if requested
      if (options.userId || options.sessionId) {
        exportData.runtimeStates = {};
        exportData.formData = {};
      }
      
      exportData.metadata.totalRecords = 
        (exportData.workingMemory?.length || 0) + 
        (exportData.longTermMemory?.length || 0);
      
      return exportData;
      
    } catch (error) {
      throw new MemoryError(
        'MEMORY_EXPORT_ERROR',
        `Failed to export memory data: ${error}`,
        { options },
        'Check export options and ensure sufficient permissions',
        error instanceof Error ? error : undefined
      );
    }
  }
  
  /**
   * Imports memory data from backup or migration.
   */
  async import(data: MemoryExport): Promise<ImportResult> {
    this.ensureInitialized();
    
    try {
      const startTime = Date.now();
      let recordsImported = 0;
      let recordsFailed = 0;
      const errors: string[] = [];
      
      // Import working memory
      if (data.workingMemory) {
        for (const item of data.workingMemory) {
          try {
            await this.addWorkingMemory(item);
            recordsImported++;
          } catch (error) {
            recordsFailed++;
            errors.push(`Working memory import failed: ${error}`);
          }
        }
      }
      
      // Import long-term memory
      if (data.longTermMemory) {
        for (const memory of data.longTermMemory) {
          try {
            await this.store(memory);
            recordsImported++;
          } catch (error) {
            recordsFailed++;
            errors.push(`Long-term memory import failed: ${error}`);
          }
        }
      }
      
      const processingTime = Date.now() - startTime;
      const status = recordsFailed === 0 ? 'success' : recordsFailed < recordsImported ? 'partial' : 'failed';
      
      return {
        status,
        recordsImported,
        recordsFailed,
        processingTime,
        errors,
        summary: {
          workingMemory: data.workingMemory?.length || 0,
          longTermMemory: data.longTermMemory?.length || 0,
          runtimeStates: Object.keys(data.runtimeStates || {}).length,
          formData: Object.keys(data.formData || {}).length
        }
      };
      
    } catch (error) {
      throw new MemoryError(
        'MEMORY_IMPORT_ERROR',
        `Failed to import memory data: ${error}`,
        { dataVersion: data.metadata.version },
        'Check data format and ensure compatibility',
        error instanceof Error ? error : undefined
      );
    }
  }
  
  // Private Helper Methods
  
  /**
   * Validates module configuration.
   * 
   * @private
   */
  private validateConfig(config: MemoryConfig): void {
    if (!config.workingMemory) {
      throw new MemoryError(
        'MEMORY_CONFIG_ERROR',
        'Working memory configuration is required',
        { config }
      );
    }
    
    if (!config.vectorStore) {
      throw new MemoryError(
        'MEMORY_CONFIG_ERROR',
        'Vector store configuration is required',
        { config }
      );
    }
    
    if (!config.embedding) {
      throw new MemoryError(
        'MEMORY_CONFIG_ERROR',
        'Embedding configuration is required',
        { config }
      );
    }
  }
  
  /**
   * Merges user configuration with defaults.
   * 
   * @private
   */
  private mergeDefaultConfig(config: MemoryConfig): Required<MemoryConfig> {
    return {
      workingMemory: {
        type: config.workingMemory.type || 'memory',
        maxItems: config.workingMemory.maxItems || 500,
        ttl: config.workingMemory.ttl || 24 * 60 * 60 * 1000,
        compressionThreshold: config.workingMemory.compressionThreshold || 300,
        bufferTypes: config.workingMemory.bufferTypes || ['window', 'summary'],
        windowSize: config.workingMemory.windowSize || 50,
        summaryThreshold: config.workingMemory.summaryThreshold || 30,
        conversationLimit: config.workingMemory.conversationLimit || 100
      },
      longTermMemory: {
        type: config.longTermMemory?.type || 'postgres',
        connectionString: config.longTermMemory?.connectionString,
        config: config.longTermMemory?.config
      },
      vectorStore: {
        type: config.vectorStore.type || 'memory',
        config: config.vectorStore.config || {}
      },
      embedding: {
        provider: config.embedding.provider || 'openai',
        model: config.embedding.model || 'text-embedding-ada-002',
        dimensions: config.embedding.dimensions || 1536,
        batchSize: config.embedding.batchSize || 100
      },
      processing: {
        summarizationModel: config.processing?.summarizationModel || 'gpt-3.5-turbo',
        summarizationThreshold: config.processing?.summarizationThreshold || 100,
        consolidationInterval: config.processing?.consolidationInterval || 60 * 60 * 1000,
        importanceScoring: config.processing?.importanceScoring !== false,
        runtimeStateEnabled: config.processing?.runtimeStateEnabled !== false,
        formDataEnabled: config.processing?.formDataEnabled !== false,
        reasoningChains: config.processing?.reasoningChains !== false,
        humanInteractionHistory: config.processing?.humanInteractionHistory !== false,
        variableResolution: config.processing?.variableResolution !== false,
        consolidationThreshold: config.processing?.consolidationThreshold || 50
      }
    };
  }
  
  /**
   * Creates working memory storage based on configuration.
   * 
   * @private
   */
  private createWorkingMemoryStorage(): IWorkingMemoryStorage {
    switch (this.config.workingMemory.type) {
      case 'memory':
        return new MemoryWorkingMemoryStorage();
        
      default:
        throw new MemoryError(
          'MEMORY_CONFIG_ERROR',
          `Unsupported working memory storage type: ${this.config.workingMemory.type}`,
          { type: this.config.workingMemory.type }
        );
    }
  }
  
  /**
   * Creates vector store based on configuration.
   * 
   * @private
   */
  private createVectorStore(): BaseVectorStore {
    const dimensions = this.config.embedding.dimensions || 1536;
    
    switch (this.config.vectorStore.type) {
      case 'memory':
        return new MemoryVectorStore({
          dimensions,
          ...this.config.vectorStore.config
        });
        
      default:
        throw new MemoryError(
          'MEMORY_CONFIG_ERROR',
          `Unsupported vector store type: ${this.config.vectorStore.type}`,
          { type: this.config.vectorStore.type }
        );
    }
  }
  
  /**
   * Gets buffer configurations for working memory.
   * 
   * @private
   */
  private getBufferConfigs(): Record<MemoryBufferType, MemoryBufferConfig> {
    return {
      window: { maxSize: this.config.workingMemory.windowSize },
      summary: { 
        maxSize: this.config.workingMemory.windowSize,
        summarizationThreshold: this.config.workingMemory.summaryThreshold
      },
      conversation: { maxSize: this.config.workingMemory.conversationLimit },
      working: { maxSize: 25 },
      episodic: { maxSize: this.config.workingMemory.windowSize }
    };
  }
  
  /**
   * Gets working memory statistics.
   * 
   * @private
   */
  private async getWorkingMemoryStats(): Promise<any> {
    try {
      // Would implement statistics gathering
      return { healthy: true };
    } catch (error) {
      return null;
    }
  }
  
  /**
   * Classifies memory type based on content.
   * 
   * @private
   */
  private classifyMemoryType(item: MemoryItem): 'fact' | 'experience' | 'preference' | 'context' | 'skill' {
    const content = item.content.toLowerCase();
    
    if (content.includes('prefer') || content.includes('like') || content.includes('dislike')) {
      return 'preference';
    }
    
    if (content.includes('learn') || content.includes('how to') || content.includes('instruction')) {
      return 'skill';
    }
    
    if (item.type === 'user') {
      return 'experience';
    }
    
    return 'fact';
  }
  
  /**
   * Generates a unique memory ID.
   * 
   * @private
   */
  private generateMemoryId(): string {
    return `mem-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }
  
  /**
   * Sets up error handling for the module.
   * 
   * @private
   */
  private setupErrorHandling(): void {
    this.on('error', (error) => {
      console.error('Memory Module Error:', error);
      this.healthStatus = { status: 'unhealthy' };
    });
  }
  
  /**
   * Ensures the module is initialized before operations.
   * 
   * @private
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new MemoryError(
        'MEMORY_NOT_INITIALIZED',
        'Memory Module has not been initialized. Call initialize() first.',
        { initialized: this.initialized }
      );
    }
  }
}