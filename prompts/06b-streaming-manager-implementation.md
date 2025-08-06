# Streaming Manager Module Implementation Prompt (Flowise Integration)

## Context
You are implementing the Streaming Manager Module - a critical component that enables real-time execution updates, streaming responses, and event-driven communication in AgentHub. This module integrates Flowise streaming patterns including Server-Sent Events (SSE), event types, client management, and tool execution streaming.

## Pre-Implementation Requirements

### 1. Documentation Review
You MUST read:
1. Module Registry implementation: `/Users/sakshams/tekai/TekContextEngine/prompts/06-module-registry-implementation.md`
2. Base Agent implementation: `/Users/sakshams/tekai/TekContextEngine/prompts/07-base-agent-implementation.md`
3. Flowise streaming patterns analysis
4. Server-Sent Events specification: https://html.spec.whatwg.org/multipage/server-sent-events.html

### 2. Understand Streaming Requirements
The Streaming Manager must:
- Provide real-time execution updates via Server-Sent Events
- Support multiple concurrent streaming sessions
- Handle different event types (tokens, node start/end, tools, errors)
- Manage client connections and cleanup
- Support human-in-the-loop interaction events
- Enable workflow execution streaming with progress updates

## Implementation Steps

### Step 1: Streaming Manager Types
Create `modules/streaming/types.ts`:

```typescript
import { Response } from 'express';

export interface IStreamingManager {
  // Client management
  addClient(sessionId: string, response: Response): void;
  removeClient(sessionId: string): void;
  hasClient(sessionId: string): boolean;
  getClientCount(): number;
  
  // Event streaming
  streamToken(sessionId: string, token: string): void;
  streamStart(sessionId: string, metadata?: any): void;
  streamEnd(sessionId: string): void;
  streamError(sessionId: string, error: Error): void;
  
  // Node execution events
  streamNodeStart(sessionId: string, nodeId: string, nodeName: string, nodeType?: string): void;
  streamNodeEnd(sessionId: string, nodeId: string, result: any, duration?: number): void;
  streamNodeError(sessionId: string, nodeId: string, error: Error): void;
  
  // Tool execution events
  streamToolCall(sessionId: string, tool: string, input: any): void;
  streamToolResult(sessionId: string, tool: string, result: any, duration?: number): void;
  streamToolError(sessionId: string, tool: string, error: Error): void;
  
  // Human interaction events
  streamHumanPrompt(sessionId: string, prompt: string, options?: HumanPromptOptions): void;
  streamHumanResponse(sessionId: string, response: any): void;
  
  // Workflow events
  streamWorkflowStart(sessionId: string, workflowId: string, workflowName?: string): void;
  streamWorkflowEnd(sessionId: string, workflowId: string, result?: any): void;
  streamWorkflowProgress(sessionId: string, workflowId: string, progress: WorkflowProgress): void;
  
  // Memory and document events (Flowise compatibility)
  streamSourceDocuments(sessionId: string, documents: any[]): void;
  streamUsedTools(sessionId: string, tools: UsedTool[]): void;
  streamArtifacts(sessionId: string, artifacts: any[]): void;
  
  // Custom events
  streamCustomEvent(sessionId: string, eventType: string, data: any): void;
  
  // Streamer management
  getStreamer(sessionId: string): IStreamer | null;
  createStreamer(sessionId: string): IStreamer;
  
  // Cleanup
  cleanup(): Promise<void>;
}

export interface IStreamer {
  readonly sessionId: string;
  readonly isActive: boolean;
  readonly startedAt: Date;
  
  // Core streaming methods
  streamToken(token: string): void;
  streamStart(metadata?: any): void;
  streamEnd(): void;
  streamError(error: Error): void;
  
  // Node events
  streamNodeStart(nodeId: string, nodeName: string, nodeType?: string): void;
  streamNodeEnd(nodeId: string, result: any, duration?: number): void;
  streamNodeError(nodeId: string, error: Error): void;
  
  // Tool events
  streamToolCall(tool: string, input: any): void;
  streamToolResult(tool: string, result: any, duration?: number): void;
  streamToolError(tool: string, error: Error): void;
  
  // Human interaction
  streamHumanPrompt(prompt: string, options?: HumanPromptOptions): void;
  streamHumanResponse(response: any): void;
  
  // Workflow events
  streamWorkflowStart(workflowId: string, workflowName?: string): void;
  streamWorkflowEnd(workflowId: string, result?: any): void;
  streamWorkflowProgress(workflowId: string, progress: WorkflowProgress): void;
  
  // Flowise compatibility
  streamSourceDocuments(documents: any[]): void;
  streamUsedTools(tools: UsedTool[]): void;
  streamArtifacts(artifacts: any[]): void;
  
  // Custom events
  streamCustomEvent(eventType: string, data: any): void;
  
  // Control
  close(): void;
}

// Event types (based on Flowise patterns)
export type StreamEvent = 
  | 'start'
  | 'token'
  | 'end'
  | 'error'
  | 'nodeStart'
  | 'nodeEnd' 
  | 'nodeError'
  | 'toolCall'
  | 'toolResult'
  | 'toolError'
  | 'humanPrompt'
  | 'humanResponse'
  | 'workflowStart'
  | 'workflowEnd'
  | 'workflowProgress'
  | 'sourceDocuments'
  | 'usedTools'
  | 'artifacts'
  | 'custom';

export interface StreamEventData {
  event: StreamEvent;
  data: any;
  timestamp: string;
  sessionId: string;
  eventId?: string;
}

export interface HumanPromptOptions {
  type?: 'approval' | 'input' | 'choice' | 'confirmation';
  timeout?: number;
  choices?: string[];
  required?: boolean;
  metadata?: any;
}

export interface WorkflowProgress {
  totalNodes: number;
  completedNodes: number;
  currentNode: string;
  currentNodeName?: string;
  percentage: number;
  estimatedTimeRemaining?: number;
}

export interface UsedTool {
  tool: string;
  input: any;
  output: any;
  duration?: number;
  error?: string;
}

export interface StreamingManagerConfig {
  // Connection settings
  maxClients?: number;
  connectionTimeout?: number;
  heartbeatInterval?: number;
  
  // Event settings
  enableCompression?: boolean;
  eventIdGeneration?: boolean;
  retrySettings?: {
    maxRetries: number;
    retryDelay: number;
  };
  
  // Security
  corsOrigins?: string[];
  requireAuth?: boolean;
  rateLimiting?: {
    maxEventsPerSecond: number;
    windowSize: number;
  };
  
  // Monitoring
  enableMetrics?: boolean;
  logEvents?: boolean;
}
```

### Step 2: Streaming Manager Implementation
Create `modules/streaming/streaming-manager.ts`:

```typescript
import { Response } from 'express';
import { EventEmitter } from 'events';
import { generateId } from '../../utils';
import { IModule } from '../base/types';

export class StreamingManager extends EventEmitter implements IStreamingManager, IModule {
  readonly name = 'streamingManager';
  readonly version = '1.0.0';
  
  private clients = new Map<string, SSEClient>();
  private streamers = new Map<string, ServerSentEventStreamer>();
  private config: StreamingManagerConfig;
  private heartbeatInterval?: NodeJS.Timeout;
  
  constructor(config: StreamingManagerConfig = {}) {
    super();
    this.config = {
      maxClients: 1000,
      connectionTimeout: 300000, // 5 minutes
      heartbeatInterval: 30000,  // 30 seconds
      enableCompression: true,
      eventIdGeneration: true,
      enableMetrics: true,
      logEvents: false,
      ...config
    };
  }
  
  async initialize(): Promise<void> {
    // Start heartbeat to clean up stale connections
    if (this.config.heartbeatInterval) {
      this.heartbeatInterval = setInterval(
        () => this.cleanupStaleConnections(),
        this.config.heartbeatInterval
      );
    }
    
    this.emit('initialized');
  }
  
  async cleanup(): Promise<void> {
    // Clear heartbeat
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    // Close all client connections
    for (const client of this.clients.values()) {
      client.close();
    }
    this.clients.clear();
    this.streamers.clear();
    
    this.emit('cleanup');
  }
  
  // Client management
  addClient(sessionId: string, response: Response): void {
    this.removeClient(sessionId); // Remove existing client
    
    if (this.clients.size >= this.config.maxClients!) {
      throw new Error('Maximum number of streaming clients reached');
    }
    
    const client = new SSEClient(sessionId, response, this.config);
    this.clients.set(sessionId, client);
    
    // Create streamer for this session
    const streamer = new ServerSentEventStreamer(sessionId, client, this.config);
    this.streamers.set(sessionId, streamer);
    
    // Handle client disconnect
    response.on('close', () => {
      this.removeClient(sessionId);
    });
    
    this.emit('clientAdded', { sessionId });
  }
  
  removeClient(sessionId: string): void {
    const client = this.clients.get(sessionId);
    const streamer = this.streamers.get(sessionId);
    
    if (client) {
      client.close();
      this.clients.delete(sessionId);
    }
    
    if (streamer) {
      streamer.close();
      this.streamers.delete(sessionId);
    }
    
    this.emit('clientRemoved', { sessionId });
  }
  
  hasClient(sessionId: string): boolean {
    return this.clients.has(sessionId);
  }
  
  getClientCount(): number {
    return this.clients.size;
  }
  
  // Event streaming methods
  streamToken(sessionId: string, token: string): void {
    const streamer = this.streamers.get(sessionId);
    if (streamer) {
      streamer.streamToken(token);
    }
  }
  
  streamStart(sessionId: string, metadata?: any): void {
    const streamer = this.streamers.get(sessionId);
    if (streamer) {
      streamer.streamStart(metadata);
    }
  }
  
  streamEnd(sessionId: string): void {
    const streamer = this.streamers.get(sessionId);
    if (streamer) {
      streamer.streamEnd();
    }
  }
  
  streamError(sessionId: string, error: Error): void {
    const streamer = this.streamers.get(sessionId);
    if (streamer) {
      streamer.streamError(error);
    }
  }
  
  // Node execution events
  streamNodeStart(sessionId: string, nodeId: string, nodeName: string, nodeType?: string): void {
    const streamer = this.streamers.get(sessionId);
    if (streamer) {
      streamer.streamNodeStart(nodeId, nodeName, nodeType);
    }
  }
  
  streamNodeEnd(sessionId: string, nodeId: string, result: any, duration?: number): void {
    const streamer = this.streamers.get(sessionId);
    if (streamer) {
      streamer.streamNodeEnd(nodeId, result, duration);
    }
  }
  
  streamNodeError(sessionId: string, nodeId: string, error: Error): void {
    const streamer = this.streamers.get(sessionId);
    if (streamer) {
      streamer.streamNodeError(nodeId, error);
    }
  }
  
  // Tool execution events
  streamToolCall(sessionId: string, tool: string, input: any): void {
    const streamer = this.streamers.get(sessionId);
    if (streamer) {
      streamer.streamToolCall(tool, input);
    }
  }
  
  streamToolResult(sessionId: string, tool: string, result: any, duration?: number): void {
    const streamer = this.streamers.get(sessionId);
    if (streamer) {
      streamer.streamToolResult(tool, result, duration);
    }
  }
  
  streamToolError(sessionId: string, tool: string, error: Error): void {
    const streamer = this.streamers.get(sessionId);
    if (streamer) {
      streamer.streamToolError(tool, error);
    }
  }
  
  // Human interaction events
  streamHumanPrompt(sessionId: string, prompt: string, options?: HumanPromptOptions): void {
    const streamer = this.streamers.get(sessionId);
    if (streamer) {
      streamer.streamHumanPrompt(prompt, options);
    }
  }
  
  streamHumanResponse(sessionId: string, response: any): void {
    const streamer = this.streamers.get(sessionId);
    if (streamer) {
      streamer.streamHumanResponse(response);
    }
  }
  
  // Workflow events
  streamWorkflowStart(sessionId: string, workflowId: string, workflowName?: string): void {
    const streamer = this.streamers.get(sessionId);
    if (streamer) {
      streamer.streamWorkflowStart(workflowId, workflowName);
    }
  }
  
  streamWorkflowEnd(sessionId: string, workflowId: string, result?: any): void {
    const streamer = this.streamers.get(sessionId);
    if (streamer) {
      streamer.streamWorkflowEnd(workflowId, result);
    }
  }
  
  streamWorkflowProgress(sessionId: string, workflowId: string, progress: WorkflowProgress): void {
    const streamer = this.streamers.get(sessionId);
    if (streamer) {
      streamer.streamWorkflowProgress(workflowId, progress);
    }
  }
  
  // Flowise compatibility events
  streamSourceDocuments(sessionId: string, documents: any[]): void {
    const streamer = this.streamers.get(sessionId);
    if (streamer) {
      streamer.streamSourceDocuments(documents);
    }
  }
  
  streamUsedTools(sessionId: string, tools: UsedTool[]): void {
    const streamer = this.streamers.get(sessionId);
    if (streamer) {
      streamer.streamUsedTools(tools);
    }
  }
  
  streamArtifacts(sessionId: string, artifacts: any[]): void {
    const streamer = this.streamers.get(sessionId);
    if (streamer) {
      streamer.streamArtifacts(artifacts);
    }
  }
  
  // Custom events
  streamCustomEvent(sessionId: string, eventType: string, data: any): void {
    const streamer = this.streamers.get(sessionId);
    if (streamer) {
      streamer.streamCustomEvent(eventType, data);
    }
  }
  
  // Streamer management
  getStreamer(sessionId: string): IStreamer | null {
    return this.streamers.get(sessionId) || null;
  }
  
  createStreamer(sessionId: string): IStreamer {
    if (!this.clients.has(sessionId)) {
      throw new Error(`No client connection found for session: ${sessionId}`);
    }
    
    const client = this.clients.get(sessionId)!;
    const streamer = new ServerSentEventStreamer(sessionId, client, this.config);
    this.streamers.set(sessionId, streamer);
    
    return streamer;
  }
  
  // Utility methods
  private cleanupStaleConnections(): void {
    const now = Date.now();
    const timeout = this.config.connectionTimeout!;
    
    for (const [sessionId, client] of this.clients.entries()) {
      if (now - client.createdAt.getTime() > timeout) {
        this.removeClient(sessionId);
      }
    }
  }
  
  // Health check
  async health(): Promise<any> {
    return {
      status: 'healthy',
      clients: this.clients.size,
      streamers: this.streamers.size,
      maxClients: this.config.maxClients
    };
  }
}
```

### Step 3: SSE Client Implementation
Create `modules/streaming/sse-client.ts`:

```typescript
import { Response } from 'express';
import { StreamingManagerConfig } from './types';

export class SSEClient {
  readonly sessionId: string;
  readonly createdAt: Date;
  private response: Response;
  private config: StreamingManagerConfig;
  private closed = false;
  
  constructor(sessionId: string, response: Response, config: StreamingManagerConfig) {
    this.sessionId = sessionId;
    this.response = response;
    this.config = config;
    this.createdAt = new Date();
    
    this.setupSSE();
  }
  
  private setupSSE(): void {
    // Set SSE headers
    this.response.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });
    
    // Send initial connection event
    this.sendEvent('start', { 
      sessionId: this.sessionId,
      timestamp: new Date().toISOString()
    });
  }
  
  sendEvent(event: string, data: any, id?: string): void {
    if (this.closed) return;
    
    try {
      const eventData: StreamEventData = {
        event: event as any,
        data,
        timestamp: new Date().toISOString(),
        sessionId: this.sessionId,
        eventId: id || (this.config.eventIdGeneration ? generateId('event') : undefined)
      };
      
      // Format SSE message
      let message = '';
      
      if (eventData.eventId) {
        message += `id: ${eventData.eventId}\n`;
      }
      
      message += `event: ${event}\n`;
      message += `data: ${JSON.stringify(eventData)}\n\n`;
      
      // Write to response
      this.response.write(message);
      
      if (this.config.logEvents) {
        console.log(`SSE Event [${this.sessionId}]:`, event, data);
      }
      
    } catch (error) {
      console.error(`Error sending SSE event to ${this.sessionId}:`, error);
      this.close();
    }
  }
  
  sendHeartbeat(): void {
    this.sendEvent('heartbeat', { timestamp: new Date().toISOString() });
  }
  
  close(): void {
    if (!this.closed) {
      this.closed = true;
      
      try {
        this.response.end();
      } catch (error) {
        // Response might already be closed
      }
    }
  }
  
  get isClosed(): boolean {
    return this.closed;
  }
}
```

### Step 4: Server-Sent Event Streamer
Create `modules/streaming/sse-streamer.ts`:

```typescript
export class ServerSentEventStreamer implements IStreamer {
  readonly sessionId: string;
  readonly startedAt: Date;
  
  private client: SSEClient;
  private config: StreamingManagerConfig;
  private _isActive = true;
  
  constructor(sessionId: string, client: SSEClient, config: StreamingManagerConfig) {
    this.sessionId = sessionId;
    this.client = client;
    this.config = config;
    this.startedAt = new Date();
  }
  
  get isActive(): boolean {
    return this._isActive && !this.client.isClosed;
  }
  
  // Core streaming methods
  streamToken(token: string): void {
    if (!this.isActive) return;
    this.client.sendEvent('token', { token });
  }
  
  streamStart(metadata?: any): void {
    if (!this.isActive) return;
    this.client.sendEvent('start', { 
      metadata,
      startedAt: this.startedAt.toISOString()
    });
  }
  
  streamEnd(): void {
    if (!this.isActive) return;
    this.client.sendEvent('end', { 
      duration: Date.now() - this.startedAt.getTime()
    });
  }
  
  streamError(error: Error): void {
    if (!this.isActive) return;
    this.client.sendEvent('error', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
  
  // Node events
  streamNodeStart(nodeId: string, nodeName: string, nodeType?: string): void {
    if (!this.isActive) return;
    this.client.sendEvent('nodeStart', {
      nodeId,
      nodeName,
      nodeType,
      timestamp: new Date().toISOString()
    });
  }
  
  streamNodeEnd(nodeId: string, result: any, duration?: number): void {
    if (!this.isActive) return;
    this.client.sendEvent('nodeEnd', {
      nodeId,
      result,
      duration,
      timestamp: new Date().toISOString()
    });
  }
  
  streamNodeError(nodeId: string, error: Error): void {
    if (!this.isActive) return;
    this.client.sendEvent('nodeError', {
      nodeId,
      error: {
        message: error.message,
        stack: error.stack
      },
      timestamp: new Date().toISOString()
    });
  }
  
  // Tool events
  streamToolCall(tool: string, input: any): void {
    if (!this.isActive) return;
    this.client.sendEvent('toolCall', {
      tool,
      input,
      timestamp: new Date().toISOString()
    });
  }
  
  streamToolResult(tool: string, result: any, duration?: number): void {
    if (!this.isActive) return;
    this.client.sendEvent('toolResult', {
      tool,
      result,
      duration,
      timestamp: new Date().toISOString()
    });
  }
  
  streamToolError(tool: string, error: Error): void {
    if (!this.isActive) return;
    this.client.sendEvent('toolError', {
      tool,
      error: {
        message: error.message,
        stack: error.stack
      },
      timestamp: new Date().toISOString()
    });
  }
  
  // Human interaction
  streamHumanPrompt(prompt: string, options?: HumanPromptOptions): void {
    if (!this.isActive) return;
    this.client.sendEvent('humanPrompt', {
      prompt,
      options,
      timestamp: new Date().toISOString()
    });
  }
  
  streamHumanResponse(response: any): void {
    if (!this.isActive) return;
    this.client.sendEvent('humanResponse', {
      response,
      timestamp: new Date().toISOString()
    });
  }
  
  // Workflow events
  streamWorkflowStart(workflowId: string, workflowName?: string): void {
    if (!this.isActive) return;
    this.client.sendEvent('workflowStart', {
      workflowId,
      workflowName,
      timestamp: new Date().toISOString()
    });
  }
  
  streamWorkflowEnd(workflowId: string, result?: any): void {
    if (!this.isActive) return;
    this.client.sendEvent('workflowEnd', {
      workflowId,
      result,
      timestamp: new Date().toISOString()
    });
  }
  
  streamWorkflowProgress(workflowId: string, progress: WorkflowProgress): void {
    if (!this.isActive) return;
    this.client.sendEvent('workflowProgress', {
      workflowId,
      progress,
      timestamp: new Date().toISOString()
    });
  }
  
  // Flowise compatibility
  streamSourceDocuments(documents: any[]): void {
    if (!this.isActive) return;
    this.client.sendEvent('sourceDocuments', { documents });
  }
  
  streamUsedTools(tools: UsedTool[]): void {
    if (!this.isActive) return;
    this.client.sendEvent('usedTools', { tools });
  }
  
  streamArtifacts(artifacts: any[]): void {
    if (!this.isActive) return;
    this.client.sendEvent('artifacts', { artifacts });
  }
  
  // Custom events
  streamCustomEvent(eventType: string, data: any): void {
    if (!this.isActive) return;
    this.client.sendEvent('custom', {
      eventType,
      data,
      timestamp: new Date().toISOString()
    });
  }
  
  // Control
  close(): void {
    this._isActive = false;
    this.client.close();
  }
}
```

### Step 5: Streaming Manager Factory
Create `modules/streaming/factory.ts`:

```typescript
import { IModuleFactory } from '../base/factory';
import { StreamingManager } from './streaming-manager';
import { StreamingManagerConfig } from './types';

export class StreamingManagerFactory implements IModuleFactory<StreamingManager> {
  create(config?: StreamingManagerConfig): StreamingManager {
    return new StreamingManager(config);
  }
}

// Export for registration
export const streamingManagerFactory = new StreamingManagerFactory();
```

## Testing Requirements

### 1. Unit Tests
- SSE client management
- Event streaming functionality
- Error handling and recovery
- Connection cleanup
- Rate limiting

### 2. Integration Tests
- Full streaming workflow
- Multiple concurrent clients
- Human interaction events
- Tool execution streaming
- Workflow progress updates

### 3. Performance Tests
- High-frequency token streaming
- Multiple concurrent connections
- Memory usage under load
- Connection establishment/teardown overhead

## Usage Examples

```typescript
// Initialize streaming manager
const streamingManager = new StreamingManager({
  maxClients: 100,
  enableCompression: true,
  heartbeatInterval: 30000
});

// Express route for SSE connection
app.get('/stream/:sessionId', (req, res) => {
  const sessionId = req.params.sessionId;
  streamingManager.addClient(sessionId, res);
});

// Stream token updates
streamingManager.streamToken('session-123', 'Hello ');
streamingManager.streamToken('session-123', 'World!');

// Stream workflow events
streamingManager.streamWorkflowStart('session-123', 'workflow-1', 'Data Analysis');
streamingManager.streamNodeStart('session-123', 'node-1', 'LLM Agent');
streamingManager.streamToken('session-123', 'Processing...');
streamingManager.streamNodeEnd('session-123', 'node-1', { result: 'Complete' });
streamingManager.streamWorkflowEnd('session-123', 'workflow-1');

// Stream tool execution
streamingManager.streamToolCall('session-123', 'search', { query: 'test' });
streamingManager.streamToolResult('session-123', 'search', { results: [...] });

// Stream human interaction
streamingManager.streamHumanPrompt('session-123', 'Approve this action?', {
  type: 'confirmation',
  timeout: 30000
});
```

## Next Steps
After completing the Streaming Manager, implement the Execution Manager (06a-execution-manager-implementation.md) for workflow orchestration.