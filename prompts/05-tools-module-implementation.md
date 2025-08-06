# Tools Module Implementation Prompt

## Context
You are implementing the Tools Module - a centralized system for managing, executing, and monitoring all tools available to agents in AgentHub. This module provides a registry for tools, handles validation, execution with timeouts, error handling, and provides a unified interface for tool discovery and invocation. It must support various tool types including API calls, code execution, file operations, and custom tools.

## Pre-Implementation Requirements

### 1. Documentation Review
You MUST read:
1. OpenAI Function Calling spec: https://platform.openai.com/docs/guides/function-calling
2. JSON Schema validation: https://json-schema.org/learn/getting-started-step-by-step
3. Tool patterns in LangChain: https://python.langchain.com/docs/modules/tools/
4. Review architecture: `/Users/sakshams/tekai/TekContextEngine/agenthub-architecture-revised.md`
5. Integration with other modules

### 2. Understand Module Requirements
This module must:
- Provide a centralized tool registry
- Validate tool inputs and outputs
- Execute tools with timeout and retry logic
- Monitor tool performance and usage
- Support tool versioning and deprecation
- Enable tool composition and chaining

## Implementation Steps

### Step 1: Module Interface and Types
Create `modules/tools/types.ts`:

```typescript
export interface IToolsModule {
  name: string;
  version: string;
  
  // Lifecycle
  initialize(config: ToolsConfig): Promise<void>;
  health(): Promise<HealthStatus>;
  shutdown(): Promise<void>;
  
  // Tool Registration
  register(tool: ITool): Promise<void>;
  unregister(toolName: string): Promise<void>;
  update(toolName: string, updates: Partial<ITool>): Promise<void>;
  
  // Tool Discovery
  list(filter?: ToolFilter): Promise<ToolInfo[]>;
  get(toolName: string): Promise<ITool | null>;
  search(query: string): Promise<ToolInfo[]>;
  
  // Tool Execution
  execute(toolName: string, args: any, context?: ToolContext): Promise<ToolResult>;
  executeMany(executions: ToolExecution[]): Promise<ToolResult[]>;
  
  // Tool Validation
  validate(toolName: string, args: any): Promise<ValidationResult>;
  validateOutput(toolName: string, output: any): Promise<ValidationResult>;
  
  // Tool Composition
  chain(tools: ChainedTool[]): Promise<IComposedTool>;
  
  // Monitoring
  getStats(toolName?: string): Promise<ToolStats>;
  getHistory(filter?: HistoryFilter): Promise<ToolExecutionHistory[]>;
}

export interface ToolsConfig {
  // Execution settings
  execution: {
    defaultTimeout?: number;      // Default timeout in ms
    maxRetries?: number;         // Default retry count
    retryDelay?: number;         // Delay between retries
    maxConcurrent?: number;      // Max concurrent executions
  };
  
  // Validation settings
  validation: {
    strict?: boolean;            // Strict schema validation
    coerceTypes?: boolean;       // Auto-coerce types
    removeAdditional?: boolean;  // Remove extra properties
  };
  
  // Security settings
  security: {
    allowedTools?: string[];     // Whitelist of tools
    blockedTools?: string[];     // Blacklist of tools
    sandboxed?: boolean;         // Run in sandbox
    maxExecutionTime?: number;   // Hard limit on execution
  };
  
  // Storage settings
  storage: {
    type: 'memory' | 'redis' | 'postgres';
    config?: any;
  };
  
  // Monitoring
  monitoring: {
    trackExecutions?: boolean;
    trackErrors?: boolean;
    metricsInterval?: number;
  };
}

export interface ITool {
  // Identity
  name: string;
  version: string;
  description: string;
  
  // Schema
  inputSchema: JsonSchema;      // JSON Schema for input validation
  outputSchema?: JsonSchema;    // JSON Schema for output validation
  
  // Execution
  execute: ToolExecutor;
  timeout?: number;             // Override default timeout
  retryable?: boolean;          // Can be retried on failure
  
  // Metadata
  category?: ToolCategory;
  tags?: string[];
  author?: string;
  
  // Configuration
  config?: ToolConfig;
  
  // Lifecycle
  initialize?: () => Promise<void>;
  cleanup?: () => Promise<void>;
  
  // Access control
  permissions?: ToolPermissions;
}

export type ToolExecutor = (
  args: any,
  context?: ToolContext
) => Promise<any> | any;

export interface ToolContext {
  sessionId?: string;
  userId?: string;
  agentId?: string;
  traceId?: string;
  metadata?: Record<string, any>;
  signal?: AbortSignal;        // For cancellation
}

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: ToolError;
  metadata: {
    toolName: string;
    version: string;
    executionTime: number;
    retries?: number;
    cached?: boolean;
  };
}

export interface ToolError {
  code: string;
  message: string;
  details?: any;
  retryable?: boolean;
}

export type ToolCategory = 
  | 'api'           // External API calls
  | 'database'      // Database operations
  | 'file'          // File system operations
  | 'compute'       // Computational tools
  | 'search'        // Search and retrieval
  | 'transform'     // Data transformation
  | 'validate'      // Validation tools
  | 'custom';       // Custom tools

export interface JsonSchema {
  type: string;
  properties?: Record<string, any>;
  required?: string[];
  additionalProperties?: boolean;
  // ... other JSON Schema properties
}
```

### Step 2: Tool Registry
Create `modules/tools/registry.ts`:

```typescript
import Ajv from 'ajv';

export class ToolRegistry {
  private tools = new Map<string, RegisteredTool>();
  private ajv: Ajv;
  
  constructor(private config: RegistryConfig) {
    this.ajv = new Ajv({
      allErrors: true,
      coerceTypes: config.coerceTypes,
      removeAdditional: config.removeAdditional
    });
  }
  
  async register(tool: ITool): Promise<void> {
    // Validate tool structure
    this.validateToolStructure(tool);
    
    // Check for conflicts
    const existing = this.tools.get(tool.name);
    if (existing && existing.version === tool.version) {
      throw new ToolError(
        'TOOL_EXISTS',
        `Tool ${tool.name} v${tool.version} already registered`
      );
    }
    
    // Compile schemas
    const inputValidator = this.ajv.compile(tool.inputSchema);
    const outputValidator = tool.outputSchema
      ? this.ajv.compile(tool.outputSchema)
      : null;
    
    // Initialize tool if needed
    if (tool.initialize) {
      await tool.initialize();
    }
    
    // Register
    const registered: RegisteredTool = {
      tool,
      inputValidator,
      outputValidator,
      stats: {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        totalExecutionTime: 0,
        lastExecuted: null
      },
      status: 'active'
    };
    
    this.tools.set(tool.name, registered);
    
    // Log registration
    console.log(`Registered tool: ${tool.name} v${tool.version}`);
  }
  
  async unregister(toolName: string): Promise<void> {
    const registered = this.tools.get(toolName);
    if (!registered) {
      throw new ToolError('TOOL_NOT_FOUND', `Tool ${toolName} not found`);
    }
    
    // Cleanup if needed
    if (registered.tool.cleanup) {
      await registered.tool.cleanup();
    }
    
    this.tools.delete(toolName);
  }
  
  get(toolName: string): RegisteredTool | null {
    return this.tools.get(toolName) || null;
  }
  
  list(filter?: ToolFilter): ToolInfo[] {
    const tools = Array.from(this.tools.values());
    
    let filtered = tools;
    
    // Apply filters
    if (filter?.category) {
      filtered = filtered.filter(t => t.tool.category === filter.category);
    }
    
    if (filter?.tags?.length) {
      filtered = filtered.filter(t => 
        filter.tags!.some(tag => t.tool.tags?.includes(tag))
      );
    }
    
    if (filter?.status) {
      filtered = filtered.filter(t => t.status === filter.status);
    }
    
    // Convert to ToolInfo
    return filtered.map(t => ({
      name: t.tool.name,
      version: t.tool.version,
      description: t.tool.description,
      category: t.tool.category,
      tags: t.tool.tags,
      status: t.status,
      stats: t.stats
    }));
  }
  
  search(query: string): ToolInfo[] {
    const lowerQuery = query.toLowerCase();
    
    const matches = Array.from(this.tools.values()).filter(t => {
      const tool = t.tool;
      
      // Search in name, description, tags
      return tool.name.toLowerCase().includes(lowerQuery) ||
             tool.description.toLowerCase().includes(lowerQuery) ||
             tool.tags?.some(tag => tag.toLowerCase().includes(lowerQuery));
    });
    
    return matches.map(t => ({
      name: t.tool.name,
      version: t.tool.version,
      description: t.tool.description,
      category: t.tool.category,
      tags: t.tool.tags,
      status: t.status,
      stats: t.stats
    }));
  }
  
  private validateToolStructure(tool: ITool): void {
    if (!tool.name || !tool.version || !tool.description) {
      throw new ToolError(
        'INVALID_TOOL',
        'Tool must have name, version, and description'
      );
    }
    
    if (!tool.inputSchema) {
      throw new ToolError(
        'INVALID_TOOL',
        'Tool must have input schema'
      );
    }
    
    if (typeof tool.execute !== 'function') {
      throw new ToolError(
        'INVALID_TOOL',
        'Tool must have execute function'
      );
    }
  }
}

interface RegisteredTool {
  tool: ITool;
  inputValidator: any;
  outputValidator: any | null;
  stats: ToolStats;
  status: 'active' | 'deprecated' | 'disabled';
}
```

### Step 3: Tool Executor
Create `modules/tools/executor.ts`:

```typescript
export class ToolExecutor {
  private executing = new Map<string, AbortController>();
  private semaphore: Semaphore;
  
  constructor(
    private registry: ToolRegistry,
    private config: ExecutorConfig
  ) {
    this.semaphore = new Semaphore(config.maxConcurrent || 10);
  }
  
  async execute(
    toolName: string,
    args: any,
    context?: ToolContext
  ): Promise<ToolResult> {
    const registered = this.registry.get(toolName);
    if (!registered) {
      throw new ToolError('TOOL_NOT_FOUND', `Tool ${toolName} not found`);
    }
    
    // Check permissions
    if (!this.checkPermissions(registered.tool, context)) {
      throw new ToolError(
        'PERMISSION_DENIED',
        `Permission denied for tool ${toolName}`
      );
    }
    
    // Validate input
    const validation = this.validateInput(registered, args);
    if (!validation.valid) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input',
          details: validation.errors
        },
        metadata: {
          toolName,
          version: registered.tool.version,
          executionTime: 0
        }
      };
    }
    
    // Execute with monitoring
    return this.executeWithMonitoring(registered, args, context);
  }
  
  private async executeWithMonitoring(
    registered: RegisteredTool,
    args: any,
    context?: ToolContext
  ): Promise<ToolResult> {
    const startTime = Date.now();
    const executionId = generateId('exec');
    
    // Create abort controller
    const abortController = new AbortController();
    this.executing.set(executionId, abortController);
    
    // Merge abort signals
    const signal = context?.signal
      ? mergeAbortSignals([context.signal, abortController.signal])
      : abortController.signal;
    
    const enrichedContext: ToolContext = {
      ...context,
      signal
    };
    
    try {
      // Acquire semaphore
      await this.semaphore.acquire();
      
      // Start span for monitoring
      const span = this.startSpan(registered.tool, args);
      
      try {
        // Execute with timeout and retries
        const result = await this.executeWithRetries(
          registered,
          args,
          enrichedContext
        );
        
        // Validate output if schema provided
        if (registered.outputValidator) {
          const outputValidation = this.validateOutput(registered, result);
          if (!outputValidation.valid) {
            throw new ToolError(
              'OUTPUT_VALIDATION_ERROR',
              'Tool output does not match schema',
              outputValidation.errors
            );
          }
        }
        
        // Update stats
        this.updateStats(registered, true, Date.now() - startTime);
        
        // End span
        span?.end({ success: true });
        
        return {
          success: true,
          data: result,
          metadata: {
            toolName: registered.tool.name,
            version: registered.tool.version,
            executionTime: Date.now() - startTime
          }
        };
        
      } catch (error) {
        // Update stats
        this.updateStats(registered, false, Date.now() - startTime);
        
        // End span with error
        span?.end({ success: false, error });
        
        throw error;
      }
      
    } finally {
      this.semaphore.release();
      this.executing.delete(executionId);
    }
  }
  
  private async executeWithRetries(
    registered: RegisteredTool,
    args: any,
    context: ToolContext
  ): Promise<any> {
    const tool = registered.tool;
    const maxRetries = tool.retryable ? (this.config.maxRetries || 3) : 1;
    
    let lastError: Error;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Check if cancelled
        if (context.signal?.aborted) {
          throw new ToolError('CANCELLED', 'Execution cancelled');
        }
        
        // Execute with timeout
        const timeout = tool.timeout || this.config.defaultTimeout || 30000;
        
        const result = await this.withTimeout(
          tool.execute(args, context),
          timeout,
          context.signal
        );
        
        return result;
        
      } catch (error) {
        lastError = error;
        
        // Don't retry if not retryable
        if (!this.isRetryable(error)) {
          throw error;
        }
        
        // Wait before retry
        if (attempt < maxRetries - 1) {
          const delay = this.calculateRetryDelay(attempt);
          await this.delay(delay);
        }
      }
    }
    
    throw lastError!;
  }
  
  private async withTimeout<T>(
    promise: Promise<T>,
    timeout: number,
    signal?: AbortSignal
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      const timer = setTimeout(() => {
        reject(new ToolError('TIMEOUT', `Execution timed out after ${timeout}ms`));
      }, timeout);
      
      signal?.addEventListener('abort', () => {
        clearTimeout(timer);
        reject(new ToolError('CANCELLED', 'Execution cancelled'));
      });
    });
    
    return Promise.race([promise, timeoutPromise]);
  }
  
  private validateInput(
    registered: RegisteredTool,
    args: any
  ): ValidationResult {
    const valid = registered.inputValidator(args);
    
    return {
      valid,
      errors: valid ? null : registered.inputValidator.errors
    };
  }
  
  private isRetryable(error: any): boolean {
    // Network errors are retryable
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return true;
    }
    
    // Check if error explicitly marks as retryable
    if (error.retryable === true) {
      return true;
    }
    
    // 5xx errors are retryable
    if (error.status >= 500) {
      return true;
    }
    
    return false;
  }
  
  private startSpan(tool: ITool, args: any): any {
    // Get Langfuse module
    const langfuse = AgentHub.getInstance()
      .getModule<ILangfuseModule>('langfuse');
    
    const trace = langfuse.getCurrentTrace();
    if (!trace) return null;
    
    return trace.span({
      name: `tool.${tool.name}`,
      input: args,
      metadata: {
        toolVersion: tool.version,
        category: tool.category
      }
    });
  }
}
```

### Step 4: Tool Composition
Create `modules/tools/composition.ts`:

```typescript
export class ToolComposer {
  constructor(
    private registry: ToolRegistry,
    private executor: ToolExecutor
  ) {}
  
  async chain(tools: ChainedTool[]): Promise<IComposedTool> {
    // Validate chain
    this.validateChain(tools);
    
    // Create composed tool
    const composedTool: IComposedTool = {
      name: this.generateChainName(tools),
      version: '1.0.0',
      description: this.generateChainDescription(tools),
      inputSchema: this.deriveInputSchema(tools),
      outputSchema: this.deriveOutputSchema(tools),
      
      execute: async (args: any, context?: ToolContext) => {
        return this.executeChain(tools, args, context);
      },
      
      metadata: {
        type: 'composed',
        tools: tools.map(t => ({
          name: t.toolName,
          step: t.step
        }))
      }
    };
    
    return composedTool;
  }
  
  private async executeChain(
    tools: ChainedTool[],
    initialArgs: any,
    context?: ToolContext
  ): Promise<any> {
    let currentData = initialArgs;
    const results: any[] = [];
    
    for (const chainedTool of tools) {
      // Prepare arguments
      const args = this.prepareArgs(chainedTool, currentData, results);
      
      // Execute tool
      const result = await this.executor.execute(
        chainedTool.toolName,
        args,
        context
      );
      
      if (!result.success) {
        throw new ToolError(
          'CHAIN_EXECUTION_ERROR',
          `Failed at step ${chainedTool.step}: ${result.error?.message}`,
          { step: chainedTool.step, error: result.error }
        );
      }
      
      // Store result
      results.push(result.data);
      
      // Transform for next step
      currentData = chainedTool.transform
        ? chainedTool.transform(result.data, results)
        : result.data;
    }
    
    return currentData;
  }
  
  private prepareArgs(
    chainedTool: ChainedTool,
    currentData: any,
    previousResults: any[]
  ): any {
    if (chainedTool.mapInputs) {
      return chainedTool.mapInputs(currentData, previousResults);
    }
    
    // Default: pass current data as is
    return currentData;
  }
  
  private validateChain(tools: ChainedTool[]): void {
    if (!tools.length) {
      throw new ToolError('INVALID_CHAIN', 'Chain must have at least one tool');
    }
    
    // Check all tools exist
    for (const chainedTool of tools) {
      const tool = this.registry.get(chainedTool.toolName);
      if (!tool) {
        throw new ToolError(
          'TOOL_NOT_FOUND',
          `Tool ${chainedTool.toolName} not found in chain`
        );
      }
    }
    
    // Validate step numbers
    const steps = tools.map(t => t.step).sort((a, b) => a - b);
    for (let i = 0; i < steps.length; i++) {
      if (steps[i] !== i) {
        throw new ToolError(
          'INVALID_CHAIN',
          'Chain steps must be sequential starting from 0'
        );
      }
    }
  }
}

export interface ChainedTool {
  step: number;
  toolName: string;
  mapInputs?: (currentData: any, previousResults: any[]) => any;
  transform?: (result: any, allResults: any[]) => any;
}

export interface IComposedTool extends ITool {
  metadata: {
    type: 'composed';
    tools: Array<{ name: string; step: number }>;
  };
}
```

### Step 5: Built-in Tools
Create `modules/tools/builtin/`:

**HTTP Tool**:
```typescript
export const httpTool: ITool = {
  name: 'http',
  version: '1.0.0',
  description: 'Make HTTP requests',
  category: 'api',
  tags: ['http', 'api', 'request'],
  
  inputSchema: {
    type: 'object',
    properties: {
      method: {
        type: 'string',
        enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
      },
      url: {
        type: 'string',
        format: 'uri'
      },
      headers: {
        type: 'object',
        additionalProperties: { type: 'string' }
      },
      body: {
        type: ['object', 'string', 'null']
      },
      timeout: {
        type: 'number',
        minimum: 0
      }
    },
    required: ['method', 'url']
  },
  
  outputSchema: {
    type: 'object',
    properties: {
      status: { type: 'number' },
      headers: { type: 'object' },
      body: {},
      error: { type: ['string', 'null'] }
    },
    required: ['status']
  },
  
  execute: async (args: any) => {
    const { method, url, headers, body, timeout } = args;
    
    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: timeout ? AbortSignal.timeout(timeout) : undefined
      });
      
      const responseBody = await response.text();
      
      return {
        status: response.status,
        headers: Object.fromEntries(response.headers),
        body: tryParseJSON(responseBody) || responseBody,
        error: null
      };
    } catch (error) {
      return {
        status: 0,
        headers: {},
        body: null,
        error: error.message
      };
    }
  },
  
  timeout: 30000,
  retryable: true
};
```

### Step 6: Module Implementation
Create `modules/tools/index.ts`:

```typescript
export class ToolsModule implements IToolsModule {
  readonly name = 'tools';
  readonly version = '1.0.0';
  
  private registry: ToolRegistry;
  private executor: ToolExecutor;
  private composer: ToolComposer;
  private storage: IToolStorage;
  private initialized = false;
  
  async initialize(config: ToolsConfig): Promise<void> {
    // Initialize registry
    this.registry = new ToolRegistry({
      coerceTypes: config.validation?.coerceTypes,
      removeAdditional: config.validation?.removeAdditional
    });
    
    // Initialize executor
    this.executor = new ToolExecutor(this.registry, {
      defaultTimeout: config.execution?.defaultTimeout,
      maxRetries: config.execution?.maxRetries,
      maxConcurrent: config.execution?.maxConcurrent
    });
    
    // Initialize composer
    this.composer = new ToolComposer(this.registry, this.executor);
    
    // Initialize storage
    this.storage = await this.createStorage(config.storage);
    
    // Register built-in tools
    await this.registerBuiltinTools();
    
    this.initialized = true;
  }
  
  async register(tool: ITool): Promise<void> {
    this.ensureInitialized();
    
    // Check security
    if (!this.isToolAllowed(tool.name)) {
      throw new ToolError(
        'SECURITY_ERROR',
        `Tool ${tool.name} is not allowed`
      );
    }
    
    await this.registry.register(tool);
    
    // Store in persistent storage
    await this.storage.saveTool(tool);
  }
  
  async execute(
    toolName: string,
    args: any,
    context?: ToolContext
  ): Promise<ToolResult> {
    this.ensureInitialized();
    
    // Add trace context
    const enrichedContext = this.enrichContext(context);
    
    // Execute
    const result = await this.executor.execute(
      toolName,
      args,
      enrichedContext
    );
    
    // Store execution history
    await this.storage.saveExecution({
      toolName,
      args,
      result,
      context: enrichedContext,
      timestamp: new Date()
    });
    
    return result;
  }
  
  async executeMany(
    executions: ToolExecution[]
  ): Promise<ToolResult[]> {
    this.ensureInitialized();
    
    // Execute in parallel with concurrency control
    const results = await Promise.all(
      executions.map(exec => 
        this.execute(exec.toolName, exec.args, exec.context)
      )
    );
    
    return results;
  }
  
  async validate(
    toolName: string,
    args: any
  ): Promise<ValidationResult> {
    this.ensureInitialized();
    
    const registered = this.registry.get(toolName);
    if (!registered) {
      return {
        valid: false,
        errors: [{ message: `Tool ${toolName} not found` }]
      };
    }
    
    const valid = registered.inputValidator(args);
    
    return {
      valid,
      errors: valid ? null : registered.inputValidator.errors
    };
  }
  
  async chain(tools: ChainedTool[]): Promise<IComposedTool> {
    this.ensureInitialized();
    return this.composer.chain(tools);
  }
  
  async health(): Promise<HealthStatus> {
    try {
      const toolCount = this.registry.list().length;
      const stats = await this.getStats();
      
      return {
        status: 'healthy',
        message: 'Tools module operational',
        details: {
          registeredTools: toolCount,
          totalExecutions: stats.totalExecutions,
          successRate: stats.successRate
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error.message,
        details: { error }
      };
    }
  }
  
  private async registerBuiltinTools(): Promise<void> {
    // Register HTTP tool
    await this.register(httpTool);
    
    // Register other built-in tools
    // await this.register(jsonTool);
    // await this.register(regexTool);
    // etc.
  }
  
  private enrichContext(context?: ToolContext): ToolContext {
    // Add trace ID from Langfuse if available
    const langfuse = AgentHub.getInstance()
      .getModule<ILangfuseModule>('langfuse');
    
    const trace = langfuse.getCurrentTrace();
    
    return {
      ...context,
      traceId: trace?.id,
      metadata: {
        ...context?.metadata,
        timestamp: new Date().toISOString()
      }
    };
  }
  
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('Tools module not initialized');
    }
  }
}
```

### Step 7: Module Factory
Create `modules/tools/factory.ts`:

```typescript
export function createToolsModule(config: ToolsConfig): IToolsModule {
  const module = new ToolsModule();
  
  return wrapModule(module, {
    name: 'tools',
    monitoring: {
      trackLatency: true,
      trackErrors: true,
      trackMethodCalls: [
        'execute',
        'executeMany',
        'register'
      ]
    },
    security: {
      validateAccess: true,
      rateLimit: {
        execute: { requests: 100, window: 60000 },
        register: { requests: 10, window: 60000 }
      }
    }
  });
}
```

## Testing Requirements

### 1. Unit Tests
- Tool registration and validation
- Input/output schema validation
- Execution with timeout
- Retry logic
- Tool composition

### 2. Integration Tests
- Built-in tools functionality
- Error handling scenarios
- Concurrent execution
- Tool chaining
- Storage persistence

### 3. Performance Tests
- Execution latency
- Concurrent execution limits
- Memory usage with many tools
- Schema validation performance

## Post-Implementation Validation

### 1. Functionality Checklist
- [ ] Tools can be registered with schemas
- [ ] Input validation works correctly
- [ ] Execution respects timeouts
- [ ] Retry logic functions properly
- [ ] Tool composition creates valid tools
- [ ] Built-in tools work correctly

### 2. Security Requirements
- [ ] Tool permissions are enforced
- [ ] Execution is sandboxed if configured
- [ ] No code injection vulnerabilities
- [ ] Rate limiting works

### 3. Performance Requirements
- [ ] Tool execution < 10ms overhead
- [ ] Schema validation < 5ms
- [ ] Supports 100+ concurrent executions
- [ ] No memory leaks

## Common Pitfalls to Avoid

1. **Don't trust tool outputs** - Always validate
2. **Don't ignore timeouts** - Enforce execution limits
3. **Don't skip permission checks** - Security first
4. **Don't allow arbitrary code execution** - Sandbox properly
5. **Don't forget error context** - Provide debugging info
6. **Don't block on tool execution** - Use async patterns

## Final Validation Questions

1. Are all tools properly validated?
2. Is execution properly sandboxed?
3. Do timeouts and cancellation work?
4. Is tool discovery intuitive?
5. Are errors informative?
6. Is the module extensible?

## Next Steps
After completing the Tools module, implement the Module Registry (06-module-registry-implementation.md) for centralized module management.