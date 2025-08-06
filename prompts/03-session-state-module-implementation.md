# Session & State Module Implementation Prompt

## Context
You are implementing the Session & State Module - the centralized system for managing all session, state, and memory concerns in AgentHub. This module provides a unified interface for session management, state scoping (session, user, global, agent), persistence, and memory operations. It's critical that this module handles concurrent access, provides ACID-like guarantees, and scales efficiently.

## Pre-Implementation Requirements

### 1. Documentation Review
You MUST read:
1. Google ADK session documentation: https://google.github.io/adk-docs/sessions/
2. Google ADK state documentation: https://google.github.io/adk-docs/sessions/state/
3. Redis documentation for session storage patterns
4. Study concurrent data structure patterns
5. Review architecture: `/Users/sakshams/tekai/TekContextEngine/agenthub-architecture-revised.md`

### 2. Understand Module Requirements
This module must:
- Manage sessions with different lifecycles
- Provide scoped state access (session, user, global, agent)
- Handle concurrent access safely
- Support persistence and recovery
- Integrate with memory operations
- Provide transaction-like operations

## Implementation Steps

### Step 1: Module Interface and Types
Create `modules/session-state/types.ts`:

```typescript
export interface ISessionStateModule {
  name: string;
  version: string;
  
  // Lifecycle
  initialize(config: SessionStateConfig): Promise<void>;
  health(): Promise<HealthStatus>;
  shutdown(): Promise<void>;
  
  // Session Management
  createSession(options?: CreateSessionOptions): Promise<ISession>;
  getSession(sessionId: string): Promise<ISession | null>;
  updateSession(sessionId: string, updates: SessionUpdate): Promise<void>;
  deleteSession(sessionId: string): Promise<void>;
  listSessions(filter?: SessionFilter): Promise<ISession[]>;
  
  // State Management
  getState(scope: StateScope): Promise<State>;
  setState(scope: StateScope, updates: StateUpdate): Promise<void>;
  deleteState(scope: StateScope, keys?: string[]): Promise<void>;
  
  // Transactions
  transaction<T>(fn: (tx: IStateTransaction) => Promise<T>): Promise<T>;
  
  // Memory Integration
  addMemory(scope: MemoryScope, memory: Memory): Promise<void>;
  queryMemory(scope: MemoryScope, query: MemoryQuery): Promise<Memory[]>;
  clearMemory(scope: MemoryScope): Promise<void>;
  
  // Persistence
  checkpoint(scope: StateScope): Promise<string>;
  restore(checkpointId: string): Promise<void>;
  listCheckpoints(scope: StateScope): Promise<Checkpoint[]>;
  
  // Enhanced Runtime State Persistence (Flowise patterns)
  setRuntimeState(sessionId: string, key: string, value: any): Promise<void>;
  getRuntimeState(sessionId: string, key?: string): Promise<any>;
  clearRuntimeState(sessionId: string, keys?: string[]): Promise<void>;
  
  // Execution State Management
  saveExecutionState(executionId: string, state: ExecutionStateData): Promise<void>;
  loadExecutionState(executionId: string): Promise<ExecutionStateData | null>;
  updateExecutionProgress(executionId: string, nodeId: string, status: NodeExecutionStatus, result?: any): Promise<void>;
  
  // Human Interaction State
  pauseForHuman(executionId: string, nodeId: string, interaction: HumanInteractionRequest): Promise<void>;
  resumeFromHuman(executionId: string, response: HumanInteractionResponse): Promise<void>;
  getHumanInteractionState(executionId: string): Promise<HumanInteractionState | null>;
  
  // Variable State Management
  setVariableState(scope: VariableScope, variables: Record<string, any>): Promise<void>;
  getVariableState(scope: VariableScope): Promise<Record<string, any>>;
  resolveVariableTemplate(template: string, scope: VariableScope): Promise<string>;
}

export interface SessionStateConfig {
  // Storage backend
  storage: {
    type: 'memory' | 'redis' | 'postgres' | 'dynamodb';
    config: StorageConfig;
  };
  
  // Session settings
  session: {
    defaultTTL?: number;        // Session expiry in seconds
    extendOnAccess?: boolean;   // Extend TTL on access
    maxSessions?: number;       // Max sessions per user
  };
  
  // State settings
  state: {
    maxSize?: number;           // Max state size in bytes
    compression?: boolean;      // Compress state data
    encryption?: boolean;       // Encrypt state at rest
  };
  
  // Memory settings
  memory: {
    maxItems?: number;          // Max memory items per scope
    ttl?: number;              // Memory item TTL
  };
  
  // Enhanced Runtime State Settings (Flowise patterns)
  runtime: {
    persistenceStrategy: 'immediate' | 'batched' | 'checkpoint';
    batchSize?: number;         // For batched persistence
    checkpointInterval?: number; // Checkpoint every N operations
    enableStreaming?: boolean;   // Stream state changes
    stateCompression?: boolean;  // Compress runtime state
  };
  
  // Execution State Settings
  execution: {
    trackNodeProgress?: boolean;    // Track individual node execution
    saveIntermediateResults?: boolean; // Save node outputs
    enableResume?: boolean;         // Enable execution resume
    maxExecutionHistory?: number;   // Max executions to keep
  };
  
  // Human Interaction Settings
  humanInteraction: {
    enabled?: boolean;              // Enable human-in-the-loop
    defaultTimeout?: number;        // Default interaction timeout
    maxConcurrentInteractions?: number;
    persistInteractionHistory?: boolean;
  };
  
  // Variable State Settings
  variables: {
    enableTemplating?: boolean;     // Enable variable templating
    templateSyntax?: 'mustache' | 'handlebars' | 'simple';
    maxVariableSize?: number;       // Max size per variable
    enableTypeValidation?: boolean; // Validate variable types
  };
  
  // Performance
  cache?: {
    enabled: boolean;
    ttl: number;
    maxSize: number;
  };
}

export interface ISession {
  id: string;
  userId?: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
  
  // State access
  state: SessionState;
  
  // Memory access
  memory: SessionMemory;
  
  // Enhanced runtime state access (Flowise patterns)
  runtime: RuntimeState;
  
  // Execution state access
  execution: ExecutionState;
  
  // Variable state access
  variables: VariableState;
  
  // Human interaction access
  humanInteraction: HumanInteractionState;
  
  // Metadata
  metadata: Record<string, any>;
  tags: string[];
  
  // Methods
  update(updates: SessionUpdate): Promise<void>;
  extend(duration: number): Promise<void>;
  checkpoint(): Promise<string>;
  end(): Promise<void>;
  
  // Enhanced methods
  pauseExecution(nodeId: string, reason?: string): Promise<void>;
  resumeExecution(nodeId?: string): Promise<void>;
  streamStateChanges(): AsyncIterableIterator<StateChangeEvent>;
}

export interface StateScope {
  type: 'session' | 'user' | 'global' | 'agent' | 'temp';
  sessionId?: string;
  userId?: string;
  agentId?: string;
  namespace?: string;  // For sub-scoping
}

export interface State {
  data: Record<string, any>;
  metadata: {
    version: number;
    updatedAt: Date;
    updatedBy?: string;
  };
}

export interface IStateTransaction {
  get(scope: StateScope, key: string): Promise<any>;
  set(scope: StateScope, key: string, value: any): void;
  delete(scope: StateScope, key: string): void;
  commit(): Promise<void>;
  rollback(): void;
}

// Enhanced Types for Flowise Pattern Integration

// Runtime State Types
export interface RuntimeState {
  get<T = any>(key: string): Promise<T>;
  set(key: string, value: any): Promise<void>;
  update(updates: Record<string, any>): Promise<void>;
  clear(keys?: string[]): Promise<void>;
  stream(): AsyncIterableIterator<RuntimeStateChange>;
}

export interface RuntimeStateChange {
  type: 'set' | 'update' | 'delete' | 'clear';
  key?: string;
  value?: any;
  timestamp: Date;
  sessionId: string;
}

// Execution State Types
export interface ExecutionStateData {
  executionId: string;
  workflowId: string;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed';
  currentNode?: string;
  nodeStates: Map<string, NodeExecutionState>;
  variables: Map<string, any>;
  startTime: Date;
  endTime?: Date;
  pauseReason?: string;
  resumeCapable: boolean;
}

export interface NodeExecutionState {
  nodeId: string;
  status: NodeExecutionStatus;
  startTime?: Date;
  endTime?: Date;
  input?: any;
  output?: any;
  error?: string;
  retryCount: number;
  dependencies: string[];
  dependentsCompleted: boolean;
}

export type NodeExecutionStatus = 
  | 'waiting' 
  | 'ready' 
  | 'running' 
  | 'completed' 
  | 'failed' 
  | 'skipped' 
  | 'paused';

// Human Interaction Types
export interface HumanInteractionRequest {
  type: 'approval' | 'input' | 'choice' | 'confirmation';
  prompt: string;
  options?: string[];
  defaultValue?: any;
  timeout?: number;
  required?: boolean;
  metadata?: Record<string, any>;
}

export interface HumanInteractionResponse {
  type: 'approved' | 'rejected' | 'input' | 'choice' | 'timeout';
  value?: any;
  timestamp: Date;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface HumanInteractionState {
  currentInteraction?: {
    id: string;
    nodeId: string;
    request: HumanInteractionRequest;
    startTime: Date;
    status: 'pending' | 'responded' | 'timeout';
  };
  interactionHistory: HumanInteraction[];
  pendingCount: number;
}

export interface HumanInteraction {
  id: string;
  executionId: string;
  nodeId: string;
  request: HumanInteractionRequest;
  response?: HumanInteractionResponse;
  startTime: Date;
  endTime?: Date;
  status: 'pending' | 'responded' | 'timeout' | 'cancelled';
}

// Variable State Types
export interface VariableScope {
  sessionId?: string;
  executionId?: string;
  workflowId?: string;
  nodeId?: string;
  userId?: string;
  global?: boolean;
}

export interface VariableState {
  get<T = any>(name: string, scope?: VariableScope): Promise<T>;
  set(name: string, value: any, scope?: VariableScope): Promise<void>;
  resolve(template: string, scope?: VariableScope): Promise<string>;
  list(scope?: VariableScope): Promise<Record<string, any>>;
  clear(scope?: VariableScope): Promise<void>;
}

export interface StateChangeEvent {
  type: 'runtime' | 'execution' | 'variable' | 'human_interaction';
  sessionId: string;
  data: any;
  timestamp: Date;
  source: string;
}
```

### Step 2: Enhanced Storage Abstraction Layer
Create `modules/session-state/storage/`:

**Enhanced Storage Interface** (with Flowise patterns):
```typescript
export interface IStateStorage {
  // Session operations
  createSession(session: SessionData): Promise<void>;
  getSession(id: string): Promise<SessionData | null>;
  updateSession(id: string, updates: Partial<SessionData>): Promise<void>;
  deleteSession(id: string): Promise<void>;
  listSessions(filter: SessionFilter): Promise<SessionData[]>;
  
  // State operations
  getState(scope: StateScope): Promise<StateData | null>;
  setState(scope: StateScope, state: StateData): Promise<void>;
  deleteState(scope: StateScope): Promise<void>;
  
  // Atomic operations
  compareAndSwap(
    scope: StateScope,
    expectedVersion: number,
    newState: StateData
  ): Promise<boolean>;
  
  // Bulk operations
  multiGet(scopes: StateScope[]): Promise<(StateData | null)[]>;
  multiSet(updates: Array<[StateScope, StateData]>): Promise<void>;
  
  // Enhanced Runtime State Operations (Flowise patterns)
  setRuntimeState(sessionId: string, key: string, value: any): Promise<void>;
  getRuntimeState(sessionId: string, key?: string): Promise<any>;
  clearRuntimeState(sessionId: string, keys?: string[]): Promise<void>;
  streamRuntimeStateChanges(sessionId: string): AsyncIterableIterator<RuntimeStateChange>;
  
  // Execution State Operations
  saveExecutionState(executionId: string, state: ExecutionStateData): Promise<void>;
  loadExecutionState(executionId: string): Promise<ExecutionStateData | null>;
  updateExecutionProgress(
    executionId: string,
    nodeId: string,
    status: NodeExecutionStatus,
    result?: any
  ): Promise<void>;
  listExecutionStates(filter: ExecutionFilter): Promise<ExecutionStateData[]>;
  
  // Human Interaction State Operations
  saveHumanInteraction(interaction: HumanInteraction): Promise<void>;
  updateHumanInteraction(interactionId: string, response: HumanInteractionResponse): Promise<void>;
  getHumanInteractionState(executionId: string): Promise<HumanInteractionState | null>;
  listPendingInteractions(userId?: string): Promise<HumanInteraction[]>;
  
  // Variable State Operations
  setVariableState(scope: VariableScope, variables: Record<string, any>): Promise<void>;
  getVariableState(scope: VariableScope): Promise<Record<string, any>>;
  clearVariableState(scope: VariableScope): Promise<void>;
  
  // Streaming and Real-time Operations
  subscribeToStateChanges(sessionId: string): AsyncIterableIterator<StateChangeEvent>;
  publishStateChange(event: StateChangeEvent): Promise<void>;
  
  // Maintenance
  cleanup(): Promise<void>;
  size(): Promise<StorageStats>;
}
```

**Redis Storage Implementation**:
```typescript
import Redis from 'ioredis';

export class RedisStateStorage implements IStateStorage {
  private redis: Redis;
  private keyPrefix: string;
  
  constructor(config: RedisStorageConfig) {
    this.redis = new Redis({
      host: config.host,
      port: config.port,
      password: config.password,
      db: config.db,
      keyPrefix: config.keyPrefix || 'agenthub:',
      
      // Connection pool settings
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      enableOfflineQueue: true,
      
      // Performance
      lazyConnect: false,
      keepAlive: 10000
    });
    
    this.keyPrefix = config.keyPrefix || 'agenthub:';
  }
  
  private getSessionKey(id: string): string {
    return `${this.keyPrefix}session:${id}`;
  }
  
  private getStateKey(scope: StateScope): string {
    switch (scope.type) {
      case 'session':
        return `${this.keyPrefix}state:session:${scope.sessionId}`;
      case 'user':
        return `${this.keyPrefix}state:user:${scope.userId}`;
      case 'global':
        return `${this.keyPrefix}state:global${scope.namespace ? `:${scope.namespace}` : ''}`;
      case 'agent':
        return `${this.keyPrefix}state:agent:${scope.agentId}`;
      case 'temp':
        return `${this.keyPrefix}state:temp:${scope.sessionId}`;
    }
  }
  
  async createSession(session: SessionData): Promise<void> {
    const key = this.getSessionKey(session.id);
    const data = this.serialize(session);
    
    // Set with expiry if provided
    if (session.expiresAt) {
      const ttl = Math.floor((session.expiresAt.getTime() - Date.now()) / 1000);
      await this.redis.setex(key, ttl, data);
    } else {
      await this.redis.set(key, data);
    }
    
    // Add to user's session list if userId provided
    if (session.userId) {
      await this.redis.sadd(
        `${this.keyPrefix}user:${session.userId}:sessions`,
        session.id
      );
    }
    
    // Initialize runtime state storage
    await this.initializeSessionRuntimeState(session.id);
  }
  
  // Enhanced Runtime State Methods (Flowise patterns)
  async setRuntimeState(sessionId: string, key: string, value: any): Promise<void> {
    const stateKey = `${this.keyPrefix}runtime:${sessionId}`;
    const serializedValue = this.serialize(value);
    
    await this.redis.hset(stateKey, key, serializedValue);
    
    // Publish state change event
    const event: RuntimeStateChange = {
      type: 'set',
      key,
      value,
      timestamp: new Date(),
      sessionId
    };
    
    await this.publishRuntimeStateChange(sessionId, event);
  }
  
  async getRuntimeState(sessionId: string, key?: string): Promise<any> {
    const stateKey = `${this.keyPrefix}runtime:${sessionId}`;
    
    if (key) {
      const value = await this.redis.hget(stateKey, key);
      return value ? this.deserialize(value) : null;
    } else {
      const allValues = await this.redis.hgetall(stateKey);
      const result: Record<string, any> = {};
      
      for (const [k, v] of Object.entries(allValues)) {
        result[k] = this.deserialize(v);
      }
      
      return result;
    }
  }
  
  async clearRuntimeState(sessionId: string, keys?: string[]): Promise<void> {
    const stateKey = `${this.keyPrefix}runtime:${sessionId}`;
    
    if (keys && keys.length > 0) {
      await this.redis.hdel(stateKey, ...keys);
    } else {
      await this.redis.del(stateKey);
    }
    
    // Publish clear event
    const event: RuntimeStateChange = {
      type: keys ? 'delete' : 'clear',
      key: keys ? keys.join(',') : undefined,
      timestamp: new Date(),
      sessionId
    };
    
    await this.publishRuntimeStateChange(sessionId, event);
  }
  
  async *streamRuntimeStateChanges(sessionId: string): AsyncIterableIterator<RuntimeStateChange> {
    const channelKey = `${this.keyPrefix}runtime:events:${sessionId}`;
    const subscriber = this.redis.duplicate();
    
    await subscriber.subscribe(channelKey);
    
    try {
      while (true) {
        const message = await new Promise<string>((resolve) => {
          subscriber.once('message', (channel, msg) => {
            if (channel === channelKey) {
              resolve(msg);
            }
          });
        });
        
        yield this.deserialize(message);
      }
    } finally {
      await subscriber.unsubscribe();
      subscriber.disconnect();
    }
  }
  
  // Execution State Methods
  async saveExecutionState(executionId: string, state: ExecutionStateData): Promise<void> {
    const key = `${this.keyPrefix}execution:${executionId}`;
    const data = this.serialize({
      ...state,
      nodeStates: Array.from(state.nodeStates.entries()),
      variables: Array.from(state.variables.entries())
    });
    
    await this.redis.set(key, data);
    
    // Set expiry based on execution status
    if (state.status === 'completed' || state.status === 'failed') {
      await this.redis.expire(key, 24 * 60 * 60); // 24 hours
    }
  }
  
  async loadExecutionState(executionId: string): Promise<ExecutionStateData | null> {
    const key = `${this.keyPrefix}execution:${executionId}`;
    const data = await this.redis.get(key);
    
    if (!data) return null;
    
    const parsed = this.deserialize(data);
    
    return {
      ...parsed,
      nodeStates: new Map(parsed.nodeStates),
      variables: new Map(parsed.variables)
    };
  }
  
  private async initializeSessionRuntimeState(sessionId: string): Promise<void> {
    const stateKey = `${this.keyPrefix}runtime:${sessionId}`;
    await this.redis.hset(stateKey, '__initialized', new Date().toISOString());
  }
  
  private async publishRuntimeStateChange(
    sessionId: string, 
    event: RuntimeStateChange
  ): Promise<void> {
    const channelKey = `${this.keyPrefix}runtime:events:${sessionId}`;
    await this.redis.publish(channelKey, this.serialize(event));
  }
  
  async getState(scope: StateScope): Promise<StateData | null> {
    const key = this.getStateKey(scope);
    const data = await this.redis.get(key);
    
    if (!data) return null;
    
    return this.deserialize(data);
  }
  
  async setState(scope: StateScope, state: StateData): Promise<void> {
    const key = this.getStateKey(scope);
    const data = this.serialize(state);
    
    // Set with TTL for temp scope
    if (scope.type === 'temp') {
      await this.redis.setex(key, 3600, data); // 1 hour TTL
    } else {
      await this.redis.set(key, data);
    }
  }
  
  async compareAndSwap(
    scope: StateScope,
    expectedVersion: number,
    newState: StateData
  ): Promise<boolean> {
    const key = this.getStateKey(scope);
    
    // Use Redis WATCH for optimistic locking
    const result = await this.redis
      .multi()
      .watch(key)
      .get(key)
      .exec();
    
    if (!result) return false; // Transaction aborted
    
    const currentData = result[1][1];
    if (!currentData) return false;
    
    const current = this.deserialize(currentData);
    if (current.metadata.version !== expectedVersion) {
      return false;
    }
    
    // Update with new version
    newState.metadata.version = expectedVersion + 1;
    
    const updateResult = await this.redis
      .multi()
      .set(key, this.serialize(newState))
      .exec();
    
    return updateResult !== null;
  }
  
  private serialize(data: any): string {
    return JSON.stringify(data);
  }
  
  private deserialize(data: string): any {
    return JSON.parse(data);
  }
}
```

### Step 3: Enhanced Session Implementation
Create `modules/session-state/session.ts` (with Flowise patterns):

```typescript
export class Session implements ISession {
  private storage: IStateStorage;
  private cache: StateCache;
  private dirty = new Set<string>();
  
  constructor(
    private data: SessionData,
    private module: SessionStateModule
  ) {
    this.storage = module.getStorage();
    this.cache = new StateCache();
  }
  
  get id(): string { return this.data.id; }
  get userId(): string | undefined { return this.data.userId; }
  get createdAt(): Date { return this.data.createdAt; }
  get updatedAt(): Date { return this.data.updatedAt; }
  get expiresAt(): Date | undefined { return this.data.expiresAt; }
  
  get state(): SessionState {
    return new SessionStateProxy(this, 'session');
  }
  
  get memory(): SessionMemory {
    return new SessionMemoryProxy(this);
  }
  
  // Enhanced runtime state access (Flowise patterns)
  get runtime(): RuntimeState {
    return new RuntimeStateProxy(this);
  }
  
  get execution(): ExecutionState {
    return new ExecutionStateProxy(this);
  }
  
  get variables(): VariableState {
    return new VariableStateProxy(this);
  }
  
  get humanInteraction(): HumanInteractionState {
    return new HumanInteractionStateProxy(this);
  }
  
  get metadata(): Record<string, any> {
    return { ...this.data.metadata };
  }
  
  get tags(): string[] {
    return [...this.data.tags];
  }
  
  async update(updates: SessionUpdate): Promise<void> {
    // Apply updates
    if (updates.metadata) {
      this.data.metadata = { ...this.data.metadata, ...updates.metadata };
    }
    
    if (updates.tags) {
      this.data.tags = updates.tags;
    }
    
    this.data.updatedAt = new Date();
    
    // Save to storage
    await this.storage.updateSession(this.id, this.data);
  }
  
  async extend(duration: number): Promise<void> {
    if (!this.data.expiresAt) return;
    
    this.data.expiresAt = new Date(
      this.data.expiresAt.getTime() + duration * 1000
    );
    
    await this.storage.updateSession(this.id, {
      expiresAt: this.data.expiresAt
    });
  }
  
  async checkpoint(): Promise<string> {
    const checkpointId = generateId('chk');
    
    // Get all state scopes
    const states = await Promise.all([
      this.storage.getState({ type: 'session', sessionId: this.id }),
      this.storage.getState({ type: 'user', userId: this.userId }),
      this.storage.getState({ type: 'temp', sessionId: this.id })
    ]);
    
    // Save checkpoint
    await this.storage.saveCheckpoint({
      id: checkpointId,
      sessionId: this.id,
      timestamp: new Date(),
      states: states.filter(Boolean),
      metadata: this.data.metadata
    });
    
    return checkpointId;
  }
  
  async end(): Promise<void> {
    // Clean up temp state
    await this.storage.deleteState({ type: 'temp', sessionId: this.id });
    
    // Clean up runtime state
    await this.storage.clearRuntimeState(this.id);
    
    // Mark session as ended
    this.data.endedAt = new Date();
    await this.storage.updateSession(this.id, this.data);
  }
  
  // Enhanced methods (Flowise patterns)
  async pauseExecution(nodeId: string, reason?: string): Promise<void> {
    const executionStates = await this.storage.listExecutionStates({
      sessionId: this.id,
      status: 'running'
    });
    
    for (const state of executionStates) {
      state.status = 'paused';
      state.pauseReason = reason || 'Manual pause';
      await this.storage.saveExecutionState(state.executionId, state);
    }
  }
  
  async resumeExecution(nodeId?: string): Promise<void> {
    const executionStates = await this.storage.listExecutionStates({
      sessionId: this.id,
      status: 'paused'
    });
    
    for (const state of executionStates) {
      if (!nodeId || state.currentNode === nodeId) {
        state.status = 'running';
        state.pauseReason = undefined;
        await this.storage.saveExecutionState(state.executionId, state);
      }
    }
  }
  
  async *streamStateChanges(): AsyncIterableIterator<StateChangeEvent> {
    yield* this.storage.subscribeToStateChanges(this.id);
  }
}

// Enhanced Proxy Classes for Flowise Pattern Integration

// Existing SessionStateProxy (enhanced)
class SessionStateProxy {
  constructor(
    private session: Session,
    private scopeType: 'session' | 'user' | 'temp'
  ) {}
  
  async get<T = any>(key: string, defaultValue?: T): Promise<T> {
    const scope = this.getScope();
    const state = await this.session.module.getState(scope);
    
    return state.data[key] ?? defaultValue;
  }
  
  async set(key: string, value: any): Promise<void> {
    const scope = this.getScope();
    await this.session.module.setState(scope, {
      [key]: value
    });
  }
  
  async update(updates: Record<string, any>): Promise<void> {
    const scope = this.getScope();
    const current = await this.session.module.getState(scope);
    
    await this.session.module.setState(scope, {
      ...current.data,
      ...updates
    });
  }
  
  private getScope(): StateScope {
    return {
      type: this.scopeType,
      sessionId: this.session.id,
      userId: this.session.userId
    };
  }
}

// New Runtime State Proxy (Flowise patterns)
class RuntimeStateProxy implements RuntimeState {
  constructor(private session: Session) {}
  
  async get<T = any>(key: string): Promise<T> {
    return await this.session.storage.getRuntimeState(this.session.id, key);
  }
  
  async set(key: string, value: any): Promise<void> {
    await this.session.storage.setRuntimeState(this.session.id, key, value);
  }
  
  async update(updates: Record<string, any>): Promise<void> {
    for (const [key, value] of Object.entries(updates)) {
      await this.set(key, value);
    }
  }
  
  async clear(keys?: string[]): Promise<void> {
    await this.session.storage.clearRuntimeState(this.session.id, keys);
  }
  
  async *stream(): AsyncIterableIterator<RuntimeStateChange> {
    yield* this.session.storage.streamRuntimeStateChanges(this.session.id);
  }
}

// Execution State Proxy
class ExecutionStateProxy {
  constructor(private session: Session) {}
  
  async save(executionId: string, state: ExecutionStateData): Promise<void> {
    await this.session.storage.saveExecutionState(executionId, state);
  }
  
  async load(executionId: string): Promise<ExecutionStateData | null> {
    return await this.session.storage.loadExecutionState(executionId);
  }
  
  async updateProgress(
    executionId: string,
    nodeId: string,
    status: NodeExecutionStatus,
    result?: any
  ): Promise<void> {
    await this.session.storage.updateExecutionProgress(executionId, nodeId, status, result);
  }
  
  async list(filter?: ExecutionFilter): Promise<ExecutionStateData[]> {
    return await this.session.storage.listExecutionStates({
      sessionId: this.session.id,
      ...filter
    });
  }
}

// Variable State Proxy
class VariableStateProxy implements VariableState {
  constructor(private session: Session) {}
  
  async get<T = any>(name: string, scope?: VariableScope): Promise<T> {
    const variableScope = this.resolveScope(scope);
    const variables = await this.session.storage.getVariableState(variableScope);
    return variables[name];
  }
  
  async set(name: string, value: any, scope?: VariableScope): Promise<void> {
    const variableScope = this.resolveScope(scope);
    const current = await this.session.storage.getVariableState(variableScope);
    await this.session.storage.setVariableState(variableScope, {
      ...current,
      [name]: value
    });
  }
  
  async resolve(template: string, scope?: VariableScope): Promise<string> {
    const variableScope = this.resolveScope(scope);
    return await this.session.module.resolveVariableTemplate(template, variableScope);
  }
  
  async list(scope?: VariableScope): Promise<Record<string, any>> {
    const variableScope = this.resolveScope(scope);
    return await this.session.storage.getVariableState(variableScope);
  }
  
  async clear(scope?: VariableScope): Promise<void> {
    const variableScope = this.resolveScope(scope);
    await this.session.storage.clearVariableState(variableScope);
  }
  
  private resolveScope(scope?: VariableScope): VariableScope {
    return {
      sessionId: this.session.id,
      userId: this.session.userId,
      ...scope
    };
  }
}

// Human Interaction State Proxy
class HumanInteractionStateProxy {
  constructor(private session: Session) {}
  
  async getCurrent(executionId: string): Promise<HumanInteractionState | null> {
    return await this.session.storage.getHumanInteractionState(executionId);
  }
  
  async listPending(): Promise<HumanInteraction[]> {
    return await this.session.storage.listPendingInteractions(this.session.userId);
  }
  
  async pause(
    executionId: string,
    nodeId: string,
    request: HumanInteractionRequest
  ): Promise<void> {
    await this.session.module.pauseForHuman(executionId, nodeId, request);
  }
  
  async resume(
    executionId: string,
    response: HumanInteractionResponse
  ): Promise<void> {
    await this.session.module.resumeFromHuman(executionId, response);
  }
}
```

### Step 4: Enhanced State Management
Create `modules/session-state/state-manager.ts` (with Flowise patterns):

```typescript
export class StateManager {
  private storage: IStateStorage;
  private cache: StateCache;
  private locks: LockManager;
  private streamingEnabled: boolean;
  private variableResolver: VariableResolver;
  
  constructor(
    private config: SessionStateConfig,
    storage: IStateStorage
  ) {
    this.storage = storage;
    this.cache = new StateCache(config.cache);
    this.locks = new LockManager();
    this.streamingEnabled = config.runtime?.enableStreaming ?? false;
    this.variableResolver = new VariableResolver(config.variables || {});
  }
  
  async getState(scope: StateScope): Promise<State> {
    // Check cache first
    const cached = this.cache.get(scope);
    if (cached) return cached;
    
    // Get from storage
    const data = await this.storage.getState(scope);
    
    if (!data) {
      // Return empty state
      return {
        data: {},
        metadata: {
          version: 0,
          updatedAt: new Date()
        }
      };
    }
    
    // Decrypt if needed
    const decrypted = this.config.encryption
      ? await this.decrypt(data)
      : data;
    
    // Cache and return
    const state = this.deserializeState(decrypted);
    this.cache.set(scope, state);
    
    return state;
  }
  
  async setState(
    scope: StateScope,
    updates: StateUpdate
  ): Promise<void> {
    // Acquire lock
    const lock = await this.locks.acquire(scope);
    
    try {
      // Get current state
      const current = await this.getState(scope);
      
      // Apply updates
      const newState: State = {
        data: { ...current.data, ...updates },
        metadata: {
          version: current.metadata.version + 1,
          updatedAt: new Date(),
          updatedBy: updates._updatedBy
        }
      };
      
      // Validate size
      this.validateStateSize(newState);
      
      // Serialize and encrypt
      const serialized = this.serializeState(newState);
      const encrypted = this.config.state?.encryption
        ? await this.encrypt(serialized)
        : serialized;
      
      // Save to storage
      await this.storage.setState(scope, encrypted);
      
      // Update cache
      this.cache.set(scope, newState);
      
      // Emit state change event if streaming enabled
      if (this.streamingEnabled && scope.sessionId) {
        await this.publishStateChangeEvent({
          type: 'runtime',
          sessionId: scope.sessionId,
          data: { scope, updates },
          timestamp: new Date(),
          source: 'state-manager'
        });
      }
      
    } finally {
      lock.release();
    }
  }
  
  // Enhanced methods for Flowise patterns
  async setRuntimeState(sessionId: string, key: string, value: any): Promise<void> {
    await this.storage.setRuntimeState(sessionId, key, value);
  }
  
  async getRuntimeState(sessionId: string, key?: string): Promise<any> {
    return await this.storage.getRuntimeState(sessionId, key);
  }
  
  async resolveVariableTemplate(template: string, scope: VariableScope): Promise<string> {
    const variables = await this.storage.getVariableState(scope);
    return this.variableResolver.resolve(template, variables);
  }
  
  private async publishStateChangeEvent(event: StateChangeEvent): Promise<void> {
    await this.storage.publishStateChange(event);
  }
  
  async transaction<T>(
    fn: (tx: IStateTransaction) => Promise<T>
  ): Promise<T> {
    const tx = new StateTransaction(this.storage, this.cache);
    
    try {
      const result = await fn(tx);
      await tx.commit();
      return result;
      
    } catch (error) {
      tx.rollback();
      throw error;
    }
  }
  
  private validateStateSize(state: State): void {
    if (!this.config.state?.maxSize) return;
    
    const size = JSON.stringify(state).length;
    if (size > this.config.state.maxSize) {
      throw new Error(
        `State size ${size} exceeds maximum ${this.config.state.maxSize}`
      );
    }
  }
}

// Variable Resolver for template processing
class VariableResolver {
  constructor(private config: any) {}
  
  resolve(template: string, variables: Record<string, any>): string {
    // Simple mustache-style template resolution
    return template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
      const value = this.getNestedValue(variables, key.trim());
      return value !== undefined ? String(value) : match;
    });
  }
  
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key];
    }, obj);
  }
}

// Transaction implementation
class StateTransaction implements IStateTransaction {
  private operations: Array<() => Promise<void>> = [];
  private readCache = new Map<string, any>();
  
  constructor(
    private storage: IStateStorage,
    private cache: StateCache
  ) {}
  
  async get(scope: StateScope, key: string): Promise<any> {
    const cacheKey = this.getCacheKey(scope, key);
    
    // Check transaction cache
    if (this.readCache.has(cacheKey)) {
      return this.readCache.get(cacheKey);
    }
    
    // Get from storage
    const state = await this.storage.getState(scope);
    const value = state?.data[key];
    
    // Cache for transaction
    this.readCache.set(cacheKey, value);
    
    return value;
  }
  
  set(scope: StateScope, key: string, value: any): void {
    this.operations.push(async () => {
      const current = await this.storage.getState(scope) || {
        data: {},
        metadata: { version: 0, updatedAt: new Date() }
      };
      
      current.data[key] = value;
      current.metadata.version++;
      current.metadata.updatedAt = new Date();
      
      await this.storage.setState(scope, current);
    });
    
    // Update transaction cache
    const cacheKey = this.getCacheKey(scope, key);
    this.readCache.set(cacheKey, value);
  }
  
  delete(scope: StateScope, key: string): void {
    this.set(scope, key, undefined);
  }
  
  async commit(): Promise<void> {
    // Execute all operations
    for (const op of this.operations) {
      await op();
    }
    
    // Clear caches
    this.readCache.clear();
    this.operations = [];
  }
  
  rollback(): void {
    this.operations = [];
    this.readCache.clear();
  }
  
  private getCacheKey(scope: StateScope, key: string): string {
    return `${JSON.stringify(scope)}:${key}`;
  }
}
```

### Step 5: Memory Integration
Create `modules/session-state/memory-manager.ts`:

```typescript
export class MemoryManager {
  constructor(
    private config: MemoryConfig,
    private storage: IStateStorage
  ) {}
  
  async addMemory(scope: MemoryScope, memory: Memory): Promise<void> {
    const key = this.getMemoryKey(scope);
    const memories = await this.getMemories(key);
    
    // Add new memory
    memories.push({
      ...memory,
      id: generateId('mem'),
      timestamp: new Date()
    });
    
    // Trim if needed
    if (this.config.maxItems && memories.length > this.config.maxItems) {
      memories.splice(0, memories.length - this.config.maxItems);
    }
    
    // Save back
    await this.storage.setState(
      { type: 'memory', ...scope },
      { memories }
    );
  }
  
  async queryMemory(
    scope: MemoryScope,
    query: MemoryQuery
  ): Promise<Memory[]> {
    const key = this.getMemoryKey(scope);
    const memories = await this.getMemories(key);
    
    // Filter by query
    let filtered = memories;
    
    if (query.type) {
      filtered = filtered.filter(m => m.type === query.type);
    }
    
    if (query.after) {
      filtered = filtered.filter(m => 
        m.timestamp > query.after
      );
    }
    
    if (query.tags?.length) {
      filtered = filtered.filter(m =>
        query.tags!.some(tag => m.tags?.includes(tag))
      );
    }
    
    // Sort and limit
    filtered.sort((a, b) => 
      b.timestamp.getTime() - a.timestamp.getTime()
    );
    
    if (query.limit) {
      filtered = filtered.slice(0, query.limit);
    }
    
    return filtered;
  }
  
  private async getMemories(key: string): Promise<Memory[]> {
    const state = await this.storage.getState({
      type: 'memory',
      namespace: key
    });
    
    return state?.data.memories || [];
  }
  
  private getMemoryKey(scope: MemoryScope): string {
    if (scope.sessionId) {
      return `session:${scope.sessionId}`;
    }
    if (scope.userId) {
      return `user:${scope.userId}`;
    }
    if (scope.agentId) {
      return `agent:${scope.agentId}`;
    }
    return 'global';
  }
}
```

### Step 6: Module Implementation
Create `modules/session-state/index.ts`:

```typescript
export class SessionStateModule implements ISessionStateModule {
  readonly name = 'session-state';
  readonly version = '1.0.0';
  
  private storage: IStateStorage;
  private stateManager: StateManager;
  private memoryManager: MemoryManager;
  private sessionCache: LRUCache<string, Session>;
  private cleanupInterval?: NodeJS.Timer;
  
  async initialize(config: SessionStateConfig): Promise<void> {
    // Initialize storage backend
    this.storage = await this.createStorage(config.storage);
    
    // Initialize managers
    this.stateManager = new StateManager(config.state, this.storage);
    this.memoryManager = new MemoryManager(config.memory, this.storage);
    
    // Initialize session cache
    this.sessionCache = new LRUCache({
      max: 1000,
      ttl: 5 * 60 * 1000, // 5 minutes
      updateAgeOnGet: true
    });
    
    // Start cleanup interval
    if (config.session.defaultTTL) {
      this.cleanupInterval = setInterval(
        () => this.cleanup(),
        60000 // Every minute
      );
    }
  }
  
  async createSession(options?: CreateSessionOptions): Promise<ISession> {
    const sessionData: SessionData = {
      id: options?.id || generateId('ses'),
      userId: options?.userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      expiresAt: options?.ttl 
        ? new Date(Date.now() + options.ttl * 1000)
        : undefined,
      metadata: options?.metadata || {},
      tags: options?.tags || []
    };
    
    // Validate max sessions per user
    if (sessionData.userId && this.config.session.maxSessions) {
      const userSessions = await this.listSessions({
        userId: sessionData.userId,
        active: true
      });
      
      if (userSessions.length >= this.config.session.maxSessions) {
        // Remove oldest session
        const oldest = userSessions.sort((a, b) => 
          a.createdAt.getTime() - b.createdAt.getTime()
        )[0];
        
        await this.deleteSession(oldest.id);
      }
    }
    
    // Save to storage
    await this.storage.createSession(sessionData);
    
    // Create session object
    const session = new Session(sessionData, this);
    
    // Cache
    this.sessionCache.set(session.id, session);
    
    return session;
  }
  
  async getSession(sessionId: string): Promise<ISession | null> {
    // Check cache
    const cached = this.sessionCache.get(sessionId);
    if (cached) {
      // Extend TTL if configured
      if (this.config.session.extendOnAccess && cached.expiresAt) {
        await cached.extend(this.config.session.defaultTTL!);
      }
      return cached;
    }
    
    // Get from storage
    const data = await this.storage.getSession(sessionId);
    if (!data) return null;
    
    // Check if expired
    if (data.expiresAt && data.expiresAt < new Date()) {
      await this.deleteSession(sessionId);
      return null;
    }
    
    // Create session object
    const session = new Session(data, this);
    
    // Cache
    this.sessionCache.set(sessionId, session);
    
    return session;
  }
  
  // Delegate to state manager
  async getState(scope: StateScope): Promise<State> {
    return this.stateManager.getState(scope);
  }
  
  async setState(scope: StateScope, updates: StateUpdate): Promise<void> {
    return this.stateManager.setState(scope, updates);
  }
  
  async transaction<T>(
    fn: (tx: IStateTransaction) => Promise<T>
  ): Promise<T> {
    return this.stateManager.transaction(fn);
  }
  
  // Delegate to memory manager
  async addMemory(scope: MemoryScope, memory: Memory): Promise<void> {
    return this.memoryManager.addMemory(scope, memory);
  }
  
  async queryMemory(
    scope: MemoryScope,
    query: MemoryQuery
  ): Promise<Memory[]> {
    return this.memoryManager.queryMemory(scope, query);
  }
  
  async health(): Promise<HealthStatus> {
    try {
      // Test storage connection
      await this.storage.size();
      
      return {
        status: 'healthy',
        message: 'Session state module operational',
        details: {
          storage: 'connected',
          cachedSessions: this.sessionCache.size
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
  
  private async cleanup(): Promise<void> {
    // Clean up expired sessions
    const sessions = await this.storage.listSessions({
      expired: true
    });
    
    for (const session of sessions) {
      await this.deleteSession(session.id);
    }
    
    // Clean up orphaned temp states
    await this.storage.cleanup();
  }
}
```

### Step 7: Module Factory
Create `modules/session-state/factory.ts`:

```typescript
export function createSessionStateModule(
  config: SessionStateConfig
): ISessionStateModule {
  const module = new SessionStateModule();
  
  return wrapModule(module, {
    name: 'session-state',
    monitoring: {
      trackLatency: true,
      trackErrors: true,
      trackMethodCalls: [
        'createSession',
        'getState',
        'setState',
        'transaction'
      ]
    },
    caching: {
      methods: ['getSession', 'getState'],
      ttl: 60000
    }
  });
}
```

## Testing Requirements

### 1. Unit Tests
- Session lifecycle
- State scoping
- Transaction behavior
- Memory operations
- Cache behavior

### 2. Concurrency Tests
- Concurrent state updates
- Transaction conflicts
- Lock behavior
- Race conditions

### 3. Performance Tests
- State operation latency
- Memory usage
- Cache effectiveness
- Storage backend performance

### 4. Integration Tests
- Redis integration
- Cross-module state sharing
- Session expiry
- Checkpointing

## Post-Implementation Validation

### 1. Enhanced Functionality Checklist
- [ ] Sessions created and managed properly
- [ ] State scoping works correctly
- [ ] Transactions provide consistency
- [ ] Memory integration functional
- [ ] Persistence and recovery work
- [ ] Concurrent access handled safely
- [ ] Runtime state persistence working (Flowise patterns)
- [ ] Execution state tracking and resume capability
- [ ] Human-in-the-loop interactions functional
- [ ] Variable state management and templating
- [ ] Streaming state changes working
- [ ] Integration with Enhanced Memory module
- [ ] Integration with Execution Manager module

### 2. Enhanced Performance Requirements
- [ ] State operations < 10ms
- [ ] Runtime state operations < 5ms
- [ ] Efficient caching with invalidation
- [ ] No memory leaks during long-running executions
- [ ] Scales to 10k+ sessions with streaming
- [ ] Execution state resume < 100ms
- [ ] Variable resolution < 1ms per template
- [ ] Human interaction response < 200ms

### 3. Enhanced Reliability Requirements
- [ ] ACID-like guarantees for execution state
- [ ] No data loss during execution pause/resume
- [ ] Graceful failure handling with human fallback
- [ ] Proper cleanup of runtime and execution state
- [ ] Stream connection resilience
- [ ] Variable state consistency across nodes
- [ ] Human interaction timeout handling

## Common Pitfalls to Avoid

1. **Don't ignore concurrent access** - Use proper locking for runtime state
2. **Don't cache without invalidation** - Keep cache consistent across streaming updates
3. **Don't forget cleanup** - Prevent memory/storage leaks from execution state
4. **Don't mix scopes** - Keep clear boundaries between session/execution/variable state
5. **Don't skip validation** - Enforce size limits on runtime state
6. **Don't forget encryption** - Protect sensitive state and human interaction data
7. **Don't ignore streaming failures** - Handle stream disconnections gracefully
8. **Don't block on human interactions** - Use proper timeout and fallback mechanisms
9. **Don't lose execution context** - Ensure resume capability preserves all state
10. **Don't leak variables across executions** - Properly scope variable state

## Final Validation Questions

1. Is state access truly centralized across all state types?
2. Are concurrent operations safe for runtime, execution, and variable state?
3. Does cleanup happen automatically for all state types?
4. Is the module storage-agnostic with streaming support?
5. Are transactions reliable across execution state changes?
6. Is performance acceptable for real-time streaming scenarios?
7. Do runtime state changes stream correctly to connected clients?
8. Can executions resume reliably from any pause point?
9. Do human interactions integrate smoothly with execution flow?
10. Is variable templating fast and accurate?
11. Are state change events properly published and consumed?
12. Does the enhanced memory integration work correctly?

## Next Steps
After completing the enhanced Session & State module with Flowise pattern integration, the LLM agent needs to be updated for human-in-the-loop integration (next todo item). The enhanced session state module provides the foundation for:

1. **Runtime state persistence** during agent execution
2. **Execution state tracking** with resume capability  
3. **Human interaction management** for approval workflows
4. **Variable state management** for template resolution
5. **Streaming state updates** for real-time progress

The LLM agent can now leverage these capabilities for sophisticated interactive workflows with full state preservation and resume functionality.