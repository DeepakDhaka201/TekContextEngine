/**
 * @fileoverview Working Memory implementation for the Enhanced Memory Module
 * @module modules/memory/working-memory
 * @requires ./types
 * @requires ./errors
 * @requires ./buffers/window-buffer
 * @requires ./buffers/summary-buffer
 * @requires ./buffers/conversation-buffer
 * @requires ./buffers/working-buffer
 * @requires ./buffers/episodic-buffer
 * 
 * This file implements the working memory component that manages short-term conversation
 * context, runtime state for workflow continuation, and form data persistence.
 * It supports multiple memory buffer strategies and integrates with Flowise patterns.
 * 
 * Key concepts:
 * - Working memory for conversation context and current state
 * - Runtime state persistence for workflow continuation
 * - Form data management for user interactions
 * - Multiple memory buffer strategies (window, summary, conversation, etc.)
 * - Automatic memory compression and cleanup
 * - Integration with long-term memory consolidation
 * - Flowise message format compatibility
 * 
 * @example
 * ```typescript
 * import { WorkingMemory } from './working-memory';
 * 
 * const workingMemory = new WorkingMemory({
 * 	 storage: redisStorage,
 * 	 maxItems: 500,
 * 	 compressionThreshold: 300,
 * 	 bufferTypes: ['window', 'summary', 'conversation']
 * });
 * 
 * await workingMemory.addItem({
 * 	 sessionId: 'sess-123',
 * 	 timestamp: new Date(),
 * 	 type: 'user',
 * 	 content: 'Hello, how are you?'
 * });
 * 
 * const context = await workingMemory.getContext('sess-123');
 * ```
 * 
 * @since 1.0.0
 */

import { EventEmitter } from 'events';
import {
  MemoryItem,
  IMessage,
  ICommonObject,
  StateUpdate,
  MemoryBufferType,
  IMemoryBuffer,
  MemoryBufferConfig,
  WorkingMemoryOptions,
  MemorySummary
} from './types';
import {
  WorkingMemoryError,
  MemoryValidationError,
  RuntimeStateError,
  FormDataError,
  MemoryBufferError
} from './errors';
import { WindowBuffer } from './buffers/window-buffer';
import { SummaryBuffer } from './buffers/summary-buffer';
import { ConversationBuffer } from './buffers/conversation-buffer';
import { WorkingBuffer } from './buffers/working-buffer';
import { EpisodicBuffer } from './buffers/episodic-buffer';

/**
 * Storage interface for working memory persistence.
 * 
 * Abstracts storage backend operations for working memory, runtime state,
 * and form data with support for different storage implementations.
 */
export interface IWorkingMemoryStorage {
  /**
   * Initializes the storage backend.
   * 
   * @returns Promise that resolves when initialization is complete
   */
  initialize(): Promise<void>;
  
  /** 
   * Gets working memory items for a session.
   * 
   * @param sessionId - Session identifier
   * @param options - Query options
   * @returns Promise resolving to memory items
   */
  getItems(sessionId: string, options?: WorkingMemoryOptions): Promise<MemoryItem[]>;
  
  /**
   * Adds a memory item to working memory.
   * 
   * @param item - Memory item to add
   * @returns Promise that resolves when item is added
   */
  addItem(item: MemoryItem): Promise<void>;
  
  /**
   * Removes memory items from working memory.
   * 
   * @param sessionId - Session identifier
   * @param itemIds - Optional array of specific item IDs to remove
   * @returns Promise that resolves when items are removed
   */
  removeItems(sessionId: string, itemIds?: string[]): Promise<void>;
  
  /**
   * Gets runtime state for a session.
   * 
   * @param sessionId - Session identifier
   * @returns Promise resolving to runtime state
   */
  getRuntimeState(sessionId: string): Promise<ICommonObject>;
  
  /**
   * Sets runtime state for a session.
   * 
   * @param sessionId - Session identifier
   * @param state - Runtime state to set
   * @returns Promise that resolves when state is set
   */
  setRuntimeState(sessionId: string, state: ICommonObject): Promise<void>;
  
  /**
   * Gets form data for a session.
   * 
   * @param sessionId - Session identifier
   * @returns Promise resolving to form data
   */
  getFormData(sessionId: string): Promise<Record<string, any>>;
  
  /**
   * Sets form data for a session.
   * 
   * @param sessionId - Session identifier
   * @param form - Form data to set
   * @returns Promise that resolves when form is set
   */
  setFormData(sessionId: string, form: Record<string, any>): Promise<void>;
  
  /**
   * Gets all session IDs that have working memory.
   * 
   * @returns Promise resolving to array of session IDs
   */
  getSessionIds(): Promise<string[]>;
  
  /**
   * Clears all data for a session.
   * 
   * @param sessionId - Session identifier
   * @returns Promise that resolves when session is cleared
   */
  clearSession(sessionId: string): Promise<void>;
}

/**
 * Configuration for working memory.
 */
export interface WorkingMemoryConfig {
  /** Storage backend for persistence */
  storage: IWorkingMemoryStorage;
  
  /** Maximum items per session before compression */
  maxItems?: number;
  
  /** Threshold for triggering compression */
  compressionThreshold?: number;
  
  /** Time to live for items in milliseconds */
  ttl?: number;
  
  /** Enabled buffer types */
  bufferTypes?: MemoryBufferType[];
  
  /** Default buffer configurations */
  bufferConfigs?: Record<MemoryBufferType, MemoryBufferConfig>;
  
  /** Enable automatic cleanup */
  autoCleanup?: boolean;
  
  /** Cleanup interval in milliseconds */
  cleanupInterval?: number;
  
  /** Model for summarization */
  summarizationModel?: string;
}

/**
 * Working Memory implementation with comprehensive functionality.
 * 
 * Manages short-term conversation context, runtime state persistence,
 * form data management, and multiple memory buffer strategies. Designed
 * to work seamlessly with Flowise patterns and provide workflow continuation
 * capabilities.
 * 
 * Key features:
 * - Multi-session working memory management
 * - Runtime state persistence for workflow continuation
 * - Form data persistence for user interactions
 * - Multiple memory buffer strategies
 * - Automatic compression and cleanup
 * - Event-driven architecture for real-time updates
 * - Integration points for long-term memory consolidation
 * 
 * @example
 * ```typescript
 * const workingMemory = new WorkingMemory({
 *   storage: redisStorage,
 *   maxItems: 500,
 *   compressionThreshold: 300,
 *   bufferTypes: ['window', 'summary'],
 *   autoCleanup: true
 * });
 * 
 * await workingMemory.initialize();
 * 
 * // Add conversation turn
 * await workingMemory.addItem({
 *   sessionId: 'sess-123',
 *   timestamp: new Date(),
 *   type: 'user',
 *   content: 'What is machine learning?',
 *   metadata: { importance: 0.8 }
 * });
 * 
 * // Set runtime state for workflow
 * await workingMemory.setRuntimeState('sess-123', {
 *   currentStep: 'data_analysis',
 *   variables: { userQuery: 'machine learning basics' },
 *   context: { previousResults: [] }
 * });
 * 
 * // Get context for agent
 * const summary = await workingMemory.summarize('sess-123');
 * ```
 * 
 * Events emitted:
 * - 'item-added': When memory item is added
 * - 'compression-triggered': When compression threshold is reached
 * - 'state-updated': When runtime state is updated
 * - 'form-updated': When form data is updated
 * - 'cleanup-completed': When automatic cleanup runs
 * 
 * @public
 */
export class WorkingMemory extends EventEmitter {
  private storage: IWorkingMemoryStorage;
  private config: Required<WorkingMemoryConfig>;
  private buffers: Map<string, Map<MemoryBufferType, IMemoryBuffer>>;
  private cleanupTimer?: NodeJS.Timeout;
  private initialized: boolean = false;
  
  /**
   * Creates a new WorkingMemory instance.
   * 
   * @param config - Working memory configuration
   */
  constructor(config: WorkingMemoryConfig) {
    super();
    
    this.storage = config.storage;
    this.config = {
      storage: config.storage,
      maxItems: config.maxItems || 500,
      compressionThreshold: config.compressionThreshold || 300,
      ttl: config.ttl || 24 * 60 * 60 * 1000, // 24 hours
      bufferTypes: config.bufferTypes || ['window', 'summary'],
      bufferConfigs: config.bufferConfigs || {
        window: {},
        summary: {},
        conversation: {},
        working: {},
        episodic: {}
      },
      autoCleanup: config.autoCleanup !== false,
      cleanupInterval: config.cleanupInterval || 60 * 60 * 1000, // 1 hour
      summarizationModel: config.summarizationModel || 'gpt-3.5-turbo'
    };
    
    this.buffers = new Map();
    
    this.setupErrorHandling();
  }
  
  /**
   * Initializes the working memory system.
   * 
   * Sets up automatic cleanup timers and validates configuration.
   * 
   * @returns Promise that resolves when initialization is complete
   * @throws {WorkingMemoryError} If initialization fails
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    
    try {
      console.log('Initializing Working Memory...');
      
      // Validate configuration
      this.validateConfiguration();
      
      // Start automatic cleanup if enabled
      if (this.config.autoCleanup) {
        this.startAutoCleanup();
      }
      
      this.initialized = true;
      console.log('✓ Working Memory initialized successfully');
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new WorkingMemoryError(
        'system',
        'initialize',
        `Failed to initialize working memory: ${errorMessage}`,
        error instanceof Error ? error : undefined,
        {
          bufferTypes: this.config.bufferTypes,
          maxItems: this.config.maxItems,
          autoCleanup: this.config.autoCleanup
        }
      );
    }
  }
  
  /**
   * Shuts down the working memory system.
   * 
   * Cleans up timers and resources.
   * 
   * @returns Promise that resolves when shutdown is complete
   */
  async shutdown(): Promise<void> {
    console.log('Shutting down Working Memory...');
    
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    
    this.buffers.clear();
    this.initialized = false;
    
    console.log('✓ Working Memory shutdown complete');
  }
  
  /**
   * Adds a memory item to working memory.
   * 
   * Automatically handles importance scoring, buffer updates, and
   * compression triggering based on configuration.
   * 
   * @param item - Memory item to add
   * @returns Promise that resolves when item is added
   * @throws {WorkingMemoryError} If adding item fails
   */
  async addItem(item: MemoryItem): Promise<void> {
    this.ensureInitialized();
    
    try {
      // Validate memory item
      this.validateMemoryItem(item);
      
      // Generate ID if not provided
      if (!item.id) {
        item.id = this.generateItemId();
      }
      
      // Add importance scoring if not present
      if (!item.metadata?.importance) {
        item.metadata = {
          ...item.metadata,
          importance: this.calculateImportance(item)
        };
      }
      
      // Add to storage
      await this.storage.addItem(item);
      
      // Update memory buffers
      await this.updateBuffers(item.sessionId, item);
      
      // Check if compression is needed
      const items = await this.storage.getItems(item.sessionId);
      if (items.length >= this.config.compressionThreshold) {
        this.emit('compression-triggered', { sessionId: item.sessionId, itemCount: items.length });
        // Note: Compression would be handled by the Memory Module
      }
      
      this.emit('item-added', { item, totalItems: items.length });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new WorkingMemoryError(
        item.sessionId,
        'add',
        `Failed to add memory item: ${errorMessage}`,
        error instanceof Error ? error : undefined,
        {
          itemType: item.type,
          contentLength: item.content.length,
          hasMetadata: !!item.metadata
        }
      );
    }
  }
  
  /**
   * Retrieves working memory items for a session.
   * 
   * @param sessionId - Session identifier
   * @param options - Optional query options
   * @returns Promise resolving to array of memory items
   * @throws {WorkingMemoryError} If retrieval fails
   */
  async getItems(sessionId: string, options?: WorkingMemoryOptions): Promise<MemoryItem[]> {
    this.ensureInitialized();
    
    try {
      const items = await this.storage.getItems(sessionId, options);
      
      // Filter expired items if TTL is configured
      const now = new Date();
      const filteredItems = items.filter(item => {
        if (!this.config.ttl) return true;
        
        const itemAge = now.getTime() - item.timestamp.getTime();
        return itemAge < this.config.ttl;
      });
      
      return filteredItems;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new WorkingMemoryError(
        sessionId,
        'get',
        `Failed to retrieve memory items: ${errorMessage}`,
        error instanceof Error ? error : undefined,
        { queryOptions: options }
      );
    }
  }
  
  /**
   * Clears working memory for a session.
   * 
   * @param sessionId - Session identifier
   * @returns Promise that resolves when memory is cleared
   */
  async clearItems(sessionId: string): Promise<void> {
    this.ensureInitialized();
    
    try {
      await this.storage.removeItems(sessionId);
      
      // Clear session buffers
      const sessionBuffers = this.buffers.get(sessionId);
      if (sessionBuffers) {
        const buffers = Array.from(sessionBuffers.values());
        for (const buffer of buffers) {
          await buffer.clear();
        }
        this.buffers.delete(sessionId);
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new WorkingMemoryError(
        sessionId,
        'clear',
        `Failed to clear working memory: ${errorMessage}`,
        error instanceof Error ? error : undefined
      );
    }
  }
  
  /**
   * Creates a summary of working memory for a session.
   * 
   * Analyzes working memory items to create a comprehensive summary
   * including key points, topics, and enhanced metadata.
   * 
   * @param sessionId - Session identifier
   * @returns Promise resolving to memory summary
   * @throws {WorkingMemoryError} If summarization fails
   */
  async summarize(sessionId: string): Promise<MemorySummary> {
    this.ensureInitialized();
    
    try {
      const items = await this.getItems(sessionId);
      
      if (items.length === 0) {
        return this.createEmptySummary(sessionId);
      }
      
      // Basic statistics
      const stats = this.calculateBasicStats(items);
      
      // Extract key information
      const keyPoints = this.extractKeyPoints(items);
      const topics = this.extractTopics(items);
      const sentiment = this.analyzeSentiment(items);
      
      // Enhanced metadata for Flowise patterns
      const enhancedMetadata = this.calculateEnhancedMetadata(items);
      
      // Get current runtime state and form data
      const runtimeState = await this.getRuntimeState(sessionId);
      const formData = await this.getFormData(sessionId);
      
      return {
        sessionId,
        summary: this.generateSummaryText(items, keyPoints),
        keyPoints,
        topics,
        sentiment,
        metadata: {
          ...stats,
          ...enhancedMetadata,
          runtimeState,
          formData
        }
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new WorkingMemoryError(
        sessionId,
        'summarize',
        `Failed to summarize working memory: ${errorMessage}`,
        error instanceof Error ? error : undefined,
        { summarizationModel: this.config.summarizationModel }
      );
    }
  }
  
  /**
   * Sets runtime state for a session.
   * 
   * @param sessionId - Session identifier
   * @param state - Runtime state to set
   * @returns Promise that resolves when state is set
   */
  async setRuntimeState(sessionId: string, state: ICommonObject): Promise<void> {
    this.ensureInitialized();
    
    try {
      await this.storage.setRuntimeState(sessionId, state);
      this.emit('state-updated', { sessionId, state });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new RuntimeStateError(
        sessionId,
        'set',
        `Failed to set runtime state: ${errorMessage}`,
        error instanceof Error ? error : undefined,
        {
          stateKeys: Object.keys(state),
          stateSize: JSON.stringify(state).length
        }
      );
    }
  }
  
  /**
   * Gets runtime state for a session.
   * 
   * @param sessionId - Session identifier
   * @returns Promise resolving to runtime state
   */
  async getRuntimeState(sessionId: string): Promise<ICommonObject> {
    this.ensureInitialized();
    
    try {
      return await this.storage.getRuntimeState(sessionId);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new RuntimeStateError(
        sessionId,
        'get',
        `Failed to get runtime state: ${errorMessage}`,
        error instanceof Error ? error : undefined
      );
    }
  }
  
  /**
   * Updates runtime state with specific operations.
   * 
   * @param sessionId - Session identifier
   * @param updates - Array of state updates to apply
   * @returns Promise that resolves when updates are applied
   */
  async updateRuntimeState(sessionId: string, updates: StateUpdate[]): Promise<void> {
    this.ensureInitialized();
    
    try {
      const currentState = await this.getRuntimeState(sessionId);
      const newState = this.applyStateUpdates(currentState, updates);
      
      await this.setRuntimeState(sessionId, newState);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new RuntimeStateError(
        sessionId,
        'update',
        `Failed to update runtime state: ${errorMessage}`,
        error instanceof Error ? error : undefined,
        { updateCount: updates.length, operations: updates.map(u => u.operation) }
      );
    }
  }
  
  /**
   * Sets form data for a session.
   * 
   * @param sessionId - Session identifier
   * @param form - Form data to set
   * @returns Promise that resolves when form is set
   */
  async setFormData(sessionId: string, form: Record<string, any>): Promise<void> {
    this.ensureInitialized();
    
    try {
      await this.storage.setFormData(sessionId, form);
      this.emit('form-updated', { sessionId, form });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new FormDataError(
        sessionId,
        'set',
        `Failed to set form data: ${errorMessage}`,
        error instanceof Error ? error : undefined,
        {
          formFields: Object.keys(form),
          formSize: JSON.stringify(form).length
        }
      );
    }
  }
  
  /**
   * Gets form data for a session.
   * 
   * @param sessionId - Session identifier
   * @returns Promise resolving to form data
   */
  async getFormData(sessionId: string): Promise<Record<string, any>> {
    this.ensureInitialized();
    
    try {
      return await this.storage.getFormData(sessionId);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new FormDataError(
        sessionId,
        'get',
        `Failed to get form data: ${errorMessage}`,
        error instanceof Error ? error : undefined
      );
    }
  }
  
  /**
   * Creates or retrieves a memory buffer for a session.
   * 
   * @param sessionId - Session identifier
   * @param type - Buffer type to create/retrieve
   * @param config - Optional buffer configuration
   * @returns Memory buffer instance
   */
  async getOrCreateBuffer(sessionId: string, type: MemoryBufferType, config?: MemoryBufferConfig): Promise<IMemoryBuffer> {
    this.ensureInitialized();
    
    try {
      // Get or create session buffer map
      if (!this.buffers.has(sessionId)) {
        this.buffers.set(sessionId, new Map());
      }
      
      const sessionBuffers = this.buffers.get(sessionId)!;
      
      // Return existing buffer if found
      if (sessionBuffers.has(type)) {
        return sessionBuffers.get(type)!;
      }
      
      // Create new buffer
      const bufferConfig = config || this.config.bufferConfigs[type] || {};
      const buffer = this.createBuffer(sessionId, type, bufferConfig);
      
      sessionBuffers.set(type, buffer);
      
      return buffer;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new MemoryBufferError(
        sessionId,
        type,
        'create',
        `Failed to create memory buffer: ${errorMessage}`,
        error instanceof Error ? error : undefined,
        { bufferType: type, config }
      );
    }
  }
  
  /**
   * Gets context string for a session by combining buffer outputs.
   * 
   * @param sessionId - Session identifier
   * @param bufferTypes - Optional specific buffer types to include
   * @returns Promise resolving to context string
   */
  async getContext(sessionId: string, bufferTypes?: MemoryBufferType[]): Promise<string> {
    this.ensureInitialized();
    
    const types = bufferTypes || this.config.bufferTypes;
    const contexts: string[] = [];
    
    for (const type of types) {
      try {
        const buffer = await this.getOrCreateBuffer(sessionId, type);
        
        if (buffer.getContext) {
          const context = await buffer.getContext();
          if (context.trim()) {
            contexts.push(`[${type.toUpperCase()}]\n${context}`);
          }
        }
      } catch (error) {
        console.warn(`Failed to get context from ${type} buffer:`, error);
      }
    }
    
    return contexts.join('\n\n');
  }
  
  /**
   * Updates all buffers with a new memory item.
   * 
   * @param sessionId - Session identifier
   * @param item - Memory item to add to buffers
   * @private
   */
  private async updateBuffers(sessionId: string, item: MemoryItem): Promise<void> {
    const message: IMessage = {
      role: item.type as any,
      content: item.content,
      metadata: item.metadata
    };
    
    for (const bufferType of this.config.bufferTypes) {
      try {
        const buffer = await this.getOrCreateBuffer(sessionId, bufferType);
        await buffer.add(message);
      } catch (error) {
        console.warn(`Failed to update ${bufferType} buffer:`, error);
      }
    }
  }
  
  /**
   * Creates a memory buffer instance of the specified type.
   * 
   * @param sessionId - Session identifier
   * @param type - Buffer type to create
   * @param config - Buffer configuration
   * @returns Buffer instance
   * @private
   */
  private createBuffer(sessionId: string, type: MemoryBufferType, config: MemoryBufferConfig): IMemoryBuffer {
    const maxSize = config.maxSize || 50;
    
    switch (type) {
      case 'window':
        return new WindowBuffer(sessionId, maxSize);
        
      case 'summary':
        return new SummaryBuffer(
          sessionId,
          maxSize,
          config.summarizationThreshold || 30,
          config.summaryModel || this.config.summarizationModel
        );
        
      case 'conversation':
        return new ConversationBuffer(sessionId, maxSize);
        
      case 'working':
        return new WorkingBuffer(sessionId, maxSize);
        
      case 'episodic':
        return new EpisodicBuffer(sessionId, maxSize);
        
      default:
        throw new MemoryBufferError(
          sessionId,
          type,
          'create',
          `Unsupported buffer type: ${type}`,
          undefined,
          { supportedTypes: ['window', 'summary', 'conversation', 'working', 'episodic'] }
        );
    }
  }
  
  /**
   * Validates working memory configuration.
   * 
   * @throws {MemoryValidationError} If configuration is invalid
   * @private
   */
  private validateConfiguration(): void {
    if (!this.storage) {
      throw new MemoryValidationError(
        'working-memory',
        'Storage is required for working memory',
        'storage',
        this.storage
      );
    }
    
    if (this.config.maxItems < 1) {
      throw new MemoryValidationError(
        'working-memory',
        'Maximum items must be at least 1',
        'maxItems',
        this.config.maxItems
      );
    }
    
    if (this.config.compressionThreshold > this.config.maxItems) {
      throw new MemoryValidationError(
        'working-memory',
        'Compression threshold cannot exceed maximum items',
        'compressionThreshold',
        this.config.compressionThreshold
      );
    }
    
    if (this.config.ttl < 60000) {
      throw new MemoryValidationError(
        'working-memory',
        'TTL must be at least 1 minute',
        'ttl',
        this.config.ttl
      );
    }
  }
  
  /**
   * Validates a memory item before adding to working memory.
   * 
   * @param item - Memory item to validate
   * @throws {MemoryValidationError} If item is invalid
   * @private
   */
  private validateMemoryItem(item: MemoryItem): void {
    if (!item.sessionId) {
      throw new MemoryValidationError(
        'memory-item',
        'Session ID is required',
        'sessionId',
        item.sessionId
      );
    }
    
    if (!item.content || typeof item.content !== 'string') {
      throw new MemoryValidationError(
        'memory-item',
        'Content must be a non-empty string',
        'content',
        item.content
      );
    }
    
    if (!item.timestamp || !(item.timestamp instanceof Date)) {
      throw new MemoryValidationError(
        'memory-item',
        'Valid timestamp is required',
        'timestamp',
        item.timestamp
      );
    }
    
    const validTypes = ['user', 'assistant', 'system', 'tool', 'observation', 'human', 'reasoning'];
    if (!validTypes.includes(item.type)) {
      throw new MemoryValidationError(
        'memory-item',
        `Invalid item type. Must be one of: ${validTypes.join(', ')}`,
        'type',
        item.type,
        { validTypes }
      );
    }
  }
  
  /**
   * Calculates importance score for a memory item.
   * 
   * @param item - Memory item to score
   * @returns Importance score between 0 and 1
   * @private
   */
  private calculateImportance(item: MemoryItem): number {
    let importance = 0.5; // Base importance
    
    // Boost importance based on type
    const typeBoosts = {
      user: 0.8,
      assistant: 0.6,
      system: 0.3,
      tool: 0.4,
      observation: 0.5,
      human: 0.9,
      reasoning: 0.7
    };
    
    importance = typeBoosts[item.type] || 0.5;
    
    // Adjust based on content length (longer content may be more important)
    const lengthBoost = Math.min(item.content.length / 1000, 0.2);
    importance += lengthBoost;
    
    // Check for question marks (questions might be more important)
    if (item.content.includes('?')) {
      importance += 0.1;
    }
    
    // Check for exclamation marks (emphasis)
    if (item.content.includes('!')) {
      importance += 0.05;
    }
    
    // Check for metadata hints
    if (item.metadata?.humanInteraction) {
      importance += 0.2;
    }
    
    if (item.metadata?.toolCall) {
      importance += 0.1;
    }
    
    return Math.min(importance, 1.0);
  }
  
  /**
   * Applies state updates to current state.
   * 
   * @param currentState - Current runtime state
   * @param updates - Array of updates to apply
   * @returns Updated state
   * @private
   */
  private applyStateUpdates(currentState: ICommonObject, updates: StateUpdate[]): ICommonObject {
    const newState = { ...currentState };
    
    for (const update of updates) {
      switch (update.operation) {
        case 'set':
          newState[update.key] = update.value;
          break;
          
        case 'append':
          if (Array.isArray(newState[update.key])) {
            newState[update.key] = [...newState[update.key], update.value];
          } else {
            newState[update.key] = [update.value];
          }
          break;
          
        case 'merge':
          if (typeof newState[update.key] === 'object' && typeof update.value === 'object') {
            newState[update.key] = { ...newState[update.key], ...update.value };
          } else {
            newState[update.key] = update.value;
          }
          break;
          
        case 'delete':
          delete newState[update.key];
          break;
      }
    }
    
    return newState;
  }
  
  /**
   * Creates an empty summary for sessions with no items.
   * 
   * @param sessionId - Session identifier
   * @returns Empty memory summary
   * @private
   */
  private createEmptySummary(sessionId: string): MemorySummary {
    return {
      sessionId,
      summary: 'No conversation history available.',
      keyPoints: [],
      topics: [],
      sentiment: 'neutral',
      metadata: {
        itemCount: 0,
        tokenCount: 0,
        timespan: { start: new Date(), end: new Date() },
        executionCount: 0,
        agentInteractions: 0,
        humanInteractions: 0,
        toolUsage: {},
        runtimeState: {},
        formData: {}
      }
    };
  }
  
  /**
   * Calculates basic statistics from memory items.
   * 
   * @param items - Array of memory items
   * @returns Basic statistics
   * @private
   */
  private calculateBasicStats(items: MemoryItem[]): {
    itemCount: number;
    tokenCount: number;
    timespan: { start: Date; end: Date };
  } {
    if (items.length === 0) {
      const now = new Date();
      return {
        itemCount: 0,
        tokenCount: 0,
        timespan: { start: now, end: now }
      };
    }
    
    const timestamps = items.map(item => item.timestamp);
    const start = new Date(Math.min(...timestamps.map(t => t.getTime())));
    const end = new Date(Math.max(...timestamps.map(t => t.getTime())));
    
    const tokenCount = items.reduce((total, item) => {
      return total + (item.metadata?.tokens || Math.ceil(item.content.length / 4));
    }, 0);
    
    return {
      itemCount: items.length,
      tokenCount,
      timespan: { start, end }
    };
  }
  
  /**
   * Calculates enhanced metadata for Flowise patterns.
   * 
   * @param items - Array of memory items
   * @returns Enhanced metadata
   * @private
   */
  private calculateEnhancedMetadata(items: MemoryItem[]) {
    const executionCount = new Set(items.map(item => item.metadata?.executionId).filter(Boolean)).size;
    const agentInteractions = items.filter(item => item.metadata?.agentId).length;
    const humanInteractions = items.filter(item => item.metadata?.humanInteraction).length;
    
    const toolUsage: Record<string, number> = {};
    items.forEach(item => {
      if (item.metadata?.toolCall) {
        toolUsage[item.metadata.toolCall] = (toolUsage[item.metadata.toolCall] || 0) + 1;
      }
    });
    
    return {
      executionCount,
      agentInteractions,
      humanInteractions,
      toolUsage
    };
  }
  
  /**
   * Extracts key points from memory items.
   * 
   * @param items - Array of memory items
   * @returns Array of key points
   * @private
   */
  private extractKeyPoints(items: MemoryItem[]): string[] {
    // Simple key point extraction - in production, this would use NLP
    const keyPoints: string[] = [];
    
    // Look for questions
    items.forEach(item => {
      if (item.content.includes('?')) {
        const sentences = item.content.split(/[.!?]+/);
        const questions = sentences.filter(s => s.trim().includes('?'));
        keyPoints.push(...questions.map(q => q.trim()).filter(q => q.length > 10));
      }
    });
    
    // Look for important statements
    items.forEach(item => {
      if (item.metadata?.importance && item.metadata.importance > 0.7) {
        if (item.content.length < 200) {
          keyPoints.push(item.content.trim());
        }
      }
    });
    
    return keyPoints.slice(0, 10); // Limit to top 10
  }
  
  /**
   * Extracts topics from memory items.
   * 
   * @param items - Array of memory items
   * @returns Array of topics
   * @private
   */
  private extractTopics(items: MemoryItem[]): string[] {
    // Simple topic extraction - in production, this would use NLP
    const topics = new Set<string>();
    
    items.forEach(item => {
      if (item.metadata?.tags) {
        item.metadata.tags.forEach(tag => topics.add(tag));
      }
    });
    
    // Extract common terms (simplified)
    const commonTerms = ['machine learning', 'AI', 'data', 'analysis', 'model', 'training'];
    const content = items.map(item => item.content.toLowerCase()).join(' ');
    
    commonTerms.forEach(term => {
      if (content.includes(term)) {
        topics.add(term);
      }
    });
    
    return Array.from(topics).slice(0, 5);
  }
  
  /**
   * Analyzes sentiment from memory items.
   * 
   * @param items - Array of memory items
   * @returns Overall sentiment
   * @private
   */
  private analyzeSentiment(items: MemoryItem[]): 'positive' | 'neutral' | 'negative' {
    // Simple sentiment analysis - in production, this would use NLP
    let positiveCount = 0;
    let negativeCount = 0;
    
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'helpful'];
    const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'useless', 'frustrating'];
    
    items.forEach(item => {
      const content = item.content.toLowerCase();
      
      positiveWords.forEach(word => {
        if (content.includes(word)) positiveCount++;
      });
      
      negativeWords.forEach(word => {
        if (content.includes(word)) negativeCount++;
      });
    });
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }
  
  /**
   * Generates summary text from memory items and key points.
   * 
   * @param items - Array of memory items
   * @param keyPoints - Extracted key points
   * @returns Summary text
   * @private
   */
  private generateSummaryText(items: MemoryItem[], keyPoints: string[]): string {
    if (items.length === 0) {
      return 'No conversation history available.';
    }
    
    const userMessages = items.filter(item => item.type === 'user');
    const assistantMessages = items.filter(item => item.type === 'assistant');
    
    let summary = `Session contains ${items.length} memory items with ${userMessages.length} user messages and ${assistantMessages.length} assistant responses.`;
    
    if (keyPoints.length > 0) {
      summary += ` Key points discussed: ${keyPoints.slice(0, 3).join('; ')}.`;
    }
    
    // Add recent context
    const recentItems = items.slice(-3);
    if (recentItems.length > 0) {
      summary += ` Recent context: ${recentItems.map(item => `${item.type}: ${item.content.substring(0, 100)}`).join('; ')}.`;
    }
    
    return summary;
  }
  
  /**
   * Generates a unique item ID.
   * 
   * @returns Unique identifier
   * @private
   */
  private generateItemId(): string {
    return `item-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }
  
  /**
   * Starts automatic cleanup timer.
   * 
   * @private
   */
  private startAutoCleanup(): void {
    this.cleanupTimer = setInterval(async () => {
      try {
        await this.performCleanup();
      } catch (error) {
        console.error('Automatic cleanup failed:', error);
      }
    }, this.config.cleanupInterval) as NodeJS.Timeout;
  }
  
  /**
   * Performs cleanup of expired items and unused buffers.
   * 
   * @private
   */
  private async performCleanup(): Promise<void> {
    try {
      const sessionIds = await this.storage.getSessionIds();
      let totalCleaned = 0;
      
      for (const sessionId of sessionIds) {
        const items = await this.storage.getItems(sessionId);
        const now = new Date();
        
        const expiredItems = items.filter(item => {
          const itemAge = now.getTime() - item.timestamp.getTime();
          return itemAge > this.config.ttl;
        });
        
        if (expiredItems.length > 0) {
          const expiredIds = expiredItems.map(item => item.id!);
          await this.storage.removeItems(sessionId, expiredIds);
          totalCleaned += expiredItems.length;
        }
        
        // Clean up empty sessions
        const remainingItems = await this.storage.getItems(sessionId);
        if (remainingItems.length === 0) {
          await this.storage.clearSession(sessionId);
          this.buffers.delete(sessionId);
        }
      }
      
      this.emit('cleanup-completed', { itemsCleaned: totalCleaned });
      
    } catch (error) {
      console.error('Cleanup operation failed:', error);
    }
  }
  
  /**
   * Sets up error handling for the working memory instance.
   * 
   * @private
   */
  private setupErrorHandling(): void {
    this.on('error', (error) => {
      console.error('Working Memory Error:', error);
    });
  }
  
  /**
   * Ensures the working memory is initialized.
   * 
   * @throws {WorkingMemoryError} If not initialized
   * @private
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new WorkingMemoryError(
        'system',
        'check-initialization',
        'Working memory has not been initialized. Call initialize() first.',
        undefined,
        { initialized: this.initialized }
      );
    }
  }
}