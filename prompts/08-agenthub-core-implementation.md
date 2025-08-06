# AgentHub Core Implementation Prompt

## Context
You are implementing the AgentHub Core - the central factory, registry, and orchestration system that ties all agent types together. This is the culmination of all previous work, providing a unified interface for creating, managing, and monitoring agents while maintaining the transparent LiteLLM and Langfuse integration throughout the system.

## Pre-Implementation Requirements

### 1. Documentation Review
Before starting, you MUST:
1. Read `/Users/sakshams/tekai/TekContextEngine/agenthub-design.md` - Section 3: AgentHub Implementation
2. Review ALL previously implemented agent types
3. Study factory pattern best practices
4. Research service registry patterns
5. Understand dependency injection containers

### 2. Verify Prerequisites
Ensure these are implemented:
- BaseAgent with LiteLLM/Langfuse integration
- All agent types (LLM, Sequential, Loop, Parallel, Custom, MultiAgent)
- Type definitions for all agents
- Testing frameworks

### 3. Architecture Analysis
Think deeply about:
- Singleton vs instance-based design
- Agent lifecycle management
- Configuration management
- Plugin architecture
- Performance implications
- Developer ergonomics

## Implementation Steps

### Step 1: AgentHub Core Types
Create `src/agenthub/types.ts`:

```typescript
// Consider:
// - Global configuration structure
// - Registry types
// - Factory interfaces
// - Lifecycle hooks

export interface AgentHubConfig {
  // LiteLLM Configuration
  litellm: {
    api_keys: Record<string, string>;
    model_preferences: ModelPreferences;
    routing_strategy: RoutingStrategy;
    retry_config: RetryConfig;
    cache_config?: CacheConfig;
  };
  
  // Langfuse Configuration
  langfuse: {
    public_key: string;
    secret_key: string;
    base_url?: string;
    trace_config: TraceConfig;
    prompt_management: PromptManagementConfig;
  };
  
  // Agent Configuration
  agents: {
    default_timeout: number;
    max_concurrent_executions: number;
    state_persistence: StatePersistenceConfig;
    resource_limits: ResourceLimits;
  };
  
  // Security Configuration
  security: {
    enable_input_validation: boolean;
    enable_output_sanitization: boolean;
    allowed_tools: string[];
    blocked_models: string[];
    api_rate_limits: RateLimitConfig;
  };
  
  // Monitoring Configuration
  monitoring: {
    metrics_enabled: boolean;
    health_check_interval: number;
    alerting: AlertingConfig;
  };
}

export interface AgentRegistry {
  agents: Map<string, AgentConstructor>;
  metadata: Map<string, AgentMetadata>;
  dependencies: DependencyGraph;
}

export interface AgentMetadata {
  type: string;
  version: string;
  author?: string;
  description: string;
  capabilities: string[];
  requirements: AgentRequirements;
  examples?: AgentExample[];
}
```

**Testing Requirements**:
- Validate configuration schemas
- Test type exports
- Ensure backward compatibility

### Step 2: Configuration Management
Create `src/agenthub/config/`:

**Research First**:
1. Configuration validation patterns
2. Environment variable handling
3. Configuration merging strategies
4. Secret management best practices

**Implementation Components**:

1. **Configuration Loader**:
   ```typescript
   class ConfigurationManager {
     private config: AgentHubConfig;
     private validators: ConfigValidator[] = [];
     
     async load(sources: ConfigSource[]): Promise<AgentHubConfig> {
       // Load from multiple sources
       const configs = await Promise.all(
         sources.map(source => this.loadFromSource(source))
       );
       
       // Merge configurations (later sources override)
       const merged = this.mergeConfigs(configs);
       
       // Validate
       await this.validate(merged);
       
       // Apply defaults
       const withDefaults = this.applyDefaults(merged);
       
       // Resolve references
       const resolved = await this.resolveReferences(withDefaults);
       
       this.config = resolved;
       return resolved;
     }
     
     private async loadFromSource(
       source: ConfigSource
     ): Promise<Partial<AgentHubConfig>> {
       switch (source.type) {
         case 'file':
           return this.loadFromFile(source.path);
           
         case 'env':
           return this.loadFromEnv(source.prefix);
           
         case 'remote':
           return this.loadFromRemote(source.url);
           
         case 'code':
           return source.config;
       }
     }
     
     private validate(config: AgentHubConfig): void {
       // Schema validation
       this.validateSchema(config);
       
       // Business logic validation
       for (const validator of this.validators) {
         validator.validate(config);
       }
       
       // Security validation
       this.validateSecurity(config);
     }
   }
   ```

2. **Environment Integration**:
   ```typescript
   class EnvironmentConfigLoader {
     load(prefix: string = 'AGENTHUB_'): Partial<AgentHubConfig> {
       return {
         litellm: {
           api_keys: {
             openai: process.env[`${prefix}OPENAI_API_KEY`],
             anthropic: process.env[`${prefix}ANTHROPIC_API_KEY`],
             google: process.env[`${prefix}GOOGLE_API_KEY`]
           }
         },
         langfuse: {
           public_key: process.env[`${prefix}LANGFUSE_PUBLIC_KEY`],
           secret_key: process.env[`${prefix}LANGFUSE_SECRET_KEY`],
           base_url: process.env[`${prefix}LANGFUSE_BASE_URL`]
         }
       };
     }
   }
   ```

3. **Dynamic Configuration**:
   ```typescript
   class DynamicConfigManager {
     private watchers = new Map<string, ConfigWatcher>();
     
     watch(
       path: string,
       callback: (newValue: any) => void
     ): void {
       const watcher = new ConfigWatcher(path, callback);
       this.watchers.set(path, watcher);
       watcher.start();
     }
     
     async updateConfig(
       path: string,
       value: any
     ): Promise<void> {
       // Validate update
       await this.validateUpdate(path, value);
       
       // Apply update
       this.applyUpdate(path, value);
       
       // Notify watchers
       this.notifyWatchers(path, value);
     }
   }
   ```

### Step 3: Agent Registry and Factory
Create `src/agenthub/registry/`:

**Critical Design Decisions**:
- How to handle versioning
- Plugin loading mechanism
- Dependency resolution
- Hot reloading support

**Implementation**:

1. **Agent Registry**:
   ```typescript
   class AgentRegistryImpl implements AgentRegistry {
     private agents = new Map<string, AgentConstructor>();
     private metadata = new Map<string, AgentMetadata>();
     private instances = new WeakMap<string, IAgent>();
     
     register(
       type: string,
       constructor: AgentConstructor,
       metadata: AgentMetadata
     ): void {
       // Validate registration
       this.validateRegistration(type, constructor, metadata);
       
       // Check for conflicts
       if (this.agents.has(type)) {
         throw new Error(`Agent type '${type}' already registered`);
       }
       
       // Register
       this.agents.set(type, constructor);
       this.metadata.set(type, metadata);
       
       // Update dependency graph
       this.updateDependencies(type, metadata);
       
       // Emit registration event
       this.emit('agent:registered', { type, metadata });
     }
     
     unregister(type: string): void {
       // Check dependencies
       const dependents = this.findDependents(type);
       if (dependents.length > 0) {
         throw new Error(
           `Cannot unregister '${type}': required by ${dependents.join(', ')}`
         );
       }
       
       // Remove
       this.agents.delete(type);
       this.metadata.delete(type);
       
       // Cleanup instances
       this.cleanupInstances(type);
     }
     
     get(type: string): AgentConstructor {
       const constructor = this.agents.get(type);
       
       if (!constructor) {
         // Try to load dynamically
         const loaded = this.tryLoadAgent(type);
         if (loaded) {
           return loaded;
         }
         
         throw new Error(`Unknown agent type: ${type}`);
       }
       
       return constructor;
     }
     
     list(): AgentTypeInfo[] {
       return Array.from(this.metadata.entries()).map(
         ([type, metadata]) => ({
           type,
           ...metadata
         })
       );
     }
   }
   ```

2. **Agent Factory**:
   ```typescript
   class AgentFactory {
     constructor(
       private registry: AgentRegistry,
       private config: AgentHubConfig,
       private services: CoreServices
     ) {}
     
     create(config: AgentConfig): IAgent {
       // Resolve agent type
       const AgentClass = this.registry.get(config.type);
       
       // Enrich configuration
       const enrichedConfig = this.enrichConfig(config);
       
       // Create instance
       const agent = new AgentClass(enrichedConfig);
       
       // Apply instrumentation
       const instrumented = this.instrument(agent);
       
       // Initialize
       this.initialize(instrumented);
       
       // Cache if needed
       if (config.singleton) {
         this.cacheInstance(config.id, instrumented);
       }
       
       return instrumented;
     }
     
     private enrichConfig(config: AgentConfig): EnrichedAgentConfig {
       return {
         ...config,
         _internal: {
           litellm: this.services.litellm,
           langfuse: this.services.langfuse,
           hub: this,
           config: this.config
         }
       };
     }
     
     private instrument(agent: IAgent): IAgent {
       return new Proxy(agent, {
         get: (target, prop) => {
           // Intercept method calls for instrumentation
           if (typeof target[prop] === 'function') {
             return this.wrapMethod(target, prop);
           }
           
           return target[prop];
         }
       });
     }
     
     private wrapMethod(target: IAgent, method: string): Function {
       const original = target[method].bind(target);
       
       return async (...args: any[]) => {
         // Pre-execution hooks
         await this.preExecution(target, method, args);
         
         // Execute
         const result = await original(...args);
         
         // Post-execution hooks
         await this.postExecution(target, method, args, result);
         
         return result;
       };
     }
   }
   ```

### Step 4: AgentHub Core Implementation
Create `src/agenthub/agenthub.ts`:

**Singleton Implementation**:
```typescript
export class AgentHub {
  private static instance: AgentHub;
  
  private config: AgentHubConfig;
  private registry: AgentRegistry;
  private factory: AgentFactory;
  private services: CoreServices;
  private monitor: SystemMonitor;
  
  private constructor(config: AgentHubConfig) {
    this.config = config;
    this.initializeServices();
    this.initializeRegistry();
    this.initializeFactory();
    this.startMonitoring();
  }
  
  // Initialization
  static async initialize(
    config: AgentHubConfig | ConfigSource[]
  ): Promise<void> {
    if (AgentHub.instance) {
      throw new Error('AgentHub already initialized');
    }
    
    // Load configuration
    const finalConfig = Array.isArray(config)
      ? await new ConfigurationManager().load(config)
      : config;
    
    // Create instance
    AgentHub.instance = new AgentHub(finalConfig);
    
    // Register built-in agents
    await AgentHub.instance.registerBuiltInAgents();
    
    // Load plugins
    await AgentHub.instance.loadPlugins();
  }
  
  static getInstance(): AgentHub {
    if (!AgentHub.instance) {
      throw new Error(
        'AgentHub not initialized. Call AgentHub.initialize() first.'
      );
    }
    
    return AgentHub.instance;
  }
  
  // Agent Creation - Primary API
  static createAgent(config: AgentConfig): IAgent {
    return AgentHub.getInstance().factory.create(config);
  }
  
  // Batch Operations
  static createAgents(configs: AgentConfig[]): IAgent[] {
    const hub = AgentHub.getInstance();
    
    return configs.map(config => 
      hub.factory.create(config)
    );
  }
  
  // Agent Registration
  static registerAgent(
    type: string,
    constructor: AgentConstructor,
    metadata?: AgentMetadata
  ): void {
    const hub = AgentHub.getInstance();
    
    hub.registry.register(
      type,
      constructor,
      metadata || hub.generateMetadata(constructor)
    );
  }
  
  // Discovery
  static getAvailableAgents(): AgentTypeInfo[] {
    return AgentHub.getInstance().registry.list();
  }
  
  static getAgentMetadata(type: string): AgentMetadata {
    return AgentHub.getInstance().registry.getMetadata(type);
  }
  
  // Configuration
  static updateConfig(path: string, value: any): void {
    const hub = AgentHub.getInstance();
    hub.config = updatePath(hub.config, path, value);
    hub.notifyConfigChange(path, value);
  }
  
  // Monitoring
  static getMetrics(): SystemMetrics {
    return AgentHub.getInstance().monitor.getMetrics();
  }
  
  static getHealth(): HealthStatus {
    return AgentHub.getInstance().monitor.getHealth();
  }
  
  // Shutdown
  static async shutdown(): Promise<void> {
    if (!AgentHub.instance) return;
    
    const hub = AgentHub.instance;
    
    // Stop monitoring
    await hub.monitor.stop();
    
    // Cleanup agents
    await hub.cleanupAgents();
    
    // Shutdown services
    await hub.services.shutdown();
    
    // Clear instance
    AgentHub.instance = null;
  }
  
  // Private Methods
  private initializeServices(): void {
    this.services = {
      litellm: new LiteLLMService(this.config.litellm),
      langfuse: new LangfuseService(this.config.langfuse),
      state: new StateService(this.config.agents.state_persistence),
      cache: new CacheService(this.config.litellm.cache_config),
      metrics: new MetricsService(this.config.monitoring)
    };
  }
  
  private async registerBuiltInAgents(): Promise<void> {
    // Register all built-in agent types
    const builtInAgents = [
      { type: 'llm', constructor: LLMAgent },
      { type: 'sequential', constructor: SequentialAgent },
      { type: 'loop', constructor: LoopAgent },
      { type: 'parallel', constructor: ParallelAgent },
      { type: 'custom', constructor: CustomAgent },
      { type: 'multi_agent', constructor: MultiAgentSystem }
    ];
    
    for (const { type, constructor } of builtInAgents) {
      this.registry.register(
        type,
        constructor,
        this.generateMetadata(constructor)
      );
    }
  }
  
  private async loadPlugins(): Promise<void> {
    const pluginLoader = new PluginLoader(this.config.plugins);
    const plugins = await pluginLoader.load();
    
    for (const plugin of plugins) {
      await plugin.register(this);
    }
  }
}
```

### Step 5: Service Integration
Create `src/agenthub/services/`:

**Core Services Implementation**:

1. **LiteLLM Service**:
   ```typescript
   class LiteLLMService {
     private router: LiteLLMRouter;
     private modelPool: ModelPool;
     
     constructor(config: LiteLLMConfig) {
       this.router = new LiteLLMRouter({
         models: this.loadModels(config),
         routing_strategy: config.routing_strategy,
         fallbacks: config.fallbacks
       });
       
       this.modelPool = new ModelPool({
         max_concurrent: config.max_concurrent_calls,
         rate_limits: config.rate_limits
       });
     }
     
     async complete(request: LLMRequest): Promise<LLMResponse> {
       // Get token from pool
       const token = await this.modelPool.acquire(request.model);
       
       try {
         // Route request
         const routed = await this.router.route(request);
         
         // Execute with retries
         return await this.executeWithRetry(routed);
         
       } finally {
         this.modelPool.release(token);
       }
     }
   }
   ```

2. **Langfuse Service**:
   ```typescript
   class LangfuseService {
     private client: Langfuse;
     private traceContext = new AsyncLocalStorage<TraceContext>();
     
     constructor(config: LangfuseConfig) {
       this.client = new Langfuse({
         publicKey: config.public_key,
         secretKey: config.secret_key,
         baseUrl: config.base_url
       });
     }
     
     startTrace(name: string, metadata?: any): Trace {
       const trace = this.client.trace({
         name,
         metadata,
         timestamp: new Date()
       });
       
       // Store in async context
       this.traceContext.enterWith({ trace });
       
       return trace;
     }
     
     getCurrentTrace(): Trace | null {
       return this.traceContext.getStore()?.trace || null;
     }
     
     span(name: string, fn: () => Promise<any>): Promise<any> {
       const trace = this.getCurrentTrace();
       if (!trace) {
         return fn();
       }
       
       const span = trace.span({ name });
       
       return this.traceContext.run(
         { trace, span },
         async () => {
           try {
             const result = await fn();
             span.end({ level: 'DEFAULT' });
             return result;
           } catch (error) {
             span.end({ 
               level: 'ERROR',
               statusMessage: error.message 
             });
             throw error;
           }
         }
       );
     }
   }
   ```

### Step 6: Monitoring and Health
Create `src/agenthub/monitoring/`:

**System Monitoring**:
```typescript
class SystemMonitor {
  private metrics = new MetricsCollector();
  private health = new HealthChecker();
  private alerts = new AlertManager();
  
  async start(): Promise<void> {
    // Start metric collection
    this.startMetricCollection();
    
    // Start health checks
    this.startHealthChecks();
    
    // Start alert monitoring
    this.startAlertMonitoring();
  }
  
  private startMetricCollection(): void {
    setInterval(() => {
      this.collectSystemMetrics();
      this.collectAgentMetrics();
      this.collectServiceMetrics();
    }, this.config.metrics_interval);
  }
  
  private collectSystemMetrics(): void {
    this.metrics.record({
      cpu: process.cpuUsage(),
      memory: process.memoryUsage(),
      event_loop_lag: this.measureEventLoopLag(),
      active_agents: this.countActiveAgents()
    });
  }
  
  getMetrics(): SystemMetrics {
    return {
      system: this.metrics.getSystemMetrics(),
      agents: this.metrics.getAgentMetrics(),
      services: this.metrics.getServiceMetrics(),
      performance: this.calculatePerformanceMetrics()
    };
  }
}
```

### Step 7: Developer Experience
Create `src/agenthub/dx/`:

**Simplified APIs**:

1. **Fluent API**:
   ```typescript
   // Simple agent creation
   const agent = AgentHub.createAgent({
     type: 'llm',
     name: 'assistant',
     instruction: 'You are a helpful assistant'
   });
   
   // Builder pattern
   const complexAgent = AgentHub.builder()
     .type('sequential')
     .name('processor')
     .addStep({
       agent: 'llm',
       instruction: 'Extract data'
     })
     .addStep({
       agent: 'custom',
       class: 'Validator'
     })
     .withCheckpointing()
     .build();
   ```

2. **TypeScript Support**:
   ```typescript
   // Type-safe agent creation
   const typedAgent = AgentHub.createAgent<MyAgentType>({
     type: 'custom',
     class: 'MyAgent',
     config: {
       // Typed config
     }
   });
   
   // Async iteration support
   for await (const result of agent.stream(input)) {
     console.log(result);
   }
   ```

3. **Error Handling**:
   ```typescript
   class AgentHubError extends Error {
     constructor(
       message: string,
       public code: string,
       public details?: any
     ) {
       super(message);
     }
   }
   
   // Specific error types
   class AgentNotFoundError extends AgentHubError {}
   class ConfigurationError extends AgentHubError {}
   class InitializationError extends AgentHubError {}
   ```

### Step 8: Testing Utilities
Create `src/agenthub/testing/`:

**Testing Framework**:
```typescript
export class AgentHubTestKit {
  static createTestHub(
    config?: Partial<AgentHubConfig>
  ): AgentHub {
    const testConfig = {
      ...defaultTestConfig,
      ...config
    };
    
    return new AgentHub(testConfig);
  }
  
  static mockLLMResponse(
    pattern: string | RegExp,
    response: any
  ): void {
    MockLLMService.addMock(pattern, response);
  }
  
  static async testAgent(
    agent: IAgent,
    testCases: TestCase[]
  ): Promise<TestReport> {
    const results = [];
    
    for (const testCase of testCases) {
      const result = await this.runTestCase(agent, testCase);
      results.push(result);
    }
    
    return this.generateReport(results);
  }
}
```

## Post-Implementation Validation

### 1. Core Functionality
- [ ] Singleton pattern works correctly
- [ ] Configuration loading from multiple sources
- [ ] Agent registration and discovery
- [ ] Factory creates all agent types
- [ ] Service integration works

### 2. Developer Experience
- [ ] Simple API for common cases
- [ ] Good TypeScript support
- [ ] Clear error messages
- [ ] Comprehensive documentation
- [ ] Testing utilities work

### 3. Production Readiness
- [ ] Performance meets requirements
- [ ] Monitoring provides insights
- [ ] Health checks accurate
- [ ] Resource cleanup works
- [ ] Graceful shutdown

### 4. Integration Testing
Test complete flows:
- Multi-agent research system
- Complex workflow orchestration
- High-concurrency scenarios
- Failure recovery
- Configuration updates

## Common Pitfalls to Avoid

1. **Don't over-engineer** - Keep simple things simple
2. **Don't forget about testing** - Provide good test utilities
3. **Don't ignore performance** - Profile and optimize
4. **Don't hardcode assumptions** - Keep it configurable
5. **Don't neglect documentation** - It's part of the product
6. **Don't forget security** - Validate inputs, sanitize outputs

## Final System Validation

1. **End-to-End Test**:
   ```typescript
   // Create a complex multi-agent system
   const researchSystem = AgentHub.createAgent({
     type: 'multi_agent',
     name: 'research-system',
     // ... complex configuration
   });
   
   // Execute research task
   const result = await researchSystem.execute({
     topic: 'Quantum computing applications',
     depth: 'comprehensive'
   });
   
   // Verify all aspects work
   ```

2. **Performance Benchmark**:
   - Agent creation time < 10ms
   - Message passing latency < 1ms
   - Memory overhead < 50MB base
   - Scales to 1000+ agents

3. **Developer Experience Test**:
   - New developer can create agent in 5 minutes
   - Debugging tools sufficient
   - Documentation comprehensive
   - Examples cover common cases

## Next Steps

1. **Documentation**:
   - API reference
   - Architecture guide
   - Migration guide
   - Best practices

2. **Examples**:
   - Common patterns
   - Production systems
   - Performance optimization
   - Testing strategies

3. **Community**:
   - Plugin development guide
   - Contribution guidelines
   - Discord/Slack community
   - Regular releases

## Conclusion

AgentHub is now a complete, production-ready system for building AI agents. The transparent integration of LiteLLM and Langfuse means developers can focus on agent logic while the infrastructure handles routing, observability, and reliability. The modular architecture ensures extensibility while the carefully designed APIs provide an excellent developer experience.