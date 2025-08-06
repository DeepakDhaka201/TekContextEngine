# Custom Agent Implementation Prompt

## Context
You are implementing the Custom Agent framework - the extensibility layer that allows developers to create specialized agents with arbitrary logic while still benefiting from AgentHub's infrastructure. This framework must provide powerful primitives, helper methods, and patterns that make it easy to build complex custom agents without reimplementing common functionality.

## Pre-Implementation Requirements

### 1. Documentation Review
Before starting, you MUST:
1. Read `/Users/sakshams/tekai/TekContextEngine/agenthub-design.md` - Section 2.5 Custom Agent
2. Study all implemented agent types to understand patterns
3. Read Google ADK Custom Agent docs: https://google.github.io/adk-docs/agents/custom-agents/
4. Research plugin architectures and extension patterns
5. Study dependency injection patterns

### 2. Understand Extension Points
Analyze what developers need:
- Access to LLM calls
- State management
- Sub-agent orchestration
- Tool execution
- Event handling
- Resource management
- Custom metrics

### 3. Architecture Analysis
Think deeply about:
- Making the framework intuitive
- Providing powerful but safe abstractions
- Enabling complex patterns simply
- Maintaining type safety
- Supporting testing and debugging
- Performance implications

## Implementation Steps

### Step 1: Custom Agent Framework Types
Create `src/agents/custom/types.ts`:

```typescript
// Consider:
// - What hooks developers need
// - How to type custom configurations
// - Event system design
// - Plugin capabilities

export interface CustomAgentConfig extends BaseAgentConfig {
  // User-defined configuration
  custom_config?: Record<string, any>;
  
  // Dependencies
  dependencies?: AgentDependencies;
  
  // Event handlers
  event_handlers?: EventHandlerMap;
  
  // Resource requirements
  resources?: ResourceRequirements;
  
  // Capability declarations
  capabilities?: AgentCapabilities;
}

export interface AgentContext {
  // Access to core services
  llm: LLMInterface;
  tracer: TracerInterface;
  state: StateManager;
  events: EventEmitter;
  
  // Sub-agent management
  agents: AgentManager;
  
  // Utilities
  utils: AgentUtilities;
  
  // Custom storage
  storage: CustomStorage;
}

export interface CustomAgentBuilder {
  // Lifecycle hooks
  onInitialize?: (context: AgentContext) => Promise<void>;
  onExecute: (input: AgentInput, context: AgentContext) => Promise<AgentOutput>;
  onCleanup?: (context: AgentContext) => Promise<void>;
  
  // Event handlers
  onStateChange?: (change: StateChange, context: AgentContext) => void;
  onSubAgentComplete?: (result: SubAgentResult, context: AgentContext) => void;
  onError?: (error: Error, context: AgentContext) => Promise<ErrorRecovery>;
  
  // Custom methods
  [key: string]: any;
}
```

**Testing Requirements**:
- Validate type extensions work
- Test configuration merging
- Ensure context access is safe

### Step 2: Agent Builder Framework
Create `src/agents/custom/builder/custom-agent-builder.ts`:

**Design Principles**:
- Fluent API for configuration
- Type-safe builder pattern
- Validation at build time
- Clear error messages

**Implementation**:

1. **Builder Pattern**:
   ```typescript
   class CustomAgentBuilderImpl {
     private config: Partial<CustomAgentConfig> = {};
     private handlers: Partial<CustomAgentBuilder> = {};
     
     withConfig(config: Record<string, any>): this {
       this.config.custom_config = {
         ...this.config.custom_config,
         ...config
       };
       return this;
     }
     
     withDependencies(deps: AgentDependencies): this {
       this.config.dependencies = deps;
       return this;
     }
     
     onInitialize(
       handler: (context: AgentContext) => Promise<void>
     ): this {
       this.handlers.onInitialize = handler;
       return this;
     }
     
     onExecute(
       handler: (input: AgentInput, context: AgentContext) => Promise<AgentOutput>
     ): this {
       this.handlers.onExecute = handler;
       return this;
     }
     
     withCapability(capability: string, metadata?: any): this {
       this.config.capabilities = {
         ...this.config.capabilities,
         [capability]: metadata || true
       };
       return this;
     }
     
     build(): CustomAgent {
       this.validate();
       
       return new CustomAgent(
         this.config as CustomAgentConfig,
         this.handlers as CustomAgentBuilder
       );
     }
     
     private validate(): void {
       if (!this.handlers.onExecute) {
         throw new Error('onExecute handler is required');
       }
       
       // Additional validation
       this.validateDependencies();
       this.validateCapabilities();
     }
   }
   ```

2. **Static Factory Methods**:
   ```typescript
   export class CustomAgentFactory {
     static create(): CustomAgentBuilderImpl {
       return new CustomAgentBuilderImpl();
     }
     
     static fromClass<T extends CustomAgentClass>(
       AgentClass: new (context: AgentContext) => T
     ): CustomAgent {
       return this.create()
         .onInitialize(async (ctx) => {
           ctx.storage.instance = new AgentClass(ctx);
         })
         .onExecute(async (input, ctx) => {
           return ctx.storage.instance.execute(input);
         })
         .build();
     }
     
     static fromFunction(
       executeFn: (input: AgentInput, context: AgentContext) => Promise<AgentOutput>
     ): CustomAgent {
       return this.create()
         .onExecute(executeFn)
         .build();
     }
   }
   ```

### Step 3: Context and Helper Utilities
Create `src/agents/custom/context/`:

**Critical Helpers for Developers**:

1. **Sub-Agent Management**:
   ```typescript
   class AgentManager {
     constructor(
       private hub: AgentHub,
       private parentContext: ExecutionContext
     ) {}
     
     async call<T = any>(
       agent: AgentConfig | IAgent,
       input: any,
       options?: CallOptions
     ): Promise<T> {
       const span = this.parentContext.tracer.startSpan(
         `subagent.${agent.name}`
       );
       
       try {
         const agentInstance = this.resolveAgent(agent);
         const result = await agentInstance.execute({
           ...input,
           parent_context: this.parentContext
         });
         
         span.setAttributes({
           success: true,
           agent_type: agentInstance.type
         });
         
         return result.content;
       } catch (error) {
         span.recordException(error);
         throw error;
       } finally {
         span.end();
       }
     }
     
     async parallel<T = any>(
       agents: Array<AgentConfig | IAgent>,
       input: any,
       aggregation?: AggregationStrategy
     ): Promise<T> {
       // Use ParallelAgent internally
       const parallelAgent = new ParallelAgent({
         branches: agents.map(a => ({ agent: a })),
         aggregation: aggregation || { type: 'merge' }
       });
       
       return this.call(parallelAgent, input);
     }
     
     async sequence<T = any>(
       agents: Array<AgentConfig | IAgent>,
       input: any,
       options?: SequenceOptions
     ): Promise<T> {
       // Use SequentialAgent internally
       const sequentialAgent = new SequentialAgent({
         steps: agents.map(a => ({ agent: a })),
         ...options
       });
       
       return this.call(sequentialAgent, input);
     }
   }
   ```

2. **State Management Helpers**:
   ```typescript
   class StateManager {
     constructor(
       private state: AgentState,
       private onChange?: (change: StateChange) => void
     ) {}
     
     get<T = any>(path: string, defaultValue?: T): T {
       return this.getByPath(this.state, path, defaultValue);
     }
     
     set(path: string, value: any): void {
       const oldValue = this.get(path);
       this.setByPath(this.state, path, value);
       
       if (this.onChange) {
         this.onChange({
           path,
           oldValue,
           newValue: value,
           timestamp: Date.now()
         });
       }
     }
     
     update(updates: Partial<AgentState>): void {
       Object.assign(this.state, updates);
       
       if (this.onChange) {
         this.onChange({
           path: '*',
           oldValue: null,
           newValue: updates,
           timestamp: Date.now()
         });
       }
     }
     
     checkpoint(): StateCheckpoint {
       return {
         state: JSON.parse(JSON.stringify(this.state)),
         timestamp: Date.now()
       };
     }
   }
   ```

3. **Utility Functions**:
   ```typescript
   class AgentUtilities {
     // Retry logic
     async retry<T>(
       fn: () => Promise<T>,
       options?: RetryOptions
     ): Promise<T> {
       return this.retryWithBackoff(fn, options);
     }
     
     // Caching
     async cached<T>(
       key: string,
       fn: () => Promise<T>,
       ttl?: number
     ): Promise<T> {
       const cached = await this.cache.get(key);
       if (cached) return cached;
       
       const result = await fn();
       await this.cache.set(key, result, ttl);
       
       return result;
     }
     
     // Batching
     batch<T, R>(
       fn: (items: T[]) => Promise<R[]>,
       options?: BatchOptions
     ): (item: T) => Promise<R> {
       return this.createBatcher(fn, options);
     }
     
     // Rate limiting
     rateLimit(
       fn: Function,
       options: RateLimitOptions
     ): Function {
       return this.createRateLimiter(fn, options);
     }
     
     // Timeout
     async withTimeout<T>(
       fn: () => Promise<T>,
       timeout: number
     ): Promise<T> {
       return Promise.race([
         fn(),
         this.createTimeoutPromise(timeout)
       ]);
     }
   }
   ```

### Step 4: Custom Agent Base Implementation
Create `src/agents/custom/custom-agent.ts`:

**Core Implementation**:
```typescript
export abstract class CustomAgent extends BaseAgent {
  protected builder: CustomAgentBuilder;
  protected context: AgentContext;
  
  constructor(
    config: CustomAgentConfig,
    builder: CustomAgentBuilder
  ) {
    super(config);
    this.type = AgentType.CUSTOM;
    this.builder = builder;
  }
  
  async initialize(context: InitializationContext): Promise<void> {
    await super.initialize(context);
    
    // Create agent context
    this.context = this.createContext(context);
    
    // Call user's initialize hook
    if (this.builder.onInitialize) {
      await this.builder.onInitialize(this.context);
    }
    
    // Initialize dependencies
    await this.initializeDependencies();
  }
  
  protected async executeCore(input: AgentInput): Promise<AgentOutput> {
    // Pre-execution hooks
    await this.preExecute(input);
    
    try {
      // Call user's execute handler
      const result = await this.builder.onExecute(
        input,
        this.context
      );
      
      // Post-execution hooks
      await this.postExecute(input, result);
      
      return result;
      
    } catch (error) {
      // Error handling
      if (this.builder.onError) {
        const recovery = await this.builder.onError(
          error,
          this.context
        );
        
        if (recovery.retry) {
          return this.executeCore(recovery.modifiedInput || input);
        }
        
        if (recovery.fallback) {
          return recovery.fallback;
        }
      }
      
      throw error;
    }
  }
  
  private createContext(init: InitializationContext): AgentContext {
    return {
      llm: this.llm,  // From BaseAgent
      tracer: this.tracer,  // From BaseAgent
      state: new StateManager(
        this.state,
        this.builder.onStateChange
      ),
      events: this.createEventEmitter(),
      agents: new AgentManager(
        AgentHub.getInstance(),
        this.executionContext
      ),
      utils: new AgentUtilities(this.config),
      storage: new CustomStorage()
    };
  }
}
```

### Step 5: Common Custom Agent Patterns
Create `src/agents/custom/patterns/`:

**1. Validator Agent Pattern**:
```typescript
export abstract class ValidatorAgent extends CustomAgent {
  protected abstract validate(data: any): Promise<ValidationResult>;
  
  async executeCore(input: AgentInput): Promise<AgentOutput> {
    const validationResult = await this.validate(input.data);
    
    if (!validationResult.isValid) {
      if (this.config.throw_on_invalid) {
        throw new ValidationError(validationResult.errors);
      }
      
      return {
        content: null,
        metadata: {
          validation_errors: validationResult.errors
        }
      };
    }
    
    return {
      content: validationResult.validated,
      metadata: {
        validation_passed: true
      }
    };
  }
}
```

**2. Transform Agent Pattern**:
```typescript
export abstract class TransformAgent extends CustomAgent {
  protected abstract transform(
    data: any,
    context: TransformContext
  ): Promise<any>;
  
  async executeCore(input: AgentInput): Promise<AgentOutput> {
    const context = this.createTransformContext(input);
    
    const transformed = await this.utils.retry(
      () => this.transform(input.data, context),
      { max_attempts: 3 }
    );
    
    return {
      content: transformed,
      metadata: {
        transform_type: this.config.transform_type,
        duration: context.duration
      }
    };
  }
}
```

**3. Monitor Agent Pattern**:
```typescript
export abstract class MonitorAgent extends CustomAgent {
  protected abstract collectMetrics(): Promise<Metrics>;
  protected abstract evaluateHealth(metrics: Metrics): HealthStatus;
  
  async executeCore(input: AgentInput): Promise<AgentOutput> {
    const metrics = await this.collectMetrics();
    const health = this.evaluateHealth(metrics);
    
    // Emit events based on health
    if (health.status === 'critical') {
      this.context.events.emit('alert', {
        level: 'critical',
        metrics,
        timestamp: Date.now()
      });
    }
    
    return {
      content: {
        metrics,
        health,
        recommendations: await this.generateRecommendations(health)
      }
    };
  }
}
```

### Step 6: Example Custom Agents
Create `src/agents/custom/examples/`:

**Example 1: Data Enrichment Agent**
```typescript
const enrichmentAgent = CustomAgentFactory.create()
  .withConfig({
    enrichment_sources: ['api1', 'api2', 'database'],
    cache_ttl: 3600
  })
  .withDependencies({
    apis: {
      api1: new API1Client(),
      api2: new API2Client()
    },
    database: dbConnection
  })
  .onInitialize(async (context) => {
    // Preload enrichment rules
    context.storage.rules = await context.utils.cached(
      'enrichment-rules',
      () => loadEnrichmentRules(),
      3600
    );
  })
  .onExecute(async (input, context) => {
    const { data } = input;
    
    // Enrich data in parallel
    const enrichments = await context.agents.parallel(
      context.config.enrichment_sources.map(source => ({
        type: 'custom',
        class: `${source}Enricher`,
        config: { data }
      }))
    );
    
    // Merge enrichments
    const enriched = context.utils.deepMerge(
      data,
      ...enrichments
    );
    
    // Validate enriched data
    const validation = await context.agents.call(
      validationAgent,
      { data: enriched }
    );
    
    return {
      content: validation.content,
      metadata: {
        sources_used: context.config.enrichment_sources,
        enrichment_count: Object.keys(enrichments).length
      }
    };
  })
  .onError(async (error, context) => {
    // Fallback to partial enrichment
    context.events.emit('enrichment-error', { error });
    
    return {
      retry: false,
      fallback: {
        content: input.data,  // Return original
        metadata: { error: error.message }
      }
    };
  })
  .build();
```

**Example 2: Workflow Orchestrator Agent**
```typescript
class WorkflowOrchestrator extends CustomAgent {
  private workflow: WorkflowDefinition;
  
  async initialize(context: AgentContext): Promise<void> {
    this.workflow = await this.loadWorkflow(
      this.config.workflow_id
    );
    
    // Validate workflow
    await this.validateWorkflow(this.workflow);
  }
  
  async executeCore(input: AgentInput): Promise<AgentOutput> {
    const execution = new WorkflowExecution(this.workflow);
    
    // Execute workflow nodes
    for (const node of this.workflow.nodes) {
      const nodeResult = await this.executeNode(
        node,
        execution,
        input
      );
      
      execution.recordResult(node.id, nodeResult);
      
      // Check conditions for next nodes
      const nextNodes = this.determineNextNodes(
        node,
        nodeResult,
        execution
      );
      
      if (nextNodes.length === 0) break;
    }
    
    return {
      content: execution.getFinalResult(),
      metadata: {
        workflow_id: this.workflow.id,
        execution_path: execution.getPath(),
        duration: execution.getDuration()
      }
    };
  }
  
  private async executeNode(
    node: WorkflowNode,
    execution: WorkflowExecution,
    input: AgentInput
  ): Promise<any> {
    switch (node.type) {
      case 'agent':
        return this.context.agents.call(
          node.agent,
          this.prepareNodeInput(node, execution, input)
        );
        
      case 'condition':
        return this.evaluateCondition(
          node.condition,
          execution
        );
        
      case 'transform':
        return this.applyTransform(
          node.transform,
          execution.getResults()
        );
        
      default:
        throw new Error(`Unknown node type: ${node.type}`);
    }
  }
}
```

**Example 3: ML Pipeline Agent**
```typescript
const mlPipelineAgent = CustomAgentFactory.fromClass(
  class MLPipelineAgent {
    constructor(private context: AgentContext) {}
    
    async execute(input: AgentInput): Promise<AgentOutput> {
      // Load data
      const data = await this.loadData(input.dataset_id);
      
      // Preprocess
      const preprocessed = await this.context.agents.call(
        preprocessingAgent,
        { data, config: input.preprocessing_config }
      );
      
      // Feature engineering
      const features = await this.context.agents.call(
        featureAgent,
        { data: preprocessed }
      );
      
      // Model training
      const model = await this.trainModel(features, input.model_config);
      
      // Evaluation
      const evaluation = await this.context.agents.call(
        evaluationAgent,
        { model, test_data: features.test }
      );
      
      // Deploy if meets criteria
      if (evaluation.metrics.accuracy > input.deployment_threshold) {
        await this.deployModel(model);
      }
      
      return {
        content: {
          model_id: model.id,
          evaluation,
          deployed: evaluation.metrics.accuracy > input.deployment_threshold
        }
      };
    }
  }
);
```

### Step 7: Testing Framework for Custom Agents
Create `src/agents/custom/testing/`:

**Testing Utilities**:
```typescript
export class CustomAgentTestKit {
  static createMockContext(
    overrides?: Partial<AgentContext>
  ): AgentContext {
    return {
      llm: createMockLLM(),
      tracer: createMockTracer(),
      state: new StateManager({}),
      events: new EventEmitter(),
      agents: createMockAgentManager(),
      utils: new AgentUtilities({}),
      storage: new CustomStorage(),
      ...overrides
    };
  }
  
  static async testAgent(
    agent: CustomAgent,
    scenarios: TestScenario[]
  ): Promise<TestResults> {
    const results: TestResults = {
      passed: 0,
      failed: 0,
      errors: []
    };
    
    for (const scenario of scenarios) {
      try {
        const result = await agent.execute(scenario.input);
        
        if (scenario.validate(result)) {
          results.passed++;
        } else {
          results.failed++;
          results.errors.push({
            scenario: scenario.name,
            error: 'Validation failed'
          });
        }
      } catch (error) {
        results.failed++;
        results.errors.push({
          scenario: scenario.name,
          error
        });
      }
    }
    
    return results;
  }
}
```

## Post-Implementation Validation

### 1. Framework Completeness
- [ ] Easy to create simple agents
- [ ] Powerful enough for complex agents
- [ ] All helper utilities work correctly
- [ ] Type safety maintained throughout
- [ ] Testing utilities comprehensive

### 2. Pattern Library
Verify patterns for:
- Validation agents
- Transform agents
- Monitor agents
- Orchestrator agents
- ML pipeline agents

### 3. Documentation Quality
- [ ] API documentation complete
- [ ] Examples for common patterns
- [ ] Migration guide from raw functions
- [ ] Best practices documented
- [ ] Debugging guide

### 4. Developer Experience Testing
Test by creating agents for:
- Simple function wrapper
- Multi-step processor
- Conditional orchestrator
- Stateful agent
- Event-driven agent

## Common Pitfalls to Avoid

1. **Don't make it too complex** - simple agents should be simple
2. **Don't forget type safety** - maintain types through context
3. **Don't ignore testing** - provide good testing utilities
4. **Don't hardcode assumptions** - keep it flexible
5. **Don't forget cleanup** - help developers manage resources
6. **Don't hide errors** - make debugging easy

## Final Validation Questions

1. Can a developer create a custom agent in < 10 lines?
2. Are complex orchestrations still possible?
3. Is the context API intuitive?
4. Are common patterns well supported?
5. Is testing custom agents easy?
6. Is debugging straightforward?
7. Is performance overhead minimal?

## Next Steps
After Custom Agent framework completion, implement the Multi-Agent Systems (07-multi-agent-implementation.md) for coordinated agent teams.