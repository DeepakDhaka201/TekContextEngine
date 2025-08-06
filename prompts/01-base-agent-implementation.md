# Base Agent Implementation Prompt

## Context
You are implementing the foundation of the AgentHub system - the Base Agent architecture. This is the most critical component as all other agents will inherit from it. The Base Agent must provide transparent LiteLLM integration for LLM routing and Langfuse integration for observability.

## Pre-Implementation Requirements

### 1. Documentation Review
Before starting, you MUST:
1. Read `/Users/sakshams/tekai/TekContextEngine/agenthub-design.md` - specifically Section 1.1 Base Agent Architecture
2. Research LiteLLM documentation at https://docs.litellm.ai/ - focus on:
   - Router configuration
   - Model fallbacks
   - Cost tracking
   - Async support
3. Research Langfuse documentation at https://langfuse.com/docs - focus on:
   - Tracing API
   - Span management
   - Prompt management
   - Token tracking

### 2. Architecture Analysis
Think deeply about:
- How to make LLM calls completely transparent to agent developers
- How to automatically instrument all agent actions without developer intervention
- State management patterns that work across different agent types
- Error handling and recovery strategies
- Performance implications of automatic instrumentation

## Implementation Steps

### Step 1: Core Interfaces and Types
Create `src/agents/base/types.ts`:

```typescript
// Think about:
// - What data structures best represent agent input/output?
// - How to type tool definitions for maximum flexibility?
// - What metadata should every agent execution capture?
// - How to represent agent capabilities?

export interface IBaseAgent {
  // Core identity
  id: string;
  name: string;
  description?: string;
  type: AgentType;
  version: string;
  
  // Execution methods
  execute(input: AgentInput): Promise<AgentOutput>;
  executeStream?(input: AgentInput): AsyncIterator<AgentOutput>;
  
  // Lifecycle
  initialize(context: AgentContext): Promise<void>;
  cleanup(): Promise<void>;
  validate(): Promise<boolean>;
  
  // State management
  getState(): AgentState;
  setState(state: Partial<AgentState>): void;
  checkpoint(): Promise<StateCheckpoint>;
  restore(checkpoint: StateCheckpoint): Promise<void>;
  
  // Tool & context
  bindTools(tools: Tool[]): void;
  setContext(context: Context): void;
  getCapabilities(): AgentCapabilities;
}
```

**Testing Requirements**:
- Create comprehensive type tests
- Ensure all interfaces are properly exported
- Validate that types cover all use cases from the design

### Step 2: LiteLLM Integration Layer
Create `src/agents/base/llm/transparent-wrapper.ts`:

**Research First**:
1. Study LiteLLM's Router class implementation
2. Understand model selection strategies
3. Learn about retry mechanisms and fallbacks

**Implementation Considerations**:
- How to hide all LiteLLM complexity from agent developers?
- How to automatically select the best model based on agent requirements?
- How to implement intelligent caching without developer configuration?
- How to handle streaming responses transparently?

**Key Features to Implement**:
1. Automatic model selection based on:
   - Speed requirements
   - Quality requirements
   - Cost constraints
   - Token limits
2. Transparent retry logic with exponential backoff
3. Automatic fallback to alternative models
4. Response caching with smart invalidation
5. Token usage tracking per agent

**Testing Requirements**:
- Mock LiteLLM responses for unit tests
- Test model selection logic with various requirements
- Verify retry mechanisms work correctly
- Test fallback scenarios
- Ensure streaming works properly
- Validate token counting accuracy

### Step 3: Langfuse Integration Layer
Create `src/agents/base/tracing/transparent-tracer.ts`:

**Research First**:
1. Study Langfuse's tracing architecture
2. Understand span relationships and nesting
3. Learn about prompt versioning and management

**Implementation Considerations**:
- How to automatically create spans for every agent action?
- How to maintain trace context across async operations?
- How to link prompts to traces without developer intervention?
- How to capture errors and exceptions properly?

**Key Features to Implement**:
1. Automatic span creation for:
   - Agent execution start/end
   - Each LLM call
   - Tool executions
   - State updates
2. Trace enrichment with:
   - User ID
   - Session ID
   - Agent metadata
   - Performance metrics
3. Automatic prompt versioning
4. Error tracking and alerting
5. Cost attribution per trace

**Testing Requirements**:
- Mock Langfuse client for unit tests
- Test span nesting works correctly
- Verify trace context is maintained
- Test error capture scenarios
- Validate metadata enrichment

### Step 4: Base Agent Implementation
Create `src/agents/base/base-agent.ts`:

**Think Deeply About**:
- Template method pattern for extensibility
- How to inject LLM and tracer without subclasses knowing
- State management that works for all agent types
- Tool execution framework
- Error boundaries and recovery

**Critical Implementation Details**:
1. Constructor must:
   - Accept configuration
   - Initialize LLM wrapper transparently
   - Initialize tracer transparently
   - Set up state management
   - Validate configuration

2. Execute method must:
   - Start a trace span
   - Capture input
   - Call abstract executeCore
   - Handle errors gracefully
   - End span with results
   - Return structured output

3. State management must:
   - Support checkpointing
   - Handle concurrent updates
   - Persist when needed
   - Clean up resources

**Testing Requirements**:
- Create a TestAgent that extends BaseAgent
- Test all lifecycle methods
- Verify LLM and tracer are injected properly
- Test state management thoroughly
- Validate error handling
- Test tool binding and execution

### Step 5: Tool Framework
Create `src/agents/base/tools/`:

**Implementation Requirements**:
1. Tool interface that supports:
   - Sync and async execution
   - Input/output validation
   - Error handling
   - Automatic tracing

2. Tool registry that:
   - Validates tool compatibility
   - Manages tool lifecycle
   - Handles tool discovery

**Testing Requirements**:
- Create mock tools for testing
- Test tool execution within agent context
- Verify tool errors are handled properly
- Test tool validation

### Step 6: Integration Tests
Create `src/agents/base/__tests__/integration/`:

**Comprehensive Testing**:
1. End-to-end test with real LiteLLM calls (use inexpensive model)
2. Verify Langfuse traces are created correctly
3. Test state persistence and recovery
4. Test tool execution in real scenarios
5. Benchmark performance overhead

## Post-Implementation Validation

### 1. Code Quality Checks
- [ ] All functions have proper TypeScript types
- [ ] No `any` types unless absolutely necessary
- [ ] Comprehensive error handling
- [ ] Proper async/await usage
- [ ] Memory leak prevention
- [ ] Proper resource cleanup

### 2. Documentation
- [ ] JSDoc comments for all public APIs
- [ ] README with usage examples
- [ ] Architecture decision records (ADRs)
- [ ] Performance considerations documented

### 3. Testing Coverage
- [ ] Unit test coverage > 90%
- [ ] Integration tests for critical paths
- [ ] Performance benchmarks established
- [ ] Error scenarios thoroughly tested

### 4. Design Validation
Re-read the original design and verify:
- [ ] LLM integration is truly transparent
- [ ] Langfuse integration requires no developer setup
- [ ] State management supports all agent types
- [ ] Tool framework is extensible
- [ ] Performance overhead is acceptable

## Common Pitfalls to Avoid

1. **Don't expose LiteLLM or Langfuse APIs directly** - everything should be transparent
2. **Don't forget about streaming** - many agents will need streaming support
3. **Don't hardcode model names** - use the router for selection
4. **Don't forget cleanup** - prevent memory leaks
5. **Don't skip error scenarios** - production agents need robust error handling

## Final Checklist

Before considering this complete:
1. Can a developer create an agent without knowing about LiteLLM or Langfuse?
2. Are all agent actions automatically traced?
3. Is model selection truly automatic based on requirements?
4. Does state management support checkpointing and recovery?
5. Are tools executed within the tracing context?
6. Is the base agent truly extensible for all planned agent types?

## Next Steps
Once the base agent is complete and tested, move to implementing the LLM Agent (02-llm-agent-implementation.md) which will be the first concrete implementation of the base agent.