# Master Implementation Orchestration Prompt

## Purpose
This document serves as the master guide for implementing the AgentHub system. It ensures proper sequencing, context preservation, and quality standards across all implementation sessions.

## Core Mission
**We are building a production-ready agent orchestration system that makes AI agent development simple while hiding all complexity. Every line of code matters. Every comment teaches. Every test protects.**

## Implementation Philosophy

### 1. **Deep Thinking Before Coding**
- Read all relevant documentation first
- Understand the "why" before the "how"
- Think through edge cases and failure modes
- Design for extensibility and maintainability

### 2. **Comprehensive Documentation**
```typescript
/**
 * Every file starts with a purpose statement
 * 
 * @module ModuleName
 * @description What this module does and why it exists
 * @dependencies List key dependencies and why they're needed
 * @exports List what this module provides to others
 * @example Show how to use this module
 */

/**
 * Every function explains its contract
 * 
 * @description What this function does and when to use it
 * @param {Type} paramName - What this parameter represents and constraints
 * @returns {Type} What is returned and what it means
 * @throws {ErrorType} When this error occurs and why
 * @example Clear example of usage
 * 
 * Implementation notes:
 * - Key algorithmic decisions
 * - Performance considerations
 * - Future improvement opportunities
 */
```

### 3. **Test-Driven Development**
- Write tests that document behavior
- Test the happy path and the edge cases
- Test error conditions explicitly
- Performance benchmarks for critical paths

### 4. **Code Quality Standards**
- Every line has a purpose
- Every comment teaches
- Every name tells a story
- Every structure reveals intent

## Implementation Sequence

### Phase 1: Foundation (Week 1)
1. **Module Registry & Factory Pattern** 
   - Central nervous system of AgentHub
   - Enables all other modules to connect
   - Must be rock-solid

2. **Base Agent Implementation**
   - Foundation for all agent types
   - Transparent LLM and tracing integration
   - State management primitives

3. **Session State Module**
   - Centralized state management
   - Runtime persistence for Flowise patterns
   - Integration point for all modules

### Phase 2: Core Infrastructure (Week 2)
4. **Memory Module**
   - Vector storage and retrieval
   - Conversation memory management
   - Integration with Session State

5. **Execution Manager**
   - Workflow orchestration engine
   - Graph execution with Flowise patterns
   - State persistence and resume

6. **Streaming Manager**
   - Real-time event streaming
   - SSE implementation
   - Progress tracking

7. **Human-in-the-Loop Module**
   - Human interaction workflows
   - Approval and input management
   - Integration with execution flow

### Phase 3: Agent Implementation (Week 3)
8. **LLM Agent**
   - Primary conversational agent
   - Human-in-the-loop integration
   - Tool execution with approval

9. **Graph Agent**
   - Workflow orchestration
   - Parallel execution
   - Complex dependency management

10. **Additional Agents** (as needed)
    - Loop Agent
    - Parallel Agent
    - Custom Agent frameworks

### Phase 4: Integration & Polish (Week 4)
11. **End-to-End Testing**
    - Integration test suite
    - Performance benchmarks
    - Chaos testing

12. **Documentation**
    - API documentation
    - Developer guides
    - Architecture documentation

13. **Examples & Templates**
    - Common use cases
    - Best practices
    - Quick start templates

## Session Management Strategy

### Starting Each Implementation Session

```markdown
## Session Context Check
1. Current module being implemented: [Module Name]
2. Dependencies completed: [List completed modules]
3. Current implementation status: [What's done, what's next]
4. Key decisions made: [Important design decisions]
5. Open questions: [Unresolved issues]
```

### Context Preservation Template

```markdown
## Implementation Context for [Module Name]

### Purpose
[Why this module exists]

### Key Design Decisions
1. [Decision 1 and rationale]
2. [Decision 2 and rationale]

### Integration Points
- Depends on: [modules]
- Used by: [modules]
- Key interfaces: [interfaces]

### Current Status
- [x] Task 1
- [ ] Task 2
- [ ] Task 3

### Next Steps
1. [Immediate next task]
2. [Following task]
```

## Code Documentation Standards

### File Header Template
```typescript
/**
 * @fileoverview [Brief description of file purpose]
 * @module [module-name]
 * @requires [key dependencies]
 * 
 * This file implements [what it implements] to support [why it exists].
 * 
 * Key concepts:
 * - [Concept 1]: [Brief explanation]
 * - [Concept 2]: [Brief explanation]
 * 
 * @example
 * ```typescript
 * // How to use this module
 * import { Something } from './this-module';
 * const instance = new Something();
 * ```
 * 
 * @see [Related documentation or files]
 * @since [version]
 */
```

### Class Documentation Template
```typescript
/**
 * [Class purpose in one sentence]
 * 
 * [Detailed explanation of what this class does, when to use it,
 * and how it fits into the larger system]
 * 
 * @remarks
 * [Any important notes about usage, performance, or limitations]
 * 
 * @example
 * ```typescript
 * // Basic usage
 * const agent = new LLMAgent(config);
 * const result = await agent.execute(input);
 * ```
 * 
 * @public
 */
export class ClassName {
  /**
   * [Property description]
   * @remarks [When/why this property changes]
   */
  private propertyName: Type;

  /**
   * [Constructor description]
   * 
   * @param config - [What configuration is expected and why]
   * @throws {InvalidConfigError} [When this error occurs]
   */
  constructor(config: ConfigType) {
    // Implementation with inline comments explaining "why"
  }
}
```

### Method Documentation Template
```typescript
/**
 * [Method purpose in one sentence]
 * 
 * [Detailed explanation including algorithm, side effects,
 * and important considerations]
 * 
 * @param paramName - [What it is, valid ranges, special values]
 * @returns [What is returned and what it represents]
 * @throws {ErrorType} [Condition that causes this error]
 * 
 * @remarks
 * Performance: O(n) where n is [what n represents]
 * Memory: O(1) constant space
 * 
 * @example
 * ```typescript
 * const result = await instance.methodName(param);
 * if (result.success) {
 *   // Handle success
 * }
 * ```
 */
public async methodName(paramName: ParamType): Promise<ReturnType> {
  // Step 1: [What this step does and why]
  const processed = this.preprocess(paramName);
  
  // Step 2: [What this step does and why]
  // Note: [Important consideration or edge case]
  if (this.shouldOptimize(processed)) {
    return this.fastPath(processed);
  }
  
  // Step 3: [Main algorithm explanation]
  // Algorithm: [Brief description of approach]
  // Trade-off: [What we optimize for vs what we sacrifice]
  const result = await this.performMainOperation(processed);
  
  return this.formatResult(result);
}
```

### Critical Sections Documentation
```typescript
// CRITICAL SECTION: [What makes this critical]
// This code [what it does] because [why it's necessary]
// Modifying this requires [what to consider]
// See: [related documentation or issues]

// PERFORMANCE CRITICAL: [What performance requirement]
// Current approach: [what we do]
// Measured performance: [metrics]
// Alternative considered: [what else we tried and why we didn't use it]

// SECURITY CRITICAL: [What security concern]
// This prevents [what attack or issue]
// Validated by [how we ensure security]
// Related security review: [link or reference]
```

## Quality Checklist for Each Module

### Before Starting
- [ ] Read all related documentation
- [ ] Understand dependencies
- [ ] Review integration points
- [ ] Plan test strategy

### During Implementation
- [ ] Write comprehensive docstrings
- [ ] Add inline comments for "why" not "what"
- [ ] Create tests alongside implementation
- [ ] Consider error cases explicitly
- [ ] Think about performance implications
- [ ] Document design decisions

### After Implementation
- [ ] All tests passing
- [ ] Code coverage > 80%
- [ ] Documentation complete
- [ ] Performance benchmarks met
- [ ] Integration tests written
- [ ] Edge cases handled
- [ ] Error messages helpful
- [ ] Logging appropriate

## Common Patterns to Follow

### 1. Dependency Injection
```typescript
// Always inject dependencies for testability
constructor(
  private readonly config: Config,
  private readonly logger: ILogger,
  private readonly storage: IStorage
) {
  // Validate required dependencies
  this.validateDependencies();
}
```

### 2. Error Handling
```typescript
// Provide context in errors
throw new ModuleError(
  `Failed to process ${inputType}`,
  { 
    module: this.name,
    operation: 'process',
    input: sanitizedInput,
    cause: originalError 
  }
);
```

### 3. Async Resource Management
```typescript
// Always clean up resources
const resource = await this.acquire();
try {
  return await this.process(resource);
} finally {
  await this.release(resource);
}
```

### 4. State Management
```typescript
// Make state transitions explicit
private async transitionTo(newState: State): Promise<void> {
  const oldState = this.state;
  
  // Validate transition
  if (!this.isValidTransition(oldState, newState)) {
    throw new InvalidStateTransition(oldState, newState);
  }
  
  // Update state
  this.state = newState;
  
  // Emit event
  await this.emit('stateChanged', { oldState, newState });
}
```

## Remember: Core Principles

1. **We Do The Hard Work**: No shortcuts. Every edge case matters.
2. **Comments Teach**: Future developers (including future us) need to understand why.
3. **Tests Document Behavior**: Tests are executable documentation.
4. **Errors Guide Users**: Every error should help the user fix the problem.
5. **Performance Matters**: Measure, optimize, document.
6. **Security First**: Never trust input. Always validate. Sanitize output.

## Next Session Startup

When starting a new implementation session:

1. Read this document first
2. Check the todo list status
3. Review the current module's implementation prompt
4. Check completed dependencies
5. Read any existing code for context
6. Plan the session's goals
7. Start implementing with deep focus

Remember: **Quality over speed. Understanding over copying. Teaching over hiding.**

Let's build something extraordinary, one well-crafted module at a time.