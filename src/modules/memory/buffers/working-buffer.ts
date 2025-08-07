/**
 * @fileoverview Working Buffer implementation for current working context
 * @module modules/memory/buffers/working-buffer
 * @requires ../types
 * @requires ../errors
 * 
 * This file implements a working buffer that maintains the current working
 * context including active variables, intermediate results, and execution state.
 * Optimized for workflow continuation and agent reasoning chains.
 * 
 * @example
 * ```typescript
 * const buffer = new WorkingBuffer('sess-123', 25);
 * 
 * await buffer.add({
 *   role: 'assistant',
 *   content: 'Processing your request...',
 *   metadata: { 
 *     reasoning: 'User asked for analysis, retrieving data',
 *     variables: { query: 'user input' }
 *   }
 * });
 * 
 * const context = await buffer.getContext();
 * ```
 * 
 * @since 1.0.0
 */

import { IMemoryBuffer, MemoryBufferType, IMessage } from '../types';
import { MemoryBufferError } from '../errors';

/**
 * Working Buffer implementation for current working context.
 * 
 * Maintains the current working context with focus on recent activity,
 * agent reasoning, and workflow state. Optimized for real-time operations
 * and workflow continuation scenarios.
 * 
 * @public
 */
export class WorkingBuffer implements IMemoryBuffer {
  public readonly type: MemoryBufferType = 'working';
  public readonly sessionId: string;
  public readonly maxSize: number;
  
  private messages: IMessage[] = [];
  private workingVariables: Record<string, any> = {};
  private currentStep: string | null = null;
  private reasoningChain: string[] = [];
  
  constructor(sessionId: string, maxSize: number = 25) {
    this.sessionId = sessionId;
    this.maxSize = maxSize;
    
    if (maxSize < 1) {
      throw new MemoryBufferError(
        sessionId,
        'working',
        'constructor',
        'Maximum size must be at least 1',
        undefined,
        { maxSize }
      );
    }
  }
  
  /**
   * Adds a message to the working buffer.
   * Extracts and maintains working context from message metadata.
   */
  async add(message: IMessage): Promise<void> {
    try {
      this.messages.push(message);
      
      // Extract working context from message metadata
      if (message.metadata) {
        this.extractWorkingContext(message.metadata);
      }
      
      // Maintain buffer size
      while (this.messages.length > this.maxSize) {
        this.messages.shift();
      }
      
    } catch (error) {
      throw new MemoryBufferError(
        this.sessionId,
        this.type,
        'add',
        `Failed to add message to working buffer: ${error}`,
        error instanceof Error ? error : undefined,
        { currentSize: this.messages.length, maxSize: this.maxSize }
      );
    }
  }
  
  /**
   * Retrieves all messages in the working buffer.
   */
  async getMessages(): Promise<IMessage[]> {
    return [...this.messages];
  }
  
  /**
   * Clears all messages and working context.
   */
  async clear(): Promise<void> {
    this.messages = [];
    this.workingVariables = {};
    this.currentStep = null;
    this.reasoningChain = [];
  }
  
  /**
   * Gets context representation focusing on current working state.
   */
  async getContext(): Promise<string> {
    const parts: string[] = [];
    
    // Current step information
    if (this.currentStep) {
      parts.push(`Current Step: ${this.currentStep}`);
    }
    
    // Working variables
    if (Object.keys(this.workingVariables).length > 0) {
      const variables = Object.entries(this.workingVariables)
        .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
        .join(', ');
      parts.push(`Working Variables: {${variables}}`);
    }
    
    // Recent reasoning chain
    if (this.reasoningChain.length > 0) {
      const recentReasoning = this.reasoningChain.slice(-3).join(' → ');
      parts.push(`Reasoning Chain: ${recentReasoning}`);
    }
    
    // Recent messages (focus on last few)
    if (this.messages.length > 0) {
      const recentMessages = this.messages.slice(-5);
      const messageContext = recentMessages
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n');
      parts.push(`Recent Activity:\n${messageContext}`);
    }
    
    return parts.join('\n\n');
  }
  
  /**
   * Trims the buffer to maintain focus on most recent working context.
   */
  async trim(): Promise<void> {
    const targetSize = Math.max(1, Math.floor(this.maxSize * 0.6)); // Keep 60% of max
    
    while (this.messages.length > targetSize) {
      this.messages.shift();
    }
    
    // Trim reasoning chain to keep it focused
    while (this.reasoningChain.length > 10) {
      this.reasoningChain.shift();
    }
  }
  
  /**
   * Sets a working variable.
   * 
   * @param key - Variable key
   * @param value - Variable value
   */
  setVariable(key: string, value: any): void {
    this.workingVariables[key] = value;
  }
  
  /**
   * Gets a working variable.
   * 
   * @param key - Variable key
   * @returns Variable value or undefined
   */
  getVariable(key: string): any {
    return this.workingVariables[key];
  }
  
  /**
   * Gets all working variables.
   * 
   * @returns Copy of working variables object
   */
  getVariables(): Record<string, any> {
    return { ...this.workingVariables };
  }
  
  /**
   * Sets the current working step.
   * 
   * @param step - Current step description
   */
  setCurrentStep(step: string | null): void {
    this.currentStep = step;
  }
  
  /**
   * Gets the current working step.
   * 
   * @returns Current step or null
   */
  getCurrentStep(): string | null {
    return this.currentStep;
  }
  
  /**
   * Adds an entry to the reasoning chain.
   * 
   * @param reasoning - Reasoning step description
   */
  addReasoning(reasoning: string): void {
    this.reasoningChain.push(reasoning);
    
    // Keep reasoning chain manageable
    while (this.reasoningChain.length > 20) {
      this.reasoningChain.shift();
    }
  }
  
  /**
   * Gets the current reasoning chain.
   * 
   * @returns Array of reasoning steps
   */
  getReasoningChain(): string[] {
    return [...this.reasoningChain];
  }
  
  /**
   * Gets the most recent reasoning step.
   * 
   * @returns Most recent reasoning or null
   */
  getLastReasoning(): string | null {
    return this.reasoningChain.length > 0 ? 
      this.reasoningChain[this.reasoningChain.length - 1] : null;
  }
  
  /**
   * Gets working context summary for quick reference.
   * 
   * @returns Condensed working context
   */
  getWorkingSummary(): {
    currentStep: string | null;
    variableCount: number;
    recentMessages: number;
    lastReasoning: string | null;
    activeVariables: string[];
  } {
    return {
      currentStep: this.currentStep,
      variableCount: Object.keys(this.workingVariables).length,
      recentMessages: this.messages.length,
      lastReasoning: this.getLastReasoning(),
      activeVariables: Object.keys(this.workingVariables)
    };
  }
  
  /**
   * Checks if the buffer has active working context.
   * 
   * @returns True if there's active working context
   */
  hasActiveContext(): boolean {
    return this.currentStep !== null || 
           Object.keys(this.workingVariables).length > 0 || 
           this.reasoningChain.length > 0 ||
           this.messages.length > 0;
  }
  
  /**
   * Exports working context for persistence or transfer.
   * 
   * @returns Working context export
   */
  exportWorkingContext(): {
    sessionId: string;
    currentStep: string | null;
    workingVariables: Record<string, any>;
    reasoningChain: string[];
    messageCount: number;
    exportedAt: string;
  } {
    return {
      sessionId: this.sessionId,
      currentStep: this.currentStep,
      workingVariables: { ...this.workingVariables },
      reasoningChain: [...this.reasoningChain],
      messageCount: this.messages.length,
      exportedAt: new Date().toISOString()
    };
  }
  
  /**
   * Imports working context from export.
   * 
   * @param context - Working context to import
   */
  importWorkingContext(context: {
    currentStep?: string | null;
    workingVariables?: Record<string, any>;
    reasoningChain?: string[];
  }): void {
    if (context.currentStep !== undefined) {
      this.currentStep = context.currentStep;
    }
    
    if (context.workingVariables) {
      this.workingVariables = { ...context.workingVariables };
    }
    
    if (context.reasoningChain) {
      this.reasoningChain = [...context.reasoningChain];
    }
  }
  
  /**
   * Extracts working context from message metadata.
   * 
   * @param metadata - Message metadata
   * @private
   */
  private extractWorkingContext(metadata: any): void {
    // Extract reasoning information
    if (metadata.reasoning) {
      this.addReasoning(metadata.reasoning);
    }
    
    if (metadata.agentReasoning) {
      this.addReasoning(metadata.agentReasoning);
    }
    
    // Extract variables
    if (metadata.variables) {
      Object.assign(this.workingVariables, metadata.variables);
    }
    
    // Extract current step
    if (metadata.currentStep) {
      this.setCurrentStep(metadata.currentStep);
    }
    
    if (metadata.nodeId) {
      this.setCurrentStep(`Node: ${metadata.nodeId}`);
    }
    
    // Extract tool call information
    if (metadata.toolCall) {
      this.addReasoning(`Tool called: ${metadata.toolCall}`);
    }
    
    if (metadata.usedTools && Array.isArray(metadata.usedTools)) {
      metadata.usedTools.forEach((tool: any) => {
        this.addReasoning(`Used tool: ${tool.name || tool}`);
      });
    }
    
    // Extract execution context
    if (metadata.executionId) {
      this.setVariable('executionId', metadata.executionId);
    }
    
    if (metadata.agentId) {
      this.setVariable('agentId', metadata.agentId);
    }
  }
}