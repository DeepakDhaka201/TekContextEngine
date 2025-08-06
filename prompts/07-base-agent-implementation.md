# Base Agent Implementation Prompt (Enhanced Modular Architecture with Flowise Patterns)

## Context
You are implementing the Base Agent - the foundation that all other agents in AgentHub will inherit from. This enhanced implementation integrates Flowise patterns for graph-based execution, dynamic agent loading, streaming capabilities, and execution state management. The modular architecture includes LiteLLM, Langfuse, Session/State, Memory, Tools, ExecutionManager, and StreamingManager modules accessed through the Module Registry.

## Pre-Implementation Requirements

### 1. Documentation Review
You MUST read:
1. Module Registry implementation: `/Users/sakshams/tekai/TekContextEngine/prompts/06-module-registry-implementation.md`
2. All module interfaces from prompts 01-05
3. Execution Manager module: `/Users/sakshams/tekai/TekContextEngine/prompts/06a-execution-manager-implementation.md`
4. Streaming Manager module: `/Users/sakshams/tekai/TekContextEngine/prompts/06b-streaming-manager-implementation.md`
5. Enhanced Memory module: Updated memory implementation with runtime state
6. Revised architecture: `/Users/sakshams/tekai/TekContextEngine/agenthub-architecture-revised.md`
7. Flowise architecture analysis and integration patterns

### 2. Understand Enhanced Module Integration
The Enhanced Base Agent must:
- Access modules through the registry (existing)
- Make module usage transparent to subclasses (existing)
- Handle module failures gracefully (existing)
- Provide hooks for agent-specific behavior (existing)
- Support both sync and async execution patterns (existing)
- **NEW: Support Flowise INode interface for compatibility**
- **NEW: Enable graph-based workflow execution**
- **NEW: Provide streaming execution with real-time updates**
- **NEW: Support execution state persistence and resume capability**
- **NEW: Enable dynamic agent loading and versioning**
- **NEW: Support human-in-the-loop interactions**
- **NEW: Handle runtime state management**

## Implementation Steps

### Step 1: Base Agent Interface and Types
Create `agents/base/types.ts`:

```typescript
// Flowise INode interface for compatibility
export interface INode {
  label: string;
  name: string;
  version: number;
  type: string;
  icon?: string;
  category?: string;
  description?: string;
  baseClasses?: string[];
  inputs?: INodeParams[];
  
  // Flowise execution methods
  init?(nodeData: INodeData, input: string, options: ICommonObject): Promise<any>;
  run?(nodeData: INodeData, input: string, options: ICommonObject): Promise<any>;
}

export interface IBaseAgent extends INode {
  // Identity (enhanced)
  id: string;
  name: string;
  description?: string;
  type: AgentType;
  version: string;
  
  // Flowise compatibility
  label: string;
  
  // Core execution
  execute(input: AgentInput): Promise<AgentOutput>;
  stream?(input: AgentInput): AsyncIterableIterator<AgentStreamOutput>;
  
  // NEW: Flowise-style execution
  init?(nodeData: INodeData, input: string, options: ICommonObject): Promise<any>;
  run?(nodeData: INodeData, input: string, options: ICommonObject): Promise<any>;
  
  // NEW: Graph execution support
  getOutputPorts(): string[];
  getInputPorts(): string[];
  canExecute(inputs: Map<string, any>): boolean;
  
  // Lifecycle
  initialize(config: AgentConfig): Promise<void>;
  cleanup(): Promise<void>;
  health(): Promise<HealthStatus>;
  
  // Capabilities
  getCapabilities(): AgentCapabilities;
  getSchema(): AgentSchema;
  
  // NEW: Execution state management
  saveExecutionState?(executionId: string): Promise<void>;
  loadExecutionState?(executionId: string): Promise<void>;
}

export interface AgentConfig {
  id?: string;
  name: string;
  description?: string;
  
  // Module configuration overrides
  modules?: {
    llm?: Partial<LLMConfig>;
    memory?: Partial<MemoryConfig>;
    tools?: string[];  // Tool names to bind
    executionManager?: Partial<ExecutionManagerConfig>;
    streamingManager?: Partial<StreamingManagerConfig>;
  };
  
  // Agent-specific config
  settings?: Record<string, any>;
  
  // Execution options (enhanced)
  execution?: {
    timeout?: number;
    maxRetries?: number;
    streamingEnabled?: boolean;
    resumeEnabled?: boolean;  // NEW: Resume from failures
    stateTracking?: boolean;  // NEW: Track execution state
    humanInteraction?: boolean; // NEW: Human-in-the-loop
  };
  
  // NEW: Flowise-style node configuration
  nodeConfig?: {
    inputs?: INodeParams[];
    outputs?: INodeParams[];
    category?: string;
    icon?: string;
  };
}

export interface AgentInput {
  // Core input
  messages?: Message[];
  prompt?: string;
  
  // Context
  sessionId: string;
  userId?: string;
  
  // Execution options
  options?: {
    temperature?: number;
    maxTokens?: number;
    tools?: string[];
    stream?: boolean;
    resumeFromExecution?: string; // NEW: Resume from execution ID
  };
  
  // NEW: Flowise-style node data
  nodeData?: INodeData;
  
  // NEW: Workflow context
  workflowContext?: {
    workflowId?: string;
    executionId?: string;
    nodeId?: string;
    inputs?: Map<string, any>;
    runtimeState?: ICommonObject;
  };
  
  // Additional data
  metadata?: Record<string, any>;
}

// NEW: Flowise-style interfaces
export interface INodeData {
  inputs?: Record<string, any>;
  outputs?: Record<string, any>;
  id: string;
  name: string;
  type: string;
}

export interface INodeParams {
  label: string;
  name: string;
  type: string;
  optional?: boolean;
  description?: string;
  default?: any;
}

export interface ICommonObject {
  [key: string]: any;
}

export interface AgentOutput {
  // Response
  content: string;
  
  // Tool calls made
  toolCalls?: ToolCall[];
  
  // Usage stats
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    cost?: number;
  };
  
  // Metadata
  metadata?: {
    model?: string;
    duration?: number;
    executionId?: string;  // NEW: Track execution
    nodeId?: string;       // NEW: Track node in workflow
    runtimeState?: ICommonObject; // NEW: Runtime state updates
    [key: string]: any;
  };
  
  // NEW: Workflow outputs
  outputs?: Map<string, any>;  // For graph execution
  
  // NEW: Execution control
  executionControl?: {
    shouldPause?: boolean;     // Pause execution for human input
    shouldResume?: boolean;    // Resume from pause
    shouldTerminate?: boolean; // Terminate workflow
    nextNodes?: string[];      // Next nodes to execute
  };
}

export interface AgentCapabilities {
  supportsStreaming: boolean;
  supportsTools: boolean;
  supportsMemory: boolean;
  supportsState: boolean;
  maxContextLength?: number;
  supportedModels?: string[];
  
  // NEW: Enhanced capabilities
  supportsGraphExecution: boolean;   // Graph-based workflows
  supportsResume: boolean;           // Resume from failures
  supportsHumanInteraction: boolean; // Human-in-the-loop
  supportsRuntimeState: boolean;     // Runtime state management
  supportsDynamicLoading: boolean;   // Dynamic loading
  supportsVersioning: boolean;       // Version management
}

export type AgentType = 
  | 'llm'          // Direct LLM interaction
  | 'graph'        // Graph-based workflow (formerly sequential)
  | 'loop'         // Iterative workflow
  | 'parallel'     // Parallel execution
  | 'multi'        // Multi-agent system
  | 'workflow'     // Complex workflow orchestration
  | 'human'        // Human-in-the-loop agent
  | 'custom';      // Custom implementation

// NEW: Execution state tracking
export interface ExecutionState {
  executionId: string;
  workflowId?: string;
  status: ExecutionStatus;
  currentNode?: string;
  completedNodes: string[];
  failedNodes: string[];
  runtimeState: ICommonObject;
  startedAt: Date;
  lastUpdated: Date;
  error?: string;
}

export type ExecutionStatus = 
  | 'PENDING'
  | 'INPROGRESS' 
  | 'PAUSED'
  | 'FINISHED'
  | 'ERROR'
  | 'TERMINATED'
  | 'TIMEOUT'
  | 'STOPPED';
```

### Step 2: Module Access Layer
Create `agents/base/module-access.ts`:

```typescript
import { IModuleRegistry } from '../../modules/registry/types';

/**
 * Provides convenient access to modules for agents
 */
export class ModuleAccessor {
  constructor(private registry: IModuleRegistry) {}
  
  // Lazy getters for modules
  private _litellm?: ILiteLLMModule;
  get litellm(): ILiteLLMModule {
    if (!this._litellm) {
      this._litellm = this.registry.get<ILiteLLMModule>('litellm');
    }
    return this._litellm;
  }
  
  private _langfuse?: ILangfuseModule;
  get langfuse(): ILangfuseModule {
    if (!this._langfuse) {
      this._langfuse = this.registry.get<ILangfuseModule>('langfuse');
    }
    return this._langfuse;
  }
  
  private _sessionState?: ISessionStateModule;
  get sessionState(): ISessionStateModule {
    if (!this._sessionState) {
      this._sessionState = this.registry.get<ISessionStateModule>('sessionState');
    }
    return this._sessionState;
  }
  
  private _memory?: IMemoryModule;
  get memory(): IMemoryModule {
    if (!this._memory) {
      this._memory = this.registry.get<IMemoryModule>('memory');
    }
    return this._memory;
  }
  
  private _tools?: IToolsModule;
  get tools(): IToolsModule {
    if (!this._tools) {
      this._tools = this.registry.get<IToolsModule>('tools');
    }
    return this._tools;
  }
  
  // NEW: Enhanced modules
  private _executionManager?: IExecutionManager;
  get executionManager(): IExecutionManager {
    if (!this._executionManager) {
      this._executionManager = this.registry.get<IExecutionManager>('executionManager');
    }
    return this._executionManager;
  }
  
  private _streamingManager?: IStreamingManager;
  get streamingManager(): IStreamingManager {
    if (!this._streamingManager) {
      this._streamingManager = this.registry.get<IStreamingManager>('streamingManager');
    }
    return this._streamingManager;
  }
  
  private _humanLoop?: IHumanLoopModule;
  get humanLoop(): IHumanLoopModule {
    if (!this._humanLoop) {
      this._humanLoop = this.registry.get<IHumanLoopModule>('humanLoop');
    }
    return this._humanLoop;
  }
  
  // Helper methods
  async withTrace<T>(
    name: string,
    fn: () => Promise<T>,
    metadata?: any
  ): Promise<T> {
    const trace = this.langfuse.startTrace({
      name,
      metadata
    });
    
    try {
      const result = await this.langfuse.runInTraceContext(trace, fn);
      trace.update({ output: result });
      return result;
    } catch (error) {
      trace.update({ 
        level: 'ERROR',
        statusMessage: error.message 
      });
      throw error;
    }
  }
  
  async withSpan<T>(
    name: string,
    fn: () => Promise<T>,
    input?: any
  ): Promise<T> {
    const trace = this.langfuse.getCurrentTrace();
    if (!trace) {
      // No active trace, execute without span
      return fn();
    }
    
    const span = trace.span({ name, input });
    
    try {
      const result = await this.langfuse.runInSpanContext(span, fn);
      span.update({ output: result });
      span.end();
      return result;
    } catch (error) {
      span.end({ 
        level: 'ERROR',
        statusMessage: error.message 
      });
      throw error;
    }
  }
}
```

### Step 3: Base Agent Implementation
Create `agents/base/base-agent.ts`:

```typescript
export abstract class BaseAgent implements IBaseAgent {
  // Identity
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly version: string = '1.0.0';
  
  // Flowise compatibility
  readonly label: string;
  readonly icon?: string;
  readonly category?: string;
  readonly baseClasses?: string[];
  readonly inputs?: INodeParams[];
  
  // Module access
  protected modules: ModuleAccessor;
  
  // Configuration
  protected config: AgentConfig;
  protected initialized = false;
  
  // Bound tools
  private boundTools: Set<string> = new Set();
  
  // NEW: Execution state
  private currentExecution?: ExecutionState;
  private runtimeState: ICommonObject = {};
  
  constructor(config: AgentConfig) {
    this.id = config.id || generateId('agent');
    this.name = config.name;
    this.description = config.description;
    this.label = config.name; // Flowise compatibility
    this.icon = config.nodeConfig?.icon;
    this.category = config.nodeConfig?.category || 'Agents';
    this.inputs = config.nodeConfig?.inputs;
    this.baseClasses = [this.constructor.name];
    this.config = config;
    
    // Get module registry
    const registry = getGlobalRegistry();
    this.modules = new ModuleAccessor(registry);
  }
  
  // Abstract methods for subclasses
  abstract get type(): AgentType;
  protected abstract executeCore(input: AgentInput): Promise<AgentOutput>;
  protected abstract validateInput(input: AgentInput): void;
  
  // NEW: Abstract methods for graph execution
  abstract getOutputPorts(): string[];
  abstract getInputPorts(): string[];
  abstract canExecute(inputs: Map<string, any>): boolean;
  
  // NEW: Flowise compatibility methods (optional)
  async init?(nodeData: INodeData, input: string, options: ICommonObject): Promise<any> {
    // Default implementation delegates to execute
    const agentInput: AgentInput = {
      prompt: input,
      sessionId: options.sessionId || generateId('session'),
      userId: options.userId,
      nodeData,
      metadata: options
    };
    
    await this.initialize();
    return this.execute(agentInput);
  }
  
  async run?(nodeData: INodeData, input: string, options: ICommonObject): Promise<any> {
    // Default implementation delegates to execute
    const agentInput: AgentInput = {
      prompt: input,
      sessionId: options.sessionId || generateId('session'),
      userId: options.userId,
      nodeData,
      metadata: options
    };
    
    return this.execute(agentInput);
  }
  
  async initialize(config?: AgentConfig): Promise<void> {
    if (this.initialized) {
      return;
    }
    
    // Merge config
    if (config) {
      this.config = { ...this.config, ...config };
    }
    
    // Bind tools if specified
    if (this.config.modules?.tools) {
      await this.bindTools(this.config.modules.tools);
    }
    
    // Call subclass initialization
    await this.onInitialize();
    
    this.initialized = true;
  }
  
  // Main execution method (enhanced)
  async execute(input: AgentInput): Promise<AgentOutput> {
    this.ensureInitialized();
    
    // Check for resume scenario
    if (input.options?.resumeFromExecution) {
      return this.resumeExecution(input.options.resumeFromExecution, input);
    }
    
    // Create execution state if tracking enabled
    if (this.config.execution?.stateTracking !== false) {
      this.currentExecution = {
        executionId: generateId('execution'),
        status: 'INPROGRESS',
        completedNodes: [],
        failedNodes: [],
        runtimeState: { ...this.runtimeState },
        startedAt: new Date(),
        lastUpdated: new Date()
      };
    }
    
    // Start trace
    return this.modules.withTrace(
      `${this.type}.execute`,
      async () => {
        // Validate input
        this.validateInput(input);
        
        // Get or create session
        const session = await this.getOrCreateSession(input);
        
        // Load runtime state from session if available
        if (input.workflowContext?.runtimeState) {
          this.runtimeState = { ...this.runtimeState, ...input.workflowContext.runtimeState };
        }
        
        // Add to working memory
        if (input.messages) {
          for (const message of input.messages) {
            await this.modules.memory.addWorkingMemory({
              sessionId: session.id,
              timestamp: new Date(),
              type: message.role as any,
              content: message.content,
              metadata: {
                agentId: this.id,
                executionId: this.currentExecution?.executionId
              }
            });
          }
        }
        
        // Execute with span
        const output = await this.modules.withSpan(
          'executeCore',
          () => this.executeCore(input),
          input
        );
        
        // Update execution state
        if (this.currentExecution) {
          this.currentExecution.status = 'FINISHED';
          this.currentExecution.lastUpdated = new Date();
          this.currentExecution.runtimeState = this.runtimeState;
          
          // Save execution state if configured
          if (this.config.execution?.stateTracking !== false) {
            await this.saveExecutionState(this.currentExecution.executionId);
          }
        }
        
        // Update session state with runtime state
        await this.modules.sessionState.setRuntimeState(
          session.id,
          {
            ...this.runtimeState,
            lastAgentId: this.id,
            lastExecutionTime: new Date(),
            executionCount: (session.state.executionCount || 0) + 1
          }
        );
        
        // Add response to memory
        await this.modules.memory.addWorkingMemory({
          sessionId: session.id,
          timestamp: new Date(),
          type: 'assistant',
          content: output.content,
          metadata: {
            agentId: this.id,
            usage: output.usage,
            executionId: this.currentExecution?.executionId,
            runtimeState: this.runtimeState
          }
        });
        
        // Add execution metadata to output
        output.metadata = {
          ...output.metadata,
          executionId: this.currentExecution?.executionId,
          runtimeState: this.runtimeState
        };
        
        return output;
      },
      {
        agentId: this.id,
        agentType: this.type,
        userId: input.userId,
        sessionId: input.sessionId,
        executionId: this.currentExecution?.executionId
      }
    );
  }
  
  // Enhanced streaming execution
  async *stream?(input: AgentInput): AsyncIterableIterator<AgentStreamOutput> {
    if (!this.getCapabilities().supportsStreaming) {
      throw new Error(`Agent ${this.name} does not support streaming`);
    }
    
    // Register with streaming manager if available
    const streamer = this.modules.streamingManager?.getStreamer(input.sessionId);
    
    if (streamer) {
      // Stream node start event
      streamer.streamNodeStart(input.sessionId, this.id, this.name);
      
      try {
        // Use streaming manager for real-time updates
        for await (const chunk of this.streamWithUpdates(input)) {
          streamer.streamToken(input.sessionId, chunk.delta || '');
          yield chunk;
        }
        
        // Stream node completion
        streamer.streamNodeEnd(input.sessionId, this.id, { finished: true });
        
      } catch (error) {
        streamer.streamError(input.sessionId, error);
        throw error;
      }
    } else {
      // Fallback to default implementation
      const result = await this.execute(input);
      yield {
        delta: result.content,
        accumulated: result.content,
        finished: true
      };
    }
  }
  
  // NEW: Stream with real-time updates (to be overridden)
  protected async *streamWithUpdates(input: AgentInput): AsyncIterableIterator<AgentStreamOutput> {
    // Default implementation - subclasses should override
    const result = await this.execute(input);
    yield {
      delta: result.content,
      accumulated: result.content,
      finished: true
    };
  }
  
  // Tool management
  protected async bindTools(toolNames: string[]): Promise<void> {
    for (const toolName of toolNames) {
      const tool = await this.modules.tools.get(toolName);
      if (!tool) {
        throw new Error(`Tool ${toolName} not found`);
      }
      this.boundTools.add(toolName);
    }
  }
  
  protected async executeTool(
    toolName: string,
    args: any,
    context?: ToolContext
  ): Promise<ToolResult> {
    if (!this.boundTools.has(toolName)) {
      throw new Error(`Tool ${toolName} not bound to agent`);
    }
    
    return this.modules.withSpan(
      `tool.${toolName}`,
      () => this.modules.tools.execute(toolName, args, {
        ...context,
        agentId: this.id
      }),
      args
    );
  }
  
  // Session management
  private async getOrCreateSession(input: AgentInput): Promise<ISession> {
    let session = await this.modules.sessionState.getSession(input.sessionId);
    
    if (!session) {
      session = await this.modules.sessionState.createSession({
        id: input.sessionId,
        userId: input.userId,
        metadata: {
          agentId: this.id,
          createdBy: 'agent'
        }
      });
    }
    
    return session;
  }
  
  // LLM access helpers
  protected async complete(request: LLMRequest): Promise<LLMResponse> {
    return this.modules.withSpan(
      'llm.complete',
      () => this.modules.litellm.complete({
        ...request,
        user: request.user || this.id
      }),
      { model: request.model, messages: request.messages }
    );
  }
  
  protected async *streamComplete(
    request: LLMRequest
  ): AsyncIterableIterator<LLMStreamChunk> {
    // Note: Streaming requires special handling for spans
    const trace = this.modules.langfuse.getCurrentTrace();
    const span = trace?.span({ 
      name: 'llm.stream',
      input: { model: request.model, messages: request.messages }
    });
    
    try {
      let accumulated = '';
      
      for await (const chunk of this.modules.litellm.stream({
        ...request,
        user: request.user || this.id
      })) {
        accumulated += chunk.delta || '';
        yield chunk;
      }
      
      span?.update({ output: { content: accumulated } });
      span?.end();
      
    } catch (error) {
      span?.end({ 
        level: 'ERROR',
        statusMessage: error.message 
      });
      throw error;
    }
  }
  
  // Lifecycle methods
  async cleanup(): Promise<void> {
    await this.onCleanup();
    this.initialized = false;
  }
  
  async health(): Promise<HealthStatus> {
    try {
      // Check module access
      const modules = ['litellm', 'langfuse', 'sessionState', 'memory', 'tools'];
      for (const module of modules) {
        this.modules[module]; // Will throw if module not available
      }
      
      // Call subclass health check
      const subclassHealth = await this.onHealthCheck();
      
      return subclassHealth || {
        status: 'healthy',
        message: `Agent ${this.name} is operational`
      };
      
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error.message,
        details: { error }
      };
    }
  }
  
  // Enhanced default capabilities
  getCapabilities(): AgentCapabilities {
    return {
      supportsStreaming: false,
      supportsTools: true,
      supportsMemory: true,
      supportsState: true,
      
      // NEW: Enhanced capabilities
      supportsGraphExecution: false,
      supportsResume: this.config.execution?.resumeEnabled !== false,
      supportsHumanInteraction: this.config.execution?.humanInteraction !== false,
      supportsRuntimeState: true,
      supportsDynamicLoading: true,
      supportsVersioning: true,
      
      ...this.getCustomCapabilities()
    };
  }
  
  // Hooks for subclasses
  protected async onInitialize(): Promise<void> {
    // Override in subclasses
  }
  
  protected async onCleanup(): Promise<void> {
    // Override in subclasses
  }
  
  protected async onHealthCheck(): Promise<HealthStatus | null> {
    // Override in subclasses
    return null;
  }
  
  protected getCustomCapabilities(): Partial<AgentCapabilities> {
    // Override in subclasses
    return {};
  }
  
  // NEW: Execution state management
  async saveExecutionState?(executionId: string): Promise<void> {
    if (!this.currentExecution) return;
    
    await this.modules.sessionState.updateExecutionState(executionId, this.currentExecution);
  }
  
  async loadExecutionState?(executionId: string): Promise<void> {
    const execution = await this.modules.sessionState.getExecution(executionId);
    if (execution) {
      this.currentExecution = execution;
      this.runtimeState = execution.runtimeState;
    }
  }
  
  // NEW: Resume execution capability
  protected async resumeExecution(executionId: string, input: AgentInput): Promise<AgentOutput> {
    await this.loadExecutionState?.(executionId);
    
    if (!this.currentExecution) {
      throw new Error(`No execution state found for ${executionId}`);
    }
    
    // Update execution status
    this.currentExecution.status = 'INPROGRESS';
    this.currentExecution.lastUpdated = new Date();
    
    // Continue execution from current state
    return this.executeCore(input);
  }
  
  // NEW: Runtime state management
  protected setRuntimeState(key: string, value: any): void {
    this.runtimeState[key] = value;
    
    if (this.currentExecution) {
      this.currentExecution.runtimeState = this.runtimeState;
      this.currentExecution.lastUpdated = new Date();
    }
  }
  
  protected getRuntimeState(key: string): any {
    return this.runtimeState[key];
  }
  
  protected mergeRuntimeState(updates: Partial<ICommonObject>): void {
    this.runtimeState = { ...this.runtimeState, ...updates };
    
    if (this.currentExecution) {
      this.currentExecution.runtimeState = this.runtimeState;
      this.currentExecution.lastUpdated = new Date();
    }
  }
  
  // Utilities
  protected ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error(`Agent ${this.name} not initialized`);
    }
  }
  
  getSchema(): AgentSchema {
    return {
      name: this.name,
      description: this.description,
      type: this.type,
      version: this.version,
      capabilities: this.getCapabilities(),
      inputSchema: this.getInputSchema(),
      outputSchema: this.getOutputSchema(),
      configSchema: this.getConfigSchema()
    };
  }
  
  protected getInputSchema(): JsonSchema {
    // Override in subclasses for custom schemas
    return {
      type: 'object',
      properties: {
        messages: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              role: { type: 'string', enum: ['user', 'assistant', 'system'] },
              content: { type: 'string' }
            },
            required: ['role', 'content']
          }
        },
        sessionId: { type: 'string' },
        userId: { type: 'string' }
      },
      required: ['sessionId']
    };
  }
  
  protected getOutputSchema(): JsonSchema {
    // Override in subclasses
    return {
      type: 'object',
      properties: {
        content: { type: 'string' },
        toolCalls: { type: 'array' },
        usage: { type: 'object' },
        metadata: { type: 'object' }
      },
      required: ['content']
    };
  }
  
  protected getConfigSchema(): JsonSchema {
    // Override in subclasses
    return {
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        modules: { type: 'object' },
        settings: { type: 'object' }
      },
      required: ['name']
    };
  }
}
```

### Step 4: Agent Factory
Create `agents/base/factory.ts`:

```typescript
export abstract class AgentFactory<T extends IBaseAgent> {
  abstract createAgent(config: AgentConfig): T;
  
  async create(config: AgentConfig): Promise<T> {
    const agent = this.createAgent(config);
    await agent.initialize();
    return agent;
  }
}

// Registry for agent factories
export class AgentFactoryRegistry {
  private factories = new Map<AgentType, AgentFactory<any>>();
  
  register(type: AgentType, factory: AgentFactory<any>): void {
    this.factories.set(type, factory);
  }
  
  async create(type: AgentType, config: AgentConfig): Promise<IBaseAgent> {
    const factory = this.factories.get(type);
    if (!factory) {
      throw new Error(`No factory registered for agent type: ${type}`);
    }
    
    return factory.create(config);
  }
  
  getTypes(): AgentType[] {
    return Array.from(this.factories.keys());
  }
}

// Global registry
export const agentFactoryRegistry = new AgentFactoryRegistry();
```

### Step 5: Testing Base Classes
Create `agents/base/test-utils.ts`:

```typescript
/**
 * Test agent for unit testing
 */
export class TestAgent extends BaseAgent {
  readonly type = 'custom' as AgentType;
  
  public executeCount = 0;
  public lastInput?: AgentInput;
  
  protected async executeCore(input: AgentInput): Promise<AgentOutput> {
    this.executeCount++;
    this.lastInput = input;
    
    return {
      content: `Test response for: ${input.prompt || 'no prompt'}`,
      metadata: {
        test: true,
        executeCount: this.executeCount
      }
    };
  }
  
  protected validateInput(input: AgentInput): void {
    if (!input.sessionId) {
      throw new Error('Session ID required');
    }
  }
}

/**
 * Creates a mock module registry for testing
 */
export function createMockRegistry(): IModuleRegistry {
  // Implementation that returns mock modules
  // ...
}
```

## Testing Requirements

### 1. Unit Tests
- Module access and error handling
- Lifecycle methods (initialize, cleanup)
- Execution with proper tracing
- Tool binding and execution
- State and memory integration

### 2. Integration Tests
- Full execution with real modules
- Streaming functionality
- Error propagation
- Session management
- Memory persistence

### 3. Performance Tests
- Execution overhead measurement
- Memory usage
- Module access performance
- Tracing overhead

## Post-Implementation Validation

### 1. Functionality Checklist
- [ ] Agents can access all modules transparently
- [ ] Execution is automatically traced
- [ ] Sessions are managed properly
- [ ] Memory is updated correctly
- [ ] Tools can be bound and executed
- [ ] Health checks work

### 2. Architecture Requirements
- [ ] No direct module imports in agent code
- [ ] All module access through registry
- [ ] Proper error boundaries
- [ ] Clean extension points

### 3. Developer Experience
- [ ] Simple to extend BaseAgent
- [ ] Clear hooks for customization
- [ ] Good error messages
- [ ] Intuitive API

## Common Pitfalls to Avoid

1. **Don't expose modules directly** - Always use ModuleAccessor
2. **Don't forget error handling** - Module access can fail
3. **Don't skip initialization** - Ensure proper lifecycle
4. **Don't ignore streaming complexity** - Handle spans properly
5. **Don't hardcode module names** - Use constants
6. **Don't forget cleanup** - Prevent resource leaks

## Final Validation Questions

1. Can developers create agents without knowing about modules?
2. Is tracing truly automatic for all operations?
3. Are module failures handled gracefully?
4. Is the base agent easy to extend?
5. Does session/state management work transparently?
6. Is the API consistent and intuitive?

## Next Steps
After completing the Base Agent, implement the LLM Agent (08-llm-agent-implementation.md) as the first concrete implementation using the modular architecture.