# AgentHub Core Principles & Implementation Guidelines

## Our Mission
Build a production-ready agent orchestration system that makes AI agent development simple while hiding all complexity. Every decision should support this mission.

## Core Principles

### 1. 🎯 Simplicity is the Ultimate Sophistication
```typescript
// ❌ Wrong: Exposing complexity
const agent = new LLMAgent({
  llmProvider: new LiteLLM({...}),
  tracer: new LangfuseTracer({...}),
  memory: new ConversationMemory({...}),
  stateManager: new StateManager({...})
});

// ✅ Right: Hiding complexity
const agent = AgentHub.createAgent({
  type: 'llm',
  name: 'assistant',
  instruction: 'You are a helpful assistant'
});
```

### 2. 🧠 Deep Thinking Before Coding
- **Read First**: Documentation, existing code, related issues
- **Understand Why**: Every feature has a purpose
- **Plan Thoroughly**: Design before implementing
- **Consider Edge Cases**: What could go wrong?

### 3. 📚 Comments Are Teaching Tools
```typescript
// ❌ Wrong: Explaining what
// Increment counter by 1
counter++;

// ✅ Right: Explaining why
// Increment retry counter to track failed attempts for exponential backoff
// This prevents overwhelming the service while giving transient errors time to resolve
counter++;
```

### 4. 🧪 Tests Are Living Documentation
```typescript
describe('LLMAgent', () => {
  it('should resume conversation from checkpoint after crash', async () => {
    // This test documents our resilience guarantee:
    // Users never lose conversation progress even if the system crashes
    
    // Setup: Create conversation with history
    const agent = createAgent();
    await agent.execute({ input: 'Hello' });
    await agent.execute({ input: 'Tell me about Paris' });
    
    // Simulate crash and recovery
    const checkpointId = await agent.checkpoint();
    const newAgent = createAgent();
    await newAgent.resumeFrom(checkpointId);
    
    // Verify: Conversation continues seamlessly
    const response = await newAgent.execute({ 
      input: 'What did I ask about?' 
    });
    expect(response.output).toContain('Paris');
  });
});
```

### 5. 🛡️ Errors Are User Guidance
```typescript
// ❌ Wrong: Cryptic errors
throw new Error('Invalid input');

// ✅ Right: Helpful errors
throw new ValidationError(
  'Tool execution requires approval but no human handler configured',
  {
    solution: 'Enable human interaction in agent config: { humanInteraction: { enabled: true } }',
    documentation: 'https://docs.agenthub.ai/human-in-the-loop',
    code: 'HUMAN_HANDLER_MISSING'
  }
);
```

### 6. ⚡ Performance Is A Feature
```typescript
// Always measure, document, and optimize critical paths
/**
 * Processes messages in batches for optimal performance
 * 
 * Performance characteristics:
 * - Time complexity: O(n log n) where n = message count
 * - Memory: O(k) where k = batch size (default: 100)
 * - Throughput: ~10,000 messages/second on standard hardware
 * 
 * Trade-offs:
 * - Batching adds 10-50ms latency
 * - Reduces memory pressure by 80% vs processing all at once
 */
async function processBatched(messages: Message[]): Promise<Result[]> {
  // Implementation with inline performance notes
}
```

### 7. 🔒 Security Is Not Optional
```typescript
// Every input is hostile until proven otherwise
function processUserInput(input: unknown): SafeInput {
  // Validate structure
  const validated = inputSchema.parse(input);
  
  // Sanitize content
  const sanitized = sanitizeHtml(validated.content);
  
  // Check permissions
  if (!hasPermission(user, 'execute', validated.action)) {
    throw new PermissionError(`User lacks permission for ${validated.action}`);
  }
  
  return { ...validated, content: sanitized };
}
```

### 8. 🔄 State Management Is Sacred
```typescript
// State transitions must be explicit, trackable, and recoverable
class AgentStateMachine {
  // State is never mutated directly
  private state: Readonly<State>;
  
  // All transitions go through this method for consistency
  async transition(action: Action): Promise<void> {
    const oldState = this.state;
    const newState = this.reducer(oldState, action);
    
    // Validate transition
    if (!this.isValidTransition(oldState, newState)) {
      throw new InvalidTransition(oldState, newState);
    }
    
    // Persist before updating (crash-safe)
    await this.persistState(newState);
    
    // Update and notify
    this.state = Object.freeze(newState);
    await this.notifyStateChange(oldState, newState);
  }
}
```

### 9. 🌊 Streaming Is First-Class
```typescript
// Real-time feedback is expected, not optional
async function* executeWithStreaming(input: Input): AsyncGenerator<Output> {
  // Always provide immediate acknowledgment
  yield { type: 'started', timestamp: Date.now() };
  
  // Stream progress during long operations
  for await (const chunk of this.process(input)) {
    yield { 
      type: 'progress',
      data: chunk,
      metadata: { processed: chunk.index, total: chunk.total }
    };
  }
  
  // Clear completion signal
  yield { type: 'completed', summary: await this.summarize() };
}
```

### 10. 🤝 Human-in-the-Loop Is Natural
```typescript
// Human interaction should feel seamless, not bolted on
class HumanAwareAgent {
  async executeWithHumanOversight(task: Task): Promise<Result> {
    // Automatic confidence assessment
    const confidence = await this.assessConfidence(task);
    
    if (confidence < this.config.autoApprovalThreshold) {
      // Natural pause for human input
      const decision = await this.requestHumanInput({
        task,
        confidence,
        reasoning: this.explainLowConfidence(confidence),
        suggestions: this.generateAlternatives(task)
      });
      
      // Learn from human decision
      await this.learnFromDecision(task, decision);
      
      return this.executeWithGuidance(task, decision);
    }
    
    return this.executeAutonomously(task);
  }
}
```

## Implementation Standards

### Code Organization
```
src/
├── modules/          # Core modules (session, memory, execution)
│   ├── [module]/
│   │   ├── index.ts        # Public API
│   │   ├── types.ts        # Type definitions
│   │   ├── implementation.ts # Core logic
│   │   ├── errors.ts       # Module-specific errors
│   │   └── __tests__/      # Comprehensive tests
├── agents/           # Agent implementations
│   ├── base/        # Foundation for all agents
│   ├── llm/         # LLM-specific agent
│   └── graph/       # Workflow orchestration
├── shared/          # Shared utilities
└── examples/        # Usage examples
```

### Naming Conventions
```typescript
// Interfaces: I prefix for injected dependencies
interface IStorage { }
interface ILogger { }

// Types: Descriptive names, no prefix
type AgentConfig = { };
type ExecutionState = { };

// Classes: Noun phrases
class ConversationMemory { }
class GraphExecutionEngine { }

// Methods: Verb phrases that describe action
async executeWorkflow(): Promise<Result> { }
validateConfiguration(config: Config): void { }

// Events: Past tense for completed, present for ongoing
emit('workflowCompleted', result);
emit('nodeExecuting', nodeId);

// Constants: SCREAMING_SNAKE_CASE
const MAX_RETRY_ATTEMPTS = 3;
const DEFAULT_TIMEOUT_MS = 30000;
```

### Error Handling Philosophy
1. **Fail Fast**: Detect problems early
2. **Fail Clearly**: Explain what went wrong
3. **Fail Helpfully**: Suggest how to fix it
4. **Fail Safely**: Don't corrupt state

### Testing Philosophy
1. **Test Behavior, Not Implementation**
2. **Test Edge Cases Explicitly**
3. **Test Error Conditions**
4. **Test Performance Critical Paths**
5. **Test Integration Points**

### Documentation Philosophy
1. **Document Why, Not What**
2. **Examples Are Worth 1000 Words**
3. **Keep Docs Next to Code**
4. **Update Docs With Code**

## Decision Making Framework

When facing architectural decisions, ask:

1. **Does it make the API simpler?**
   - If no, reconsider the approach

2. **Does it hide complexity from users?**
   - If no, find a better abstraction

3. **Is it testable in isolation?**
   - If no, refactor for testability

4. **Will it scale to 1000x current load?**
   - If no, document the limitations

5. **Can it recover from failures?**
   - If no, add resilience

6. **Is it secure by default?**
   - If no, it's not ready

7. **Will developers understand it in 6 months?**
   - If no, improve documentation

## Remember

> "Any fool can write code that a computer can understand. Good programmers write code that humans can understand." - Martin Fowler

We're not just writing code. We're crafting a system that other developers will build their dreams upon. Every line matters. Every comment teaches. Every test protects.

**Do the hard work. Be diligent. Build something extraordinary.**