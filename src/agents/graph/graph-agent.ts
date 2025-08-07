/**
 * @fileoverview Main Graph Agent implementation
 * @module agents/graph/graph-agent
 * @requires ../base/base-agent
 * @requires ./types
 * @requires ./errors
 * @requires ./graph-state-manager
 * @requires ./graph-executor
 * @requires ./graph-builder
 * 
 * This file implements the main Graph Agent class that orchestrates complex
 * workflows as directed acyclic graphs. The agent integrates all components
 * including state management, execution orchestration, graph construction,
 * and error handling to provide a complete graph-based workflow system.
 * 
 * Key responsibilities:
 * - Serve as the main interface for graph-based workflow execution
 * - Coordinate between state manager, executor, and builder components
 * - Provide high-level APIs for graph execution and management
 * - Handle graph validation, optimization, and compilation
 * - Support streaming execution with real-time updates
 * - Manage execution lifecycle and resource allocation
 * - Integrate with AgentHub module system and registry
 * - Provide comprehensive monitoring and debugging capabilities
 * 
 * Key concepts:
 * - Extension of BaseAgent with graph-specific functionality
 * - Integration of all graph subsystems (state, execution, building)
 * - High-level workflow orchestration and management
 * - Real-time execution monitoring and streaming
 * - Comprehensive error handling and recovery
 * - Performance optimization and resource management
 * - Module integration and dependency management
 * 
 * @example
 * ```typescript
 * import { GraphAgent } from './graph-agent';
 * import { GraphBuilder } from './graph-builder';
 * 
 * // Create and configure graph agent
 * const agent = new GraphAgent({
 *   name: 'Workflow Processor',
 *   description: 'Processes complex workflows as graphs',
 *   execution: {
 *     strategy: 'parallel',
 *     maxConcurrency: 4,
 *     timeout: 300000
 *   },
 *   state: {
 *     persistence: 'memory',
 *     checkpointing: { enabled: true }
 *   }
 * });
 * 
 * await agent.initialize();
 * 
 * // Build a graph
 * const graph = new GraphBuilder()
 *   .addInputNode('start')
 *   .addAgentNode('process', 'content-processor')
 *   .addOutputNode('end')
 *   .connectNodes('start', 'process')
 *   .connectNodes('process', 'end')
 *   .build();
 * 
 * // Execute the graph
 * const result = await agent.execute({
 *   data: { content: 'Hello world' },
 *   graph,
 *   sessionId: 'session-123'
 * });
 * ```
 * 
 * @since 1.0.0
 */

import { BaseAgent } from '../base/base-agent';
import { TaskInput, TaskOutput, ExecutionContext, AgentResult } from '../base/types';
import {
  GraphAgentConfig,
  GraphAgentInput,
  GraphAgentOutput,
  GraphAgentStreamOutput,
  GraphAgentCapabilities,
  GraphAgentType,
  IGraphAgent,
  GraphDefinition,
  ExecutableGraph,
  GraphValidationResult,
  GraphExecutionState,
  GraphExecutionHistory,
  ExecutionHistoryFilters,
  GraphExecutionContext,
  GraphStateConfig,
  GraphExecutionConfig,
  NodeTypeRegistry,
  GraphPerformanceConfig,
  GraphErrorConfig,
  GraphMonitoringConfig,
  NodeExecutionResult,
  ExecutionStep,
  GraphPerformanceMetrics,
  GraphCheckpoint,
  GraphWarning,
  GraphBuilder as IGraphBuilder
} from './types';

import {
  GraphAgentError,
  GraphValidationError,
  GraphInitializationError,
  GraphStateError,
  NodeExecutionError,
  GraphTimeoutError,
  GraphResourceError,
  createGraphErrorContext,
  isGraphAgentError,
  isRetryableError
} from './errors';

import { GraphStateManager } from './graph-state-manager';
import { GraphExecutor } from './graph-executor';
import { GraphBuilder } from './graph-builder';

/**
 * Main Graph Agent implementation for workflow orchestration.
 * 
 * The Graph Agent executes complex workflows represented as directed acyclic
 * graphs, providing comprehensive state management, execution orchestration,
 * error handling, and performance monitoring capabilities.
 * 
 * @public
 */
export class GraphAgent extends BaseAgent implements IGraphAgent {
  readonly type: GraphAgentType = 'graph';
  readonly name: string;
  readonly version: string;
  readonly capabilities: string[];
  
  protected config: Required<GraphAgentConfig>;
  protected modules: Record<string, any>;
  
  private stateManager: GraphStateManager;
  private executor: GraphExecutor;
  private nodeTypeRegistry: NodeTypeRegistry;
  
  private activeExecutions: Map<string, GraphExecutionContext> = new Map();
  private executionHistory: Map<string, GraphExecutionHistory> = new Map();
  private performanceMetrics: Map<string, GraphPerformanceMetrics> = new Map();
  
  private initialized: boolean = false;
  
  /**
   * Creates a new Graph Agent instance.
   * 
   * @param config - Graph agent configuration
   * @throws {GraphAgentError} If configuration is invalid
   */
  constructor(config: GraphAgentConfig) {
    super(config.id || 'graph-agent');
    
    this.config = this.applyDefaults(config);
    this.name = this.config.name || 'Graph Agent';
    this.version = this.config.version || '1.0.0';
    this.capabilities = ['graph-execution', 'workflow-orchestration', 'parallel-processing'];
    this.modules = this.config.modules || {};
    
    this.validateGraphConfiguration();
    
    // Initialize components
    this.stateManager = new GraphStateManager(this.config.state!);
    this.executor = new GraphExecutor(this.config.execution!, this.stateManager);
    this.nodeTypeRegistry = this.config.nodeTypes || {};
    
    console.log(`Graph Agent created: ${this.name}`);
  }
  
  /**
   * Initializes the Graph Agent with module dependencies.
   * 
   * @returns Promise that resolves when initialization is complete
   * @throws {GraphInitializationError} If initialization fails
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log(`Graph Agent already initialized: ${this.name}`);
      return;
    }
    
    console.log(`Initializing Graph Agent: ${this.name}`);
    
    try {
      // Initialize base agent
      await super.initialize({
        id: this.config.id || 'graph-agent',
        config: this.config.config
      });
      
      // Initialize executor
      await this.executor.initialize();
      
      // Validate required modules are available
      await this.validateModuleDependencies();
      
      this.initialized = true;
      
      console.log(`✓ Graph Agent initialized: ${this.name}`, {
        strategy: this.config.execution.strategy,
        maxConcurrency: this.config.execution.maxConcurrency,
        statePersistence: this.config.state.persistence,
        checkpointingEnabled: this.config.state.checkpointing.enabled
      });
      
    } catch (error) {
      console.error(`Failed to initialize Graph Agent: ${this.name}`, error);
      
      throw new GraphInitializationError(
        `Graph agent initialization failed: ${error instanceof Error ? error.message : String(error)}`,
        'state_initialization',
        createGraphErrorContext(undefined, this.id),
        undefined,
        undefined
      );
    }
  }
  
  /**
   * Executes a task using the BaseAgent interface.
   * 
   * @param context - Execution context
   * @returns Promise resolving to agent result
   */
  protected async executeTask(context: ExecutionContext): Promise<AgentResult> {
    // Convert ExecutionContext to GraphAgentInput
    const graphInput: GraphAgentInput = {
      data: context.task.input || {},
      sessionId: context.session.id,
      userId: context.session.userId,
      graph: this.config.graph
    };
    
    const result = await this.executeGraph(graphInput);
    
    // Convert GraphAgentOutput to AgentResult
    return {
      success: result.success,
      output: result.result,
      metadata: {
        duration: result.execution.duration || 0,
        endTime: new Date(),
        tokensUsed: 0,
        cost: 0
      },
      toolsUsed: []
    };
  }

  /**
   * Executes a task using the BaseAgent interface.
   * 
   * @param context - Execution context
   * @returns Promise resolving to agent result
   */
  async execute(context: ExecutionContext): Promise<AgentResult> {
    return this.executeTask(context);
  }

  /**
   * Executes a graph workflow.
   * 
   * @param input - Graph agent input
   * @returns Promise resolving to graph agent output
   * @throws {GraphAgentError} If execution fails
   */
  async executeGraph(input: GraphAgentInput): Promise<GraphAgentOutput> {
    if (!this.initialized) {
      throw new GraphStateError(
        'execution',
        'Graph agent not initialized',
        createGraphErrorContext()
      );
    }
    
    const startTime = Date.now();
    const executionId = this.generateExecutionId();
    
    console.log(`Starting graph execution: ${executionId}`);
    
    try {
      // Validate input
      this.validateInput(input);
      
      // Determine graph to execute
      const graph = input.graph || this.config.graph;
      if (!graph) {
        throw new GraphAgentError(
          'MISSING_GRAPH',
          'No graph provided for execution',
          createGraphErrorContext(executionId)
        );
      }
      
      // Build executable graph
      const executableGraph = await this.buildExecutableGraph(graph, input);
      
      // Create execution context
      const context = this.createExecutionContext(executionId, input, executableGraph);
      this.activeExecutions.set(executionId, context);
      
      // Execute the graph
      const result = await this.executor.execute(executableGraph, input, context);
      
      // Record execution history
      await this.recordExecutionHistory(executionId, result, startTime);
      
      // Build final output
      const output = await this.buildFinalOutput(result, context, startTime);
      
      console.log(`✓ Graph execution completed: ${executionId} (${Date.now() - startTime}ms)`);
      
      return output;
      
    } catch (error) {
      console.error(`Graph execution failed: ${executionId}`, error);
      
      if (isGraphAgentError(error)) {
        throw error;
      }
      
      throw new GraphAgentError(
        'EXECUTION_FAILED',
        `Graph execution failed: ${error instanceof Error ? error.message : String(error)}`,
        createGraphErrorContext(executionId),
        'error',
        isRetryableError(error),
        error instanceof Error ? error : undefined
      );
      
    } finally {
      // Cleanup
      this.activeExecutions.delete(executionId);
    }
  }
  
  /**
   * Streams graph execution with real-time updates.
   * 
   * @param input - Graph agent input
   * @returns Async iterator for streaming output
   * @throws {GraphAgentError} If streaming fails
   */
  async *stream(input: GraphAgentInput): AsyncIterableIterator<GraphAgentStreamOutput> {
    if (!this.initialized) {
      throw new GraphStateError(
        'execution',
        'Graph agent not initialized',
        createGraphErrorContext()
      );
    }
    
    const executionId = this.generateExecutionId();
    
    console.log(`Starting graph stream: ${executionId}`);
    
    try {
      // Validate input
      this.validateInput(input);
      
      // Determine graph to execute
      const graph = input.graph || this.config.graph;
      if (!graph) {
        throw new GraphAgentError(
          'MISSING_GRAPH',
          'No graph provided for streaming',
          createGraphErrorContext(executionId)
        );
      }
      
      // Build executable graph
      const executableGraph = await this.buildExecutableGraph(graph, input);
      
      // Create execution context
      const context = this.createExecutionContext(executionId, input, executableGraph);
      this.activeExecutions.set(executionId, context);
      
      // Stream execution steps
      let completedNodeResults: Record<string, NodeExecutionResult> = {};
      let executionPath: ExecutionStep[] = [];
      
      for await (const step of this.executor.stream(executableGraph, input, context)) {
        executionPath.push(step);
        
        // Update node results if step is complete
        if (step.type === 'node_complete') {
          const nodeResult: NodeExecutionResult = {
            nodeId: step.nodeId,
            status: 'completed',
            output: step.output,
            metadata: {
              nodeId: step.nodeId,
              startTime: step.timestamp,
              endTime: new Date(),
              duration: step.duration || 0,
              retryCount: 0,
              memoryUsage: 0,
              cpuUsage: 0
            },
            toolsUsed: [],
            duration: step.duration || 0,
            resourceUsage: {
              memory: 0,
              cpu: 0,
              disk: 0,
              network: 0,
              duration: step.duration || 0
            }
          };
          completedNodeResults[step.nodeId] = nodeResult;
        }
        
        // Get current state and progress
        const state = this.stateManager.getCurrentState(executionId);
        const progress = this.stateManager.getProgress(executionId);
        const metrics = this.stateManager.getPerformanceMetrics(executionId);
        
        // Build streaming output
        const streamOutput: GraphAgentStreamOutput = {
          step,
          completedNode: step.type === 'node_complete' ? completedNodeResults[step.nodeId] : undefined,
          activeNodes: Array.from(state?.executingNodes || []),
          progress: progress || {
            percentage: 0,
            completedNodes: 0,
            totalNodes: executableGraph.definition.nodes.length,
            currentPhase: 'starting',
            estimatedTimeRemaining: 0,
            throughputNodes: 0
          },
          metrics: metrics || this.getDefaultPerformanceMetrics(),
          completed: step.type === 'node_complete' && state?.status === 'completed'
        };
        
        yield streamOutput;
        
        // Break if execution is complete
        if (streamOutput.completed) {
          break;
        }
      }
      
      console.log(`✓ Graph stream completed: ${executionId}`);
      
    } catch (error) {
      console.error(`Graph stream failed: ${executionId}`, error);
      throw error;
    } finally {
      // Cleanup
      this.activeExecutions.delete(executionId);
    }
  }
  
  /**
   * Validates a graph structure for cycles and dependencies.
   * 
   * @param graph - Graph definition to validate
   * @returns Validation result with issues if any
   */
  validateGraph(graph: GraphDefinition): GraphValidationResult {
    try {
      const builder = new GraphBuilder()
        .fromJSON(JSON.stringify(graph))
        .validate();
      
      // If validation passed, return success result
      return {
        valid: true,
        errors: [],
        warnings: [],
        suggestions: [],
        metadata: {
          nodeCount: graph.nodes.length,
          edgeCount: graph.edges.length,
          maxDepth: 0,
          cyclicPaths: [],
          unreachableNodes: [],
          deadEndNodes: []
        }
      };
      
    } catch (error) {
      if (error instanceof GraphValidationError) {
        return {
          valid: false,
          errors: error.validationErrors,
          warnings: error.warnings,
          suggestions: [],
          metadata: {
            nodeCount: graph.nodes.length,
            edgeCount: graph.edges.length,
            maxDepth: 0,
            cyclicPaths: [],
            unreachableNodes: [],
            deadEndNodes: []
          }
        };
      }
      
      // Convert other errors to validation errors
      return {
        valid: false,
        errors: [{
          code: 'VALIDATION_ERROR',
          message: error instanceof Error ? error.message : String(error),
          severity: 'error'
        }],
        warnings: [],
        suggestions: [],
        metadata: {
          nodeCount: graph.nodes.length,
          edgeCount: graph.edges.length,
          maxDepth: 0,
          cyclicPaths: [],
          unreachableNodes: [],
          deadEndNodes: []
        }
      };
    }
  }
  
  /**
   * Builds a graph from configuration or builder pattern.
   * 
   * @param definition - Graph definition or builder function
   * @returns Built graph ready for execution
   */
  async buildGraph(definition: GraphDefinition | IGraphBuilder): Promise<ExecutableGraph> {
    if ('build' in definition) {
      // It's a builder
      const graphDef = definition.build();
      return await this.buildExecutableGraph(graphDef, { data: {}, sessionId: 'build' });
    } else {
      // It's a definition
      return await this.buildExecutableGraph(definition, { data: {}, sessionId: 'build' });
    }
  }
  
  /**
   * Gets current execution state for monitoring.
   * 
   * @param executionId - Execution identifier
   * @returns Current execution state
   */
  async getExecutionState(executionId: string): Promise<GraphExecutionState | undefined> {
    return this.stateManager.getCurrentState(executionId);
  }
  
  /**
   * Pauses graph execution at current node.
   * 
   * @param executionId - Execution identifier
   * @returns Whether pause was successful
   */
  async pauseExecution(executionId: string): Promise<boolean> {
    return await this.executor.pauseExecution(executionId);
  }
  
  /**
   * Resumes paused graph execution.
   * 
   * @param executionId - Execution identifier
   * @returns Whether resume was successful
   */
  async resumeExecution(executionId: string): Promise<boolean> {
    return await this.executor.resumeExecution(executionId);
  }
  
  /**
   * Cancels graph execution and cleans up resources.
   * 
   * @param executionId - Execution identifier
   * @returns Whether cancellation was successful
   */
  async cancelExecution(executionId: string): Promise<boolean> {
    const cancelled = await this.executor.cancelExecution(executionId);
    if (cancelled) {
      // Cleanup state
      await this.stateManager.cleanup(executionId);
      this.activeExecutions.delete(executionId);
    }
    return cancelled;
  }
  
  /**
   * Gets graph execution history and metrics.
   * 
   * @param filters - Optional filters for history query
   * @returns Execution history with performance metrics
   */
  async getExecutionHistory(filters?: ExecutionHistoryFilters): Promise<GraphExecutionHistory[]> {
    let history = Array.from(this.executionHistory.values());
    
    // Apply filters
    if (filters) {
      if (filters.startDate) {
        history = history.filter(h => h.startTime >= filters.startDate!);
      }
      if (filters.endDate) {
        history = history.filter(h => h.endTime <= filters.endDate!);
      }
      if (filters.status) {
        history = history.filter(h => filters.status!.includes(h.status));
      }
      if (filters.userId) {
        history = history.filter(h => h.userId === filters.userId);
      }
      if (filters.tags) {
        history = history.filter(h => 
          filters.tags!.some(tag => h.metadata.tags?.includes(tag))
        );
      }
    }
    
    // Sort by start time (newest first)
    history.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
    
    // Apply limit and offset
    if (filters?.offset) {
      history = history.slice(filters.offset);
    }
    if (filters?.limit) {
      history = history.slice(0, filters.limit);
    }
    
    return history;
  }
  
  /**
   * Gets graph agent capabilities.
   * 
   * @returns Graph agent capabilities
   */
  getCapabilities(): GraphAgentCapabilities {
    return {
      maxNodes: 1000,
      maxDepth: 50,
      supportedNodeTypes: Object.keys(this.nodeTypeRegistry),
      supportedExecutionStrategies: ['sequential', 'parallel', 'hybrid', 'adaptive'],
      supportsParallelExecution: this.config.execution.maxConcurrency > 1,
      supportsConditionalExecution: true,
      supportsDynamicGraphs: false, // TODO: Implement dynamic graph modification
      supportsCheckpoints: this.config.state.checkpointing.enabled,
      supportsVisualization: false, // TODO: Implement visualization
      maxConcurrentNodes: this.config.execution.maxConcurrency
    };
  }
  
  /**
   * Shuts down the agent and cleans up resources.
   * 
   * @returns Promise that resolves when shutdown is complete
   */
  async shutdown(): Promise<void> {
    if (!this.initialized) {
      return;
    }
    
    console.log(`Shutting down Graph Agent: ${this.name}`);
    
    // Cancel all active executions
    const cancelPromises = Array.from(this.activeExecutions.keys()).map(
      executionId => this.cancelExecution(executionId)
    );
    await Promise.all(cancelPromises);
    
    // Shutdown components
    await this.executor.shutdown();
    await this.stateManager.shutdown();
    
    // Clear state
    this.activeExecutions.clear();
    this.executionHistory.clear();
    this.performanceMetrics.clear();
    
    // Shutdown base agent
    await super.shutdown();
    
    this.initialized = false;
    
    console.log(`✓ Graph Agent shutdown complete: ${this.name}`);
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
  private applyDefaults(config: GraphAgentConfig): Required<GraphAgentConfig> {
    return {
      ...config,
      type: 'graph',
      name: config.name || 'Graph Agent',
      description: config.description || 'Graph-based workflow agent',
      version: config.version || '1.0.0',
      modules: config.modules || {},
      config: config.config || {},
      environment: config.environment || 'production',
      logging: config.logging || { level: 'info', enabled: true },
      timeouts: config.timeouts || { execution: 300000 },
      limits: config.limits || {},
      integrations: config.integrations || {},
      graph: config.graph,
      execution: {
        strategy: config.execution?.strategy || 'parallel',
        maxConcurrency: config.execution?.maxConcurrency || 4,
        timeout: config.execution?.timeout || 300000,
        errorHandling: config.execution?.errorHandling || 'fail_fast',
        retry: {
          maxAttempts: config.execution?.retry?.maxAttempts || 3,
          backoffStrategy: config.execution?.retry?.backoffStrategy || 'exponential',
          initialDelay: config.execution?.retry?.initialDelay || 1000,
          maxDelay: config.execution?.retry?.maxDelay || 30000,
          retryableErrors: config.execution?.retry?.retryableErrors || []
        },
        retryPolicy: {
          maxAttempts: config.execution?.retry?.maxAttempts || 3,
          backoffStrategy: config.execution?.retry?.backoffStrategy || 'exponential',
          initialDelay: config.execution?.retry?.initialDelay || 1000,
          maxDelay: config.execution?.retry?.maxDelay || 30000,
          retryableErrors: config.execution?.retry?.retryableErrors || []
        },
        checkpointing: {
          enabled: config.execution?.checkpointing?.enabled !== false,
          frequency: config.execution?.checkpointing?.frequency || 'node',
          interval: config.execution?.checkpointing?.interval || 60000,
          storage: config.execution?.checkpointing?.storage || 'memory',
          compression: config.execution?.checkpointing?.compression || 'none',
          retention: config.execution?.checkpointing?.retention || 10
        },
        optimization: {
          enabled: config.execution?.optimization?.enabled !== false,
          strategies: config.execution?.optimization?.strategies || ['parallel_expansion'],
          threshold: config.execution?.optimization?.threshold || 0.5,
          adaptive: config.execution?.optimization?.adaptive !== false
        }
      },
      nodeTypes: config.nodeTypes || {},
      state: {
        persistence: config.state?.persistence || 'memory',
        serialization: config.state?.serialization || 'json',
        compression: config.state?.compression || 'none',
        cleanup: {
          enabled: config.state?.cleanup?.enabled !== false,
          retention: config.state?.cleanup?.retention || 10,
          compression: config.state?.cleanup?.compression !== false,
          archive: config.state?.cleanup?.archive !== false,
          conditions: config.state?.cleanup?.conditions || []
        },
        maxSize: config.state?.maxSize || 100 * 1024 * 1024,
        versioning: config.state?.versioning !== false,
        checkpointing: {
          enabled: true,
          frequency: 'node',
          interval: 60000,
          storage: 'memory',
          compression: 'none',
          retention: 10
        }
      },
      performance: {
        nodePoolSize: config.performance?.nodePoolSize || 4,
        memory: {
          limit: config.performance?.memory?.limit || 1000000000,
          gc: config.performance?.memory?.gc !== false,
          monitoring: config.performance?.memory?.monitoring !== false,
          alertThreshold: config.performance?.memory?.alertThreshold || 0.8
        },
        optimization: {
          enabled: config.performance?.optimization?.enabled !== false,
          parallelism: config.performance?.optimization?.parallelism !== false,
          nodeCoalescing: config.performance?.optimization?.nodeCoalescing !== false,
          lazyEvaluation: config.performance?.optimization?.lazyEvaluation !== false,
          memoization: config.performance?.optimization?.memoization !== false
        },
        monitoring: {
          enabled: config.performance?.monitoring?.enabled !== false,
          metrics: config.performance?.monitoring?.metrics || ['duration', 'memory', 'cpu'],
          sampling: config.performance?.monitoring?.sampling || 1.0,
          alerting: config.performance?.monitoring?.alerting !== false,
          storage: config.performance?.monitoring?.storage || 'memory'
        },
        limits: {
          maxMemory: config.performance?.limits?.maxMemory || 1000000000,
          maxCpu: config.performance?.limits?.maxCpu || 100,
          maxDisk: config.performance?.limits?.maxDisk || 10000000000,
          maxNetwork: config.performance?.limits?.maxNetwork || 1000000000,
          maxDuration: config.performance?.limits?.maxDuration || 300000,
          maxNodes: config.performance?.limits?.maxNodes || 1000
        }
      },
      errorHandling: {
        strategy: config.errorHandling?.strategy || 'fail_fast',
        propagation: {
          strategy: config.errorHandling?.propagation?.strategy || 'immediate',
          timeout: config.errorHandling?.propagation?.timeout || 5000,
          retryLimit: config.errorHandling?.propagation?.retryLimit || 3
        },
        recovery: {
          enabled: config.errorHandling?.recovery?.enabled !== false,
          strategies: config.errorHandling?.recovery?.strategies || ['retry', 'skip'],
          checkpoints: config.errorHandling?.recovery?.checkpoints !== false,
          compensation: config.errorHandling?.recovery?.compensation !== false
        },
        reporting: {
          enabled: config.errorHandling?.reporting?.enabled !== false,
          destinations: config.errorHandling?.reporting?.destinations || ['console'],
          format: config.errorHandling?.reporting?.format || 'json',
          includeStackTrace: config.errorHandling?.reporting?.includeStackTrace !== false
        },
        circuitBreaker: {
          enabled: config.errorHandling?.circuitBreaker?.enabled !== false,
          threshold: config.errorHandling?.circuitBreaker?.threshold || 5,
          timeout: config.errorHandling?.circuitBreaker?.timeout || 60000,
          recovery: config.errorHandling?.circuitBreaker?.recovery || 30000
        }
      },
      monitoring: {
        metrics: {
          enabled: config.monitoring?.metrics?.enabled !== false,
          collectors: config.monitoring?.metrics?.collectors || ['default'],
          exporters: config.monitoring?.metrics?.exporters || ['console'],
          sampling: config.monitoring?.metrics?.sampling || 1.0,
          retention: config.monitoring?.metrics?.retention || 86400
        },
        tracing: {
          enabled: config.monitoring?.tracing?.enabled !== false,
          sampler: config.monitoring?.tracing?.sampler || 'always',
          probability: config.monitoring?.tracing?.probability || 1.0,
          exporters: config.monitoring?.tracing?.exporters || ['console']
        },
        logging: {
          level: config.monitoring?.logging?.level || 'info',
          format: config.monitoring?.logging?.format || 'json',
          destinations: config.monitoring?.logging?.destinations || ['console'],
          includeStack: config.monitoring?.logging?.includeStack !== false
        },
        alerting: {
          enabled: config.monitoring?.alerting?.enabled !== false,
          rules: config.monitoring?.alerting?.rules || [],
          destinations: config.monitoring?.alerting?.destinations || ['console'],
          throttling: config.monitoring?.alerting?.throttling || 60000
        },
        healthCheck: {
          enabled: config.monitoring?.healthCheck?.enabled !== false,
          interval: config.monitoring?.healthCheck?.interval || 30000,
          timeout: config.monitoring?.healthCheck?.timeout || 5000,
          checks: config.monitoring?.healthCheck?.checks || ['basic']
        }
      }
    };
  }
  
  /**
   * Validates agent configuration.
   * 
   * @throws {GraphAgentError} If configuration is invalid
   * @private
   */
  private validateGraphConfiguration(): void {
    if (!this.config.name) {
      throw new GraphAgentError(
        'INVALID_CONFIGURATION',
        'Agent name is required'
      );
    }
    
    if (this.config.execution.maxConcurrency <= 0) {
      throw new GraphAgentError(
        'INVALID_CONFIGURATION',
        'Max concurrency must be positive',
        undefined,
        'error',
        false
      );
    }
    
    if (this.config.execution.timeout <= 0) {
      throw new GraphAgentError(
        'INVALID_CONFIGURATION',
        'Execution timeout must be positive',
        undefined,
        'error',
        false
      );
    }
  }
  
  /**
   * Validates required module dependencies.
   * 
   * @throws {GraphInitializationError} If required modules are missing
   * @private
   */
  private async validateModuleDependencies(): Promise<void> {
    // Check for required modules based on configuration
    const requiredModules: string[] = [];
    
    if (this.config.state.persistence !== 'memory') {
      requiredModules.push('storage');
    }
    
    if (this.config.monitoring.tracing.enabled) {
      requiredModules.push('tracing');
    }
    
    if (this.config.monitoring.metrics.enabled) {
      requiredModules.push('metrics');
    }
    
    const missingModules = requiredModules.filter(module => !this.modules[module]);
    
    if (missingModules.length > 0) {
      throw new GraphInitializationError(
        `Missing required modules: ${missingModules.join(', ')}`,
        'dependency_resolution',
        createGraphErrorContext(undefined, this.id),
        undefined,
        missingModules
      );
    }
  }
  
  /**
   * Validates input for graph execution.
   * 
   * @param input - Input to validate
   * @throws {GraphAgentError} If input is invalid
   * @private
   */
  private validateInput(input: GraphAgentInput): void {
    if (!input.sessionId) {
      throw new GraphAgentError(
        'INVALID_INPUT',
        'Session ID is required',
        undefined,
        'error',
        false
      );
    }
    
    if (!input.data && !input.nodeInputs) {
      throw new GraphAgentError(
        'INVALID_INPUT',
        'Either data or nodeInputs must be provided',
        undefined,
        'error',
        false
      );
    }
  }
  
  /**
   * Builds an executable graph from definition.
   * 
   * @param graph - Graph definition
   * @param input - Input data for context
   * @returns Executable graph
   * @private
   */
  private async buildExecutableGraph(
    graph: GraphDefinition,
    input: GraphAgentInput
  ): Promise<ExecutableGraph> {
    try {
      const builder = new GraphBuilder()
        .fromJSON(JSON.stringify(graph));
        
      // Validate the graph
      const validationResult = builder.validate();
      if (!validationResult.valid) {
        throw new GraphAgentError(
          'GRAPH_VALIDATION_FAILED',
          'Graph validation failed',
          createGraphErrorContext(undefined, graph.id)
        );
      }
      
      // Optimize the graph
      builder.optimize();
      
      return builder.buildExecutable({
        executionTimeout: this.config.execution.timeout,
        nodePoolSize: this.config.execution.maxConcurrency,
        memoryLimit: this.config.performance.limits.maxMemory,
        cpuLimit: this.config.performance.limits.maxCpu,
        diskLimit: this.config.performance.limits.maxDisk,
        networkLimit: this.config.performance.limits.maxNetwork
      });
      
    } catch (error) {
      throw new GraphAgentError(
        'GRAPH_BUILD_FAILED',
        `Failed to build executable graph: ${error instanceof Error ? error.message : String(error)}`,
        createGraphErrorContext(undefined, graph.id),
        'error',
        false,
        error instanceof Error ? error : undefined
      );
    }
  }
  
  /**
   * Creates execution context for graph execution.
   * 
   * @param executionId - Execution identifier
   * @param input - Agent input
   * @param executableGraph - Executable graph
   * @returns Execution context
   * @private
   */
  private createExecutionContext(
    executionId: string,
    input: GraphAgentInput,
    executableGraph: ExecutableGraph
  ): GraphExecutionContext {
    return {
      executionId,
      sessionId: input.sessionId,
      userId: input.userId,
      environment: {
        agentHub: this.modules,
        modules: this.modules,
        services: {},
        config: this.config
      },
      agents: {
        get: (agentId: string) => undefined, // Would be implemented to get agents from registry
        list: () => [],
        register: () => {}
      },
      tools: {
        get: (toolName: string) => undefined, // Would be implemented to get tools from registry
        list: () => [],
        execute: async (toolName: string, parameters: any) => ({ success: false })
      },
      stateManager: {
        getState: () => ({}),
        setState: () => {},
        checkpoint: () => ({ id: '', timestamp: new Date(), executionState: {}, dataSnapshot: {}, metadata: {} }),
        restore: () => {}
      },
      eventEmitter: {
        emit: () => {},
        on: () => {},
        off: () => {}
      },
      logger: {
        debug: (message: string, data?: any) => console.debug(message, data),
        info: (message: string, data?: any) => console.info(message, data),
        warn: (message: string, data?: any) => console.warn(message, data),
        error: (message: string, data?: any) => console.error(message, data)
      },
      metrics: {
        recordNodeExecution: () => {},
        recordResourceUsage: () => {},
        getMetrics: () => this.getDefaultPerformanceMetrics(),
        reset: () => {}
      }
    };
  }
  
  /**
   * Records execution history.
   * 
   * @param executionId - Execution identifier
   * @param result - Execution result
   * @param startTime - Execution start time
   * @private
   */
  private async recordExecutionHistory(
    executionId: string,
    result: GraphAgentOutput,
    startTime: number
  ): Promise<void> {
    const history: GraphExecutionHistory = {
      executionId,
      graphId: result.execution.executionId,
      startTime: new Date(startTime),
      endTime: new Date(),
      duration: Date.now() - startTime,
      status: result.success ? 'completed' : 'failed',
      nodeCount: result.execution.nodeCount,
      performance: result.performance,
      metadata: {
        strategy: result.execution.strategy,
        checkpoints: result.checkpoints.length,
        warnings: result.warnings.length
      }
    };
    
    this.executionHistory.set(executionId, history);
    
    // Cleanup old history if needed (keep last 100 executions)
    if (this.executionHistory.size > 100) {
      const oldestKey = this.executionHistory.keys().next().value;
      this.executionHistory.delete(oldestKey);
    }
  }
  
  /**
   * Builds final output from execution result.
   * 
   * @param result - Executor result
   * @param context - Execution context
   * @param startTime - Start time
   * @returns Final graph agent output
   * @private
   */
  private async buildFinalOutput(
    result: GraphAgentOutput,
    context: GraphExecutionContext,
    startTime: number
  ): Promise<GraphAgentOutput> {
    return {
      ...result,
      execution: {
        ...result.execution,
        duration: Date.now() - startTime
      },
      warnings: result.warnings || []
    };
  }
  
  /**
   * Gets default performance metrics.
   * 
   * @returns Default performance metrics
   * @private
   */
  private getDefaultPerformanceMetrics(): GraphPerformanceMetrics {
    return {
      executionDuration: 0,
      nodeExecutionTimes: {},
      parallelEfficiency: 0,
      resourceUtilization: {
        cpu: 0,
        memory: 0,
        disk: 0,
        network: 0,
        concurrentNodes: 0
      },
      throughput: 0,
      errorRate: 0,
      retryRate: 0
    };
  }
  
  /**
   * Generates unique execution identifier.
   * 
   * @returns Unique execution ID
   * @private
   */
  private generateExecutionId(): string {
    return `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}