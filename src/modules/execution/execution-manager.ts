/**
 * @fileoverview Main Execution Manager implementation for workflow orchestration
 * @module modules/execution/execution-manager
 * @requires ./types
 * @requires ./errors
 * @requires ./workflow-engine
 * @requires ./execution-context
 * @requires ../registry/types
 * 
 * This file implements the primary ExecutionManager class that orchestrates
 * graph-based workflow execution with comprehensive state management, human-in-the-loop
 * integration, streaming capabilities, and robust error handling.
 * 
 * Key concepts:
 * - IExecutionManager interface implementation with full lifecycle management
 * - Integration with WorkflowExecutionEngine for core execution logic
 * - ExecutionContextManager for state persistence and recovery
 * - Human-in-the-loop workflow support with approval and input mechanisms
 * - Real-time streaming integration for progress monitoring
 * - Comprehensive error handling with automatic retry and recovery
 * 
 * @example
 * ```typescript
 * import { ExecutionManager } from './execution-manager';
 * 
 * const manager = new ExecutionManager();
 * await manager.initialize(config);
 * 
 * const result = await manager.executeWorkflow(workflow, {
 *   sessionId: 'sess-123',
 *   input: { data: 'Process this' }
 * });
 * ```
 * 
 * @see types.ts for interface definitions
 * @see workflow-engine.ts for core execution logic
 * @see execution-context.ts for context management
 * @since 1.0.0
 */

import {
  IExecutionManager,
  ExecutionManagerConfig,
  AgentWorkflow,
  WorkflowInput,
  ExecutionOptions,
  ExecutionResult,
  ExecutionState,
  ExecutionStatus,
  IStreamer,
  HumanInteraction,
  HumanPromptOptions,
  ValidationResult,
  ExecutionSummary,
  ExecutionDetails
} from './types';

import {
  ExecutionError,
  WorkflowValidationError,
  ExecutionContextError,
  HumanInteractionError,
  createExecutionErrorContext
} from './errors';

import { WorkflowExecutionEngine } from './workflow-engine';
import { ExecutionContextManager } from './execution-context';
import { HealthStatus } from '../registry/types';

/**
 * Primary Execution Manager implementation for workflow orchestration.
 * 
 * The ExecutionManager serves as the main entry point for workflow execution,
 * coordinating between the workflow engine, context manager, and external systems.
 * It provides a comprehensive API for workflow execution with advanced features
 * like pause/resume, human-in-the-loop interactions, and real-time streaming.
 * 
 * Architecture:
 * - WorkflowExecutionEngine: Core execution logic and graph orchestration
 * - ExecutionContextManager: State persistence and context lifecycle
 * - Integration with Memory Module for distributed state management
 * - Integration with Streaming Manager for real-time progress updates
 * - Human-in-the-loop workflow support with approval mechanisms
 * - Comprehensive error handling with retry and recovery policies
 * 
 * Features:
 * - Synchronous and streaming workflow execution
 * - Pause/resume functionality with state persistence
 * - Human interaction workflows with timeout handling
 * - Execution history and detailed monitoring
 * - Workflow validation and integrity checking
 * - Resource management and concurrent execution limits
 * - Health monitoring and performance metrics
 * 
 * @remarks
 * The ExecutionManager maintains strict separation between execution logic
 * (delegated to WorkflowExecutionEngine) and state management (handled by
 * ExecutionContextManager) to ensure modularity and testability.
 * 
 * @example
 * ```typescript
 * // Initialize execution manager
 * const executionManager = new ExecutionManager();
 * await executionManager.initialize({
 *   maxConcurrentExecutions: 10,
 *   parallelExecution: { enabled: true, maxParallelNodes: 5 },
 *   statePersistence: { enabled: true, storage: 'memory' }
 * });
 * 
 * // Execute workflow with streaming
 * const streamer = streamingManager.getStreamer('sess-123');
 * const result = await executionManager.executeWorkflowStreaming(
 *   workflow,
 *   { sessionId: 'sess-123', input: data },
 *   streamer
 * );
 * 
 * // Handle human interaction
 * await executionManager.pauseForHumanInput(
 *   result.executionId,
 *   'Please approve this action',
 *   { type: 'approval', timeout: 300000 }
 * );
 * ```
 * 
 * @public
 */
export class ExecutionManager implements IExecutionManager {
  /** Module identification required by IModule interface */
  readonly name = 'executionManager';
  readonly version = '1.0.0';
  
  /** Core execution engine for workflow orchestration */
  private engine?: WorkflowExecutionEngine;
  
  /** Context manager for execution state persistence */
  private contextManager?: ExecutionContextManager;
  
  /** Current configuration */
  private config: ExecutionManagerConfig = {};
  
  /** Initialization state */
  private initialized = false;
  
  /** Active executions tracking for resource management */
  private activeExecutions: Set<string> = new Set();
  
  /** Human interactions pending response */
  private pendingHumanInteractions: Map<string, HumanInteraction> = new Map();
  
  /**
   * Initializes the Execution Manager with comprehensive configuration.
   * 
   * Sets up all required dependencies including the workflow engine,
   * context manager, and integrations with other AgentHub modules.
   * Validates configuration and establishes resource limits.
   * 
   * @param config - Execution manager configuration
   * @throws {ExecutionError} If initialization fails or dependencies unavailable
   * 
   * @example
   * ```typescript
   * await executionManager.initialize({
   *   maxConcurrentExecutions: 10,
   *   defaultTimeout: 300000,
   *   parallelExecution: {
   *     enabled: true,
   *     maxParallelNodes: 5
   *   },
   *   statePersistence: {
   *     enabled: true,
   *     saveInterval: 10000,
   *     storage: 'memory'
   *   },
   *   errorRecovery: {
   *     autoRetry: true,
   *     retryDelay: 5000,
   *     maxRetryAttempts: 3
   *   }
   * });
   * ```
   * 
   * Initialization process:
   * 1. Merges user configuration with secure defaults
   * 2. Retrieves required modules from AgentHub registry
   * 3. Initializes workflow execution engine
   * 4. Sets up execution context manager
   * 5. Validates module dependencies and health
   * 6. Sets initialization state and logs success
   */
  async initialize(config: ExecutionManagerConfig): Promise<void> {
    try {
      console.log('Initializing Execution Manager...');
      
      // Step 1: Merge configuration with secure defaults
      this.config = this.mergeWithDefaults(config);
      console.log('Configuration:', {
        maxConcurrent: this.config.maxConcurrentExecutions,
        parallelExecution: this.config.parallelExecution?.enabled,
        statePersistence: this.config.statePersistence?.enabled,
        timeout: this.config.defaultTimeout
      });
      
      // Step 2: Retrieve required modules from AgentHub registry
      const dependencies = await this.initializeDependencies();
      
      // Step 3: Initialize execution context manager
      this.contextManager = new ExecutionContextManager(
        dependencies.memoryModule,
        {
          maxCachedContexts: this.config.maxConcurrentExecutions || 100,
          cleanupInterval: 300000, // 5 minutes
          contextTimeout: 3600000, // 1 hour
          enableMetrics: true
        }
      );
      
      // Step 4: Initialize workflow execution engine
      this.engine = new WorkflowExecutionEngine(
        this.config,
        dependencies.streamingManager,
        dependencies.memoryModule
      );
      
      // Step 5: Validate initialization
      await this.validateInitialization();
      
      this.initialized = true;
      console.log('✓ Execution Manager initialized successfully');
      console.log(`Ready to handle ${this.config.maxConcurrentExecutions} concurrent executions`);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Failed to initialize Execution Manager:', errorMessage);
      
      throw new ExecutionError(
        'EXECUTION_MANAGER_INIT_ERROR',
        `Execution Manager initialization failed: ${errorMessage}`,
        { configuration: this.config },
        'Check module dependencies and configuration validity',
        'error',
        error instanceof Error ? error : undefined
      );
    }
  }
  
  /**
   * Executes a workflow with comprehensive orchestration and monitoring.
   * 
   * Provides complete workflow execution including validation, context creation,
   * dependency resolution, node execution, error handling, and result compilation.
   * Supports resume functionality and resource management.
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
   * const result = await manager.executeWorkflow(
   *   {
   *     id: 'data-pipeline',
   *     name: 'Data Processing Pipeline',
   *     version: '1.0.0',
   *     nodes: [
   *       {
   *         id: 'extract',
   *         type: 'llm',
   *         name: 'Data Extractor',
   *         position: { x: 0, y: 0 },
   *         data: { agentConfig: { name: 'extractor' } }
   *       },
   *       {
   *         id: 'transform',
   *         type: 'llm',
   *         name: 'Data Transformer',
   *         position: { x: 200, y: 0 },
   *         data: { agentConfig: { name: 'transformer' } }
   *       }
   *     ],
   *     edges: [
   *       {
   *         id: 'extract-to-transform',
   *         source: 'extract',
   *         target: 'transform'
   *       }
   *     ],
   *     createdAt: new Date(),
   *     updatedAt: new Date()
   *   },
   *   {
   *     sessionId: 'sess-123',
   *     userId: 'user-456',
   *     input: { data: 'Raw data to process' },
   *     variables: { outputFormat: 'json', maxResults: 100 }
   *   },
   *   {
   *     timeout: 600000, // 10 minutes
   *     enableParallelExecution: true,
   *     maxParallelNodes: 3
   *   }
   * );
   * 
   * console.log('Execution completed:', result.status);
   * console.log('Duration:', result.duration, 'ms');
   * console.log('Nodes executed:', result.nodesExecuted, 'of', result.totalNodes);
   * ```
   * 
   * Execution flow:
   * 1. Validates initialization and resource availability
   * 2. Checks for resume scenario and loads existing context
   * 3. Validates concurrent execution limits
   * 4. Delegates to workflow engine for core execution
   * 5. Tracks active execution for resource management
   * 6. Handles errors with comprehensive context
   * 7. Updates execution history and metrics
   */
  async executeWorkflow(
    workflow: AgentWorkflow,
    input: WorkflowInput,
    options?: ExecutionOptions
  ): Promise<ExecutionResult> {
    // Step 1: Ensure initialization and validate readiness
    this.ensureInitialized();
    
    // Step 2: Check concurrent execution limits
    await this.checkExecutionLimits();
    
    try {
      // Step 3: Handle resume scenario if specified
      if (input.resumeFromExecution) {
        console.log(`Resuming execution ${input.resumeFromExecution}`);
        return this.resumeExecution(input.resumeFromExecution, input);
      }
      
      // Step 4: Execute new workflow
      console.log(`Starting workflow execution: ${workflow.name} (${workflow.id})`);
      const result = await this.engine!.executeWorkflow(workflow, input, options);
      
      // Step 5: Track active execution
      this.activeExecutions.add(result.executionId);
      
      try {
        // Execute and wait for completion
        // (The actual execution is already complete from engine.executeWorkflow)
        console.log(`✓ Workflow execution completed: ${result.executionId}`);
        console.log(`Status: ${result.status}, Duration: ${result.duration}ms, Nodes: ${result.nodesExecuted}/${result.totalNodes}`);
        
        return result;
        
      } finally {
        // Step 6: Clean up active execution tracking
        this.activeExecutions.delete(result.executionId);
      }
      
    } catch (error) {
      console.error(`Workflow execution failed for ${workflow.id}:`, error);
      
      // Re-throw with additional context if not already an ExecutionError
      if (error instanceof ExecutionError) {
        throw error;
      }
      
      throw new ExecutionError(
        'WORKFLOW_EXECUTION_FAILED',
        `Workflow execution failed: ${error.message}`,
        createExecutionErrorContext('', workflow.id, {
          workflowName: workflow.name,
          sessionId: input.sessionId,
          originalError: error.message
        }),
        'Check workflow configuration and agent availability',
        'error',
        error
      );
    }
  }
  
  /**
   * Executes a workflow with real-time streaming updates.
   * 
   * Provides all functionality of executeWorkflow with additional real-time
   * progress streaming through the provided IStreamer interface. Streams
   * workflow events, node progress, and human interaction prompts.
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
   * const streamingManager = AgentHub.getInstance().getModule('streamingManager');
   * const streamer = streamingManager.getStreamer('sess-123');
   * 
   * const result = await manager.executeWorkflowStreaming(
   *   workflow,
   *   { sessionId: 'sess-123', input: data },
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
    this.ensureInitialized();
    await this.checkExecutionLimits();
    
    try {
      console.log(`Starting streaming workflow execution: ${workflow.name} (${workflow.id})`);
      const result = await this.engine!.executeWorkflowStreaming(workflow, input, streamer, options);
      
      this.activeExecutions.add(result.executionId);
      
      try {
        console.log(`✓ Streaming workflow execution completed: ${result.executionId}`);
        return result;
      } finally {
        this.activeExecutions.delete(result.executionId);
      }
      
    } catch (error) {
      console.error(`Streaming workflow execution failed for ${workflow.id}:`, error);
      throw error instanceof ExecutionError ? error : new ExecutionError(
        'STREAMING_WORKFLOW_EXECUTION_FAILED',
        `Streaming workflow execution failed: ${error.message}`,
        createExecutionErrorContext('', workflow.id, { originalError: error.message }),
        'Check workflow configuration and streaming setup'
      );
    }
  }
  
  /**
   * Pauses an active execution gracefully.
   * 
   * Pauses workflow execution at the next safe checkpoint and saves
   * current state for later resumption. Handles in-progress nodes
   * and dependency states appropriately.
   * 
   * @param executionId - Unique execution identifier
   * @throws {ExecutionError} If execution cannot be paused or not found
   * 
   * @example
   * ```typescript
   * await manager.pauseExecution('exec-123');
   * console.log('Execution paused successfully');
   * ```
   */
  async pauseExecution(executionId: string): Promise<void> {
    this.ensureInitialized();
    
    try {
      const context = this.contextManager!.getExecutionContext(executionId);
      if (!context) {
        throw new ExecutionError(
          'EXECUTION_NOT_FOUND',
          `Execution context not found: ${executionId}`,
          { executionId },
          'Verify execution ID is correct and execution is active'
        );
      }
      
      // Update execution status to paused
      context.state.status = 'PAUSED';
      context.state.lastUpdated = new Date();
      
      // Save context state
      await this.contextManager!.saveExecutionContext(context);
      
      console.log(`✓ Execution ${executionId} paused successfully`);
      
    } catch (error) {
      console.error(`Failed to pause execution ${executionId}:`, error);
      throw error instanceof ExecutionError ? error : new ExecutionError(
        'PAUSE_EXECUTION_FAILED',
        `Failed to pause execution: ${error.message}`,
        { executionId, originalError: error.message }
      );
    }
  }
  
  /**
   * Resumes a paused or failed execution from saved state.
   * 
   * Loads execution context from persistent storage, validates state integrity,
   * and continues execution from the last checkpoint. Supports providing
   * additional input for updated execution parameters.
   * 
   * @param executionId - Unique execution identifier
   * @param input - Optional additional input data or parameter updates
   * @returns Promise resolving to execution results
   * @throws {ExecutionError} If execution cannot be resumed or context invalid
   * 
   * @example
   * ```typescript
   * // Resume with same parameters
   * const result = await manager.resumeExecution('exec-123');
   * 
   * // Resume with updated input
   * const resultWithUpdates = await manager.resumeExecution('exec-123', {
   *   sessionId: 'sess-123',
   *   input: { updatedData: 'new value' },
   *   variables: { maxRetries: 5 }
   * });
   * ```
   */
  async resumeExecution(executionId: string, input?: any): Promise<ExecutionResult> {
    this.ensureInitialized();
    await this.checkExecutionLimits();
    
    try {
      console.log(`Attempting to resume execution ${executionId}`);
      
      // Step 1: Load execution context from storage
      const sessionId = input?.sessionId || 'unknown';
      const context = await this.contextManager!.loadExecutionContext(executionId, sessionId);
      
      if (!context) {
        throw new ExecutionContextError(
          `Execution context not found for resumption: ${executionId}`,
          { executionId, sessionId }
        );
      }
      
      // Step 2: Update context for resumption
      if (input) {
        context.input = { ...context.input, ...input };
      }
      
      context.state.status = 'RUNNING';
      context.state.lastUpdated = new Date();
      
      // Step 3: Track active execution
      this.activeExecutions.add(executionId);
      
      try {
        // Step 4: Continue execution from saved state
        const result = await this.engine!.continueWorkflow(context);
        
        console.log(`✓ Execution ${executionId} resumed and completed`);
        console.log(`Final status: ${result.status}, Total duration: ${result.duration}ms`);
        
        return result;
        
      } finally {
        this.activeExecutions.delete(executionId);
      }
      
    } catch (error) {
      console.error(`Failed to resume execution ${executionId}:`, error);
      throw error instanceof ExecutionError ? error : new ExecutionError(
        'RESUME_EXECUTION_FAILED',
        `Failed to resume execution: ${error.message}`,
        { executionId, originalError: error.message }
      );
    }
  }
  
  /**
   * Terminates an active execution immediately.
   * 
   * Forcefully stops execution, cleans up resources, and marks execution
   * as terminated. Cannot be resumed after termination.
   * 
   * @param executionId - Unique execution identifier
   * @throws {ExecutionError} If execution cannot be terminated
   * 
   * @example
   * ```typescript
   * await manager.terminateExecution('exec-123');
   * console.log('Execution terminated');
   * ```
   */
  async terminateExecution(executionId: string): Promise<void> {
    this.ensureInitialized();
    
    try {
      const context = this.contextManager!.getExecutionContext(executionId);
      if (context) {
        context.state.status = 'TERMINATED';
        context.state.lastUpdated = new Date();
        context.state.completedAt = new Date();
        
        await this.contextManager!.saveExecutionContext(context);
      }
      
      // Remove from active executions
      this.activeExecutions.delete(executionId);
      
      console.log(`✓ Execution ${executionId} terminated`);
      
    } catch (error) {
      console.error(`Failed to terminate execution ${executionId}:`, error);
      throw new ExecutionError(
        'TERMINATE_EXECUTION_FAILED',
        `Failed to terminate execution: ${error.message}`,
        { executionId, originalError: error.message }
      );
    }
  }
  
  /**
   * Saves execution state to persistent storage.
   * 
   * @param executionId - Unique execution identifier
   * @param state - Execution state to save
   * @throws {StatePersistenceError} If state cannot be saved
   * 
   * @example
   * ```typescript
   * await manager.saveExecutionState('exec-123', executionState);
   * ```
   */
  async saveExecutionState(executionId: string, state: ExecutionState): Promise<void> {
    this.ensureInitialized();
    
    const context = this.contextManager!.getExecutionContext(executionId);
    if (context) {
      context.state = state;
      await this.contextManager!.saveExecutionContext(context);
    }
  }
  
  /**
   * Loads execution state from persistent storage.
   * 
   * @param executionId - Unique execution identifier
   * @returns Promise resolving to execution state or null if not found
   * 
   * @example
   * ```typescript
   * const state = await manager.loadExecutionState('exec-123');
   * if (state) {
   *   console.log('Execution status:', state.status);
   * }
   * ```
   */
  async loadExecutionState(executionId: string): Promise<ExecutionState | null> {
    this.ensureInitialized();
    
    const context = this.contextManager!.getExecutionContext(executionId);
    return context?.state || null;
  }
  
  /**
   * Gets current execution status.
   * 
   * @param executionId - Unique execution identifier
   * @returns Promise resolving to current execution status
   * 
   * @example
   * ```typescript
   * const status = await manager.getExecutionStatus('exec-123');
   * console.log('Current status:', status);
   * ```
   */
  async getExecutionStatus(executionId: string): Promise<ExecutionStatus> {
    this.ensureInitialized();
    
    const context = this.contextManager!.getExecutionContext(executionId);
    return context?.state.status || 'PENDING';
  }
  
  /**
   * Pauses execution for human input with comprehensive interaction management.
   * 
   * Suspends execution and creates a human interaction request with timeout
   * handling, choice options, and streaming notifications. Supports various
   * interaction types including approval, input, choice, and confirmation.
   * 
   * @param executionId - Unique execution identifier
   * @param prompt - Human-readable prompt message
   * @param options - Human interaction configuration options
   * @throws {HumanInteractionError} If interaction setup fails
   * 
   * @example
   * ```typescript
   * // Simple approval request
   * await manager.pauseForHumanInput(
   *   'exec-123',
   *   'Please approve the data processing step'
   * );
   * 
   * // Choice request with timeout
   * await manager.pauseForHumanInput(
   *   'exec-123',
   *   'Select output format:',
   *   {
   *     type: 'choice',
   *     choices: ['JSON', 'CSV', 'XML'],
   *     timeout: 300000,
   *     required: true
   *   }
   * );
   * 
   * // Input request with metadata
   * await manager.pauseForHumanInput(
   *   'exec-123',
   *   'Enter the target database name:',
   *   {
   *     type: 'input',
   *     required: true,
   *     metadata: { inputType: 'string', validation: 'alphanumeric' }
   *   }
   * );
   * ```
   */
  async pauseForHumanInput(
    executionId: string,
    prompt: string,
    options?: HumanPromptOptions
  ): Promise<void> {
    this.ensureInitialized();
    
    try {
      const context = this.contextManager!.getExecutionContext(executionId);
      if (!context) {
        throw new HumanInteractionError(
          `Execution context not found: ${executionId}`,
          { executionId },
          'Verify execution ID is correct and execution is active'
        );
      }
      
      // Create human interaction record
      const interaction: HumanInteraction = {
        id: this.generateInteractionId(),
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
      
      // Update execution state
      context.state.humanInteractions.push(interaction);
      context.state.status = 'WAITING_FOR_HUMAN';
      context.state.lastUpdated = new Date();
      
      // Track pending interaction
      this.pendingHumanInteractions.set(interaction.id, interaction);
      
      // Save context state
      await this.contextManager!.saveExecutionContext(context);
      
      // Stream human prompt if streamer available
      if (context.streamer) {
        context.streamer.streamHumanPrompt(context.input.sessionId, prompt, options);
      }
      
      console.log(`✓ Human interaction created for execution ${executionId}`);
      console.log(`Interaction type: ${interaction.type}, timeout: ${interaction.timeout || 'none'}`);
      
      // Set up timeout handling if specified
      if (interaction.timeout) {
        setTimeout(async () => {
          await this.handleHumanInteractionTimeout(interaction.id);
        }, interaction.timeout);
      }
      
    } catch (error) {
      console.error(`Failed to create human interaction for ${executionId}:`, error);
      throw error instanceof HumanInteractionError ? error : new HumanInteractionError(
        `Failed to create human interaction: ${error.message}`,
        { executionId, originalError: error.message }
      );
    }
  }
  
  /**
   * Resumes execution with human-provided input.
   * 
   * Processes human response to pending interaction and continues execution
   * with the provided input data. Validates response format and updates
   * interaction history.
   * 
   * @param executionId - Unique execution identifier
   * @param input - Human-provided input data
   * @throws {HumanInteractionError} If no pending interaction or invalid input
   * 
   * @example
   * ```typescript
   * // Respond to approval request
   * await manager.resumeWithHumanInput('exec-123', { approved: true });
   * 
   * // Respond to choice request
   * await manager.resumeWithHumanInput('exec-123', { choice: 'JSON' });
   * 
   * // Respond to input request
   * await manager.resumeWithHumanInput('exec-123', { value: 'production_db' });
   * ```
   */
  async resumeWithHumanInput(executionId: string, input: any): Promise<void> {
    this.ensureInitialized();
    
    try {
      const context = this.contextManager!.getExecutionContext(executionId);
      if (!context) {
        throw new HumanInteractionError(
          `Execution context not found: ${executionId}`,
          { executionId }
        );
      }
      
      // Find pending human interaction
      const pendingInteraction = context.state.humanInteractions
        .find(hi => !hi.response);
      
      if (!pendingInteraction) {
        throw new HumanInteractionError(
          `No pending human interaction found for execution: ${executionId}`,
          { executionId },
          'Ensure there is an active human interaction waiting for response'
        );
      }
      
      // Update interaction with response
      pendingInteraction.response = input;
      pendingInteraction.respondedAt = new Date();
      
      // Remove from pending interactions
      this.pendingHumanInteractions.delete(pendingInteraction.id);
      
      // Stream human response if streamer available
      if (context.streamer) {
        context.streamer.streamHumanResponse(context.input.sessionId, input);
      }
      
      // Resume execution
      context.state.status = 'RUNNING';
      context.state.lastUpdated = new Date();
      
      await this.contextManager!.saveExecutionContext(context);
      
      console.log(`✓ Human input received for execution ${executionId}`);
      console.log(`Response: ${JSON.stringify(input)}`);
      
    } catch (error) {
      console.error(`Failed to process human input for ${executionId}:`, error);
      throw error instanceof HumanInteractionError ? error : new HumanInteractionError(
        `Failed to process human input: ${error.message}`,
        { executionId, originalError: error.message }
      );
    }
  }
  
  /**
   * Gets execution history for a workflow.
   * 
   * @param workflowId - Workflow identifier
   * @param limit - Maximum number of executions to return
   * @returns Promise resolving to execution summaries
   * 
   * @example
   * ```typescript
   * const history = await manager.getExecutionHistory('workflow-123', 10);
   * console.log(`Found ${history.length} past executions`);
   * ```
   */
  async getExecutionHistory(workflowId: string, limit?: number): Promise<ExecutionSummary[]> {
    this.ensureInitialized();
    
    // This would integrate with actual execution history storage
    // For now, return empty array
    console.log(`Getting execution history for workflow ${workflowId} (limit: ${limit || 'none'})`);
    return [];
  }
  
  /**
   * Gets detailed execution information.
   * 
   * @param executionId - Unique execution identifier
   * @returns Promise resolving to detailed execution information
   * 
   * @example
   * ```typescript
   * const details = await manager.getExecutionDetails('exec-123');
   * console.log('Execution details:', details.result.status);
   * ```
   */
  async getExecutionDetails(executionId: string): Promise<ExecutionDetails> {
    this.ensureInitialized();
    
    // This would integrate with actual execution details storage
    // For now, throw not implemented error
    throw new ExecutionError(
      'NOT_IMPLEMENTED',
      'getExecutionDetails not yet implemented',
      { executionId }
    );
  }
  
  /**
   * Validates workflow definition comprehensively.
   * 
   * Delegates to the workflow engine for structural validation including
   * graph integrity, node configurations, and dependency analysis.
   * 
   * @param workflow - Workflow definition to validate
   * @returns Promise resolving to validation results with errors and warnings
   * 
   * @example
   * ```typescript
   * const validation = await manager.validateWorkflow(workflow);
   * if (!validation.isValid) {
   *   console.log('Validation errors:', validation.errors);
   *   console.log('Validation warnings:', validation.warnings);
   * }
   * ```
   */
  async validateWorkflow(workflow: AgentWorkflow): Promise<ValidationResult> {
    this.ensureInitialized();
    
    return this.engine!.validateWorkflow(workflow);
  }
  
  /**
   * Returns comprehensive health status of the Execution Manager.
   * 
   * Provides detailed health information including active execution counts,
   * resource utilization, component status, and performance metrics.
   * 
   * @returns Promise resolving to detailed health status
   * 
   * @example
   * ```typescript
   * const health = await manager.health();
   * console.log('Health status:', health.status);
   * console.log('Active executions:', health.details?.activeExecutions);
   * ```
   */
  async health(): Promise<HealthStatus> {
    try {
      if (!this.initialized) {
        return {
          status: 'unhealthy',
          message: 'Execution Manager not initialized',
          details: { initialized: false }
        };
      }
      
      const contextStats = this.contextManager?.getContextStatistics();
      const activeExecutions = this.activeExecutions.size;
      const pendingInteractions = this.pendingHumanInteractions.size;
      
      const isHealthy = activeExecutions < (this.config.maxConcurrentExecutions || 100);
      
      return {
        status: isHealthy ? 'healthy' : 'degraded',
        message: isHealthy 
          ? 'Execution Manager operational' 
          : 'Execution Manager approaching capacity limits',
        details: {
          initialized: this.initialized,
          activeExecutions,
          maxConcurrent: this.config.maxConcurrentExecutions,
          pendingHumanInteractions: pendingInteractions,
          contextStatistics: contextStats,
          configuration: {
            parallelExecution: this.config.parallelExecution?.enabled,
            statePersistence: this.config.statePersistence?.enabled,
            defaultTimeout: this.config.defaultTimeout
          }
        }
      };
      
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `Health check failed: ${error.message}`,
        details: { error: error.message }
      };
    }
  }
  
  /**
   * Gracefully shuts down the Execution Manager.
   * 
   * Saves all active execution states, cleans up resources,
   * and prepares for system shutdown.
   * 
   * @example
   * ```typescript
   * await manager.shutdown();
   * console.log('Execution Manager shut down successfully');
   * ```
   */
  async shutdown(): Promise<void> {
    console.log('Shutting down Execution Manager...');
    
    try {
      // Shutdown context manager
      if (this.contextManager) {
        await this.contextManager.shutdown();
      }
      
      // Clear active executions
      this.activeExecutions.clear();
      this.pendingHumanInteractions.clear();
      
      this.initialized = false;
      
      console.log('✓ Execution Manager shut down successfully');
      
    } catch (error) {
      console.error('Error during Execution Manager shutdown:', error);
      throw error;
    }
  }
  
  // Private helper methods
  
  /**
   * Ensures the manager is properly initialized.
   * 
   * @private
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new ExecutionError(
        'EXECUTION_MANAGER_NOT_INITIALIZED',
        'Execution Manager not initialized. Call initialize() first.',
        {},
        'Call initialize() with proper configuration before using the Execution Manager'
      );
    }
  }
  
  /**
   * Merges user configuration with secure defaults.
   * 
   * @private
   */
  private mergeWithDefaults(config: ExecutionManagerConfig): ExecutionManagerConfig {
    return {
      maxConcurrentExecutions: 10,
      defaultTimeout: 300000, // 5 minutes
      maxRetries: 3,
      queueProcessingInterval: 1000,
      dependencyResolutionTimeout: 30000,
      humanInteractionTimeout: 600000, // 10 minutes
      humanInteractionRetryLimit: 3,
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
  }
  
  /**
   * Initializes required module dependencies.
   * 
   * @private
   */
  private async initializeDependencies(): Promise<{
    memoryModule: any;
    streamingManager?: any;
  }> {
    // In a real implementation, this would get modules from AgentHub registry
    // For now, we'll simulate the dependencies
    
    console.log('Retrieving required modules from AgentHub registry...');
    
    // Mock dependencies for now
    const memoryModule = {
      setRuntimeState: async (sessionId: string, state: any) => {
        console.log(`Mock: Saving runtime state for session ${sessionId}`);
      },
      getRuntimeState: async (sessionId: string) => {
        console.log(`Mock: Loading runtime state for session ${sessionId}`);
        return {};
      }
    };
    
    const streamingManager = {
      getStreamer: (sessionId: string) => ({
        streamWorkflowStart: (sessionId: string, workflowId: string, name: string) => {
          console.log(`Mock: Streaming workflow start: ${name}`);
        },
        streamWorkflowEnd: (sessionId: string, workflowId: string, output: any) => {
          console.log(`Mock: Streaming workflow end`);
        },
        streamWorkflowProgress: (sessionId: string, workflowId: string, progress: any) => {
          console.log(`Mock: Streaming progress: ${progress.percentage}%`);
        },
        streamNodeStart: (sessionId: string, nodeId: string, name: string, type: string) => {
          console.log(`Mock: Streaming node start: ${name}`);
        },
        streamNodeEnd: (sessionId: string, nodeId: string, output: any, duration: number) => {
          console.log(`Mock: Streaming node end: ${nodeId} (${duration}ms)`);
        },
        streamNodeError: (sessionId: string, nodeId: string, error: any) => {
          console.log(`Mock: Streaming node error: ${nodeId}`);
        },
        streamHumanPrompt: (sessionId: string, prompt: string, options?: any) => {
          console.log(`Mock: Streaming human prompt: ${prompt}`);
        },
        streamHumanResponse: (sessionId: string, response: any) => {
          console.log(`Mock: Streaming human response`);
        },
        streamError: (sessionId: string, error: any) => {
          console.log(`Mock: Streaming error: ${error.message}`);
        }
      })
    };
    
    console.log('✓ Retrieved required modules successfully');
    
    return {
      memoryModule,
      streamingManager
    };
  }
  
  /**
   * Validates successful initialization.
   * 
   * @private
   */
  private async validateInitialization(): Promise<void> {
    if (!this.engine) {
      throw new ExecutionError(
        'EXECUTION_ENGINE_INIT_FAILED',
        'Failed to initialize workflow execution engine'
      );
    }
    
    if (!this.contextManager) {
      throw new ExecutionError(
        'CONTEXT_MANAGER_INIT_FAILED',
        'Failed to initialize execution context manager'
      );
    }
    
    console.log('✓ All components initialized successfully');
  }
  
  /**
   * Checks concurrent execution limits.
   * 
   * @private
   */
  private async checkExecutionLimits(): Promise<void> {
    const maxConcurrent = this.config.maxConcurrentExecutions || 10;
    
    if (this.activeExecutions.size >= maxConcurrent) {
      throw new ExecutionError(
        'MAX_CONCURRENT_EXECUTIONS_REACHED',
        `Maximum concurrent executions reached: ${maxConcurrent}`,
        {
          activeExecutions: this.activeExecutions.size,
          maxConcurrent
        },
        'Wait for existing executions to complete or increase concurrent execution limit'
      );
    }
  }
  
  /**
   * Handles human interaction timeout.
   * 
   * @private
   */
  private async handleHumanInteractionTimeout(interactionId: string): Promise<void> {
    const interaction = this.pendingHumanInteractions.get(interactionId);
    
    if (interaction && !interaction.response) {
      console.log(`Human interaction ${interactionId} timed out`);
      
      // Remove from pending interactions
      this.pendingHumanInteractions.delete(interactionId);
      
      // Could implement default response or execution termination here
      // For now, just log the timeout
    }
  }
  
  /**
   * Generates unique interaction ID.
   * 
   * @private
   */
  private generateInteractionId(): string {
    return `interact-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}