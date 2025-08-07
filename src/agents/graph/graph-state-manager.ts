/**
 * @fileoverview Graph State Manager for Graph Agent execution state
 * @module agents/graph/graph-state-manager
 * @requires ./types
 * @requires ./errors
 * 
 * This file implements comprehensive state management for Graph Agent execution.
 * The state manager handles execution state tracking, checkpointing, recovery,
 * and state consistency across distributed execution environments.
 * 
 * Key responsibilities:
 * - Track execution state across all graph nodes
 * - Manage data flow between nodes with validation
 * - Implement checkpointing for recovery scenarios
 * - Handle state persistence and serialization
 * - Provide state query and manipulation interfaces
 * - Monitor state consistency and detect corruption
 * - Support concurrent state access with locking
 * - Integrate with distributed storage backends
 * 
 * Key concepts:
 * - Execution state lifecycle management
 * - Node-level state tracking with dependencies
 * - Data flow validation and transformation
 * - Checkpoint creation and restoration
 * - State versioning and history
 * - Distributed state synchronization
 * - Memory optimization and cleanup
 * 
 * @example
 * ```typescript
 * import { GraphStateManager } from './graph-state-manager';
 * 
 * const stateManager = new GraphStateManager({
 *   persistence: 'memory',
 *   checkpointing: {
 *     enabled: true,
 *     frequency: 'node',
 *     retention: 10
 *   },
 *   validation: {
 *     enabled: true,
 *     schemaValidation: true
 *   }
 * });
 * 
 * await stateManager.initialize(executionId, graphDefinition);
 * 
 * // Track node completion
 * await stateManager.completeNode('node1', { result: 'success' });
 * 
 * // Create checkpoint
 * const checkpoint = await stateManager.createCheckpoint('after-node1');
 * 
 * // Query state
 * const state = stateManager.getCurrentState();
 * ```
 * 
 * @since 1.0.0
 */

import {
  GraphExecutionState,
  GraphExecutionStatus,
  NodeExecutionStatus,
  NodeExecutionResult,
  GraphCheckpoint,
  GraphStateConfig,
  GraphStatePersistence,
  GraphStateSerialization,
  GraphStateCompression,
  GraphDefinition,
  GraphNode,
  GraphEdge,
  ExecutionStep,
  GraphExecutionProgress,
  GraphPerformanceMetrics,
  GraphResourceUtilization,
  GraphExecutionContext,
  NodeResourceUsage
} from './types';

import {
  GraphStateError,
  GraphResourceError,
  createGraphErrorContext,
  isGraphAgentError
} from './errors';

/**
 * Comprehensive state management for Graph Agent execution.
 * 
 * Manages all aspects of graph execution state including node states,
 * data flow, checkpoints, and recovery mechanisms. Provides thread-safe
 * access to state and supports various persistence backends.
 * 
 * @public
 */
export class GraphStateManager {
  private readonly config: Required<GraphStateConfig>;
  private readonly executionStates: Map<string, GraphExecutionState> = new Map();
  private readonly checkpoints: Map<string, GraphCheckpoint[]> = new Map();
  private readonly locks: Map<string, Promise<void>> = new Map();
  private readonly eventHandlers: Map<string, Function[]> = new Map();
  
  private persistenceBackend?: StateStorageBackend;
  private compressionEngine?: StateCompressionEngine;
  private serializationEngine?: StateSerializationEngine;
  private validationEngine?: StateValidationEngine;
  
  private initialized: boolean = false;
  private cleanupInterval?: NodeJS.Timeout;
  
  /**
   * Creates a new Graph State Manager instance.
   * 
   * @param config - State management configuration
   */
  constructor(config: GraphStateConfig) {
    this.config = this.applyDefaults(config);
    this.initializeEngines();
  }
  
  /**
   * Initializes the state manager for a graph execution.
   * 
   * @param executionId - Unique execution identifier
   * @param graphDefinition - Graph definition
   * @param context - Execution context
   * @returns Promise resolving when initialization is complete
   * @throws {GraphStateError} If initialization fails
   */
  async initialize(
    executionId: string,
    graphDefinition: GraphDefinition,
    context?: Partial<GraphExecutionContext>
  ): Promise<void> {
    if (this.initialized) {
      throw new GraphStateError(
        'execution',
        'State manager is already initialized',
        createGraphErrorContext(executionId, graphDefinition.id)
      );
    }
    
    try {
      console.log(`Initializing Graph State Manager for execution: ${executionId}`);
      
      // Initialize persistence backend
      if (this.persistenceBackend) {
        await this.persistenceBackend.initialize();
      }
      
      // Create initial execution state
      const initialState = this.createInitialState(executionId, graphDefinition, context);
      this.executionStates.set(executionId, initialState);
      
      // Initialize checkpoint storage
      this.checkpoints.set(executionId, []);
      
      // Set up cleanup interval
      this.setupCleanupInterval();
      
      this.initialized = true;
      
      // Emit initialization event
      this.emitEvent('initialized', { executionId, graphId: graphDefinition.id });
      
      console.log(`✓ Graph State Manager initialized for execution: ${executionId}`);
      
    } catch (error) {
      throw new GraphStateError(
        'execution',
        `Failed to initialize state manager: ${error instanceof Error ? error.message : String(error)}`,
        createGraphErrorContext(executionId, graphDefinition.id),
        undefined,
        undefined,
        undefined
      );
    }
  }
  
  /**
   * Gets the current execution state.
   * 
   * @param executionId - Execution identifier
   * @returns Current execution state or undefined if not found
   */
  getCurrentState(executionId: string): GraphExecutionState | undefined {
    return this.executionStates.get(executionId);
  }
  
  /**
   * Updates the execution status.
   * 
   * @param executionId - Execution identifier
   * @param status - New execution status
   * @returns Promise resolving when status is updated
   */
  async updateExecutionStatus(
    executionId: string,
    status: GraphExecutionStatus
  ): Promise<void> {
    await this.withLock(executionId, async () => {
      const state = this.executionStates.get(executionId);
      if (!state) {
        throw new GraphStateError(
          'execution',
          `Execution state not found: ${executionId}`,
          createGraphErrorContext(executionId)
        );
      }
      
      const previousStatus = state.status;
      state.status = status;
      state.currentTime = new Date();
      
      // Update progress based on status
      if (status === 'completed') {
        state.progress.percentage = 100;
        state.progress.currentPhase = 'completed';
      } else if (status === 'failed' || status === 'cancelled') {
        state.progress.currentPhase = 'error';
      }
      
      // Persist state if configured
      if (this.persistenceBackend) {
        await this.persistState(executionId, state);
      }
      
      // Emit status change event
      this.emitEvent('statusChanged', {
        executionId,
        previousStatus,
        newStatus: status,
        timestamp: state.currentTime
      });
    });
  }
  
  /**
   * Starts execution of a node.
   * 
   * @param executionId - Execution identifier
   * @param nodeId - Node identifier
   * @param input - Node input data
   * @returns Promise resolving when node is marked as executing
   */
  async startNode(
    executionId: string,
    nodeId: string,
    input?: any
  ): Promise<void> {
    await this.withLock(executionId, async () => {
      const state = this.executionStates.get(executionId);
      if (!state) {
        throw new GraphStateError(
          'execution',
          `Execution state not found: ${executionId}`,
          createGraphErrorContext(executionId)
        );
      }
      
      // Validate node can be started
      if (state.executingNodes.has(nodeId)) {
        throw new GraphStateError(
          'node',
          `Node ${nodeId} is already executing`,
          createGraphErrorContext(executionId, undefined, nodeId)
        );
      }
      
      if (state.completedNodes.has(nodeId)) {
        throw new GraphStateError(
          'node',
          `Node ${nodeId} is already completed`,
          createGraphErrorContext(executionId, undefined, nodeId)
        );
      }
      
      // Move node from pending to executing
      state.pendingNodes.delete(nodeId);
      state.executingNodes.add(nodeId);
      
      // Update progress
      this.updateProgress(state);
      
      // Create execution step
      const step: ExecutionStep = {
        id: `${nodeId}-start-${Date.now()}`,
        type: 'node_start',
        nodeId,
        timestamp: new Date(),
        status: 'started',
        input,
        metadata: {
          executionId,
          startedAt: new Date()
        }
      };
      
      // Track the step (you might want to add a steps array to state)
      this.emitEvent('nodeStarted', {
        executionId,
        nodeId,
        step,
        input
      });
      
      console.log(`Node ${nodeId} started in execution ${executionId}`);
    });
  }
  
  /**
   * Completes execution of a node.
   * 
   * @param executionId - Execution identifier
   * @param nodeId - Node identifier
   * @param result - Node execution result
   * @returns Promise resolving when node is marked as completed
   */
  async completeNode(
    executionId: string,
    nodeId: string,
    result: NodeExecutionResult
  ): Promise<void> {
    await this.withLock(executionId, async () => {
      const state = this.executionStates.get(executionId);
      if (!state) {
        throw new GraphStateError(
          'execution',
          `Execution state not found: ${executionId}`,
          createGraphErrorContext(executionId)
        );
      }
      
      // Validate node is executing
      if (!state.executingNodes.has(nodeId)) {
        throw new GraphStateError(
          'node',
          `Node ${nodeId} is not currently executing`,
          createGraphErrorContext(executionId, undefined, nodeId)
        );
      }
      
      // Move node from executing to completed
      state.executingNodes.delete(nodeId);
      state.completedNodes.add(nodeId);
      
      // Store result
      state.nodeResults.set(nodeId, result);
      
      // Update data state with node output
      if (result.output !== undefined) {
        state.dataState[nodeId] = result.output;
      }
      
      // Update progress
      this.updateProgress(state);
      
      // Create execution step
      const step: ExecutionStep = {
        id: `${nodeId}-complete-${Date.now()}`,
        type: 'node_complete',
        nodeId,
        timestamp: new Date(),
        duration: result.duration,
        status: 'completed',
        output: result.output,
        metadata: {
          executionId,
          completedAt: new Date(),
          resourceUsage: result.resourceUsage
        }
      };
      
      // Auto-checkpoint if configured
      if (this.config.checkpointing.enabled && this.config.checkpointing.frequency === 'node') {
        await this.createCheckpoint(executionId, `after-${nodeId}`);
      }
      
      // Persist state if configured
      if (this.persistenceBackend) {
        await this.persistState(executionId, state);
      }
      
      this.emitEvent('nodeCompleted', {
        executionId,
        nodeId,
        result,
        step
      });
      
      console.log(`Node ${nodeId} completed in execution ${executionId}`);
    });
  }
  
  /**
   * Fails execution of a node.
   * 
   * @param executionId - Execution identifier
   * @param nodeId - Node identifier
   * @param error - Node execution error
   * @returns Promise resolving when node is marked as failed
   */
  async failNode(
    executionId: string,
    nodeId: string,
    error: Error
  ): Promise<void> {
    await this.withLock(executionId, async () => {
      const state = this.executionStates.get(executionId);
      if (!state) {
        throw new GraphStateError(
          'execution',
          `Execution state not found: ${executionId}`,
          createGraphErrorContext(executionId)
        );
      }
      
      // Move node from executing to failed
      state.executingNodes.delete(nodeId);
      state.failedNodes.add(nodeId);
      
      // Create failed result
      const failedResult: NodeExecutionResult = {
        nodeId,
        status: 'failed',
        error: error as any, // Type assertion for compatibility
        metadata: {
          nodeId,
          startTime: new Date(),
          endTime: new Date(),
          duration: 0,
          retryCount: 0,
          memoryUsage: 0,
          cpuUsage: 0
        },
        toolsUsed: [],
        duration: 0,
        resourceUsage: {
          memory: 0,
          cpu: 0,
          disk: 0,
          network: 0,
          duration: 0
        }
      };
      
      // Store result
      state.nodeResults.set(nodeId, failedResult);
      
      // Update progress
      this.updateProgress(state);
      
      // Create execution step
      const step: ExecutionStep = {
        id: `${nodeId}-error-${Date.now()}`,
        type: 'node_error',
        nodeId,
        timestamp: new Date(),
        status: 'failed',
        metadata: {
          executionId,
          error: error.message,
          failedAt: new Date()
        }
      };
      
      this.emitEvent('nodeFailed', {
        executionId,
        nodeId,
        error,
        step
      });
      
      console.error(`Node ${nodeId} failed in execution ${executionId}:`, error.message);
    });
  }
  
  /**
   * Creates a checkpoint of the current state.
   * 
   * @param executionId - Execution identifier
   * @param label - Optional checkpoint label
   * @returns Promise resolving to the created checkpoint
   */
  async createCheckpoint(
    executionId: string,
    label?: string
  ): Promise<GraphCheckpoint> {
    return await this.withLock(executionId, async () => {
      const state = this.executionStates.get(executionId);
      if (!state) {
        throw new GraphStateError(
          'execution',
          `Execution state not found: ${executionId}`,
          createGraphErrorContext(executionId)
        );
      }
      
      const checkpointId = `checkpoint-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Create deep copy of state for checkpoint
      const stateSnapshot = await this.deepCopyState(state);
      const dataSnapshot = await this.deepCopyData(state.dataState);
      
      const checkpoint: GraphCheckpoint = {
        id: checkpointId,
        timestamp: new Date(),
        executionState: stateSnapshot,
        dataSnapshot,
        metadata: {
          label: label || `Auto-checkpoint-${Date.now()}`,
          executionId,
          nodeCount: state.completedNodes.size + state.executingNodes.size + state.pendingNodes.size,
          completedNodes: state.completedNodes.size,
          progress: state.progress.percentage
        }
      };
      
      // Store checkpoint
      const checkpoints = this.checkpoints.get(executionId) || [];
      checkpoints.push(checkpoint);
      
      // Apply retention policy
      if (checkpoints.length > this.config.cleanup.retention) {
        checkpoints.splice(0, checkpoints.length - this.config.cleanup.retention);
      }
      
      this.checkpoints.set(executionId, checkpoints);
      
      // Persist checkpoint if configured
      if (this.persistenceBackend) {
        await this.persistenceBackend.storeCheckpoint(executionId, checkpoint);
      }
      
      this.emitEvent('checkpointCreated', {
        executionId,
        checkpointId,
        checkpoint
      });
      
      console.log(`Checkpoint ${checkpointId} created for execution ${executionId}`);
      
      return checkpoint;
    });
  }
  
  /**
   * Restores state from a checkpoint.
   * 
   * @param executionId - Execution identifier
   * @param checkpointId - Checkpoint identifier
   * @returns Promise resolving when state is restored
   */
  async restoreFromCheckpoint(
    executionId: string,
    checkpointId: string
  ): Promise<void> {
    await this.withLock(executionId, async () => {
      const checkpoints = this.checkpoints.get(executionId);
      if (!checkpoints) {
        throw new GraphStateError(
          'checkpoint',
          `No checkpoints found for execution: ${executionId}`,
          createGraphErrorContext(executionId)
        );
      }
      
      const checkpoint = checkpoints.find(cp => cp.id === checkpointId);
      if (!checkpoint) {
        throw new GraphStateError(
          'checkpoint',
          `Checkpoint not found: ${checkpointId}`,
          createGraphErrorContext(executionId),
          undefined,
          undefined,
          checkpoint
        );
      }
      
      // Restore execution state
      if (checkpoint.executionState) {
        const restoredState = await this.restoreExecutionState(checkpoint.executionState);
        this.executionStates.set(executionId, restoredState);
      }
      
      this.emitEvent('stateRestored', {
        executionId,
        checkpointId,
        timestamp: new Date()
      });
      
      console.log(`State restored from checkpoint ${checkpointId} for execution ${executionId}`);
    });
  }
  
  /**
   * Gets all checkpoints for an execution.
   * 
   * @param executionId - Execution identifier
   * @returns Array of checkpoints
   */
  getCheckpoints(executionId: string): GraphCheckpoint[] {
    return this.checkpoints.get(executionId) || [];
  }
  
  /**
   * Gets node output data.
   * 
   * @param executionId - Execution identifier
   * @param nodeId - Node identifier
   * @returns Node output data or undefined if not available
   */
  getNodeOutput(executionId: string, nodeId: string): any {
    const state = this.executionStates.get(executionId);
    return state?.dataState[nodeId];
  }
  
  /**
   * Sets node input data.
   * 
   * @param executionId - Execution identifier
   * @param nodeId - Node identifier
   * @param data - Input data
   * @returns Promise resolving when data is set
   */
  async setNodeInput(
    executionId: string,
    nodeId: string,
    data: any
  ): Promise<void> {
    await this.withLock(executionId, async () => {
      const state = this.executionStates.get(executionId);
      if (!state) {
        throw new GraphStateError(
          'execution',
          `Execution state not found: ${executionId}`,
          createGraphErrorContext(executionId)
        );
      }
      
      // Validate data if validation engine is available
      if (this.validationEngine) {
        await this.validationEngine.validateNodeInput(nodeId, data);
      }
      
      // Store input data with special key
      state.dataState[`${nodeId}_input`] = data;
      
      this.emitEvent('nodeInputSet', {
        executionId,
        nodeId,
        data
      });
    });
  }
  
  /**
   * Gets execution progress information.
   * 
   * @param executionId - Execution identifier
   * @returns Execution progress or undefined if not found
   */
  getProgress(executionId: string): GraphExecutionProgress | undefined {
    const state = this.executionStates.get(executionId);
    return state?.progress;
  }
  
  /**
   * Gets performance metrics for the execution.
   * 
   * @param executionId - Execution identifier
   * @returns Performance metrics
   */
  getPerformanceMetrics(executionId: string): GraphPerformanceMetrics | undefined {
    const state = this.executionStates.get(executionId);
    if (!state) {
      return undefined;
    }
    
    const now = new Date();
    const duration = now.getTime() - state.startTime.getTime();
    const completedNodes = state.completedNodes.size;
    const totalNodes = completedNodes + state.executingNodes.size + state.pendingNodes.size;
    
    // Calculate metrics from node results
    const nodeExecutionTimes: Record<string, number> = {};
    let totalResourceUsage: GraphResourceUtilization = {
      cpu: 0,
      memory: 0,
      disk: 0,
      network: 0,
      concurrentNodes: state.executingNodes.size
    };
    
    state.nodeResults.forEach((result, nodeId) => {
      nodeExecutionTimes[nodeId] = result.duration;
      totalResourceUsage.cpu += result.resourceUsage.cpu;
      totalResourceUsage.memory += result.resourceUsage.memory;
      totalResourceUsage.disk += result.resourceUsage.disk;
      totalResourceUsage.network += result.resourceUsage.network;
    });
    
    return {
      executionDuration: duration,
      nodeExecutionTimes,
      parallelEfficiency: this.calculateParallelEfficiency(state),
      resourceUtilization: totalResourceUsage,
      throughput: completedNodes / (duration / 1000), // nodes per second
      errorRate: state.failedNodes.size / totalNodes,
      retryRate: this.calculateRetryRate(state)
    };
  }
  
  /**
   * Cleans up state for a completed execution.
   * 
   * @param executionId - Execution identifier
   * @returns Promise resolving when cleanup is complete
   */
  async cleanup(executionId: string): Promise<void> {
    console.log(`Cleaning up state for execution: ${executionId}`);
    
    // Remove from memory
    this.executionStates.delete(executionId);
    this.checkpoints.delete(executionId);
    this.locks.delete(executionId);
    
    // Clean up persistence backend
    if (this.persistenceBackend) {
      await this.persistenceBackend.cleanup(executionId);
    }
    
    this.emitEvent('cleanupCompleted', { executionId });
    
    console.log(`✓ Cleanup completed for execution: ${executionId}`);
  }
  
  /**
   * Shuts down the state manager.
   * 
   * @returns Promise resolving when shutdown is complete
   */
  async shutdown(): Promise<void> {
    if (!this.initialized) {
      return;
    }
    
    console.log('Shutting down Graph State Manager');
    
    // Clear cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    // Shutdown persistence backend
    if (this.persistenceBackend) {
      await this.persistenceBackend.shutdown();
    }
    
    // Clear all state
    this.executionStates.clear();
    this.checkpoints.clear();
    this.locks.clear();
    this.eventHandlers.clear();
    
    this.initialized = false;
    
    console.log('✓ Graph State Manager shutdown complete');
  }
  
  /**
   * Registers an event handler.
   * 
   * @param event - Event name
   * @param handler - Event handler function
   */
  on(event: string, handler: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }
  
  /**
   * Unregisters an event handler.
   * 
   * @param event - Event name
   * @param handler - Event handler function
   */
  off(event: string, handler: Function): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }
  
  // ============================================================================
  // Private Helper Methods
  // ============================================================================
  
  /**
   * Applies default configuration values.
   * 
   * @param config - Input configuration
   * @returns Configuration with defaults applied
   * @private
   */
  private applyDefaults(config: GraphStateConfig): Required<GraphStateConfig> {
    return {
      persistence: config.persistence || 'memory',
      serialization: config.serialization || 'json',
      compression: config.compression || 'none',
      cleanup: {
        enabled: config.cleanup?.enabled !== false,
        retention: config.cleanup?.retention || 10,
        compression: config.cleanup?.compression !== false,
        archive: config.cleanup?.archive !== false,
        conditions: config.cleanup?.conditions || []
      },
      maxSize: config.maxSize || 100 * 1024 * 1024, // 100MB default
      versioning: config.versioning !== false,
      checkpointing: {
        enabled: true,
        frequency: 'node',
        interval: 60000,
        storage: 'memory',
        compression: 'none',
        retention: 10
      }
    };
  }
  
  /**
   * Initializes storage and processing engines.
   * 
   * @private
   */
  private initializeEngines(): void {
    // Initialize persistence backend
    if (this.config.persistence !== 'memory') {
      this.persistenceBackend = this.createPersistenceBackend();
    }
    
    // Initialize compression engine
    if (this.config.compression !== 'none') {
      this.compressionEngine = this.createCompressionEngine();
    }
    
    // Initialize serialization engine
    this.serializationEngine = this.createSerializationEngine();
    
    // Initialize validation engine
    this.validationEngine = this.createValidationEngine();
  }
  
  /**
   * Creates initial execution state.
   * 
   * @param executionId - Execution identifier
   * @param graphDefinition - Graph definition
   * @param context - Execution context
   * @returns Initial execution state
   * @private
   */
  private createInitialState(
    executionId: string,
    graphDefinition: GraphDefinition,
    context?: Partial<GraphExecutionContext>
  ): GraphExecutionState {
    const now = new Date();
    
    // Find root nodes (nodes with no incoming edges)
    const nodeIds = new Set(graphDefinition.nodes.map(node => node.id));
    const targetNodes = new Set(graphDefinition.edges.map(edge => edge.to));
    const rootNodes = graphDefinition.nodes
      .filter(node => !targetNodes.has(node.id))
      .map(node => node.id);
    
    const pendingNodes = new Set(nodeIds);
    
    return {
      executionId,
      status: 'pending',
      completedNodes: new Set(),
      executingNodes: new Set(),
      pendingNodes,
      failedNodes: new Set(),
      nodeResults: new Map(),
      dataState: {},
      context: context as GraphExecutionContext,
      startTime: now,
      currentTime: now,
      progress: {
        percentage: 0,
        completedNodes: 0,
        totalNodes: nodeIds.size,
        currentPhase: 'initialization',
        estimatedTimeRemaining: 0,
        throughputNodes: 0
      }
    };
  }
  
  /**
   * Updates execution progress.
   * 
   * @param state - Execution state
   * @private
   */
  private updateProgress(state: GraphExecutionState): void {
    const totalNodes = state.completedNodes.size + state.executingNodes.size + state.pendingNodes.size;
    const completedNodes = state.completedNodes.size;
    
    state.progress = {
      percentage: totalNodes > 0 ? Math.round((completedNodes / totalNodes) * 100) : 0,
      completedNodes,
      totalNodes,
      currentPhase: this.determineCurrentPhase(state),
      estimatedTimeRemaining: this.estimateTimeRemaining(state),
      throughputNodes: this.calculateThroughput(state)
    };
  }
  
  /**
   * Determines the current execution phase.
   * 
   * @param state - Execution state
   * @returns Current phase description
   * @private
   */
  private determineCurrentPhase(state: GraphExecutionState): string {
    if (state.executingNodes.size > 0) {
      return `Executing ${state.executingNodes.size} nodes`;
    } else if (state.pendingNodes.size > 0) {
      return 'Preparing nodes';
    } else if (state.completedNodes.size > 0) {
      return 'Finalizing';
    }
    return 'Initializing';
  }
  
  /**
   * Estimates remaining execution time.
   * 
   * @param state - Execution state
   * @returns Estimated time remaining in milliseconds
   * @private
   */
  private estimateTimeRemaining(state: GraphExecutionState): number {
    const elapsed = state.currentTime.getTime() - state.startTime.getTime();
    const completedNodes = state.completedNodes.size;
    const remainingNodes = state.pendingNodes.size + state.executingNodes.size;
    
    if (completedNodes === 0) {
      return 0; // Can't estimate without completed nodes
    }
    
    const averageTimePerNode = elapsed / completedNodes;
    return Math.round(averageTimePerNode * remainingNodes);
  }
  
  /**
   * Calculates node execution throughput.
   * 
   * @param state - Execution state
   * @returns Throughput in nodes per second
   * @private
   */
  private calculateThroughput(state: GraphExecutionState): number {
    const elapsed = state.currentTime.getTime() - state.startTime.getTime();
    const completedNodes = state.completedNodes.size;
    
    if (elapsed === 0) {
      return 0;
    }
    
    return Math.round((completedNodes / elapsed) * 1000 * 100) / 100; // nodes per second, 2 decimal places
  }
  
  /**
   * Calculates parallel execution efficiency.
   * 
   * @param state - Execution state
   * @returns Efficiency percentage (0-100)
   * @private
   */
  private calculateParallelEfficiency(state: GraphExecutionState): number {
    // This is a simplified calculation - could be more sophisticated
    const totalNodes = state.completedNodes.size + state.executingNodes.size + state.pendingNodes.size;
    const maxPossibleParallel = Math.min(totalNodes, 10); // Assume max 10 parallel
    const averageParallel = state.executingNodes.size || 1;
    
    return Math.min(100, Math.round((averageParallel / maxPossibleParallel) * 100));
  }
  
  /**
   * Calculates retry rate for failed nodes.
   * 
   * @param state - Execution state
   * @returns Retry rate percentage (0-100)
   * @private
   */
  private calculateRetryRate(state: GraphExecutionState): number {
    let totalRetries = 0;
    let totalExecutions = 0;
    
    state.nodeResults.forEach((result) => {
      totalExecutions++;
      if (result.metadata.retryCount > 0) {
        totalRetries += result.metadata.retryCount;
      }
    });
    
    if (totalExecutions === 0) {
      return 0;
    }
    
    return Math.round((totalRetries / totalExecutions) * 100);
  }
  
  /**
   * Executes operation with exclusive lock.
   * 
   * @param executionId - Execution identifier
   * @param operation - Operation to execute
   * @returns Promise resolving to operation result
   * @private
   */
  private async withLock<T>(
    executionId: string,
    operation: () => Promise<T>
  ): Promise<T> {
    // Wait for any existing lock
    while (this.locks.has(executionId)) {
      await this.locks.get(executionId);
    }
    
    // Create new lock
    let resolveLock: () => void;
    const lockPromise = new Promise<void>((resolve) => {
      resolveLock = resolve;
    });
    
    this.locks.set(executionId, lockPromise);
    
    try {
      return await operation();
    } finally {
      // Release lock
      this.locks.delete(executionId);
      resolveLock!();
    }
  }
  
  /**
   * Creates deep copy of execution state.
   * 
   * @param state - State to copy
   * @returns Deep copy of state
   * @private
   */
  private async deepCopyState(state: GraphExecutionState): Promise<Partial<GraphExecutionState>> {
    return {
      executionId: state.executionId,
      status: state.status,
      completedNodes: new Set(state.completedNodes),
      executingNodes: new Set(state.executingNodes),
      pendingNodes: new Set(state.pendingNodes),
      failedNodes: new Set(state.failedNodes),
      nodeResults: new Map(state.nodeResults),
      startTime: new Date(state.startTime),
      currentTime: new Date(state.currentTime),
      progress: { ...state.progress }
    };
  }
  
  /**
   * Creates deep copy of data state.
   * 
   * @param dataState - Data state to copy
   * @returns Deep copy of data state
   * @private
   */
  private async deepCopyData(dataState: Record<string, any>): Promise<Record<string, any>> {
    // Simple JSON-based deep copy - could be enhanced for complex objects
    return JSON.parse(JSON.stringify(dataState));
  }
  
  /**
   * Restores execution state from checkpoint data.
   * 
   * @param checkpointState - Checkpoint state data
   * @returns Restored execution state
   * @private
   */
  private async restoreExecutionState(
    checkpointState: Partial<GraphExecutionState>
  ): Promise<GraphExecutionState> {
    // Reconstruct the full state from checkpoint
    const state: GraphExecutionState = {
      executionId: checkpointState.executionId || '',
      status: checkpointState.status || 'pending',
      completedNodes: checkpointState.completedNodes || new Set(),
      executingNodes: checkpointState.executingNodes || new Set(),
      pendingNodes: checkpointState.pendingNodes || new Set(),
      failedNodes: checkpointState.failedNodes || new Set(),
      nodeResults: checkpointState.nodeResults || new Map(),
      dataState: checkpointState.dataState || {},
      context: checkpointState.context || {} as GraphExecutionContext,
      startTime: checkpointState.startTime || new Date(),
      currentTime: new Date(), // Always use current time for restored state
      progress: checkpointState.progress || {
        percentage: 0,
        completedNodes: 0,
        totalNodes: 0,
        currentPhase: 'restored',
        estimatedTimeRemaining: 0,
        throughputNodes: 0
      }
    };
    
    return state;
  }
  
  /**
   * Persists state to storage backend.
   * 
   * @param executionId - Execution identifier
   * @param state - State to persist
   * @private
   */
  private async persistState(
    executionId: string,
    state: GraphExecutionState
  ): Promise<void> {
    if (!this.persistenceBackend) {
      return;
    }
    
    try {
      await this.persistenceBackend.storeState(executionId, state);
    } catch (error) {
      console.error(`Failed to persist state for execution ${executionId}:`, error);
      // Don't throw - persistence failure shouldn't stop execution
    }
  }
  
  /**
   * Emits an event to registered handlers.
   * 
   * @param event - Event name
   * @param data - Event data
   * @private
   */
  private emitEvent(event: string, data: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      }
    }
  }
  
  /**
   * Sets up periodic cleanup of old state data.
   * 
   * @private
   */
  private setupCleanupInterval(): void {
    if (!this.config.cleanup.enabled) {
      return;
    }
    
    // Run cleanup every 5 minutes
    this.cleanupInterval = setInterval(async () => {
      await this.performPeriodicCleanup();
    }, 5 * 60 * 1000);
  }
  
  /**
   * Performs periodic cleanup of old data.
   * 
   * @private
   */
  private async performPeriodicCleanup(): Promise<void> {
    const now = new Date();
    const cutoffTime = new Date(now.getTime() - (24 * 60 * 60 * 1000)); // 24 hours ago
    
    // Clean up completed executions older than cutoff
    for (const [executionId, state] of Array.from(this.executionStates.entries())) {
      if (state.status === 'completed' && state.currentTime < cutoffTime) {
        await this.cleanup(executionId);
      }
    }
  }
  
  /**
   * Creates persistence backend based on configuration.
   * 
   * @returns Persistence backend instance
   * @private
   */
  private createPersistenceBackend(): StateStorageBackend {
    // Factory method for different persistence backends
    switch (this.config.persistence) {
      case 'disk':
        return new DiskStorageBackend();
      case 'database':
        return new DatabaseStorageBackend();
      case 'distributed':
        return new DistributedStorageBackend();
      default:
        return new MemoryStorageBackend();
    }
  }
  
  /**
   * Creates compression engine based on configuration.
   * 
   * @returns Compression engine instance
   * @private
   */
  private createCompressionEngine(): StateCompressionEngine {
    switch (this.config.compression) {
      case 'gzip':
        return new GzipCompressionEngine();
      case 'lz4':
        return new LZ4CompressionEngine();
      default:
        return new NoCompressionEngine();
    }
  }
  
  /**
   * Creates serialization engine based on configuration.
   * 
   * @returns Serialization engine instance
   * @private
   */
  private createSerializationEngine(): StateSerializationEngine {
    switch (this.config.serialization) {
      case 'binary':
        return new BinarySerializationEngine();
      case 'protobuf':
        return new ProtobufSerializationEngine();
      case 'custom':
        return new CustomSerializationEngine();
      default:
        return new JSONSerializationEngine();
    }
  }
  
  /**
   * Creates validation engine.
   * 
   * @returns Validation engine instance
   * @private
   */
  private createValidationEngine(): StateValidationEngine {
    return new DefaultValidationEngine();
  }
}

// ============================================================================
// Storage Backend Interfaces and Implementations
// ============================================================================

/**
 * Interface for state storage backends.
 */
interface StateStorageBackend {
  initialize(): Promise<void>;
  storeState(executionId: string, state: GraphExecutionState): Promise<void>;
  loadState(executionId: string): Promise<GraphExecutionState | undefined>;
  storeCheckpoint(executionId: string, checkpoint: GraphCheckpoint): Promise<void>;
  loadCheckpoints(executionId: string): Promise<GraphCheckpoint[]>;
  cleanup(executionId: string): Promise<void>;
  shutdown(): Promise<void>;
}

/**
 * Memory-based storage backend.
 */
class MemoryStorageBackend implements StateStorageBackend {
  private states: Map<string, GraphExecutionState> = new Map();
  private checkpoints: Map<string, GraphCheckpoint[]> = new Map();
  
  async initialize(): Promise<void> {
    // No initialization needed for memory backend
  }
  
  async storeState(executionId: string, state: GraphExecutionState): Promise<void> {
    this.states.set(executionId, state);
  }
  
  async loadState(executionId: string): Promise<GraphExecutionState | undefined> {
    return this.states.get(executionId);
  }
  
  async storeCheckpoint(executionId: string, checkpoint: GraphCheckpoint): Promise<void> {
    if (!this.checkpoints.has(executionId)) {
      this.checkpoints.set(executionId, []);
    }
    this.checkpoints.get(executionId)!.push(checkpoint);
  }
  
  async loadCheckpoints(executionId: string): Promise<GraphCheckpoint[]> {
    return this.checkpoints.get(executionId) || [];
  }
  
  async cleanup(executionId: string): Promise<void> {
    this.states.delete(executionId);
    this.checkpoints.delete(executionId);
  }
  
  async shutdown(): Promise<void> {
    this.states.clear();
    this.checkpoints.clear();
  }
}

/**
 * Disk-based storage backend (placeholder).
 */
class DiskStorageBackend implements StateStorageBackend {
  async initialize(): Promise<void> { /* Implementation needed */ }
  async storeState(executionId: string, state: GraphExecutionState): Promise<void> { /* Implementation needed */ }
  async loadState(executionId: string): Promise<GraphExecutionState | undefined> { return undefined; }
  async storeCheckpoint(executionId: string, checkpoint: GraphCheckpoint): Promise<void> { /* Implementation needed */ }
  async loadCheckpoints(executionId: string): Promise<GraphCheckpoint[]> { return []; }
  async cleanup(executionId: string): Promise<void> { /* Implementation needed */ }
  async shutdown(): Promise<void> { /* Implementation needed */ }
}

/**
 * Database-based storage backend (placeholder).
 */
class DatabaseStorageBackend implements StateStorageBackend {
  async initialize(): Promise<void> { /* Implementation needed */ }
  async storeState(executionId: string, state: GraphExecutionState): Promise<void> { /* Implementation needed */ }
  async loadState(executionId: string): Promise<GraphExecutionState | undefined> { return undefined; }
  async storeCheckpoint(executionId: string, checkpoint: GraphCheckpoint): Promise<void> { /* Implementation needed */ }
  async loadCheckpoints(executionId: string): Promise<GraphCheckpoint[]> { return []; }
  async cleanup(executionId: string): Promise<void> { /* Implementation needed */ }
  async shutdown(): Promise<void> { /* Implementation needed */ }
}

/**
 * Distributed storage backend (placeholder).
 */
class DistributedStorageBackend implements StateStorageBackend {
  async initialize(): Promise<void> { /* Implementation needed */ }
  async storeState(executionId: string, state: GraphExecutionState): Promise<void> { /* Implementation needed */ }
  async loadState(executionId: string): Promise<GraphExecutionState | undefined> { return undefined; }
  async storeCheckpoint(executionId: string, checkpoint: GraphCheckpoint): Promise<void> { /* Implementation needed */ }
  async loadCheckpoints(executionId: string): Promise<GraphCheckpoint[]> { return []; }
  async cleanup(executionId: string): Promise<void> { /* Implementation needed */ }
  async shutdown(): Promise<void> { /* Implementation needed */ }
}

// ============================================================================
// Processing Engine Interfaces (Placeholders for future implementation)
// ============================================================================

interface StateCompressionEngine {
  compress(data: any): Promise<Buffer>;
  decompress(buffer: Buffer): Promise<any>;
}

interface StateSerializationEngine {
  serialize(data: any): Promise<string | Buffer>;
  deserialize(data: string | Buffer): Promise<any>;
}

interface StateValidationEngine {
  validateNodeInput(nodeId: string, data: any): Promise<void>;
  validateState(state: GraphExecutionState): Promise<void>;
}

// Simple implementations
class NoCompressionEngine implements StateCompressionEngine {
  async compress(data: any): Promise<Buffer> { return Buffer.from(JSON.stringify(data)); }
  async decompress(buffer: Buffer): Promise<any> { return JSON.parse(buffer.toString()); }
}

class GzipCompressionEngine implements StateCompressionEngine {
  async compress(data: any): Promise<Buffer> { /* Implementation needed */ return Buffer.from(''); }
  async decompress(buffer: Buffer): Promise<any> { /* Implementation needed */ return {}; }
}

class LZ4CompressionEngine implements StateCompressionEngine {
  async compress(data: any): Promise<Buffer> { /* Implementation needed */ return Buffer.from(''); }
  async decompress(buffer: Buffer): Promise<any> { /* Implementation needed */ return {}; }
}

class JSONSerializationEngine implements StateSerializationEngine {
  async serialize(data: any): Promise<string> { return JSON.stringify(data); }
  async deserialize(data: string): Promise<any> { return JSON.parse(data); }
}

class BinarySerializationEngine implements StateSerializationEngine {
  async serialize(data: any): Promise<Buffer> { /* Implementation needed */ return Buffer.from(''); }
  async deserialize(data: Buffer): Promise<any> { /* Implementation needed */ return {}; }
}

class ProtobufSerializationEngine implements StateSerializationEngine {
  async serialize(data: any): Promise<Buffer> { /* Implementation needed */ return Buffer.from(''); }
  async deserialize(data: Buffer): Promise<any> { /* Implementation needed */ return {}; }
}

class CustomSerializationEngine implements StateSerializationEngine {
  async serialize(data: any): Promise<string | Buffer> { /* Implementation needed */ return ''; }
  async deserialize(data: string | Buffer): Promise<any> { /* Implementation needed */ return {}; }
}

class DefaultValidationEngine implements StateValidationEngine {
  async validateNodeInput(nodeId: string, data: any): Promise<void> {
    // Basic validation - can be enhanced
    if (data === null || data === undefined) {
      throw new GraphStateError('data', `Invalid input data for node ${nodeId}`);
    }
  }
  
  async validateState(state: GraphExecutionState): Promise<void> {
    if (!state.executionId) {
      throw new GraphStateError('execution', 'Execution ID is required');
    }
  }
}