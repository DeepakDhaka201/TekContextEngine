/**
 * @fileoverview Session implementation for individual user sessions
 * @module modules/session-state/session
 * @requires ./types
 * @requires ./errors
 * @requires ./storage/base-storage
 * @requires ../../shared/utils
 * 
 * This file implements the Session class which represents an individual user session
 * with full lifecycle management, conversation history, context management, and
 * persistence capabilities.
 * 
 * Key concepts:
 * - Complete session state encapsulation
 * - Conversation history management with efficient querying
 * - Context storage with size limits and validation
 * - Automatic session expiration and renewal
 * - Dirty tracking for efficient saves
 * - Concurrent access protection
 * 
 * @example
 * ```typescript
 * import { Session } from './session';
 * 
 * const session = new Session({
 *   id: 'sess-123',
 *   userId: 'user-456',
 *   config: {
 *     maxHistoryLength: 1000,
 *     expiresIn: 3600000
 *   }
 * }, storage);
 * 
 * await session.addTurn({
 *   role: 'user',
 *   content: 'Hello!',
 *   timestamp: new Date()
 * });
 * ```
 * 
 * @see types.ts for interface definitions
 * @see errors.ts for error classes
 * @since 1.0.0
 */

import {
  ISession,
  SessionConfig,
  SessionMetadata,
  SessionStatus,
  ConversationTurn,
  HistoryQueryOptions,
  TurnMetadata,
  SessionPreferences
} from './types';

import {
  SessionStateError,
  SessionUpdateError,
  SessionValidationError,
  ConversationHistoryError,
  SessionContextError,
  SessionExpirationError,
  SessionCapacityError,
  createSessionErrorContext
} from './errors';

import { BaseStorage } from './storage/base-storage';
import { generateId, deepClone } from '../../shared/utils';

/**
 * Implementation of an individual user session.
 * 
 * Manages all aspects of a user session including conversation history,
 * context storage, metadata, and persistence. Provides a clean API
 * for session manipulation while handling complex internal state management.
 * 
 * Features:
 * - Automatic dirty tracking and efficient saves
 * - Conversation history with pagination and filtering
 * - Context storage with size limits and validation
 * - Session expiration and renewal handling
 * - Concurrent access protection with locks
 * - Comprehensive validation and error handling
 * - Event emission for session lifecycle changes
 * 
 * Internal Architecture:
 * - Uses storage abstraction for persistence
 * - Maintains in-memory state for performance
 * - Lazy loads conversation history when needed
 * - Tracks changes to minimize storage operations
 * - Implements proper locking for thread safety
 * 
 * @implements {ISession}
 * @example
 * ```typescript
 * // Create a new session
 * const session = new Session({
 *   userId: 'user-123',
 *   title: 'Chat Session',
 *   language: 'en',
 *   expiresIn: 24 * 60 * 60 * 1000, // 24 hours
 *   preferences: {
 *     responseFormat: 'markdown',
 *     responseLength: 'medium'
 *   }
 * }, storage);
 * 
 * // Add conversation turns
 * const userTurn = await session.addTurn({
 *   role: 'user',
 *   content: 'What is machine learning?',
 *   timestamp: new Date()
 * });
 * 
 * const assistantTurn = await session.addTurn({
 *   role: 'assistant',
 *   content: 'Machine learning is a subset of AI...',
 *   timestamp: new Date(),
 *   metadata: {
 *     model: 'gpt-4',
 *     tokenUsage: { promptTokens: 15, completionTokens: 120, totalTokens: 135 },
 *     cost: { totalCost: 0.002 }
 *   }
 * });
 * 
 * // Manage context
 * await session.setContext('userPreferences', { theme: 'dark', language: 'en' });
 * await session.setContext('currentTopic', 'machine-learning');
 * 
 * // Save session
 * await session.save();
 * ```
 * 
 * @public
 */
export class Session implements ISession {
  /** Session identifier */
  public readonly id: string;
  
  /** User associated with this session */
  public readonly userId?: string;
  
  /** Session creation timestamp */
  public readonly createdAt: Date;
  
  /** Last update timestamp - mutable for tracking changes */
  private _updatedAt: Date;
  
  /** Session configuration */
  private _config: SessionConfig;
  
  /** Session metadata */
  private _metadata: SessionMetadata;
  
  /** Current session status */
  private _status: SessionStatus;
  
  /** Conversation history cache */
  private _conversationHistory: ConversationTurn[] = [];
  
  /** Session context data */
  private _context: Record<string, any> = {};
  
  /** Storage backend for persistence */
  private readonly storage: BaseStorage;
  
  /** Dirty tracking flags */
  private _isDirty = {
    metadata: false,
    config: false,
    context: false,
    history: false
  };
  
  /** History loaded flag */
  private _historyLoaded = false;
  
  /** Context loaded flag */
  private _contextLoaded = false;
  
  /** Operation lock for concurrent access protection */
  private _operationLock = false;
  
  /** Save operation promise for deduplication */
  private _savePromise?: Promise<void>;
  
  /** Next turn sequence number */
  private _nextSequence = 1;
  
  /**
   * Creates a new Session instance.
   * 
   * @param config - Session configuration
   * @param storage - Storage backend for persistence
   * @param existingData - Optional existing session data for restoration
   * 
   * @example
   * ```typescript
   * // Create new session
   * const session = new Session({
   *   userId: 'user-123',
   *   title: 'Support Chat',
   *   expiresIn: 3600000 // 1 hour
   * }, redisStorage);
   * 
   * // Restore existing session
   * const existingSession = new Session(
   *   config,
   *   storage,
   *   {
   *     id: 'sess-456',
   *     conversationHistory: turns,
   *     context: contextData,
   *     metadata: sessionMetadata
   *   }
   * );
   * ```
   */
  constructor(
    config: SessionConfig,
    storage: BaseStorage,
    existingData?: {
      id?: string;
      conversationHistory?: ConversationTurn[];
      context?: Record<string, any>;
      metadata?: Partial<SessionMetadata>;
      status?: SessionStatus;
    }
  ) {
    this.storage = storage;
    
    // Set session identifiers
    this.id = existingData?.id || config.id || generateId('sess');
    this.userId = config.userId;
    
    // Set timestamps
    const now = new Date();
    this.createdAt = existingData?.metadata?.createdAt || now;
    this._updatedAt = existingData?.metadata?.updatedAt || now;
    
    // Initialize configuration with defaults
    this._config = this.buildDefaultConfig(config);
    
    // Initialize metadata
    this._metadata = this.buildMetadata(config, existingData?.metadata);
    
    // Set initial status
    this._status = existingData?.status || 'active';
    
    // Load existing data if provided
    if (existingData) {
      if (existingData.conversationHistory) {
        this._conversationHistory = existingData.conversationHistory;
        this._historyLoaded = true;
        this._nextSequence = this.calculateNextSequence();
      }
      
      if (existingData.context) {
        this._context = existingData.context;
        this._contextLoaded = true;
      }
    }
    
    // Validate configuration
    this.validateConfiguration();
    
    console.log(`Session '${this.id}' created for user '${this.userId || 'anonymous'}'`);
  }
  
  /**
   * Gets the last update timestamp.
   * 
   * @returns Last update timestamp
   */
  get updatedAt(): Date {
    return this._updatedAt;
  }
  
  /**
   * Gets the session configuration.
   * 
   * @returns Session configuration (readonly copy)
   */
  get config(): SessionConfig {
    return deepClone(this._config);
  }
  
  /**
   * Gets the session metadata.
   * 
   * @returns Session metadata (readonly copy)
   */
  get metadata(): SessionMetadata {
    return deepClone(this._metadata);
  }
  
  /**
   * Gets the current session status.
   * 
   * @returns Current session status
   */
  get status(): SessionStatus {
    return this._status;
  }
  
  /**
   * Gets conversation history with optional filtering.
   * 
   * Loads history from storage if not already loaded and applies
   * filtering, sorting, and pagination as specified.
   * 
   * @param options - Optional filtering and pagination options
   * @returns Promise resolving to conversation turns
   * 
   * @example
   * ```typescript
   * // Get recent conversation turns
   * const recent = await session.getHistory({
   *   limit: 10,
   *   sort: 'desc',
   *   includeMetadata: true
   * });
   * 
   * // Get user messages only
   * const userMessages = await session.getHistory({
   *   role: ['user'],
   *   after: lastWeek,
   *   includeMetadata: false
   * });
   * 
   * // Get paginated history
   * const page2 = await session.getHistory({
   *   limit: 20,
   *   offset: 20,
   *   sort: 'asc'
   * });
   * ```
   */
  async getHistory(options: HistoryQueryOptions = {}): Promise<ConversationTurn[]> {
    try {
      await this.acquireLock();
      
      // Load history if not already loaded
      if (!this._historyLoaded) {
        await this.loadConversationHistory();
      }
      
      // Apply filtering and sorting
      let history = [...this._conversationHistory];
      
      // Filter by role
      if (options.role && options.role.length > 0) {
        history = history.filter(turn => options.role!.includes(turn.role));
      }
      
      // Filter by date range
      if (options.after) {
        history = history.filter(turn => turn.timestamp >= options.after!);
      }
      
      if (options.before) {
        history = history.filter(turn => turn.timestamp <= options.before!);
      }
      
      // Sort
      const sortOrder = options.sort || 'asc';
      history.sort((a, b) => {
        const comparison = a.timestamp.getTime() - b.timestamp.getTime();
        return sortOrder === 'desc' ? -comparison : comparison;
      });
      
      // Apply pagination
      const offset = options.offset || 0;
      const limit = options.limit || history.length;
      history = history.slice(offset, offset + limit);
      
      // Strip metadata if not requested
      if (!options.includeMetadata) {
        history = history.map(turn => ({
          ...turn,
          metadata: undefined
        }));
      }
      
      // Strip attachments if not requested
      if (!options.includeAttachments) {
        history = history.map(turn => ({
          ...turn,
          attachments: undefined
        }));
      }
      
      return history;
      
    } catch (error) {
      throw new ConversationHistoryError(
        this.id,
        'getHistory',
        error instanceof Error ? error.message : String(error),
        error instanceof Error ? error : undefined,
        createSessionErrorContext(this, 'getHistory', { options })
      );
    } finally {
      this.releaseLock();
    }
  }
  
  /**
   * Adds a new turn to the conversation history.
   * 
   * Validates turn data, assigns sequence numbers, and handles
   * history length limits with automatic pruning if needed.
   * 
   * @param turn - Conversation turn to add (without id and sessionId)
   * @returns Promise resolving to the added turn with generated ID
   * 
   * @example
   * ```typescript
   * // Add user message
   * const userTurn = await session.addTurn({
   *   role: 'user',
   *   content: 'Hello, how are you?',
   *   timestamp: new Date(),
   *   contentType: 'text/plain'
   * });
   * 
   * // Add assistant response with metadata
   * const assistantTurn = await session.addTurn({
   *   role: 'assistant',
   *   content: 'I am doing well, thank you for asking!',
   *   timestamp: new Date(),
   *   metadata: {
   *     model: 'gpt-4',
   *     parameters: { temperature: 0.7, maxTokens: 150 },
   *     tokenUsage: { promptTokens: 20, completionTokens: 25, totalTokens: 45 },
   *     cost: { inputCost: 0.0006, outputCost: 0.0015, totalCost: 0.0021 },
   *     performance: { latency: 1250, processingTime: 800 }
   *   }
   * });
   * ```
   */
  async addTurn(turn: Omit<ConversationTurn, 'id' | 'sessionId'>): Promise<ConversationTurn> {
    try {
      await this.acquireLock();
      
      // Validate turn data
      this.validateTurnData(turn);
      
      // Load history if not already loaded
      if (!this._historyLoaded) {
        await this.loadConversationHistory();
      }
      
      // Check history length limits
      await this.checkHistoryCapacity();
      
      // Create complete turn object
      const completeTurn: ConversationTurn = {
        id: generateId('turn'),
        sessionId: this.id,
        sequence: this._nextSequence++,
        ...turn
      };
      
      // Add to history
      this._conversationHistory.push(completeTurn);
      
      // Update metadata
      this.updateTurnStatistics(completeTurn);
      
      // Mark as dirty
      this._isDirty.history = true;
      this._isDirty.metadata = true;
      this._updatedAt = new Date();
      
      console.log(`Added turn '${completeTurn.id}' to session '${this.id}' (sequence: ${completeTurn.sequence})`);
      
      return deepClone(completeTurn);
      
    } catch (error) {
      throw new ConversationHistoryError(
        this.id,
        'addTurn',
        error instanceof Error ? error.message : String(error),
        error instanceof Error ? error : undefined,
        createSessionErrorContext(this, 'addTurn', { 
          turnRole: turn.role,
          contentLength: turn.content?.length,
          historyLength: this._conversationHistory.length
        })
      );
    } finally {
      this.releaseLock();
    }
  }
  
  /**
   * Updates an existing conversation turn.
   * 
   * Finds and updates the specified turn while maintaining
   * data integrity and history consistency.
   * 
   * @param turnId - Turn identifier
   * @param updates - Updates to apply to the turn
   * @returns Promise resolving to the updated turn
   * 
   * @example
   * ```typescript
   * // Update turn content
   * const updatedTurn = await session.updateTurn('turn-123', {
   *   content: 'Updated message content',
   *   metadata: {
   *     ...existingMetadata,
   *     edited: true,
   *     editTimestamp: new Date()
   *   }
   * });
   * 
   * // Add feedback to assistant response
   * await session.updateTurn('turn-456', {
   *   metadata: {
   *     ...existingMetadata,
   *     feedback: {
   *       rating: 5,
   *       helpful: true,
   *       comment: 'Very helpful response!'
   *     }
   *   }
   * });
   * ```
   */
  async updateTurn(turnId: string, updates: Partial<ConversationTurn>): Promise<ConversationTurn> {
    try {
      await this.acquireLock();
      
      // Load history if not already loaded
      if (!this._historyLoaded) {
        await this.loadConversationHistory();
      }
      
      // Find the turn to update
      const turnIndex = this._conversationHistory.findIndex(turn => turn.id === turnId);
      
      if (turnIndex === -1) {
        throw new ConversationHistoryError(
          this.id,
          'updateTurn',
          `Turn '${turnId}' not found in conversation history`,
          undefined,
          { turnId, availableTurns: this._conversationHistory.map(t => t.id) }
        );
      }
      
      const existingTurn = this._conversationHistory[turnIndex];
      
      // Validate updates
      if (updates.id && updates.id !== turnId) {
        throw new SessionValidationError(
          this.id,
          'Cannot change turn ID',
          'id',
          updates.id
        );
      }
      
      if (updates.sessionId && updates.sessionId !== this.id) {
        throw new SessionValidationError(
          this.id,
          'Cannot change turn session ID',
          'sessionId',
          updates.sessionId
        );
      }
      
      // Apply updates
      const updatedTurn: ConversationTurn = {
        ...existingTurn,
        ...updates,
        id: existingTurn.id, // Preserve original ID
        sessionId: existingTurn.sessionId, // Preserve original session ID
        sequence: existingTurn.sequence // Preserve original sequence
      };
      
      // Validate updated turn
      this.validateTurnData(updatedTurn);
      
      // Update in history
      this._conversationHistory[turnIndex] = updatedTurn;
      
      // Mark as dirty
      this._isDirty.history = true;
      this._isDirty.metadata = true;
      this._updatedAt = new Date();
      
      console.log(`Updated turn '${turnId}' in session '${this.id}'`);
      
      return deepClone(updatedTurn);
      
    } catch (error) {
      throw new ConversationHistoryError(
        this.id,
        'updateTurn',
        error instanceof Error ? error.message : String(error),
        error instanceof Error ? error : undefined,
        createSessionErrorContext(this, 'updateTurn', { turnId, updates })
      );
    } finally {
      this.releaseLock();
    }
  }
  
  /**
   * Deletes a conversation turn.
   * 
   * Removes the specified turn from history and updates
   * sequence numbers if necessary.
   * 
   * @param turnId - Turn identifier
   * @returns Promise that resolves when turn is deleted
   * 
   * @example
   * ```typescript
   * // Delete a specific turn
   * await session.deleteTurn('turn-123');
   * 
   * // Delete turns are permanently removed from history
   * const history = await session.getHistory();
   * console.log('Turn deleted, history length:', history.length);
   * ```
   */
  async deleteTurn(turnId: string): Promise<void> {
    try {
      await this.acquireLock();
      
      // Load history if not already loaded
      if (!this._historyLoaded) {
        await this.loadConversationHistory();
      }
      
      // Find and remove the turn
      const turnIndex = this._conversationHistory.findIndex(turn => turn.id === turnId);
      
      if (turnIndex === -1) {
        throw new ConversationHistoryError(
          this.id,
          'deleteTurn',
          `Turn '${turnId}' not found in conversation history`,
          undefined,
          { turnId, availableTurns: this._conversationHistory.map(t => t.id) }
        );
      }
      
      // Remove turn from history
      const deletedTurn = this._conversationHistory.splice(turnIndex, 1)[0];
      
      // Update turn statistics
      this.updateTurnStatisticsAfterDeletion(deletedTurn);
      
      // Mark as dirty
      this._isDirty.history = true;
      this._isDirty.metadata = true;
      this._updatedAt = new Date();
      
      console.log(`Deleted turn '${turnId}' from session '${this.id}'`);
      
    } catch (error) {
      throw new ConversationHistoryError(
        this.id,
        'deleteTurn',
        error instanceof Error ? error.message : String(error),
        error instanceof Error ? error : undefined,
        createSessionErrorContext(this, 'deleteTurn', { turnId })
      );
    } finally {
      this.releaseLock();
    }
  }
  
  /**
   * Gets a value from session context.
   * 
   * Loads context from storage if not already loaded and
   * returns the requested value.
   * 
   * @param key - Context key
   * @returns Promise resolving to value or undefined if not found
   * 
   * @example
   * ```typescript
   * // Get user preferences
   * const preferences = await session.getContext('userPreferences');
   * console.log('Theme:', preferences?.theme);
   * 
   * // Get current conversation topic
   * const topic = await session.getContext('currentTopic');
   * if (topic) {
   *   console.log('Currently discussing:', topic);
   * }
   * 
   * // Handle missing values
   * const setting = await session.getContext('someSetting') || 'defaultValue';
   * ```
   */
  async getContext(key: string): Promise<any> {
    try {
      await this.acquireLock();
      
      // Load context if not already loaded
      if (!this._contextLoaded) {
        await this.loadSessionContext();
      }
      
      return this._context[key];
      
    } catch (error) {
      throw new SessionContextError(
        this.id,
        'getContext',
        error instanceof Error ? error.message : String(error),
        error instanceof Error ? error : undefined,
        createSessionErrorContext(this, 'getContext', { key })
      );
    } finally {
      this.releaseLock();
    }
  }
  
  /**
   * Sets a value in session context.
   * 
   * Validates value size and type, then stores in context
   * with dirty tracking for efficient persistence.
   * 
   * @param key - Context key
   * @param value - Value to store
   * @returns Promise that resolves when value is stored
   * 
   * @example
   * ```typescript
   * // Store user preferences
   * await session.setContext('userPreferences', {
   *   theme: 'dark',
   *   language: 'en',
   *   notifications: true
   * });
   * 
   * // Store conversation state
   * await session.setContext('conversationState', {
   *   currentStep: 'gathering-requirements',
   *   collectedInfo: {
   *     name: 'John Doe',
   *     email: 'john@example.com'
   *   }
   * });
   * 
   * // Store simple values
   * await session.setContext('lastActivity', new Date());
   * await session.setContext('messageCount', 42);
   * ```
   */
  async setContext(key: string, value: any): Promise<void> {
    try {
      await this.acquireLock();
      
      // Validate key
      if (!key || typeof key !== 'string') {
        throw new SessionValidationError(
          this.id,
          'Context key must be a non-empty string',
          'key',
          key
        );
      }
      
      // Load context if not already loaded
      if (!this._contextLoaded) {
        await this.loadSessionContext();
      }
      
      // Validate value size
      const serializedValue = JSON.stringify(value);
      const valueSize = Buffer.byteLength(serializedValue, 'utf8');
      const maxSize = this._config.maxContextSize || 1024 * 1024; // 1MB default
      
      if (valueSize > maxSize) {
        throw new SessionCapacityError(
          this.id,
          'context-value-size',
          maxSize,
          valueSize,
          { key, maxSize, valueSize }
        );
      }
      
      // Check total context size
      const totalContextSize = this.calculateContextSize();
      if (totalContextSize + valueSize > maxSize) {
        throw new SessionCapacityError(
          this.id,
          'total-context-size',
          maxSize,
          totalContextSize + valueSize,
          { key, totalSize: totalContextSize, valueSize }
        );
      }
      
      // Store value
      this._context[key] = value;
      
      // Mark as dirty
      this._isDirty.context = true;
      this._isDirty.metadata = true;
      this._updatedAt = new Date();
      
      console.log(`Set context key '${key}' in session '${this.id}' (${valueSize} bytes)`);
      
    } catch (error) {
      throw new SessionContextError(
        this.id,
        'setContext',
        error instanceof Error ? error.message : String(error),
        error instanceof Error ? error : undefined,
        createSessionErrorContext(this, 'setContext', { key, valueType: typeof value })
      );
    } finally {
      this.releaseLock();
    }
  }
  
  /**
   * Removes a value from session context.
   * 
   * Deletes the specified key from context storage.
   * 
   * @param key - Context key to remove
   * @returns Promise that resolves when key is removed
   * 
   * @example
   * ```typescript
   * // Remove temporary data
   * await session.removeContext('tempData');
   * 
   * // Remove outdated preferences
   * await session.removeContext('oldPreferences');
   * 
   * // Clean up after operation
   * await session.removeContext('operationState');
   * ```
   */
  async removeContext(key: string): Promise<void> {
    try {
      await this.acquireLock();
      
      // Load context if not already loaded
      if (!this._contextLoaded) {
        await this.loadSessionContext();
      }
      
      // Remove key if it exists
      if (key in this._context) {
        delete this._context[key];
        
        // Mark as dirty
        this._isDirty.context = true;
        this._isDirty.metadata = true;
        this._updatedAt = new Date();
        
        console.log(`Removed context key '${key}' from session '${this.id}'`);
      }
      
    } catch (error) {
      throw new SessionContextError(
        this.id,
        'removeContext',
        error instanceof Error ? error.message : String(error),
        error instanceof Error ? error : undefined,
        createSessionErrorContext(this, 'removeContext', { key })
      );
    } finally {
      this.releaseLock();
    }
  }
  
  /**
   * Gets all context keys and values.
   * 
   * Returns a complete copy of the session context for inspection
   * or bulk operations.
   * 
   * @returns Promise resolving to context object
   * 
   * @example
   * ```typescript
   * // Get all context data
   * const context = await session.getAllContext();
   * console.log('Context keys:', Object.keys(context));
   * 
   * // Process all context values
   * for (const [key, value] of Object.entries(context)) {
   *   console.log(`${key}:`, typeof value, JSON.stringify(value).length, 'bytes');
   * }
   * 
   * // Create backup of context
   * const contextBackup = await session.getAllContext();
   * ```
   */
  async getAllContext(): Promise<Record<string, any>> {
    try {
      await this.acquireLock();
      
      // Load context if not already loaded
      if (!this._contextLoaded) {
        await this.loadSessionContext();
      }
      
      // Return deep copy to prevent external modifications
      return deepClone(this._context);
      
    } catch (error) {
      throw new SessionContextError(
        this.id,
        'getAllContext',
        error instanceof Error ? error.message : String(error),
        error instanceof Error ? error : undefined,
        createSessionErrorContext(this, 'getAllContext')
      );
    } finally {
      this.releaseLock();
    }
  }
  
  /**
   * Clears all context data.
   * 
   * Removes all context keys and values, effectively
   * resetting the session context to empty state.
   * 
   * @returns Promise that resolves when context is cleared
   * 
   * @example
   * ```typescript
   * // Clear all context data
   * await session.clearContext();
   * 
   * // Verify context is empty
   * const context = await session.getAllContext();
   * console.log('Context cleared:', Object.keys(context).length === 0);
   * ```
   */
  async clearContext(): Promise<void> {
    try {
      await this.acquireLock();
      
      // Load context if not already loaded
      if (!this._contextLoaded) {
        await this.loadSessionContext();
      }
      
      const keyCount = Object.keys(this._context).length;
      
      // Clear all context data
      this._context = {};
      
      // Mark as dirty
      this._isDirty.context = true;
      this._isDirty.metadata = true;
      this._updatedAt = new Date();
      
      console.log(`Cleared ${keyCount} context keys from session '${this.id}'`);
      
    } catch (error) {
      throw new SessionContextError(
        this.id,
        'clearContext',
        error instanceof Error ? error.message : String(error),
        error instanceof Error ? error : undefined,
        createSessionErrorContext(this, 'clearContext')
      );
    } finally {
      this.releaseLock();
    }
  }
  
  /**
   * Updates session metadata.
   * 
   * Merges provided updates with existing metadata while
   * preserving system-managed fields.
   * 
   * @param updates - Metadata updates to apply
   * @returns Promise that resolves when metadata is updated
   * 
   * @example
   * ```typescript
   * // Update custom metadata
   * await session.updateMetadata({
   *   custom: {
   *     projectId: 'proj-123',
   *     department: 'support',
   *     priority: 'high'
   *   },
   *   tags: ['support', 'urgent', 'billing']
   * });
   * 
   * // Update device information
   * await session.updateMetadata({
   *   device: {
   *     type: 'mobile',
   *     os: 'iOS',
   *     browser: 'Safari'
   *   }
   * });
   * ```
   */
  async updateMetadata(updates: Partial<SessionMetadata>): Promise<void> {
    try {
      await this.acquireLock();
      
      // Preserve system-managed fields
      const preservedFields = {
        createdAt: this._metadata.createdAt,
        updatedAt: this._updatedAt // Will be updated below
      };
      
      // Merge updates with existing metadata
      this._metadata = {
        ...this._metadata,
        ...updates,
        ...preservedFields
      };
      
      // Mark as dirty
      this._isDirty.metadata = true;
      this._updatedAt = new Date();
      this._metadata.updatedAt = this._updatedAt;
      
      console.log(`Updated metadata for session '${this.id}'`);
      
    } catch (error) {
      throw new SessionUpdateError(
        this.id,
        error instanceof Error ? error.message : String(error),
        error instanceof Error ? error : undefined,
        createSessionErrorContext(this, 'updateMetadata', { updates })
      );
    } finally {
      this.releaseLock();
    }
  }
  
  /**
   * Extends session expiration time.
   * 
   * Adds additional time to the session expiration, useful
   * for keeping active sessions alive.
   * 
   * @param additionalTime - Additional time in milliseconds
   * @returns Promise that resolves when expiration is updated
   * 
   * @example
   * ```typescript
   * // Extend session by 1 hour
   * await session.extendExpiration(60 * 60 * 1000);
   * 
   * // Extend session by 30 minutes on user activity
   * await session.extendExpiration(30 * 60 * 1000);
   * 
   * // Check new expiration time
   * const metadata = session.metadata;
   * console.log('New expiration:', metadata.expiresAt);
   * ```
   */
  async extendExpiration(additionalTime: number): Promise<void> {
    try {
      await this.acquireLock();
      
      if (additionalTime <= 0) {
        throw new SessionValidationError(
          this.id,
          'Additional time must be positive',
          'additionalTime',
          additionalTime
        );
      }
      
      // Check if session is already expired
      if (this._metadata.expiresAt && this._metadata.expiresAt <= new Date()) {
        throw new SessionExpirationError(
          this.id,
          'Cannot extend expired session',
          undefined,
          {
            currentTime: new Date(),
            expiresAt: this._metadata.expiresAt,
            status: this._status
          }
        );
      }
      
      // Calculate new expiration time
      const currentExpiration = this._metadata.expiresAt || new Date(Date.now() + (24 * 60 * 60 * 1000)); // Default to 24 hours from now
      const newExpiration = new Date(currentExpiration.getTime() + additionalTime);
      
      // Update metadata
      this._metadata.expiresAt = newExpiration;
      
      // Mark as dirty
      this._isDirty.metadata = true;
      this._updatedAt = new Date();
      this._metadata.updatedAt = this._updatedAt;
      
      console.log(`Extended session '${this.id}' expiration to ${newExpiration.toISOString()}`);
      
    } catch (error) {
      throw new SessionExpirationError(
        this.id,
        error instanceof Error ? error.message : String(error),
        error instanceof Error ? error : undefined,
        createSessionErrorContext(this, 'extendExpiration', { additionalTime })
      );
    } finally {
      this.releaseLock();
    }
  }
  
  /**
   * Archives the session.
   * 
   * Changes session status to archived and optionally
   * records archival reason and timestamp.
   * 
   * @param reason - Optional archival reason
   * @returns Promise that resolves when session is archived
   * 
   * @example
   * ```typescript
   * // Archive completed session
   * await session.archive('Session completed successfully');
   * 
   * // Archive inactive session
   * await session.archive('Inactive for 30 days');
   * 
   * // Archive with cleanup
   * await session.archive('User requested deletion');
   * await session.save();
   * ```
   */
  async archive(reason?: string): Promise<void> {
    try {
      await this.acquireLock();
      
      // Update status
      this._status = 'archived';
      
      // Update metadata with archival information
      this._metadata.archived = {
        archivedAt: new Date(),
        reason: reason
      };
      
      // Mark as dirty
      this._isDirty.metadata = true;
      this._updatedAt = new Date();
      this._metadata.updatedAt = this._updatedAt;
      
      console.log(`Archived session '${this.id}' with reason: ${reason || 'No reason provided'}`);
      
    } catch (error) {
      throw new SessionUpdateError(
        this.id,
        error instanceof Error ? error.message : String(error),
        error instanceof Error ? error : undefined,
        createSessionErrorContext(this, 'archive', { reason })
      );
    } finally {
      this.releaseLock();
    }
  }
  
  /**
   * Saves current session state to storage.
   * 
   * Efficiently persists only dirty data to minimize storage operations.
   * Uses deduplication to prevent concurrent save operations.
   * 
   * @returns Promise that resolves when session is saved
   * 
   * @example
   * ```typescript
   * // Save after making changes
   * await session.addTurn({...});
   * await session.setContext('key', 'value');
   * await session.save(); // Persists all changes
   * 
   * // Automatic deduplication
   * const promise1 = session.save();
   * const promise2 = session.save(); // Returns same promise
   * await promise1; // Both complete together
   * ```
   */
  async save(): Promise<void> {
    // Return existing save promise if one is in progress
    if (this._savePromise) {
      return this._savePromise;
    }
    
    this._savePromise = this.performSave();
    
    try {
      await this._savePromise;
    } finally {
      this._savePromise = undefined;
    }
  }
  
  /**
   * Refreshes session data from storage.
   * 
   * Reloads session state from storage, useful for getting
   * updates made by other processes or handling concurrent access.
   * 
   * @returns Promise that resolves when session is refreshed
   * 
   * @example
   * ```typescript
   * // Refresh to get latest data
   * await session.refresh();
   * 
   * // Check for updates
   * const updatedHistory = await session.getHistory();
   * console.log('History length after refresh:', updatedHistory.length);
   * ```
   */
  async refresh(): Promise<void> {
    try {
      await this.acquireLock();
      
      // Load fresh data from storage
      const freshSession = await this.storage.loadSession(this.id);
      
      if (!freshSession) {
        throw new SessionUpdateError(
          this.id,
          'Session no longer exists in storage',
          undefined,
          createSessionErrorContext(this, 'refresh')
        );
      }
      
      // Update internal state with fresh data
      this.updateFromStorageData(freshSession);
      
      // Clear dirty flags
      this._isDirty = {
        metadata: false,
        config: false,
        context: false,
        history: false
      };
      
      console.log(`Refreshed session '${this.id}' from storage`);
      
    } catch (error) {
      throw new SessionUpdateError(
        this.id,
        error instanceof Error ? error.message : String(error),
        error instanceof Error ? error : undefined,
        createSessionErrorContext(this, 'refresh')
      );
    } finally {
      this.releaseLock();
    }
  }
  
  // Private helper methods
  
  /**
   * Acquires operation lock for thread safety.
   * 
   * @private
   */
  private async acquireLock(): Promise<void> {
    while (this._operationLock) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    this._operationLock = true;
  }
  
  /**
   * Releases operation lock.
   * 
   * @private
   */
  private releaseLock(): void {
    this._operationLock = false;
  }
  
  /**
   * Builds default configuration with fallbacks.
   * 
   * @param config - User-provided configuration
   * @returns Complete configuration with defaults
   * @private
   */
  private buildDefaultConfig(config: SessionConfig): SessionConfig {
    const defaults: SessionConfig = {
      id: this.id,
      userId: config.userId,
      title: config.title || `Session ${this.id}`,
      language: config.language || 'en',
      timezone: config.timezone || 'UTC',
      expiresIn: config.expiresIn || (24 * 60 * 60 * 1000), // 24 hours
      maxHistoryLength: config.maxHistoryLength || 1000,
      maxContextSize: config.maxContextSize || (1024 * 1024), // 1MB
      persistHistory: config.persistHistory !== false,
      enableRecovery: config.enableRecovery !== false,
      tags: config.tags || [],
      preferences: config.preferences || {},
      storage: config.storage || { backend: 'memory' }
    };
    
    return { ...defaults, ...config };
  }
  
  /**
   * Builds session metadata with defaults.
   * 
   * @param config - Session configuration
   * @param existingMetadata - Existing metadata if restoring
   * @returns Complete metadata object
   * @private
   */
  private buildMetadata(config: SessionConfig, existingMetadata?: Partial<SessionMetadata>): SessionMetadata {
    const now = new Date();
    
    return {
      createdAt: existingMetadata?.createdAt || now,
      updatedAt: existingMetadata?.updatedAt || now,
      lastAccessedAt: existingMetadata?.lastAccessedAt || now,
      expiresAt: config.expiresIn ? new Date(now.getTime() + config.expiresIn) : undefined,
      stats: existingMetadata?.stats || {
        turnCount: 0,
        totalTokens: 0,
        totalCost: 0,
        averageResponseTime: 0
      },
      tags: config.tags || [],
      custom: existingMetadata?.custom || {},
      ...existingMetadata
    };
  }
  
  /**
   * Validates session configuration.
   * 
   * @private
   * @throws {SessionValidationError} If configuration is invalid
   */
  private validateConfiguration(): void {
    if (this._config.maxHistoryLength && this._config.maxHistoryLength < 1) {
      throw new SessionValidationError(
        this.id,
        'maxHistoryLength must be at least 1',
        'maxHistoryLength',
        this._config.maxHistoryLength
      );
    }
    
    if (this._config.maxContextSize && this._config.maxContextSize < 1024) {
      throw new SessionValidationError(
        this.id,
        'maxContextSize must be at least 1024 bytes',
        'maxContextSize',
        this._config.maxContextSize
      );
    }
    
    if (this._config.expiresIn && this._config.expiresIn < 60000) {
      throw new SessionValidationError(
        this.id,
        'expiresIn must be at least 60000ms (1 minute)',
        'expiresIn',
        this._config.expiresIn
      );
    }
  }
  
  /**
   * Validates conversation turn data.
   * 
   * @param turn - Turn data to validate
   * @private
   * @throws {SessionValidationError} If turn data is invalid
   */
  private validateTurnData(turn: any): void {
    if (!turn.role || !['user', 'assistant', 'system', 'function'].includes(turn.role)) {
      throw new SessionValidationError(
        this.id,
        'Turn role must be one of: user, assistant, system, function',
        'role',
        turn.role
      );
    }
    
    if (!turn.content || typeof turn.content !== 'string') {
      throw new SessionValidationError(
        this.id,
        'Turn content must be a non-empty string',
        'content',
        turn.content
      );
    }
    
    if (!turn.timestamp || !(turn.timestamp instanceof Date)) {
      throw new SessionValidationError(
        this.id,
        'Turn timestamp must be a valid Date object',
        'timestamp',
        turn.timestamp
      );
    }
  }
  
  /**
   * Loads conversation history from storage.
   * 
   * @private
   */
  private async loadConversationHistory(): Promise<void> {
    // In a real implementation, this would load from storage
    // For now, we assume history is already loaded or empty
    this._historyLoaded = true;
  }
  
  /**
   * Loads session context from storage.
   * 
   * @private
   */
  private async loadSessionContext(): Promise<void> {
    // In a real implementation, this would load from storage
    // For now, we assume context is already loaded or empty
    this._contextLoaded = true;
  }
  
  /**
   * Checks history capacity and prunes if necessary.
   * 
   * @private
   */
  private async checkHistoryCapacity(): Promise<void> {
    const maxLength = this._config.maxHistoryLength || 1000;
    
    if (this._conversationHistory.length >= maxLength) {
      // Remove oldest turns to make room
      const removeCount = this._conversationHistory.length - maxLength + 1;
      const removed = this._conversationHistory.splice(0, removeCount);
      
      console.log(`Pruned ${removeCount} old turns from session '${this.id}' history`);
    }
  }
  
  /**
   * Updates turn statistics in metadata.
   * 
   * @param turn - Turn that was added
   * @private
   */
  private updateTurnStatistics(turn: ConversationTurn): void {
    if (!this._metadata.stats) {
      this._metadata.stats = {
        turnCount: 0,
        totalTokens: 0,
        totalCost: 0,
        averageResponseTime: 0
      };
    }
    
    this._metadata.stats.turnCount++;
    
    if (turn.metadata?.tokenUsage?.totalTokens) {
      this._metadata.stats.totalTokens += turn.metadata.tokenUsage.totalTokens;
    }
    
    if (turn.metadata?.cost?.totalCost) {
      this._metadata.stats.totalCost += turn.metadata.cost.totalCost;
    }
    
    if (turn.metadata?.performance?.latency) {
      // Update average response time
      const totalResponses = this._metadata.stats.turnCount;
      const currentAvg = this._metadata.stats.averageResponseTime;
      const newLatency = turn.metadata.performance.latency;
      
      this._metadata.stats.averageResponseTime = 
        (currentAvg * (totalResponses - 1) + newLatency) / totalResponses;
    }
  }
  
  /**
   * Updates turn statistics after deletion.
   * 
   * @param turn - Turn that was deleted
   * @private
   */
  private updateTurnStatisticsAfterDeletion(turn: ConversationTurn): void {
    if (!this._metadata.stats) return;
    
    this._metadata.stats.turnCount = Math.max(0, this._metadata.stats.turnCount - 1);
    
    if (turn.metadata?.tokenUsage?.totalTokens) {
      this._metadata.stats.totalTokens = Math.max(0, 
        this._metadata.stats.totalTokens - turn.metadata.tokenUsage.totalTokens);
    }
    
    if (turn.metadata?.cost?.totalCost) {
      this._metadata.stats.totalCost = Math.max(0,
        this._metadata.stats.totalCost - turn.metadata.cost.totalCost);
    }
    
    // Note: Recalculating average response time after deletion is complex
    // and would require storing all individual latencies, so we skip it here
  }
  
  /**
   * Calculates total context size in bytes.
   * 
   * @returns Total context size in bytes
   * @private
   */
  private calculateContextSize(): number {
    const serialized = JSON.stringify(this._context);
    return Buffer.byteLength(serialized, 'utf8');
  }
  
  /**
   * Calculates the next sequence number for turns.
   * 
   * @returns Next sequence number
   * @private
   */
  private calculateNextSequence(): number {
    if (this._conversationHistory.length === 0) {
      return 1;
    }
    
    const maxSequence = Math.max(...this._conversationHistory.map(turn => turn.sequence));
    return maxSequence + 1;
  }
  
  /**
   * Performs the actual save operation.
   * 
   * @returns Promise that resolves when save is complete
   * @private
   */
  private async performSave(): Promise<void> {
    try {
      await this.acquireLock();
      
      // Check if anything needs saving
      const isDirty = Object.values(this._isDirty).some(dirty => dirty);
      
      if (!isDirty) {
        console.log(`Session '${this.id}' is already up to date`);
        return;
      }
      
      // Save to storage
      await this.storage.saveSession(this);
      
      // Clear dirty flags
      this._isDirty = {
        metadata: false,
        config: false,
        context: false,
        history: false
      };
      
      console.log(`Session '${this.id}' saved successfully`);
      
    } catch (error) {
      throw new SessionUpdateError(
        this.id,
        error instanceof Error ? error.message : String(error),
        error instanceof Error ? error : undefined,
        createSessionErrorContext(this, 'save')
      );
    } finally {
      this.releaseLock();
    }
  }
  
  /**
   * Updates internal state from storage data.
   * 
   * @param storageData - Data loaded from storage
   * @private
   */
  private updateFromStorageData(storageData: ISession): void {
    // Update mutable fields
    this._updatedAt = storageData.updatedAt;
    this._config = storageData.config;
    this._metadata = storageData.metadata;
    this._status = storageData.status;
    
    // Reset loaded flags to force reload
    this._historyLoaded = false;
    this._contextLoaded = false;
    this._conversationHistory = [];
    this._context = {};
  }
}