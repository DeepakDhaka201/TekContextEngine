# Parallel Workflow Agent Implementation Prompt

## Context
You are implementing the Parallel Workflow Agent - a concurrent orchestrator that executes multiple sub-agents simultaneously. This agent is crucial for performance optimization, parallel data processing, and scenarios requiring multiple perspectives. It must handle concurrency control, result aggregation, partial failures, and resource management.

## Pre-Implementation Requirements

### 1. Documentation Review
Before starting, you MUST:
1. Read `/Users/sakshams/tekai/TekContextEngine/agenthub-design.md` - Section 2.4 Parallel Workflow Agent
2. Study all previously implemented agents
3. Read Google ADK Parallel Agent docs: https://google.github.io/adk-docs/agents/workflow-agents/parallel-agents/
4. Research concurrent programming patterns in TypeScript/JavaScript
5. Study aggregation algorithms and strategies

### 2. Understand Concurrency Challenges
Research these critical topics:
- Promise concurrency patterns
- Worker threads vs async concurrency
- Resource pooling and throttling
- Race conditions in shared state
- Deadlock prevention
- Memory management in parallel execution

### 3. Architecture Analysis
Think deeply about:
- Concurrency control mechanisms
- Result aggregation strategies
- Partial failure handling
- Resource allocation
- Progress tracking for parallel tasks
- Cancellation propagation

## Implementation Steps

### Step 1: Parallel Agent Types
Create `src/agents/parallel/types.ts`:

```typescript
// Consider:
// - Different aggregation strategies
// - Concurrency control options
// - Failure handling policies
// - Resource limits

export interface ParallelAgentConfig extends BaseAgentConfig {
  branches: BranchConfig[];
  aggregation: AggregationConfig;
  concurrency_limit?: number;
  timeout_per_branch?: number;
  failure_strategy?: FailureStrategy;
  resource_pool?: ResourcePoolConfig;
}

export interface BranchConfig {
  agent: AgentConfig | IAgent;
  weight?: number;  // For weighted aggregation
  required?: boolean;  // Must succeed for overall success
  timeout?: number;
  retry?: RetryConfig;
  input_transform?: (input: any) => any;
}

export interface AggregationConfig {
  type: 'merge' | 'voting' | 'race' | 'reduce' | 'llm_synthesis';
  config: AggregationStrategyConfig;
  timeout?: number;
}

export interface ParallelExecutionContext {
  branches: BranchExecution[];
  start_time: number;
  completed: Set<string>;
  failed: Set<string>;
  results: Map<string, BranchResult>;
  resources: ResourcePool;
}

export interface BranchResult {
  branch_id: string;
  success: boolean;
  data?: any;
  error?: Error;
  duration: number;
  metadata: Record<string, any>;
}
```

**Testing Requirements**:
- Validate branch configurations
- Test aggregation config validation
- Ensure proper typing for results

### Step 2: Concurrency Control Framework
Create `src/agents/parallel/concurrency/`:

**Research First**:
1. Study JavaScript concurrency patterns:
   - Promise.all vs Promise.allSettled
   - Promise pools
   - Async iterators
   - AbortController usage
2. Learn about backpressure handling
3. Research fair scheduling algorithms

**Implementation Components**:

1. **Concurrency Manager**:
   ```typescript
   class ConcurrencyManager {
     private executing = new Set<Promise<any>>();
     private queue: Array<() => Promise<any>> = [];
     
     async execute<T>(
       task: () => Promise<T>,
       priority: number = 0
     ): Promise<T> {
       // Wait if at capacity
       while (this.executing.size >= this.limit) {
         await Promise.race(this.executing);
       }
       
       // Execute task
       const promise = this.wrapTask(task);
       this.executing.add(promise);
       
       try {
         return await promise;
       } finally {
         this.executing.delete(promise);
         this.processQueue();
       }
     }
     
     private async wrapTask<T>(
       task: () => Promise<T>
     ): Promise<T> {
       const controller = new AbortController();
       
       return Promise.race([
         task(),
         this.createTimeout(controller.signal)
       ]);
     }
   }
   ```

2. **Resource Pool**:
   ```typescript
   class ResourcePool {
     private available: Resource[] = [];
     private inUse = new Map<string, Resource>();
     private waiting: Array<(resource: Resource) => void> = [];
     
     async acquire(
       requirements?: ResourceRequirements
     ): Promise<Resource> {
       const resource = this.findAvailable(requirements);
       
       if (resource) {
         this.markInUse(resource);
         return resource;
       }
       
       // Wait for resource
       return new Promise(resolve => {
         this.waiting.push(resolve);
       });
     }
     
     release(resource: Resource): void {
       this.markAvailable(resource);
       
       // Notify waiting consumers
       if (this.waiting.length > 0) {
         const waiter = this.waiting.shift();
         waiter?.(resource);
       }
     }
   }
   ```

3. **Execution Scheduler**:
   ```typescript
   class ExecutionScheduler {
     scheduleParallel(
       branches: BranchConfig[],
       context: ParallelExecutionContext
     ): ExecutionPlan {
       // Analyze dependencies
       const dependencies = this.analyzeDependencies(branches);
       
       // Group by resource requirements
       const groups = this.groupByResources(branches);
       
       // Create execution waves
       return this.createExecutionWaves(groups, dependencies);
     }
     
     private createExecutionWaves(
       groups: BranchGroup[],
       dependencies: DependencyGraph
     ): ExecutionPlan {
       // Topological sort considering resources
       const waves: ExecutionWave[] = [];
       
       // Schedule independent branches first
       // Then dependent branches
       // Consider resource availability
       
       return { waves };
     }
   }
   ```

**Testing Requirements**:
- Test concurrency limits
- Verify resource allocation
- Test deadlock scenarios
- Benchmark scheduling efficiency
- Test cancellation propagation

### Step 3: Aggregation Strategies
Create `src/agents/parallel/aggregation/`:

**Think About**:
- Different ways to combine results
- Handling heterogeneous data
- Weighted aggregation
- Null/error handling in aggregation

**Strategy Implementations**:

1. **Merge Aggregation**:
   ```typescript
   class MergeAggregation implements AggregationStrategy {
     async aggregate(
       results: BranchResult[],
       context: AggregationContext
     ): Promise<any> {
       const successful = results.filter(r => r.success);
       
       if (this.config.require_all && successful.length !== results.length) {
         throw new Error('Not all branches succeeded');
       }
       
       return this.mergeResults(
         successful.map(r => r.data),
         context
       );
     }
     
     private mergeResults(data: any[], context: AggregationContext): any {
       switch (this.config.merge_strategy) {
         case 'deep':
           return this.deepMerge(data);
         case 'concat':
           return this.concatenate(data);
         case 'custom':
           return this.config.merge_function(data, context);
         default:
           return Object.assign({}, ...data);
       }
     }
   }
   ```

2. **Voting Aggregation**:
   ```typescript
   class VotingAggregation implements AggregationStrategy {
     async aggregate(
       results: BranchResult[],
       context: AggregationContext
     ): Promise<any> {
       const votes = this.collectVotes(results);
       const winner = this.determineWinner(votes);
       
       if (this.config.require_majority) {
         const majority = results.length / 2;
         if (winner.count <= majority) {
           throw new Error('No majority consensus');
         }
       }
       
       return {
         winner: winner.value,
         confidence: winner.count / results.length,
         vote_distribution: votes
       };
     }
   }
   ```

3. **Race Aggregation**:
   ```typescript
   class RaceAggregation implements AggregationStrategy {
     async aggregate(
       results: BranchResult[],
       context: AggregationContext
     ): Promise<any> {
       // Return first successful result
       const successful = results
         .filter(r => r.success)
         .sort((a, b) => a.duration - b.duration);
       
       if (successful.length === 0) {
         throw new Error('No successful results');
       }
       
       const winner = successful[0];
       
       if (this.config.validate_winner) {
         await this.validateResult(winner, context);
       }
       
       return winner.data;
     }
   }
   ```

4. **LLM Synthesis Aggregation**:
   ```typescript
   class LLMSynthesisAggregation implements AggregationStrategy {
     constructor(
       private llm: LLMInterface,
       private synthesisPrompt: string
     ) {}
     
     async aggregate(
       results: BranchResult[],
       context: AggregationContext
     ): Promise<any> {
       const synthesis = await this.llm.complete({
         messages: [{
           role: 'user',
           content: this.formatSynthesisPrompt(
             results,
             this.synthesisPrompt,
             context
           )
         }]
       });
       
       return this.parseSynthesis(synthesis.content);
     }
   }
   ```

**Testing Requirements**:
- Test each aggregation strategy
- Handle partial failures
- Test with heterogeneous data
- Verify timeout handling
- Test custom aggregation functions

### Step 4: Failure Handling
Create `src/agents/parallel/failure/`:

**Failure Strategies**:

1. **Fail Fast**:
   ```typescript
   class FailFastStrategy implements FailureStrategy {
     async handleFailure(
       failure: BranchFailure,
       context: ParallelExecutionContext
     ): Promise<FailureAction> {
       // Cancel all running branches
       await this.cancelRunningBranches(context);
       
       return {
         action: 'abort',
         error: new ParallelExecutionError(
           `Branch ${failure.branch_id} failed`,
           failure
         )
       };
     }
   }
   ```

2. **Fail Soft**:
   ```typescript
   class FailSoftStrategy implements FailureStrategy {
     async handleFailure(
       failure: BranchFailure,
       context: ParallelExecutionContext
     ): Promise<FailureAction> {
       context.failed.add(failure.branch_id);
       
       // Continue if enough branches remain
       const remaining = context.branches.length - context.failed.size;
       
       if (remaining >= this.config.min_success_count) {
         return { action: 'continue' };
       }
       
       return {
         action: 'abort',
         error: new InsufficientSuccessError()
       };
     }
   }
   ```

3. **Retry Strategy**:
   ```typescript
   class RetryFailureStrategy implements FailureStrategy {
     async handleFailure(
       failure: BranchFailure,
       context: ParallelExecutionContext
     ): Promise<FailureAction> {
       const retries = this.getRetryCount(failure.branch_id);
       
       if (retries < this.config.max_retries) {
         return {
           action: 'retry',
           delay: this.calculateBackoff(retries)
         };
       }
       
       return { action: 'mark_failed' };
     }
   }
   ```

### Step 5: Parallel Agent Implementation
Create `src/agents/parallel/parallel-agent.ts`:

**Core Implementation**:
```typescript
class ParallelAgent extends BaseAgent {
  protected async executeCore(input: AgentInput): Promise<AgentOutput> {
    const context = this.initializeContext();
    const scheduler = new ExecutionScheduler(this.config);
    const manager = new ConcurrencyManager(this.config.concurrency_limit);
    
    try {
      // Schedule execution
      const plan = scheduler.scheduleParallel(
        this.config.branches,
        context
      );
      
      // Execute branches
      const results = await this.executeBranches(
        plan,
        input,
        context,
        manager
      );
      
      // Aggregate results
      const aggregated = await this.aggregateResults(
        results,
        context
      );
      
      return {
        content: aggregated,
        metadata: this.collectMetadata(context, results)
      };
      
    } catch (error) {
      return this.handleExecutionError(error, context);
    } finally {
      await this.cleanup(context);
    }
  }
  
  private async executeBranches(
    plan: ExecutionPlan,
    input: AgentInput,
    context: ParallelExecutionContext,
    manager: ConcurrencyManager
  ): Promise<BranchResult[]> {
    const results: BranchResult[] = [];
    const abortController = new AbortController();
    
    // Execute waves in order
    for (const wave of plan.waves) {
      const waveResults = await this.executeWave(
        wave,
        input,
        context,
        manager,
        abortController.signal
      );
      
      results.push(...waveResults);
      
      // Check if should continue
      if (this.shouldAbort(results, context)) {
        abortController.abort();
        break;
      }
    }
    
    return results;
  }
  
  private async executeWave(
    wave: ExecutionWave,
    input: AgentInput,
    context: ParallelExecutionContext,
    manager: ConcurrencyManager,
    signal: AbortSignal
  ): Promise<BranchResult[]> {
    const promises = wave.branches.map(branch =>
      manager.execute(
        () => this.executeBranch(branch, input, context, signal),
        branch.priority
      )
    );
    
    // Use allSettled to capture all results
    const settled = await Promise.allSettled(promises);
    
    return settled.map((result, index) => {
      const branch = wave.branches[index];
      
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          branch_id: branch.id,
          success: false,
          error: result.reason,
          duration: Date.now() - wave.start_time
        };
      }
    });
  }
  
  private async executeBranch(
    branch: BranchConfig,
    input: AgentInput,
    context: ParallelExecutionContext,
    signal: AbortSignal
  ): Promise<BranchResult> {
    const span = this.tracer.startSpan(`branch.${branch.agent.name}`);
    const startTime = Date.now();
    
    try {
      // Check abort signal
      if (signal.aborted) {
        throw new Error('Branch execution aborted');
      }
      
      // Prepare branch input
      const branchInput = branch.input_transform
        ? branch.input_transform(input)
        : input;
      
      // Acquire resources if needed
      const resource = await context.resources.acquire(
        branch.resource_requirements
      );
      
      try {
        // Execute with timeout
        const result = await this.withTimeout(
          this.resolveBranch(branch).execute(branchInput),
          branch.timeout || this.config.timeout_per_branch
        );
        
        span.setAttributes({
          success: true,
          duration: Date.now() - startTime
        });
        
        return {
          branch_id: branch.id,
          success: true,
          data: result,
          duration: Date.now() - startTime,
          metadata: { resource_id: resource.id }
        };
        
      } finally {
        context.resources.release(resource);
      }
      
    } catch (error) {
      span.recordException(error);
      
      const failure = {
        branch_id: branch.id,
        error,
        context
      };
      
      // Handle failure according to strategy
      const action = await this.failureStrategy.handleFailure(
        failure,
        context
      );
      
      if (action.action === 'retry') {
        // Retry logic
        await this.delay(action.delay);
        return this.executeBranch(branch, input, context, signal);
      }
      
      return {
        branch_id: branch.id,
        success: false,
        error,
        duration: Date.now() - startTime
      };
      
    } finally {
      span.end();
    }
  }
}
```

**Advanced Features**:

1. **Dynamic Parallelism**:
   ```typescript
   private async adjustParallelism(
     context: ParallelExecutionContext
   ): Promise<void> {
     const metrics = this.collectPerformanceMetrics(context);
     
     if (metrics.cpu_usage > 0.8) {
       this.reduceConcurrency();
     } else if (metrics.cpu_usage < 0.3 && metrics.queue_size > 0) {
       this.increaseConcurrency();
     }
   }
   ```

2. **Result Streaming**:
   ```typescript
   async *executeStream(
     input: AgentInput
   ): AsyncIterator<BranchStreamResult> {
     const context = this.initializeContext();
     
     for await (const result of this.streamBranchResults(input, context)) {
       yield {
         branch_id: result.branch_id,
         partial_result: result.data,
         completed_branches: context.completed.size,
         total_branches: context.branches.length
       };
     }
   }
   ```

### Step 6: Integration Examples
Create `src/agents/parallel/examples/`:

**Example 1: Multi-Model Consensus**
```typescript
const consensusAgent = new ParallelAgent({
  name: 'multi-model-consensus',
  branches: [
    {
      agent: {
        type: 'llm',
        name: 'gpt4-analyzer',
        model_preferences: { preferred: ['gpt-4'] }
      },
      weight: 2
    },
    {
      agent: {
        type: 'llm',
        name: 'claude-analyzer',
        model_preferences: { preferred: ['claude-3'] }
      },
      weight: 2
    },
    {
      agent: {
        type: 'llm',
        name: 'llama-analyzer',
        model_preferences: { preferred: ['llama-3'] }
      },
      weight: 1
    }
  ],
  aggregation: {
    type: 'voting',
    config: {
      require_majority: true,
      weight_votes: true
    }
  },
  concurrency_limit: 3
});
```

**Example 2: Parallel Data Processing**
```typescript
const dataProcessor = new ParallelAgent({
  name: 'parallel-etl',
  branches: [
    {
      agent: extractAgent,
      required: true,
      timeout: 30000
    },
    {
      agent: validateAgent,
      required: true
    },
    {
      agent: enrichAgent,
      required: false,
      retry: { max_attempts: 3 }
    },
    {
      agent: geocodeAgent,
      required: false
    }
  ],
  aggregation: {
    type: 'merge',
    config: {
      merge_strategy: 'deep',
      require_all: false,
      handle_nulls: 'skip'
    }
  },
  failure_strategy: {
    type: 'fail_soft',
    min_success_count: 2
  },
  resource_pool: {
    max_memory_per_branch: 100 * 1024 * 1024, // 100MB
    max_total_memory: 500 * 1024 * 1024 // 500MB
  }
});
```

**Example 3: Race for Best Result**
```typescript
const fastSearchAgent = new ParallelAgent({
  name: 'fast-search',
  branches: [
    { agent: elasticSearchAgent, timeout: 1000 },
    { agent: vectorSearchAgent, timeout: 2000 },
    { agent: sqlSearchAgent, timeout: 3000 }
  ],
  aggregation: {
    type: 'race',
    config: {
      validate_winner: true,
      min_quality_score: 0.7
    }
  },
  concurrency_limit: 10
});
```

### Step 7: Performance Monitoring
Create `src/agents/parallel/monitoring/`:

**Monitoring Features**:
1. **Branch Performance Tracking**:
   ```typescript
   interface BranchMetrics {
     execution_time: Histogram;
     success_rate: number;
     resource_usage: ResourceMetrics;
     queue_time: number;
   }
   ```

2. **Concurrency Visualization**:
   ```typescript
   class ConcurrencyMonitor {
     getCurrentState(): ConcurrencyState {
       return {
         active_branches: this.activeBranches.size,
         queued_branches: this.queue.length,
         resource_utilization: this.getResourceUtilization(),
         bottlenecks: this.identifyBottlenecks()
       };
     }
   }
   ```

## Post-Implementation Validation

### 1. Functional Testing Matrix
- [ ] Basic parallel execution
- [ ] Concurrency limit enforcement
- [ ] All aggregation strategies
- [ ] Failure handling strategies
- [ ] Resource pool management
- [ ] Cancellation propagation
- [ ] Timeout handling
- [ ] Result streaming

### 2. Performance Testing
Benchmark:
- Speedup vs sequential execution
- Resource utilization
- Overhead of parallelization
- Scalability with branch count

### 3. Stress Testing
- 100+ parallel branches
- Resource exhaustion
- Network failures
- Slow branches
- Memory pressure

## Common Pitfalls to Avoid

1. **Don't share state without synchronization** - use proper locking
2. **Don't ignore backpressure** - implement flow control
3. **Don't assume unlimited resources** - always use pools
4. **Don't forget cleanup** - release resources properly
5. **Don't block the event loop** - use worker threads if needed
6. **Don't ignore partial failures** - handle them gracefully

## Final Validation Questions

1. Does parallelization provide real speedup?
2. Are resources properly managed and released?
3. Do all aggregation strategies work correctly?
4. Is failure handling robust?
5. Can the system handle high concurrency?
6. Is monitoring sufficient for debugging?
7. Are there any race conditions?

## Next Steps
After Parallel Agent completion, implement the Custom Agent framework (06-custom-agent-implementation.md) for user-defined agent logic.