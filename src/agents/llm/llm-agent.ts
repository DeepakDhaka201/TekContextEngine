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
  AgentResult,
  AgentStreamOutput,
  ExecutionContext,
  Message,
  ToolCall,
  ToolResult,
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
import { ILangfuseModule, ITrace, ISpan } from '../../modules/langfuse/types';
import { generateId } from '../../shared/utils';

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
  
  /** Agent name - required by BaseAgent */
  readonly name: string;
  
  /** Agent version - required by BaseAgent */
  readonly version: string = '1.0.0';
  
  /** Agent capabilities - required by BaseAgent (string[] for compatibility) */
  readonly capabilities: string[] = [
    'text-generation', 
    'conversation', 
    'llm-completion', 
    'tool-execution',
    'streaming',
    'memory-management'
  ];
  
  /** LLM-specific detailed capabilities - required by ILLMAgent */
  readonly llmCapabilities: LLMAgentCapabilities = {
    maxContextLength: 4096,
    supportedModels: ['gpt-3.5-turbo', 'gpt-4', 'claude-3-sonnet'],
    supportsTools: true,
    supportsStreaming: true,
    supportsMemory: true,
    supportsVision: false,
    supportedFormats: ['text', 'json', 'markdown', 'code'],
    maxToolIterations: 5,
    custom: {}
  };
  
  /** Agent configuration */
  protected config: Required<LLMAgentConfig>;
  
  /** Available modules */
  protected modules: Record<string, any> = {};
  
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
  
  /** LLM-specific performance metrics */
  private llmMetrics = {
    totalCompletions: 0,
    totalTokens: 0,
    totalCost: 0,
    averageLatency: 0,
    errorRate: 0,
    cacheHitRate: 0
  };

  /** Langfuse module for tracing and observability */
  private langfuseModule?: ILangfuseModule;

  /** Current trace for session context */
  private sessionTraces: Map<string, ITrace> = new Map();
  
  /**
   * Creates a new LLMAgent instance.
   * 
   * @param config - LLM agent configuration
   * @throws {LLMAgentError} If configuration is invalid
   */
  constructor(config: LLMAgentConfig) {
    // BaseAgent constructor takes an optional id string
    super(config.id);
    
    // Set required properties
    this.name = config.name;
    
    // Apply comprehensive defaults
    this.config = this.applyDefaults(config);
    
    // Validate configuration
    this.validateLLMConfiguration();
    
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
  protected async performInitialization(config: any): Promise<void> {
    console.log(`Initializing LLM Agent: ${this.name}`);
    
    try {
      // Verify required modules are available via registry
      const litellmModule = this.registry.get('litellm');
      if (!litellmModule) {
        throw new LLMAgentError(
          'MISSING_DEPENDENCY',
          'LiteLLM module is required for LLM agent',
          { requiredModule: 'litellm' }
        );
      }
      
      if (this.config.memory.enabled) {
        const memoryModule = this.registry.get('memory');
        if (!memoryModule) {
          throw new LLMAgentError(
            'MISSING_DEPENDENCY',
            'Memory module is required when memory is enabled',
            { requiredModule: 'memory' }
          );
        }
      }

      // Initialize Langfuse module if tracing is enabled
      const langfuseEnabled = this.isLangfuseEnabled();
      if (langfuseEnabled) {
        const langfuseModule = this.registry.get('langfuse') as ILangfuseModule;
        if (!langfuseModule) {
          console.warn('Langfuse integration enabled but module not available');
        } else {
          this.langfuseModule = langfuseModule;
          console.log(`✓ Langfuse tracing enabled for LLM Agent: ${this.name}`);
        }
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
   * Implementation of BaseAgent's executeTask method.
   * 
   * Converts ExecutionContext to LLMAgentInput and processes the request.
   * 
   * @param context - Execution context from BaseAgent
   * @returns Promise resolving to AgentResult
   */
  protected async executeTask(context: ExecutionContext): Promise<AgentResult> {
    const startTime = Date.now();
    
    try {
      // Convert ExecutionContext to LLMAgentInput
      const input = this.contextToLLMInput(context);
      
      // Execute LLM processing
      const output = await this.executeLLMTask(input);
      
      // Convert LLMAgentOutput to AgentResult
      return this.llmOutputToAgentResult(output, startTime);
    } catch (error) {
      // Create proper agent error
      const agentError = error instanceof Error ? 
        error : 
        new Error(String(error));
        
      return {
        success: false,
        error: {
          code: 'EXECUTION_ERROR',
          message: agentError.message,
          details: { context: context.executionId }
        },
        metadata: {
          endTime: new Date(),
          duration: Date.now() - startTime
        }
      };
    }
  }
  
  /**
   * Executes LLM completion directly with LLM-specific input.
   * This is the primary method for LLM agent usage.
   * 
   * @param input - LLM agent input
   * @returns Promise resolving to LLM agent output
   */
  async executeCompletion(input: LLMAgentInput): Promise<LLMAgentOutput> {
    return await this.executeLLMTask(input);
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
  private async executeLLMTask(input: LLMAgentInput): Promise<LLMAgentOutput> {
    const startTime = Date.now();
    const context = this.createExecutionContext(input);
    
    // Start Langfuse trace for this execution
    const trace = await this.startLangfuseTrace(input.sessionId || 'unknown', 'execution', input);
    
    try {
      // Validate input
      this.validateInput(input);
      
      // Clear memory if requested - with tracing
      if (input.clearMemory) {
        const memorySpan = this.createMemorySpan(trace, 'clear', input.sessionId || 'unknown');
        await this.clearMemory(input.sessionId);
        this.updateMemorySpan(memorySpan, 0, 'clear');
      }
      
      // Build messages array with memory and context - with tracing
      const memoryRetrieveSpan = this.createMemorySpan(trace, 'retrieve', input.sessionId || 'unknown');
      const messages = await this.buildMessages(input);
      this.updateMemorySpan(memoryRetrieveSpan, messages.length, 'retrieve');
      
      // Determine tools to make available
      const tools = await this.determineTools(input);
      
      // Select appropriate model
      const model = await this.selectModel(messages, tools, input);
      
      // Check context length limits
      await this.validateContextLength(messages, model);
      
      // Create LLM span for main completion
      const llmSpan = this.createLLMSpan(trace, model, messages, tools);
      
      // Execute main LLM call
      let response = await this.callLLM(messages, tools, model, input);
      
      // Update LLM span with response
      this.updateLLMSpanWithResponse(llmSpan, response, Date.now() - startTime);
      
      // Handle tool calls if present - with tracing
      let toolResults: ToolResult[] = [];
      let toolSpans: any[] = [];
      
      if (response.toolCalls && response.toolCalls.length > 0) {
        toolSpans = this.createToolSpans(trace, response.toolCalls);
        toolResults = await this.handleToolCalls(response, input, context);
        this.updateToolSpans(toolSpans, toolResults);
      }
      
      // Update conversation memory - with tracing
      const memoryUpdateSpan = this.createMemorySpan(trace, 'update', input.sessionId || 'unknown');
      const memoryUpdated = await this.updateMemory(input, response, toolResults);
      this.updateMemorySpan(memoryUpdateSpan, memoryUpdated ? 2 : 0, 'update'); // 2 messages: user + assistant
      
      // Validate response if configured
      await this.validateResponse(response.message.content || '', input, context);
      
      // Update metrics
      this.updateLLMMetrics(response, Date.now() - startTime);
      
      // Build final output
      const output: LLMAgentOutput = {
        success: true,
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
      
      // Update trace with final output
      if (trace) {
        try {
          trace.update({
            output: {
              success: true,
              content: output.content?.substring(0, 1000),
              model: output.model,
              tokenUsage: output.usage,
              toolsExecuted: toolResults.length,
              duration: Date.now() - startTime
            }
          });
        } catch (error) {
          console.error('Failed to update trace with final output:', error);
        }
      }
      
      console.log(`✓ LLM completion for ${this.name}`, {
        model: response.model,
        tokens: response.usage?.totalTokens,
        duration: Date.now() - startTime,
        tools: toolResults.length
      });
      
      return output;
      
    } catch (error) {
      this.llmMetrics.errorRate = (this.llmMetrics.errorRate + 1) / 2; // Moving average
      
      // Update trace with error information
      if (trace) {
        try {
          trace.update({
            output: {
              success: false,
              error: error instanceof Error ? error.message : String(error),
              duration: Date.now() - startTime
            }
          });
        } catch (traceError) {
          console.error('Failed to update trace with error:', traceError);
        }
      }
      
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
    
    // Start Langfuse trace for streaming
    const trace = await this.startLangfuseTrace(input.sessionId || 'unknown', 'streaming', input);
    
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
      
      // Build messages and determine tools - with tracing
      const memoryRetrieveSpan = this.createMemorySpan(trace, 'retrieve', input.sessionId || 'unknown');
      const messages = await this.buildMessages(input);
      this.updateMemorySpan(memoryRetrieveSpan, messages.length, 'retrieve');
      
      const tools = await this.determineTools(input);
      const model = await this.selectModel(messages, tools, input);
      
      // Create streaming span
      let streamingSpan: any = null;
      if (trace) {
        try {
          streamingSpan = trace.span({
            name: 'llm-streaming',
            input: {
              model,
              messageCount: messages.length,
              toolCount: tools.length,
              streamingEnabled: true
            },
            metadata: {
              model,
              streamId,
              tokenEstimate: this.estimateTokensPrivate(messages.map(m => m.content).join(' '))
            }
          });
        } catch (error) {
          console.error('Failed to create streaming span:', error);
        }
      }
      
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
      
      const litellmModule = this.registry.get('litellm') as any; // TODO: Add proper LiteLLM module interface
      for await (const chunk of litellmModule.streamComplete(request)) {
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
            id: generateId(),
            delta,
            done: false,
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
          id: generateId(),
          delta: '',
          done: false,
          accumulated,
          finished: false,
          toolCalls,
          toolResults,
          model
        };
      }
      
      // Update memory after streaming completes - with tracing
      let memoryUpdated = false;
      if (this.config.memory.enabled && input.includeMemory !== false) {
        const memoryUpdateSpan = this.createMemorySpan(trace, 'update', input.sessionId || 'unknown');
        await this.updateMemoryFromStream(input, accumulated);
        memoryUpdated = true;
        this.updateMemorySpan(memoryUpdateSpan, 2, 'update'); // 2 messages: user + assistant
      }
      
      // Calculate streaming metrics
      const totalDuration = Date.now() - startTime;
      const avgChunkTime = streamingMetadata.chunks.reduce((a, b) => a + b, 0) / streamingMetadata.chunks.length;
      
      // Update streaming span with completion data
      if (streamingSpan) {
        try {
          streamingSpan.update({
            output: {
              content: accumulated.substring(0, 1000),
              model,
              chunkCount,
              duration: totalDuration,
              firstByteLatency: streamingMetadata.firstByteTime,
              avgChunkLatency: avgChunkTime,
              totalChars: accumulated.length,
              tokenEstimate: Math.ceil(accumulated.length / 4)
            },
            metadata: {
              model,
              duration: totalDuration,
              chunkCount,
              success: true,
              streamingComplete: true
            }
          });
          streamingSpan.end();
        } catch (error) {
          console.error('Failed to update streaming span:', error);
        }
      }
      
      // Update main trace with streaming completion
      if (trace) {
        try {
          trace.update({
            output: {
              success: true,
              content: accumulated.substring(0, 1000),
              model,
              streamingData: {
                chunkCount,
                duration: totalDuration,
                firstByteLatency: streamingMetadata.firstByteTime,
                avgChunkLatency: avgChunkTime
              }
            }
          });
        } catch (error) {
          console.error('Failed to update trace with streaming completion:', error);
        }
      }
      
      // Final chunk with completion metadata
      yield {
        id: generateId(),
        delta: '',
        done: true,
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
      // Update trace with streaming error
      if (trace) {
        try {
          trace.update({
            output: {
              success: false,
              error: error instanceof Error ? error.message : String(error),
              duration: Date.now() - startTime,
              streamingFailed: true
            }
          });
        } catch (traceError) {
          console.error('Failed to update trace with streaming error:', traceError);
        }
      }
      
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
      if (this.config.memory.enabled && this.registry.get("memory")) {
        await (this.registry.get("memory") as any).clearWorkingMemory(sessionId); // TODO: Add proper Memory module interface
      }

      // Cleanup Langfuse session trace as well
      this.cleanupSessionTrace(sessionId);
      
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
    if (this.config.memory.enabled && this.registry.get("memory")) {
      const memories = await (this.registry.get("memory") as any).getWorkingMemory({ // TODO: Add proper Memory module interface
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
   * Estimates token count for input text or messages (ILLMAgent interface requirement).
   * 
   * @param input - Input to estimate tokens for
   * @returns Estimated token count
   */
  async estimateTokens(input: string | Message[]): Promise<number> {
    try {
      if (typeof input === 'string') {
        return this.estimateTokensPrivate(input);
      }
      
      // For messages, account for role tokens and formatting
      return input.reduce((total, message) => {
        const contentTokens = this.estimateTokensPrivate(message.content || '');
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
  private validateLLMConfiguration(): void {
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
   * Creates internal execution context for a request.
   * 
   * @param input - Agent input
   * @returns Internal execution context
   * @private
   */
  private createExecutionContext(input: LLMAgentInput): any {
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
      messages.push(this.createMessage(
        'system',
        this.config.prompting.systemPrompt
      ));
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
          this.createMessage('user', example.input),
          this.createMessage('assistant', example.output)
        );
      }
    }
    
    // Add current input
    if (input.messages) {
      messages.push(...input.messages);
    } else if (input.prompt) {
      const formattedPrompt = this.formatPrompt(input.prompt, input);
      messages.push(this.createMessage(
        'user',
        formattedPrompt
      ));
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
    if (input.tools && Array.isArray(input.tools)) {
      return this.resolveToolDefinitions(input.tools);
    } else if (input.tools === true) {
      // Use all available tools
      const allTools = Object.keys(this.modules.tools || {});
      return this.resolveToolDefinitions(allTools);
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
      messages,
      messageCount: messages.length,
      estimatedTokens: await this.estimateTokens(messages),
      capabilities: tools.length > 0 ? ['tools'] : [],
      preferredRouting: this.config.model.routing
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
        { reason: 'Context length exceeds model limits' }
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
    const startTime = Date.now();
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
      const response = await (this.registry.get("litellm") as any).complete(request); // TODO: Add proper LiteLLM module interface
      
      const duration = Date.now() - startTime;
      
      return {
        message: response.choices[0].message,
        model: response.model,
        duration,
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
      arguments: typeof tc.function.arguments === 'string' 
        ? JSON.parse(tc.function.arguments) 
        : tc.function.arguments,
      function: {
        name: tc.function.name,
        arguments: tc.function.arguments
      }
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
            duration: 0
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
          output: result,
          duration: executionTime
        });
        
      } catch (error) {
        results.push({
          toolCallId: toolCall.id,
          success: false,
          error: error instanceof Error ? error.message : String(error),
          duration: 0
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
      `Tool not found: ${toolCall.name}`,
      { arguments: toolCall.arguments }
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
        memory = new ConversationMemory(this.config.memory.maxMessages || 50);
        this.conversationMemories.set(input.sessionId, memory);
      }
      
      // Add user message
      if (input.prompt) {
        memory.add({
          id: generateId('msg'),
          role: 'user',
          content: input.prompt,
          timestamp: new Date()
        });
      } else if (input.messages) {
        for (const msg of input.messages) {
          memory.add({
            id: generateId('msg'),
            role: msg.role,
            content: msg.content || '',
            timestamp: new Date()
          });
        }
      }
      
      // Add assistant response
      memory.add({
        id: generateId('msg'),
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
          id: generateId('msg'),
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
      memory = new ConversationMemory(this.config.memory.maxMessages || 50);
      this.conversationMemories.set(input.sessionId, memory);
    }
    
    // Add user message
    if (input.prompt) {
      memory.add({
        id: generateId('msg'),
        role: 'user',
        content: input.prompt,
        timestamp: new Date()
      });
    }
    
    // Add assistant response
    memory.add({
      id: generateId('msg'),
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
        prompt: input.prompt || '',
        model: this.config.model.primary,
        parameters: {
          temperature: input.modelOverride?.temperature,
          maxTokens: input.modelOverride?.maxTokens
        },
        sessionId: input.sessionId,
        metadata: {
          agentName: this.name,
          executionId: context.executionId
        }
      };
      
      try {
        const isValid = await validator(content, validationContext);
        if (!isValid) {
          throw new ResponseValidationError(
            'response-validation',
            'Response failed validation',
            { validator: validator.name }
          );
        }
      } catch (error) {
        if (error instanceof ResponseValidationError) {
          throw error;
        }
        throw new ResponseValidationError(
          'validation-error',
          `Validation error: ${error instanceof Error ? error.message : String(error)}`,
          { validator: validator.name }
        );
      }
    }
    
    // Run safety checks
    for (const safetyCheck of this.safetyChecks) {
      const safetyContext = {
        contentType: 'output' as const,
        sessionId: input.sessionId,
        userId: input.userId,
        metadata: {
          agentName: this.name,
          executionId: context.executionId
        }
      };
      
      const result = await safetyCheck.check(content, safetyContext);
      if (!result.passed) {
        throw new ResponseValidationError(
          'safety-check',
          `Safety check failed: ${result.reason}`,
          { safetyCheck: safetyCheck.name }
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
  private updateLLMMetrics(response: LLMInternalResponse, duration: number): void {
    this.llmMetrics.totalCompletions++;
    this.llmMetrics.totalTokens += response.usage?.totalTokens || 0;
    this.llmMetrics.totalCost += response.usage?.cost || 0;
    this.llmMetrics.averageLatency = (this.llmMetrics.averageLatency + duration) / 2; // Moving average
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
    if (this.registry.get("memory")) {
      const memories = await (this.registry.get("memory") as any).getWorkingMemory({ // TODO: Add proper Memory module interface
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
    const { preferredRouting, estimatedTokens, capabilities } = context;
    const requiresTools = capabilities?.includes('tools') || false;
    const requiresStreaming = false; // Can be derived from capabilities if needed
    
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
    const requiresTools = context.capabilities?.includes('tools') || false;
    if (context.estimatedTokens < 4000 && !requiresTools) {
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
  
  /**
   * Creates a properly formatted Message object.
   * 
   * @param role - Message role
   * @param content - Message content
   * @param metadata - Optional metadata
   * @returns Properly formatted message
   * @private
   */
  private createMessage(
    role: 'user' | 'assistant' | 'system',
    content: string,
    metadata?: Record<string, any>
  ): Message {
    return {
      id: generateId('msg'),
      role,
      content,
      timestamp: new Date(),
      metadata
    };
  }
  
  /**
   * Converts ExecutionContext to LLMAgentInput for processing.
   * 
   * @param context - Execution context from BaseAgent
   * @returns LLM agent input
   * @private
   */
  private contextToLLMInput(context: ExecutionContext): LLMAgentInput {
    return {
      content: context.task.input?.content || '',
      data: context.task.input?.data,
      sessionId: context.session?.id || 'default',
      metadata: {
        executionId: context.executionId,
        taskId: context.task.id,
        taskType: context.task.type,
        ...context.metadata
      }
    };
  }
  
  /**
   * Converts LLMAgentOutput to AgentResult for BaseAgent.
   * 
   * @param output - LLM agent output
   * @param startTime - Execution start time
   * @returns Agent result
   * @private
   */
  private llmOutputToAgentResult(output: LLMAgentOutput, startTime: number): AgentResult {
    return {
      success: output.success,
      output: output.message || output.data,
      metadata: {
        endTime: new Date(),
        duration: Date.now() - startTime,
        model: output.model,
        tokensUsed: output.usage?.totalTokens,
        cost: output.usage?.cost
      }
    };
  }

  // Langfuse Integration Methods
  
  /**
   * Checks if Langfuse tracing is enabled for this agent.
   * 
   * @returns True if Langfuse tracing should be used
   * @private
   */
  private isLangfuseEnabled(): boolean {
    const integration = this.config.integrations?.langfuse;
    
    // Handle boolean configuration
    if (typeof integration === 'boolean') {
      return integration;
    }
    
    // Handle object configuration
    if (integration && typeof integration === 'object') {
      return integration.enabled === true;
    }
    
    return false;
  }

  /**
   * Gets Langfuse configuration options.
   * 
   * @returns Langfuse configuration object or default settings
   * @private
   */
  private getLangfuseConfig(): {
    traceExecutions: boolean;
    traceStreaming: boolean;
    traceTools: boolean;
    traceMemory: boolean;
    trackTokens: boolean;
    trackCosts: boolean;
    sessionTracking: boolean;
    metadata: Record<string, any>;
  } {
    const integration = this.config.integrations?.langfuse;
    
    // Default configuration
    const defaults = {
      traceExecutions: true,
      traceStreaming: true,
      traceTools: true,
      traceMemory: true,
      trackTokens: true,
      trackCosts: true,
      sessionTracking: true,
      metadata: {}
    };
    
    // Return defaults for boolean config
    if (typeof integration === 'boolean') {
      return defaults;
    }
    
    // Merge with object config
    if (integration && typeof integration === 'object') {
      return {
        traceExecutions: integration.traceExecutions ?? defaults.traceExecutions,
        traceStreaming: integration.traceStreaming ?? defaults.traceStreaming,
        traceTools: integration.traceTools ?? defaults.traceTools,
        traceMemory: integration.traceMemory ?? defaults.traceMemory,
        trackTokens: integration.trackTokens ?? defaults.trackTokens,
        trackCosts: integration.trackCosts ?? defaults.trackCosts,
        sessionTracking: integration.sessionTracking ?? defaults.sessionTracking,
        metadata: integration.metadata ?? defaults.metadata
      };
    }
    
    return defaults;
  }

  /**
   * Starts or gets a Langfuse trace for the given session.
   * 
   * @param sessionId - Session identifier
   * @param operationType - Type of operation being traced
   * @param input - Input data for tracing
   * @returns Langfuse trace or null if tracing disabled
   * @private
   */
  private async startLangfuseTrace(
    sessionId: string,
    operationType: 'execution' | 'streaming',
    input: LLMAgentInput
  ): Promise<ITrace | null> {
    if (!this.langfuseModule || !this.isLangfuseEnabled()) {
      return null;
    }

    const config = this.getLangfuseConfig();
    
    // Check if this operation type should be traced
    if (operationType === 'execution' && !config.traceExecutions) {
      return null;
    }
    if (operationType === 'streaming' && !config.traceStreaming) {
      return null;
    }

    // Check if session already has an active trace
    let trace = this.sessionTraces.get(sessionId);
    
    if (!trace && config.sessionTracking) {
      try {
        // Create new session trace
        trace = this.langfuseModule.startTrace({
          id: generateId(),
          name: `llm-agent-session-${sessionId}`,
          userId: input.userId,
          sessionId: sessionId,
          metadata: {
            agentName: this.name,
            agentType: this.type,
            agentVersion: this.version,
            operationType,
            primaryModel: this.config.model.primary,
            ...config.metadata,
            ...input.metadata
          },
          tags: [
            'llm-agent',
            this.name,
            this.config.model.primary || 'unknown-model'
          ],
          input: config.traceExecutions ? {
            prompt: input.prompt,
            messages: input.messages?.map(m => ({
              role: m.role,
              content: m.content?.substring(0, 1000) // Limit content length
            })),
            tools: input.tools,
            modelOverride: input.modelOverride
          } : undefined,
          timestamp: new Date()
        });

        this.sessionTraces.set(sessionId, trace);
        console.log(`✓ Started Langfuse session trace for ${sessionId}`);
      } catch (error) {
        console.error('Failed to start Langfuse trace:', error);
        return null;
      }
    }

    return trace;
  }

  /**
   * Creates a span for LLM completion within a trace.
   * 
   * @param trace - Parent trace
   * @param model - Model being used
   * @param messages - Messages being sent
   * @param tools - Available tools
   * @returns Langfuse span or null
   * @private
   */
  private createLLMSpan(
    trace: ITrace,
    model: string,
    messages: Message[],
    tools: any[]
  ): ISpan | null {
    if (!trace) return null;

    try {
      return trace.span({
        name: 'llm-completion',
        input: {
          model,
          messages: messages.map(m => ({
            role: m.role,
            content: m.content?.substring(0, 500)
          })),
          toolCount: tools.length,
          messageCount: messages.length
        },
        metadata: {
          model,
          tokenEstimate: this.estimateTokensPrivate(messages.map(m => m.content).join(' ')),
          toolsAvailable: tools.map(t => t.name || t.type).slice(0, 10)
        }
      });
    } catch (error) {
      console.error('Failed to create LLM span:', error);
      return null;
    }
  }

  /**
   * Updates a span with completion results.
   * 
   * @param span - Span to update
   * @param response - LLM response
   * @param duration - Execution duration
   * @private
   */
  private updateLLMSpanWithResponse(
    span: ISpan | null,
    response: LLMInternalResponse,
    duration: number
  ): void {
    if (!span) return;

    const config = this.getLangfuseConfig();

    try {
      span.update({
        output: {
          content: response.message.content?.substring(0, 1000),
          model: response.model,
          toolCallCount: response.toolCalls?.length || 0,
          duration
        },
        metadata: {
          model: response.model,
          duration,
          ...(config.trackTokens && response.usage ? {
            promptTokens: response.usage.promptTokens,
            completionTokens: response.usage.completionTokens,
            totalTokens: response.usage.totalTokens
          } : {}),
          ...(config.trackCosts && response.usage?.cost ? {
            cost: response.usage.cost
          } : {})
        }
      });

      span.end();
      console.log(`✓ Updated Langfuse LLM span with response`);
    } catch (error) {
      console.error('Failed to update LLM span:', error);
    }
  }

  /**
   * Creates spans for tool executions.
   * 
   * @param trace - Parent trace
   * @param toolCalls - Tool calls being executed
   * @returns Array of tool spans
   * @private
   */
  private createToolSpans(
    trace: ITrace | null,
    toolCalls: ToolCall[]
  ): ISpan[] {
    if (!trace || !this.getLangfuseConfig().traceTools) {
      return [];
    }

    const spans: ISpan[] = [];

    for (const toolCall of toolCalls) {
      try {
        const span = trace.span({
          name: `tool-${toolCall.name}`,
          input: {
            toolName: toolCall.name,
            arguments: toolCall.arguments
          },
          metadata: {
            toolCallId: toolCall.id,
            toolName: toolCall.name
          }
        });

        spans.push(span);
      } catch (error) {
        console.error(`Failed to create tool span for ${toolCall.name}:`, error);
      }
    }

    return spans;
  }

  /**
   * Updates tool spans with execution results.
   * 
   * @param toolSpans - Tool spans to update
   * @param toolResults - Tool execution results
   * @private
   */
  private updateToolSpans(
    toolSpans: ISpan[],
    toolResults: ToolResult[]
  ): void {
    if (!this.getLangfuseConfig().traceTools) return;

    for (let i = 0; i < Math.min(toolSpans.length, toolResults.length); i++) {
      const span = toolSpans[i];
      const result = toolResults[i];

      try {
        span.update({
          output: {
            success: result.success,
            result: result.output,
            error: result.error,
            duration: result.duration
          },
          metadata: {
            success: result.success,
            duration: result.duration,
            toolName: result.tool
          }
        });

        span.end();
      } catch (error) {
        console.error(`Failed to update tool span:`, error);
      }
    }

    console.log(`✓ Updated ${toolSpans.length} tool spans`);
  }

  /**
   * Creates a span for memory operations.
   * 
   * @param trace - Parent trace
   * @param operation - Memory operation type
   * @param sessionId - Session ID
   * @returns Memory span or null
   * @private
   */
  private createMemorySpan(
    trace: ITrace | null,
    operation: 'retrieve' | 'update' | 'clear',
    sessionId: string
  ): ISpan | null {
    if (!trace || !this.getLangfuseConfig().traceMemory) {
      return null;
    }

    try {
      return trace.span({
        name: `memory-${operation}`,
        input: {
          operation,
          sessionId
        },
        metadata: {
          operation,
          sessionId,
          memoryEnabled: this.config.memory.enabled,
          maxMessages: this.config.memory.maxMessages
        }
      });
    } catch (error) {
      console.error(`Failed to create memory span for ${operation}:`, error);
      return null;
    }
  }

  /**
   * Updates memory span with operation results.
   * 
   * @param memorySpan - Memory span to update
   * @param messageCount - Number of messages retrieved/updated
   * @param operation - Operation performed
   * @private
   */
  private updateMemorySpan(
    memorySpan: ISpan | null,
    messageCount: number,
    operation: string
  ): void {
    if (!memorySpan) return;

    try {
      memorySpan.update({
        output: {
          messageCount,
          operation,
          success: true
        },
        metadata: {
          messageCount,
          operation
        }
      });

      memorySpan.end();
      console.log(`✓ Updated memory span for ${operation}`);
    } catch (error) {
      console.error('Failed to update memory span:', error);
    }
  }

  /**
   * Estimates token count for text (rough approximation).
   * 
   * @param text - Text to estimate
   * @returns Estimated token count
   * @private
   */
  private estimateTokensPrivate(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  /**
   * Cleans up session traces that are no longer active.
   * 
   * @param sessionId - Session to clean up
   * @private
   */
  private cleanupSessionTrace(sessionId: string): void {
    const trace = this.sessionTraces.get(sessionId);
    if (trace) {
      try {
        // End the trace
        trace.update({
          output: {
            sessionEnd: true,
            endTime: new Date().toISOString()
          }
        });

        this.sessionTraces.delete(sessionId);
        console.log(`✓ Cleaned up Langfuse trace for session ${sessionId}`);
      } catch (error) {
        console.error(`Failed to cleanup session trace for ${sessionId}:`, error);
      }
    }
  }
}