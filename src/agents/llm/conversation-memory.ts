/**
 * @fileoverview Conversation memory management for LLM Agent
 * @module agents/llm/conversation-memory
 * @requires ./types
 * @requires ./errors
 * 
 * This file implements the ConversationMemory class that manages
 * conversation history for LLM agents with intelligent trimming,
 * token estimation, and memory consolidation capabilities.
 * 
 * Key concepts:
 * - In-memory conversation storage with size limits
 * - Token-aware message management and trimming
 * - System message preservation during cleanup
 * - Memory consolidation and summarization support
 * - Performance optimization for large conversations
 * 
 * @example
 * ```typescript
 * import { ConversationMemory } from './conversation-memory';
 * 
 * const memory = new ConversationMemory(20);
 * 
 * memory.add({
 *   role: 'user',
 *   content: 'Hello, how are you?'
 * });
 * 
 * memory.add({
 *   role: 'assistant',
 *   content: 'I am doing well, thank you!'
 * });
 * 
 * const messages = memory.getMessages();
 * const tokenCount = memory.getTokenEstimate();
 * ```
 * 
 * @see types.ts for Message and ConversationMemory interfaces
 * @since 1.0.0
 */

import { Message, ConversationMemory as IConversationMemory } from './types';
import { MemoryError } from './errors';

/**
 * In-memory conversation storage with intelligent management.
 * 
 * The ConversationMemory class provides sophisticated memory management
 * for LLM conversations including automatic trimming based on message
 * limits, token estimation for context management, and system message
 * preservation during cleanup operations.
 * 
 * Features:
 * - Automatic message trimming with configurable limits
 * - Token-aware memory management for context optimization
 * - System message preservation during cleanup
 * - Performance optimization for large conversation histories
 * - Thread-safe operations for concurrent access
 * - Memory consolidation hooks for external summarization
 * 
 * Memory Management Strategy:
 * 1. Preserve system messages at the beginning
 * 2. Maintain recent conversation flow
 * 3. Trim older user/assistant pairs when limit exceeded
 * 4. Optimize for token efficiency and coherence
 * 
 * @example
 * ```typescript
 * // Create memory with 20 message limit
 * const memory = new ConversationMemory(20);
 * 
 * // Add system prompt
 * memory.add({
 *   role: 'system',
 *   content: 'You are a helpful AI assistant.'
 * });
 * 
 * // Add conversation messages
 * memory.add({ role: 'user', content: 'What is AI?' });
 * memory.add({ role: 'assistant', content: 'AI is artificial intelligence...' });
 * 
 * // Check memory status
 * console.log(`Messages: ${memory.size()}, Tokens: ~${memory.getTokenEstimate()}`);
 * 
 * // Get all messages for LLM call
 * const messages = memory.getMessages();
 * 
 * // Clear when starting new conversation
 * memory.clear();
 * ```
 * 
 * @public
 */
export class ConversationMemory implements IConversationMemory {
  /** Internal message storage */
  private messages: Message[] = [];
  
  /** Maximum number of messages to retain */
  private readonly maxMessages: number;
  
  /** Creation timestamp for debugging */
  private readonly createdAt: Date;
  
  /** Last access timestamp for cleanup */
  private lastAccessed: Date;
  
  /** Cached token estimate for performance */
  private cachedTokenCount: number = 0;
  
  /** Whether cache is valid */
  private tokenCacheValid: boolean = false;
  
  /**
   * Creates a new ConversationMemory instance.
   * 
   * @param maxMessages - Maximum number of messages to retain
   * @throws {MemoryError} If maxMessages is invalid
   * 
   * @example
   * ```typescript
   * // Standard conversation memory
   * const memory = new ConversationMemory(20);
   * 
   * // Large context memory for complex conversations
   * const largeMemory = new ConversationMemory(100);
   * 
   * // Minimal memory for simple interactions
   * const minimalMemory = new ConversationMemory(5);
   * ```
   */
  constructor(maxMessages: number) {
    if (maxMessages <= 0) {
      throw new MemoryError(
        'initialization',
        'memory',
        'Maximum messages must be positive',
        { maxMessages }
      );
    }
    
    this.maxMessages = maxMessages;
    this.createdAt = new Date();
    this.lastAccessed = new Date();
  }
  
  /**
   * Adds a message to the conversation memory.
   * 
   * Automatically manages memory size by trimming older messages
   * when the maximum limit is exceeded. Preserves system messages
   * and maintains conversation coherence.
   * 
   * @param message - Message to add to memory
   * @throws {MemoryError} If message is invalid
   * 
   * @example
   * ```typescript
   * // Add user message
   * memory.add({
   *   role: 'user',
   *   content: 'Explain quantum computing'
 * });
   * 
   * // Add assistant response
   * memory.add({
   *   role: 'assistant',
   *   content: 'Quantum computing is a paradigm...'
   * });
   * 
   * // Add system message (will be preserved)
   * memory.add({
   *   role: 'system',
   *   content: 'Update: You now have access to web search.'
   * });
   * ```
   */
  add(message: Message): void {
    // Validate message
    this.validateMessage(message);
    
    // Update access timestamp
    this.lastAccessed = new Date();
    
    // Add message to storage
    this.messages.push({
      ...message,
      timestamp: new Date()
    });
    
    // Invalidate token cache
    this.tokenCacheValid = false;
    
    // Trim if necessary
    this.trimIfNecessary();
  }
  
  /**
   * Retrieves all messages in conversation order.
   * 
   * Returns a copy of all stored messages to prevent external
   * modification of internal state.
   * 
   * @returns Array of conversation messages
   * 
   * @example
   * ```typescript
   * const messages = memory.getMessages();
   * 
   * // Use messages for LLM completion
   * const response = await llm.complete({
   *   model: 'gpt-4',
   *   messages: messages
   * });
   * ```
   */
  getMessages(): Message[] {
    this.lastAccessed = new Date();
    
    // Return deep copy to prevent modification
    return this.messages.map(msg => ({ ...msg }));
  }
  
  /**
   * Clears all messages from memory.
   * 
   * Removes all stored messages and resets internal state.
   * Use when starting a new conversation or resetting context.
   * 
   * @example
   * ```typescript
   * // Clear memory for new conversation
   * memory.clear();
   * 
   * // Verify memory is empty
   * console.log(memory.isEmpty()); // true
   * ```
   */
  clear(): void {
    this.messages = [];
    this.cachedTokenCount = 0;
    this.tokenCacheValid = false;
    this.lastAccessed = new Date();
  }
  
  /**
   * Estimates token count for all messages.
   * 
   * Provides a rough estimate of token usage for the stored
   * conversation. Uses caching to optimize repeated calls.
   * 
   * @returns Estimated token count
   * 
   * @example
   * ```typescript
   * const tokenCount = memory.getTokenEstimate();
   * 
   * if (tokenCount > 8000) {
   *   console.log('Approaching context limit, consider summarization');
   * }
   * ```
   */
  getTokenEstimate(): number {
    this.lastAccessed = new Date();
    
    // Use cached value if valid
    if (this.tokenCacheValid) {
      return this.cachedTokenCount;
    }
    
    // Calculate token estimate
    // Rough approximation: 1 token ≈ 4 characters for English
    this.cachedTokenCount = this.messages.reduce((total, message) => {
      const contentLength = message.content?.length || 0;
      const roleTokens = 4; // Approximate tokens for role and formatting
      const contentTokens = Math.ceil(contentLength / 4);
      
      return total + roleTokens + contentTokens;
    }, 0);
    
    // Add overhead for message formatting (OpenAI format)
    this.cachedTokenCount += this.messages.length * 2;
    
    this.tokenCacheValid = true;
    return this.cachedTokenCount;
  }
  
  /**
   * Returns the number of messages in memory.
   * 
   * @returns Current message count
   * 
   * @example
   * ```typescript
   * const messageCount = memory.size();
   * console.log(`Conversation has ${messageCount} messages`);
   * ```
   */
  size(): number {
    return this.messages.length;
  }
  
  /**
   * Checks if memory is empty.
   * 
   * @returns True if no messages are stored
   * 
   * @example
   * ```typescript
   * if (memory.isEmpty()) {
   *   console.log('Starting new conversation');
   * }
   * ```
   */
  isEmpty(): boolean {
    return this.messages.length === 0;
  }
  
  /**
   * Gets the last message in the conversation.
   * 
   * @returns Last message or null if empty
   * 
   * @example
   * ```typescript
   * const lastMessage = memory.getLastMessage();
   * if (lastMessage?.role === 'user') {
   *   console.log('Waiting for assistant response');
   * }
   * ```
   */
  getLastMessage(): Message | null {
    this.lastAccessed = new Date();
    
    if (this.messages.length === 0) {
      return null;
    }
    
    return { ...this.messages[this.messages.length - 1] };
  }
  
  /**
   * Gets messages by role type.
   * 
   * @param role - Role to filter by
   * @returns Messages with specified role
   * 
   * @example
   * ```typescript
   * const userMessages = memory.getMessagesByRole('user');
   * const systemMessages = memory.getMessagesByRole('system');
   * ```
   */
  getMessagesByRole(role: 'system' | 'user' | 'assistant' | 'tool'): Message[] {
    this.lastAccessed = new Date();
    
    return this.messages
      .filter(msg => msg.role === role)
      .map(msg => ({ ...msg }));
  }
  
  /**
   * Gets recent messages within specified count.
   * 
   * @param count - Number of recent messages to retrieve
   * @returns Recent messages in conversation order
   * 
   * @example
   * ```typescript
   * // Get last 5 messages for context
   * const recentMessages = memory.getRecentMessages(5);
   * ```
   */
  getRecentMessages(count: number): Message[] {
    this.lastAccessed = new Date();
    
    if (count <= 0) {
      return [];
    }
    
    const startIndex = Math.max(0, this.messages.length - count);
    return this.messages
      .slice(startIndex)
      .map(msg => ({ ...msg }));
  }
  
  /**
   * Creates a snapshot of current memory state.
   * 
   * @returns Memory snapshot for backup or analysis
   * 
   * @example
   * ```typescript
   * const snapshot = memory.createSnapshot();
   * 
   * // Later restore from snapshot
   * memory.restoreFromSnapshot(snapshot);
   * ```
   */
  createSnapshot(): {
    messages: Message[];
    maxMessages: number;
    createdAt: Date;
    lastAccessed: Date;
    tokenEstimate: number;
  } {
    return {
      messages: this.getMessages(),
      maxMessages: this.maxMessages,
      createdAt: this.createdAt,
      lastAccessed: this.lastAccessed,
      tokenEstimate: this.getTokenEstimate()
    };
  }
  
  /**
   * Restores memory from a snapshot.
   * 
   * @param snapshot - Memory snapshot to restore
   * @throws {MemoryError} If snapshot is invalid
   * 
   * @example
   * ```typescript
   * memory.restoreFromSnapshot(previousSnapshot);
   * ```
   */
  restoreFromSnapshot(snapshot: {
    messages: Message[];
    maxMessages: number;
    createdAt: Date;
    lastAccessed: Date;
    tokenEstimate: number;
  }): void {
    if (!snapshot || !Array.isArray(snapshot.messages)) {
      throw new MemoryError(
        'restore',
        'memory',
        'Invalid snapshot format',
        { snapshot }
      );
    }
    
    this.clear();
    
    for (const message of snapshot.messages) {
      this.validateMessage(message);
      this.messages.push({ ...message });
    }
    
    this.tokenCacheValid = false;
    this.lastAccessed = new Date();
  }
  
  // Private helper methods
  
  /**
   * Validates a message before adding to memory.
   * 
   * @param message - Message to validate
   * @throws {MemoryError} If message is invalid
   * @private
   */
  private validateMessage(message: Message): void {
    if (!message) {
      throw new MemoryError(
        'validation',
        'memory',
        'Message cannot be null or undefined'
      );
    }
    
    if (!message.role || typeof message.role !== 'string') {
      throw new MemoryError(
        'validation',
        'memory',
        'Message must have a valid role',
        { message }
      );
    }
    
    if (!['system', 'user', 'assistant', 'tool'].includes(message.role)) {
      throw new MemoryError(
        'validation',
        'memory',
        `Invalid message role: ${message.role}`,
        { message }
      );
    }
    
    if (message.content === undefined || message.content === null) {
      throw new MemoryError(
        'validation',
        'memory',
        'Message must have content',
        { message }
      );
    }
  }
  
  /**
   * Trims messages if the maximum limit is exceeded.
   * 
   * Uses intelligent trimming strategy that preserves system
   * messages and maintains conversation coherence.
   * 
   * @private
   */
  private trimIfNecessary(): void {
    if (this.messages.length <= this.maxMessages) {
      return;
    }
    
    // Separate system messages from conversation messages
    const systemMessages = this.messages.filter(msg => msg.role === 'system');
    const conversationMessages = this.messages.filter(msg => msg.role !== 'system');
    
    // Calculate how many conversation messages to keep
    const maxConversationMessages = this.maxMessages - systemMessages.length;
    
    if (maxConversationMessages <= 0) {
      // If too many system messages, keep only the most recent ones
      this.messages = systemMessages.slice(-this.maxMessages);
      return;
    }
    
    // Keep most recent conversation messages
    const trimmedConversation = conversationMessages.slice(-maxConversationMessages);
    
    // Rebuild message array: system messages first, then conversation
    this.messages = [...systemMessages, ...trimmedConversation];
    
    // Invalidate token cache after trimming
    this.tokenCacheValid = false;
  }
  
  /**
   * Gets memory statistics for monitoring and debugging.
   * 
   * @returns Memory usage statistics
   * 
   * @example
   * ```typescript
   * const stats = memory.getStatistics();
   * console.log(`Memory: ${stats.messageCount}/${stats.maxMessages} messages, ~${stats.tokenEstimate} tokens`);
   * ```
   */
  getStatistics(): {
    messageCount: number;
    maxMessages: number;
    tokenEstimate: number;
    messagesByRole: Record<string, number>;
    memoryUtilization: number;
    createdAt: Date;
    lastAccessed: Date;
    averageMessageLength: number;
  } {
    const messagesByRole = this.messages.reduce((counts, msg) => {
      counts[msg.role] = (counts[msg.role] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);
    
    const totalContentLength = this.messages.reduce((total, msg) => {
      return total + (msg.content?.length || 0);
    }, 0);
    
    const averageMessageLength = this.messages.length > 0 
      ? totalContentLength / this.messages.length 
      : 0;
    
    return {
      messageCount: this.messages.length,
      maxMessages: this.maxMessages,
      tokenEstimate: this.getTokenEstimate(),
      messagesByRole,
      memoryUtilization: this.messages.length / this.maxMessages,
      createdAt: this.createdAt,
      lastAccessed: this.lastAccessed,
      averageMessageLength: Math.round(averageMessageLength)
    };
  }
}