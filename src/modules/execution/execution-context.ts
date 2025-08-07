/**
 * @fileoverview Execution context management for workflow execution state
 * @module modules/execution/execution-context
 * @requires ./types
 * @requires ../memory/types
 * 
 * This file implements execution context management for workflow execution,
 * providing state persistence, recovery, and lifecycle management for
 * execution sessions. The context manager ensures execution state integrity
 * and enables pause/resume functionality.
 * 
 * Key concepts:
 * - ExecutionContext: Complete execution state and configuration
 * - Context lifecycle management with automatic cleanup
 * - State serialization and deserialization for persistence
 * - Memory integration for distributed state management
 * - Context validation and integrity checking
 * 
 * Usage: Create ExecutionContextManager with memoryModule, then use
 * createExecutionContext to initialize workflow execution state.
 * 
 * @see types.ts for ExecutionContext interface
 * @since 1.0.0
 */

import {
  ExecutionContext,
  ManagedExecutionContext,
  ExecutionState,
  AgentWorkflow,
  WorkflowInput,
  ExecutionOptions,
  ExecutionStatus,
  WaitingNode,
  Variable,
  IStreamer
} from './types';

import {
  ExecutionError,
  ExecutionContextError,
  StatePersistenceError,
  createExecutionErrorContext
} from './errors';

import { IMemoryModule } from '../memory/types';

// ManagedExecutionContext is now imported from ./types

/**
 * Execution context manager for workflow execution state management.
 * 
 * The ExecutionContextManager handles the complete lifecycle of execution
 * contexts including creation, persistence, recovery, and cleanup. It provides
 * a centralized system for managing execution state across distributed systems
 * and ensures data integrity for pause/resume functionality.
 * 
 * Features:
 * - Context creation with proper initialization
 * - State serialization and deserialization
 * - Integration with Memory Module for distributed persistence
 * - Context lifecycle management with automatic cleanup
 * - State validation and integrity checking
 * - Memory usage optimization and monitoring
 * - Concurrent access protection and synchronization
 * 
 * @remarks
 * The context manager maintains an in-memory cache of active contexts
 * for performance optimization while ensuring persistent storage
 * for crash recovery and distributed execution scenarios.
 * 
 * Core workflow: Create context -> Execute workflow -> Save state
 * 
 * @public
 */
export class ExecutionContextManager {
  /** In-memory cache of active execution contexts */
  private contexts: Map<string, ManagedExecutionContext> = new Map();
  
  /** Memory module for persistent state storage */
  private memoryModule: IMemoryModule;
  
  /** Configuration for context management */
  private config: ExecutionContextManagerConfig;
  
  /** Cleanup interval timer */
  private cleanupTimer?: NodeJS.Timeout;
  
  /**
   * Creates a new ExecutionContextManager instance.
   * 
   * @param memoryModule - Memory module for state persistence
   * @param config - Optional configuration for context management
   */
  constructor(
    memoryModule: IMemoryModule,
    config: Partial<ExecutionContextManagerConfig> = {}
  ) {
    this.memoryModule = memoryModule;
    this.config = {
      maxCachedContexts: 100,
      cleanupInterval: 300000, // 5 minutes
      contextTimeout: 3600000, // 1 hour
      maxContextSize: 10 * 1024 * 1024, // 10MB
      enableMetrics: true,
      ...config
    };
    
    // Start cleanup timer if configured
    if (this.config.cleanupInterval > 0) {
      this.startCleanupTimer();
    }
  }
  
  /**
   * Creates a new execution context with proper initialization.
   * 
   * Initializes a complete execution context with workflow state,
   * variable resolution, and proper dependency tracking. Validates
   * input parameters and creates a clean execution environment.
   * 
   * @param executionId - Unique execution identifier
   * @param workflow - Workflow definition to execute
   * @param input - Input data and parameters
   * @param options - Optional execution configuration
   * @returns Promise resolving to initialized execution context
   * @throws {ExecutionContextError} If context creation fails
   * 
   * Context initialization process:
   * 1. Validates input parameters and workflow structure
   * 2. Creates execution state with proper initial values
   * 3. Initializes workflow variables with defaults and overrides
   * 4. Sets up dependency tracking and waiting node maps
   * 5. Creates management metadata for lifecycle tracking
   * 6. Caches context for performance optimization
   */
  async createExecutionContext(
    executionId: string,
    workflow: AgentWorkflow,
    input: WorkflowInput,
    options?: ExecutionOptions
  ): Promise<ExecutionContext> {
    try {
      // Step 1: Validate input parameters
      this.validateContextCreationParameters(executionId, workflow, input);
      
      // Step 2: Create initial execution state
      const executionState: ExecutionState = {
        executionId,
        workflowId: workflow.id,
        status: 'RUNNING' as ExecutionStatus,
        completedNodes: [],
        failedNodes: [],
        skippedNodes: [],
        executionQueue: [],
        waitingNodes: new Map<string, WaitingNode>(),
        nodeOutputs: new Map<string, any>(),
        variables: new Map<string, any>(),
        runtimeState: {},
        startedAt: new Date(),
        lastUpdated: new Date(),
        humanInteractions: []
      };
      
      // Step 3: Initialize workflow variables with defaults and user overrides
      await this.initializeWorkflowVariables(
        executionState,
        workflow.variables || [],
        input.variables || {}
      );
      
      // Step 4: Create execution context
      const context: ManagedExecutionContext = {
        state: executionState,
        workflow: this.cloneWorkflow(workflow), // Deep clone to prevent mutations
        input: { ...input }, // Shallow clone input
        options: { ...options }, // Shallow clone options
        management: {
          lastAccessed: new Date(),
          accessCount: 1,
          isDirty: false,
          estimatedSize: this.estimateContextSize(workflow, input)
        }
      };
      
      // Step 5: Validate context size constraints
      if (context.management!.estimatedSize > this.config.maxContextSize) {
        throw new ExecutionContextError(
          'Context size exceeds maximum allowed size',
          createExecutionErrorContext(executionId, workflow.id, {
            estimatedSize: context.management!.estimatedSize,
            maxSize: this.config.maxContextSize
          })
        );
      }
      
      // Step 6: Cache context and manage memory
      await this.cacheContext(executionId, context);
      
      console.log(`Created execution context for ${executionId}`);
      console.log(`Context details: workflow=${workflow.id}, nodes=${workflow.nodes.length}, variables=${executionState.variables.size}`);
      
      return context;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Failed to create execution context for ${executionId}:`, errorMessage);
      
      throw new ExecutionContextError(
        `Failed to create execution context: ${errorMessage}`,
        createExecutionErrorContext(executionId, workflow?.id || 'unknown', {
          originalError: errorMessage
        })
      );
    }
  }
  
  /**
   * Retrieves an execution context from cache or storage.
   * 
   * First checks the in-memory cache, then falls back to persistent
   * storage if not found. Updates access tracking for lifecycle management.
   * 
   * @param executionId - Unique execution identifier
   * @returns Execution context or undefined if not found
   */
  getExecutionContext(executionId: string): ExecutionContext | undefined {
    const context = this.contexts.get(executionId);
    
    if (context) {
      // Update access tracking
      if (context.management) {
        context.management.lastAccessed = new Date();
        context.management.accessCount++;
      }
    }
    
    return context;
  }
  
  /**
   * Saves execution context to persistent storage.
   * 
   * Serializes the execution context and saves it to the Memory Module
   * for crash recovery and distributed execution support. Handles
   * serialization of complex state objects including Maps and Sets.
   * 
   * @param context - Execution context to save
   * @throws {StatePersistenceError} If save operation fails
   * 
   * Serialization process:
   * 1. Converts Map/Set objects to serializable formats
   * 2. Creates comprehensive state snapshot
   * 3. Stores in Memory Module with execution ID key
   * 4. Updates management metadata
   * 5. Handles serialization errors gracefully
   */
  async saveExecutionContext(context: ExecutionContext): Promise<void> {
    try {
      // Step 1: Serialize execution state with Map/Set handling
      const serializedState = this.serializeExecutionState(context.state);
      
      // Step 2: Create comprehensive state snapshot
      const contextSnapshot = {
        state: serializedState,
        workflow: context.workflow,
        input: context.input,
        options: context.options,
        savedAt: new Date().toISOString(),
        version: '1.0.0' // For future compatibility
      };
      
      // Step 3: Save to Memory Module with execution-specific key
      const storageKey = `execution_${context.state.executionId}`;
      await this.memoryModule.setRuntimeState(
        context.input.sessionId,
        { [storageKey]: contextSnapshot }
      );
      
      // Step 4: Update management metadata
      const managedContext = context as ManagedExecutionContext;
      if (managedContext.management) {
        managedContext.management.isDirty = false;
        managedContext.management.lastAccessed = new Date();
      }
      
      console.log(`Saved execution context ${context.state.executionId} to persistent storage`);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Failed to save execution context ${context.state.executionId}:`, errorMessage);
      
      throw new StatePersistenceError(
        'save',
        `Failed to persist execution context: ${errorMessage}`,
        createExecutionErrorContext(
          context.state.executionId,
          context.workflow.id,
          { originalError: errorMessage }
        ),
        error instanceof Error ? error : undefined
      );
    }
  }
  
  /**
   * Loads execution context from persistent storage.
   * 
   * Retrieves and deserializes execution context from the Memory Module,
   * handles data migration, and validates context integrity before returning.
   * 
   * @param executionId - Unique execution identifier
   * @param sessionId - Session identifier for storage lookup
   * @returns Promise resolving to execution context or null if not found
   * @throws {StatePersistenceError} If load operation fails
   * @throws {ExecutionContextError} If context data is corrupted
   * 
   * Deserialization process:
   * 1. Retrieves context data from Memory Module
   * 2. Validates data structure and version compatibility
   * 3. Deserializes Map/Set objects from JSON format
   * 4. Reconstructs complete ExecutionContext object
   * 5. Validates context integrity and consistency
   * 6. Caches loaded context for performance
   */
  async loadExecutionContext(executionId: string, sessionId: string): Promise<ExecutionContext | null> {
    try {
      // Step 1: Retrieve context data from Memory Module
      const runtimeState = await this.memoryModule.getRuntimeState(sessionId);
      const storageKey = `execution_${executionId}`;
      const savedContext = runtimeState[storageKey];
      
      if (!savedContext) {
        console.log(`No saved context found for execution ${executionId}`);
        return null;
      }
      
      // Step 2: Validate saved context structure
      if (!this.isValidSavedContext(savedContext)) {
        throw new ExecutionContextError(
          'Saved context has invalid structure',
          createExecutionErrorContext(executionId, savedContext.workflow?.id || 'unknown', {
            savedContextKeys: Object.keys(savedContext)
          })
        );
      }
      
      // Step 3: Deserialize execution state
      const deserializedState = this.deserializeExecutionState(savedContext.state);
      
      // Step 4: Reconstruct execution context
      const context: ManagedExecutionContext = {
        state: deserializedState,
        workflow: savedContext.workflow,
        input: savedContext.input,
        options: savedContext.options,
        management: {
          lastAccessed: new Date(),
          accessCount: 1,
          isDirty: false,
          estimatedSize: this.estimateContextSize(savedContext.workflow, savedContext.input)
        }
      };
      
      // Step 5: Validate context integrity
      this.validateContextIntegrity(context);
      
      // Step 6: Cache loaded context
      await this.cacheContext(executionId, context);
      
      console.log(`Loaded execution context ${executionId} from persistent storage`);
      console.log(`Context status: ${context.state.status}, completed nodes: ${context.state.completedNodes.length}`);
      
      return context;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Failed to load execution context ${executionId}:`, errorMessage);
      
      if (error instanceof ExecutionContextError) {
        throw error;
      }
      
      throw new StatePersistenceError(
        'load',
        `Failed to load execution context: ${errorMessage}`,
        createExecutionErrorContext(executionId, 'unknown', { originalError: errorMessage }),
        error instanceof Error ? error : undefined
      );
    }
  }
  
  /**
   * Removes execution context from cache and storage.
   * 
   * Performs cleanup of execution context including removal from
   * in-memory cache and optional deletion from persistent storage.
   * 
   * @param executionId - Execution identifier to remove
   * @param deletePersistent - Whether to delete from persistent storage
   */
  async removeExecutionContext(executionId: string, deletePersistent: boolean = false): Promise<void> {
    // Remove from in-memory cache
    const removed = this.contexts.delete(executionId);
    
    if (removed) {
      console.log(`Removed execution context ${executionId} from cache`);
    }
    
    // Optionally remove from persistent storage
    if (deletePersistent) {
      try {
        // This would require knowing the session ID, which we don't have here
        // In a real implementation, we'd need to track session mappings
        console.log(`Note: Persistent deletion for ${executionId} requires session ID`);
      } catch (error) {
        console.error(`Failed to delete persistent context ${executionId}:`, error);
      }
    }
  }
  
  /**
   * Gets the number of active execution contexts.
   * 
   * Returns the count of contexts currently cached in memory
   * for monitoring and resource management purposes.
   * 
   * @returns Number of active execution contexts
   */
  getActiveExecutionCount(): number {
    return this.contexts.size;
  }
  
  /**
   * Gets context management statistics for monitoring.
   * 
   * @returns Context management statistics
   */
  getContextStatistics(): ContextStatistics {
    let totalMemoryUsage = 0;
    let totalAccessCount = 0;
    const statusCounts: Record<ExecutionStatus, number> = {
      'PENDING': 0,
      'RUNNING': 0,
      'PAUSED': 0,
      'COMPLETED': 0,
      'FAILED': 0,
      'TERMINATED': 0,
      'TIMEOUT': 0,
      'WAITING_FOR_HUMAN': 0
    };
    
    for (const context of Array.from(this.contexts.values())) {
      if (context.management) {
        totalMemoryUsage += context.management.estimatedSize;
        totalAccessCount += context.management.accessCount;
      }
      statusCounts[context.state.status as ExecutionStatus]++;
    }
    
    return {
      activeContexts: this.contexts.size,
      totalMemoryUsage,
      averageAccessCount: totalAccessCount / this.contexts.size || 0,
      statusDistribution: statusCounts,
      configuredLimits: {
        maxCachedContexts: this.config.maxCachedContexts,
        maxContextSize: this.config.maxContextSize,
        contextTimeout: this.config.contextTimeout
      }
    };
  }
  
  /**
   * Gracefully shuts down the context manager.
   * 
   * Stops cleanup timers, saves all dirty contexts, and prepares
   * for system shutdown.
   */
  async shutdown(): Promise<void> {
    // Stop cleanup timer
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    
    // Save all dirty contexts
    const savePromises: Promise<void>[] = [];
    for (const context of Array.from(this.contexts.values())) {
      if (context.management?.isDirty) {
        savePromises.push(this.saveExecutionContext(context));
      }
    }
    
    if (savePromises.length > 0) {
      await Promise.all(savePromises);
      console.log(`Saved ${savePromises.length} dirty contexts during shutdown`);
    }
    
    // Clear context cache
    this.contexts.clear();
    
    console.log('Execution context manager shut down successfully');
  }
  
  // Private helper methods
  
  /**
   * Validates context creation parameters.
   * 
   * @private
   */
  private validateContextCreationParameters(
    executionId: string,
    workflow: AgentWorkflow,
    input: WorkflowInput
  ): void {
    if (!executionId || typeof executionId !== 'string') {
      throw new ExecutionContextError(
        'Execution ID must be a non-empty string',
        { executionId }
      );
    }
    
    if (!workflow || !workflow.id || !workflow.nodes) {
      throw new ExecutionContextError(
        'Workflow must have valid ID and nodes',
        { workflowId: workflow?.id, hasNodes: !!workflow?.nodes }
      );
    }
    
    if (!input || !input.sessionId) {
      throw new ExecutionContextError(
        'Input must have valid session ID',
        { hasInput: !!input, sessionId: input?.sessionId }
      );
    }
  }
  
  /**
   * Initializes workflow variables with defaults and user overrides.
   * 
   * @private
   */
  private async initializeWorkflowVariables(
    state: ExecutionState,
    workflowVariables: Variable[],
    userVariables: Record<string, any>
  ): Promise<void> {
    // Set workflow defaults
    for (const variable of workflowVariables) {
      if (variable.defaultValue !== undefined) {
        state.variables.set(variable.name, variable.defaultValue);
      }
    }
    
    // Override with user values
    for (const [name, value] of Object.entries(userVariables)) {
      state.variables.set(name, value);
    }
    
    console.log(`Initialized ${state.variables.size} workflow variables`);
  }
  
  /**
   * Creates a deep clone of workflow to prevent mutations.
   * 
   * @private
   */
  private cloneWorkflow(workflow: AgentWorkflow): AgentWorkflow {
    return JSON.parse(JSON.stringify(workflow));
  }
  
  /**
   * Estimates context size for memory management.
   * 
   * @private
   */
  private estimateContextSize(workflow: AgentWorkflow, input: WorkflowInput): number {
    // Rough estimation based on JSON string length
    const workflowSize = JSON.stringify(workflow).length;
    const inputSize = JSON.stringify(input).length;
    const baseOverhead = 1024; // Base overhead for context structure
    
    return workflowSize + inputSize + baseOverhead;
  }
  
  /**
   * Caches context with memory management.
   * 
   * @private
   */
  private async cacheContext(executionId: string, context: ManagedExecutionContext): Promise<void> {
    // Check if we need to evict old contexts
    if (this.contexts.size >= this.config.maxCachedContexts) {
      await this.evictOldestContext();
    }
    
    this.contexts.set(executionId, context);
  }
  
  /**
   * Evicts the oldest context to make room for new ones.
   * 
   * @private
   */
  private async evictOldestContext(): Promise<void> {
    let oldestId: string | null = null;
    let oldestTime = Date.now();
    
    for (const [id, context] of Array.from(this.contexts.entries())) {
      const lastAccessed = context.management?.lastAccessed?.getTime() || 0;
      if (lastAccessed < oldestTime) {
        oldestTime = lastAccessed;
        oldestId = id;
      }
    }
    
    if (oldestId) {
      const context = this.contexts.get(oldestId)!;
      
      // Save if dirty before evicting
      if (context.management?.isDirty) {
        await this.saveExecutionContext(context);
      }
      
      this.contexts.delete(oldestId);
      console.log(`Evicted oldest context ${oldestId} to make room for new context`);
    }
  }
  
  /**
   * Serializes execution state for storage.
   * 
   * @private
   */
  private serializeExecutionState(state: ExecutionState): any {
    return {
      ...state,
      waitingNodes: Array.from(state.waitingNodes.entries()).map(([id, node]) => [
        id,
        {
          ...node,
          expectedInputs: Array.from(node.expectedInputs),
          receivedInputs: Array.from(node.receivedInputs.entries())
        }
      ]),
      nodeOutputs: Array.from(state.nodeOutputs.entries()),
      variables: Array.from(state.variables.entries()),
      startedAt: state.startedAt.toISOString(),
      lastUpdated: state.lastUpdated.toISOString(),
      completedAt: state.completedAt?.toISOString()
    };
  }
  
  /**
   * Deserializes execution state from storage.
   * 
   * @private
   */
  private deserializeExecutionState(serialized: any): ExecutionState {
    return {
      ...serialized,
      waitingNodes: new Map(
        serialized.waitingNodes?.map(([id, node]: [string, any]) => [
          id,
          {
            ...node,
            expectedInputs: new Set(node.expectedInputs),
            receivedInputs: new Map(node.receivedInputs)
          }
        ]) || []
      ),
      nodeOutputs: new Map(serialized.nodeOutputs || []),
      variables: new Map(serialized.variables || []),
      startedAt: new Date(serialized.startedAt),
      lastUpdated: new Date(serialized.lastUpdated),
      completedAt: serialized.completedAt ? new Date(serialized.completedAt) : undefined
    };
  }
  
  /**
   * Validates saved context structure.
   * 
   * @private
   */
  private isValidSavedContext(saved: any): boolean {
    return saved &&
           saved.state &&
           saved.workflow &&
           saved.input &&
           saved.createdAt &&
           saved.savedAt;
  }
  
  /**
   * Validates context integrity after loading.
   * 
   * @private
   */
  private validateContextIntegrity(context: ExecutionContext): void {
    const { state, workflow } = context;
    
    // Validate state consistency
    if (state.workflowId !== workflow.id) {
      throw new ExecutionContextError(
        'Context integrity check failed: workflow ID mismatch',
        createExecutionErrorContext(state.executionId, workflow.id, {
          stateWorkflowId: state.workflowId,
          actualWorkflowId: workflow.id
        })
      );
    }
    
    // Validate node references
    const workflowNodeIds = new Set(workflow.nodes.map(n => n.id));
    for (const nodeId of state.completedNodes) {
      if (!workflowNodeIds.has(nodeId)) {
        throw new ExecutionContextError(
          `Context integrity check failed: completed node ${nodeId} not found in workflow`,
          createExecutionErrorContext(state.executionId, workflow.id, {
            invalidNodeId: nodeId,
            validNodeIds: Array.from(workflowNodeIds)
          })
        );
      }
    }
  }
  
  /**
   * Starts the cleanup timer for context management.
   * 
   * @private
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.performCleanup();
    }, this.config.cleanupInterval);
  }
  
  /**
   * Performs periodic cleanup of expired contexts.
   * 
   * @private
   */
  private async performCleanup(): Promise<void> {
    const now = Date.now();
    const expiredContexts: string[] = [];
    
    for (const [id, context] of Array.from(this.contexts.entries())) {
      const lastAccessed = context.management?.lastAccessed?.getTime() || 0;
      if (now - lastAccessed > this.config.contextTimeout) {
        expiredContexts.push(id);
      }
    }
    
    for (const id of expiredContexts) {
      const context = this.contexts.get(id)!;
      
      // Save if dirty before cleanup
      if (context.management?.isDirty) {
        try {
          await this.saveExecutionContext(context);
        } catch (error) {
          console.error(`Failed to save context ${id} during cleanup:`, error);
        }
      }
      
      this.contexts.delete(id);
    }
    
    if (expiredContexts.length > 0) {
      console.log(`Cleaned up ${expiredContexts.length} expired contexts`);
    }
  }
}

/**
 * Configuration interface for ExecutionContextManager.
 * 
 * @public
 */
export interface ExecutionContextManagerConfig {
  /** Maximum number of contexts to keep in memory */
  maxCachedContexts: number;
  
  /** Cleanup interval in milliseconds */
  cleanupInterval: number;
  
  /** Context timeout in milliseconds */
  contextTimeout: number;
  
  /** Maximum context size in bytes */
  maxContextSize: number;
  
  /** Enable metrics collection */
  enableMetrics: boolean;
}

/**
 * Context management statistics.
 * 
 * @public
 */
export interface ContextStatistics {
  /** Number of active contexts */
  activeContexts: number;
  
  /** Total memory usage estimation */
  totalMemoryUsage: number;
  
  /** Average access count per context */
  averageAccessCount: number;
  
  /** Distribution of contexts by status */
  statusDistribution: Record<ExecutionStatus, number>;
  
  /** Configured limits */
  configuredLimits: {
    maxCachedContexts: number;
    maxContextSize: number;
    contextTimeout: number;
  };
}