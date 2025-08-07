/**
 * @fileoverview Base Agent implementation providing common functionality
 * @module agents/base/base-agent
 * @requires ./types
 * @requires ./errors
 * @requires ../../modules/registry
 * @requires ../../shared/utils
 * 
 * This file implements the BaseAgent class which serves as the foundation
 * for all agent implementations in AgentHub. It provides common functionality
 * like lifecycle management, health monitoring, error handling, and integration
 * with the module registry system.
 * 
 * Key concepts:
 * - Abstract base class implementing IAgent interface
 * - Lifecycle management (initialize, execute, shutdown)
 * - Health monitoring and status reporting
 * - Configuration validation and management
 * - Error handling and context preservation
 * - Integration with session state and tools
 * 
 * @example
 * ```typescript
 * import { BaseAgent } from './base-agent';
 * 
 * class MyAgent extends BaseAgent {
 *   protected async executeTask(context: ExecutionContext): Promise<AgentResult> {
 *     // Custom implementation
 *     return {
 *       success: true,
 *       output: 'Task completed',
 *       metadata: { duration: Date.now() - this.executionStartTime }
 *     };
 *   }
 * }
 * ```
 * 
 * @see types.ts for interface definitions
 * @see errors.ts for error classes
 * @since 1.0.0
 */

import {
  IAgent,
  AgentConfig,
  ExecutionContext,
  AgentResult,
  AgentTask,
  AgentHealth,
  AgentEvent,
  LogLevel
} from './types';

import {
  AgentError,
  AgentInitializationError,
  AgentExecutionError,
  AgentConfigurationError,
  AgentValidationError,
  AgentTimeoutError,
  AgentStateError,
  createErrorContext
} from './errors';

import { getGlobalRegistry } from '../../modules/registry';
import { generateId, withTimeout, isProduction } from '../../shared/utils';

/**
 * Abstract base class for all AgentHub agents.
 * 
 * Provides a robust foundation for agent implementations with:
 * - Standardized lifecycle management
 * - Configuration validation and storage
 * - Health monitoring and metrics collection
 * - Error handling with proper context
 * - Integration with the module registry system
 * - Logging and debugging utilities
 * - State management and validation
 * 
 * Subclasses must implement the `executeTask` method to define their
 * specific behavior, while inheriting all the common functionality
 * provided by this base class.
 * 
 * @abstract
 * @implements {IAgent}
 * 
 * @example
 * ```typescript
 * class TextProcessorAgent extends BaseAgent {
 *   readonly name = 'Text Processor';
 *   readonly version = '1.0.0';
 *   readonly capabilities = ['text-analysis', 'nlp'];
 *   
 *   protected async executeTask(context: ExecutionContext): Promise<AgentResult> {
 *     const { input } = context.task;
 *     
 *     // Validate input
 *     this.validateTaskInput(context.task);
 *     
 *     // Process text
 *     const result = await this.processText(input.content);
 *     
 *     // Return standardized result
 *     return this.createSuccessResult(result, {
 *       tokensProcessed: result.length,
 *       processingTime: Date.now() - this.executionStartTime
 *     });
 *   }
 *   
 *   private async processText(text: string): Promise<string> {
 *     // Custom text processing logic
 *     return text.toLowerCase().trim();
 *   }
 * }
 * ```
 * 
 * @public
 */
export abstract class BaseAgent implements IAgent {
  /** Unique identifier for this agent instance */
  public readonly id: string;
  
  /** Agent name - must be overridden by subclasses */
  public abstract readonly name: string;
  
  /** Agent version - must be overridden by subclasses */
  public abstract readonly version: string;
  
  /** Agent capabilities - must be overridden by subclasses */
  public abstract readonly capabilities: string[];
  
  /** Optional agent description */
  public readonly description?: string;
  
  /** Dependencies on other modules */
  public readonly dependencies?: string[];
  
  /** Agent configuration after initialization */
  protected config?: AgentConfig;
  
  /** Current agent state */
  protected state: 'uninitialized' | 'initializing' | 'ready' | 'executing' | 'error' | 'shutting-down' | 'shutdown' = 'uninitialized';
  
  /** Initialization timestamp */
  protected initializationTime?: Date;
  
  /** Current execution start time */
  protected executionStartTime?: number;
  
  /** Health metrics collection */
  protected metrics = {
    executionCount: 0,
    successCount: 0,
    errorCount: 0,
    totalExecutionTime: 0,
    lastExecutionTime: 0,
    lastHealthCheck: undefined as Date | undefined
  };
  
  /** Module registry for accessing other system components */
  protected registry = getGlobalRegistry();
  
  /** Agent-specific logger instance */
  protected logger: AgentLogger;
  
  /**
   * Creates a new BaseAgent instance.
   * 
   * @param id - Optional unique identifier (auto-generated if not provided)
   * 
   * @example
   * ```typescript
   * class MyAgent extends BaseAgent {
   *   constructor() {
   *     super('my-custom-agent-id');
   *     // Additional initialization
   *   }
   * }
   * ```
   */
  constructor(id?: string) {
    this.id = id || generateId('agent');
    this.logger = new AgentLogger(this.id, 'BaseAgent');
  }
  
  /**
   * Initializes the agent with the provided configuration.
   * 
   * This method validates the configuration, sets up internal state,
   * initializes dependencies, and prepares the agent for execution.
   * 
   * @param config - Agent configuration
   * @throws {AgentInitializationError} If initialization fails
   * @throws {AgentConfigurationError} If configuration is invalid
   * 
   * @example
   * ```typescript
   * const config: AgentConfig = {
   *   id: 'my-agent',
   *   config: {
   *     model: 'gpt-4',
   *     temperature: 0.7
   *   },
   *   timeouts: {
   *     execution: 30000
   *   }
   * };
   * 
   * await agent.initialize(config);
   * ```
   * 
   * Implementation details:
   * - Validates configuration schema
   * - Sets up internal state and logging
   * - Initializes dependencies and connections
   * - Calls custom initialization hook
   * - Updates agent state to 'ready'
   */
  async initialize(config: AgentConfig): Promise<void> {
    if (this.state !== 'uninitialized') {
      throw new AgentStateError(
        this.id,
        'Agent already initialized',
        'uninitialized',
        this.state
      );
    }
    
    this.state = 'initializing';
    this.logger.info('Starting agent initialization', { config });
    
    try {
      // Validate configuration
      this.validateConfiguration(config);
      
      // Store configuration
      this.config = config;
      
      // Update logger with configuration
      this.logger.updateConfig(config.logging);
      
      // Perform custom initialization
      await this.performInitialization(config);
      
      // Mark as ready
      this.state = 'ready';
      this.initializationTime = new Date();
      
      this.logger.info('Agent initialization completed successfully', {
        duration: Date.now() - (this.initializationTime?.getTime() || 0)
      });
      
    } catch (error) {
      this.state = 'error';
      
      const initError = new AgentInitializationError(
        this.id,
        error instanceof Error ? error.message : String(error),
        error instanceof Error ? error : undefined,
        {
          config,
          stage: 'initialization',
          agentName: this.name,
          version: this.version
        }
      );
      
      this.logger.error('Agent initialization failed', initError);
      throw initError;
    }
  }
  
  /**
   * Executes a task with the given context.
   * 
   * This is the main entry point for agent execution. It handles validation,
   * timeout management, error handling, and metrics collection.
   * 
   * @param context - Complete execution context
   * @returns Promise resolving to execution result
   * @throws {AgentExecutionError} If execution fails
   * @throws {AgentTimeoutError} If execution times out
   * @throws {AgentValidationError} If input validation fails
   * 
   * @example
   * ```typescript
   * const context: ExecutionContext = {
   *   executionId: 'exec-123',
   *   task: {
   *     id: 'task-456',
   *     type: 'text-processing',
   *     input: { content: 'Hello world' }
   *   },
   *   tools: toolRegistry,
   *   session: sessionContext,
   *   system: systemContext,
   *   metadata: executionMetadata
   * };
   * 
   * const result = await agent.execute(context);
   * ```
   * 
   * Implementation flow:
   * 1. Validate agent state and input
   * 2. Set up execution context and timeout
   * 3. Call custom executeTask implementation
   * 4. Handle success/failure and update metrics
   * 5. Return standardized result
   */
  async execute(context: ExecutionContext): Promise<AgentResult> {
    // Validate agent state
    if (this.state !== 'ready') {
      throw new AgentStateError(
        this.id,
        'Agent not ready for execution',
        'ready',
        this.state,
        { context: createErrorContext(context) }
      );
    }
    
    // Validate execution context
    this.validateExecutionContext(context);
    
    this.state = 'executing';
    this.executionStartTime = Date.now();
    
    this.logger.info('Starting task execution', {
      executionId: context.executionId,
      taskId: context.task.id,
      taskType: context.task.type
    });
    
    try {
      // Determine timeout
      const timeout = context.task.timeout || 
                     this.config?.timeouts?.execution || 
                     30000; // Default 30 seconds
      
      // Execute with timeout
      const result = await withTimeout(
        this.executeTask(context),
        timeout,
        `Agent execution timed out after ${timeout}ms`
      );
      
      // Update metrics
      this.updateMetrics(true, Date.now() - this.executionStartTime);
      
      // Reset state
      this.state = 'ready';
      
      this.logger.info('Task execution completed successfully', {
        executionId: context.executionId,
        duration: Date.now() - this.executionStartTime,
        success: result.success
      });
      
      return result;
      
    } catch (error) {
      // Update metrics
      this.updateMetrics(false, Date.now() - this.executionStartTime);
      
      // Reset state
      this.state = 'ready';
      
      // Handle timeout errors specially
      if (error.name === 'TimeoutError') {
        const timeoutError = new AgentTimeoutError(
          this.id,
          context.task.timeout || this.config?.timeouts?.execution || 30000,
          'task-execution',
          createErrorContext(context)
        );
        
        this.logger.error('Task execution timed out', timeoutError);
        
        return this.createErrorResult(timeoutError, {
          duration: Date.now() - this.executionStartTime,
          timeout: true
        });
      }
      
      // Handle other execution errors
      const executionError = error instanceof AgentError ? error : new AgentExecutionError(
        this.id,
        error instanceof Error ? error.message : String(error),
        error instanceof Error ? error : undefined,
        createErrorContext(context)
      );
      
      this.logger.error('Task execution failed', executionError);
      
      return this.createErrorResult(executionError, {
        duration: Date.now() - this.executionStartTime
      });
    }
  }
  
  /**
   * Abstract method that subclasses must implement for custom execution logic.
   * 
   * This method contains the core business logic for the agent. It receives
   * a validated execution context and must return a standardized result.
   * 
   * @param context - Validated execution context
   * @returns Promise resolving to execution result
   * 
   * @abstract
   * @protected
   * 
   * @example
   * ```typescript
   * protected async executeTask(context: ExecutionContext): Promise<AgentResult> {
   *   const { task, tools, session } = context;
   *   
   *   // Custom processing logic
   *   const output = await this.processInput(task.input);
   *   
   *   // Use tools if needed
   *   if (task.parameters?.useExternalAPI) {
   *     const apiResult = await tools.execute('http-client', {
   *       url: task.parameters.apiUrl,
   *       method: 'GET'
   *     });
   *     // Process API result
   *   }
   *   
   *   // Return result
   *   return this.createSuccessResult(output, {
   *     processingTime: Date.now() - this.executionStartTime,
   *     toolsUsed: ['http-client']
   *   });
   * }
   * ```
   */
  protected abstract executeTask(context: ExecutionContext): Promise<AgentResult>;
  
  /**
   * Validates that the agent can handle the given task.
   * 
   * Default implementation checks task type against agent capabilities.
   * Subclasses can override for more sophisticated validation.
   * 
   * @param task - Task to validate
   * @returns Promise resolving to true if task can be handled
   * 
   * @example
   * ```typescript
   * // Override for custom validation
   * async canHandle(task: AgentTask): Promise<boolean> {
   *   const baseCanHandle = await super.canHandle(task);
   *   if (!baseCanHandle) return false;
   *   
   *   // Custom validation logic
   *   if (task.type === 'complex-analysis' && !task.parameters?.analysisType) {
   *     return false;
   *   }
   *   
   *   return true;
   * }
   * ```
   */
  async canHandle(task: AgentTask): Promise<boolean> {
    try {
      // Check if task type is supported
      if (task.type && !this.capabilities.includes(task.type)) {
        this.logger.debug('Task type not supported', {
          taskType: task.type,
          supportedTypes: this.capabilities
        });
        return false;
      }
      
      // Perform custom validation
      return await this.validateTaskCapability(task);
      
    } catch (error) {
      this.logger.warn('Error during task capability validation', error);
      return false;
    }
  }
  
  /**
   * Provides health status information.
   * 
   * Returns comprehensive health information including status, metrics,
   * and any detected issues. Subclasses can override to add custom
   * health checks.
   * 
   * @returns Promise resolving to current health status
   * 
   * @example
   * ```typescript
   * const health = await agent.health();
   * console.log('Agent status:', health.status);
   * console.log('Success rate:', health.metrics?.successRate);
   * console.log('Average execution time:', health.metrics?.averageExecutionTime);
   * ```
   */
  async health(): Promise<AgentHealth> {
    this.metrics.lastHealthCheck = new Date();
    
    try {
      // Calculate derived metrics
      const successRate = this.metrics.executionCount > 0 
        ? this.metrics.successCount / this.metrics.executionCount 
        : 1;
      
      const averageExecutionTime = this.metrics.executionCount > 0
        ? this.metrics.totalExecutionTime / this.metrics.executionCount
        : 0;
      
      // Determine health status
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      const issues: any[] = [];
      
      // Check error rate
      if (successRate < 0.5) {
        status = 'unhealthy';
        issues.push({
          severity: 'critical' as const,
          message: `High error rate: ${((1 - successRate) * 100).toFixed(1)}%`,
          code: 'HIGH_ERROR_RATE'
        });
      } else if (successRate < 0.8) {
        status = 'degraded';
        issues.push({
          severity: 'medium' as const,
          message: `Elevated error rate: ${((1 - successRate) * 100).toFixed(1)}%`,
          code: 'ELEVATED_ERROR_RATE'
        });
      }
      
      // Check if agent is in error state
      if (this.state === 'error') {
        status = 'unhealthy';
        issues.push({
          severity: 'critical' as const,
          message: 'Agent is in error state',
          code: 'AGENT_ERROR_STATE'
        });
      }
      
      // Perform custom health checks
      const customIssues = await this.performHealthChecks();
      issues.push(...customIssues);
      
      // Update status based on custom issues
      for (const issue of customIssues) {
        if (issue.severity === 'critical' && status !== 'unhealthy') {
          status = 'unhealthy';
        } else if (issue.severity === 'high' && status === 'healthy') {
          status = 'degraded';
        }
      }
      
      return {
        status,
        message: status === 'healthy' ? 'Agent is operating normally' : 
                status === 'degraded' ? 'Agent has minor issues' : 
                'Agent has serious issues requiring attention',
        lastCheck: this.metrics.lastHealthCheck,
        metrics: {
          uptime: this.initializationTime ? (Date.now() - this.initializationTime.getTime()) : 0,
          executionCount: this.metrics.executionCount,
          successRate,
          averageExecutionTime,
          errorRate: 1 - successRate
        },
        issues
      };
      
    } catch (error) {
      this.logger.error('Health check failed', error);
      
      return {
        status: 'unhealthy',
        message: 'Health check failed',
        lastCheck: new Date(),
        issues: [{
          severity: 'critical' as const,
          message: 'Unable to perform health check',
          code: 'HEALTH_CHECK_FAILED',
          details: { error: error instanceof Error ? error.message : String(error) }
        }]
      };
    }
  }
  
  /**
   * Gracefully shuts down the agent.
   * 
   * Performs cleanup operations, closes connections, and releases resources.
   * Subclasses should override `performShutdown` for custom cleanup logic.
   * 
   * @returns Promise that resolves when shutdown is complete
   * 
   * @example
   * ```typescript
   * process.on('SIGTERM', async () => {
   *   await agent.shutdown();
   *   process.exit(0);
   * });
   * ```
   */
  async shutdown(): Promise<void> {
    if (this.state === 'shutdown' || this.state === 'shutting-down') {
      this.logger.warn('Agent already shutting down or shut down');
      return;
    }
    
    this.state = 'shutting-down';
    this.logger.info('Starting agent shutdown');
    
    try {
      // Perform custom shutdown logic
      await this.performShutdown();
      
      // Final cleanup
      this.state = 'shutdown';
      
      this.logger.info('Agent shutdown completed successfully');
      
    } catch (error) {
      this.logger.error('Error during agent shutdown', error);
      this.state = 'error';
      throw error;
    }
  }
  
  /**
   * Handles system events.
   * 
   * Default implementation logs events. Subclasses can override to
   * respond to specific events like configuration changes or system alerts.
   * 
   * @param event - System event to handle
   * 
   * @example
   * ```typescript
   * async onEvent(event: AgentEvent): Promise<void> {
   *   await super.onEvent(event); // Call base implementation
   *   
   *   if (event.type === 'configuration-updated') {
   *     await this.reloadConfiguration(event.data.config);
   *   }
   * }
   * ```
   */
  async onEvent(event: AgentEvent): Promise<void> {
    this.logger.debug('Received event', {
      type: event.type,
      source: event.source,
      timestamp: event.timestamp
    });
  }
  
  /**
   * Gets the basic agent capabilities.
   * 
   * Returns the capabilities as defined by the agent implementation.
   * Subclasses can override to return more specific capability objects.
   * 
   * @returns Agent capabilities
   */
  getCapabilities(): string[] | any {
    return [...this.capabilities];
  }
  
  // Protected helper methods for subclasses
  
  /**
   * Creates a successful execution result.
   * 
   * Helper method for subclasses to create standardized success results.
   * 
   * @param output - The successful output
   * @param additionalMetadata - Additional metadata to include
   * @returns Standardized success result
   * 
   * @protected
   */
  protected createSuccessResult(
    output: string | Record<string, any>,
    additionalMetadata: Record<string, any> = {}
  ): AgentResult {
    return {
      success: true,
      output,
      metadata: {
        duration: Date.now() - (this.executionStartTime || Date.now()),
        endTime: new Date(),
        ...additionalMetadata
      }
    };
  }
  
  /**
   * Creates an error execution result.
   * 
   * Helper method for subclasses to create standardized error results.
   * 
   * @param error - The error that occurred
   * @param additionalMetadata - Additional metadata to include
   * @returns Standardized error result
   * 
   * @protected
   */
  protected createErrorResult(
    error: AgentError,
    additionalMetadata: Record<string, any> = {}
  ): AgentResult {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.context
      },
      metadata: {
        duration: Date.now() - (this.executionStartTime || Date.now()),
        endTime: new Date(),
        ...additionalMetadata
      }
    };
  }
  
  /**
   * Validates task input according to agent requirements.
   * 
   * Override this method to implement custom input validation.
   * 
   * @param task - Task to validate
   * @throws {AgentValidationError} If validation fails
   * 
   * @protected
   */
  protected validateTaskInput(task: AgentTask): void {
    if (!task.input?.content && !task.input?.data) {
      throw new AgentValidationError(
        this.id,
        'Task input must contain either content or data',
        'input',
        task.input
      );
    }
  }
  
  // Private implementation methods
  
  /**
   * Validates agent configuration.
   * 
   * @param config - Configuration to validate
   * @throws {AgentConfigurationError} If configuration is invalid
   * 
   * @private
   */
  private validateConfiguration(config: AgentConfig): void {
    if (!config.id) {
      throw new AgentConfigurationError(
        this.id,
        'Configuration must include agent ID',
        { config }
      );
    }
    
    // Validate timeouts
    if (config.timeouts?.execution && config.timeouts.execution < 1000) {
      throw new AgentConfigurationError(
        this.id,
        'Execution timeout must be at least 1000ms',
        { timeout: config.timeouts.execution }
      );
    }
    
    // Validate limits
    if (config.limits?.maxExecutionTime && config.limits.maxExecutionTime < 1000) {
      throw new AgentConfigurationError(
        this.id,
        'Maximum execution time must be at least 1000ms',
        { maxExecutionTime: config.limits.maxExecutionTime }
      );
    }
  }
  
  /**
   * Validates execution context.
   * 
   * @param context - Context to validate
   * @throws {AgentValidationError} If context is invalid
   * 
   * @private
   */
  private validateExecutionContext(context: ExecutionContext): void {
    if (!context.executionId) {
      throw new AgentValidationError(
        this.id,
        'Execution context must include execution ID',
        'executionId',
        context.executionId
      );
    }
    
    if (!context.task) {
      throw new AgentValidationError(
        this.id,
        'Execution context must include task',
        'task',
        context.task
      );
    }
    
    if (!context.task.id) {
      throw new AgentValidationError(
        this.id,
        'Task must include ID',
        'task.id',
        context.task.id
      );
    }
  }
  
  /**
   * Updates execution metrics.
   * 
   * @param success - Whether execution was successful
   * @param duration - Execution duration in milliseconds
   * 
   * @private
   */
  private updateMetrics(success: boolean, duration: number): void {
    this.metrics.executionCount++;
    this.metrics.totalExecutionTime += duration;
    this.metrics.lastExecutionTime = duration;
    
    if (success) {
      this.metrics.successCount++;
    } else {
      this.metrics.errorCount++;
    }
  }
  
  // Protected hooks for subclasses to override
  
  /**
   * Hook for custom initialization logic.
   * 
   * Override this method to perform agent-specific initialization.
   * 
   * @param config - Agent configuration
   * 
   * @protected
   */
  protected async performInitialization(config: AgentConfig): Promise<void> {
    // Default implementation does nothing
    // Subclasses can override for custom initialization
  }
  
  /**
   * Hook for custom task capability validation.
   * 
   * Override this method to implement custom task validation logic.
   * 
   * @param task - Task to validate
   * @returns Promise resolving to true if task can be handled
   * 
   * @protected
   */
  protected async validateTaskCapability(task: AgentTask): Promise<boolean> {
    // Default implementation accepts all tasks
    return true;
  }
  
  /**
   * Hook for custom health checks.
   * 
   * Override this method to implement agent-specific health checks.
   * 
   * @returns Promise resolving to array of health issues
   * 
   * @protected
   */
  protected async performHealthChecks(): Promise<any[]> {
    // Default implementation returns no issues
    return [];
  }
  
  /**
   * Hook for custom shutdown logic.
   * 
   * Override this method to perform agent-specific cleanup.
   * 
   * @protected
   */
  protected async performShutdown(): Promise<void> {
    // Default implementation does nothing
    // Subclasses can override for custom shutdown logic
  }
}

/**
 * Logger wrapper for agent-specific logging.
 * 
 * Provides structured logging with agent context automatically included.
 * 
 * @internal
 */
class AgentLogger {
  constructor(
    private readonly agentId: string,
    private readonly agentName: string,
    private logLevel: LogLevel = 'info'
  ) {}
  
  updateConfig(config?: { level: LogLevel; enabled: boolean }): void {
    if (config?.level) {
      this.logLevel = config.level;
    }
  }
  
  debug(message: string, data?: any): void {
    this.log('debug', message, data);
  }
  
  info(message: string, data?: any): void {
    this.log('info', message, data);
  }
  
  warn(message: string, data?: any): void {
    this.log('warn', message, data);
  }
  
  error(message: string, error?: any): void {
    this.log('error', message, error);
  }
  
  private log(level: LogLevel, message: string, data?: any): void {
    if (!this.shouldLog(level)) return;
    
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      agent: {
        id: this.agentId,
        name: this.agentName
      },
      message,
      ...(data && { data })
    };
    
    // In production, this would integrate with the actual logging system
    if (isProduction()) {
      // Send to structured logging service
      console.log(JSON.stringify(logEntry));
    } else {
      // Pretty print for development
      console.log(`[${level.toUpperCase()}] ${this.agentName}(${this.agentId}): ${message}`, data || '');
    }
  }
  
  private shouldLog(level: LogLevel): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    
    return messageLevelIndex >= currentLevelIndex;
  }
}