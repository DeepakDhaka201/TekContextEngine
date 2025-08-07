/**
 * @fileoverview Summary Buffer implementation for summarized memory
 * @module modules/memory/buffers/summary-buffer
 * @requires ../types
 * @requires ../errors
 * 
 * This file implements a summary memory buffer that maintains a summarized
 * version of conversation history. When the buffer reaches a threshold,
 * older messages are summarized to save space while preserving context.
 * 
 * @example
 * ```typescript
 * const buffer = new SummaryBuffer('sess-123', 50, 30, 'gpt-3.5-turbo');
 * 
 * await buffer.add({
 *   role: 'user',
 *   content: 'What is machine learning?',
 *   metadata: { timestamp: new Date().toISOString() }
 * });
 * 
 * const summary = await buffer.summarize();
 * const context = await buffer.getContext();
 * ```
 * 
 * @since 1.0.0
 */

import { IMemoryBuffer, MemoryBufferType, IMessage } from '../types';
import { MemoryBufferError } from '../errors';

/**
 * Summary Buffer implementation for summarized memory.
 * 
 * Maintains both recent messages and summaries of older conversations.
 * Automatically summarizes older messages when threshold is reached.
 * 
 * @public
 */
export class SummaryBuffer implements IMemoryBuffer {
  public readonly type: MemoryBufferType = 'summary';
  public readonly sessionId: string;
  public readonly maxSize: number;
  
  private messages: IMessage[] = [];
  private summaries: string[] = [];
  private summarizationThreshold: number;
  private summaryModel: string;
  
  constructor(
    sessionId: string, 
    maxSize: number = 50, 
    summarizationThreshold: number = 30,
    summaryModel: string = 'gpt-3.5-turbo'
  ) {
    this.sessionId = sessionId;
    this.maxSize = maxSize;
    this.summarizationThreshold = summarizationThreshold;
    this.summaryModel = summaryModel;
    
    if (maxSize < 1) {
      throw new MemoryBufferError(
        sessionId,
        'summary',
        'constructor',
        'Maximum size must be at least 1',
        undefined,
        { maxSize }
      );
    }
    
    if (summarizationThreshold >= maxSize) {
      throw new MemoryBufferError(
        sessionId,
        'summary',
        'constructor',
        'Summarization threshold must be less than maximum size',
        undefined,
        { summarizationThreshold, maxSize }
      );
    }
  }
  
  /**
   * Adds a message to the summary buffer.
   * Triggers summarization if threshold is reached.
   */
  async add(message: IMessage): Promise<void> {
    try {
      this.messages.push(message);
      
      // Check if we need to summarize
      if (this.messages.length >= this.summarizationThreshold) {
        await this.triggerSummarization();
      }
      
    } catch (error) {
      throw new MemoryBufferError(
        this.sessionId,
        this.type,
        'add',
        `Failed to add message to summary buffer: ${error}`,
        error instanceof Error ? error : undefined,
        { 
          currentSize: this.messages.length, 
          maxSize: this.maxSize,
          summarizationThreshold: this.summarizationThreshold
        }
      );
    }
  }
  
  /**
   * Retrieves all messages in the buffer (including recent messages).
   */
  async getMessages(): Promise<IMessage[]> {
    return [...this.messages]; // Return copy of recent messages only
  }
  
  /**
   * Clears all messages and summaries from the buffer.
   */
  async clear(): Promise<void> {
    this.messages = [];
    this.summaries = [];
  }
  
  /**
   * Creates a summary of the buffer content.
   */
  async summarize(): Promise<string> {
    try {
      if (this.messages.length === 0 && this.summaries.length === 0) {
        return 'No conversation history available.';
      }
      
      const parts: string[] = [];
      
      // Add previous summaries
      if (this.summaries.length > 0) {
        parts.push(`Previous conversation summary: ${this.summaries.join(' ')}`);
      }
      
      // Add recent messages
      if (this.messages.length > 0) {
        const recentContext = this.messages
          .map(msg => `${msg.role}: ${msg.content}`)
          .join('\n');
        parts.push(`Recent messages:\n${recentContext}`);
      }
      
      return parts.join('\n\n');
      
    } catch (error) {
      throw new MemoryBufferError(
        this.sessionId,
        this.type,
        'summarize',
        `Failed to create summary: ${error}`,
        error instanceof Error ? error : undefined,
        { 
          messageCount: this.messages.length,
          summaryCount: this.summaries.length
        }
      );
    }
  }
  
  /**
   * Gets context representation combining summaries and recent messages.
   */
  async getContext(): Promise<string> {
    return await this.summarize();
  }
  
  /**
   * Trims the buffer by creating summaries of older messages.
   */
  async trim(): Promise<void> {
    if (this.messages.length >= this.summarizationThreshold) {
      await this.triggerSummarization();
    }
  }
  
  /**
   * Triggers summarization of older messages.
   * 
   * @private
   */
  private async triggerSummarization(): Promise<void> {
    try {
      const messagesToSummarize = this.messages.splice(0, this.summarizationThreshold / 2);
      
      if (messagesToSummarize.length === 0) {
        return;
      }
      
      // Create summary text
      const messageText = messagesToSummarize
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n');
      
      // Simple summarization (in production, would use LLM)
      const summary = await this.createSummary(messageText);
      
      this.summaries.push(summary);
      
      // Keep only the most recent summaries
      const maxSummaries = 5;
      while (this.summaries.length > maxSummaries) {
        this.summaries.shift();
      }
      
    } catch (error) {
      throw new MemoryBufferError(
        this.sessionId,
        this.type,
        'summarization',
        `Failed to perform summarization: ${error}`,
        error instanceof Error ? error : undefined,
        { 
          model: this.summaryModel,
          messageCount: this.messages.length
        }
      );
    }
  }
  
  /**
   * Creates a summary of the given text.
   * 
   * @param text - Text to summarize
   * @returns Summary text
   * @private
   */
  private async createSummary(text: string): Promise<string> {
    // Simple summarization logic - in production, this would call an LLM
    const lines = text.split('\n');
    const userMessages = lines.filter(line => line.startsWith('user:'));
    const assistantMessages = lines.filter(line => line.startsWith('assistant:'));
    
    let summary = `Conversation segment with ${userMessages.length} user messages and ${assistantMessages.length} assistant responses.`;
    
    // Add key topics (simplified)
    const keyTerms = this.extractKeyTerms(text);
    if (keyTerms.length > 0) {
      summary += ` Topics discussed: ${keyTerms.join(', ')}.`;
    }
    
    // Add first user message if available
    if (userMessages.length > 0) {
      const firstUser = userMessages[0].substring(5, 100); // Remove 'user:' prefix and limit length
      summary += ` Started with: "${firstUser}${firstUser.length >= 95 ? '...' : ''}"`;
    }
    
    return summary;
  }
  
  /**
   * Extracts key terms from text for summary.
   * 
   * @param text - Text to analyze
   * @returns Array of key terms
   * @private
   */
  private extractKeyTerms(text: string): string[] {
    const commonTerms = [
      'machine learning', 'AI', 'data', 'analysis', 'model', 'training',
      'algorithm', 'neural network', 'deep learning', 'classification',
      'regression', 'clustering', 'prediction', 'optimization'
    ];
    
    const foundTerms: string[] = [];
    const lowerText = text.toLowerCase();
    
    commonTerms.forEach(term => {
      if (lowerText.includes(term)) {
        foundTerms.push(term);
      }
    });
    
    return foundTerms.slice(0, 5); // Limit to top 5 terms
  }
}