/**
 * @fileoverview Episodic Buffer implementation for episode-based memory
 * @module modules/memory/buffers/episodic-buffer
 * @requires ../types
 * @requires ../errors
 * 
 * This file implements an episodic buffer that organizes memory into
 * distinct episodes or chunks based on topic changes, time gaps, or
 * explicit boundaries. Useful for maintaining coherent memory segments.
 * 
 * @example
 * ```typescript
 * const buffer = new EpisodicBuffer('sess-123', 50);
 * 
 * await buffer.add({
 *   role: 'user',
 *   content: 'Let\'s talk about machine learning',
 *   metadata: { timestamp: new Date().toISOString() }
 * });
 * 
 * const episodes = buffer.getEpisodes();
 * const context = await buffer.getContext();
 * ```
 * 
 * @since 1.0.0
 */

import { IMemoryBuffer, MemoryBufferType, IMessage } from '../types';
import { MemoryBufferError } from '../errors';

/**
 * Represents an episode in memory.
 */
interface Episode {
  id: string;
  startTime: Date;
  endTime: Date;
  messages: IMessage[];
  topic?: string;
  summary?: string;
}

/**
 * Episodic Buffer implementation for episode-based memory.
 * 
 * Organizes conversation into discrete episodes based on topic changes,
 * time gaps, or explicit boundaries. Maintains episode summaries and
 * provides episode-aware context retrieval.
 * 
 * @public
 */
export class EpisodicBuffer implements IMemoryBuffer {
  public readonly type: MemoryBufferType = 'episodic';
  public readonly sessionId: string;
  public readonly maxSize: number;
  
  private episodes: Episode[] = [];
  private currentEpisode: Episode | null = null;
  private episodeTimeoutMs: number = 30 * 60 * 1000; // 30 minutes
  private maxEpisodeSize: number = 20;
  
  constructor(sessionId: string, maxSize: number = 50) {
    this.sessionId = sessionId;
    this.maxSize = maxSize;
    
    if (maxSize < 1) {
      throw new MemoryBufferError(
        sessionId,
        'episodic',
        'constructor',
        'Maximum size must be at least 1',
        undefined,
        { maxSize }
      );
    }
    
    this.maxEpisodeSize = Math.max(5, Math.floor(maxSize / 5)); // Episodes can be up to 1/5 of total size
  }
  
  /**
   * Adds a message to the episodic buffer.
   * Creates new episodes based on time gaps or topic changes.
   */
  async add(message: IMessage): Promise<void> {
    try {
      const messageTime = this.extractTimestamp(message);
      
      // Determine if we need a new episode
      if (this.shouldCreateNewEpisode(message, messageTime)) {
        await this.finalizeCurrentEpisode();
        this.createNewEpisode(messageTime);
      }
      
      // Add message to current episode
      if (!this.currentEpisode) {
        this.createNewEpisode(messageTime);
      }
      
      this.currentEpisode!.messages.push(message);
      this.currentEpisode!.endTime = messageTime;
      
      // Update episode topic if needed
      this.updateEpisodeTopic(message);
      
      // Trim episodes if we exceed capacity
      await this.trimEpisodes();
      
    } catch (error) {
      throw new MemoryBufferError(
        this.sessionId,
        this.type,
        'add',
        `Failed to add message to episodic buffer: ${error}`,
        error instanceof Error ? error : undefined,
        { 
          currentEpisodes: this.episodes.length,
          maxSize: this.maxSize
        }
      );
    }
  }
  
  /**
   * Retrieves all messages from all episodes.
   */
  async getMessages(): Promise<IMessage[]> {
    const allMessages: IMessage[] = [];
    
    // Add messages from completed episodes
    this.episodes.forEach(episode => {
      allMessages.push(...episode.messages);
    });
    
    // Add messages from current episode
    if (this.currentEpisode) {
      allMessages.push(...this.currentEpisode.messages);
    }
    
    return allMessages;
  }
  
  /**
   * Clears all episodes and messages.
   */
  async clear(): Promise<void> {
    this.episodes = [];
    this.currentEpisode = null;
  }
  
  /**
   * Gets context representation organized by episodes.
   */
  async getContext(): Promise<string> {
    const parts: string[] = [];
    
    // Add summaries of completed episodes
    this.episodes.forEach((episode, index) => {
      const episodeHeader = `Episode ${index + 1}`;
      const timeRange = `${episode.startTime.toLocaleTimeString()} - ${episode.endTime.toLocaleTimeString()}`;
      const topic = episode.topic ? ` (Topic: ${episode.topic})` : '';
      
      parts.push(`${episodeHeader} [${timeRange}]${topic}`);
      
      if (episode.summary) {
        parts.push(`Summary: ${episode.summary}`);
      } else {
        // Show recent messages from episode
        const recentMessages = episode.messages.slice(-3);
        const messageText = recentMessages
          .map(msg => `${msg.role}: ${msg.content}`)
          .join('\n');
        parts.push(messageText);
      }
    });
    
    // Add current episode if it exists
    if (this.currentEpisode && this.currentEpisode.messages.length > 0) {
      const episodeHeader = `Current Episode [${this.currentEpisode.startTime.toLocaleTimeString()} - ongoing]`;
      const topic = this.currentEpisode.topic ? ` (Topic: ${this.currentEpisode.topic})` : '';
      
      parts.push(`${episodeHeader}${topic}`);
      
      const messageText = this.currentEpisode.messages
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n');
      parts.push(messageText);
    }
    
    return parts.join('\n\n');
  }
  
  /**
   * Trims episodes by summarizing older ones.
   */
  async trim(): Promise<void> {
    // Finalize current episode if it's getting large
    if (this.currentEpisode && this.currentEpisode.messages.length >= this.maxEpisodeSize) {
      await this.finalizeCurrentEpisode();
    }
    
    // Summarize older episodes to save space
    const episodesToSummarize = this.episodes.filter(ep => !ep.summary && ep.messages.length > 5);
    
    for (const episode of episodesToSummarize) {
      episode.summary = await this.createEpisodeSummary(episode);
    }
    
    await this.trimEpisodes();
  }
  
  /**
   * Gets all episodes.
   * 
   * @returns Array of episodes
   */
  getEpisodes(): Episode[] {
    const allEpisodes = [...this.episodes];
    
    if (this.currentEpisode) {
      allEpisodes.push({ ...this.currentEpisode });
    }
    
    return allEpisodes;
  }
  
  /**
   * Gets the current active episode.
   * 
   * @returns Current episode or null
   */
  getCurrentEpisode(): Episode | null {
    return this.currentEpisode ? { ...this.currentEpisode } : null;
  }
  
  /**
   * Forces the creation of a new episode.
   */
  startNewEpisode(): void {
    const now = new Date();
    this.finalizeCurrentEpisode();
    this.createNewEpisode(now);
  }
  
  /**
   * Gets episode statistics.
   * 
   * @returns Episode statistics
   */
  getEpisodeStats(): {
    totalEpisodes: number;
    completedEpisodes: number;
    currentEpisodeMessages: number;
    averageEpisodeSize: number;
    totalMessages: number;
  } {
    const totalEpisodes = this.episodes.length + (this.currentEpisode ? 1 : 0);
    const currentEpisodeMessages = this.currentEpisode ? this.currentEpisode.messages.length : 0;
    
    const totalMessages = this.episodes.reduce((sum, ep) => sum + ep.messages.length, 0) + currentEpisodeMessages;
    const averageEpisodeSize = totalEpisodes > 0 ? totalMessages / totalEpisodes : 0;
    
    return {
      totalEpisodes,
      completedEpisodes: this.episodes.length,
      currentEpisodeMessages,
      averageEpisodeSize: Math.round(averageEpisodeSize * 100) / 100,
      totalMessages
    };
  }
  
  /**
   * Extracts timestamp from message.
   * 
   * @param message - Message to extract timestamp from
   * @returns Extracted timestamp or current time
   * @private
   */
  private extractTimestamp(message: IMessage): Date {
    if (message.metadata?.timestamp) {
      return new Date(message.metadata.timestamp);
    }
    return new Date();
  }
  
  /**
   * Determines if a new episode should be created.
   * 
   * @param message - New message
   * @param messageTime - Message timestamp
   * @returns True if new episode should be created
   * @private
   */
  private shouldCreateNewEpisode(message: IMessage, messageTime: Date): boolean {
    if (!this.currentEpisode) {
      return true;
    }
    
    // Check time gap
    const timeSinceLastMessage = messageTime.getTime() - this.currentEpisode.endTime.getTime();
    if (timeSinceLastMessage > this.episodeTimeoutMs) {
      return true;
    }
    
    // Check episode size
    if (this.currentEpisode.messages.length >= this.maxEpisodeSize) {
      return true;
    }
    
    // Check for topic change (simplified)
    if (this.detectTopicChange(message)) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Creates a new episode.
   * 
   * @param startTime - Episode start time
   * @private
   */
  private createNewEpisode(startTime: Date): void {
    this.currentEpisode = {
      id: this.generateEpisodeId(),
      startTime,
      endTime: startTime,
      messages: [],
      topic: undefined,
      summary: undefined
    };
  }
  
  /**
   * Finalizes the current episode by moving it to completed episodes.
   * 
   * @private
   */
  private async finalizeCurrentEpisode(): Promise<void> {
    if (!this.currentEpisode) {
      return;
    }
    
    // Generate summary for episodes with sufficient content
    if (this.currentEpisode.messages.length >= 3) {
      this.currentEpisode.summary = await this.createEpisodeSummary(this.currentEpisode);
    }
    
    this.episodes.push(this.currentEpisode);
    this.currentEpisode = null;
  }
  
  /**
   * Updates the topic for the current episode based on message content.
   * 
   * @param message - Message to analyze for topic
   * @private
   */
  private updateEpisodeTopic(message: IMessage): void {
    if (!this.currentEpisode || this.currentEpisode.topic) {
      return; // Already has a topic
    }
    
    // Simple topic extraction - look for key phrases
    const content = message.content.toLowerCase();
    const topics = [
      'machine learning', 'ai', 'data analysis', 'programming', 'coding',
      'database', 'api', 'authentication', 'security', 'performance',
      'testing', 'deployment', 'debugging', 'optimization', 'architecture'
    ];
    
    for (const topic of topics) {
      if (content.includes(topic)) {
        this.currentEpisode.topic = topic;
        break;
      }
    }
    
    // Fallback: use first few words of first user message
    if (!this.currentEpisode.topic && message.role === 'user' && this.currentEpisode.messages.length === 1) {
      const words = message.content.split(' ').slice(0, 3).join(' ');
      this.currentEpisode.topic = words;
    }
  }
  
  /**
   * Detects topic changes that might warrant a new episode.
   * 
   * @param message - Message to analyze
   * @returns True if topic change detected
   * @private
   */
  private detectTopicChange(message: IMessage): boolean {
    if (!this.currentEpisode || this.currentEpisode.messages.length === 0) {
      return false;
    }
    
    // Simple heuristics for topic change detection
    const content = message.content.toLowerCase();
    
    // Look for conversation transition phrases
    const transitionPhrases = [
      'let\'s talk about', 'now about', 'moving on to', 'next topic',
      'different question', 'another thing', 'changing subjects'
    ];
    
    return transitionPhrases.some(phrase => content.includes(phrase));
  }
  
  /**
   * Creates a summary for an episode.
   * 
   * @param episode - Episode to summarize
   * @returns Episode summary
   * @private
   */
  private async createEpisodeSummary(episode: Episode): Promise<string> {
    const messageCount = episode.messages.length;
    const userMessages = episode.messages.filter(m => m.role === 'user').length;
    const assistantMessages = episode.messages.filter(m => m.role === 'assistant').length;
    
    let summary = `Episode with ${messageCount} messages (${userMessages} user, ${assistantMessages} assistant)`;
    
    if (episode.topic) {
      summary += ` about ${episode.topic}`;
    }
    
    // Add time duration
    const duration = episode.endTime.getTime() - episode.startTime.getTime();
    const minutes = Math.floor(duration / 60000);
    if (minutes > 0) {
      summary += `, lasting ${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
    
    // Add key content from first and last messages
    if (episode.messages.length > 0) {
      const firstMsg = episode.messages[0];
      const lastMsg = episode.messages[episode.messages.length - 1];
      
      summary += `. Started: "${firstMsg.content.substring(0, 50)}${firstMsg.content.length > 50 ? '...' : ''}"`;
      
      if (episode.messages.length > 1) {
        summary += `. Ended: "${lastMsg.content.substring(0, 50)}${lastMsg.content.length > 50 ? '...' : ''}"`;
      }
    }
    
    return summary;
  }
  
  /**
   * Trims episodes to stay within memory limits.
   * 
   * @private
   */
  private async trimEpisodes(): Promise<void> {
    const totalMessages = this.episodes.reduce((sum, ep) => sum + ep.messages.length, 0) + 
                         (this.currentEpisode ? this.currentEpisode.messages.length : 0);
    
    if (totalMessages <= this.maxSize) {
      return;
    }
    
    // Remove oldest episodes until we're under the limit
    while (this.episodes.length > 0 && totalMessages > this.maxSize) {
      const removedEpisode = this.episodes.shift()!;
      // In a production system, we might store episode summaries elsewhere
    }
  }
  
  /**
   * Generates a unique episode ID.
   * 
   * @returns Unique episode identifier
   * @private
   */
  private generateEpisodeId(): string {
    return `ep-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  }
}