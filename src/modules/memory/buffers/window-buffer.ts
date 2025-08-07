/**
 * @fileoverview Window Buffer implementation for sliding window memory
 * @module modules/memory/buffers/window-buffer
 * @requires ../types
 * @requires ../errors
 * 
 * This file implements a sliding window memory buffer that maintains a fixed-size
 * window of the most recent messages. When the buffer exceeds capacity, older
 * messages are automatically removed to make room for new ones.
 * 
 * @example
 * ```typescript
 * const buffer = new WindowBuffer('sess-123', 10);
 * 
 * await buffer.add({
 *   role: 'user',
 *   content: 'Hello!',
 *   metadata: { timestamp: new Date().toISOString() }
 * });
 * 
 * const messages = await buffer.getMessages();
 * const context = await buffer.getContext();
 * ```
 * 
 * @since 1.0.0
 */

import { IMemoryBuffer, MemoryBufferType, IMessage } from '../types';
import { MemoryBufferError } from '../errors';

/**
 * Window Buffer implementation for sliding window memory.
 * 
 * Maintains a fixed-size sliding window of the most recent messages.
 * Automatically removes older messages when capacity is exceeded.
 * 
 * @public
 */
export class WindowBuffer implements IMemoryBuffer {
  public readonly type: MemoryBufferType = 'window';
  public readonly sessionId: string;
  public readonly maxSize: number;
  
  private messages: IMessage[] = [];
  
  constructor(sessionId: string, maxSize: number = 50) {
    this.sessionId = sessionId;
    this.maxSize = maxSize;
    
    if (maxSize < 1) {
      throw new MemoryBufferError(
        sessionId,
        'window',
        'constructor',
        'Maximum size must be at least 1',
        undefined,
        { maxSize }
      );
    }
  }
  
  /**
   * Adds a message to the window buffer.
   * Automatically removes oldest message if buffer is at capacity.
   */
  async add(message: IMessage): Promise<void> {
    try {
      this.messages.push(message);
      
      // Remove oldest messages if we exceed capacity
      while (this.messages.length > this.maxSize) {
        this.messages.shift();
      }
      
    } catch (error) {
      throw new MemoryBufferError(
        this.sessionId,
        this.type,
        'add',
        `Failed to add message to window buffer: ${error}`,
        error instanceof Error ? error : undefined,
        { currentSize: this.messages.length, maxSize: this.maxSize }
      );
    }
  }
  
  /**
   * Retrieves all messages in the window.
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
   * Gets context representation of the window buffer.
   */
  async getContext(): Promise<string> {
    if (this.messages.length === 0) {
      return '';
    }
    
    const contextLines = this.messages.map(msg => 
      `${msg.role}: ${msg.content}`
    );
    
    return contextLines.join('\n');
  }
  
  /**
   * Trims the buffer to a smaller size if needed.
   */
  async trim(): Promise<void> {
    // For window buffer, trimming just ensures we're within maxSize
    while (this.messages.length > this.maxSize) {
      this.messages.shift();
    }
  }
}