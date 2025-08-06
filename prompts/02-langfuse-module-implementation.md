# Langfuse Module Implementation Prompt

## Context
You are implementing the Langfuse Module - a wrapped integration that provides observability and tracing for the AgentHub system. This module must wrap the Langfuse SDK to provide controlled access, automatic context management, and seamless integration with the module system. The goal is to make tracing completely transparent to agent developers.

## Pre-Implementation Requirements

### 1. Documentation Review
You MUST read:
1. Langfuse TypeScript SDK docs: https://langfuse.com/docs/sdk/typescript
2. Langfuse tracing concepts: https://langfuse.com/docs/tracing
3. Langfuse prompt management: https://langfuse.com/docs/prompts
4. OpenTelemetry context propagation patterns
5. Review architecture: `/Users/sakshams/tekai/TekContextEngine/agenthub-architecture-revised.md`

### 2. Understand Module Requirements
This module must:
- Wrap Langfuse SDK for controlled access
- Manage trace context automatically
- Provide span nesting without manual management
- Handle prompt versioning transparently
- Support async context propagation
- Ensure all data is sanitized before sending

## Implementation Steps

### Step 1: Module Interface and Types
Create `modules/langfuse/types.ts`:

```typescript
export interface ILangfuseModule {
  name: string;
  version: string;
  
  // Lifecycle
  initialize(config: LangfuseConfig): Promise<void>;
  health(): Promise<HealthStatus>;
  shutdown(): Promise<void>;
  flush(): Promise<void>;
  
  // Tracing
  startTrace(options: TraceOptions): ITrace;
  getCurrentTrace(): ITrace | null;
  
  // Scoring
  scoreTrace(traceId: string, score: Score): Promise<void>;
  scoreGeneration(generationId: string, score: Score): Promise<void>;
  
  // Prompts
  getPrompt(name: string, version?: string): Promise<IPrompt>;
  
  // Context management
  runInTraceContext<T>(trace: ITrace, fn: () => Promise<T>): Promise<T>;
  runInSpanContext<T>(span: ISpan, fn: () => Promise<T>): Promise<T>;
}

export interface LangfuseConfig {
  publicKey: string;
  secretKey: string;
  baseUrl?: string;
  
  // Behavior options
  enabled?: boolean;              // Enable/disable tracing
  flushInterval?: number;         // Auto-flush interval
  flushAt?: number;              // Batch size for flushing
  
  // Privacy options
  maskSensitiveData?: boolean;
  redactPatterns?: RegExp[];
  allowedMetadataKeys?: string[];
  
  // Performance options
  samplingRate?: number;          // 0-1, percentage of traces to capture
  asyncFlush?: boolean;
  timeout?: number;
}

export interface TraceOptions {
  name: string;
  id?: string;                   // Custom trace ID
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
  tags?: string[];
  release?: string;
  version?: string;
}

export interface ITrace {
  id: string;
  
  // Span management
  span(options: SpanOptions): ISpan;
  generation(options: GenerationOptions): IGeneration;
  event(options: EventOptions): void;
  
  // Updates
  update(data: TraceUpdate): void;
  
  // Metadata
  setUser(userId: string): void;
  setSession(sessionId: string): void;
  addTags(tags: string[]): void;
  setMetadata(key: string, value: any): void;
}

export interface ISpan {
  id: string;
  
  // Nested operations
  span(options: SpanOptions): ISpan;
  generation(options: GenerationOptions): IGeneration;
  event(options: EventOptions): void;
  
  // Lifecycle
  end(data?: SpanEnd): void;
  
  // Updates
  update(data: SpanUpdate): void;
  setMetadata(key: string, value: any): void;
}
```

### Step 2: Context Management
Create `modules/langfuse/context.ts`:

**Research First**:
1. AsyncLocalStorage in Node.js
2. Context propagation patterns
3. Memory leak prevention in async contexts

**Implementation**:

```typescript
import { AsyncLocalStorage } from 'async_hooks';

interface TraceContext {
  trace: ITrace;
  spans: ISpan[];
  metadata: Map<string, any>;
}

export class TraceContextManager {
  private storage = new AsyncLocalStorage<TraceContext>();
  
  // Set current trace context
  setContext(context: TraceContext): void {
    this.storage.enterWith(context);
  }
  
  // Get current context
  getContext(): TraceContext | undefined {
    return this.storage.getStore();
  }
  
  // Run function in trace context
  async runInContext<T>(
    context: TraceContext,
    fn: () => Promise<T>
  ): Promise<T> {
    return this.storage.run(context, fn);
  }
  
  // Get current trace
  getCurrentTrace(): ITrace | null {
    return this.getContext()?.trace || null;
  }
  
  // Get current span
  getCurrentSpan(): ISpan | null {
    const context = this.getContext();
    if (!context) return null;
    
    return context.spans[context.spans.length - 1] || null;
  }
  
  // Push span to stack
  pushSpan(span: ISpan): void {
    const context = this.getContext();
    if (!context) {
      throw new Error('No trace context available');
    }
    
    context.spans.push(span);
  }
  
  // Pop span from stack
  popSpan(): ISpan | undefined {
    const context = this.getContext();
    if (!context) {
      throw new Error('No trace context available');
    }
    
    return context.spans.pop();
  }
  
  // Add metadata to current context
  setMetadata(key: string, value: any): void {
    const context = this.getContext();
    if (!context) return;
    
    context.metadata.set(key, value);
  }
  
  // Clear context (important for cleanup)
  clearContext(): void {
    const context = this.getContext();
    if (context) {
      context.spans = [];
      context.metadata.clear();
    }
  }
}
```

### Step 3: Wrapped Langfuse Objects
Create `modules/langfuse/wrappers.ts`:

```typescript
import { Langfuse as LangfuseSDK, LangfuseTraceClient } from 'langfuse';

// Wrapped trace object
export class WrappedTrace implements ITrace {
  constructor(
    private trace: LangfuseTraceClient,
    private contextManager: TraceContextManager,
    private sanitizer: DataSanitizer
  ) {}
  
  get id(): string {
    return this.trace.id;
  }
  
  span(options: SpanOptions): ISpan {
    // Sanitize options
    const sanitized = this.sanitizer.sanitizeSpanOptions(options);
    
    // Create span
    const span = this.trace.span(sanitized);
    
    // Wrap span
    const wrapped = new WrappedSpan(span, this.contextManager, this.sanitizer);
    
    // Update context
    this.contextManager.pushSpan(wrapped);
    
    return wrapped;
  }
  
  generation(options: GenerationOptions): IGeneration {
    // Sanitize sensitive data
    const sanitized = this.sanitizer.sanitizeGenerationOptions(options);
    
    // Create generation
    const generation = this.trace.generation(sanitized);
    
    // Wrap and return
    return new WrappedGeneration(generation, this.sanitizer);
  }
  
  event(options: EventOptions): void {
    const sanitized = this.sanitizer.sanitizeEventOptions(options);
    this.trace.event(sanitized);
  }
  
  update(data: TraceUpdate): void {
    const sanitized = this.sanitizer.sanitizeTraceUpdate(data);
    this.trace.update(sanitized);
  }
  
  setUser(userId: string): void {
    // Hash or anonymize if needed
    const sanitizedUserId = this.sanitizer.sanitizeUserId(userId);
    this.trace.update({ userId: sanitizedUserId });
  }
  
  setSession(sessionId: string): void {
    this.trace.update({ sessionId });
  }
  
  addTags(tags: string[]): void {
    const currentTags = this.trace.tags || [];
    this.trace.update({ tags: [...currentTags, ...tags] });
  }
  
  setMetadata(key: string, value: any): void {
    if (!this.sanitizer.isAllowedMetadataKey(key)) {
      return;
    }
    
    const sanitizedValue = this.sanitizer.sanitizeMetadataValue(value);
    this.trace.update({
      metadata: {
        ...this.trace.metadata,
        [key]: sanitizedValue
      }
    });
  }
}

// Wrapped span object
export class WrappedSpan implements ISpan {
  private ended = false;
  
  constructor(
    private span: any, // Langfuse span type
    private contextManager: TraceContextManager,
    private sanitizer: DataSanitizer
  ) {}
  
  get id(): string {
    return this.span.id;
  }
  
  span(options: SpanOptions): ISpan {
    if (this.ended) {
      throw new Error('Cannot create span on ended span');
    }
    
    const sanitized = this.sanitizer.sanitizeSpanOptions(options);
    const childSpan = this.span.span(sanitized);
    
    const wrapped = new WrappedSpan(childSpan, this.contextManager, this.sanitizer);
    this.contextManager.pushSpan(wrapped);
    
    return wrapped;
  }
  
  end(data?: SpanEnd): void {
    if (this.ended) return;
    
    const sanitized = data ? this.sanitizer.sanitizeSpanEnd(data) : undefined;
    this.span.end(sanitized);
    
    this.ended = true;
    this.contextManager.popSpan();
  }
}
```

### Step 4: Data Sanitization
Create `modules/langfuse/sanitizer.ts`:

```typescript
export class DataSanitizer {
  constructor(private config: SanitizerConfig) {}
  
  sanitizeSpanOptions(options: SpanOptions): any {
    return {
      ...options,
      name: this.sanitizeString(options.name),
      metadata: this.sanitizeMetadata(options.metadata),
      input: this.sanitizeData(options.input),
      output: this.sanitizeData(options.output)
    };
  }
  
  sanitizeData(data: any): any {
    if (!data) return data;
    
    // Deep clone to avoid modifying original
    const cloned = JSON.parse(JSON.stringify(data));
    
    // Redact sensitive patterns
    return this.redactSensitive(cloned);
  }
  
  private redactSensitive(obj: any): any {
    if (typeof obj === 'string') {
      // Redact patterns like API keys, passwords, etc.
      for (const pattern of this.config.redactPatterns || []) {
        obj = obj.replace(pattern, '[REDACTED]');
      }
      return obj;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.redactSensitive(item));
    }
    
    if (typeof obj === 'object' && obj !== null) {
      const result: any = {};
      
      for (const [key, value] of Object.entries(obj)) {
        // Check if key contains sensitive words
        if (this.isSensitiveKey(key)) {
          result[key] = '[REDACTED]';
        } else {
          result[key] = this.redactSensitive(value);
        }
      }
      
      return result;
    }
    
    return obj;
  }
  
  private isSensitiveKey(key: string): boolean {
    const sensitiveKeys = [
      'password', 'token', 'secret', 'key', 'auth',
      'credential', 'private', 'ssn', 'credit_card'
    ];
    
    const lowerKey = key.toLowerCase();
    return sensitiveKeys.some(sensitive => lowerKey.includes(sensitive));
  }
  
  isAllowedMetadataKey(key: string): boolean {
    if (!this.config.allowedMetadataKeys) {
      return true; // Allow all if not configured
    }
    
    return this.config.allowedMetadataKeys.includes(key);
  }
}
```

### Step 5: Core Module Implementation
Create `modules/langfuse/index.ts`:

```typescript
export class LangfuseModule implements ILangfuseModule {
  readonly name = 'langfuse';
  readonly version = '1.0.0';
  
  private client?: LangfuseSDK;
  private contextManager: TraceContextManager;
  private sanitizer: DataSanitizer;
  private config?: LangfuseConfig;
  private flushInterval?: NodeJS.Timer;
  
  constructor() {
    this.contextManager = new TraceContextManager();
  }
  
  async initialize(config: LangfuseConfig): Promise<void> {
    this.config = config;
    
    // Skip if disabled
    if (config.enabled === false) {
      return;
    }
    
    // Initialize sanitizer
    this.sanitizer = new DataSanitizer({
      maskSensitiveData: config.maskSensitiveData ?? true,
      redactPatterns: config.redactPatterns || [
        /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email
        /\b\d{3}-\d{2}-\d{4}\b/g, // SSN
        /\b\d{16}\b/g, // Credit card
        /Bearer\s+[A-Za-z0-9\-._~+\/]+=*/g, // Bearer tokens
      ],
      allowedMetadataKeys: config.allowedMetadataKeys
    });
    
    // Initialize Langfuse client
    this.client = new LangfuseSDK({
      publicKey: config.publicKey,
      secretKey: config.secretKey,
      baseUrl: config.baseUrl,
      flushAt: config.flushAt,
      flushInterval: config.flushInterval
    });
    
    // Setup auto-flush if configured
    if (config.flushInterval) {
      this.flushInterval = setInterval(() => {
        this.flush().catch(err => 
          console.error('Langfuse auto-flush error:', err)
        );
      }, config.flushInterval);
    }
  }
  
  startTrace(options: TraceOptions): ITrace {
    if (!this.client || this.config?.enabled === false) {
      return new NoOpTrace();
    }
    
    // Apply sampling
    if (this.config?.samplingRate !== undefined) {
      if (Math.random() > this.config.samplingRate) {
        return new NoOpTrace();
      }
    }
    
    // Create trace
    const trace = this.client.trace({
      id: options.id,
      name: options.name,
      userId: options.userId,
      sessionId: options.sessionId,
      metadata: this.sanitizer.sanitizeMetadata(options.metadata),
      tags: options.tags,
      release: options.release,
      version: options.version
    });
    
    // Wrap trace
    const wrapped = new WrappedTrace(trace, this.contextManager, this.sanitizer);
    
    // Set context
    this.contextManager.setContext({
      trace: wrapped,
      spans: [],
      metadata: new Map()
    });
    
    return wrapped;
  }
  
  getCurrentTrace(): ITrace | null {
    return this.contextManager.getCurrentTrace();
  }
  
  async runInTraceContext<T>(
    trace: ITrace,
    fn: () => Promise<T>
  ): Promise<T> {
    return this.contextManager.runInContext(
      {
        trace,
        spans: [],
        metadata: new Map()
      },
      fn
    );
  }
  
  async scoreTrace(traceId: string, score: Score): Promise<void> {
    if (!this.client || this.config?.enabled === false) {
      return;
    }
    
    await this.client.score({
      traceId,
      ...score
    });
  }
  
  async getPrompt(name: string, version?: string): Promise<IPrompt> {
    if (!this.client) {
      throw new Error('Langfuse not initialized');
    }
    
    const prompt = await this.client.getPrompt({
      name,
      version
    });
    
    return new WrappedPrompt(prompt);
  }
  
  async flush(): Promise<void> {
    if (!this.client) return;
    
    await this.client.flush();
  }
  
  async shutdown(): Promise<void> {
    // Clear flush interval
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    
    // Final flush
    await this.flush();
    
    // Clear context
    this.contextManager.clearContext();
    
    // Shutdown client
    if (this.client) {
      await this.client.shutdown();
    }
  }
  
  async health(): Promise<HealthStatus> {
    try {
      // Try to create and immediately flush a test trace
      const trace = this.client?.trace({
        name: 'health-check',
        metadata: { type: 'health-check' }
      });
      
      if (trace) {
        trace.update({ metadata: { timestamp: Date.now() } });
      }
      
      await this.flush();
      
      return {
        status: 'healthy',
        message: 'Langfuse connection is operational'
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error.message,
        details: { error }
      };
    }
  }
}

// No-op implementations for when tracing is disabled
class NoOpTrace implements ITrace {
  id = 'noop';
  span(options: SpanOptions): ISpan { return new NoOpSpan(); }
  generation(options: GenerationOptions): IGeneration { return new NoOpGeneration(); }
  event(options: EventOptions): void {}
  update(data: TraceUpdate): void {}
  setUser(userId: string): void {}
  setSession(sessionId: string): void {}
  addTags(tags: string[]): void {}
  setMetadata(key: string, value: any): void {}
}
```

### Step 6: Module Factory
Create `modules/langfuse/factory.ts`:

```typescript
import { wrapModule } from '../common/wrapper';

export function createLangfuseModule(config: LangfuseConfig): ILangfuseModule {
  const module = new LangfuseModule();
  
  // Wrap for additional monitoring
  return wrapModule(module, {
    name: 'langfuse',
    monitoring: {
      trackLatency: true,
      trackErrors: true,
      trackMethodCalls: ['startTrace', 'scoreTrace', 'flush']
    },
    errorHandling: {
      logErrors: true,
      swallowErrors: true  // Don't let tracing errors break the app
    }
  });
}
```

### Step 7: Testing

Create comprehensive tests:

1. **Unit Tests**
   - Context management
   - Data sanitization
   - Trace wrapping
   - No-op behavior

2. **Integration Tests**
   - Real Langfuse connection
   - Trace creation and nesting
   - Context propagation
   - Flushing behavior

3. **Performance Tests**
   - Overhead measurement
   - Memory usage
   - Context switching cost

### Step 8: Usage Examples

```typescript
// Example: Using Langfuse module in an agent
class MyAgent {
  private langfuse: ILangfuseModule;
  
  async execute(input: any): Promise<any> {
    // Tracing is automatic if context exists
    const span = this.langfuse.getCurrentTrace()?.span({
      name: 'agent-execution',
      input
    });
    
    try {
      // Do work
      const result = await this.doWork(input);
      
      span?.update({ output: result });
      span?.end({ level: 'DEFAULT' });
      
      return result;
    } catch (error) {
      span?.end({ 
        level: 'ERROR',
        statusMessage: error.message 
      });
      throw error;
    }
  }
}
```

## Post-Implementation Validation

### 1. Functionality Checklist
- [ ] Context propagation works across async calls
- [ ] Nested spans work correctly
- [ ] Data sanitization removes sensitive info
- [ ] Sampling works as configured
- [ ] No-op mode has zero overhead
- [ ] Flushing works reliably

### 2. Security Requirements
- [ ] All sensitive data is redacted
- [ ] User IDs can be anonymized
- [ ] Metadata filtering works
- [ ] No secrets in traces

### 3. Performance Requirements
- [ ] Minimal overhead when enabled
- [ ] Zero overhead when disabled
- [ ] No memory leaks from context
- [ ] Efficient batching

## Common Pitfalls to Avoid

1. **Don't expose raw Langfuse objects** - Always wrap them
2. **Don't forget context cleanup** - Prevent memory leaks
3. **Don't trace sensitive data** - Always sanitize
4. **Don't block on flush** - Use async operations
5. **Don't ignore sampling** - Important for high-volume apps
6. **Don't create spans without ending them** - Memory leak risk

## Final Validation Questions

1. Is context propagation automatic and reliable?
2. Does data sanitization catch all sensitive patterns?
3. Is the module truly independent?
4. Does it handle Langfuse SDK errors gracefully?
5. Is performance impact acceptable?
6. Can developers use it without understanding Langfuse?

## Next Steps
After completing the Langfuse module, implement the Session & State module (03-session-state-module-implementation.md) for centralized state management.