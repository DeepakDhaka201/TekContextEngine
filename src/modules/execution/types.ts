/**
 * @fileoverview Type definitions for the Execution Manager Module
 * @module modules/execution/types
 * @requires ../registry/types
 * 
 * This file defines comprehensive types for the Execution Manager Module,
 * supporting workflow orchestration, graph-based execution, state management,
 * human-in-the-loop interactions, and resume capabilities with Flowise patterns.
 * 
 * Key concepts:
 * - AgentWorkflow: Graph-based workflow definition with nodes and edges
 * - ExecutionState: Complete runtime state for pause/resume functionality
 * - WorkflowNode: Individual execution units with agent configurations
 * - ExecutionManager: Primary interface for workflow orchestration
 * - HumanInteraction: Support for human-in-the-loop workflows
 * 
 * @example
 * ```typescript
 * import { IExecutionManager, AgentWorkflow } from './types';
 * 
 * const workflow: AgentWorkflow = {
 *   id: 'data-pipeline',
 *   name: 'Data Processing Pipeline',
 *   version: '1.0.0',
 *   nodes: [
 *     {
 *       id: 'extract',
 *       type: 'llm',
 *       name: 'Data Extractor',
 *       position: { x: 0, y: 0 },
 *       data: { agentConfig: { name: 'extractor' } }
 *     }
 *   ],
 *   edges: [],
 *   createdAt: new Date(),
 *   updatedAt: new Date()
 * };
 * ```
 * 
 * @see ../registry/types.ts for base module types
 * @since 1.0.0
 */

import { HealthStatus } from '../registry/types';

/**
 * Primary interface for the Execution Manager Module.
 * 
 * The Execution Manager orchestrates graph-based workflows with support for:
 * - Directed Acyclic Graph (DAG) execution
 * - Node dependency resolution and execution ordering
 * - Conditional branching and parallel execution
 * - Human-in-the-loop interactions with approval workflows
 * - State persistence for pause/resume capabilities
 * - Real-time progress streaming and monitoring
 * - Error handling with automatic retry policies
 * - Integration with Memory Module for state persistence
 * 
 * @remarks
 * Implementation must ensure thread safety for concurrent executions
 * and provide comprehensive error recovery mechanisms.
 * 
 * @example
 * ```typescript
 * const executionManager = new ExecutionManager();
 * await executionManager.initialize({
 *   maxConcurrentExecutions: 10,
 *   parallelExecution: { enabled: true, maxParallelNodes: 5 }
 * });
 * 
 * const result = await executionManager.executeWorkflow(workflow, {
 *   sessionId: 'sess-123',
 *   input: { data: 'Process this data' }
 * });
 * ```
 * 
 * @public
 */
export interface IExecutionManager {
  /** Module identification */
  readonly name: string;
  readonly version: string;
  
  // Lifecycle management
  /**
   * Initializes the Execution Manager with configuration.
   * 
   * @param config - Execution Manager configuration
   * @throws {ExecutionError} If initialization fails
   */
  initialize(config: ExecutionManagerConfig): Promise<void>;
  
  /**
   * Returns the health status of the Execution Manager.
   * 
   * @returns Health status with active execution metrics
   */
  health(): Promise<HealthStatus>;
  
  /**
   * Gracefully shuts down the Execution Manager.
   * 
   * Ensures all active executions are properly saved and terminated.
   */
  shutdown(): Promise<void>;
  
  // Workflow execution
  /**
   * Executes a workflow synchronously.
   * 
   * Validates the workflow, creates execution context, and orchestrates
   * node execution according to dependency graph. Supports automatic
   * retry on failures and state persistence for resume capability.
   * 
   * @param workflow - Workflow definition to execute
   * @param input - Input data and execution parameters
   * @param options - Optional execution configuration
   * @returns Promise resolving to execution results
   * @throws {ValidationError} If workflow is invalid
   * @throws {ExecutionError} If execution fails
   * 
   * @example
   * ```typescript
   * const result = await manager.executeWorkflow(workflow, {
   *   sessionId: 'sess-123',
   *   input: { query: 'Analyze this data' },
   *   variables: { maxResults: 10 }
   * });
   * ```
   */
  executeWorkflow(
    workflow: AgentWorkflow, 
    input: WorkflowInput, 
    options?: ExecutionOptions
  ): Promise<ExecutionResult>;
  
  /**
   * Executes a workflow with real-time streaming updates.
   * 
   * Provides the same functionality as executeWorkflow but streams
   * progress updates, node completions, and intermediate results
   * through the provided IStreamer interface.
   * 
   * @param workflow - Workflow definition to execute
   * @param input - Input data and execution parameters
   * @param streamer - Streaming interface for real-time updates
   * @param options - Optional execution configuration
   * @returns Promise resolving to execution results
   */
  executeWorkflowStreaming(
    workflow: AgentWorkflow, 
    input: WorkflowInput,
    streamer: IStreamer,
    options?: ExecutionOptions
  ): Promise<ExecutionResult>;
  
  // Execution control
  /**
   * Pauses an active execution.
   * 
   * Gracefully pauses execution at the next safe checkpoint,
   * saves current state, and allows for later resumption.
   * 
   * @param executionId - Unique execution identifier
   * @throws {ExecutionError} If execution cannot be paused
   */
  pauseExecution(executionId: string): Promise<void>;
  
  /**
   * Resumes a paused or failed execution.
   * 
   * Loads execution state, validates resumption point, and continues
   * execution from the last successful checkpoint. Supports providing
   * additional input for human-in-the-loop scenarios.
   * 
   * @param executionId - Unique execution identifier
   * @param input - Optional additional input data
   * @returns Promise resolving to execution results
   * @throws {ExecutionError} If execution cannot be resumed
   */
  resumeExecution(executionId: string, input?: any): Promise<ExecutionResult>;
  
  /**
   * Terminates an active execution.
   * 
   * Immediately stops execution, cleans up resources, and marks
   * execution as terminated. Cannot be resumed after termination.
   * 
   * @param executionId - Unique execution identifier
   * @throws {ExecutionError} If execution cannot be terminated
   */
  terminateExecution(executionId: string): Promise<void>;
  
  // State management
  /**
   * Saves execution state for persistence.
   * 
   * Serializes complete execution context including node outputs,
   * variables, queue state, and human interactions for later resumption.
   * 
   * @param executionId - Unique execution identifier
   * @param state - Execution state to save
   * @throws {StateError} If state cannot be saved
   */
  saveExecutionState(executionId: string, state: ExecutionState): Promise<void>;
  
  /**
   * Loads execution state from persistence.
   * 
   * Retrieves and deserializes complete execution context for
   * resumption of paused or failed executions.
   * 
   * @param executionId - Unique execution identifier
   * @returns Promise resolving to execution state or null if not found
   * @throws {StateError} If state cannot be loaded
   */
  loadExecutionState(executionId: string): Promise<ExecutionState | null>;
  
  /**
   * Gets current execution status.
   * 
   * @param executionId - Unique execution identifier
   * @returns Promise resolving to current execution status
   */
  getExecutionStatus(executionId: string): Promise<ExecutionStatus>;
  
  // Human-in-the-loop
  /**
   * Pauses execution for human input.
   * 
   * Suspends execution at current node and waits for human response.
   * Supports different interaction types: approval, input, choice, confirmation.
   * Includes timeout handling and default responses.
   * 
   * @param executionId - Unique execution identifier
   * @param prompt - Human-readable prompt message
   * @param options - Human interaction configuration
   * @throws {HumanInteractionError} If interaction setup fails
   */
  pauseForHumanInput(
    executionId: string, 
    prompt: string, 
    options?: HumanPromptOptions
  ): Promise<void>;
  
  /**
   * Resumes execution with human input.
   * 
   * Provides human response to pending interaction and continues
   * execution with the provided input data.
   * 
   * @param executionId - Unique execution identifier
   * @param input - Human-provided input data
   * @throws {HumanInteractionError} If no pending interaction exists
   */
  resumeWithHumanInput(executionId: string, input: any): Promise<void>;
  
  // Execution history
  /**
   * Gets execution history for a workflow.
   * 
   * Retrieves summary information for past executions of the
   * specified workflow, including status, duration, and results.
   * 
   * @param workflowId - Workflow identifier
   * @param limit - Maximum number of executions to return
   * @returns Promise resolving to execution summaries
   */
  getExecutionHistory(workflowId: string, limit?: number): Promise<ExecutionSummary[]>;
  
  /**
   * Gets detailed execution information.
   * 
   * Retrieves comprehensive details for a specific execution
   * including node outputs, timing information, and error details.
   * 
   * @param executionId - Unique execution identifier
   * @returns Promise resolving to detailed execution information
   */
  getExecutionDetails(executionId: string): Promise<ExecutionDetails>;
  
  // Workflow validation
  /**
   * Validates workflow definition.
   * 
   * Performs comprehensive validation including:
   * - Graph structure (no cycles, valid connections)
   * - Node type availability and configuration
   * - Variable references and dependencies
   * - Edge conditions and data transformations
   * 
   * @param workflow - Workflow definition to validate
   * @returns Promise resolving to validation results
   */
  validateWorkflow(workflow: AgentWorkflow): Promise<ValidationResult>;
}

/**
 * Workflow definition following Flowise patterns for graph-based execution.
 * 
 * Represents a complete workflow as a directed acyclic graph with nodes
 * representing agents/tasks and edges representing data flow and dependencies.
 * Includes metadata, variables, and configuration for execution.
 * 
 * @remarks
 * Workflow definitions are immutable during execution. Updates require
 * creating new workflow versions.
 * 
 * @public
 */
export interface AgentWorkflow {
  /** Unique workflow identifier */
  id: string;
  
  /** Human-readable workflow name */
  name: string;
  
  /** Optional workflow description */
  description?: string;
  
  /** Workflow version for change tracking */
  version: string;
  
  // Graph structure
  /** Array of workflow nodes (agents/tasks) */
  nodes: WorkflowNode[];
  
  /** Array of edges defining data flow and dependencies */
  edges: WorkflowEdge[];
  
  // Configuration
  /** Workflow-level variables with default values */
  variables?: Variable[];
  
  /** Workflow execution settings and preferences */
  settings?: WorkflowSettings;
  
  // Metadata
  /** Tags for workflow categorization and search */
  tags?: string[];
  
  /** Workflow category for organization */
  category?: string;
  
  /** Creation timestamp */
  createdAt: Date;
  
  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * Individual node in the workflow graph representing an agent or task.
 * 
 * Each node encapsulates:
 * - Agent configuration and parameters
 * - Input/output port definitions
 * - Execution policies (retry, timeout)
 * - Visual positioning for graph editors
 * 
 * @public
 */
export interface WorkflowNode {
  /** Unique node identifier within the workflow */
  id: string;
  
  /** Agent type or special node type identifier */
  type: string;
  
  /** Human-readable node name */
  name: string;
  
  /** Optional node description */
  description?: string;
  
  // Visual positioning for graph editors
  /** Node position in visual graph editor */
  position: { x: number; y: number };
  
  // Node configuration
  /** Node-specific data including agent configuration */
  data: NodeData;
  
  // Execution configuration
  /** Retry policy for failed executions */
  retryPolicy?: RetryPolicy;
  
  /** Execution timeout in milliseconds */
  timeout?: number;
  
  /** Whether to skip this node if it encounters errors */
  skipOnError?: boolean;
}

/**
 * Edge connecting two nodes in the workflow graph.
 * 
 * Defines data flow, dependencies, and conditional execution between nodes.
 * Supports data transformation and conditional branching based on node outputs.
 * 
 * @public
 */
export interface WorkflowEdge {
  /** Unique edge identifier */
  id: string;
  
  /** Source node identifier */
  source: string;
  
  /** Target node identifier */
  target: string;
  
  /** Source node output port (optional) */
  sourceHandle?: string;
  
  /** Target node input port (optional) */
  targetHandle?: string;
  
  // Conditional execution
  /** Condition for conditional edge execution */
  condition?: EdgeCondition;
  
  // Data transformation
  /** Data transformation to apply during edge traversal */
  transform?: DataTransform;
  
  // Metadata
  /** Human-readable edge label */
  label?: string;
  
  /** Whether edge should be animated in visual editor */
  animated?: boolean;
}

/**
 * Node-specific configuration and data.
 * 
 * Contains agent configuration, input/output mappings, and runtime settings
 * specific to the node type and its role in the workflow.
 * 
 * @public
 */
export interface NodeData {
  // Agent configuration
  /** Configuration object passed to the agent */
  agentConfig?: any;
  
  // Input/output mapping
  /** Static input values for the node */
  inputs?: Record<string, any>;
  
  /** Expected output structure definition */
  outputs?: Record<string, any>;
  
  // Node-specific settings
  /** Additional settings for node behavior */
  settings?: Record<string, any>;
  
  // Variable references
  /** List of workflow variables used by this node */
  variables?: string[];
}

/**
 * Complete execution state for a workflow run.
 * 
 * Captures all runtime information needed to pause, resume, and monitor
 * workflow execution. Includes node outputs, execution progress, errors,
 * and human interaction history.
 * 
 * @remarks
 * State is persisted automatically during execution for crash recovery
 * and manual pause/resume operations.
 * 
 * @public
 */
export interface ExecutionState {
  /** Unique execution identifier */
  executionId: string;
  
  /** Source workflow identifier */
  workflowId: string;
  
  /** Current execution status */
  status: ExecutionStatus;
  
  // Progress tracking
  /** Currently executing node ID */
  currentNode?: string;
  
  /** List of successfully completed node IDs */
  completedNodes: string[];
  
  /** List of failed node IDs */
  failedNodes: string[];
  
  /** List of skipped node IDs */
  skippedNodes: string[];
  
  // Execution queue and waiting nodes
  /** Queue of nodes ready for execution */
  executionQueue: string[];
  
  /** Nodes waiting for dependencies to complete */
  waitingNodes: Map<string, WaitingNode>;
  
  // Runtime data
  /** Outputs from completed nodes */
  nodeOutputs: Map<string, any>;
  
  /** Current workflow variable values */
  variables: Map<string, any>;
  
  /** Additional runtime state data */
  runtimeState: Record<string, any>;
  
  // Timing information
  /** Execution start timestamp */
  startedAt: Date;
  
  /** Last state update timestamp */
  lastUpdated: Date;
  
  /** Execution completion timestamp */
  completedAt?: Date;
  
  // Error information
  /** Current execution error if any */
  error?: ExecutionError;
  
  // Human interaction
  /** History of human interactions during execution */
  humanInteractions: HumanInteraction[];
}

/**
 * Node waiting for dependencies to complete.
 * 
 * Tracks expected inputs and received inputs for dependency resolution.
 * Supports conditional execution where not all inputs may be required.
 * 
 * @public
 */
export interface WaitingNode {
  /** Node identifier */
  nodeId: string;
  
  /** Set of expected input connection identifiers */
  expectedInputs: Set<string>;
  
  /** Map of received inputs with their values */
  receivedInputs: Map<string, any>;
  
  /** Whether this node has conditional logic */
  isConditional: boolean;
  
  /** Conditional input groupings */
  conditionalGroups?: Map<string, string[]>;
}

/**
 * Execution status enumeration.
 * 
 * Represents the current state of a workflow execution with clear
 * transitions between states for proper lifecycle management.
 * 
 * @public
 */
export type ExecutionStatus = 
  | 'PENDING'           // Execution queued but not started
  | 'RUNNING'           // Currently executing
  | 'PAUSED'            // Manually paused
  | 'COMPLETED'         // Successfully completed
  | 'FAILED'            // Failed with unrecoverable error
  | 'TERMINATED'        // Manually terminated
  | 'TIMEOUT'           // Exceeded execution timeout
  | 'WAITING_FOR_HUMAN'; // Waiting for human interaction

/**
 * Input data for workflow execution.
 * 
 * Contains session context, input data, variables, and resume options
 * for workflow execution initialization.
 * 
 * @public
 */
export interface WorkflowInput {
  /** Session identifier for context and state persistence */
  sessionId: string;
  
  /** Optional user identifier for access control */
  userId?: string;
  
  /** Primary input data for the workflow */
  input: any;
  
  /** Variable values to override workflow defaults */
  variables?: Record<string, any>;
  
  /** Execution ID to resume from (for pause/resume scenarios) */
  resumeFromExecution?: string;
}

/**
 * Execution configuration options.
 * 
 * Optional parameters to customize execution behavior including
 * timeouts, retry policies, and performance settings.
 * 
 * @public
 */
export interface ExecutionOptions {
  /** Override default execution timeout */
  timeout?: number;
  
  /** Override default retry policy */
  retryPolicy?: RetryPolicy;
  
  /** Enable/disable parallel execution */
  enableParallelExecution?: boolean;
  
  /** Maximum number of parallel nodes */
  maxParallelNodes?: number;
  
  /** Enable/disable state persistence */
  statePersistence?: boolean;
  
  /** Custom metadata for execution */
  metadata?: Record<string, any>;
}

/**
 * Comprehensive execution results.
 * 
 * Contains execution outcomes, metrics, usage statistics, and detailed
 * information about the workflow run for analysis and debugging.
 * 
 * @public
 */
export interface ExecutionResult {
  /** Unique execution identifier */
  executionId: string;
  
  /** Final execution status */
  status: ExecutionStatus;
  
  /** Primary execution output */
  output?: any;
  
  // Execution metrics
  /** Total execution duration in milliseconds */
  duration: number;
  
  /** Number of nodes successfully executed */
  nodesExecuted: number;
  
  /** Total number of nodes in the workflow */
  totalNodes: number;
  
  // Outputs from specific nodes
  /** Map of node outputs by node ID */
  nodeOutputs: Map<string, any>;
  
  // Usage statistics
  /** Token and cost usage statistics */
  usage?: {
    totalTokens: number;
    totalCost: number;
    modelUsage: Record<string, number>;
  };
  
  /** Execution error if failed */
  error?: ExecutionError;
}

/**
 * Human interaction record.
 * 
 * Captures human-in-the-loop interactions including prompts, responses,
 * and timing information for workflow approval and input scenarios.
 * 
 * @public
 */
export interface HumanInteraction {
  /** Unique interaction identifier */
  id: string;
  
  /** Associated execution identifier */
  executionId: string;
  
  /** Node that triggered the interaction */
  nodeId: string;
  
  /** Human-readable prompt message */
  prompt: string;
  
  /** Type of interaction required */
  type: 'approval' | 'input' | 'choice' | 'confirmation';
  
  // Options
  /** Interaction timeout in milliseconds */
  timeout?: number;
  
  /** Available choices for choice-type interactions */
  choices?: string[];
  
  /** Whether response is required */
  required?: boolean;
  
  // Response
  /** Human-provided response */
  response?: any;
  
  /** Timestamp when response was provided */
  respondedAt?: Date;
  
  // Metadata
  /** Interaction creation timestamp */
  createdAt: Date;
  
  /** Additional interaction metadata */
  metadata?: Record<string, any>;
}

/**
 * Human prompt configuration options.
 * 
 * Configuration for human-in-the-loop interactions including
 * interaction type, timeout settings, and available choices.
 * 
 * @public
 */
export interface HumanPromptOptions {
  /** Type of human interaction */
  type?: 'approval' | 'input' | 'choice' | 'confirmation';
  
  /** Interaction timeout in milliseconds */
  timeout?: number;
  
  /** Available choices for selection */
  choices?: string[];
  
  /** Whether response is required */
  required?: boolean;
  
  /** Additional metadata for the interaction */
  metadata?: Record<string, any>;
}

/**
 * Execution error information.
 * 
 * Comprehensive error details including location, type, recovery options,
 * and debugging information for execution failures.
 * 
 * @public
 */
export interface ExecutionError {
  /** Node where error occurred (if applicable) */
  nodeId?: string;
  
  /** Error message */
  message: string;
  
  /** Error stack trace */
  stack?: string;
  
  /** Error classification for handling */
  errorType: 'TIMEOUT' | 'NODE_ERROR' | 'VALIDATION_ERROR' | 'SYSTEM_ERROR';
  
  /** Whether error is retryable */
  retryable: boolean;
}

/**
 * Execution Manager configuration.
 * 
 * Comprehensive configuration for execution behavior including
 * performance limits, error handling, human interaction settings,
 * and state persistence options.
 * 
 * @public
 */
export interface ExecutionManagerConfig {
  // Execution settings
  /** Maximum number of concurrent executions */
  maxConcurrentExecutions?: number;
  
  /** Default node execution timeout in milliseconds */
  defaultTimeout?: number;
  
  /** Default maximum retry attempts */
  maxRetries?: number;
  
  // Queue settings
  /** Queue processing interval in milliseconds */
  queueProcessingInterval?: number;
  
  /** Dependency resolution timeout in milliseconds */
  dependencyResolutionTimeout?: number;
  
  // Human interaction
  /** Default human interaction timeout in milliseconds */
  humanInteractionTimeout?: number;
  
  /** Maximum retry attempts for human interactions */
  humanInteractionRetryLimit?: number;
  
  // State persistence
  /** State persistence configuration */
  statePersistence?: {
    enabled: boolean;
    saveInterval?: number;
    storage: 'memory' | 'database' | 'redis';
  };
  
  // Performance
  /** Parallel execution configuration */
  parallelExecution?: {
    enabled: boolean;
    maxParallelNodes: number;
  };
  
  // Error handling
  /** Error recovery configuration */
  errorRecovery?: {
    autoRetry: boolean;
    retryDelay: number;
    maxRetryAttempts: number;
  };
}

/**
 * Retry policy for node execution.
 * 
 * Defines retry behavior for failed node executions including
 * attempt limits, delay strategies, and condition checking.
 * 
 * @public
 */
export interface RetryPolicy {
  /** Maximum number of retry attempts */
  maxAttempts: number;
  
  /** Base delay between retries in milliseconds */
  baseDelay: number;
  
  /** Delay multiplier for exponential backoff */
  multiplier?: number;
  
  /** Maximum delay between retries */
  maxDelay?: number;
  
  /** Whether to retry on specific error types */
  retryOn?: string[];
}

/**
 * Edge condition for conditional execution.
 * 
 * Defines conditions that must be met for an edge to be traversed
 * and its target node to be executed.
 * 
 * @public
 */
export interface EdgeCondition {
  /** Condition type */
  type: 'expression' | 'property' | 'custom';
  
  /** Condition expression or property path */
  condition: string;
  
  /** Expected value for comparison */
  value?: any;
  
  /** Comparison operator */
  operator?: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'exists';
}

/**
 * Data transformation for edge traversal.
 * 
 * Defines transformations to apply to data as it flows
 * from source to target nodes through edges.
 * 
 * @public
 */
export interface DataTransform {
  /** Transformation type */
  type: 'mapping' | 'filter' | 'custom';
  
  /** Transformation configuration */
  config: any;
}

/**
 * Workflow variable definition.
 * 
 * Defines workflow-level variables with types, default values,
 * and validation constraints.
 * 
 * @public
 */
export interface Variable {
  /** Variable name */
  name: string;
  
  /** Variable type */
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  
  /** Default value */
  defaultValue?: any;
  
  /** Human-readable description */
  description?: string;
  
  /** Whether variable is required */
  required?: boolean;
}

/**
 * Workflow execution settings.
 * 
 * Global settings that apply to the entire workflow execution
 * including timeouts, retry policies, and behavior preferences.
 * 
 * @public
 */
export interface WorkflowSettings {
  /** Global execution timeout */
  timeout?: number;
  
  /** Global retry policy */
  retryPolicy?: RetryPolicy;
  
  /** Enable parallel execution */
  parallelExecution?: boolean;
  
  /** Enable human interactions */
  humanInteractionEnabled?: boolean;
  
  /** Additional settings */
  [key: string]: any;
}

/**
 * Workflow validation result.
 * 
 * Contains validation status and detailed error information
 * for workflow structure and configuration validation.
 * 
 * @public
 */
export interface ValidationResult {
  /** Whether workflow is valid */
  isValid: boolean;
  
  /** List of validation errors */
  errors: string[];
  
  /** List of validation warnings */
  warnings?: string[];
}

/**
 * Execution summary for history tracking.
 * 
 * Brief summary of a workflow execution for history lists
 * and analytics without full execution details.
 * 
 * @public
 */
export interface ExecutionSummary {
  /** Execution identifier */
  executionId: string;
  
  /** Workflow identifier */
  workflowId: string;
  
  /** Final execution status */
  status: ExecutionStatus;
  
  /** Execution start time */
  startedAt: Date;
  
  /** Execution duration in milliseconds */
  duration: number;
  
  /** Number of nodes executed */
  nodesExecuted: number;
  
  /** Brief error message if failed */
  errorMessage?: string;
}

/**
 * Detailed execution information.
 * 
 * Comprehensive execution details for analysis and debugging
 * including full node outputs, timing, and interaction history.
 * 
 * @public
 */
export interface ExecutionDetails {
  /** Execution identifier */
  executionId: string;
  
  /** Complete execution state */
  state: ExecutionState;
  
  /** Source workflow definition */
  workflow: AgentWorkflow;
  
  /** Original input data */
  input: WorkflowInput;
  
  /** Final execution result */
  result: ExecutionResult;
  
  /** Detailed timing information per node */
  nodeTimings: Record<string, { start: Date; end: Date; duration: number }>;
}

/**
 * Workflow progress information for streaming.
 * 
 * Real-time progress updates for workflow execution monitoring
 * including completion percentage and time estimates.
 * 
 * @public
 */
export interface WorkflowProgress {
  /** Total number of nodes in workflow */
  totalNodes: number;
  
  /** Number of completed nodes */
  completedNodes: number;
  
  /** Currently executing node ID */
  currentNode: string;
  
  /** Currently executing node name */
  currentNodeName: string;
  
  /** Completion percentage (0-100) */
  percentage: number;
  
  /** Estimated time remaining in milliseconds */
  estimatedTimeRemaining?: number;
}

/**
 * Streaming interface for real-time execution updates.
 * 
 * Interface for streaming execution progress, node completions,
 * and human interactions to clients in real-time.
 * 
 * @remarks
 * Implementation should be provided by the Streaming Manager Module.
 * 
 * @public
 */
export interface IStreamer {
  /**
   * Streams workflow start event.
   * 
   * @param sessionId - Session identifier
   * @param workflowId - Workflow identifier
   * @param workflowName - Workflow name
   */
  streamWorkflowStart(sessionId: string, workflowId: string, workflowName: string): void;
  
  /**
   * Streams workflow completion event.
   * 
   * @param sessionId - Session identifier
   * @param workflowId - Workflow identifier
   * @param output - Final workflow output
   */
  streamWorkflowEnd(sessionId: string, workflowId: string, output: any): void;
  
  /**
   * Streams workflow progress update.
   * 
   * @param sessionId - Session identifier
   * @param workflowId - Workflow identifier
   * @param progress - Progress information
   */
  streamWorkflowProgress(sessionId: string, workflowId: string, progress: WorkflowProgress): void;
  
  /**
   * Streams node start event.
   * 
   * @param sessionId - Session identifier
   * @param nodeId - Node identifier
   * @param nodeName - Node name
   * @param nodeType - Node type
   */
  streamNodeStart(sessionId: string, nodeId: string, nodeName: string, nodeType: string): void;
  
  /**
   * Streams node completion event.
   * 
   * @param sessionId - Session identifier
   * @param nodeId - Node identifier
   * @param output - Node output
   * @param duration - Node execution duration
   */
  streamNodeEnd(sessionId: string, nodeId: string, output: any, duration: number): void;
  
  /**
   * Streams node error event.
   * 
   * @param sessionId - Session identifier
   * @param nodeId - Node identifier
   * @param error - Error information
   */
  streamNodeError(sessionId: string, nodeId: string, error: any): void;
  
  /**
   * Streams human prompt event.
   * 
   * @param sessionId - Session identifier
   * @param prompt - Human prompt message
   * @param options - Prompt options
   */
  streamHumanPrompt(sessionId: string, prompt: string, options?: any): void;
  
  /**
   * Streams human response event.
   * 
   * @param sessionId - Session identifier
   * @param response - Human response data
   */
  streamHumanResponse(sessionId: string, response: any): void;
  
  /**
   * Streams general error event.
   * 
   * @param sessionId - Session identifier
   * @param error - Error information
   */
  streamError(sessionId: string, error: any): void;
}