# Execution Manager Module Implementation Prompt (Flowise Workflow Patterns)

## Context
You are implementing the Execution Manager Module - the core orchestration system that manages graph-based workflow execution, node dependencies, execution state tracking, and resume capabilities in AgentHub. This module integrates Flowise patterns for workflow execution, queue-based processing, conditional branching, human-in-the-loop workflows, and execution state persistence.

## Pre-Implementation Requirements

### 1. Documentation Review
You MUST read:
1. Module Registry implementation: `/Users/sakshams/tekai/TekContextEngine/prompts/06-module-registry-implementation.md`
2. Base Agent implementation: `/Users/sakshams/tekai/TekContextEngine/prompts/07-base-agent-implementation.md`
3. Streaming Manager implementation: `/Users/sakshams/tekai/TekContextEngine/prompts/06b-streaming-manager-implementation.md`
4. Enhanced Memory module: `/Users/sakshams/tekai/TekContextEngine/prompts/04-memory-module-implementation.md`
5. Flowise buildAgentflow.ts analysis
6. Graph algorithms and topological sorting
7. Workflow orchestration patterns

### 2. Understand Execution Requirements
The Execution Manager must:
- Execute workflows as directed acyclic graphs (DAGs)
- Handle node dependencies and execution order
- Support conditional branching and loops
- Enable human-in-the-loop interactions
- Track execution state for resume capability
- Provide real-time progress updates via streaming
- Support parallel execution where possible
- Handle errors gracefully with recovery options

## Implementation Steps

### Step 1: Execution Manager Types
Create `modules/execution/types.ts`:

```typescript
export interface IExecutionManager {
  name: string;
  version: string;
  
  // Lifecycle
  initialize(config: ExecutionManagerConfig): Promise<void>;
  health(): Promise<HealthStatus>;
  shutdown(): Promise<void>;
  
  // Workflow execution
  executeWorkflow(
    workflow: AgentWorkflow, 
    input: WorkflowInput, 
    options?: ExecutionOptions
  ): Promise<ExecutionResult>;
  
  // Streaming execution
  executeWorkflowStreaming(
    workflow: AgentWorkflow, 
    input: WorkflowInput,
    streamer: IStreamer,
    options?: ExecutionOptions
  ): Promise<ExecutionResult>;
  
  // Execution control
  pauseExecution(executionId: string): Promise<void>;
  resumeExecution(executionId: string, input?: any): Promise<ExecutionResult>;
  terminateExecution(executionId: string): Promise<void>;
  
  // State management
  saveExecutionState(executionId: string, state: ExecutionState): Promise<void>;
  loadExecutionState(executionId: string): Promise<ExecutionState | null>;
  getExecutionStatus(executionId: string): Promise<ExecutionStatus>;
  
  // Human-in-the-loop
  pauseForHumanInput(
    executionId: string, 
    prompt: string, 
    options?: HumanPromptOptions
  ): Promise<void>;
  
  resumeWithHumanInput(executionId: string, input: any): Promise<void>;
  
  // Execution history
  getExecutionHistory(workflowId: string, limit?: number): Promise<ExecutionSummary[]>;
  getExecutionDetails(executionId: string): Promise<ExecutionDetails>;
  
  // Workflow validation
  validateWorkflow(workflow: AgentWorkflow): Promise<ValidationResult>;
}

// Workflow definition (based on Flowise patterns)
export interface AgentWorkflow {
  id: string;
  name: string;
  description?: string;
  version: string;
  
  // Graph structure
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  
  // Configuration
  variables?: Variable[];
  settings?: WorkflowSettings;
  
  // Metadata
  tags?: string[];
  category?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowNode {
  id: string;
  type: string;  // Agent type or special node type
  name: string;
  description?: string;
  
  // Visual positioning
  position: { x: number; y: number };
  
  // Node configuration
  data: NodeData;
  
  // Execution configuration
  retryPolicy?: RetryPolicy;
  timeout?: number;
  skipOnError?: boolean;
}

export interface WorkflowEdge {
  id: string;
  source: string;        // Source node ID
  target: string;        // Target node ID
  sourceHandle?: string; // Output port
  targetHandle?: string; // Input port
  
  // Conditional execution
  condition?: EdgeCondition;
  
  // Data transformation
  transform?: DataTransform;
  
  // Metadata
  label?: string;
  animated?: boolean;
}

export interface NodeData {
  // Agent configuration
  agentConfig?: any;
  
  // Input/output mapping
  inputs?: Record<string, any>;
  outputs?: Record<string, any>;
  
  // Node-specific settings
  settings?: Record<string, any>;
  
  // Variable references
  variables?: string[];
}

// Execution state management
export interface ExecutionState {
  executionId: string;
  workflowId: string;
  status: ExecutionStatus;
  
  // Progress tracking
  currentNode?: string;
  completedNodes: string[];
  failedNodes: string[];
  skippedNodes: string[];
  
  // Execution queue and waiting nodes
  executionQueue: string[];
  waitingNodes: Map<string, WaitingNode>;
  
  // Runtime data
  nodeOutputs: Map<string, any>;
  variables: Map<string, any>;
  runtimeState: Record<string, any>;
  
  // Timing information
  startedAt: Date;
  lastUpdated: Date;
  completedAt?: Date;
  
  // Error information
  error?: ExecutionError;
  
  // Human interaction
  humanInteractions: HumanInteraction[];
}

export interface WaitingNode {
  nodeId: string;
  expectedInputs: Set<string>;      // Expected input connections
  receivedInputs: Map<string, any>; // Actual received inputs
  isConditional: boolean;           // Has conditional logic
  conditionalGroups?: Map<string, string[]>; // Conditional groupings
}

export type ExecutionStatus = 
  | 'PENDING'
  | 'RUNNING'
  | 'PAUSED'
  | 'COMPLETED'
  | 'FAILED'
  | 'TERMINATED'
  | 'TIMEOUT'
  | 'WAITING_FOR_HUMAN';

export interface WorkflowInput {
  sessionId: string;
  userId?: string;
  input: any;
  variables?: Record<string, any>;
  resumeFromExecution?: string;
}

export interface ExecutionResult {
  executionId: string;
  status: ExecutionStatus;
  output?: any;
  
  // Execution metrics
  duration: number;
  nodesExecuted: number;
  totalNodes: number;
  
  // Outputs from specific nodes
  nodeOutputs: Map<string, any>;
  
  // Usage statistics
  usage?: {
    totalTokens: number;
    totalCost: number;
    modelUsage: Record<string, number>;
  };
  
  error?: ExecutionError;
}

// Human-in-the-loop
export interface HumanInteraction {
  id: string;
  executionId: string;
  nodeId: string;
  prompt: string;
  type: 'approval' | 'input' | 'choice' | 'confirmation';
  
  // Options
  timeout?: number;
  choices?: string[];
  required?: boolean;
  
  // Response
  response?: any;
  respondedAt?: Date;
  
  // Metadata
  createdAt: Date;
  metadata?: Record<string, any>;
}

// Error handling
export interface ExecutionError {
  nodeId?: string;
  message: string;
  stack?: string;
  errorType: 'TIMEOUT' | 'NODE_ERROR' | 'VALIDATION_ERROR' | 'SYSTEM_ERROR';
  retryable: boolean;
}

// Configuration
export interface ExecutionManagerConfig {
  // Execution settings
  maxConcurrentExecutions?: number;
  defaultTimeout?: number;
  maxRetries?: number;
  
  // Queue settings
  queueProcessingInterval?: number;
  dependencyResolutionTimeout?: number;
  
  // Human interaction
  humanInteractionTimeout?: number;
  humanInteractionRetryLimit?: number;
  
  // State persistence
  statePersistence?: {
    enabled: boolean;
    saveInterval?: number;
    storage: 'memory' | 'database' | 'redis';
  };
  
  // Performance
  parallelExecution?: {
    enabled: boolean;
    maxParallelNodes: number;
  };
  
  // Error handling
  errorRecovery?: {
    autoRetry: boolean;
    retryDelay: number;
    maxRetryAttempts: number;
  };
}
```

### Step 2: Workflow Execution Engine
Create `modules/execution/workflow-engine.ts`:

```typescript
export class WorkflowExecutionEngine {
  private config: ExecutionManagerConfig;
  private activeExecutions: Map<string, ExecutionContext> = new Map();
  private streamingManager: IStreamingManager;
  private memoryModule: IMemoryModule;
  
  constructor(
    config: ExecutionManagerConfig,
    streamingManager: IStreamingManager,
    memoryModule: IMemoryModule
  ) {
    this.config = config;
    this.streamingManager = streamingManager;
    this.memoryModule = memoryModule;
  }
  
  async executeWorkflow(
    workflow: AgentWorkflow,
    input: WorkflowInput,
    options?: ExecutionOptions
  ): Promise<ExecutionResult> {
    // Validate workflow
    const validation = await this.validateWorkflow(workflow);
    if (!validation.isValid) {
      throw new Error(`Invalid workflow: ${validation.errors.join(', ')}`);
    }
    
    // Create execution context
    const executionId = generateId('exec');
    const executionContext = await this.createExecutionContext(
      executionId,
      workflow,
      input,
      options
    );
    
    this.activeExecutions.set(executionId, executionContext);
    
    try {
      // Execute workflow
      const result = await this.runWorkflow(executionContext);
      
      // Update execution state
      executionContext.state.status = 'COMPLETED';
      executionContext.state.completedAt = new Date();
      
      // Save final state
      await this.saveExecutionState(executionContext);
      
      return result;
      
    } catch (error) {
      // Handle execution error
      executionContext.state.status = 'FAILED';
      executionContext.state.error = {
        message: error.message,
        stack: error.stack,
        errorType: 'SYSTEM_ERROR',
        retryable: true
      };
      
      await this.saveExecutionState(executionContext);
      throw error;
      
    } finally {
      this.activeExecutions.delete(executionId);
    }
  }
  
  async executeWorkflowStreaming(
    workflow: AgentWorkflow,
    input: WorkflowInput,
    streamer: IStreamer,
    options?: ExecutionOptions
  ): Promise<ExecutionResult> {
    // Similar to executeWorkflow but with streaming updates
    const executionId = generateId('exec');
    const executionContext = await this.createExecutionContext(
      executionId,
      workflow,
      input,
      options
    );
    
    executionContext.streamer = streamer;
    this.activeExecutions.set(executionId, executionContext);
    
    // Stream workflow start
    streamer.streamWorkflowStart(input.sessionId, workflow.id, workflow.name);
    
    try {
      const result = await this.runWorkflow(executionContext);
      
      // Stream workflow completion
      streamer.streamWorkflowEnd(input.sessionId, workflow.id, result.output);
      
      return result;
      
    } catch (error) {
      streamer.streamError(input.sessionId, error);
      throw error;
    } finally {
      this.activeExecutions.delete(executionId);
    }
  }
  
  private async runWorkflow(context: ExecutionContext): Promise<ExecutionResult> {
    const { workflow, state, streamer } = context;
    
    // Initialize execution queue with nodes that have no dependencies
    const startNodes = this.findStartNodes(workflow);
    state.executionQueue.push(...startNodes);
    
    // Main execution loop
    while (state.executionQueue.length > 0 && state.status === 'RUNNING') {
      const nodeId = state.executionQueue.shift()!;
      
      try {
        await this.executeNode(context, nodeId);
        
        // Update progress
        if (streamer) {
          const progress = this.calculateProgress(state, workflow.nodes.length);
          streamer.streamWorkflowProgress(
            context.input.sessionId,
            workflow.id,
            progress
          );
        }
        
        // Check for waiting nodes that can now execute
        await this.checkWaitingNodes(context);
        
      } catch (error) {
        await this.handleNodeError(context, nodeId, error);
      }
      
      // Save state periodically
      if (this.shouldSaveState(context)) {
        await this.saveExecutionState(context);
      }
    }
    
    // Final result
    return this.buildExecutionResult(context);
  }
  
  private async executeNode(context: ExecutionContext, nodeId: string): Promise<void> {
    const { workflow, state, streamer, input } = context;
    const node = workflow.nodes.find(n => n.id === nodeId);
    
    if (!node) {
      throw new Error(`Node not found: ${nodeId}`);
    }
    
    // Update state
    state.currentNode = nodeId;
    state.lastUpdated = new Date();
    
    // Stream node start
    if (streamer) {
      streamer.streamNodeStart(input.sessionId, nodeId, node.name, node.type);
    }
    
    const startTime = Date.now();
    
    try {
      // Check for human interaction requirements
      if (await this.requiresHumanInteraction(node)) {
        await this.handleHumanInteraction(context, node);
        return;
      }
      
      // Resolve node inputs
      const nodeInputs = await this.resolveNodeInputs(context, node);
      
      // Execute the node (agent)
      const nodeOutput = await this.executeNodeAgent(context, node, nodeInputs);
      
      // Store outputs
      state.nodeOutputs.set(nodeId, nodeOutput);
      state.completedNodes.push(nodeId);
      
      // Process node outputs and update waiting nodes
      await this.processNodeOutputs(context, node, nodeOutput);
      
      // Stream node completion
      if (streamer) {
        const duration = Date.now() - startTime;
        streamer.streamNodeEnd(input.sessionId, nodeId, nodeOutput, duration);
      }
      
    } catch (error) {
      state.failedNodes.push(nodeId);
      
      if (streamer) {
        streamer.streamNodeError(input.sessionId, nodeId, error);
      }
      
      throw error;
    }
  }
  
  private async executeNodeAgent(
    context: ExecutionContext,
    node: WorkflowNode,
    inputs: any
  ): Promise<any> {
    // Get agent from pool
    const agentPool = AgentHub.getInstance().getModule('agentPool');
    const agent = await agentPool.getAgent(node.type, node.data.agentConfig?.version);
    
    if (!agent) {
      throw new Error(`Agent not found for node type: ${node.type}`);
    }
    
    // Prepare agent input
    const agentInput = {
      ...inputs,
      sessionId: context.input.sessionId,
      userId: context.input.userId,
      nodeData: {
        id: node.id,
        name: node.name,
        type: node.type,
        inputs: node.data.inputs,
        outputs: node.data.outputs
      },
      workflowContext: {
        workflowId: context.workflow.id,
        executionId: context.state.executionId,
        nodeId: node.id,
        runtimeState: context.state.runtimeState
      },
      metadata: {
        executionId: context.state.executionId,
        nodeId: node.id,
        workflowId: context.workflow.id
      }
    };
    
    // Execute agent with timeout
    const timeout = node.timeout || this.config.defaultTimeout || 300000;
    
    return Promise.race([
      agent.execute(agentInput),
      this.createTimeoutPromise(timeout, `Node ${node.name} timed out`)
    ]);
  }
  
  private async resolveNodeInputs(context: ExecutionContext, node: WorkflowNode): Promise<any> {
    const { workflow, state } = context;
    const inputs: any = {};
    
    // Get input edges
    const inputEdges = workflow.edges.filter(edge => edge.target === node.id);
    
    for (const edge of inputEdges) {
      const sourceOutput = state.nodeOutputs.get(edge.source);
      
      if (sourceOutput !== undefined) {
        // Apply data transformation if specified
        let value = sourceOutput;
        
        if (edge.transform) {
          value = await this.applyDataTransform(value, edge.transform);
        }
        
        // Map to input port
        const inputKey = edge.targetHandle || 'input';
        inputs[inputKey] = value;
      }
    }
    
    // Resolve variables
    if (node.data.variables) {
      for (const varName of node.data.variables) {
        const varValue = state.variables.get(varName) || context.input.variables?.[varName];
        if (varValue !== undefined) {
          inputs[varName] = varValue;
        }
      }
    }
    
    // Add node-specific inputs
    if (node.data.inputs) {
      Object.assign(inputs, node.data.inputs);
    }
    
    return inputs;
  }
  
  private async processNodeOutputs(
    context: ExecutionContext,
    node: WorkflowNode,
    output: any
  ): Promise<void> {
    const { workflow, state } = context;
    
    // Get output edges
    const outputEdges = workflow.edges.filter(edge => edge.source === node.id);
    
    for (const edge of outputEdges) {
      // Check edge condition if specified
      if (edge.condition && !await this.evaluateCondition(edge.condition, output)) {
        continue;
      }
      
      const targetNode = edge.target;
      
      // Update waiting node
      let waitingNode = state.waitingNodes.get(targetNode);
      if (!waitingNode) {
        waitingNode = {
          nodeId: targetNode,
          expectedInputs: this.getExpectedInputs(workflow, targetNode),
          receivedInputs: new Map(),
          isConditional: this.hasConditionalInputs(workflow, targetNode)
        };
        state.waitingNodes.set(targetNode, waitingNode);
      }
      
      // Record received input
      const inputKey = edge.targetHandle || 'input';
      waitingNode.receivedInputs.set(inputKey, output);
    }
  }
  
  private async checkWaitingNodes(context: ExecutionContext): Promise<void> {
    const { state } = context;
    const readyNodes: string[] = [];
    
    for (const [nodeId, waitingNode] of state.waitingNodes.entries()) {
      if (this.isNodeReady(waitingNode)) {
        readyNodes.push(nodeId);
        state.waitingNodes.delete(nodeId);
      }
    }
    
    // Add ready nodes to execution queue
    state.executionQueue.push(...readyNodes);
  }
  
  private isNodeReady(waitingNode: WaitingNode): boolean {
    // Check if all expected inputs are received
    for (const expectedInput of waitingNode.expectedInputs) {
      if (!waitingNode.receivedInputs.has(expectedInput)) {
        return false;
      }
    }
    
    return true;
  }
  
  private findStartNodes(workflow: AgentWorkflow): string[] {
    const hasIncomingEdge = new Set(workflow.edges.map(edge => edge.target));
    return workflow.nodes
      .filter(node => !hasIncomingEdge.has(node.id))
      .map(node => node.id);
  }
  
  private calculateProgress(state: ExecutionState, totalNodes: number): WorkflowProgress {
    return {
      totalNodes,
      completedNodes: state.completedNodes.length,
      currentNode: state.currentNode || '',
      currentNodeName: '', // Would need to resolve from workflow
      percentage: (state.completedNodes.length / totalNodes) * 100,
      estimatedTimeRemaining: this.estimateTimeRemaining(state, totalNodes)
    };
  }
  
  private async handleHumanInteraction(
    context: ExecutionContext,
    node: WorkflowNode
  ): Promise<void> {
    // Pause execution for human input
    context.state.status = 'WAITING_FOR_HUMAN';
    
    const interaction: HumanInteraction = {
      id: generateId('interaction'),
      executionId: context.state.executionId,
      nodeId: node.id,
      prompt: `Approval required for node: ${node.name}`,
      type: 'approval',
      createdAt: new Date()
    };
    
    context.state.humanInteractions.push(interaction);
    
    // Stream human prompt
    if (context.streamer) {
      context.streamer.streamHumanPrompt(
        context.input.sessionId,
        interaction.prompt,
        { type: interaction.type }
      );
    }
    
    // Save state and wait for human response
    await this.saveExecutionState(context);
  }
  
  private async validateWorkflow(workflow: AgentWorkflow): Promise<ValidationResult> {
    const errors: string[] = [];
    
    // Check for cycles
    if (this.hasCycles(workflow)) {
      errors.push('Workflow contains cycles');
    }
    
    // Validate node types
    for (const node of workflow.nodes) {
      if (!await this.isValidNodeType(node.type)) {
        errors.push(`Invalid node type: ${node.type}`);
      }
    }
    
    // Validate edges
    for (const edge of workflow.edges) {
      if (!workflow.nodes.find(n => n.id === edge.source)) {
        errors.push(`Edge references non-existent source node: ${edge.source}`);
      }
      if (!workflow.nodes.find(n => n.id === edge.target)) {
        errors.push(`Edge references non-existent target node: ${edge.target}`);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  private hasCycles(workflow: AgentWorkflow): boolean {
    // Implement cycle detection using DFS
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    
    const dfs = (nodeId: string): boolean => {
      visited.add(nodeId);
      recursionStack.add(nodeId);
      
      const outgoingEdges = workflow.edges.filter(edge => edge.source === nodeId);
      
      for (const edge of outgoingEdges) {
        const targetId = edge.target;
        
        if (!visited.has(targetId)) {
          if (dfs(targetId)) {
            return true;
          }
        } else if (recursionStack.has(targetId)) {
          return true; // Cycle detected
        }
      }
      
      recursionStack.delete(nodeId);
      return false;
    };
    
    // Check all nodes
    for (const node of workflow.nodes) {
      if (!visited.has(node.id)) {
        if (dfs(node.id)) {
          return true;
        }
      }
    }
    
    return false;
  }
}
```

### Step 3: Execution Context Management
Create `modules/execution/execution-context.ts`:

```typescript
export interface ExecutionContext {
  // Core context
  state: ExecutionState;
  workflow: AgentWorkflow;
  input: WorkflowInput;
  options?: ExecutionOptions;
  
  // Streaming
  streamer?: IStreamer;
  
  // Created at
  createdAt: Date;
}

export class ExecutionContextManager {
  private contexts: Map<string, ExecutionContext> = new Map();
  private memoryModule: IMemoryModule;
  
  constructor(memoryModule: IMemoryModule) {
    this.memoryModule = memoryModule;
  }
  
  async createExecutionContext(
    executionId: string,
    workflow: AgentWorkflow,
    input: WorkflowInput,
    options?: ExecutionOptions
  ): Promise<ExecutionContext> {
    const context: ExecutionContext = {
      state: {
        executionId,
        workflowId: workflow.id,
        status: 'RUNNING',
        completedNodes: [],
        failedNodes: [],
        skippedNodes: [],
        executionQueue: [],
        waitingNodes: new Map(),
        nodeOutputs: new Map(),
        variables: new Map(Object.entries(input.variables || {})),
        runtimeState: {},
        startedAt: new Date(),
        lastUpdated: new Date(),
        humanInteractions: []
      },
      workflow,
      input,
      options,
      createdAt: new Date()
    };
    
    // Initialize variables from workflow
    if (workflow.variables) {
      for (const variable of workflow.variables) {
        if (!context.state.variables.has(variable.name)) {
          context.state.variables.set(variable.name, variable.defaultValue);
        }
      }
    }
    
    this.contexts.set(executionId, context);
    return context;
  }
  
  getExecutionContext(executionId: string): ExecutionContext | undefined {
    return this.contexts.get(executionId);
  }
  
  async saveExecutionContext(context: ExecutionContext): Promise<void> {
    // Save to memory module's runtime state
    await this.memoryModule.setRuntimeState(
      context.input.sessionId,
      {
        [`execution_${context.state.executionId}`]: {
          state: context.state,
          workflow: context.workflow,
          input: context.input,
          savedAt: new Date().toISOString()
        }
      }
    );
  }
  
  async loadExecutionContext(executionId: string, sessionId: string): Promise<ExecutionContext | null> {
    const runtimeState = await this.memoryModule.getRuntimeState(sessionId);
    const savedContext = runtimeState[`execution_${executionId}`];
    
    if (!savedContext) {
      return null;
    }
    
    // Reconstruct context
    const context: ExecutionContext = {
      state: {
        ...savedContext.state,
        waitingNodes: new Map(savedContext.state.waitingNodes),
        nodeOutputs: new Map(savedContext.state.nodeOutputs),
        variables: new Map(savedContext.state.variables)
      },
      workflow: savedContext.workflow,
      input: savedContext.input,
      createdAt: new Date(savedContext.savedAt)
    };
    
    this.contexts.set(executionId, context);
    return context;
  }
  
  removeExecutionContext(executionId: string): void {
    this.contexts.delete(executionId);
  }
}
```

### Step 4: Execution Manager Implementation
Create `modules/execution/execution-manager.ts`:

```typescript
export class ExecutionManager implements IExecutionManager {
  readonly name = 'executionManager';
  readonly version = '1.0.0';
  
  private engine: WorkflowExecutionEngine;
  private contextManager: ExecutionContextManager;
  private config: ExecutionManagerConfig;
  private initialized = false;
  
  async initialize(config: ExecutionManagerConfig): Promise<void> {
    this.config = {
      maxConcurrentExecutions: 10,
      defaultTimeout: 300000, // 5 minutes
      maxRetries: 3,
      queueProcessingInterval: 1000,
      humanInteractionTimeout: 600000, // 10 minutes
      statePersistence: {
        enabled: true,
        saveInterval: 10000,
        storage: 'memory'
      },
      parallelExecution: {
        enabled: true,
        maxParallelNodes: 5
      },
      errorRecovery: {
        autoRetry: true,
        retryDelay: 5000,
        maxRetryAttempts: 3
      },
      ...config
    };
    
    // Get required modules
    const streamingManager = AgentHub.getInstance().getModule<IStreamingManager>('streamingManager');
    const memoryModule = AgentHub.getInstance().getModule<IMemoryModule>('memory');
    
    // Initialize components
    this.contextManager = new ExecutionContextManager(memoryModule);
    this.engine = new WorkflowExecutionEngine(this.config, streamingManager, memoryModule);
    
    this.initialized = true;
  }
  
  async executeWorkflow(
    workflow: AgentWorkflow,
    input: WorkflowInput,
    options?: ExecutionOptions
  ): Promise<ExecutionResult> {
    this.ensureInitialized();
    
    // Check for resume scenario
    if (input.resumeFromExecution) {
      return this.resumeExecution(input.resumeFromExecution, input);
    }
    
    return this.engine.executeWorkflow(workflow, input, options);
  }
  
  async executeWorkflowStreaming(
    workflow: AgentWorkflow,
    input: WorkflowInput,
    streamer: IStreamer,
    options?: ExecutionOptions
  ): Promise<ExecutionResult> {
    this.ensureInitialized();
    
    return this.engine.executeWorkflowStreaming(workflow, input, streamer, options);
  }
  
  async pauseExecution(executionId: string): Promise<void> {
    const context = this.contextManager.getExecutionContext(executionId);
    if (context) {
      context.state.status = 'PAUSED';
      context.state.lastUpdated = new Date();
      await this.contextManager.saveExecutionContext(context);
    }
  }
  
  async resumeExecution(executionId: string, input?: any): Promise<ExecutionResult> {
    this.ensureInitialized();
    
    // Load execution context
    const context = await this.contextManager.loadExecutionContext(
      executionId,
      input?.sessionId || 'unknown'
    );
    
    if (!context) {
      throw new Error(`Execution context not found: ${executionId}`);
    }
    
    // Update context for resume
    if (input) {
      context.input = { ...context.input, ...input };
    }
    
    context.state.status = 'RUNNING';
    context.state.lastUpdated = new Date();
    
    // Continue execution from current state
    return this.engine.continueWorkflow(context);
  }
  
  async terminateExecution(executionId: string): Promise<void> {
    const context = this.contextManager.getExecutionContext(executionId);
    if (context) {
      context.state.status = 'TERMINATED';
      context.state.lastUpdated = new Date();
      context.state.completedAt = new Date();
      await this.contextManager.saveExecutionContext(context);
    }
  }
  
  async saveExecutionState(executionId: string, state: ExecutionState): Promise<void> {
    const context = this.contextManager.getExecutionContext(executionId);
    if (context) {
      context.state = state;
      await this.contextManager.saveExecutionContext(context);
    }
  }
  
  async loadExecutionState(executionId: string): Promise<ExecutionState | null> {
    const context = this.contextManager.getExecutionContext(executionId);
    return context?.state || null;
  }
  
  async getExecutionStatus(executionId: string): Promise<ExecutionStatus> {
    const context = this.contextManager.getExecutionContext(executionId);
    return context?.state.status || 'PENDING';
  }
  
  async pauseForHumanInput(
    executionId: string,
    prompt: string,
    options?: HumanPromptOptions
  ): Promise<void> {
    const context = this.contextManager.getExecutionContext(executionId);
    if (!context) {
      throw new Error(`Execution context not found: ${executionId}`);
    }
    
    // Create human interaction
    const interaction: HumanInteraction = {
      id: generateId('interaction'),
      executionId,
      nodeId: context.state.currentNode || '',
      prompt,
      type: options?.type || 'input',
      timeout: options?.timeout,
      choices: options?.choices,
      required: options?.required,
      createdAt: new Date(),
      metadata: options?.metadata
    };
    
    context.state.humanInteractions.push(interaction);
    context.state.status = 'WAITING_FOR_HUMAN';
    
    await this.contextManager.saveExecutionContext(context);
    
    // Stream human prompt if streamer available
    if (context.streamer) {
      context.streamer.streamHumanPrompt(context.input.sessionId, prompt, options);
    }
  }
  
  async resumeWithHumanInput(executionId: string, input: any): Promise<void> {
    const context = this.contextManager.getExecutionContext(executionId);
    if (!context) {
      throw new Error(`Execution context not found: ${executionId}`);
    }
    
    // Find pending human interaction
    const pendingInteraction = context.state.humanInteractions
      .find(hi => !hi.response);
    
    if (pendingInteraction) {
      pendingInteraction.response = input;
      pendingInteraction.respondedAt = new Date();
      
      // Stream human response
      if (context.streamer) {
        context.streamer.streamHumanResponse(context.input.sessionId, input);
      }
    }
    
    // Resume execution
    context.state.status = 'RUNNING';
    await this.contextManager.saveExecutionContext(context);
  }
  
  async validateWorkflow(workflow: AgentWorkflow): Promise<ValidationResult> {
    return this.engine.validateWorkflow(workflow);
  }
  
  async health(): Promise<HealthStatus> {
    try {
      const activeExecutions = this.contextManager.getActiveExecutionCount();
      
      return {
        status: 'healthy',
        message: 'Execution Manager operational',
        details: {
          activeExecutions,
          maxConcurrent: this.config.maxConcurrentExecutions
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
  
  async shutdown(): Promise<void> {
    // Gracefully shutdown active executions
    // Implementation depends on requirements
    this.initialized = false;
  }
  
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('Execution Manager not initialized');
    }
  }
}
```

### Step 5: Execution Manager Factory
Create `modules/execution/factory.ts`:

```typescript
import { IModuleFactory } from '../base/factory';
import { ExecutionManager } from './execution-manager';
import { ExecutionManagerConfig } from './types';

export class ExecutionManagerFactory implements IModuleFactory<ExecutionManager> {
  create(config?: ExecutionManagerConfig): ExecutionManager {
    return new ExecutionManager();
  }
}

// Export for registration
export const executionManagerFactory = new ExecutionManagerFactory();
```

## Testing Requirements

### 1. Unit Tests
- Workflow validation logic
- Node dependency resolution
- Execution queue management
- State persistence and recovery
- Human interaction handling

### 2. Integration Tests
- Full workflow execution
- Resume from failure scenarios
- Streaming execution updates
- Multi-node parallel execution
- Error recovery and retry logic

### 3. Performance Tests
- Large workflow execution
- Concurrent execution handling
- Memory usage under load
- State persistence overhead

## Usage Examples

```typescript
// Initialize execution manager
const executionManager = new ExecutionManager();
await executionManager.initialize({
  maxConcurrentExecutions: 10,
  statePersistence: { enabled: true },
  parallelExecution: { enabled: true, maxParallelNodes: 5 }
});

// Define a workflow
const workflow: AgentWorkflow = {
  id: 'data-analysis-workflow',
  name: 'Data Analysis Pipeline',
  version: '1.0.0',
  nodes: [
    {
      id: 'extract',
      type: 'llm',
      name: 'Data Extractor',
      position: { x: 0, y: 0 },
      data: { agentConfig: { name: 'extractor' } }
    },
    {
      id: 'analyze',
      type: 'llm', 
      name: 'Data Analyzer',
      position: { x: 200, y: 0 },
      data: { agentConfig: { name: 'analyzer' } }
    }
  ],
  edges: [
    {
      id: 'extract-to-analyze',
      source: 'extract',
      target: 'analyze'
    }
  ],
  variables: []
};

// Execute workflow
const result = await executionManager.executeWorkflow(workflow, {
  sessionId: 'session-123',
  input: { data: 'Sample data to analyze' }
});

// Execute with streaming
const streamer = streamingManager.getStreamer('session-123');
const streamResult = await executionManager.executeWorkflowStreaming(
  workflow,
  { sessionId: 'session-123', input: { data: 'Sample data' } },
  streamer
);

// Resume execution
const resumedResult = await executionManager.resumeExecution('exec-456');
```

## Next Steps
After completing the Execution Manager, update the session-state module (03-session-state-module-implementation.md) to support execution state persistence.