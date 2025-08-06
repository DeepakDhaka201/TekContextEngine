# AgentHub Quick Reference Card

## 🎯 Mission Statement
**Make AI agent development simple while hiding all complexity.**

## 🧠 Before Writing Any Code
1. **Read** the module's implementation prompt
2. **Understand** why this module exists
3. **Check** dependencies and integration points
4. **Plan** the implementation approach
5. **Think** through error cases and edge conditions

## 📝 Documentation Template
```typescript
/**
 * [What it does in one sentence]
 * 
 * @description [Detailed explanation of purpose and usage]
 * @param {Type} name - [What it is and constraints]
 * @returns {Type} [What it returns and what it means]
 * @throws {ErrorType} [When and why this error occurs]
 * @example
 * ```typescript
 * // How to use it
 * const result = await doSomething(param);
 * ```
 * 
 * Implementation notes:
 * - [Why we do it this way]
 * - [Performance considerations]
 * - [Future improvements]
 */
```

## 🏗️ Module Structure
```
module-name/
├── index.ts          # Public API (exports)
├── types.ts          # Type definitions
├── implementation.ts # Core logic
├── errors.ts         # Custom errors
├── utils.ts          # Helper functions
└── __tests__/        # Test files
    ├── unit/         # Unit tests
    └── integration/  # Integration tests
```

## ✅ Implementation Checklist
- [ ] Types defined with clear documentation
- [ ] Interfaces for dependency injection
- [ ] Implementation with comprehensive comments
- [ ] Error cases handled with helpful messages
- [ ] Unit tests with good coverage
- [ ] Integration tests for key scenarios
- [ ] Performance considerations documented
- [ ] Security validations in place
- [ ] Example usage in documentation

## 🔧 Common Patterns

### Dependency Injection
```typescript
constructor(
  private readonly config: IConfig,
  private readonly modules: IModuleRegistry
) {
  this.validateConfig(config);
}
```

### Error Handling
```typescript
throw new ModuleError(
  'Human-friendly error message',
  {
    code: 'ERROR_CODE',
    module: this.name,
    context: relevantData,
    solution: 'How to fix it'
  }
);
```

### State Management
```typescript
// Always immutable
const newState = {
  ...currentState,
  updatedField: newValue
};
await this.persistState(newState);
this.state = Object.freeze(newState);
```

### Resource Cleanup
```typescript
try {
  const resource = await this.acquire();
  return await this.process(resource);
} finally {
  await this.cleanup();
}
```

## 🚨 Red Flags to Avoid
- ❌ Magic numbers without constants
- ❌ Comments explaining "what" instead of "why"  
- ❌ Catching errors without handling
- ❌ Mutating state directly
- ❌ Hardcoded values that should be config
- ❌ Missing error context
- ❌ Untested edge cases
- ❌ Synchronous operations that could block

## 🎪 Integration Points

### Module Registry
```typescript
// Register
this.modules.register('moduleName', instance);

// Retrieve
const module = this.modules.get<IModule>('moduleName');
```

### Session State
```typescript
// Set state
await session.runtime.set('key', value);

// Get state  
const value = await session.runtime.get('key');
```

### Streaming
```typescript
// Stream events
const streamer = this.modules.streaming.getStreamer(sessionId);
streamer.stream({ type: 'progress', data });
```

### Human Interaction
```typescript
// Request input
const response = await this.modules.humanLoop.requestInput({
  type: 'approval',
  prompt: 'Approve this action?',
  timeout: 30000
});
```

## 🧪 Testing Patterns

### Unit Test
```typescript
describe('ModuleName', () => {
  let module: ModuleName;
  
  beforeEach(() => {
    module = new ModuleName(mockConfig);
  });
  
  describe('methodName', () => {
    it('should handle normal case', async () => {
      // Arrange
      const input = createTestInput();
      
      // Act
      const result = await module.method(input);
      
      // Assert
      expect(result).toMatchExpectation();
    });
    
    it('should handle error case', async () => {
      // Test error scenarios explicitly
    });
  });
});
```

### Integration Test
```typescript
it('should integrate with session state', async () => {
  // Test real integration points
  const session = await createSession();
  const module = createModule({ session });
  
  // Verify integration works
  await module.saveState(data);
  const loaded = await session.getState();
  expect(loaded).toEqual(data);
});
```

## 💡 Quick Debugging

### Check These First
1. Are all dependencies injected?
2. Is the configuration valid?
3. Are we in the right state?
4. Do we have the required permissions?
5. Is the input validated?

### Common Issues
- **Type errors**: Check tsconfig and imports
- **Async issues**: Look for missing await
- **State issues**: Check state transitions
- **Memory leaks**: Look for unreleased resources
- **Performance**: Check for O(n²) operations

## 📊 Performance Quick Wins
- Cache frequently accessed data
- Batch operations when possible
- Use streaming for large data
- Implement connection pooling
- Add appropriate indexes
- Profile before optimizing

## 🔒 Security Checklist
- [ ] Input validation on all external data
- [ ] Output sanitization for user content
- [ ] Permission checks before operations
- [ ] Secrets never in code or logs
- [ ] Rate limiting on expensive operations
- [ ] Audit trail for sensitive actions

## 📞 When Stuck
1. Re-read the implementation prompt
2. Check CORE-PRINCIPLES.md
3. Look at similar modules for patterns
4. Write a failing test to clarify needs
5. Document the confusion (it helps think)
6. Break the problem into smaller pieces

## 🎉 Definition of Done
- ✅ All tests passing
- ✅ Code coverage > 80%
- ✅ No lint errors
- ✅ Types are strict
- ✅ Documentation complete
- ✅ Examples provided
- ✅ Integration tested
- ✅ Performance acceptable
- ✅ Security validated
- ✅ Errors are helpful

---

**Remember**: We're building the foundation for thousands of AI applications. Every detail matters. Do the hard work. Be diligent. Create something extraordinary.