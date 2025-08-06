# Loop Workflow Agent Implementation Prompt

## Context
You are implementing the Loop Workflow Agent - an iterator that repeatedly executes sub-agents until specific termination conditions are met. This agent is crucial for iterative refinement, convergence algorithms, and repeated processing tasks. It must handle various loop types, prevent infinite loops, and manage accumulated state across iterations.

## Pre-Implementation Requirements

### 1. Documentation Review
Before starting, you MUST:
1. Read `/Users/sakshams/tekai/TekContextEngine/agenthub-design.md` - Section 2.3 Loop Workflow Agent
2. Study implemented Base, LLM, and Sequential Agent code
3. Read Google ADK Loop Agent docs: https://google.github.io/adk-docs/agents/workflow-agents/loop-agents/
4. Research iterative algorithm patterns
5. Study convergence detection algorithms

### 2. Understand Loop Patterns
Research these loop types:
- Fixed iteration (for loop)
- Conditional (while loop)
- Do-while patterns
- Convergence-based loops
- Data-driven iteration
- Recursive refinement

### 3. Architecture Analysis
Think deeply about:
- Termination condition evaluation
- State accumulation strategies
- Infinite loop prevention
- Performance with many iterations
- Memory management for long loops
- Progress tracking and reporting

## Implementation Steps

### Step 1: Loop Agent Types and Conditions
Create `src/agents/loop/types.ts`:

```typescript
// Consider:
// - Different termination conditions
// - State accumulation patterns
// - Safety mechanisms
// - Progress tracking

export interface LoopAgentConfig extends BaseAgentConfig {
  body: AgentConfig | IAgent;
  condition: LoopCondition;
  max_iterations: number;
  accumulation_strategy?: AccumulationStrategy;
  continue_on_error?: boolean;
  checkpoint_interval?: number;
}

export interface LoopCondition {
  type: 'fixed' | 'conditional' | 'convergence' | 'llm_based' | 'composite';
  config: ConditionConfig;
}

export interface LoopContext {
  iteration: number;
  current_result: any;
  accumulated_results: any[];
  accumulated_state: Record<string, any>;
  start_time: number;
  convergence_history?: ConvergenceMetric[];
}

export interface ConvergenceMetric {
  iteration: number;
  value: number;
  delta: number;
  timestamp: number;
}
```

**Testing Requirements**:
- Validate condition configurations
- Test serialization of loop context
- Ensure type safety

### Step 2: Termination Condition Framework
Create `src/agents/loop/conditions/`:

**Research First**:
1. Study different convergence algorithms:
   - Absolute tolerance
   - Relative tolerance
   - Moving average
   - Statistical convergence
2. Learn about early stopping criteria
3. Research adaptive termination strategies

**Implement Condition Types**:

1. **Fixed Iteration Condition**:
   ```typescript
   class FixedIterationCondition implements ILoopCondition {
     constructor(private maxIterations: number) {}
     
     async evaluate(context: LoopContext): Promise<boolean> {
       return context.iteration < this.maxIterations;
     }
     
     getProgress(context: LoopContext): number {
       return context.iteration / this.maxIterations;
     }
   }
   ```

2. **Conditional Loop**:
   ```typescript
   class ConditionalLoopCondition implements ILoopCondition {
     constructor(private predicate: LoopPredicate) {}
     
     async evaluate(context: LoopContext): Promise<boolean> {
       return await this.predicate(
         context.current_result,
         context.accumulated_state,
         context.iteration
       );
     }
   }
   ```

3. **Convergence Condition**:
   ```typescript
   class ConvergenceCondition implements ILoopCondition {
     constructor(private config: ConvergenceConfig) {}
     
     async evaluate(context: LoopContext): Promise<boolean> {
       if (context.iteration < this.config.min_iterations) {
         return true;
       }
       
       const metric = this.calculateConvergenceMetric(context);
       context.convergence_history?.push(metric);
       
       return !this.hasConverged(metric);
     }
     
     private hasConverged(metric: ConvergenceMetric): boolean {
       return metric.delta < this.config.tolerance;
     }
   }
   ```

4. **LLM-Based Condition**:
   ```typescript
   class LLMBasedCondition implements ILoopCondition {
     constructor(
       private llm: LLMInterface,
       private prompt: string
     ) {}
     
     async evaluate(context: LoopContext): Promise<boolean> {
       const decision = await this.llm.complete({
         messages: [{
           role: 'user',
           content: this.formatPrompt(this.prompt, context)
         }],
         response_format: { type: 'json_object' }
       });
       
       return JSON.parse(decision.content).continue;
     }
   }
   ```

5. **Composite Conditions**:
   ```typescript
   class CompositeCondition implements ILoopCondition {
     constructor(
       private conditions: ILoopCondition[],
       private operator: 'AND' | 'OR'
     ) {}
     
     async evaluate(context: LoopContext): Promise<boolean> {
       const results = await Promise.all(
         this.conditions.map(c => c.evaluate(context))
       );
       
       return this.operator === 'AND' 
         ? results.every(r => r)
         : results.some(r => r);
     }
   }
   ```

**Testing Requirements**:
- Test each condition type thoroughly
- Verify convergence detection accuracy
- Test composite conditions
- Ensure LLM conditions handle errors
- Test edge cases (0 iterations, etc.)

### Step 3: State Accumulation Strategies
Create `src/agents/loop/accumulation/accumulator.ts`:

**Think About**:
- Different ways to accumulate results
- Memory-efficient accumulation
- Sliding windows for long loops
- Statistical aggregations

**Implementation Patterns**:

1. **Accumulation Strategies**:
   ```typescript
   interface AccumulationStrategy {
     initialize(): any;
     accumulate(
       current: any,
       new_result: any,
       iteration: number
     ): any;
     finalize(accumulated: any): any;
   }
   ```

2. **Built-in Strategies**:
   ```typescript
   class ListAccumulator implements AccumulationStrategy {
     accumulate(current: any[], new_result: any): any[] {
       return [...current, new_result];
     }
   }
   
   class LastNAccumulator implements AccumulationStrategy {
     constructor(private n: number) {}
     
     accumulate(current: any[], new_result: any): any[] {
       const updated = [...current, new_result];
       return updated.slice(-this.n);
     }
   }
   
   class StatisticalAccumulator implements AccumulationStrategy {
     accumulate(current: Stats, new_result: number): Stats {
       return {
         count: current.count + 1,
         sum: current.sum + new_result,
         mean: (current.sum + new_result) / (current.count + 1),
         min: Math.min(current.min, new_result),
         max: Math.max(current.max, new_result)
       };
     }
   }
   
   class MergingAccumulator implements AccumulationStrategy {
     constructor(private mergeFn: (a: any, b: any) => any) {}
     
     accumulate(current: any, new_result: any): any {
       return this.mergeFn(current, new_result);
     }
   }
   ```

**Testing Requirements**:
- Test memory usage with large accumulations
- Verify statistical calculations
- Test custom merge functions
- Ensure thread safety

### Step 4: Loop Safety Mechanisms
Create `src/agents/loop/safety/loop-guard.ts`:

**Critical Safety Features**:

1. **Infinite Loop Detection**:
   ```typescript
   class LoopGuard {
     private iterationTimes: number[] = [];
     
     detectInfiniteLoop(context: LoopContext): boolean {
       // Check iteration count
       if (context.iteration > this.config.max_iterations) {
         return true;
       }
       
       // Check execution time
       const elapsed = Date.now() - context.start_time;
       if (elapsed > this.config.max_duration) {
         return true;
       }
       
       // Check for progress
       if (this.isStuck(context)) {
         return true;
       }
       
       return false;
     }
     
     private isStuck(context: LoopContext): boolean {
       // Detect if results aren't changing
       const recent = context.accumulated_results.slice(-5);
       return recent.every(r => 
         JSON.stringify(r) === JSON.stringify(recent[0])
       );
     }
   }
   ```

2. **Resource Monitoring**:
   ```typescript
   class ResourceMonitor {
     async checkResources(): Promise<ResourceStatus> {
       return {
         memory: process.memoryUsage(),
         cpu: await this.getCPUUsage(),
         time_elapsed: this.getElapsedTime()
       };
     }
     
     shouldThrottle(status: ResourceStatus): boolean {
       return status.memory.heapUsed > this.config.memory_limit ||
              status.cpu > this.config.cpu_threshold;
     }
   }
   ```

**Testing Requirements**:
- Test infinite loop detection
- Verify resource monitoring
- Test throttling behavior
- Ensure safety doesn't impact performance

### Step 5: Loop Agent Implementation
Create `src/agents/loop/loop-agent.ts`:

**Core Implementation**:
```typescript
class LoopAgent extends BaseAgent {
  protected async executeCore(input: AgentInput): Promise<AgentOutput> {
    const context = this.initializeContext(input);
    const guard = new LoopGuard(this.config);
    const accumulator = this.createAccumulator();
    
    try {
      while (await this.shouldContinue(context)) {
        // Check safety
        if (guard.detectInfiniteLoop(context)) {
          throw new Error('Infinite loop detected');
        }
        
        // Execute iteration
        const iterationResult = await this.executeIteration(
          context,
          input
        );
        
        // Update context
        this.updateContext(context, iterationResult);
        
        // Accumulate results
        context.accumulated_state = accumulator.accumulate(
          context.accumulated_state,
          iterationResult
        );
        
        // Checkpoint if needed
        await this.checkpointIfNeeded(context);
        
        // Emit progress
        this.emitProgress(context);
        
        context.iteration++;
      }
      
      return this.finalizeResults(context, accumulator);
      
    } catch (error) {
      return this.handleLoopError(error, context);
    }
  }
  
  private async executeIteration(
    context: LoopContext,
    originalInput: AgentInput
  ): Promise<any> {
    const iterationInput = this.prepareIterationInput(
      originalInput,
      context
    );
    
    const span = this.tracer.startSpan(`iteration.${context.iteration}`);
    
    try {
      const result = await this.bodyAgent.execute(iterationInput);
      
      span.setAttributes({
        iteration: context.iteration,
        has_error: false
      });
      
      return result;
      
    } catch (error) {
      span.recordException(error);
      
      if (!this.config.continue_on_error) {
        throw error;
      }
      
      return { error: error.message };
    } finally {
      span.end();
    }
  }
}
```

**Advanced Features**:

1. **Adaptive Iteration**:
   ```typescript
   private async adaptIterationParams(
     context: LoopContext
   ): Promise<void> {
     // Adjust parameters based on convergence
     if (this.isConvergingSlowly(context)) {
       this.adjustLearningRate(context);
     }
     
     // Dynamic batching
     if (this.shouldIncreaseBatchSize(context)) {
       this.increaseBatchSize(context);
     }
   }
   ```

2. **Parallel Iteration Preparation**:
   ```typescript
   private async prepareNextIteration(
     context: LoopContext
   ): Promise<void> {
     // Pre-warm next iteration while current runs
     if (context.iteration < this.config.max_iterations - 1) {
       this.preloadResources(context.iteration + 1);
     }
   }
   ```

3. **Result Streaming**:
   ```typescript
   async *executeStream(
     input: AgentInput
   ): AsyncIterator<IterationResult> {
     const context = this.initializeContext(input);
     
     while (await this.shouldContinue(context)) {
       const result = await this.executeIteration(context, input);
       
       yield {
         iteration: context.iteration,
         result: result,
         accumulated: context.accumulated_state,
         progress: this.getProgress(context)
       };
       
       this.updateContext(context, result);
       context.iteration++;
     }
   }
   ```

### Step 6: Loop Pattern Examples
Create `src/agents/loop/examples/`:

**Example 1: Document Refinement Loop**
```typescript
const documentRefiner = new LoopAgent({
  name: 'document-refiner',
  body: {
    type: 'sequential',
    steps: [
      {
        name: 'critique',
        agent: critiqueAgent,
        output_key: 'feedback'
      },
      {
        name: 'refine',
        agent: refineAgent,
        input_mapping: {
          document: '${accumulated_state.document}',
          feedback: '${feedback}'
        }
      }
    ]
  },
  condition: {
    type: 'composite',
    operator: 'AND',
    conditions: [
      {
        type: 'fixed',
        config: { max: 5 }
      },
      {
        type: 'llm_based',
        config: {
          prompt: 'Is the document quality satisfactory?'
        }
      }
    ]
  },
  accumulation_strategy: {
    type: 'last_n',
    n: 3
  }
});
```

**Example 2: Convergence-Based Optimization**
```typescript
const optimizer = new LoopAgent({
  name: 'gradient-optimizer',
  body: optimizationStepAgent,
  condition: {
    type: 'convergence',
    config: {
      tolerance: 0.001,
      min_iterations: 10,
      metric: 'loss_delta'
    }
  },
  accumulation_strategy: {
    type: 'statistical',
    track: ['loss', 'gradient_norm']
  },
  checkpoint_interval: 10
});
```

**Example 3: Data Processing Loop**
```typescript
const batchProcessor = new LoopAgent({
  name: 'batch-processor',
  body: {
    type: 'parallel',
    agents: [
      processAgent1,
      processAgent2,
      processAgent3
    ]
  },
  condition: {
    type: 'conditional',
    config: {
      predicate: (result, state) => state.unprocessed_items.length > 0
    }
  },
  continue_on_error: true,
  max_iterations: 1000
});
```

### Step 7: Performance and Monitoring
Create `src/agents/loop/monitoring/`:

**Monitoring Features**:
1. **Iteration Metrics**:
   - Time per iteration
   - Memory growth
   - Convergence rate
   - Error frequency

2. **Progress Visualization**:
   ```typescript
   interface LoopProgress {
     iteration: number;
     total_iterations?: number;
     convergence_metric?: number;
     estimated_completion?: Date;
     current_stage: string;
   }
   ```

3. **Performance Optimization**:
   - Result caching
   - Iteration batching
   - Memory pooling
   - Lazy evaluation

## Post-Implementation Validation

### 1. Functional Testing Matrix
- [ ] Fixed iteration loops
- [ ] Conditional loops
- [ ] Convergence detection
- [ ] LLM-based conditions
- [ ] Composite conditions
- [ ] Error handling in loops
- [ ] Accumulation strategies
- [ ] Infinite loop prevention
- [ ] Resource monitoring
- [ ] Checkpointing

### 2. Performance Testing
Benchmark:
- Iteration overhead
- Memory usage over many iterations
- Convergence detection accuracy
- Checkpoint/restore speed

### 3. Stress Testing
Test with:
- 10,000+ iterations
- Large accumulated state
- Slow converging algorithms
- Network failures during iterations
- Memory pressure scenarios

## Common Pitfalls to Avoid

1. **Don't accumulate everything** - use sliding windows for long loops
2. **Don't trust convergence immediately** - use min_iterations
3. **Don't ignore resource usage** - monitor memory growth
4. **Don't checkpoint too often** - balance safety vs performance
5. **Don't assume iterations are fast** - plan for long-running loops
6. **Don't forget cleanup** - resources accumulate in loops

## Debugging Tools
```typescript
class LoopDebugger {
  // Iteration timeline
  // Convergence visualization
  // Resource usage graphs
  // State evolution tracking
  // Performance profiling
}
```

## Final Validation Questions

1. Can loops terminate reliably under all conditions?
2. Is infinite loop detection robust?
3. Does memory usage stay bounded?
4. Are convergence conditions accurate?
5. Can loops recover from errors?
6. Is progress tracking informative?
7. Are resources cleaned up properly?

## Next Steps
After Loop Agent completion, implement the Parallel Workflow Agent (05-parallel-agent-implementation.md) for concurrent agent execution.