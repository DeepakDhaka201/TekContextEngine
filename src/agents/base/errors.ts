/**
 * @fileoverview Error classes for the Base Agent system
 * @module agents/base/errors
 * @requires None - Pure error definitions
 * 
 * This file defines all custom error classes used throughout the Base Agent
 * system. These errors provide specific context and actionable solutions
 * for different failure scenarios.
 * 
 * Key concepts:
 * - Hierarchical error structure with base AgentError
 * - Specific error types for different failure modes
 * - Actionable error messages with suggested solutions
 * - Context preservation for debugging
 * - Error codes for programmatic handling
 * 
 * @example
 * ```typescript
 * import { AgentExecutionError } from './errors';
 * 
 * throw new AgentExecutionError(
 *   'agent-123',
 *   'Failed to process user input',
 *   new Error('Network timeout'),
 *   { input: 'user message', timeout: 30000 }
 * );
 * ```
 * 
 * @since 1.0.0
 */

/**
 * Base error class for all agent-related errors.
 * 
 * Provides a consistent foundation for all agent errors with context
 * preservation, error codes, and suggested solutions for recovery.
 * 
 * Features:
 * - Error code for programmatic identification
 * - Context object for debugging information
 * - Optional solution suggestions for recovery
 * - Proper error chaining with cause preservation
 * - Structured metadata for error reporting
 * 
 * @example
 * ```typescript
 * const error = new AgentError(
 *   'AGENT_001',
 *   'Something went wrong',
 *   { agentId: 'test-agent', operation: 'execute' },
 *   'Try restarting the agent'
 * );
 * 
 * console.log(error.code);     // 'AGENT_001'
 * console.log(error.context);  // { agentId: 'test-agent', operation: 'execute' }
 * console.log(error.solution); // 'Try restarting the agent'
 * ```
 * 
 * @public
 */
export class AgentError extends Error {
  /** Error code for programmatic identification */
  public readonly code: string;
  
  /** Context information for debugging */
  public readonly context: Record<string, any>;
  
  /** Optional solution suggestion */
  public readonly solution?: string;
  
  /** Timestamp when error occurred */
  public readonly timestamp: Date;
  
  /** Original error that caused this error (if any) */
  public readonly cause?: Error;
  
  /**
   * Creates a new AgentError instance.
   * 
   * @param code - Unique error code for identification
   * @param message - Human-readable error message
   * @param context - Context information for debugging (default: {})
   * @param solution - Optional solution suggestion
   * @param cause - Original error that caused this error
   * 
   * @example
   * ```typescript
   * throw new AgentError(
   *   'AGENT_NETWORK_ERROR',
   *   'Failed to connect to external service',
   *   { service: 'langfuse', url: 'https://api.langfuse.com' },
   *   'Check network connectivity and service status',
   *   originalNetworkError
   * );
   * ```
   */
  constructor(
    code: string,
    message: string,
    context: Record<string, any> = {},
    solution?: string,
    cause?: Error
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.context = context;
    this.solution = solution;
    this.timestamp = new Date();
    this.cause = cause;
    
    // Maintain proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);
    
    // Capture stack trace if available
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
  
  /**
   * Creates a JSON representation of the error.
   * 
   * Useful for logging, error reporting, and API responses.
   * 
   * @returns JSON-serializable error object
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      context: this.context,
      solution: this.solution,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
      cause: this.cause ? {
        name: this.cause.name,
        message: this.cause.message,
        stack: this.cause.stack
      } : undefined
    };
  }
  
  /**
   * Creates a detailed error description for logging.
   * 
   * @returns Formatted error description with context
   */
  toString(): string {
    let result = `${this.name} [${this.code}]: ${this.message}`;
    
    if (Object.keys(this.context).length > 0) {
      result += `\nContext: ${JSON.stringify(this.context, null, 2)}`;
    }
    
    if (this.solution) {
      result += `\nSolution: ${this.solution}`;
    }
    
    if (this.cause) {
      result += `\nCause: ${this.cause.message}`;
    }
    
    return result;
  }
}

/**
 * Error thrown when agent initialization fails.
 * 
 * This error occurs during the agent setup phase when configuration
 * validation, resource allocation, or dependency resolution fails.
 * 
 * @example
 * ```typescript
 * throw new AgentInitializationError(
 *   'chat-agent',
 *   'Failed to initialize language model',
 *   configValidationError,
 *   { 
 *     config: agentConfig,
 *     dependencies: ['langfuse', 'memory'],
 *     stage: 'model-setup'
 *   }
 * );
 * ```
 */
export class AgentInitializationError extends AgentError {
  constructor(
    agentId: string,
    message: string,
    cause?: Error,
    context: Record<string, any> = {}
  ) {
    super(
      'AGENT_INITIALIZATION_FAILED',
      `Agent '${agentId}' initialization failed: ${message}`,
      {
        agentId,
        stage: 'initialization',
        ...context
      },
      'Check agent configuration and ensure all dependencies are available. ' +
      'Verify that required services are running and accessible.',
      cause
    );
  }
}

/**
 * Error thrown when agent execution fails.
 * 
 * This is the most common error type, occurring when an agent fails
 * to complete a task execution due to various reasons such as invalid
 * input, tool failures, or processing errors.
 * 
 * @example
 * ```typescript
 * throw new AgentExecutionError(
 *   'code-analyzer',
 *   'Failed to parse source code',
 *   parseError,
 *   { 
 *     taskId: 'task-123',
 *     input: sourceCode,
 *     language: 'typescript',
 *     stage: 'parsing'
 *   }
 * );
 * ```
 */
export class AgentExecutionError extends AgentError {
  constructor(
    agentId: string,
    message: string,
    cause?: Error,
    context: Record<string, any> = {}
  ) {
    super(
      'AGENT_EXECUTION_FAILED',
      `Agent '${agentId}' execution failed: ${message}`,
      {
        agentId,
        stage: 'execution',
        ...context
      },
      'Review task input and parameters. Check agent logs for detailed error information. ' +
      'Ensure all required tools and services are available.',
      cause
    );
  }
}

/**
 * Error thrown when agent configuration is invalid.
 * 
 * Occurs when the provided agent configuration doesn't meet the
 * required schema or contains invalid values.
 * 
 * @example
 * ```typescript
 * throw new AgentConfigurationError(
 *   'llm-agent',
 *   'Invalid model configuration',
 *   {
 *     config: invalidConfig,
 *     field: 'model.temperature',
 *     expected: 'number between 0 and 2',
 *     actual: 'string "high"'
 *   }
 * );
 * ```
 */
export class AgentConfigurationError extends AgentError {
  constructor(
    agentId: string,
    message: string,
    context: Record<string, any> = {}
  ) {
    super(
      'AGENT_CONFIGURATION_INVALID',
      `Invalid configuration for agent '${agentId}': ${message}`,
      {
        agentId,
        stage: 'configuration',
        ...context
      },
      'Verify agent configuration against the expected schema. ' +
      'Check documentation for required and optional parameters.'
    );
  }
}

/**
 * Error thrown when a required dependency is missing or unavailable.
 * 
 * Occurs when an agent tries to access a module, service, or tool
 * that hasn't been registered or is currently unavailable.
 * 
 * @example
 * ```typescript
 * throw new AgentDependencyError(
 *   'memory-agent',
 *   'vector-store',
 *   ['pinecone', 'weaviate', 'chromadb'],
 *   {
 *     operation: 'store-embedding',
 *     requiredCapabilities: ['vector-search', 'persistence']
 *   }
 * );
 * ```
 */
export class AgentDependencyError extends AgentError {
  constructor(
    agentId: string,
    dependencyName: string,
    availableDependencies: string[] = [],
    context: Record<string, any> = {}
  ) {
    const available = availableDependencies.length > 0 
      ? ` Available dependencies: ${availableDependencies.join(', ')}` 
      : '';
    
    super(
      'AGENT_DEPENDENCY_MISSING',
      `Agent '${agentId}' requires dependency '${dependencyName}' which is not available.${available}`,
      {
        agentId,
        dependencyName,
        availableDependencies,
        ...context
      },
      `Register the '${dependencyName}' dependency or check if it's properly initialized. ` +
      'Ensure all required services are running and accessible.'
    );
  }
}

/**
 * Error thrown when agent execution times out.
 * 
 * Occurs when an agent takes longer than the configured timeout
 * to complete execution, indicating potential infinite loops,
 * slow external services, or resource constraints.
 * 
 * @example
 * ```typescript
 * throw new AgentTimeoutError(
 *   'api-agent',
 *   30000,
 *   'fetch-user-data',
 *   {
 *     taskId: 'task-456',
 *     endpoint: 'https://api.example.com/users',
 *     startTime: startTimestamp
 *   }
 * );
 * ```
 */
export class AgentTimeoutError extends AgentError {
  constructor(
    agentId: string,
    timeoutMs: number,
    operation: string,
    context: Record<string, any> = {}
  ) {
    super(
      'AGENT_EXECUTION_TIMEOUT',
      `Agent '${agentId}' timed out after ${timeoutMs}ms during '${operation}'`,
      {
        agentId,
        operation,
        timeoutMs,
        ...context
      },
      'Increase the timeout value if the operation legitimately requires more time. ' +
      'Check for infinite loops or blocking operations. Consider optimizing the agent logic.'
    );
  }
}

/**
 * Error thrown when agent state becomes invalid or corrupted.
 * 
 * Occurs when the agent's internal state is inconsistent, corrupted,
 * or doesn't match expected invariants, making continued operation unsafe.
 * 
 * @example
 * ```typescript
 * throw new AgentStateError(
 *   'session-agent',
 *   'Session state corrupted',
 *   'active',
 *   'terminated',
 *   {
 *     sessionId: 'sess-789',
 *     lastValidState: previousState,
 *     corruptionSource: 'memory-cleanup'
 *   }
 * );
 * ```
 */
export class AgentStateError extends AgentError {
  constructor(
    agentId: string,
    message: string,
    expectedState: string,
    actualState: string,
    context: Record<string, any> = {}
  ) {
    super(
      'AGENT_INVALID_STATE',
      `Agent '${agentId}' state error: ${message}. Expected: ${expectedState}, Actual: ${actualState}`,
      {
        agentId,
        expectedState,
        actualState,
        ...context
      },
      'Reset the agent to a known good state or reinitialize if necessary. ' +
      'Check for race conditions or improper state transitions.'
    );
  }
}

/**
 * Error thrown when tool execution fails within an agent.
 * 
 * This error wraps tool-specific failures and provides agent context
 * for better error reporting and debugging.
 * 
 * @example
 * ```typescript
 * throw new AgentToolError(
 *   'code-agent',
 *   'typescript-compiler',
 *   'Compilation failed',
 *   compilationError,
 *   {
 *     taskId: 'task-101',
 *     toolParameters: { strict: true, target: 'ES2020' },
 *     sourceFile: 'main.ts'
 *   }
 * );
 * ```
 */
export class AgentToolError extends AgentError {
  constructor(
    agentId: string,
    toolName: string,
    message: string,
    cause?: Error,
    context: Record<string, any> = {}
  ) {
    super(
      'AGENT_TOOL_EXECUTION_FAILED',
      `Tool '${toolName}' failed in agent '${agentId}': ${message}`,
      {
        agentId,
        toolName,
        ...context
      },
      'Check tool parameters and ensure the tool is properly configured. ' +
      'Verify that any external services the tool depends on are available.',
      cause
    );
  }
}

/**
 * Error thrown when input validation fails.
 * 
 * Occurs when the provided input doesn't meet the agent's requirements
 * or schema validation fails.
 * 
 * @example
 * ```typescript
 * throw new AgentValidationError(
 *   'json-processor',
 *   'Input must be valid JSON',
 *   'content',
 *   invalidJsonString,
 *   {
 *     expectedSchema: jsonSchema,
 *     validationErrors: schemaErrors
 *   }
 * );
 * ```
 */
export class AgentValidationError extends AgentError {
  constructor(
    agentId: string,
    message: string,
    field: string,
    value: any,
    context: Record<string, any> = {}
  ) {
    super(
      'AGENT_INPUT_VALIDATION_FAILED',
      `Input validation failed for agent '${agentId}': ${message}`,
      {
        agentId,
        field,
        value,
        ...context
      },
      'Review the input data and ensure it matches the expected format and constraints. ' +
      'Check the agent documentation for input requirements.'
    );
  }
}

/**
 * Error thrown when agent capacity limits are exceeded.
 * 
 * Occurs when the agent cannot handle additional work due to resource
 * constraints, concurrency limits, or memory limitations.
 * 
 * @example
 * ```typescript
 * throw new AgentCapacityError(
 *   'batch-processor',
 *   'concurrent-tasks',
 *   10,
 *   15,
 *   {
 *     currentTasks: activeTasks,
 *     queueSize: pendingTasks.length,
 *     memoryUsage: process.memoryUsage()
 *   }
 * );
 * ```
 */
export class AgentCapacityError extends AgentError {
  constructor(
    agentId: string,
    resource: string,
    limit: number,
    attempted: number,
    context: Record<string, any> = {}
  ) {
    super(
      'AGENT_CAPACITY_EXCEEDED',
      `Agent '${agentId}' capacity exceeded for '${resource}': limit ${limit}, attempted ${attempted}`,
      {
        agentId,
        resource,
        limit,
        attempted,
        ...context
      },
      'Reduce concurrent load or increase agent capacity limits. ' +
      'Consider implementing backpressure or queuing mechanisms.'
    );
  }
}

/**
 * Error thrown when agent health check fails.
 * 
 * Indicates that the agent is not functioning properly and may need
 * intervention or restart to restore normal operation.
 * 
 * @example
 * ```typescript
 * throw new AgentHealthError(
 *   'monitoring-agent',
 *   'High error rate detected',
 *   'degraded',
 *   {
 *     errorRate: 0.45,
 *     threshold: 0.1,
 *     recentErrors: errorSummary,
 *     uptime: uptimeMs
 *   }
 * );
 * ```
 */
export class AgentHealthError extends AgentError {
  constructor(
    agentId: string,
    message: string,
    status: 'degraded' | 'unhealthy',
    context: Record<string, any> = {}
  ) {
    super(
      'AGENT_HEALTH_CHECK_FAILED',
      `Agent '${agentId}' health check failed (${status}): ${message}`,
      {
        agentId,
        healthStatus: status,
        ...context
      },
      'Check agent logs for error patterns. Consider restarting the agent if issues persist. ' +
      'Verify that all dependencies are healthy and responsive.'
    );
  }
}

/**
 * Utility function to determine if an error is agent-related.
 * 
 * @param error - Error to check
 * @returns True if error is an instance of AgentError
 * 
 * @example
 * ```typescript
 * try {
 *   await agent.execute(context);
 * } catch (error) {
 *   if (isAgentError(error)) {
 *     console.log('Agent error code:', error.code);
 *     console.log('Suggested solution:', error.solution);
 *   } else {
 *     console.log('Unexpected error:', error.message);
 *   }
 * }
 * ```
 */
export function isAgentError(error: any): error is AgentError {
  return error instanceof AgentError;
}

/**
 * Utility function to create error context from an execution context.
 * 
 * Extracts relevant information from an execution context to include
 * in error objects for better debugging and reporting.
 * 
 * @param executionContext - The execution context
 * @returns Context object suitable for error reporting
 * 
 * @example
 * ```typescript
 * try {
 *   await processTask();
 * } catch (error) {
 *   throw new AgentExecutionError(
 *     agentId,
 *     'Task processing failed',
 *     error,
 *     createErrorContext(context)
 *   );
 * }
 * ```
 */
export function createErrorContext(executionContext: any): Record<string, any> {
  return {
    executionId: executionContext.executionId,
    taskId: executionContext.task?.id,
    taskType: executionContext.task?.type,
    sessionId: executionContext.session?.id,
    userId: executionContext.session?.userId,
    timestamp: new Date().toISOString(),
    traceId: executionContext.metadata?.traceId
  };
}