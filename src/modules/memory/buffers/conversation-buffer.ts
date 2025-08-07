/**
 * @fileoverview Conversation Buffer implementation for full conversation history
 * @module modules/memory/buffers/conversation-buffer
 * @requires ../types
 * @requires ../errors
 * 
 * This file implements a conversation buffer that maintains the complete
 * conversation history up to a specified limit. Unlike window buffer,
 * it preserves the entire conversation context without summarization.
 * 
 * @example
 * ```typescript
 * const buffer = new ConversationBuffer('sess-123', 100);
 * 
 * await buffer.add({
 *   role: 'user',
 *   content: 'Hello!',
 *   metadata: { timestamp: new Date().toISOString() }
 * });
 * 
 * const fullHistory = await buffer.getMessages();
 * const context = await buffer.getContext();
 * ```
 * 
 * @since 1.0.0
 */

import { IMemoryBuffer, MemoryBufferType, IMessage } from '../types';
import { MemoryBufferError } from '../errors';

/**
 * Conversation Buffer implementation for full conversation history.
 * 
 * Maintains the complete conversation history up to a specified limit.
 * When the limit is reached, removes the oldest messages to make room
 * for new ones while preserving conversation structure.
 * 
 * @public
 */
export class ConversationBuffer implements IMemoryBuffer {
  public readonly type: MemoryBufferType = 'conversation';
  public readonly sessionId: string;
  public readonly maxSize: number;
  
  private messages: IMessage[] = [];
  
  constructor(sessionId: string, maxSize: number = 100) {
    this.sessionId = sessionId;
    this.maxSize = maxSize;
    
    if (maxSize < 1) {
      throw new MemoryBufferError(
        sessionId,
        'conversation',
        'constructor',
        'Maximum size must be at least 1',
        undefined,
        { maxSize }
      );
    }
  }
  
  /**
   * Adds a message to the conversation buffer.
   * Removes oldest messages if buffer exceeds capacity.
   */
  async add(message: IMessage): Promise<void> {
    try {
      this.messages.push(message);
      
      // Remove oldest messages if we exceed capacity
      // For conversation buffer, we try to maintain conversation pairs
      while (this.messages.length > this.maxSize) {
        this.removeOldestMessage();
      }
      
    } catch (error) {
      throw new MemoryBufferError(
        this.sessionId,
        this.type,
        'add',
        `Failed to add message to conversation buffer: ${error}`,
        error instanceof Error ? error : undefined,
        { currentSize: this.messages.length, maxSize: this.maxSize }
      );
    }
  }
  
  /**
   * Retrieves all messages in the conversation.
   */
  async getMessages(): Promise<IMessage[]> {
    return [...this.messages]; // Return copy to prevent external modification
  }
  
  /**
   * Clears all messages from the buffer.
   */
  async clear(): Promise<void> {
    this.messages = [];
  }
  
  /**
   * Gets context representation of the full conversation.
   */
  async getContext(): Promise<string> {
    if (this.messages.length === 0) {
      return '';
    }
    
    const contextLines = this.messages.map(msg => {
      const timestamp = msg.metadata?.timestamp ? 
        new Date(msg.metadata.timestamp).toLocaleTimeString() : '';
      
      return timestamp ? 
        `[${timestamp}] ${msg.role}: ${msg.content}` :
        `${msg.role}: ${msg.content}`;
    });
    
    return contextLines.join('\n');
  }
  
  /**
   * Trims the buffer by removing oldest messages.
   */
  async trim(): Promise<void> {
    const targetSize = Math.floor(this.maxSize * 0.8); // Trim to 80% of max size
    
    while (this.messages.length > targetSize) {
      this.removeOldestMessage();
    }
  }
  
  /**
   * Gets conversation statistics.
   */
  getStats(): {
    totalMessages: number;
    userMessages: number;
    assistantMessages: number;
    systemMessages: number;
    toolMessages: number;
  } {
    const stats = {
      totalMessages: this.messages.length,
      userMessages: 0,
      assistantMessages: 0,
      systemMessages: 0,
      toolMessages: 0
    };
    
    this.messages.forEach(msg => {
      switch (msg.role) {
        case 'user':
          stats.userMessages++;
          break;
        case 'assistant':
          stats.assistantMessages++;
          break;
        case 'system':
          stats.systemMessages++;
          break;
        case 'tool':
          stats.toolMessages++;
          break;
      }
    });
    
    return stats;
  }
  
  /**
   * Gets recent messages up to a specified limit.
   * 
   * @param limit - Maximum number of recent messages to return
   * @returns Array of recent messages
   */
  async getRecentMessages(limit: number): Promise<IMessage[]> {
    if (limit <= 0) {
      return [];
    }
    
    const start = Math.max(0, this.messages.length - limit);
    return this.messages.slice(start).map(msg => ({ ...msg }));
  }
  
  /**
   * Searches for messages containing specific text.
   * 
   * @param searchText - Text to search for
   * @param caseSensitive - Whether search should be case sensitive
   * @returns Array of matching messages
   */
  async searchMessages(searchText: string, caseSensitive: boolean = false): Promise<IMessage[]> {
    if (!searchText.trim()) {
      return [];
    }
    
    const searchTerm = caseSensitive ? searchText : searchText.toLowerCase();
    
    return this.messages.filter(msg => {
      const content = caseSensitive ? msg.content : msg.content.toLowerCase();
      return content.includes(searchTerm);
    }).map(msg => ({ ...msg }));
  }
  
  /**
   * Gets messages by role.
   * 
   * @param role - Message role to filter by
   * @returns Array of messages with the specified role
   */
  async getMessagesByRole(role: IMessage['role']): Promise<IMessage[]> {
    return this.messages
      .filter(msg => msg.role === role)
      .map(msg => ({ ...msg }));
  }
  
  /**
   * Gets the last message of a specific role.
   * 
   * @param role - Message role to find
   * @returns Last message with the specified role, or undefined
   */
  async getLastMessageByRole(role: IMessage['role']): Promise<IMessage | undefined> {
    for (let i = this.messages.length - 1; i >= 0; i--) {
      if (this.messages[i].role === role) {
        return { ...this.messages[i] };
      }
    }
    return undefined;
  }
  
  /**
   * Removes the oldest message from the buffer.
   * Tries to maintain conversation flow by preserving message pairs.
   * 
   * @private
   */
  private removeOldestMessage(): void {
    if (this.messages.length === 0) {
      return;
    }
    
    // Simple removal - just take the first message
    // In a more sophisticated implementation, we might try to preserve
    // user-assistant pairs or important system messages
    this.messages.shift();
  }
  
  /**
   * Calculates the total token count for all messages.
   * 
   * @returns Estimated total token count
   */
  calculateTokenCount(): number {
    return this.messages.reduce((total, msg) => {
      // Simple token estimation - in production, use proper tokenizer
      const estimatedTokens = Math.ceil(msg.content.length / 4);
      const metadataTokens = msg.metadata ? Math.ceil(JSON.stringify(msg.metadata).length / 4) : 0;
      return total + estimatedTokens + metadataTokens;
    }, 0);
  }
  
  /**
   * Gets the age of the conversation in milliseconds.
   * 
   * @returns Age in milliseconds, or 0 if no messages
   */
  getConversationAge(): number {
    if (this.messages.length === 0) {
      return 0;
    }
    
    const firstMessage = this.messages[0];
    const firstTimestamp = firstMessage.metadata?.timestamp;
    
    if (!firstTimestamp) {
      return 0;
    }
    
    return Date.now() - new Date(firstTimestamp).getTime();
  }
  
  /**
   * Exports the conversation to a structured format.
   * 
   * @returns Conversation export object
   */
  exportConversation(): {
    sessionId: string;
    messageCount: number;
    exportedAt: string;
    messages: IMessage[];
    stats: ReturnType<ConversationBuffer['getStats']>;
  } {
    return {
      sessionId: this.sessionId,
      messageCount: this.messages.length,
      exportedAt: new Date().toISOString(),
      messages: this.messages.map(msg => ({ ...msg })),
      stats: this.getStats()
    };
  }
}