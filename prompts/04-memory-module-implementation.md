# Memory Module Implementation Prompt (Enhanced with Flowise Patterns)

## Context
You are implementing the Enhanced Memory Module - a comprehensive system for managing different types of memory in AgentHub with integrated Flowise patterns. This module handles short-term working memory, long-term persistent memory, vector embeddings for semantic search, runtime state management, conversational memory buffers, and multiple memory strategies. It integrates with the Session & State module and supports execution state persistence for workflow resume capabilities.

## Pre-Implementation Requirements

### 1. Documentation Review
You MUST read:
1. Vector database documentation (choose one):
   - Pinecone: https://docs.pinecone.io/
   - Weaviate: https://weaviate.io/developers/weaviate
   - Qdrant: https://qdrant.tech/documentation/
   - ChromaDB: https://docs.trychroma.com/
2. Memory patterns in AI systems
3. Embedding model best practices
4. Review architecture: `/Users/sakshams/tekai/TekContextEngine/agenthub-architecture-revised.md`
5. Session & State module integration: `/Users/sakshams/tekai/TekContextEngine/prompts/03-session-state-module-implementation.md`

### 2. Understand Enhanced Module Requirements
This Enhanced Memory Module must:
- Manage working memory (conversation context) - existing
- Store and retrieve long-term memories - existing
- Generate and search vector embeddings - existing
- Support multiple storage backends - existing
- Integrate with Session & State module - existing
- Provide memory summarization capabilities - existing
- **NEW: Runtime state persistence (Flowise pattern)**
- **NEW: Multiple memory buffer types (window, summary, conversation)**
- **NEW: Conversational memory management**
- **NEW: Execution state tracking and persistence**
- **NEW: Human interaction history**
- **NEW: Variable templating and resolution**
- **NEW: Form data persistence**
- **NEW: Agent reasoning chains**

## Implementation Steps

### Step 1: Module Interface and Types
Create `modules/memory/types.ts`:

```typescript
export interface IMemoryModule {
  name: string;
  version: string;
  
  // Lifecycle
  initialize(config: MemoryConfig): Promise<void>;
  health(): Promise<HealthStatus>;
  shutdown(): Promise<void>;
  
  // Working Memory (Short-term)
  addWorkingMemory(item: MemoryItem): Promise<void>;
  getWorkingMemory(options?: WorkingMemoryOptions): Promise<MemoryItem[]>;
  clearWorkingMemory(sessionId?: string): Promise<void>;
  summarizeWorkingMemory(sessionId: string): Promise<MemorySummary>;
  
  // NEW: Flowise-style conversational memory
  addConversationalMemory(sessionId: string, messages: IMessage[]): Promise<void>;
  getConversationalMemory(sessionId: string, limit?: number): Promise<IMessage[]>;
  
  // NEW: Runtime state management (Flowise pattern)
  setRuntimeState(sessionId: string, state: ICommonObject): Promise<void>;
  getRuntimeState(sessionId: string): Promise<ICommonObject>;
  updateRuntimeState(sessionId: string, updates: StateUpdate[]): Promise<void>;
  
  // NEW: Form data persistence
  setFormData(sessionId: string, form: Record<string, any>): Promise<void>;
  getFormData(sessionId: string): Promise<Record<string, any>>;
  
  // NEW: Memory buffer management
  createMemoryBuffer(type: MemoryBufferType, config?: MemoryBufferConfig): IMemoryBuffer;
  getMemoryBuffer(sessionId: string, type: MemoryBufferType): Promise<IMemoryBuffer>;
  
  // Long-term Memory
  store(memory: LongTermMemory): Promise<string>;
  retrieve(query: MemoryQuery): Promise<MemorySearchResult[]>;
  update(memoryId: string, updates: Partial<LongTermMemory>): Promise<void>;
  delete(memoryId: string): Promise<void>;
  
  // Vector Operations
  embed(text: string | string[]): Promise<Embedding[]>;
  search(query: VectorSearchQuery): Promise<VectorSearchResult[]>;
  
  // Memory Management
  consolidate(sessionId: string): Promise<ConsolidationResult>;
  export(options: ExportOptions): Promise<MemoryExport>;
  import(data: MemoryExport): Promise<ImportResult>;
}

export interface MemoryConfig {
  // Storage backends
  workingMemory: {
    type: 'memory' | 'redis' | 'session-state';
    maxItems?: number;          // Max items in working memory
    ttl?: number;              // Time to live in seconds
    compressionThreshold?: number; // Compress after N items
    
    // NEW: Flowise memory patterns
    bufferTypes?: MemoryBufferType[];  // Enabled buffer types
    windowSize?: number;        // Window buffer size
    summaryThreshold?: number;  // Summary buffer threshold
    conversationLimit?: number; // Conversation buffer limit
  };
  
  longTermMemory: {
    type: 'postgres' | 'mongodb' | 'dynamodb';
    connectionString?: string;
    config?: any;
  };
  
  vectorStore: {
    type: 'pinecone' | 'weaviate' | 'qdrant' | 'chroma' | 'memory';
    config: VectorStoreConfig;
  };
  
  // Embedding configuration
  embedding: {
    provider: 'openai' | 'cohere' | 'huggingface' | 'litellm';
    model?: string;
    dimensions?: number;
    batchSize?: number;
  };
  
  // Memory processing (enhanced)
  processing: {
    summarizationModel?: string;
    summarizationThreshold?: number;
    consolidationInterval?: number;
    importanceScoring?: boolean;
    
    // NEW: Flowise patterns
    runtimeStateEnabled?: boolean;   // Enable runtime state tracking
    formDataEnabled?: boolean;       // Enable form data persistence
    reasoningChains?: boolean;       // Track agent reasoning
    humanInteractionHistory?: boolean; // Track human interactions
    variableResolution?: boolean;    // Variable templating support
  };
}

export interface MemoryItem {
  id?: string;
  sessionId: string;
  timestamp: Date;
  type: 'user' | 'assistant' | 'system' | 'tool' | 'observation' | 'human' | 'reasoning';
  content: string;
  metadata?: {
    tokens?: number;
    importance?: number;
    tags?: string[];
    references?: string[];
    
    // NEW: Enhanced metadata
    agentId?: string;           // Agent that created this memory
    executionId?: string;       // Execution context
    nodeId?: string;            // Workflow node context
    toolCall?: string;          // Tool that was called
    reasoning?: string;         // Agent reasoning chain
    humanInteraction?: boolean; // Human interaction marker
    formData?: Record<string, any>; // Associated form data
  };
}

// NEW: Flowise-style message interface
export interface IMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  metadata?: {
    sourceDocuments?: any[];
    usedTools?: any[];
    artifacts?: any[];
    agentReasoning?: string;
    timestamp?: string;
  };
}

// NEW: Runtime state management
export interface ICommonObject {
  [key: string]: any;
}

export interface StateUpdate {
  key: string;
  value: any;
  operation: 'set' | 'append' | 'merge' | 'delete';
}

// NEW: Memory buffer types
export type MemoryBufferType = 
  | 'window'       // Fixed-size sliding window
  | 'summary'      // Summarized historical context
  | 'conversation' // Full conversation history
  | 'working'      // Current working context
  | 'episodic';    // Episode-based memory

export interface IMemoryBuffer {
  readonly type: MemoryBufferType;
  readonly sessionId: string;
  readonly maxSize: number;
  
  add(message: IMessage): Promise<void>;
  getMessages(): Promise<IMessage[]>;
  clear(): Promise<void>;
  summarize?(): Promise<string>;
  
  // Buffer-specific methods
  getContext?(): Promise<string>;
  trim?(): Promise<void>;
}

export interface MemoryBufferConfig {
  maxSize?: number;
  summarizationThreshold?: number;
  compressionEnabled?: boolean;
  summaryModel?: string;
}

export interface LongTermMemory {
  id?: string;
  userId?: string;
  sessionId?: string;
  content: string;
  summary?: string;
  embedding?: number[];
  
  metadata: {
    type: 'fact' | 'experience' | 'preference' | 'context' | 'skill';
    importance: number;      // 0-1 score
    confidence: number;      // 0-1 score
    source?: string;
    tags?: string[];
    relations?: MemoryRelation[];
  };
  
  timestamps: {
    created: Date;
    lastAccessed: Date;
    lastModified: Date;
    expiresAt?: Date;
  };
}

export interface VectorSearchQuery {
  vector?: number[];
  text?: string;
  filter?: Record<string, any>;
  limit?: number;
  includeMetadata?: boolean;
  minScore?: number;
}

export interface MemorySummary {
  sessionId: string;
  summary: string;
  keyPoints: string[];
  topics: string[];
  sentiment?: 'positive' | 'neutral' | 'negative';
  metadata: {
    itemCount: number;
    tokenCount: number;
    timespan: { start: Date; end: Date };
    
    // NEW: Enhanced metadata
    executionCount?: number;     // Number of executions in session
    agentInteractions?: number;  // Number of agent interactions
    humanInteractions?: number;  // Number of human interactions
    toolUsage?: Record<string, number>; // Tool usage statistics
    runtimeState?: ICommonObject; // Current runtime state
    formData?: Record<string, any>; // Current form data
  };
}
```

### Step 2: Working Memory Implementation
Create `modules/memory/working-memory.ts`:

```typescript
export class WorkingMemory {
  private storage: Map<string, MemoryItem[]> = new Map();
  private runtimeState: Map<string, ICommonObject> = new Map();
  private formData: Map<string, Record<string, any>> = new Map();
  private conversationalMemory: Map<string, IMessage[]> = new Map();
  private memoryBuffers: Map<string, IMemoryBuffer> = new Map();
  
  private maxItems: number;
  private compressionThreshold: number;
  private windowSize: number;
  private conversationLimit: number;
  
  constructor(config: WorkingMemoryConfig) {
    this.maxItems = config.maxItems || 50;
    this.compressionThreshold = config.compressionThreshold || 30;
    this.windowSize = config.windowSize || 20;
    this.conversationLimit = config.conversationLimit || 100;
  }
  
  async add(item: MemoryItem): Promise<void> {
    const sessionMemory = this.storage.get(item.sessionId) || [];
    
    // Add item with generated ID
    item.id = item.id || generateId('mem');
    sessionMemory.push(item);
    
    // Update runtime state if provided in metadata
    if (item.metadata?.formData) {
      await this.updateFormData(item.sessionId, item.metadata.formData);
    }
    
    // Check if compression needed
    if (sessionMemory.length > this.compressionThreshold) {
      await this.compress(item.sessionId);
    }
    
    // Enforce max items limit
    if (sessionMemory.length > this.maxItems) {
      // Remove oldest items, keeping important ones
      const sorted = this.sortByImportance(sessionMemory);
      const toKeep = sorted.slice(0, this.maxItems);
      this.storage.set(item.sessionId, toKeep);
    } else {
      this.storage.set(item.sessionId, sessionMemory);
    }
    
    // Update memory buffers if enabled
    await this.updateMemoryBuffers(item.sessionId, item);
  }
  
  // NEW: Runtime state management
  async setRuntimeState(sessionId: string, state: ICommonObject): Promise<void> {
    this.runtimeState.set(sessionId, { ...state });
  }
  
  async getRuntimeState(sessionId: string): Promise<ICommonObject> {
    return this.runtimeState.get(sessionId) || {};
  }
  
  async updateRuntimeState(sessionId: string, updates: StateUpdate[]): Promise<void> {
    const currentState = this.runtimeState.get(sessionId) || {};
    const newState = { ...currentState };
    
    for (const update of updates) {
      switch (update.operation) {
        case 'set':
          newState[update.key] = update.value;
          break;
        case 'append':
          if (Array.isArray(newState[update.key])) {
            newState[update.key].push(update.value);
          } else {
            newState[update.key] = [update.value];
          }
          break;
        case 'merge':
          if (typeof newState[update.key] === 'object') {
            newState[update.key] = { ...newState[update.key], ...update.value };
          } else {
            newState[update.key] = update.value;
          }
          break;
        case 'delete':
          delete newState[update.key];
          break;
      }
    }
    
    this.runtimeState.set(sessionId, newState);
  }
  
  // NEW: Form data management
  async setFormData(sessionId: string, form: Record<string, any>): Promise<void> {
    this.formData.set(sessionId, { ...form });
  }
  
  async getFormData(sessionId: string): Promise<Record<string, any>> {
    return this.formData.get(sessionId) || {};
  }
  
  private async updateFormData(sessionId: string, updates: Record<string, any>): Promise<void> {
    const currentForm = this.formData.get(sessionId) || {};
    const newForm = { ...currentForm, ...updates };
    this.formData.set(sessionId, newForm);
  }
  
  // NEW: Conversational memory
  async addConversationalMemory(sessionId: string, messages: IMessage[]): Promise<void> {
    const existing = this.conversationalMemory.get(sessionId) || [];
    const updated = [...existing, ...messages];
    
    // Trim if exceeds limit
    if (updated.length > this.conversationLimit) {
      const trimmed = updated.slice(-this.conversationLimit);
      this.conversationalMemory.set(sessionId, trimmed);
    } else {
      this.conversationalMemory.set(sessionId, updated);
    }
  }
  
  async getConversationalMemory(sessionId: string, limit?: number): Promise<IMessage[]> {
    const messages = this.conversationalMemory.get(sessionId) || [];
    
    if (limit) {
      return messages.slice(-limit);
    }
    
    return messages;
  }
  
  // NEW: Memory buffer management
  private async updateMemoryBuffers(sessionId: string, item: MemoryItem): Promise<void> {
    // Convert MemoryItem to IMessage for buffer compatibility
    const message: IMessage = {
      role: item.type === 'user' ? 'user' : 
            item.type === 'assistant' ? 'assistant' : 
            item.type === 'system' ? 'system' : 'tool',
      content: item.content,
      metadata: {
        timestamp: item.timestamp.toISOString(),
        agentReasoning: item.metadata?.reasoning,
        sourceDocuments: item.metadata?.references,
        usedTools: item.metadata?.toolCall ? [item.metadata.toolCall] : undefined
      }
    };
    
    // Update each buffer type
    for (const [bufferKey, buffer] of this.memoryBuffers) {
      if (bufferKey.startsWith(sessionId)) {
        await buffer.add(message);
      }
    }
  }
  
  async get(options: WorkingMemoryOptions): Promise<MemoryItem[]> {
    const { sessionId, limit, types, since } = options;
    
    if (!sessionId) {
      throw new Error('SessionId required for working memory access');
    }
    
    let memories = this.storage.get(sessionId) || [];
    
    // Apply filters
    if (types?.length) {
      memories = memories.filter(m => types.includes(m.type));
    }
    
    if (since) {
      memories = memories.filter(m => m.timestamp > since);
    }
    
    // Sort by timestamp (newest first)
    memories.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    // Apply limit
    if (limit) {
      memories = memories.slice(0, limit);
    }
    
    return memories;
  }
  
  private async compress(sessionId: string): Promise<void> {
    const memories = this.storage.get(sessionId) || [];
    
    // Group consecutive messages by type
    const groups = this.groupConsecutiveMessages(memories);
    
    // Compress each group
    const compressed: MemoryItem[] = [];
    
    for (const group of groups) {
      if (group.length > 3 && group[0].type === 'assistant') {
        // Summarize long assistant responses
        const summary = await this.summarizeGroup(group);
        compressed.push({
          ...group[0],
          content: summary,
          metadata: {
            ...group[0].metadata,
            compressed: true,
            originalCount: group.length
          }
        });
      } else {
        // Keep as is
        compressed.push(...group);
      }
    }
    
    this.storage.set(sessionId, compressed);
  }
  
  private sortByImportance(memories: MemoryItem[]): MemoryItem[] {
    return memories.sort((a, b) => {
      // Keep system and tool messages
      if (a.type === 'system' || a.type === 'tool') return -1;
      if (b.type === 'system' || b.type === 'tool') return 1;
      
      // Then by importance score
      const aImportance = a.metadata?.importance || 0.5;
      const bImportance = b.metadata?.importance || 0.5;
      
      return bImportance - aImportance;
    });
  }
}
```

### Step 3: Vector Store Abstraction
Create `modules/memory/vector-store/`:

**Interface**:
```typescript
export interface IVectorStore {
  initialize(config: VectorStoreConfig): Promise<void>;
  
  // Index operations
  createIndex(name: string, dimension: number): Promise<void>;
  deleteIndex(name: string): Promise<void>;
  
  // Vector operations
  upsert(vectors: VectorRecord[]): Promise<void>;
  search(query: VectorSearchQuery): Promise<VectorSearchResult[]>;
  delete(ids: string[]): Promise<void>;
  
  // Maintenance
  optimize(): Promise<void>;
  stats(): Promise<VectorStoreStats>;
}

export interface VectorRecord {
  id: string;
  vector: number[];
  metadata?: Record<string, any>;
}
```

**Pinecone Implementation**:
```typescript
import { Pinecone } from '@pinecone-database/pinecone';

export class PineconeVectorStore implements IVectorStore {
  private client: Pinecone;
  private index: any;
  
  async initialize(config: PineconeVectorStoreConfig): Promise<void> {
    this.client = new Pinecone({
      apiKey: config.apiKey,
      environment: config.environment
    });
    
    this.index = this.client.index(config.indexName);
  }
  
  async upsert(vectors: VectorRecord[]): Promise<void> {
    // Batch upsert for efficiency
    const batchSize = 100;
    
    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize);
      
      await this.index.upsert(
        batch.map(v => ({
          id: v.id,
          values: v.vector,
          metadata: v.metadata
        }))
      );
    }
  }
  
  async search(query: VectorSearchQuery): Promise<VectorSearchResult[]> {
    const response = await this.index.query({
      vector: query.vector,
      topK: query.limit || 10,
      filter: query.filter,
      includeMetadata: query.includeMetadata !== false
    });
    
    return response.matches.map(match => ({
      id: match.id,
      score: match.score,
      metadata: match.metadata
    }));
  }
}
```

### Step 4: Embedding Service
Create `modules/memory/embedding.ts`:

```typescript
export class EmbeddingService {
  private provider: IEmbeddingProvider;
  private cache: EmbeddingCache;
  
  constructor(config: EmbeddingConfig) {
    this.provider = this.createProvider(config);
    this.cache = new EmbeddingCache();
  }
  
  async embed(texts: string | string[]): Promise<Embedding[]> {
    const inputArray = Array.isArray(texts) ? texts : [texts];
    const results: Embedding[] = [];
    
    // Check cache first
    const toEmbed: string[] = [];
    const cacheIndices: number[] = [];
    
    for (let i = 0; i < inputArray.length; i++) {
      const cached = this.cache.get(inputArray[i]);
      if (cached) {
        results[i] = cached;
      } else {
        toEmbed.push(inputArray[i]);
        cacheIndices.push(i);
      }
    }
    
    // Embed uncached texts
    if (toEmbed.length > 0) {
      const embeddings = await this.provider.embed(toEmbed);
      
      // Store in cache and results
      for (let i = 0; i < embeddings.length; i++) {
        const originalIndex = cacheIndices[i];
        const text = toEmbed[i];
        const embedding = embeddings[i];
        
        this.cache.set(text, embedding);
        results[originalIndex] = embedding;
      }
    }
    
    return results;
  }
  
  private createProvider(config: EmbeddingConfig): IEmbeddingProvider {
    switch (config.provider) {
      case 'openai':
        return new OpenAIEmbeddingProvider(config);
      
      case 'litellm':
        return new LiteLLMEmbeddingProvider(config);
      
      default:
        throw new Error(`Unknown embedding provider: ${config.provider}`);
    }
  }
}

// LiteLLM integration for embeddings
class LiteLLMEmbeddingProvider implements IEmbeddingProvider {
  constructor(private config: EmbeddingConfig) {}
  
  async embed(texts: string[]): Promise<Embedding[]> {
    // Get LiteLLM module
    const litellm = AgentHub.getInstance()
      .getModule<ILiteLLMModule>('litellm');
    
    // Use LiteLLM's embed method
    const response = await litellm.embed({
      input: texts,
      model: this.config.model || 'text-embedding-ada-002'
    });
    
    return response.embeddings.map((vector, idx) => ({
      text: texts[idx],
      vector,
      model: response.model
    }));
  }
}
```

### Step 5: Long-term Memory Store
Create `modules/memory/long-term-store.ts`:

```typescript
export class LongTermMemoryStore {
  private db: IDatabase;
  private vectorStore: IVectorStore;
  private embedder: EmbeddingService;
  
  constructor(
    db: IDatabase,
    vectorStore: IVectorStore,
    embedder: EmbeddingService
  ) {
    this.db = db;
    this.vectorStore = vectorStore;
    this.embedder = embedder;
  }
  
  async store(memory: LongTermMemory): Promise<string> {
    // Generate ID
    memory.id = memory.id || generateId('ltm');
    
    // Generate embedding if not provided
    if (!memory.embedding) {
      const [embedding] = await this.embedder.embed(memory.content);
      memory.embedding = embedding.vector;
    }
    
    // Store in database
    await this.db.insert('memories', memory);
    
    // Store in vector database
    await this.vectorStore.upsert([{
      id: memory.id,
      vector: memory.embedding,
      metadata: {
        userId: memory.userId,
        sessionId: memory.sessionId,
        type: memory.metadata.type,
        importance: memory.metadata.importance,
        tags: memory.metadata.tags
      }
    }]);
    
    return memory.id;
  }
  
  async retrieve(query: MemoryQuery): Promise<MemorySearchResult[]> {
    // If text query, convert to vector
    let searchVector: number[] | undefined;
    
    if (query.text) {
      const [embedding] = await this.embedder.embed(query.text);
      searchVector = embedding.vector;
    } else if (query.vector) {
      searchVector = query.vector;
    }
    
    // Search vector store
    const vectorResults = searchVector
      ? await this.vectorStore.search({
          vector: searchVector,
          filter: this.buildVectorFilter(query),
          limit: query.limit || 10,
          minScore: query.minScore || 0.7
        })
      : [];
    
    // Fetch full memories from database
    const memoryIds = vectorResults.map(r => r.id);
    const memories = await this.db.findByIds('memories', memoryIds);
    
    // Combine results
    return vectorResults.map(vr => {
      const memory = memories.find(m => m.id === vr.id);
      return {
        memory,
        score: vr.score,
        distance: 1 - vr.score // Convert similarity to distance
      };
    });
  }
  
  private buildVectorFilter(query: MemoryQuery): Record<string, any> {
    const filter: Record<string, any> = {};
    
    if (query.userId) {
      filter.userId = query.userId;
    }
    
    if (query.sessionId) {
      filter.sessionId = query.sessionId;
    }
    
    if (query.types?.length) {
      filter.type = { $in: query.types };
    }
    
    if (query.tags?.length) {
      filter.tags = { $overlap: query.tags };
    }
    
    if (query.minImportance !== undefined) {
      filter.importance = { $gte: query.minImportance };
    }
    
    return filter;
  }
}
```

### Step 6: Memory Consolidation
Create `modules/memory/consolidation.ts`:

```typescript
export class MemoryConsolidator {
  constructor(
    private workingMemory: WorkingMemory,
    private longTermStore: LongTermMemoryStore,
    private config: ConsolidationConfig
  ) {}
  
  async consolidate(sessionId: string): Promise<ConsolidationResult> {
    // Get working memory
    const memories = await this.workingMemory.get({ sessionId });
    
    if (memories.length < this.config.minItems) {
      return { 
        status: 'skipped', 
        reason: 'Insufficient memories' 
      };
    }
    
    // Analyze and extract key information
    const analysis = await this.analyzeMemories(memories);
    
    // Create long-term memories
    const created: string[] = [];
    
    // Store facts
    for (const fact of analysis.facts) {
      const id = await this.longTermStore.store({
        content: fact.content,
        summary: fact.summary,
        metadata: {
          type: 'fact',
          importance: fact.importance,
          confidence: fact.confidence,
          tags: fact.tags,
          source: sessionId
        },
        timestamps: {
          created: new Date(),
          lastAccessed: new Date(),
          lastModified: new Date()
        }
      });
      
      created.push(id);
    }
    
    // Store experiences
    for (const experience of analysis.experiences) {
      const id = await this.longTermStore.store({
        content: experience.content,
        summary: experience.summary,
        metadata: {
          type: 'experience',
          importance: experience.importance,
          confidence: 0.9,
          tags: experience.tags,
          source: sessionId
        },
        timestamps: {
          created: new Date(),
          lastAccessed: new Date(),
          lastModified: new Date()
        }
      });
      
      created.push(id);
    }
    
    // Clear consolidated working memory if configured
    if (this.config.clearAfterConsolidation) {
      await this.workingMemory.clear(sessionId);
    }
    
    return {
      status: 'success',
      memoriesCreated: created.length,
      memoriesProcessed: memories.length,
      facts: analysis.facts.length,
      experiences: analysis.experiences.length
    };
  }
  
  private async analyzeMemories(memories: MemoryItem[]): Promise<MemoryAnalysis> {
    // Use LLM to analyze memories
    const litellm = AgentHub.getInstance()
      .getModule<ILiteLLMModule>('litellm');
    
    const prompt = this.buildAnalysisPrompt(memories);
    
    const response = await litellm.complete({
      messages: [{
        role: 'system',
        content: 'You are a memory analysis system. Extract facts, experiences, and key information from conversations.'
      }, {
        role: 'user',
        content: prompt
      }],
      model: this.config.analysisModel || 'gpt-3.5-turbo',
      response_format: { type: 'json_object' }
    });
    
    return JSON.parse(response.choices[0].message.content);
  }
}
```

### Step 7: Module Implementation
Create `modules/memory/index.ts`:

```typescript
export class MemoryModule implements IMemoryModule {
  readonly name = 'memory';
  readonly version = '1.0.0';
  
  private workingMemory: WorkingMemory;
  private longTermStore: LongTermMemoryStore;
  private vectorStore: IVectorStore;
  private embedder: EmbeddingService;
  private consolidator: MemoryConsolidator;
  private initialized = false;
  
  async initialize(config: MemoryConfig): Promise<void> {
    // Initialize working memory
    this.workingMemory = await this.createWorkingMemory(config.workingMemory);
    
    // Initialize vector store
    this.vectorStore = await this.createVectorStore(config.vectorStore);
    
    // Initialize embedding service
    this.embedder = new EmbeddingService(config.embedding);
    
    // Initialize long-term store
    const db = await this.createDatabase(config.longTermMemory);
    this.longTermStore = new LongTermMemoryStore(
      db,
      this.vectorStore,
      this.embedder
    );
    
    // Initialize consolidator
    this.consolidator = new MemoryConsolidator(
      this.workingMemory,
      this.longTermStore,
      config.processing
    );
    
    this.initialized = true;
  }
  
  async addWorkingMemory(item: MemoryItem): Promise<void> {
    this.ensureInitialized();
    
    // Calculate importance if not provided
    if (!item.metadata?.importance) {
      item.metadata = {
        ...item.metadata,
        importance: await this.calculateImportance(item)
      };
    }
    
    await this.workingMemory.add(item);
    
    // Trigger consolidation if threshold reached
    const memories = await this.workingMemory.get({ 
      sessionId: item.sessionId 
    });
    
    if (memories.length >= this.config.processing.consolidationThreshold) {
      // Async consolidation
      this.consolidator.consolidate(item.sessionId)
        .catch(err => console.error('Consolidation error:', err));
    }
  }
  
  // NEW: Flowise-style conversational memory
  async addConversationalMemory(sessionId: string, messages: IMessage[]): Promise<void> {
    this.ensureInitialized();
    await this.workingMemory.addConversationalMemory(sessionId, messages);
  }
  
  async getConversationalMemory(sessionId: string, limit?: number): Promise<IMessage[]> {
    this.ensureInitialized();
    return this.workingMemory.getConversationalMemory(sessionId, limit);
  }
  
  // NEW: Runtime state management
  async setRuntimeState(sessionId: string, state: ICommonObject): Promise<void> {
    this.ensureInitialized();
    await this.workingMemory.setRuntimeState(sessionId, state);
  }
  
  async getRuntimeState(sessionId: string): Promise<ICommonObject> {
    this.ensureInitialized();
    return this.workingMemory.getRuntimeState(sessionId);
  }
  
  async updateRuntimeState(sessionId: string, updates: StateUpdate[]): Promise<void> {
    this.ensureInitialized();
    await this.workingMemory.updateRuntimeState(sessionId, updates);
  }
  
  // NEW: Form data management
  async setFormData(sessionId: string, form: Record<string, any>): Promise<void> {
    this.ensureInitialized();
    await this.workingMemory.setFormData(sessionId, form);
  }
  
  async getFormData(sessionId: string): Promise<Record<string, any>> {
    this.ensureInitialized();
    return this.workingMemory.getFormData(sessionId);
  }
  
  // NEW: Memory buffer management
  createMemoryBuffer(type: MemoryBufferType, config?: MemoryBufferConfig): IMemoryBuffer {
    this.ensureInitialized();
    
    switch (type) {
      case 'window':
        return new WindowMemoryBuffer(config?.maxSize || this.config.workingMemory.windowSize || 20);
      
      case 'summary':
        return new SummaryMemoryBuffer(
          config?.maxSize || 50,
          config?.summarizationThreshold || 30,
          config?.summaryModel || this.config.processing.summarizationModel
        );
      
      case 'conversation':
        return new ConversationMemoryBuffer(
          config?.maxSize || this.config.workingMemory.conversationLimit || 100
        );
      
      default:
        throw new Error(`Unknown memory buffer type: ${type}`);
    }
  }
  
  async getMemoryBuffer(sessionId: string, type: MemoryBufferType): Promise<IMemoryBuffer> {
    this.ensureInitialized();
    
    const bufferKey = `${sessionId}:${type}`;
    let buffer = this.workingMemory.memoryBuffers?.get(bufferKey);
    
    if (!buffer) {
      buffer = this.createMemoryBuffer(type);
      // Initialize buffer with existing memory if any
      const existing = await this.workingMemory.get({ sessionId, limit: 50 });
      for (const item of existing) {
        const message: IMessage = {
          role: item.type as any,
          content: item.content,
          metadata: {
            timestamp: item.timestamp.toISOString(),
            agentReasoning: item.metadata?.reasoning
          }
        };
        await buffer.add(message);
      }
      
      this.workingMemory.memoryBuffers?.set(bufferKey, buffer);
    }
    
    return buffer;
  }
  
  async embed(text: string | string[]): Promise<Embedding[]> {
    this.ensureInitialized();
    return this.embedder.embed(text);
  }
  
  async search(query: VectorSearchQuery): Promise<VectorSearchResult[]> {
    this.ensureInitialized();
    
    // If text provided, convert to vector
    if (query.text && !query.vector) {
      const [embedding] = await this.embedder.embed(query.text);
      query.vector = embedding.vector;
    }
    
    return this.vectorStore.search(query);
  }
  
  async health(): Promise<HealthStatus> {
    try {
      // Check vector store
      const stats = await this.vectorStore.stats();
      
      // Check working memory
      const workingMemorySize = this.workingMemory.size();
      
      return {
        status: 'healthy',
        message: 'Memory module operational',
        details: {
          vectorStore: stats,
          workingMemory: { sessions: workingMemorySize }
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
  
  private async createWorkingMemory(
    config: WorkingMemoryConfig
  ): Promise<WorkingMemory> {
    if (config.type === 'session-state') {
      // Use Session & State module for working memory
      return new SessionStateWorkingMemory(
        AgentHub.getInstance().getModule('sessionState')
      );
    }
    
    return new WorkingMemory(config);
  }
  
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('Memory module not initialized');
    }
  }
}
```

### Step 8: Memory Buffer Implementations
Create `modules/memory/buffers/`:

**Window Memory Buffer**:
```typescript
export class WindowMemoryBuffer implements IMemoryBuffer {
  readonly type = 'window' as MemoryBufferType;
  readonly sessionId: string;
  readonly maxSize: number;
  
  private messages: IMessage[] = [];
  
  constructor(maxSize: number = 20) {
    this.maxSize = maxSize;
  }
  
  async add(message: IMessage): Promise<void> {
    this.messages.push(message);
    
    // Keep only the latest maxSize messages
    if (this.messages.length > this.maxSize) {
      this.messages = this.messages.slice(-this.maxSize);
    }
  }
  
  async getMessages(): Promise<IMessage[]> {
    return [...this.messages];
  }
  
  async clear(): Promise<void> {
    this.messages = [];
  }
  
  async getContext(): Promise<string> {
    return this.messages
      .map(m => `${m.role}: ${m.content}`)
      .join('\n');
  }
}
```

**Summary Memory Buffer**:
```typescript
export class SummaryMemoryBuffer implements IMemoryBuffer {
  readonly type = 'summary' as MemoryBufferType;
  readonly sessionId: string;
  readonly maxSize: number;
  
  private messages: IMessage[] = [];
  private summary: string = '';
  private summarizationThreshold: number;
  private summaryModel?: string;
  
  constructor(maxSize: number = 50, threshold: number = 30, model?: string) {
    this.maxSize = maxSize;
    this.summarizationThreshold = threshold;
    this.summaryModel = model;
  }
  
  async add(message: IMessage): Promise<void> {
    this.messages.push(message);
    
    // Summarize if threshold reached
    if (this.messages.length >= this.summarizationThreshold) {
      await this.summarizeAndTrim();
    }
  }
  
  async summarize(): Promise<string> {
    if (this.messages.length === 0) return this.summary;
    
    const litellm = AgentHub.getInstance().getModule<ILiteLLMModule>('litellm');
    
    const prompt = `Summarize the following conversation maintaining key information and context:\n\n${this.getContext()}`;
    
    const response = await litellm.complete({
      messages: [{ role: 'user', content: prompt }],
      model: this.summaryModel || 'gpt-3.5-turbo',
      temperature: 0.3
    });
    
    const newSummary = response.choices[0].message.content;
    
    // Combine with existing summary if present
    if (this.summary) {
      const combinedPrompt = `Combine these two summaries into one coherent summary:\n\nPrevious: ${this.summary}\n\nNew: ${newSummary}`;
      
      const combinedResponse = await litellm.complete({
        messages: [{ role: 'user', content: combinedPrompt }],
        model: this.summaryModel || 'gpt-3.5-turbo',
        temperature: 0.3
      });
      
      return combinedResponse.choices[0].message.content;
    }
    
    return newSummary;
  }
  
  private async summarizeAndTrim(): Promise<void> {
    this.summary = await this.summarize();
    
    // Keep only recent messages
    const keepRecent = Math.floor(this.summarizationThreshold / 2);
    this.messages = this.messages.slice(-keepRecent);
  }
}
```

**Conversation Memory Buffer**:
```typescript
export class ConversationMemoryBuffer implements IMemoryBuffer {
  readonly type = 'conversation' as MemoryBufferType;
  readonly sessionId: string;
  readonly maxSize: number;
  
  private messages: IMessage[] = [];
  
  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }
  
  async add(message: IMessage): Promise<void> {
    this.messages.push(message);
    
    // Remove oldest messages if exceeds limit
    if (this.messages.length > this.maxSize) {
      this.messages = this.messages.slice(-this.maxSize);
    }
  }
  
  async getMessages(): Promise<IMessage[]> {
    return [...this.messages];
  }
  
  async clear(): Promise<void> {
    this.messages = [];
  }
  
  async trim(): Promise<void> {
    // Keep important system messages and recent conversation
    const systemMessages = this.messages.filter(m => m.role === 'system');
    const recentMessages = this.messages
      .filter(m => m.role !== 'system')
      .slice(-Math.floor(this.maxSize * 0.8));
    
    this.messages = [...systemMessages, ...recentMessages];
  }
}
```

### Step 9: Module Factory
Create `modules/memory/factory.ts`:

```typescript
export function createMemoryModule(config: MemoryConfig): IMemoryModule {
  const module = new MemoryModule();
  
  return wrapModule(module, {
    name: 'memory',
    monitoring: {
      trackLatency: true,
      trackErrors: true,
      trackMethodCalls: [
        'store',
        'retrieve',
        'embed',
        'consolidate'
      ]
    },
    caching: {
      methods: ['embed', 'retrieve'],
      ttl: 300000 // 5 minutes
    }
  });
}
```

## Testing Requirements

### 1. Unit Tests
- Working memory operations
- Embedding generation
- Vector search
- Memory consolidation
- Importance scoring

### 2. Integration Tests
- Vector store integration
- Database integration
- Session & State module integration
- End-to-end memory flow

### 3. Performance Tests
- Embedding generation speed
- Vector search latency
- Memory consumption
- Consolidation performance

## Post-Implementation Validation

### 1. Functionality Checklist
- [ ] Working memory manages conversation context
- [ ] Long-term memories are stored and retrievable
- [ ] Vector search returns relevant results
- [ ] Embeddings are cached efficiently
- [ ] Consolidation extracts key information
- [ ] Multiple backends are supported

### 2. Performance Requirements
- [ ] Embedding generation < 100ms for single text
- [ ] Vector search < 50ms for typical queries
- [ ] Working memory operations < 10ms
- [ ] Scales to millions of memories

### 3. Integration Requirements
- [ ] Integrates with Session & State module
- [ ] Uses LiteLLM for embeddings
- [ ] Monitoring through Langfuse
- [ ] Follows module interface

## Common Pitfalls to Avoid

1. **Don't store raw conversations** - Process and extract information
2. **Don't ignore memory limits** - Implement proper cleanup
3. **Don't skip importance scoring** - Critical for retrieval
4. **Don't embed everything** - Cache and batch operations
5. **Don't forget privacy** - Sanitize personal information
6. **Don't neglect consolidation** - Prevents memory bloat

## Final Validation Questions

1. Does memory retrieval return relevant results?
2. Is working memory efficiently compressed?
3. Are embeddings cached properly?
4. Does consolidation extract meaningful information?
5. Is the module storage-agnostic?
6. Are privacy concerns addressed?
7. **NEW: Does runtime state persist across executions?**
8. **NEW: Do memory buffers handle different use cases effectively?**
9. **NEW: Is conversational memory maintained properly?**
10. **NEW: Can form data be persisted and retrieved?**
11. **NEW: Are execution contexts tracked in memory?**
12. **NEW: Does the module integrate with streaming updates?**

## Next Steps
After completing the Memory module, implement the Tools module (05-tools-module-implementation.md) for centralized tool management.