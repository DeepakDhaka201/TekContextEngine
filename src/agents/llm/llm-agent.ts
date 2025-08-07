/**
 * @fileoverview Main LLM Agent implementation
 * @module agents/llm/llm-agent
 * @requires ../base/base-agent
 * @requires ./types
 * @requires ./errors
 * @requires ./conversation-memory
 * @requires ../../modules/litellm/types
 * 
 * This file implements the LLMAgent class that provides direct interaction
 * with language models through the modular architecture. The agent supports
 * automatic model selection, memory management, tool usage, streaming
 * responses, and comprehensive error handling.
 * 
 * Key concepts:
 * - Extension of BaseAgent with LLM-specific functionality
 * - Automatic model routing and selection based on requirements
 * - Conversation memory management with intelligent trimming
 * - Tool integration with automatic execution and error handling
 * - Streaming support with real-time response delivery
 * - Response validation and safety checking
 * - Token management and cost optimization
 * 
 * @example
 * ```typescript
 * import { LLMAgent } from './llm-agent';
 * 
 * const agent = new LLMAgent({
 *   name: 'Assistant',
 *   model: {
 *     primary: 'gpt-4',
 *     routing: 'balanced'
 *   },
 *   prompting: {
 *     systemPrompt: 'You are a helpful AI assistant.'
 *   },
 *   memory: {
 *     enabled: true,
 *     maxMessages: 20
 *   },
 *   tools: {
 *     autoExecute: true
 *   }
 * });
 * 
 * const response = await agent.execute({
 *   prompt: 'What is machine learning?',
 *   sessionId: 'session-123'
 * });
 * ```
 * 
 * @see ../base/base-agent.ts for base agent functionality
 * @see types.ts for type definitions
 * @since 1.0.0
 */

import { EventEmitter } from 'events';
import { BaseAgent } from '../base/base-agent';
import { 
  LLMAgentConfig,
  LLMAgentInput,
  LLMAgentOutput,
  LLMAgentStreamOutput,
  LLMAgentCapabilities,
  LLMAgentType,
  ILLMAgent,
  ModelRouting,
  ToolResult,
  TokenUsage,
  LLMInternalResponse,
  LLMRequest,
  ConversationMemory as IConversationMemory,
  ModelSelectionContext,
  ResponseValidator,
  SafetyCheck
} from './types';
import { 
  AgentInput,
  AgentOutput,
  AgentStreamOutput,
  ExecutionContext,
  Message,
  ToolCall,
  AgentCapabilities
} from '../base/types';
import {
  LLMAgentError,
  ModelCompletionError,
  ModelStreamingError,
  ModelSelectionError,
  ToolExecutionError,
  MemoryError,
  ResponseValidationError,
  ContextLengthError,
  createLLMErrorContext
} from './errors';
import { ConversationMemory } from './conversation-memory';

/**
 * LLM Agent implementation for direct language model interaction.
 * 
 * The LLMAgent class provides comprehensive language model interaction
 * capabilities built on top of the BaseAgent foundation. It handles
 * model selection, conversation management, tool execution, streaming
 * responses, and safety validation in a unified interface.
 * 
 * Architecture:
 * - Extends BaseAgent for lifecycle and module integration
 * - Uses ConversationMemory for intelligent conversation management
 * - Integrates with LiteLLM module for model routing and execution
 * - Supports streaming with real-time response delivery
 * - Implements comprehensive error handling and recovery
 * - Provides safety and validation mechanisms
 * 
 * Core Features:
 * - Multi-model support with automatic routing
 * - Conversation memory with intelligent trimming
 * - Tool integration with automatic execution
 * - Streaming responses with chunk-based delivery
 * - Response validation and safety checking
 * - Token usage tracking and cost optimization
 * - Error handling with retry mechanisms
 * 
 * @example
 * ```typescript
 * // Create agent with comprehensive configuration
 * const agent = new LLMAgent({
 *   name: 'Research Assistant',
 *   description: 'AI assistant for research and analysis',
 *   model: {
 *     primary: 'gpt-4',
 *     fallback: ['gpt-3.5-turbo', 'claude-3-sonnet'],
 *     routing: 'quality'
 *   },
 *   prompting: {
 *     systemPrompt: 'You are a research assistant. Provide accurate, well-sourced information.',
 *     format: 'markdown',
 *     examples: [
 *       {
 *         input: 'What is quantum computing?',
 *         output: 'Quantum computing is a paradigm that uses quantum mechanics...'
 *       }
 *     ]
 *   },
 *   memory: {
 *     enabled: true,
 *     maxMessages: 30,
 *     summarizeAfter: 20
 *   },
 *   tools: {
 *     autoExecute: true,
 *     maxIterations: 3
 *   },
 *   behavior: {
 *     temperature: 0.3,
 *     maxTokens: 2000,
 *     responseValidation: (response) => response.length > 10
 *   }
 * });
 * 
 * // Initialize agent
 * await agent.initialize();
 * 
 * // Execute single completion
 * const response = await agent.execute({
 *   prompt: 'Explain machine learning algorithms',
 *   sessionId: 'research-session-1',
 *   tools: ['search', 'calculator']
 * });
 * 
 * // Stream response
 * for await (const chunk of agent.stream({
 *   prompt: 'Write a comprehensive guide on AI ethics',
 *   sessionId: 'research-session-1'
 * })) {
 *   process.stdout.write(chunk.delta);
 * }
 * ```
 * 
 * @public
 */
export class LLMAgent extends BaseAgent implements ILLMAgent {
  /** Agent type identifier */
  readonly type: LLMAgentType = 'llm';
  
  /** Agent configuration */
  protected config: Required<LLMAgentConfig>;
  
  /** Conversation memory instances by session */
  private conversationMemories: Map<string, ConversationMemory> = new Map();
  
  /** Active streaming sessions */
  private streamingSessions: Map<string, AbortController> = new Map();
  
  /** Model selection cache */
  private modelSelectionCache: Map<string, string> = new Map();
  
  /** Response validators */
  private validators: ResponseValidator[] = [];
  
  /** Safety checks */
  private safetyChecks: SafetyCheck[] = [];
  
  /** Performance metrics */
  private metrics = {
    totalCompletions: 0,
    totalTokens: 0,
    totalCost: 0,
    averageLatency: 0,
    errorRate: 0,
    cacheHitRate: 0
  };
  
  /**
   * Creates a new LLMAgent instance.
   * 
   * @param config - LLM agent configuration
   * @throws {LLMAgentError} If configuration is invalid
   */
  constructor(config: LLMAgentConfig) {
    super(config);
    
    // Apply comprehensive defaults
    this.config = this.applyDefaults(config);
    
    // Validate configuration
    this.validateConfiguration();
    
    // Initialize validators and safety checks
    this.initializeValidators();
    this.initializeSafetyChecks();
  }
  
  /**
   * Initializes the LLM agent with module dependencies.
   * 
   * Sets up connections to LiteLLM, memory, and other required modules.
   * 
   * @returns Promise that resolves when initialization is complete
   * @throws {LLMAgentError} If initialization fails
   */
  async initialize(): Promise<void> {
    console.log(`Initializing LLM Agent: ${this.name}`);
    
    try {
      // Initialize base agent
      await super.initialize();
      
      // Verify required modules are available
      if (!this.modules.litellm) {
        throw new LLMAgentError(
          'MISSING_DEPENDENCY',
          'LiteLLM module is required for LLM agent',
          { requiredModule: 'litellm' }
        );
      }
      
      if (this.config.memory.enabled && !this.modules.memory) {
        throw new LLMAgentError(
          'MISSING_DEPENDENCY',
          'Memory module is required when memory is enabled',
          { requiredModule: 'memory' }
        );
      }
      
      // Initialize model capabilities
      await this.initializeModelCapabilities();
      
      console.log(`✓ LLM Agent initialized: ${this.name}`, {
        primaryModel: this.config.model.primary,
        memoryEnabled: this.config.memory.enabled,
        toolsEnabled: this.config.tools.autoExecute,
        streamingEnabled: this.config.streaming.enabled
      });
      
    } catch (error) {
      console.error(`Failed to initialize LLM Agent: ${this.name}`, error);
      throw new LLMAgentError(
        'INITIALIZATION_FAILED',
        `LLM agent initialization failed: ${error instanceof Error ? error.message : String(error)}`,
        createLLMErrorContext(undefined, undefined, 'initialization'),
        undefined,
        undefined,
        undefined,
        error instanceof Error ? error : undefined
      );
    }
  }
  
  /**
   * Executes a completion request with full LLM capabilities.
   * 
   * Handles the complete LLM workflow including memory retrieval,
   * model selection, completion execution, tool handling, and
   * memory updates.
   * 
   * @param input - LLM agent input
   * @returns Promise resolving to LLM agent output
   * @throws {LLMAgentError} If execution fails
   */
  async execute(input: LLMAgentInput): Promise<LLMAgentOutput> {
    const startTime = Date.now();
    const context = this.createExecutionContext(input);
    
    try {
      // Validate input
      this.validateInput(input);
      
      // Clear memory if requested
      if (input.clearMemory) {
        await this.clearMemory(input.sessionId);
      }
      
      // Build messages array with memory and context
      const messages = await this.buildMessages(input);
      
      // Determine tools to make available
      const tools = await this.determineTools(input);
      
      // Select appropriate model
      const model = await this.selectModel(messages, tools, input);
      
      // Check context length limits
      await this.validateContextLength(messages, model);
      
      // Execute main LLM call
      let response = await this.callLLM(messages, tools, model, input);
      
      // Handle tool calls if present
      const toolResults = await this.handleToolCalls(response, input, context);
      
      // Update conversation memory
      const memoryUpdated = await this.updateMemory(input, response, toolResults);
      
      // Validate response if configured
      await this.validateResponse(response.message.content || '', input, context);
      
      // Update metrics
      this.updateMetrics(response, Date.now() - startTime);
      
      // Build final output
      const output: LLMAgentOutput = {
        content: response.message.content || '',
        model: response.model,
        toolCalls: response.toolCalls,
        toolResults,
        memoryUpdated,
        usage: response.usage,
        metadata: {
          duration: Date.now() - startTime,
          messageCount: messages.length,
          toolCount: tools.length,
          modelSelection: model,
          ...response.metadata
        }
      };
      
      console.log(`✓ LLM completion for ${this.name}`, {
        model: response.model,
        tokens: response.usage?.totalTokens,
        duration: Date.now() - startTime,
        tools: toolResults.length
      });
      
      return output;
      
    } catch (error) {
      this.metrics.errorRate = (this.metrics.errorRate + 1) / 2; // Moving average
      
      console.error(`LLM execution failed for ${this.name}:`, error);
      
      // Re-throw with context if not already an LLMAgentError
      if (!(error instanceof LLMAgentError)) {
        throw new LLMAgentError(
          'EXECUTION_FAILED',
          `LLM execution failed: ${error instanceof Error ? error.message : String(error)}`,
          createLLMErrorContext(undefined, input.sessionId, 'execute', {
            input: {
              prompt: input.prompt?.substring(0, 100),
              sessionId: input.sessionId,
              tools: input.tools
            },
            duration: Date.now() - startTime
          }),
          undefined,
          undefined,
          undefined,
          error instanceof Error ? error : undefined
        );
      }
      
      throw error;
    }
  }
  
  /**
   * Streams a completion request with real-time updates.
   * 
   * Provides real-time streaming of LLM responses with support
   * for tool calls and memory management.
   * 
   * @param input - LLM agent input
   * @returns Async iterator for streaming output
   * @throws {LLMAgentError} If streaming fails
   */
  async *stream(input: LLMAgentInput): AsyncIterableIterator<LLMAgentStreamOutput> {
    const startTime = Date.now();
    const streamId = `stream-${Date.now()}-${Math.random()}`;
    
    try {
      // Validate input and streaming capability
      this.validateInput(input);
      
      if (!this.config.streaming.enabled) {
        throw new ModelStreamingError(
          'unknown',
          'Streaming is not enabled for this agent',
          { agentName: this.name }
        );
      }
      
      // Set up abort controller for this stream
      const abortController = new AbortController();
      this.streamingSessions.set(streamId, abortController);
      
      // Build messages and determine tools
      const messages = await this.buildMessages(input);
      const tools = await this.determineTools(input);
      const model = await this.selectModel(messages, tools, input);
      
      // Initialize streaming state
      let accumulated = '';
      let toolCalls: ToolCall[] = [];
      let chunkCount = 0;
      const streamingMetadata = {
        startTime,
        firstByteTime: 0,
        chunks: [] as number[]
      };
      
      // Create streaming request
      const request: LLMRequest = {
        model,
        messages,
        tools: tools.length > 0 ? tools : undefined,
        tool_choice: tools.length > 0 ? 'auto' : undefined,
        temperature: input.modelOverride?.temperature || this.config.behavior.temperature,
        max_tokens: input.modelOverride?.maxTokens || this.config.behavior.maxTokens,
        top_p: this.config.behavior.topP,
        stop: this.config.behavior.stopSequences,
        stream: true,
        user: this.id,
        routing_hints: {
          priority: this.config.model.routing,
          required_capabilities: tools.length > 0 ? ['function_calling', 'streaming'] : ['streaming']
        }
      };
      
      // Start streaming
      console.log(`Starting stream for ${this.name} with model ${model}`);
      
      for await (const chunk of this.modules.litellm.streamComplete(request)) {
        // Check for abort
        if (abortController.signal.aborted) {
          break;
        }
        
        const chunkTime = Date.now();
        
        // Record first byte time
        if (chunkCount === 0) {
          streamingMetadata.firstByteTime = chunkTime - startTime;
        }
        
        streamingMetadata.chunks.push(chunkTime - startTime);
        chunkCount++;
        
        // Process content delta
        if (chunk.choices?.[0]?.delta?.content) {
          const delta = chunk.choices[0].delta.content;
          accumulated += delta;
          
          yield {
            delta,
            accumulated,
            finished: false,
            model,
            metadata: {
              chunkNumber: chunkCount,
              timestamp: chunkTime
            }
          };
        }
        
        // Process tool calls (more complex in streaming)
        if (chunk.choices?.[0]?.delta?.tool_calls) {
          // Handle streaming tool calls
          // This is complex and depends on the specific streaming format
          // For now, we'll collect them and process at the end
        }
        
        // Check for completion
        if (chunk.choices?.[0]?.finish_reason) {
          break;
        }
      }
      
      // Handle any tool calls that were collected
      if (toolCalls.length > 0) {
        const toolResults = await this.executeToolCalls(toolCalls, input);
        
        // If we have tool results, we might need to make another completion
        // For simplicity, we'll include them in the final output
        yield {
          delta: '',
          accumulated,
          finished: false,
          toolCalls,
          toolResults,
          model
        };
      }
      
      // Update memory after streaming completes
      let memoryUpdated = false;
      if (this.config.memory.enabled && input.includeMemory !== false) {
        await this.updateMemoryFromStream(input, accumulated);
        memoryUpdated = true;
      }
      
      // Calculate streaming metrics
      const totalDuration = Date.now() - startTime;
      const avgChunkTime = streamingMetadata.chunks.reduce((a, b) => a + b, 0) / streamingMetadata.chunks.length;
      
      // Final chunk with completion metadata
      yield {
        delta: '',
        accumulated,
        finished: true,
        model,
        memoryUpdated,
        metadata: {
          duration: totalDuration,
          chunkCount,
          firstByteLatency: streamingMetadata.firstByteTime,
          averageChunkLatency: avgChunkTime,
          totalTokensEstimate: Math.ceil(accumulated.length / 4)
        }
      };
      
      console.log(`✓ Stream completed for ${this.name}`, {
        model,
        duration: totalDuration,
        chunks: chunkCount,
        chars: accumulated.length
      });
      
    } catch (error) {
      console.error(`Streaming failed for ${this.name}:`, error);
      
      throw new ModelStreamingError(
        'unknown',
        `Streaming failed: ${error instanceof Error ? error.message : String(error)}`,
        createLLMErrorContext(undefined, input.sessionId, 'stream', {
          streamId,
          duration: Date.now() - startTime
        }),
        error instanceof Error ? error : undefined
      );
      
    } finally {
      // Clean up streaming session
      this.streamingSessions.delete(streamId);
    }
  }
  
  /**
   * Clears conversation memory for a session.
   * 
   * @param sessionId - Session identifier
   * @throws {MemoryError} If memory clearing fails
   */
  async clearMemory(sessionId: string): Promise<void> {
    try {
      // Clear local conversation memory
      this.conversationMemories.delete(sessionId);
      
      // Clear persistent memory if enabled
      if (this.config.memory.enabled && this.modules.memory) {
        await this.modules.memory.clearWorkingMemory(sessionId);
      }
      
      console.log(`✓ Memory cleared for session: ${sessionId}`);
      
    } catch (error) {
      throw new MemoryError(
        'clear',
        sessionId,
        `Failed to clear memory: ${error instanceof Error ? error.message : String(error)}`,
        { agentName: this.name },
        error instanceof Error ? error : undefined
      );
    }
  }
  
  /**
   * Gets conversation memory for a session.
   * 
   * @param sessionId - Session identifier
   * @returns Array of conversation messages
   */
  async getMemory(sessionId: string): Promise<Message[]> {
    const memory = this.conversationMemories.get(sessionId);
    if (memory) {
      return memory.getMessages();
    }
    
    // Try to load from persistent memory
    if (this.config.memory.enabled && this.modules.memory) {
      const memories = await this.modules.memory.getWorkingMemory({
        sessionId,
        limit: this.config.memory.maxMessages,
        types: ['user', 'assistant', 'system']
      });
      
      return memories.map(mem => ({
        role: mem.type as 'user' | 'assistant' | 'system',
        content: mem.content
      }));
    }
    
    return [];
  }
  
  /**
   * Estimates token count for input text or messages.
   * 
   * @param input - Input to estimate tokens for
   * @returns Estimated token count
   */
  async estimateTokens(input: string | Message[]): Promise<number> {
    try {
      if (typeof input === 'string') {
        // Simple estimation: ~4 characters per token
        return Math.ceil(input.length / 4);
      }
      
      // For messages, account for role tokens and formatting
      return input.reduce((total, message) => {
        const contentTokens = Math.ceil((message.content?.length || 0) / 4);
        const roleTokens = 4; // Approximate tokens for role and formatting
        return total + contentTokens + roleTokens;
      }, 0);
      
    } catch (error) {
      console.warn(`Token estimation failed: ${error}`);
      return 0;
    }
  }
  
  /**
   * Gets agent capabilities.
   * 
   * @returns LLM agent capabilities
   */
  getCapabilities(): LLMAgentCapabilities {
    return {
      ...super.getCapabilities(),
      maxContextLength: this.getMaxContextLength(),
      supportedModels: this.getSupportedModels(),
      supportsTools: true,
      supportsStreaming: this.config.streaming.enabled,
      supportsVision: false, // TODO: Add vision support
      supportsAudio: false,  // TODO: Add audio support
      supportedFormats: ['text', 'json', 'markdown', 'code'],
      maxToolIterations: this.config.tools.maxIterations
    };
  }
  
  // ============================================================================
  // Private Helper Methods
  // ============================================================================
  
  /**
   * Applies default configuration values.
   * 
   * @param config - Input configuration
   * @returns Configuration with defaults applied
   * @private
   */
  private applyDefaults(config: LLMAgentConfig): Required<LLMAgentConfig> {
    return {
      ...config,
      type: 'llm',
      model: {
        primary: config.model?.primary || 'gpt-3.5-turbo',
        fallback: config.model?.fallback || [],
        routing: config.model?.routing || 'balanced',
        parameters: config.model?.parameters || {}
      },
      prompting: {
        systemPrompt: config.prompting?.systemPrompt,
        promptTemplate: config.prompting?.promptTemplate,
        examples: config.prompting?.examples || [],
        format: config.prompting?.format || 'text',
        instructions: config.prompting?.instructions
      },
      memory: {
        enabled: config.memory?.enabled !== false,
        maxMessages: config.memory?.maxMessages || 20,
        summarizeAfter: config.memory?.summarizeAfter || 50,
        includeSystemPrompt: config.memory?.includeSystemPrompt !== false,
        persistence: config.memory?.persistence || 'session'
      },
      tools: {
        autoExecute: config.tools?.autoExecute !== false,
        requireConfirmation: config.tools?.requireConfirmation || [],
        maxIterations: config.tools?.maxIterations || 3,
        executionTimeout: config.tools?.executionTimeout || 30000,
        includeResults: config.tools?.includeResults !== false
      },
      behavior: {
        temperature: config.behavior?.temperature || 0.7,
        maxTokens: config.behavior?.maxTokens || 2000,
        topP: config.behavior?.topP || 1.0,
        topK: config.behavior?.topK,
        stopSequences: config.behavior?.stopSequences || [],
        frequencyPenalty: config.behavior?.frequencyPenalty || 0,
        presencePenalty: config.behavior?.presencePenalty || 0,
        responseValidation: config.behavior?.responseValidation,
        maxRetries: config.behavior?.maxRetries || 2
      },
      streaming: {
        enabled: config.streaming?.enabled !== false,
        bufferSize: config.streaming?.bufferSize || 1024,
        timeout: config.streaming?.timeout || 30000
      },
      safety: {
        moderation: config.safety?.moderation !== false,
        filterLevel: config.safety?.filterLevel || 'moderate',
        customChecks: config.safety?.customChecks || []
      },
      // Base agent fields
      name: config.name,
      description: config.description,
      version: config.version || '1.0.0',
      modules: config.modules || {}
    } as Required<LLMAgentConfig>;
  }
  
  /**
   * Validates agent configuration.
   * 
   * @throws {LLMAgentError} If configuration is invalid
   * @private
   */
  private validateConfiguration(): void {
    if (!this.config.name) {
      throw new LLMAgentError(
        'INVALID_CONFIGURATION',
        'Agent name is required'
      );
    }
    
    if (this.config.behavior.temperature < 0 || this.config.behavior.temperature > 2) {
      throw new LLMAgentError(
        'INVALID_CONFIGURATION',
        'Temperature must be between 0 and 2',
        { temperature: this.config.behavior.temperature }
      );
    }
    
    if (this.config.behavior.maxTokens <= 0) {
      throw new LLMAgentError(
        'INVALID_CONFIGURATION',
        'Max tokens must be positive',
        { maxTokens: this.config.behavior.maxTokens }
      );
    }
    
    if (this.config.memory.maxMessages <= 0) {
      throw new LLMAgentError(
        'INVALID_CONFIGURATION',
        'Max messages must be positive',
        { maxMessages: this.config.memory.maxMessages }
      );
    }
  }
  
  /**
   * Initializes response validators.
   * 
   * @private
   */
  private initializeValidators(): void {
    this.validators = [];
    
    // Add configured validator
    if (this.config.behavior.responseValidation) {
      this.validators.push(this.config.behavior.responseValidation);
    }
    
    // Add format validator
    if (this.config.prompting.format && this.config.prompting.format !== 'text') {
      this.validators.push(this.createFormatValidator(this.config.prompting.format));
    }
  }
  
  /**
   * Initializes safety checks.
   * 
   * @private
   */
  private initializeSafetyChecks(): void {
    this.safetyChecks = [];
    
    // Add basic safety check
    if (this.config.safety.moderation) {
      this.safetyChecks.push(this.createBasicSafetyCheck());
    }
    
    // Add custom safety checks
    this.safetyChecks.push(...(this.config.safety.customChecks || []));
  }
  
  /**
   * Initializes model capabilities.
   * 
   * @private
   */
  private async initializeModelCapabilities(): Promise<void> {
    // Initialize model metadata and capabilities
    // This would typically fetch model information from the LiteLLM module
    console.log(`Initializing model capabilities for ${this.config.model.primary}`);
  }
  
  /**
   * Creates execution context for a request.
   * 
   * @param input - Agent input
   * @returns Execution context
   * @private
   */
  private createExecutionContext(input: LLMAgentInput): ExecutionContext {
    return {
      sessionId: input.sessionId,
      requestId: `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      metadata: {
        agentName: this.name,
        agentType: this.type,
        model: this.config.model.primary
      }
    };
  }
  
  /**
   * Validates agent input.
   * 
   * @param input - Input to validate
   * @throws {LLMAgentError} If input is invalid
   * @private
   */
  private validateInput(input: LLMAgentInput): void {
    if (!input.prompt && !input.messages) {
      throw new LLMAgentError(
        'INVALID_INPUT',
        'Either prompt or messages must be provided',
        { input }
      );
    }
    
    if (!input.sessionId) {
      throw new LLMAgentError(
        'INVALID_INPUT',
        'Session ID is required',
        { input }
      );
    }
    
    if (input.modelOverride?.temperature !== undefined &&
        (input.modelOverride.temperature < 0 || input.modelOverride.temperature > 2)) {
      throw new LLMAgentError(
        'INVALID_INPUT',
        'Temperature override must be between 0 and 2',
        { temperature: input.modelOverride.temperature }
      );
    }
  }
  
  /**
   * Builds messages array for LLM request.
   * 
   * @param input - Agent input
   * @returns Array of messages
   * @private
   */
  private async buildMessages(input: LLMAgentInput): Promise<Message[]> {
    const messages: Message[] = [];
    
    // Add system prompt if configured
    if (this.config.prompting.systemPrompt) {
      messages.push({
        role: 'system',
        content: this.config.prompting.systemPrompt
      });
    }
    
    // Add conversation memory if enabled
    if (this.config.memory.enabled && input.includeMemory !== false) {
      const memoryMessages = await this.getRelevantMemory(input.sessionId);
      messages.push(...memoryMessages);
    }
    
    // Add examples if configured
    if (this.config.prompting.examples && this.config.prompting.examples.length > 0) {
      for (const example of this.config.prompting.examples) {
        messages.push(
          { role: 'user', content: example.input },
          { role: 'assistant', content: example.output }
        );
      }
    }
    
    // Add current input
    if (input.messages) {
      messages.push(...input.messages);
    } else if (input.prompt) {
      const formattedPrompt = this.formatPrompt(input.prompt, input);
      messages.push({
        role: 'user',
        content: formattedPrompt
      });
    }
    
    return messages;
  }
  
  /**
   * Determines which tools to make available for a request.
   * 
   * @param input - Agent input
   * @returns Array of tool definitions
   * @private
   */
  private async determineTools(input: LLMAgentInput): Promise<any[]> {
    if (!this.config.tools.autoExecute) {
      return [];
    }
    
    // If specific tools are requested, use those
    if (input.tools) {
      return this.resolveToolDefinitions(input.tools);
    }
    
    // Otherwise, use all available tools from modules
    const availableTools: any[] = [];
    
    // Add tools from modules
    for (const [moduleName, module] of Object.entries(this.modules)) {
      if (module && typeof module === 'object' && 'getToolDefinitions' in module) {
        const moduleTools = await (module as any).getToolDefinitions();
        if (Array.isArray(moduleTools)) {
          availableTools.push(...moduleTools);
        }
      }
    }
    
    return availableTools;
  }
  
  /**
   * Selects the most appropriate model for a request.
   * 
   * @param messages - Message array
   * @param tools - Available tools
   * @param input - Agent input
   * @returns Selected model identifier
   * @private
   */
  private async selectModel(messages: Message[], tools: any[], input: LLMAgentInput): Promise<string> {
    // Use override if provided
    if (input.modelOverride?.model) {
      return input.modelOverride.model;
    }
    
    // Check cache first
    const cacheKey = this.createModelSelectionCacheKey(messages, tools, input);
    const cached = this.modelSelectionCache.get(cacheKey);
    if (cached) {
      return cached;
    }
    
    // Determine requirements
    const context: ModelSelectionContext = {
      messageCount: messages.length,
      estimatedTokens: await this.estimateTokens(messages),
      requiresTools: tools.length > 0,
      preferredRouting: this.config.model.routing,
      requiresStreaming: input.streaming || this.config.streaming.enabled
    };
    
    // Select based on routing strategy
    const selectedModel = await this.selectModelByRouting(context);
    
    // Cache the selection
    this.modelSelectionCache.set(cacheKey, selectedModel);
    
    return selectedModel;
  }
  
  /**
   * Validates context length limits.
   * 
   * @param messages - Message array
   * @param model - Selected model
   * @throws {ContextLengthError} If context is too long
   * @private
   */
  private async validateContextLength(messages: Message[], model: string): Promise<void> {
    const estimatedTokens = await this.estimateTokens(messages);
    const maxContextLength = this.getModelContextLength(model);
    
    if (estimatedTokens > maxContextLength) {
      throw new ContextLengthError(
        model,
        estimatedTokens,
        maxContextLength,
        'Context length exceeds model limits'
      );
    }
  }
  
  /**
   * Calls the LLM with the prepared request.
   * 
   * @param messages - Message array
   * @param tools - Available tools
   * @param model - Selected model
   * @param input - Agent input
   * @returns LLM response
   * @private
   */
  private async callLLM(
    messages: Message[],
    tools: any[],
    model: string,
    input: LLMAgentInput
  ): Promise<LLMInternalResponse> {
    const request: LLMRequest = {
      model,
      messages,
      tools: tools.length > 0 ? tools : undefined,
      tool_choice: tools.length > 0 ? 'auto' : undefined,
      temperature: input.modelOverride?.temperature || this.config.behavior.temperature,
      max_tokens: input.modelOverride?.maxTokens || this.config.behavior.maxTokens,
      top_p: this.config.behavior.topP,
      frequency_penalty: this.config.behavior.frequencyPenalty,
      presence_penalty: this.config.behavior.presencePenalty,
      stop: this.config.behavior.stopSequences,
      user: this.id,
      routing_hints: {
        priority: this.config.model.routing,
        required_capabilities: tools.length > 0 ? ['function_calling'] : []
      }
    };
    
    try {
      const response = await this.modules.litellm.complete(request);
      
      return {
        message: response.choices[0].message,
        model: response.model,
        usage: response.usage ? {
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens,
          cost: response.usage.cost
        } : undefined,
        metadata: {
          requestId: response.id,
          created: response.created,
          finishReason: response.choices[0].finish_reason
        }
      };
    } catch (error) {
      throw new ModelCompletionError(
        model,
        `Model completion failed: ${error instanceof Error ? error.message : String(error)}`,
        createLLMErrorContext(model, input.sessionId, 'completion'),
        error instanceof Error ? error : undefined
      );
    }
  }
  
  /**
   * Handles tool calls in the response.
   * 
   * @param response - LLM response
   * @param input - Agent input
   * @param context - Execution context
   * @returns Tool results
   * @private
   */
  private async handleToolCalls(
    response: LLMInternalResponse,
    input: LLMAgentInput,
    context: ExecutionContext
  ): Promise<ToolResult[]> {
    if (!response.message.tool_calls || response.message.tool_calls.length === 0) {
      return [];
    }
    
    const toolCalls: ToolCall[] = response.message.tool_calls.map(tc => ({
      id: tc.id,
      name: tc.function.name,
      arguments: tc.function.arguments
    }));
    
    return await this.executeToolCalls(toolCalls, input);
  }
  
  /**
   * Executes tool calls.
   * 
   * @param toolCalls - Tool calls to execute
   * @param input - Agent input
   * @returns Tool results
   * @private
   */
  private async executeToolCalls(toolCalls: ToolCall[], input: LLMAgentInput): Promise<ToolResult[]> {
    const results: ToolResult[] = [];
    
    for (const toolCall of toolCalls) {
      try {
        // Check if this tool requires confirmation
        const requiresConfirmation = this.config.tools.requireConfirmation.includes(toolCall.name);
        
        if (requiresConfirmation) {
          // TODO: Implement confirmation flow
          console.log(`Tool ${toolCall.name} requires confirmation - skipping for now`);
          results.push({
            toolCallId: toolCall.id,
            success: false,
            error: 'Tool execution requires user confirmation',
            executionTime: 0
          });
          continue;
        }
        
        // Find and execute the tool
        const startTime = Date.now();
        const result = await this.executeTool(toolCall);
        const executionTime = Date.now() - startTime;
        
        results.push({
          toolCallId: toolCall.id,
          success: true,
          result,
          executionTime
        });
        
      } catch (error) {
        results.push({
          toolCallId: toolCall.id,
          success: false,
          error: error instanceof Error ? error.message : String(error),
          executionTime: 0
        });
      }
    }
    
    return results;
  }
  
  /**
   * Executes a single tool call.
   * 
   * @param toolCall - Tool call to execute
   * @returns Tool result
   * @private
   */
  private async executeTool(toolCall: ToolCall): Promise<any> {
    // Find the tool in available modules
    for (const [moduleName, module] of Object.entries(this.modules)) {
      if (module && typeof module === 'object' && 'executeTool' in module) {
        try {
          const result = await (module as any).executeTool(toolCall.name, toolCall.arguments);
          if (result !== undefined) {
            return result;
          }
        } catch (error) {
          // Continue to next module
        }
      }
    }
    
    throw new ToolExecutionError(
      toolCall.name,
      toolCall.arguments,
      `Tool not found: ${toolCall.name}`
    );
  }
  
  /**
   * Updates conversation memory.
   * 
   * @param input - Agent input
   * @param response - LLM response
   * @param toolResults - Tool results
   * @returns Whether memory was updated
   * @private
   */
  private async updateMemory(
    input: LLMAgentInput,
    response: LLMInternalResponse,
    toolResults: ToolResult[]
  ): Promise<boolean> {
    if (!this.config.memory.enabled || input.includeMemory === false) {
      return false;
    }
    
    try {
      // Get or create conversation memory
      let memory = this.conversationMemories.get(input.sessionId);
      if (!memory) {
        memory = new ConversationMemory({
          maxMessages: this.config.memory.maxMessages,
          summarizeAfter: this.config.memory.summarizeAfter
        });
        this.conversationMemories.set(input.sessionId, memory);
      }
      
      // Add user message
      if (input.prompt) {
        memory.add({
          role: 'user',
          content: input.prompt,
          timestamp: new Date()
        });
      } else if (input.messages) {
        for (const msg of input.messages) {
          memory.add({
            role: msg.role,
            content: msg.content || '',
            timestamp: new Date()
          });
        }
      }
      
      // Add assistant response
      memory.add({
        role: 'assistant',
        content: response.message.content || '',
        timestamp: new Date()
      });
      
      // Add tool results if configured
      if (this.config.tools.includeResults && toolResults.length > 0) {
        const toolSummary = toolResults.map(tr => 
          `Tool ${tr.toolCallId}: ${tr.success ? 'success' : 'failed'}`
        ).join(', ');
        
        memory.add({
          role: 'system',
          content: `Tool execution summary: ${toolSummary}`,
          timestamp: new Date()
        });
      }
      
      return true;
      
    } catch (error) {
      console.error(`Memory update failed for session ${input.sessionId}:`, error);
      return false;
    }
  }
  
  /**
   * Updates memory from streaming response.
   * 
   * @param input - Agent input
   * @param content - Final content
   * @private
   */
  private async updateMemoryFromStream(input: LLMAgentInput, content: string): Promise<void> {
    if (!this.config.memory.enabled || input.includeMemory === false) {
      return;
    }
    
    // Get or create conversation memory
    let memory = this.conversationMemories.get(input.sessionId);
    if (!memory) {
      memory = new ConversationMemory({
        maxMessages: this.config.memory.maxMessages,
        summarizeAfter: this.config.memory.summarizeAfter
      });
      this.conversationMemories.set(input.sessionId, memory);
    }
    
    // Add user message
    if (input.prompt) {
      memory.add({
        role: 'user',
        content: input.prompt,
        timestamp: new Date()
      });
    }
    
    // Add assistant response
    memory.add({
      role: 'assistant',
      content,
      timestamp: new Date()
    });
  }
  
  /**
   * Validates response content.
   * 
   * @param content - Response content
   * @param input - Agent input
   * @param context - Execution context
   * @throws {ResponseValidationError} If validation fails
   * @private
   */
  private async validateResponse(content: string, input: LLMAgentInput, context: ExecutionContext): Promise<void> {
    // Run all configured validators
    for (const validator of this.validators) {
      const validationContext = {
        content,
        input,
        context,
        agentName: this.name
      };
      
      try {
        const isValid = await validator(validationContext);
        if (!isValid) {
          throw new ResponseValidationError(
            'Response failed validation',
            { validator: validator.name }
          );
        }
      } catch (error) {
        if (error instanceof ResponseValidationError) {
          throw error;
        }
        throw new ResponseValidationError(
          `Validation error: ${error instanceof Error ? error.message : String(error)}`,
          { validator: validator.name }
        );
      }
    }
    
    // Run safety checks
    for (const safetyCheck of this.safetyChecks) {
      const safetyContext = {
        content,
        input,
        context,
        agentName: this.name
      };
      
      const result = await safetyCheck(safetyContext);
      if (!result.passed) {
        throw new ResponseValidationError(
          `Safety check failed: ${result.reason}`,
          { safetyCheck: result.checkName }
        );
      }
    }
  }
  
  /**
   * Updates performance metrics.
   * 
   * @param response - LLM response
   * @param duration - Request duration
   * @private
   */
  private updateMetrics(response: LLMInternalResponse, duration: number): void {
    this.metrics.totalCompletions++;
    this.metrics.totalTokens += response.usage?.totalTokens || 0;
    this.metrics.totalCost += response.usage?.cost || 0;
    this.metrics.averageLatency = (this.metrics.averageLatency + duration) / 2; // Moving average
  }
  
  /**
   * Gets relevant memory for a session.
   * 
   * @param sessionId - Session identifier
   * @returns Array of relevant messages
   * @private
   */
  private async getRelevantMemory(sessionId: string): Promise<Message[]> {
    const memory = this.conversationMemories.get(sessionId);
    if (memory) {
      return memory.getMessages();
    }
    
    // Try to load from persistent memory
    if (this.modules.memory) {
      const memories = await this.modules.memory.getWorkingMemory({
        sessionId,
        limit: this.config.memory.maxMessages,
        types: ['user', 'assistant', 'system']
      });
      
      return memories.map(mem => ({
        role: mem.type as 'user' | 'assistant' | 'system',
        content: mem.content
      }));
    }
    
    return [];
  }
  
  /**
   * Formats prompt using configured template.
   * 
   * @param prompt - Raw prompt
   * @param input - Agent input
   * @returns Formatted prompt
   * @private
   */
  private formatPrompt(prompt: string, input: LLMAgentInput): string {
    if (!this.config.prompting.promptTemplate) {
      return prompt;
    }
    
    let formatted = this.config.prompting.promptTemplate;
    
    // Replace template variables
    formatted = formatted.replace('{prompt}', prompt);
    formatted = formatted.replace('{format}', this.config.prompting.format || 'text');
    formatted = formatted.replace('{instructions}', this.config.prompting.instructions || '');
    
    // Add format instructions if specified
    if (this.config.prompting.format && this.config.prompting.format !== 'text') {
      formatted += `\n\nPlease respond in ${this.config.prompting.format} format.`;
    }
    
    return formatted;
  }
  
  /**
   * Gets maximum context length for a model.
   * 
   * @param model - Model identifier
   * @returns Maximum context length
   * @private
   */
  private getModelContextLength(model: string): number {
    const modelLimits: Record<string, number> = {
      'gpt-4': 8192,
      'gpt-4-32k': 32768,
      'gpt-3.5-turbo': 4096,
      'gpt-3.5-turbo-16k': 16384,
      'claude-3-opus': 200000,
      'claude-3-sonnet': 200000,
      'claude-3-haiku': 200000
    };
    
    return modelLimits[model] || 4096;
  }
  
  /**
   * Gets maximum context length across all supported models.
   * 
   * @returns Maximum context length
   * @private
   */
  private getMaxContextLength(): number {
    return 200000; // Claude-3 context length
  }
  
  /**
   * Gets list of supported models.
   * 
   * @returns Array of supported model identifiers
   * @private
   */
  private getSupportedModels(): string[] {
    return [
      'gpt-4',
      'gpt-4-32k',
      'gpt-3.5-turbo',
      'gpt-3.5-turbo-16k',
      'claude-3-opus',
      'claude-3-sonnet',
      'claude-3-haiku'
    ];
  }
  
  /**
   * Resolves tool definitions from names.
   * 
   * @param toolNames - Array of tool names
   * @returns Array of tool definitions
   * @private
   */
  private async resolveToolDefinitions(toolNames: string[]): Promise<any[]> {
    const definitions: any[] = [];
    
    for (const toolName of toolNames) {
      // Find tool definition in modules
      for (const [moduleName, module] of Object.entries(this.modules)) {
        if (module && typeof module === 'object' && 'getToolDefinition' in module) {
          try {
            const definition = await (module as any).getToolDefinition(toolName);
            if (definition) {
              definitions.push(definition);
              break;
            }
          } catch (error) {
            // Continue to next module
          }
        }
      }
    }
    
    return definitions;
  }
  
  /**
   * Creates model selection cache key.
   * 
   * @param messages - Message array
   * @param tools - Available tools
   * @param input - Agent input
   * @returns Cache key
   * @private
   */
  private createModelSelectionCacheKey(messages: Message[], tools: any[], input: LLMAgentInput): string {
    const key = [
      messages.length,
      tools.length,
      this.config.model.routing,
      input.modelOverride?.model || 'default'
    ].join('|');
    
    return key;
  }
  
  /**
   * Selects model based on routing strategy.
   * 
   * @param context - Model selection context
   * @returns Selected model
   * @private
   */
  private async selectModelByRouting(context: ModelSelectionContext): Promise<string> {
    const { preferredRouting, estimatedTokens, requiresTools, requiresStreaming } = context;
    
    switch (preferredRouting) {
      case 'cost':
        return this.selectCostOptimalModel(context);
      case 'quality':
        return this.selectQualityOptimalModel(context);
      case 'speed':
        return this.selectSpeedOptimalModel(context);
      case 'balanced':
        return this.selectBalancedModel(context);
      default:
        return this.config.model.primary;
    }
  }
  
  /**
   * Selects cost-optimal model.
   * 
   * @param context - Selection context
   * @returns Cost-optimal model
   * @private
   */
  private selectCostOptimalModel(context: ModelSelectionContext): string {
    // For cost optimization, prefer cheaper models when possible
    if (context.estimatedTokens < 4000 && !context.requiresTools) {
      return 'gpt-3.5-turbo';
    }
    return this.config.model.primary;
  }
  
  /**
   * Selects quality-optimal model.
   * 
   * @param context - Selection context
   * @returns Quality-optimal model
   * @private
   */
  private selectQualityOptimalModel(context: ModelSelectionContext): string {
    // For quality, prefer the best available model
    const qualityOrder = ['gpt-4', 'claude-3-opus', 'claude-3-sonnet', 'gpt-3.5-turbo'];
    const supportedModels = this.getSupportedModels();
    
    for (const model of qualityOrder) {
      if (supportedModels.includes(model)) {
        return model;
      }
    }
    
    return this.config.model.primary;
  }
  
  /**
   * Selects speed-optimal model.
   * 
   * @param context - Selection context
   * @returns Speed-optimal model
   * @private
   */
  private selectSpeedOptimalModel(context: ModelSelectionContext): string {
    // For speed, prefer faster models
    const speedOrder = ['gpt-3.5-turbo', 'claude-3-haiku', 'gpt-4'];
    const supportedModels = this.getSupportedModels();
    
    for (const model of speedOrder) {
      if (supportedModels.includes(model)) {
        return model;
      }
    }
    
    return this.config.model.primary;
  }
  
  /**
   * Selects balanced model.
   * 
   * @param context - Selection context
   * @returns Balanced model choice
   * @private
   */
  private selectBalancedModel(context: ModelSelectionContext): string {
    // Balance cost, quality, and speed
    if (context.estimatedTokens < 2000) {
      return 'gpt-3.5-turbo'; // Fast and cheap for simple requests
    } else if (context.requiresTools || context.estimatedTokens > 8000) {
      return 'gpt-4'; // Quality for complex requests
    } else {
      return this.config.model.primary; // Use configured primary
    }
  }
  
  /**
   * Creates format validator.
   * 
   * @param format - Expected format
   * @returns Format validator function
   * @private
   */
  private createFormatValidator(format: ResponseFormat): ResponseValidator {
    return async (context) => {
      const { content } = context;
      
      switch (format) {
        case 'json':
          try {
            JSON.parse(content);
            return true;
          } catch {
            return false;
          }
        case 'markdown':
          // Basic markdown validation (has headers or lists)
          return /^#+\s|\*\s|-\s|^\d+\.\s/m.test(content);
        case 'code':
          // Basic code validation (has code blocks)
          return /```[\s\S]*```/.test(content);
        default:
          return true;
      }
    };
  }
  
  /**
   * Creates basic safety check.
   * 
   * @returns Basic safety check function
   * @private
   */
  private createBasicSafetyCheck(): SafetyCheck {
    return async (context) => {
      const { content } = context;
      
      // Basic content length check
      if (content.length > 50000) {
        return {
          passed: false,
          reason: 'Response too long',
          checkName: 'basic-safety'
        };
      }
      
      return {
        passed: true,
        checkName: 'basic-safety'
      };
    };
  }
}