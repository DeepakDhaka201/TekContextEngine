# AgentHub: Revised Modular Architecture

## Overview

AgentHub is designed as a **modular system** where each major capability is encapsulated in its own module, with the AgentHub core orchestrating and controlling access to these modules through careful wrapping and abstraction.

## Core Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         AgentHub Core                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Module Registry                       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐   │
│  │   LiteLLM    │  │   Langfuse   │  │ Session & State   │   │
│  │   Module     │  │   Module     │  │    Module         │   │
│  │ (Proxy API)  │  │  (Wrapped)   │  │  (Centralized)    │   │
│  └──────────────┘  └──────────────┘  └───────────────────┘   │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐   │
│  │   Memory     │  │    Tools     │  │   Monitoring      │   │
│  │   Module     │  │   Module     │  │    Module         │   │
│  └──────────────┘  └──────────────┘  └───────────────────┘   │
└─────────────────────────────────────────────────────────────────┘

                              ▼
                     Agent Type Modules
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  LLM Agent   │  │  Workflow    │  │   Custom     │
│   Module     │  │   Agents     │  │   Agents     │
└──────────────┘  └──────────────┘  └──────────────┘
```

## Module Design Principles

### 1. Each Module is Self-Contained
- Has its own interfaces
- Manages its own configuration
- Handles its own errors
- Provides its own monitoring hooks

### 2. Controlled Access Through Wrapping
- No direct access to third-party libraries
- All interactions go through module interfaces
- Consistent error handling and logging
- Ability to swap implementations

### 3. Centralized Control
- AgentHub core controls module lifecycle
- Unified configuration management
- Consistent authentication/authorization
- Centralized monitoring and metrics

## Core Modules

### 1. LiteLLM Module (Python Proxy Integration)

Since LiteLLM is Python-based, we'll use the LiteLLM proxy server:

```typescript
// modules/litellm/index.ts
export interface ILiteLLMModule {
  initialize(config: LiteLLMConfig): Promise<void>;
  complete(request: LLMRequest): Promise<LLMResponse>;
  stream(request: LLMRequest): AsyncIterator<LLMChunk>;
  health(): Promise<HealthStatus>;
}

class LiteLLMModule implements ILiteLLMModule {
  private proxyClient: LiteLLMProxyClient;
  private config: LiteLLMConfig;
  
  async initialize(config: LiteLLMConfig): Promise<void> {
    // Connect to LiteLLM proxy server
    this.proxyClient = new LiteLLMProxyClient({
      baseUrl: config.proxyUrl || 'http://localhost:8000',
      apiKey: config.proxyApiKey,
      timeout: config.timeout
    });
    
    // Verify connection
    await this.proxyClient.healthCheck();
  }
  
  async complete(request: LLMRequest): Promise<LLMResponse> {
    // All LLM calls go through the proxy
    // The proxy handles:
    // - Model routing
    // - Fallbacks
    // - Rate limiting
    // - Cost tracking
    
    const proxyRequest = this.transformRequest(request);
    const response = await this.proxyClient.post('/chat/completions', proxyRequest);
    return this.transformResponse(response);
  }
}

// Module factory
export function createLiteLLMModule(config: LiteLLMConfig): ILiteLLMModule {
  const module = new LiteLLMModule();
  return wrapModule(module, 'litellm'); // Wrapping for monitoring/logging
}
```

**LiteLLM Proxy Server Configuration:**
```yaml
# litellm_config.yaml
model_list:
  - model_name: "gpt-4"
    litellm_params:
      model: "openai/gpt-4"
      api_key: "os.environ/OPENAI_API_KEY"
  
  - model_name: "claude-3"
    litellm_params:
      model: "anthropic/claude-3-opus"
      api_key: "os.environ/ANTHROPIC_API_KEY"

router_settings:
  routing_strategy: "usage-based"
  fallbacks:
    gpt-4: ["claude-3", "gpt-3.5-turbo"]
  
  retry_policy:
    max_retries: 3
    retry_after: 5
```

### 2. Langfuse Module (Wrapped Integration)

```typescript
// modules/langfuse/index.ts
export interface ILangfuseModule {
  initialize(config: LangfuseConfig): Promise<void>;
  startTrace(name: string, metadata?: any): ITrace;
  span(name: string, fn: () => Promise<any>): Promise<any>;
  flush(): Promise<void>;
}

class LangfuseModule implements ILangfuseModule {
  private client: Langfuse;
  private contextManager: TraceContextManager;
  
  async initialize(config: LangfuseConfig): Promise<void> {
    this.client = new Langfuse({
      publicKey: config.publicKey,
      secretKey: config.secretKey,
      baseUrl: config.baseUrl
    });
    
    this.contextManager = new TraceContextManager();
  }
  
  startTrace(name: string, metadata?: any): ITrace {
    const trace = this.client.trace({ name, metadata });
    
    // Wrap the trace object to control access
    return new WrappedTrace(trace, this.contextManager);
  }
}

// Wrapped trace to control access
class WrappedTrace implements ITrace {
  constructor(
    private trace: LangfuseTrace,
    private contextManager: TraceContextManager
  ) {}
  
  span(name: string): ISpan {
    const span = this.trace.span({ name });
    this.contextManager.setCurrentSpan(span);
    return new WrappedSpan(span);
  }
  
  // Control what methods are exposed
  update(data: any): void {
    // Add validation, sanitization, etc.
    this.trace.update(this.sanitize(data));
  }
}
```

### 3. Session & State Management Module

This is a **centralized module** for all state and session management:

```typescript
// modules/session-state/index.ts
export interface ISessionStateModule {
  // Session Management
  createSession(userId?: string): Promise<Session>;
  getSession(sessionId: string): Promise<Session>;
  updateSession(sessionId: string, updates: any): Promise<void>;
  
  // State Management
  getState(scope: StateScope): Promise<State>;
  setState(scope: StateScope, key: string, value: any): Promise<void>;
  
  // Memory Management
  addMemory(sessionId: string, memory: Memory): Promise<void>;
  queryMemory(sessionId: string, query: string): Promise<Memory[]>;
  
  // Persistence
  checkpoint(sessionId: string): Promise<string>;
  restore(checkpointId: string): Promise<Session>;
}

class SessionStateModule implements ISessionStateModule {
  private sessionStore: ISessionStore;
  private stateManager: IStateManager;
  private memoryService: IMemoryService;
  
  constructor(config: SessionStateConfig) {
    // Initialize stores based on config
    this.sessionStore = this.createSessionStore(config.session);
    this.stateManager = this.createStateManager(config.state);
    this.memoryService = this.createMemoryService(config.memory);
  }
  
  async createSession(userId?: string): Promise<Session> {
    const session = new Session({
      id: generateId(),
      userId,
      createdAt: Date.now(),
      state: this.stateManager.createInitialState()
    });
    
    await this.sessionStore.save(session);
    return session;
  }
  
  // Centralized state access with scoping
  async getState(scope: StateScope): Promise<State> {
    switch (scope.type) {
      case 'session':
        return this.stateManager.getSessionState(scope.sessionId);
      
      case 'user':
        return this.stateManager.getUserState(scope.userId);
      
      case 'global':
        return this.stateManager.getGlobalState();
      
      case 'agent':
        return this.stateManager.getAgentState(scope.agentId);
    }
  }
}

// State scoping
export interface StateScope {
  type: 'session' | 'user' | 'global' | 'agent';
  sessionId?: string;
  userId?: string;
  agentId?: string;
}
```

### 4. Memory Module

Separate module for memory management:

```typescript
// modules/memory/index.ts
export interface IMemoryModule {
  initialize(config: MemoryConfig): Promise<void>;
  
  // Short-term memory
  addWorkingMemory(item: MemoryItem): Promise<void>;
  getWorkingMemory(limit?: number): Promise<MemoryItem[]>;
  
  // Long-term memory
  store(key: string, value: any, ttl?: number): Promise<void>;
  retrieve(query: string): Promise<MemoryResult[]>;
  
  // Vector operations
  embed(text: string): Promise<number[]>;
  search(embedding: number[], limit?: number): Promise<SearchResult[]>;
}

class MemoryModule implements IMemoryModule {
  private workingMemory: WorkingMemory;
  private vectorStore: IVectorStore;
  private embedder: IEmbedder;
  
  async initialize(config: MemoryConfig): Promise<void> {
    this.workingMemory = new WorkingMemory(config.workingMemory);
    this.vectorStore = await this.createVectorStore(config.vectorStore);
    this.embedder = await this.createEmbedder(config.embedding);
  }
}
```

### 5. Tools Module

Centralized tool management:

```typescript
// modules/tools/index.ts
export interface IToolsModule {
  register(tool: ITool): void;
  execute(toolName: string, args: any): Promise<any>;
  list(): ToolInfo[];
  validate(toolName: string, args: any): ValidationResult;
}

class ToolsModule implements IToolsModule {
  private tools = new Map<string, ITool>();
  private executor: ToolExecutor;
  
  register(tool: ITool): void {
    // Validate tool interface
    this.validateTool(tool);
    
    // Wrap tool for monitoring
    const wrapped = this.wrapTool(tool);
    
    this.tools.set(tool.name, wrapped);
  }
  
  private wrapTool(tool: ITool): ITool {
    return {
      ...tool,
      execute: async (args: any) => {
        const span = this.tracer.startSpan(`tool.${tool.name}`);
        
        try {
          // Pre-execution validation
          await this.preExecute(tool, args);
          
          // Execute with timeout
          const result = await this.withTimeout(
            tool.execute(args),
            tool.timeout || 30000
          );
          
          // Post-execution validation
          await this.postExecute(tool, result);
          
          return result;
        } catch (error) {
          span.recordException(error);
          throw error;
        } finally {
          span.end();
        }
      }
    };
  }
}
```

## Module Integration in AgentHub

```typescript
// agenthub/core.ts
export class AgentHub {
  private modules: ModuleRegistry;
  
  private constructor(config: AgentHubConfig) {
    this.modules = new ModuleRegistry();
    
    // Initialize core modules
    this.initializeCoreModules(config);
  }
  
  private async initializeCoreModules(config: AgentHubConfig): Promise<void> {
    // LiteLLM Module (connects to proxy)
    const litellm = createLiteLLMModule(config.litellm);
    await litellm.initialize(config.litellm);
    this.modules.register('litellm', litellm);
    
    // Langfuse Module (wrapped)
    const langfuse = createLangfuseModule(config.langfuse);
    await langfuse.initialize(config.langfuse);
    this.modules.register('langfuse', langfuse);
    
    // Session & State Module (centralized)
    const sessionState = createSessionStateModule(config.sessionState);
    await sessionState.initialize(config.sessionState);
    this.modules.register('sessionState', sessionState);
    
    // Memory Module
    const memory = createMemoryModule(config.memory);
    await memory.initialize(config.memory);
    this.modules.register('memory', memory);
    
    // Tools Module
    const tools = createToolsModule(config.tools);
    await tools.initialize(config.tools);
    this.modules.register('tools', tools);
  }
  
  // Controlled access to modules
  getModule<T>(name: string): T {
    const module = this.modules.get(name);
    if (!module) {
      throw new Error(`Module '${name}' not found`);
    }
    
    // Return wrapped module for additional control
    return this.wrapModuleAccess(module) as T;
  }
}
```

## Benefits of This Architecture

### 1. True Modularity
- Each capability is a separate module
- Modules can be developed/tested independently
- Easy to add new modules

### 2. Controlled Access
- No direct access to third-party libraries
- All interactions go through module interfaces
- Consistent error handling across modules

### 3. Centralized Management
- Session/state management in one place
- Unified configuration
- Consistent monitoring/logging

### 4. Flexibility
- Easy to swap implementations
- Can use different backends for each module
- Gradual migration possible

### 5. Testability
- Each module can be mocked
- Integration tests at module boundaries
- Clear separation of concerns

## Example: Creating an Agent with Modules

```typescript
class LLMAgent extends BaseAgent {
  private litellm: ILiteLLMModule;
  private sessionState: ISessionStateModule;
  private memory: IMemoryModule;
  
  constructor(config: LLMAgentConfig) {
    super(config);
    
    // Get modules from hub
    const hub = AgentHub.getInstance();
    this.litellm = hub.getModule<ILiteLLMModule>('litellm');
    this.sessionState = hub.getModule<ISessionStateModule>('sessionState');
    this.memory = hub.getModule<IMemoryModule>('memory');
  }
  
  async execute(input: AgentInput): Promise<AgentOutput> {
    // Get session
    const session = await this.sessionState.getSession(input.sessionId);
    
    // Get conversation memory
    const memories = await this.memory.getWorkingMemory();
    
    // Make LLM call through module
    const response = await this.litellm.complete({
      messages: this.buildMessages(input, memories),
      model: this.config.model
    });
    
    // Update state
    await this.sessionState.setState(
      { type: 'session', sessionId: session.id },
      'lastResponse',
      response
    );
    
    // Add to memory
    await this.memory.addWorkingMemory({
      role: 'assistant',
      content: response.content
    });
    
    return { content: response.content };
  }
}
```

## Module Development Guidelines

### 1. Module Interface
Every module must implement:
```typescript
interface IModule {
  name: string;
  version: string;
  initialize(config: any): Promise<void>;
  health(): Promise<HealthStatus>;
  shutdown(): Promise<void>;
}
```

### 2. Module Factory
Every module should have a factory function:
```typescript
export function createXModule(config: XConfig): IXModule {
  const module = new XModule();
  return wrapModule(module, 'x-module');
}
```

### 3. Error Handling
Modules should throw typed errors:
```typescript
export class ModuleError extends Error {
  constructor(
    public module: string,
    public code: string,
    message: string
  ) {
    super(message);
  }
}
```

This modular architecture ensures clean separation of concerns, controlled access to external dependencies, and centralized management of critical functions like session and state management.