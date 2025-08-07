/**
 * @fileoverview Type definitions for the Graph Agent system
 * @module agents/graph/types
 * @requires ../base/types
 * 
 * This file defines all interfaces, types, and enums for the Graph Agent system.
 * The Graph Agent executes complex workflows as directed acyclic graphs (DAGs)
 * where each node can be an agent, tool, or transformation operation.
 * 
 * Key concepts:
 * - Graph-based workflow execution with DAG validation
 * - Node-based processing with state management
 * - Edge-based data flow and conditional routing
 * - Parallel and sequential execution strategies
 * - Dynamic graph construction and modification
 * - State checkpointing and recovery mechanisms
 * - Performance optimization through dependency analysis
 * 
 * @example
 * ```typescript
 * import { GraphAgentConfig, GraphNode, GraphEdge } from './types';
 * 
 * const config: GraphAgentConfig = {
 *   name: 'Content Pipeline',
 *   type: 'graph',
 *   execution: {
 *     strategy: 'parallel',
 *     maxConcurrency: 4
 *   },
 *   graph: {
 *     nodes: [
 *       {
 *         id: 'input',
 *         type: 'input',
 *         config: { schema: { text: 'string' } }
 *       },
 *       {
 *         id: 'analyze',
 *         type: 'agent',
 *         agentId: 'content-analyzer',
 *         config: { model: 'gpt-4' }
 *       }
 *     ],
 *     edges: [
 *       { from: 'input', to: 'analyze', condition: 'always' }
 *     ]
 *   }
 * };
 * ```
 * 
 * @see ../base/types.ts for base agent interfaces
 * @since 1.0.0
 */

import {
  AgentConfig,
  TaskInput,
  TaskOutput,
  AgentResult,
  ExecutionContext,
  ConversationTurn,
  ITool,
  ToolResult,
  ToolUsage,
  IAgent
} from '../base/types';

/**
 * Graph Agent type identifier.
 */
export type GraphAgentType = 'graph';

/**
 * Core interface for Graph Agent functionality.
 * 
 * The Graph Agent executes complex workflows represented as directed
 * acyclic graphs, where each node performs a specific operation and
 * edges define data flow and execution dependencies.
 * 
 * @public
 */
export interface IGraphAgent {
  /**
   * Executes the graph workflow with given input.
   * 
   * @param input - Graph execution input
   * @returns Promise resolving to execution result
   */
  executeGraph(input: GraphAgentInput): Promise<GraphAgentOutput>;
  
  /**
   * Streams graph execution with real-time node updates.
   * 
   * @param input - Graph execution input
   * @returns Async iterator for streaming output
   */
  stream(input: GraphAgentInput): AsyncIterableIterator<GraphAgentStreamOutput>;
  
  /**
   * Validates graph structure for cycles and dependencies.
   * 
   * @param graph - Graph definition to validate
   * @returns Validation result with issues if any
   */
  validateGraph(graph: GraphDefinition): GraphValidationResult;
  
  /**
   * Builds graph from configuration or builder pattern.
   * 
   * @param definition - Graph definition or builder function
   * @returns Built graph ready for execution
   */
  buildGraph(definition: GraphDefinition | GraphBuilder): Promise<ExecutableGraph>;
  
  /**
   * Gets current execution state for monitoring.
   * 
   * @param executionId - Execution identifier
   * @returns Current execution state
   */
  getExecutionState(executionId: string): Promise<GraphExecutionState | undefined>;
  
  /**
   * Pauses graph execution at current node.
   * 
   * @param executionId - Execution identifier
   * @returns Whether pause was successful
   */
  pauseExecution(executionId: string): Promise<boolean>;
  
  /**
   * Resumes paused graph execution.
   * 
   * @param executionId - Execution identifier
   * @returns Whether resume was successful
   */
  resumeExecution(executionId: string): Promise<boolean>;
  
  /**
   * Cancels graph execution and cleans up resources.
   * 
   * @param executionId - Execution identifier
   * @returns Whether cancellation was successful
   */
  cancelExecution(executionId: string): Promise<boolean>;
  
  /**
   * Gets graph execution history and metrics.
   * 
   * @param filters - Optional filters for history query
   * @returns Execution history with performance metrics
   */
  getExecutionHistory(filters?: ExecutionHistoryFilters): Promise<GraphExecutionHistory[]>;
  
  /**
   * Gets graph agent capabilities.
   * 
   * @returns Graph agent capabilities
   */
  getCapabilities(): GraphAgentCapabilities;
}

/**
 * Configuration for Graph Agent instances.
 * 
 * Extends base agent configuration with graph-specific settings
 * for execution strategy, node types, and performance optimization.
 */
export interface GraphAgentConfig extends AgentConfig {
  /** Agent type identifier */
  type: GraphAgentType;
  
  /** Agent name */
  name?: string;
  
  /** Agent description */
  description?: string;
  
  /** Agent version */
  version?: string;
  
  /** Available modules */
  modules?: Record<string, any>;
  
  /** Graph definition and structure */
  graph?: GraphDefinition;
  
  /** Execution configuration */
  execution?: GraphExecutionConfig;
  
  /** Node type configurations */
  nodeTypes?: NodeTypeRegistry;
  
  /** State management configuration */
  state?: GraphStateConfig;
  
  /** Performance and optimization settings */
  performance?: GraphPerformanceConfig;
  
  /** Error handling and recovery */
  errorHandling?: GraphErrorConfig;
  
  /** Monitoring and observability */
  monitoring?: GraphMonitoringConfig;
}

/**
 * Input for Graph Agent execution.
 */
export interface GraphAgentInput {
  /** Primary input data for the graph */
  data: Record<string, any>;
  
  /** Session identifier for tracking */
  sessionId: string;
  
  /** User identifier */
  userId?: string;
  
  /** Graph to execute (overrides config) */
  graph?: GraphDefinition;
  
  /** Execution-specific configuration */
  executionConfig?: Partial<GraphExecutionConfig>;
  
  /** Starting nodes (default: all root nodes) */
  startNodes?: string[];
  
  /** Target nodes to reach (default: all leaf nodes) */
  targetNodes?: string[];
  
  /** Input values for specific nodes */
  nodeInputs?: Record<string, any>;
  
  /** Execution context overrides */
  context?: Partial<GraphExecutionContext>;
  
  /** Whether to stream execution updates */
  streaming?: boolean;
  
  /** Checkpoint to resume from */
  resumeFromCheckpoint?: string;
}

/**
 * Output from Graph Agent execution.
 */
export interface GraphAgentOutput {
  /** Whether execution was successful */
  success: boolean;
  /** Final output from leaf nodes */
  result: Record<string, any>;
  
  /** Execution metadata */
  execution: GraphExecutionMetadata;
  
  /** Node execution results */
  nodeResults: Record<string, NodeExecutionResult>;
  
  /** Execution path taken through graph */
  executionPath: ExecutionStep[];
  
  /** Performance metrics */
  performance: GraphPerformanceMetrics;
  
  /** Generated checkpoints for recovery */
  checkpoints: GraphCheckpoint[];
  
  /** Any execution warnings or issues */
  warnings: GraphWarning[];
}

/**
 * Streaming output from Graph Agent execution.
 */
export interface GraphAgentStreamOutput {
  /** Current execution step */
  step: ExecutionStep;
  
  /** Node that just completed */
  completedNode?: NodeExecutionResult;
  
  /** Nodes currently executing */
  activeNodes: string[];
  
  /** Overall execution progress */
  progress: GraphExecutionProgress;
  
  /** Real-time performance metrics */
  metrics: GraphPerformanceMetrics;
  
  /** Whether execution is complete */
  completed: boolean;
}

/**
 * Graph Agent capabilities.
 */
export interface GraphAgentCapabilities {
  /** Maximum number of nodes in a graph */
  maxNodes: number;
  
  /** Maximum execution depth */
  maxDepth: number;
  
  /** Supported node types */
  supportedNodeTypes: string[];
  
  /** Supported execution strategies */
  supportedExecutionStrategies: GraphExecutionStrategy[];
  
  /** Whether parallel execution is supported */
  supportsParallelExecution: boolean;
  
  /** Whether conditional execution is supported */
  supportsConditionalExecution: boolean;
  
  /** Whether dynamic graph modification is supported */
  supportsDynamicGraphs: boolean;
  
  /** Whether state checkpointing is supported */
  supportsCheckpoints: boolean;
  
  /** Whether graph visualization is supported */
  supportsVisualization: boolean;
  
  /** Maximum concurrent node executions */
  maxConcurrentNodes: number;
}

/**
 * Complete graph definition with nodes and edges.
 */
export interface GraphDefinition {
  /** Graph identifier */
  id: string;
  
  /** Graph name and description */
  name: string;
  description?: string;
  
  /** Graph version */
  version: string;
  
  /** Graph metadata */
  metadata: GraphMetadata;
  
  /** Graph nodes */
  nodes: GraphNode[];
  
  /** Graph edges */
  edges: GraphEdge[];
  
  /** Global graph configuration */
  config?: GraphGlobalConfig;
  
  /** Input schema for the graph */
  inputSchema?: Record<string, any>;
  
  /** Output schema for the graph */
  outputSchema?: Record<string, any>;
  
  /** Graph tags for categorization */
  tags: string[];
}

/**
 * Graph node definition.
 */
export interface GraphNode {
  /** Unique node identifier */
  id: string;
  
  /** Node type */
  type: NodeType;
  
  /** Human-readable name */
  name: string;
  
  /** Node description */
  description?: string;
  
  /** Node-specific configuration */
  config: NodeConfig;
  
  /** Input schema for this node */
  inputSchema?: Record<string, any>;
  
  /** Output schema for this node */
  outputSchema?: Record<string, any>;
  
  /** Node position for visualization */
  position?: NodePosition;
  
  /** Node metadata */
  metadata?: Record<string, any>;
  
  /** Retry policy for node execution */
  retry?: NodeRetryPolicy;
  
  /** Timeout for node execution */
  timeout?: number;
  
  /** Node execution priority */
  priority?: number;
  
  /** Whether node can be executed in parallel */
  parallel?: boolean;
  
  /** Conditional execution rules */
  conditions?: NodeCondition[];
}

/**
 * Graph edge definition.
 */
export interface GraphEdge {
  /** Unique edge identifier */
  id: string;
  
  /** Source node ID */
  from: string;
  
  /** Target node ID */
  to: string;
  
  /** Edge type */
  type?: EdgeType;
  
  /** Edge label */
  label?: string;
  
  /** Condition for edge traversal */
  condition?: EdgeCondition;
  
  /** Data transformation for edge */
  transform?: EdgeTransform;
  
  /** Edge metadata */
  metadata?: Record<string, any>;
  
  /** Edge execution priority */
  priority?: number;
  
  /** Whether edge represents error handling */
  errorHandling?: boolean;
}

/**
 * Executable graph with runtime information.
 */
export interface ExecutableGraph {
  /** Original graph definition */
  definition: GraphDefinition;
  
  /** Compiled execution plan */
  executionPlan: ExecutionPlan;
  
  /** Node dependency mapping */
  dependencies: Record<string, string[]>;
  
  /** Topologically sorted nodes */
  sortedNodes: string[];
  
  /** Execution strategy */
  strategy: GraphExecutionStrategy;
  
  /** Runtime configuration */
  runtimeConfig: GraphRuntimeConfig;
  
  /** Graph validation result */
  validation: GraphValidationResult;
}

/**
 * Graph execution state management.
 */
export interface GraphExecutionState {
  /** Execution identifier */
  executionId: string;
  
  /** Current execution status */
  status: GraphExecutionStatus;
  
  /** Nodes that have completed */
  completedNodes: Set<string>;
  
  /** Nodes currently executing */
  executingNodes: Set<string>;
  
  /** Nodes waiting to execute */
  pendingNodes: Set<string>;
  
  /** Failed nodes */
  failedNodes: Set<string>;
  
  /** Node execution results */
  nodeResults: Map<string, NodeExecutionResult>;
  
  /** Current data state */
  dataState: Record<string, any>;
  
  /** Execution context */
  context: GraphExecutionContext;
  
  /** Start time */
  startTime: Date;
  
  /** Current time */
  currentTime: Date;
  
  /** Execution progress */
  progress: GraphExecutionProgress;
}

/**
 * Graph execution context.
 */
export interface GraphExecutionContext {
  /** Execution identifier */
  executionId: string;
  
  /** Session context */
  sessionId: string;
  
  /** User context */
  userId?: string;
  
  /** Execution environment */
  environment: ExecutionEnvironment;
  
  /** Available agents registry */
  agents: GraphAgentRegistry;
  
  /** Available tools registry */
  tools: GraphToolRegistry;
  
  /** State manager */
  stateManager: GraphStateManager;
  
  /** Event emitter for notifications */
  eventEmitter: GraphEventEmitter;
  
  /** Logger instance */
  logger: GraphLogger;
  
  /** Metrics collector */
  metrics: GraphMetricsCollector;
}

/**
 * Node execution result.
 */
export interface NodeExecutionResult {
  /** Node identifier */
  nodeId: string;
  
  /** Execution status */
  status: NodeExecutionStatus;
  
  /** Node output data */
  output?: any;
  
  /** Execution error if failed */
  error?: GraphNodeError;
  
  /** Execution metadata */
  metadata: NodeExecutionMetadata;
  
  /** Tools used during execution */
  toolsUsed: ToolUsage[];
  
  /** Child agent results */
  agentResult?: TaskOutput;
  
  /** Execution duration */
  duration: number;
  
  /** Resource usage */
  resourceUsage: NodeResourceUsage;
}

/**
 * Execution step in graph traversal.
 */
export interface ExecutionStep {
  /** Step identifier */
  id: string;
  
  /** Step type */
  type: ExecutionStepType;
  
  /** Node being executed */
  nodeId: string;
  
  /** Step timestamp */
  timestamp: Date;
  
  /** Step duration */
  duration?: number;
  
  /** Step status */
  status: ExecutionStepStatus;
  
  /** Step input data */
  input?: any;
  
  /** Step output data */
  output?: any;
  
  /** Step metadata */
  metadata: Record<string, any>;
}

/**
 * Graph execution configuration.
 */
export interface GraphExecutionConfig {
  /** Execution strategy */
  strategy: GraphExecutionStrategy;
  
  /** Maximum concurrent node executions */
  maxConcurrency: number;
  
  /** Global execution timeout */
  timeout: number;
  
  /** Error handling strategy */
  errorHandling: GraphErrorHandlingStrategy;
  
  /** Retry configuration */
  retry: GraphRetryConfig;
  
  /** Checkpointing configuration */
  checkpointing: GraphCheckpointConfig;
  
  /** Performance optimization settings */
  optimization: GraphOptimizationConfig;
}

/**
 * Graph state management configuration.
 */
export interface GraphStateConfig {
  /** State persistence strategy */
  persistence: GraphStatePersistence;
  
  /** State serialization format */
  serialization: GraphStateSerialization;
  
  /** State compression settings */
  compression: GraphStateCompression;
  
  /** State cleanup policy */
  cleanup: GraphStateCleanupPolicy;
  
  /** Maximum state size */
  maxSize: number;
  
  /** State versioning */
  versioning: boolean;
  
  /** Checkpointing configuration */
  checkpointing: {
    enabled: boolean;
    frequency: 'node' | 'time' | 'manual';
    interval: number;
    storage: 'memory' | 'disk' | 'remote';
    compression: 'none' | 'gzip' | 'lz4';
    retention: number;
  };
}

/**
 * Graph performance configuration.
 */
export interface GraphPerformanceConfig {
  /** Node execution pool size */
  nodePoolSize: number;
  
  /** Memory management settings */
  memory: GraphMemoryConfig;
  
  /** Execution optimization */
  optimization: GraphExecutionOptimization;
  
  /** Performance monitoring */
  monitoring: GraphPerformanceMonitoring;
  
  /** Resource limits */
  limits: GraphResourceLimits;
}

/**
 * Graph error handling configuration.
 */
export interface GraphErrorConfig {
  /** Global error handling strategy */
  strategy: GraphErrorHandlingStrategy;
  
  /** Error propagation rules */
  propagation: GraphErrorPropagation;
  
  /** Recovery mechanisms */
  recovery: GraphErrorRecovery;
  
  /** Error logging and reporting */
  reporting: GraphErrorReporting;
  
  /** Circuit breaker settings */
  circuitBreaker: GraphCircuitBreakerConfig;
}

/**
 * Graph monitoring configuration.
 */
export interface GraphMonitoringConfig {
  /** Metrics collection settings */
  metrics: GraphMetricsConfig;
  
  /** Tracing configuration */
  tracing: GraphTracingConfig;
  
  /** Logging configuration */
  logging: GraphLoggingConfig;
  
  /** Alerting rules */
  alerting: GraphAlertingConfig;
  
  /** Health check settings */
  healthCheck: GraphHealthCheckConfig;
}

// Supporting types and enums

export type NodeType = 
  | 'input'           // Input node
  | 'output'          // Output node
  | 'agent'           // Agent execution node
  | 'tool'            // Tool execution node
  | 'transform'       // Data transformation node
  | 'condition'       // Conditional logic node
  | 'parallel'        // Parallel execution node
  | 'sequential'      // Sequential execution node
  | 'merge'           // Data merging node
  | 'split'           // Data splitting node
  | 'loop'            // Loop execution node
  | 'delay'           // Delay/wait node
  | 'custom';         // Custom node type

export type EdgeType = 
  | 'data'            // Data flow edge
  | 'control'         // Control flow edge
  | 'error'           // Error handling edge
  | 'conditional'     // Conditional edge
  | 'trigger';        // Trigger edge

export type GraphExecutionStrategy = 
  | 'sequential'      // Execute nodes sequentially
  | 'parallel'        // Execute nodes in parallel where possible
  | 'hybrid'          // Mix of sequential and parallel
  | 'adaptive';       // Dynamically choose strategy

export type GraphExecutionStatus = 
  | 'pending'         // Not started
  | 'running'         // Currently executing
  | 'paused'          // Paused execution
  | 'completed'       // Successfully completed
  | 'failed'          // Failed with error
  | 'cancelled'       // Cancelled by user
  | 'timeout';        // Timed out

export type NodeExecutionStatus = 
  | 'pending'         // Waiting to execute
  | 'running'         // Currently executing
  | 'completed'       // Successfully completed
  | 'failed'          // Failed with error
  | 'skipped'         // Skipped due to conditions
  | 'cancelled'       // Cancelled
  | 'timeout';        // Timed out

export type ExecutionStepType = 
  | 'node_start'      // Node execution started
  | 'node_complete'   // Node execution completed
  | 'node_error'      // Node execution failed
  | 'edge_traverse'   // Edge traversed
  | 'condition_eval'  // Condition evaluated
  | 'checkpoint'      // Checkpoint created
  | 'recovery';       // Recovery performed

export type ExecutionStepStatus = 
  | 'started'         // Step started
  | 'completed'       // Step completed
  | 'failed'          // Step failed
  | 'skipped';        // Step skipped

export type GraphErrorHandlingStrategy = 
  | 'fail_fast'       // Stop on first error
  | 'continue'        // Continue despite errors
  | 'retry'           // Retry failed nodes
  | 'compensate'      // Execute compensation logic
  | 'custom';         // Custom error handling

export type GraphStatePersistence = 
  | 'memory'          // In-memory only
  | 'disk'            // Persistent disk storage
  | 'database'        // Database storage
  | 'distributed';    // Distributed storage

export type GraphStateSerialization = 
  | 'json'            // JSON serialization
  | 'binary'          // Binary serialization
  | 'protobuf'        // Protocol buffers
  | 'custom';         // Custom serialization

export type GraphStateCompression = 
  | 'none'            // No compression
  | 'gzip'            // GZIP compression
  | 'lz4'             // LZ4 compression
  | 'custom';         // Custom compression

// Additional supporting interfaces

export interface NodeConfig {
  /** Node-specific parameters */
  parameters?: Record<string, any>;
  
  /** Agent ID for agent nodes */
  agentId?: string;
  
  /** Tool name for tool nodes */
  toolName?: string;
  
  /** Transform function for transform nodes */
  transform?: string | Function;
  
  /** Custom node implementation */
  implementation?: string;
}

export interface NodePosition {
  x: number;
  y: number;
  z?: number;
}

export interface NodeRetryPolicy {
  maxAttempts: number;
  backoffStrategy: 'linear' | 'exponential' | 'fixed';
  initialDelay: number;
  maxDelay: number;
  retryConditions: string[];
}

export interface NodeCondition {
  type: 'input' | 'output' | 'state' | 'custom';
  expression: string;
  parameters?: Record<string, any>;
}

export interface EdgeCondition {
  type: 'always' | 'success' | 'error' | 'custom';
  expression?: string;
  parameters?: Record<string, any>;
}

export interface EdgeTransform {
  type: 'map' | 'filter' | 'reduce' | 'custom';
  function: string | Function;
  parameters?: Record<string, any>;
}

export interface ExecutionPlan {
  phases: ExecutionPhase[];
  dependencies: Record<string, string[]>;
  parallelGroups: string[][];
  criticalPath: string[];
  estimatedDuration: number;
}

export interface ExecutionPhase {
  id: string;
  nodes: string[];
  type: 'sequential' | 'parallel';
  dependencies: string[];
  estimatedDuration: number;
}

export interface GraphRuntimeConfig {
  executionTimeout: number;
  nodePoolSize: number;
  memoryLimit: number;
  cpuLimit: number;
  diskLimit: number;
  networkLimit: number;
}

export interface GraphValidationResult {
  valid: boolean;
  errors: GraphValidationError[];
  warnings: GraphValidationWarning[];
  suggestions: GraphValidationSuggestion[];
  metadata: GraphValidationMetadata;
}

export interface GraphValidationError {
  code: string;
  message: string;
  nodeId?: string;
  edgeId?: string;
  severity: 'error' | 'warning';
  details?: Record<string, any>;
}

export interface GraphValidationWarning {
  code: string;
  message: string;
  nodeId?: string;
  edgeId?: string;
  details?: Record<string, any>;
}

export interface GraphValidationSuggestion {
  code: string;
  message: string;
  nodeId?: string;
  edgeId?: string;
  suggestedFix?: string;
}

export interface GraphValidationMetadata {
  nodeCount: number;
  edgeCount: number;
  maxDepth: number;
  cyclicPaths: string[][];
  unreachableNodes: string[];
  deadEndNodes: string[];
}

export interface GraphExecutionMetadata {
  executionId: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  status: GraphExecutionStatus;
  nodeCount: number;
  completedNodes: number;
  failedNodes: number;
  strategy: GraphExecutionStrategy;
  checkpoints: number;
}

export interface GraphExecutionProgress {
  percentage: number;
  completedNodes: number;
  totalNodes: number;
  currentPhase: string;
  estimatedTimeRemaining: number;
  throughputNodes: number;
}

export interface GraphPerformanceMetrics {
  executionDuration: number;
  nodeExecutionTimes: Record<string, number>;
  parallelEfficiency: number;
  resourceUtilization: GraphResourceUtilization;
  throughput: number;
  errorRate: number;
  retryRate: number;
}

export interface GraphResourceUtilization {
  cpu: number;
  memory: number;
  disk: number;
  network: number;
  concurrentNodes: number;
}

export interface NodeExecutionMetadata {
  nodeId: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  retryCount: number;
  memoryUsage: number;
  cpuUsage: number;
}

export interface NodeResourceUsage {
  memory: number;
  cpu: number;
  disk: number;
  network: number;
  duration: number;
}

export interface GraphCheckpoint {
  id: string;
  timestamp: Date;
  executionState: Partial<GraphExecutionState>;
  dataSnapshot: Record<string, any>;
  metadata: Record<string, any>;
}

export interface GraphWarning {
  code: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  nodeId?: string;
  details?: Record<string, any>;
}

export interface ExecutionHistoryFilters {
  startDate?: Date;
  endDate?: Date;
  status?: GraphExecutionStatus[];
  nodeTypes?: NodeType[];
  executionStrategy?: GraphExecutionStrategy[];
  userId?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
}

export interface GraphExecutionHistory {
  executionId: string;
  graphId: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  status: GraphExecutionStatus;
  nodeCount: number;
  performance: GraphPerformanceMetrics;
  userId?: string;
  metadata: Record<string, any>;
}

export interface GraphMetadata {
  author: string;
  created: Date;
  updated: Date;
  tags: string[];
  category: string;
  complexity: 'simple' | 'moderate' | 'complex';
  performance: GraphPerformanceProfile;
}

export interface GraphPerformanceProfile {
  estimatedDuration: number;
  resourceIntensity: 'low' | 'medium' | 'high';
  scalability: 'linear' | 'logarithmic' | 'exponential';
  memoryConcerns: boolean;
  cpuIntensive: boolean;
}

export interface GraphGlobalConfig {
  timeout: number;
  retryPolicy: NodeRetryPolicy;
  errorHandling: GraphErrorHandlingStrategy;
  monitoring: boolean;
  logging: boolean;
  checkpointing: boolean;
}

// Registry and factory interfaces

export interface NodeTypeRegistry {
  [nodeType: string]: NodeTypeDefinition;
}

export interface NodeTypeDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
  outputSchema: Record<string, any>;
  configSchema: Record<string, any>;
  executor: NodeExecutor;
  capabilities: NodeCapabilities;
}

export interface NodeExecutor {
  execute(
    config: NodeConfig,
    input: any,
    context: GraphExecutionContext
  ): Promise<any>;
}

export interface NodeCapabilities {
  parallel: boolean;
  streaming: boolean;
  checkpointing: boolean;
  recovery: boolean;
  monitoring: boolean;
}

export interface GraphAgentRegistry {
  get(agentId: string): IAgent | undefined;
  list(): string[];
  register(agentId: string, agent: IAgent): void;
}

export interface GraphToolRegistry {
  get(toolName: string): ITool | undefined;
  list(): string[];
  execute(toolName: string, parameters: any): Promise<ToolResult>;
}

export interface GraphStateManager {
  getState(): Record<string, any>;
  setState(key: string, value: any): void;
  checkpoint(): GraphCheckpoint;
  restore(checkpoint: GraphCheckpoint): void;
}

export interface GraphEventEmitter {
  emit(event: string, data: any): void;
  on(event: string, handler: Function): void;
  off(event: string, handler: Function): void;
}

export interface GraphLogger {
  debug(message: string, data?: any): void;
  info(message: string, data?: any): void;
  warn(message: string, data?: any): void;
  error(message: string, data?: any): void;
}

export interface GraphMetricsCollector {
  recordNodeExecution(nodeId: string, duration: number, status: NodeExecutionStatus): void;
  recordResourceUsage(usage: NodeResourceUsage): void;
  getMetrics(): GraphPerformanceMetrics;
  reset(): void;
}

// Builder pattern interfaces

export interface GraphBuilder {
  addNode(node: Partial<GraphNode>): GraphBuilder;
  addEdge(edge: Partial<GraphEdge>): GraphBuilder;
  setConfig(config: Partial<GraphGlobalConfig>): GraphBuilder;
  validate(): GraphValidationResult;
  build(): GraphDefinition;
}

// Environment and execution context

export interface ExecutionEnvironment {
  agentHub: any;
  modules: Record<string, any>;
  services: Record<string, any>;
  config: Record<string, any>;
}

// Configuration interfaces for advanced features

export interface GraphRetryConfig {
  maxAttempts: number;
  backoffStrategy: 'linear' | 'exponential';
  initialDelay: number;
  maxDelay: number;
  retryableErrors: string[];
}

export interface GraphCheckpointConfig {
  enabled: boolean;
  frequency: 'node' | 'phase' | 'time';
  interval?: number;
  storage: GraphStatePersistence;
  compression: GraphStateCompression;
  retention: number;
}

export interface GraphOptimizationConfig {
  enabled: boolean;
  strategies: GraphOptimizationStrategy[];
  threshold: number;
  adaptive: boolean;
}

export type GraphOptimizationStrategy = 
  | 'node_coalescing'
  | 'parallel_expansion'
  | 'dependency_reduction'
  | 'memory_optimization'
  | 'cpu_optimization';

export interface GraphMemoryConfig {
  limit: number;
  gc: boolean;
  monitoring: boolean;
  alertThreshold: number;
}

export interface GraphExecutionOptimization {
  enabled: boolean;
  parallelism: boolean;
  nodeCoalescing: boolean;
  lazyEvaluation: boolean;
  memoization: boolean;
}

export interface GraphPerformanceMonitoring {
  enabled: boolean;
  metrics: string[];
  sampling: number;
  alerting: boolean;
  storage: GraphStatePersistence;
}

export interface GraphResourceLimits {
  maxMemory: number;
  maxCpu: number;
  maxDisk: number;
  maxNetwork: number;
  maxDuration: number;
  maxNodes: number;
}

export interface GraphErrorPropagation {
  strategy: 'immediate' | 'deferred' | 'batched';
  timeout: number;
  retryLimit: number;
}

export interface GraphErrorRecovery {
  enabled: boolean;
  strategies: GraphRecoveryStrategy[];
  checkpoints: boolean;
  compensation: boolean;
}

export type GraphRecoveryStrategy = 
  | 'retry'
  | 'skip'
  | 'substitute'
  | 'compensate'
  | 'rollback';

export interface GraphErrorReporting {
  enabled: boolean;
  destinations: string[];
  format: 'json' | 'text' | 'structured';
  includeStackTrace: boolean;
}

export interface GraphCircuitBreakerConfig {
  enabled: boolean;
  threshold: number;
  timeout: number;
  recovery: number;
}

export interface GraphMetricsConfig {
  enabled: boolean;
  collectors: string[];
  exporters: string[];
  sampling: number;
  retention: number;
}

export interface GraphTracingConfig {
  enabled: boolean;
  sampler: 'always' | 'never' | 'probabilistic';
  probability?: number;
  exporters: string[];
}

export interface GraphLoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  format: 'json' | 'text';
  destinations: string[];
  includeStack: boolean;
}

export interface GraphAlertingConfig {
  enabled: boolean;
  rules: GraphAlertRule[];
  destinations: string[];
  throttling: number;
}

export interface GraphAlertRule {
  name: string;
  condition: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  threshold: number;
  duration: number;
}

export interface GraphHealthCheckConfig {
  enabled: boolean;
  interval: number;
  timeout: number;
  checks: string[];
}

export interface GraphStateCleanupPolicy {
  enabled: boolean;
  retention: number;
  compression: boolean;
  archive: boolean;
  conditions: string[];
}

export interface GraphNodeError extends Error {
  nodeId: string;
  nodeType: NodeType;
  code: string;
  details: Record<string, any>;
  retryable: boolean;
  stack?: string;
}

/**
 * Type guard to check if an agent is a Graph Agent.
 */
export function isGraphAgent(agent: any): agent is IGraphAgent {
  return agent && 
         typeof agent === 'object' &&
         typeof agent.execute === 'function' &&
         typeof agent.stream === 'function' &&
         typeof agent.validateGraph === 'function' &&
         typeof agent.buildGraph === 'function';
}