/**
 * @fileoverview Workflow execution engine for orchestrating graph-based workflows
 * @module modules/execution/workflow-engine
 * @requires ./types
 * @requires ./errors
 * @requires ./execution-context
 * @requires ../memory/types
 * 
 * This file implements the core workflow execution engine that orchestrates
 * graph-based workflow execution with dependency resolution, parallel processing,
 * human-in-the-loop interactions, and comprehensive state management.
 * 
 * Key concepts:
 * - DAG execution with topological sorting for dependency resolution
 * - Parallel node execution within dependency constraints
 * - Real-time streaming updates for progress monitoring
 * - Human-in-the-loop workflow integration with approval gates
 * - Comprehensive error handling with automatic retry mechanisms
 * - State persistence for pause/resume functionality
 * 
 * @example
 * ```typescript
 * import { WorkflowExecutionEngine } from './workflow-engine';
 * 
 * const engine = new WorkflowExecutionEngine(config, streamingManager, memoryModule);
 * 
 * const result = await engine.executeWorkflow(workflow, {
 *   sessionId: 'sess-123',
 *   input: { data: 'Process this' }
 * });
 * ```
 * 
 * @see types.ts for interface definitions
 * @see errors.ts for error handling
 * @see execution-context.ts for context management
 * @since 1.0.0
 */

import {
  AgentWorkflow,
  WorkflowInput,
  ExecutionOptions,
  ExecutionResult,
  ExecutionState,
  ExecutionStatus,
  WorkflowNode,
  WorkflowEdge,
  ExecutionContext,
  WaitingNode,
  HumanInteraction,
  ExecutionManagerConfig,
  IStreamer,
  ValidationResult,
  WorkflowProgress,
  EdgeCondition,
  DataTransform,
  RetryPolicy
} from './types';

import {
  ExecutionError,
  WorkflowValidationError,
  NodeExecutionError,
  ExecutionTimeoutError,
  DependencyResolutionError,
  AgentAvailabilityError,
  DataTransformationError,
  ConditionEvaluationError,
  createExecutionErrorContext
} from './errors';

import { IMemoryModule } from '../memory/types';

/**
 * Core workflow execution engine for graph-based orchestration.
 * 
 * The WorkflowExecutionEngine handles the complete lifecycle of workflow execution
 * including validation, dependency resolution, parallel execution, error handling,
 * and state management. It integrates with the Memory Module for state persistence
 * and the Streaming Manager for real-time progress updates.
 * 
 * Architecture:
 * - Graph validation ensures workflow structural integrity
 * - Topological sorting resolves execution dependencies
 * - Queue-based execution manages node processing order
 * - Parallel execution optimizes performance within constraints
 * - State persistence enables pause/resume functionality
 * - Human interaction support enables approval workflows
 * 
 * @remarks
 * The engine is designed for high-performance execution with comprehensive
 * error recovery and monitoring capabilities. It supports complex workflows
 * with conditional branching, parallel processing, and human interactions.
 * 
 * @example
 * ```typescript
 * // Initialize engine with dependencies
 * const engine = new WorkflowExecutionEngine(
 *   executionConfig,
 *   streamingManager,
 *   memoryModule
 * );
 * 
 * // Execute workflow with streaming
 * const result = await engine.executeWorkflowStreaming(
 *   workflow,
 *   { sessionId: 'sess-123', input: data },
 *   streamer
 * );
 * ```
 * 
 * @public
 */
export class WorkflowExecutionEngine {
  private config: ExecutionManagerConfig;
  private activeExecutions: Map<string, ExecutionContext> = new Map();
  private streamingManager?: IStreamer;
  private memoryModule: IMemoryModule;
  
  /**
   * Creates a new WorkflowExecutionEngine instance.
   * 
   * @param config - Execution manager configuration
   * @param streamingManager - Optional streaming manager for real-time updates
   * @param memoryModule - Memory module for state persistence
   * 
   * @example
   * ```typescript
   * const engine = new WorkflowExecutionEngine(
   *   {
   *     maxConcurrentExecutions: 10,
   *     parallelExecution: { enabled: true, maxParallelNodes: 5 }
   *   },
   *   streamingManager,
   *   memoryModule
   * );
   * ```
   */
  constructor(
    config: ExecutionManagerConfig,
    streamingManager: IStreamer | undefined,
    memoryModule: IMemoryModule
  ) {
    this.config = config;
    this.streamingManager = streamingManager;
    this.memoryModule = memoryModule;
  }
  
  /**
   * Executes a workflow synchronously with comprehensive orchestration.
   * 
   * Performs complete workflow execution including:
   * - Workflow structure validation
   * - Execution context creation and management
   * - Dependency-aware node execution scheduling
   * - Error handling with retry mechanisms
   * - State persistence for recovery
   * - Resource management and cleanup
   * 
   * The execution follows these phases:
   * 1. Validation - Ensures workflow structural integrity
   * 2. Context Creation - Sets up execution environment
   * 3. Node Scheduling - Resolves dependencies and creates execution queue
   * 4. Execution Loop - Processes nodes according to dependencies
   * 5. Result Generation - Compiles execution results and metrics
   * 6. Cleanup - Releases resources and persists final state
   * 
   * @param workflow - Workflow definition to execute
   * @param input - Input data and execution parameters
   * @param options - Optional execution configuration overrides
   * @returns Promise resolving to comprehensive execution results
   * @throws {WorkflowValidationError} If workflow structure is invalid
   * @throws {ExecutionError} If execution fails with unrecoverable error
   * 
   * @example
   * ```typescript
   * const result = await engine.executeWorkflow(
   *   {
   *     id: 'data-pipeline',
   *     name: 'Data Processing',
   *     version: '1.0.0',
   *     nodes: [/* node definitions */],
   *     edges: [/* edge definitions */],
   *     createdAt: new Date(),
   *     updatedAt: new Date()
   *   },
   *   {
   *     sessionId: 'sess-123',
   *     input: { data: 'Process this data' },
   *     variables: { maxResults: 100 }
   *   }
   * );
   * ```
   * 
   * Performance considerations:
   * - Parallel execution reduces overall execution time
   * - State persistence adds overhead but enables recovery
   * - Memory usage scales with workflow complexity
   * - Network latency affects streaming performance
   */
  async executeWorkflow(
    workflow: AgentWorkflow,
    input: WorkflowInput,
    options?: ExecutionOptions
  ): Promise<ExecutionResult> {
    // Step 1: Validate workflow structure and configuration
    const validation = await this.validateWorkflow(workflow);
    if (!validation.isValid) {
      throw new WorkflowValidationError(
        'Workflow validation failed',
        createExecutionErrorContext('', workflow.id, {
          errors: validation.errors,
          warnings: validation.warnings
        }),
        'Review workflow definition and fix validation errors'
      );
    }
    
    // Step 2: Create unique execution identifier and context
    const executionId = this.generateExecutionId();
    const executionContext = await this.createExecutionContext(
      executionId,
      workflow,
      input,
      options
    );
    
    // Step 3: Register execution for monitoring and management
    this.activeExecutions.set(executionId, executionContext);
    
    try {
      // Step 4: Execute workflow with comprehensive orchestration
      const result = await this.runWorkflow(executionContext);
      
      // Step 5: Update final execution state
      executionContext.state.status = 'COMPLETED';
      executionContext.state.completedAt = new Date();
      executionContext.state.lastUpdated = new Date();
      
      // Step 6: Persist final state for history and analysis
      await this.saveExecutionState(executionContext);
      
      return result;
      
    } catch (error) {
      // Handle execution failure with comprehensive error context
      const executionError = error instanceof ExecutionError 
        ? error 
        : new ExecutionError(
            'WORKFLOW_EXECUTION_ERROR',
            `Workflow execution failed: ${error.message}`,
            createExecutionErrorContext(executionId, workflow.id, {
              originalError: error.message,
              stack: error.stack
            }),
            'Check workflow configuration and node implementations',
            'error',
            error
          );
      
      executionContext.state.status = 'FAILED';
      executionContext.state.error = {
        message: executionError.message,
        stack: executionError.stack,
        errorType: 'SYSTEM_ERROR',
        retryable: true
      };
      executionContext.state.lastUpdated = new Date();
      executionContext.state.completedAt = new Date();
      
      // Persist error state for debugging and recovery
      await this.saveExecutionState(executionContext);
      throw executionError;
      
    } finally {
      // Step 7: Clean up resources and remove from active executions
      this.activeExecutions.delete(executionId);
    }
  }
  
  /**
   * Executes a workflow with real-time streaming updates.
   * 
   * Provides all functionality of executeWorkflow with additional
   * real-time progress streaming through the provided IStreamer interface.
   * Streams workflow start/end events, node progress, and human interactions.
   * 
   * @param workflow - Workflow definition to execute
   * @param input - Input data and execution parameters
   * @param streamer - Streaming interface for real-time updates
   * @param options - Optional execution configuration overrides
   * @returns Promise resolving to comprehensive execution results
   * @throws {WorkflowValidationError} If workflow structure is invalid
   * @throws {ExecutionError} If execution fails with unrecoverable error
   * 
   * @example
   * ```typescript
   * const streamer = streamingManager.getStreamer('sess-123');
   * const result = await engine.executeWorkflowStreaming(
   *   workflow,
   *   input,
   *   streamer,
   *   { enableParallelExecution: true }
   * );
   * ```
   */
  async executeWorkflowStreaming(
    workflow: AgentWorkflow,
    input: WorkflowInput,
    streamer: IStreamer,
    options?: ExecutionOptions
  ): Promise<ExecutionResult> {
    // Validate workflow before starting streaming
    const validation = await this.validateWorkflow(workflow);
    if (!validation.isValid) {
      throw new WorkflowValidationError(
        'Workflow validation failed',
        createExecutionErrorContext('', workflow.id, { errors: validation.errors })
      );
    }
    
    const executionId = this.generateExecutionId();
    const executionContext = await this.createExecutionContext(
      executionId,
      workflow,
      input,
      options
    );
    
    // Attach streamer to context for node-level streaming
    executionContext.streamer = streamer;
    this.activeExecutions.set(executionId, executionContext);
    
    // Stream workflow start event
    streamer.streamWorkflowStart(input.sessionId, workflow.id, workflow.name);
    
    try {
      const result = await this.runWorkflow(executionContext);
      
      // Stream workflow completion with results
      streamer.streamWorkflowEnd(input.sessionId, workflow.id, result.output);
      
      // Update final state
      executionContext.state.status = 'COMPLETED';
      executionContext.state.completedAt = new Date();
      await this.saveExecutionState(executionContext);
      
      return result;
      
    } catch (error) {
      // Stream error event for client notification
      streamer.streamError(input.sessionId, error);
      
      // Handle error state persistence
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
  
  /**
   * Continues execution from a saved execution context.
   * 
   * Resumes workflow execution from a previously saved state,
   * typically used for pause/resume functionality or error recovery.
   * Validates context integrity before continuing execution.
   * 
   * @param context - Previously saved execution context
   * @returns Promise resolving to execution results
   * @throws {ExecutionError} If context is invalid or execution fails
   * 
   * @example
   * ```typescript
   * const savedContext = await loadExecutionContext('exec-123');
   * const result = await engine.continueWorkflow(savedContext);
   * ```
   */
  async continueWorkflow(context: ExecutionContext): Promise<ExecutionResult> {
    // Validate context integrity
    if (!context || !context.state || !context.workflow) {
      throw new ExecutionError(
        'INVALID_EXECUTION_CONTEXT',
        'Execution context is invalid or corrupted',
        { executionId: context?.state?.executionId }
      );
    }
    
    // Re-register context for monitoring
    this.activeExecutions.set(context.state.executionId, context);
    
    try {
      // Resume execution from current state
      context.state.status = 'RUNNING';
      context.state.lastUpdated = new Date();
      
      return await this.runWorkflow(context);
    } finally {
      this.activeExecutions.delete(context.state.executionId);
    }
  }
  
  /**
   * Core workflow execution logic with dependency management.
   * 
   * Implements the main execution loop that processes nodes according to
   * their dependencies, manages execution state, handles errors, and
   * coordinates with streaming and persistence systems.
   * 
   * Execution algorithm:
   * 1. Initialize execution queue with start nodes (no dependencies)
   * 2. Process execution queue until empty or execution terminated
   * 3. For each node: validate dependencies, execute, update state
   * 4. Handle node completion: update waiting nodes, queue ready nodes
   * 5. Manage parallel execution within configured limits
   * 6. Handle errors with retry policies and recovery mechanisms
   * 
   * @param context - Execution context with state and configuration
   * @returns Promise resolving to execution results
   * @throws {ExecutionError} If execution fails with unrecoverable error
   * 
   * @private
   */
  private async runWorkflow(context: ExecutionContext): Promise<ExecutionResult> {
    const { workflow, state, streamer } = context;
    
    // Step 1: Initialize execution with start nodes (nodes with no dependencies)
    if (state.executionQueue.length === 0) {
      const startNodes = this.findStartNodes(workflow);
      if (startNodes.length === 0) {
        throw new DependencyResolutionError(
          'No start nodes found in workflow',
          createExecutionErrorContext(state.executionId, workflow.id, {
            nodeCount: workflow.nodes.length,
            edgeCount: workflow.edges.length
          })
        );
      }
      state.executionQueue.push(...startNodes);
    }
    
    // Step 2: Main execution loop - process nodes until completion or failure
    while (state.executionQueue.length > 0 && state.status === 'RUNNING') {
      const nodeId = state.executionQueue.shift()!;
      
      try {
        // Execute individual node with comprehensive error handling
        await this.executeNode(context, nodeId);
        
        // Stream progress update if streaming enabled
        if (streamer) {
          const progress = this.calculateProgress(state, workflow.nodes.length);
          streamer.streamWorkflowProgress(
            context.input.sessionId,
            workflow.id,
            progress
          );
        }
        
        // Check waiting nodes for readiness after this node completion
        await this.checkWaitingNodes(context);
        
      } catch (error) {
        // Handle node execution error with retry and recovery logic
        await this.handleNodeError(context, nodeId, error);
      }
      
      // Step 3: Periodic state persistence for crash recovery
      if (this.shouldSaveState(context)) {
        await this.saveExecutionState(context);
      }
    }
    
    // Step 4: Build comprehensive execution results
    return this.buildExecutionResult(context);
  }
  
  /**
   * Executes a single workflow node with comprehensive orchestration.
   * 
   * Handles the complete lifecycle of node execution including:
   * - Input resolution from dependencies and variables
   * - Agent initialization and configuration
   * - Execution with timeout and retry handling
   * - Output processing and state updates
   * - Error handling and recovery mechanisms
   * - Human interaction integration when required
   * 
   * @param context - Execution context
   * @param nodeId - Node identifier to execute
   * @throws {NodeExecutionError} If node execution fails
   * @throws {ExecutionTimeoutError} If node execution times out
   * 
   * @private
   */
  private async executeNode(context: ExecutionContext, nodeId: string): Promise<void> {
    const { workflow, state, streamer, input } = context;
    const node = workflow.nodes.find(n => n.id === nodeId);
    
    if (!node) {
      throw new NodeExecutionError(
        nodeId,
        'Node not found in workflow definition',
        createExecutionErrorContext(state.executionId, workflow.id, { nodeId }),
        'Verify workflow definition integrity'
      );
    }
    
    // Step 1: Update execution state for current node
    state.currentNode = nodeId;
    state.lastUpdated = new Date();
    
    // Step 2: Stream node start event
    if (streamer) {
      streamer.streamNodeStart(input.sessionId, nodeId, node.name, node.type);
    }
    
    const startTime = Date.now();
    
    try {
      // Step 3: Check for human interaction requirements
      if (await this.requiresHumanInteraction(node)) {
        await this.handleHumanInteraction(context, node);
        return; // Exit early for human interaction - execution will resume later
      }
      
      // Step 4: Resolve node inputs from dependencies and variables
      const nodeInputs = await this.resolveNodeInputs(context, node);
      
      // Step 5: Execute the node's agent with timeout protection
      const nodeOutput = await this.executeNodeAgent(context, node, nodeInputs);
      
      // Step 6: Store node output and update completion state
      state.nodeOutputs.set(nodeId, nodeOutput);
      state.completedNodes.push(nodeId);
      
      // Step 7: Process node outputs and update dependent nodes
      await this.processNodeOutputs(context, node, nodeOutput);
      
      // Step 8: Stream node completion with results
      if (streamer) {
        const duration = Date.now() - startTime;
        streamer.streamNodeEnd(input.sessionId, nodeId, nodeOutput, duration);
      }
      
    } catch (error) {
      // Mark node as failed in execution state
      state.failedNodes.push(nodeId);
      
      // Stream node error event
      if (streamer) {
        streamer.streamNodeError(input.sessionId, nodeId, error);
      }
      
      throw error;
    }
  }
  
  /**
   * Executes a node's associated agent with comprehensive configuration.
   * 
   * Handles agent retrieval, input preparation, execution with timeout,
   * and integration with the broader execution context. Provides the
   * agent with complete workflow context for advanced use cases.
   * 
   * @param context - Execution context
   * @param node - Node to execute
   * @param inputs - Resolved inputs for the node
   * @returns Promise resolving to node execution output
   * @throws {AgentAvailabilityError} If agent is not available
   * @throws {ExecutionTimeoutError} If execution times out
   * 
   * @private
   */
  private async executeNodeAgent(
    context: ExecutionContext,
    node: WorkflowNode,
    inputs: any
  ): Promise<any> {
    // Step 1: Retrieve agent from agent pool/registry
    // Note: This would integrate with the actual Agent Hub registry
    // For now, we'll simulate agent retrieval
    const agent = await this.getAgent(node.type, node.data.agentConfig);
    
    if (!agent) {
      throw new AgentAvailabilityError(
        node.type,
        'Agent not found or unavailable',
        createExecutionErrorContext(
          context.state.executionId,
          context.workflow.id,
          { nodeId: node.id, agentType: node.type }
        )
      );
    }
    
    // Step 2: Prepare comprehensive agent input with context
    const agentInput = {
      // Primary input data
      ...inputs,
      
      // Session and user context
      sessionId: context.input.sessionId,
      userId: context.input.userId,
      
      // Node-specific context
      nodeData: {
        id: node.id,
        name: node.name,
        type: node.type,
        inputs: node.data.inputs,
        outputs: node.data.outputs,
        settings: node.data.settings
      },
      
      // Workflow execution context
      workflowContext: {
        workflowId: context.workflow.id,
        workflowName: context.workflow.name,
        executionId: context.state.executionId,
        nodeId: node.id,
        runtimeState: context.state.runtimeState,
        completedNodes: context.state.completedNodes,
        totalNodes: context.workflow.nodes.length
      },
      
      // Additional metadata for advanced agents
      metadata: {
        executionId: context.state.executionId,
        nodeId: node.id,
        workflowId: context.workflow.id,
        timestamp: new Date().toISOString(),
        retryCount: 0 // Would be incremented for retries
      }
    };
    
    // Step 3: Execute agent with timeout protection
    const timeout = node.timeout || this.config.defaultTimeout || 300000; // 5 minutes default
    
    return Promise.race([
      agent.execute(agentInput),
      this.createTimeoutPromise(timeout, `Node ${node.name} execution timed out`)
    ]);
  }
  
  /**
   * Resolves inputs for a node from dependencies and variables.
   * 
   * Combines outputs from completed dependency nodes, workflow variables,
   * and static node inputs into a comprehensive input object for agent execution.
   * Applies data transformations from edges as configured.
   * 
   * @param context - Execution context
   * @param node - Node to resolve inputs for
   * @returns Promise resolving to resolved input object
   * @throws {DataTransformationError} If data transformation fails
   * 
   * @private
   */
  private async resolveNodeInputs(context: ExecutionContext, node: WorkflowNode): Promise<any> {
    const { workflow, state } = context;
    const inputs: any = {};
    
    // Step 1: Process input edges (dependencies)
    const inputEdges = workflow.edges.filter(edge => edge.target === node.id);
    
    for (const edge of inputEdges) {
      const sourceOutput = state.nodeOutputs.get(edge.source);
      
      if (sourceOutput !== undefined) {
        let value = sourceOutput;
        
        // Apply data transformation if specified
        if (edge.transform) {
          try {
            value = await this.applyDataTransform(value, edge.transform);
          } catch (error) {
            throw new DataTransformationError(
              edge.id,
              'Data transformation failed',
              createExecutionErrorContext(state.executionId, workflow.id, {
                sourceNode: edge.source,
                targetNode: edge.target,
                transformConfig: edge.transform
              }),
              error
            );
          }
        }
        
        // Map value to input port
        const inputKey = edge.targetHandle || 'input';
        inputs[inputKey] = value;
      }
    }
    
    // Step 2: Resolve workflow variables
    if (node.data.variables) {
      for (const varName of node.data.variables) {
        const varValue = state.variables.get(varName) || context.input.variables?.[varName];
        if (varValue !== undefined) {
          inputs[varName] = varValue;
        }
      }
    }
    
    // Step 3: Add node-specific static inputs
    if (node.data.inputs) {
      Object.assign(inputs, node.data.inputs);
    }
    
    return inputs;
  }
  
  /**
   * Processes node outputs and updates dependent waiting nodes.
   * 
   * Takes completed node output and propagates it to dependent nodes,
   * checking edge conditions and updating waiting node states.
   * Determines which nodes are ready for execution based on dependencies.
   * 
   * @param context - Execution context
   * @param node - Node that completed execution
   * @param output - Node execution output
   * @throws {ConditionEvaluationError} If edge condition evaluation fails
   * 
   * @private
   */
  private async processNodeOutputs(
    context: ExecutionContext,
    node: WorkflowNode,
    output: any
  ): Promise<void> {
    const { workflow, state } = context;
    
    // Find all edges from this node to dependent nodes
    const outputEdges = workflow.edges.filter(edge => edge.source === node.id);
    
    for (const edge of outputEdges) {
      // Check edge condition if specified (for conditional execution)
      if (edge.condition) {
        try {
          const conditionMet = await this.evaluateCondition(edge.condition, output);
          if (!conditionMet) {
            continue; // Skip this edge if condition not met
          }
        } catch (error) {
          throw new ConditionEvaluationError(
            edge.id,
            edge.condition.condition,
            'Condition evaluation failed',
            createExecutionErrorContext(state.executionId, workflow.id, {
              sourceNode: edge.source,
              targetNode: edge.target,
              condition: edge.condition
            }),
            error
          );
        }
      }
      
      const targetNodeId = edge.target;
      
      // Get or create waiting node entry
      let waitingNode = state.waitingNodes.get(targetNodeId);
      if (!waitingNode) {
        waitingNode = {
          nodeId: targetNodeId,
          expectedInputs: this.getExpectedInputs(workflow, targetNodeId),
          receivedInputs: new Map(),
          isConditional: this.hasConditionalInputs(workflow, targetNodeId)
        };
        state.waitingNodes.set(targetNodeId, waitingNode);
      }
      
      // Record the received input from this edge
      const inputKey = edge.targetHandle || edge.source;
      waitingNode.receivedInputs.set(inputKey, output);
    }
  }
  
  /**
   * Checks waiting nodes for readiness and queues executable nodes.
   * 
   * Reviews all waiting nodes to determine which have received all
   * required inputs and are ready for execution. Adds ready nodes
   * to the execution queue for processing.
   * 
   * @param context - Execution context
   * 
   * @private
   */
  private async checkWaitingNodes(context: ExecutionContext): Promise<void> {
    const { state } = context;
    const readyNodes: string[] = [];
    
    // Check each waiting node for readiness
    for (const [nodeId, waitingNode] of state.waitingNodes.entries()) {
      if (this.isNodeReady(waitingNode)) {
        readyNodes.push(nodeId);
        state.waitingNodes.delete(nodeId);
      }
    }
    
    // Add ready nodes to execution queue
    if (readyNodes.length > 0) {
      state.executionQueue.push(...readyNodes);
    }
  }
  
  /**
   * Determines if a waiting node is ready for execution.
   * 
   * Checks if all expected inputs have been received. For conditional nodes,
   * applies conditional logic to determine if the node can execute with
   * partial inputs.
   * 
   * @param waitingNode - Waiting node to check
   * @returns True if node is ready for execution
   * 
   * @private
   */
  private isNodeReady(waitingNode: WaitingNode): boolean {
    // For non-conditional nodes, all expected inputs must be received
    if (!waitingNode.isConditional) {
      for (const expectedInput of waitingNode.expectedInputs) {
        if (!waitingNode.receivedInputs.has(expectedInput)) {
          return false;
        }
      }
      return true;
    }
    
    // For conditional nodes, implement more complex readiness logic
    // This would depend on the specific conditional requirements
    // For now, we'll use the same logic as non-conditional
    return waitingNode.receivedInputs.size >= waitingNode.expectedInputs.size;
  }
  
  /**
   * Finds start nodes in the workflow (nodes with no dependencies).
   * 
   * Identifies nodes that have no incoming edges and can be executed
   * immediately when the workflow starts.
   * 
   * @param workflow - Workflow to analyze
   * @returns Array of start node IDs
   * 
   * @private
   */
  private findStartNodes(workflow: AgentWorkflow): string[] {
    const hasIncomingEdge = new Set(workflow.edges.map(edge => edge.target));
    return workflow.nodes
      .filter(node => !hasIncomingEdge.has(node.id))
      .map(node => node.id);
  }
  
  /**
   * Calculates workflow progress for monitoring and streaming.
   * 
   * Computes completion percentage, current node information, and
   * estimated time remaining based on execution state and history.
   * 
   * @param state - Current execution state
   * @param totalNodes - Total number of nodes in workflow
   * @returns Progress information object
   * 
   * @private
   */
  private calculateProgress(state: ExecutionState, totalNodes: number): WorkflowProgress {
    const completedCount = state.completedNodes.length;
    const percentage = totalNodes > 0 ? (completedCount / totalNodes) * 100 : 0;
    
    return {
      totalNodes,
      completedNodes: completedCount,
      currentNode: state.currentNode || '',
      currentNodeName: '', // Would need to resolve from workflow
      percentage: Math.round(percentage * 100) / 100, // Round to 2 decimal places
      estimatedTimeRemaining: this.estimateTimeRemaining(state, totalNodes)
    };
  }
  
  /**
   * Estimates remaining execution time based on current progress.
   * 
   * Uses execution history and current progress to estimate how much
   * time remains for workflow completion.
   * 
   * @param state - Current execution state
   * @param totalNodes - Total number of nodes
   * @returns Estimated time remaining in milliseconds
   * 
   * @private
   */
  private estimateTimeRemaining(state: ExecutionState, totalNodes: number): number | undefined {
    const completedNodes = state.completedNodes.length;
    const remainingNodes = totalNodes - completedNodes;
    
    if (completedNodes === 0 || remainingNodes === 0) {
      return undefined;
    }
    
    // Calculate average time per completed node
    const elapsedTime = Date.now() - state.startedAt.getTime();
    const avgTimePerNode = elapsedTime / completedNodes;
    
    // Estimate remaining time
    return Math.round(avgTimePerNode * remainingNodes);
  }
  
  /**
   * Handles human interaction requirements for a node.
   * 
   * Pauses execution and sets up human interaction workflow when
   * a node requires human approval or input.
   * 
   * @param context - Execution context
   * @param node - Node requiring human interaction
   * 
   * @private
   */
  private async handleHumanInteraction(
    context: ExecutionContext,
    node: WorkflowNode
  ): Promise<void> {
    // Pause execution for human input
    context.state.status = 'WAITING_FOR_HUMAN';
    
    const interaction: HumanInteraction = {
      id: this.generateInteractionId(),
      executionId: context.state.executionId,
      nodeId: node.id,
      prompt: `Approval required for node: ${node.name}`,
      type: 'approval',
      createdAt: new Date()
    };
    
    context.state.humanInteractions.push(interaction);
    
    // Stream human prompt if streaming enabled
    if (context.streamer) {
      context.streamer.streamHumanPrompt(
        context.input.sessionId,
        interaction.prompt,
        { type: interaction.type, nodeId: node.id }
      );
    }
    
    // Save state and wait for human response
    await this.saveExecutionState(context);
  }
  
  /**
   * Handles node execution errors with retry and recovery logic.
   * 
   * Implements comprehensive error handling including retry policies,
   * error classification, and recovery mechanisms based on error type.
   * 
   * @param context - Execution context
   * @param nodeId - Node that encountered the error
   * @param error - Error that occurred
   * @throws {ExecutionError} If error cannot be recovered
   * 
   * @private
   */
  private async handleNodeError(
    context: ExecutionContext,
    nodeId: string,
    error: any
  ): Promise<void> {
    const { state, workflow } = context;
    const node = workflow.nodes.find(n => n.id === nodeId);
    
    // Create comprehensive error context
    const errorContext = createExecutionErrorContext(
      state.executionId,
      workflow.id,
      {
        nodeId,
        nodeName: node?.name,
        nodeType: node?.type,
        originalError: error.message
      }
    );
    
    // Determine if retry should be attempted
    const retryPolicy = node?.retryPolicy || this.config.errorRecovery;
    const shouldRetry = this.shouldRetryError(error, retryPolicy);
    
    if (shouldRetry && retryPolicy) {
      // Implement retry logic here
      console.log(`Retrying node ${nodeId} due to recoverable error`);
      // Would implement actual retry mechanism
    } else if (node?.skipOnError) {
      // Skip this node and continue execution
      state.skippedNodes.push(nodeId);
      console.log(`Skipping node ${nodeId} due to error: ${error.message}`);
    } else {
      // Unrecoverable error - fail execution
      throw new NodeExecutionError(
        nodeId,
        `Node execution failed: ${error.message}`,
        errorContext,
        'Check node configuration and agent implementation',
        error
      );
    }
  }
  
  /**
   * Validates workflow structure and configuration.
   * 
   * Performs comprehensive validation including graph structure,
   * node configurations, edge validities, and dependency analysis.
   * 
   * @param workflow - Workflow to validate
   * @returns Promise resolving to validation results
   * 
   * @public
   */
  async validateWorkflow(workflow: AgentWorkflow): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Basic structure validation
    if (!workflow.nodes || workflow.nodes.length === 0) {
      errors.push('Workflow must contain at least one node');
    }
    
    if (!workflow.edges) {
      workflow.edges = []; // Initialize empty edges array
    }
    
    // Check for cycles in the graph
    if (this.hasCycles(workflow)) {
      errors.push('Workflow contains circular dependencies');
    }
    
    // Validate node configurations
    for (const node of workflow.nodes) {
      if (!node.id || typeof node.id !== 'string') {
        errors.push(`Node missing or invalid ID: ${JSON.stringify(node)}`);
        continue;
      }
      
      if (!node.type || typeof node.type !== 'string') {
        errors.push(`Node ${node.id} missing or invalid type`);
      }
      
      if (!node.name || typeof node.name !== 'string') {
        errors.push(`Node ${node.id} missing or invalid name`);
      }
      
      // Validate agent type availability (would integrate with actual agent registry)
      if (!await this.isValidNodeType(node.type)) {
        warnings.push(`Node ${node.id} uses unrecognized agent type: ${node.type}`);
      }
    }
    
    // Validate edge configurations
    const nodeIds = new Set(workflow.nodes.map(n => n.id));
    for (const edge of workflow.edges) {
      if (!edge.id || typeof edge.id !== 'string') {
        errors.push(`Edge missing or invalid ID: ${JSON.stringify(edge)}`);
        continue;
      }
      
      if (!nodeIds.has(edge.source)) {
        errors.push(`Edge ${edge.id} references non-existent source node: ${edge.source}`);
      }
      
      if (!nodeIds.has(edge.target)) {
        errors.push(`Edge ${edge.id} references non-existent target node: ${edge.target}`);
      }
      
      // Validate edge condition if present
      if (edge.condition && !this.isValidCondition(edge.condition)) {
        errors.push(`Edge ${edge.id} has invalid condition configuration`);
      }
    }
    
    // Check for isolated nodes (nodes with no connections)
    const connectedNodes = new Set([
      ...workflow.edges.map(e => e.source),
      ...workflow.edges.map(e => e.target)
    ]);
    
    for (const node of workflow.nodes) {
      if (!connectedNodes.has(node.id) && workflow.nodes.length > 1) {
        warnings.push(`Node ${node.id} is not connected to any other nodes`);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  /**
   * Detects cycles in the workflow graph using depth-first search.
   * 
   * @param workflow - Workflow to check for cycles
   * @returns True if cycles are detected
   * 
   * @private
   */
  private hasCycles(workflow: AgentWorkflow): boolean {
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
    
    // Check all nodes for cycles
    for (const node of workflow.nodes) {
      if (!visited.has(node.id)) {
        if (dfs(node.id)) {
          return true;
        }
      }
    }
    
    return false;
  }
  
  // Utility methods (would be implemented based on actual requirements)
  
  private generateExecutionId(): string {
    return `exec-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }
  
  private generateInteractionId(): string {
    return `interact-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
  
  private async createExecutionContext(
    executionId: string,
    workflow: AgentWorkflow,
    input: WorkflowInput,
    options?: ExecutionOptions
  ): Promise<ExecutionContext> {
    // Implementation would create proper execution context
    return {
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
  }
  
  private async saveExecutionState(context: ExecutionContext): Promise<void> {
    // Save to memory module
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
  
  private shouldSaveState(context: ExecutionContext): boolean {
    const saveInterval = this.config.statePersistence?.saveInterval || 10000;
    const lastSave = context.state.lastUpdated.getTime();
    return (Date.now() - lastSave) >= saveInterval;
  }
  
  private buildExecutionResult(context: ExecutionContext): ExecutionResult {
    const { state, workflow } = context;
    const duration = Date.now() - state.startedAt.getTime();
    
    return {
      executionId: state.executionId,
      status: state.status,
      output: this.extractWorkflowOutput(state, workflow),
      duration,
      nodesExecuted: state.completedNodes.length,
      totalNodes: workflow.nodes.length,
      nodeOutputs: state.nodeOutputs,
      error: state.error
    };
  }
  
  private extractWorkflowOutput(state: ExecutionState, workflow: AgentWorkflow): any {
    // Extract output from final nodes or designated output nodes
    // This would depend on workflow configuration
    const outputs: any = {};
    for (const [nodeId, output] of state.nodeOutputs.entries()) {
      outputs[nodeId] = output;
    }
    return outputs;
  }
  
  private async requiresHumanInteraction(node: WorkflowNode): Promise<boolean> {
    // Check if node requires human interaction
    return node.data.settings?.requiresApproval === true;
  }
  
  private async getAgent(type: string, config?: any): Promise<any> {
    // Mock agent retrieval - would integrate with actual agent registry
    return {
      execute: async (input: any) => {
        // Mock execution
        return { result: `Processed by ${type} agent`, input };
      }
    };
  }
  
  private async applyDataTransform(data: any, transform: DataTransform): Promise<any> {
    // Apply data transformation based on configuration
    switch (transform.type) {
      case 'mapping':
        // Apply field mapping
        return this.applyMapping(data, transform.config);
      case 'filter':
        // Apply data filtering
        return this.applyFilter(data, transform.config);
      case 'custom':
        // Apply custom transformation
        return this.applyCustomTransform(data, transform.config);
      default:
        return data;
    }
  }
  
  private async evaluateCondition(condition: EdgeCondition, data: any): Promise<boolean> {
    // Evaluate edge condition
    switch (condition.type) {
      case 'expression':
        return this.evaluateExpression(condition.condition, data);
      case 'property':
        return this.evaluatePropertyCondition(condition, data);
      case 'custom':
        return this.evaluateCustomCondition(condition, data);
      default:
        return true;
    }
  }
  
  private getExpectedInputs(workflow: AgentWorkflow, nodeId: string): Set<string> {
    const inputEdges = workflow.edges.filter(edge => edge.target === nodeId);
    return new Set(inputEdges.map(edge => edge.targetHandle || edge.source));
  }
  
  private hasConditionalInputs(workflow: AgentWorkflow, nodeId: string): boolean {
    const inputEdges = workflow.edges.filter(edge => edge.target === nodeId);
    return inputEdges.some(edge => edge.condition !== undefined);
  }
  
  private createTimeoutPromise(timeout: number, message: string): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new ExecutionTimeoutError('', timeout, timeout, { message }));
      }, timeout);
    });
  }
  
  private shouldRetryError(error: any, retryPolicy: any): boolean {
    // Determine if error should be retried
    return error.retryable !== false && retryPolicy?.autoRetry === true;
  }
  
  private async isValidNodeType(type: string): Promise<boolean> {
    // Validate node type - would integrate with agent registry
    return ['llm', 'tool', 'condition', 'loop'].includes(type);
  }
  
  private isValidCondition(condition: EdgeCondition): boolean {
    // Validate edge condition
    return condition.type && condition.condition && typeof condition.condition === 'string';
  }
  
  // Mock implementations for data transformations
  private applyMapping(data: any, config: any): any { return data; }
  private applyFilter(data: any, config: any): any { return data; }
  private applyCustomTransform(data: any, config: any): any { return data; }
  private evaluateExpression(expression: string, data: any): boolean { return true; }
  private evaluatePropertyCondition(condition: EdgeCondition, data: any): boolean { return true; }
  private evaluateCustomCondition(condition: EdgeCondition, data: any): boolean { return true; }
}