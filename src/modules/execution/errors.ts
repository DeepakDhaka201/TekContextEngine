/**
 * @fileoverview Error handling system for the Execution Manager Module
 * @module modules/execution/errors
 * 
 * This file implements a comprehensive hierarchical error system for the
 * Execution Manager Module with context preservation, error classification,
 * solution suggestions, and integration with monitoring systems.
 * 
 * Key concepts:
 * - ExecutionError: Base error class with rich context and error codes
 * - Hierarchical error types for specific execution scenarios
 * - Error severity classification for monitoring and alerting
 * - Solution suggestions for common error conditions
 * - Integration with tracing and observability systems
 * 
 * @example
 * ```typescript
 * import { WorkflowValidationError, NodeExecutionError } from './errors';
 * 
 * // Workflow validation error
 * throw new WorkflowValidationError(
 *   'Invalid workflow structure',
 *   { workflowId: 'workflow-123', nodeCount: 0 },
 *   'Ensure workflow contains at least one node'
 * );
 * 
 * // Node execution error
 * throw new NodeExecutionError(
 *   'node-456',
 *   'Agent execution failed',
 *   { agentType: 'llm', timeout: 30000 },
 *   'Check agent configuration and increase timeout if needed'
 * );
 * ```
 * 
 * @see types.ts for ExecutionError interface
 * @since 1.0.0
 */

/**
 * Base error class for all Execution Manager related errors.
 * 
 * Provides a comprehensive error system with:
 * - Structured error codes for programmatic handling
 * - Rich contextual information for debugging
 * - Solution suggestions for common error conditions
 * - Error severity classification for monitoring
 * - Chain of cause preservation for nested errors
 * - Integration with tracing and observability systems
 * 
 * @remarks
 * All errors in the Execution Manager should extend this base class
 * to ensure consistent error handling and reporting.
 * 
 * @example
 * ```typescript
 * class CustomExecutionError extends ExecutionError {
 *   constructor(message: string, context?: Record<string, any>) {
 *     super('CUSTOM_ERROR', message, context, 'Check custom configuration');
 *   }
 * }
 * ```
 * 
 * @public
 */
export class ExecutionError extends Error {
  /** Structured error code for programmatic handling */
  public readonly code: string;
  
  /** Rich contextual information for debugging and monitoring */
  public readonly context: Record<string, any>;
  
  /** Human-readable solution suggestion */
  public readonly solution?: string;
  
  /** Error occurrence timestamp */
  public readonly timestamp: Date;
  
  /** Original error that caused this error (if any) */
  public readonly cause?: Error;
  
  /** Error severity level for monitoring and alerting */
  public readonly severity: ExecutionErrorSeverity;
  
  /**
   * Creates a new ExecutionError with comprehensive error information.
   * 
   * @param code - Structured error code for programmatic handling
   * @param message - Human-readable error message
   * @param context - Additional context information for debugging
   * @param solution - Optional solution suggestion
   * @param severity - Error severity level (defaults to 'error')
   * @param cause - Original error that caused this error
   * 
   * @example
   * ```typescript
   * throw new ExecutionError(
   *   'WORKFLOW_TIMEOUT',
   *   'Workflow execution exceeded maximum time limit',
   *   {
   *     workflowId: 'workflow-123',
   *     executionId: 'exec-456',
   *     timeout: 300000,
   *     elapsed: 350000
   *   },
   *   'Increase workflow timeout or optimize node execution times',
   *   'warning'
   * );
   * ```
   */
  constructor(
    code: string,
    message: string,
    context: Record<string, any> = {},
    solution?: string,
    severity: ExecutionErrorSeverity = 'error',
    cause?: Error
  ) {
    super(message);
    
    this.name = this.constructor.name;
    this.code = code;
    this.context = context;
    this.solution = solution;
    this.severity = severity;
    this.timestamp = new Date();
    this.cause = cause;
    
    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, ExecutionError.prototype);
  }
  
  /**
   * Converts error to JSON representation for logging and monitoring.
   * 
   * @returns JSON representation of the error
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      context: this.context,
      solution: this.solution,
      severity: this.severity,
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
   * Creates a formatted error message with context information.
   * 
   * @returns Formatted error message
   */
  toString(): string {
    let result = `${this.name}: ${this.message}`;
    
    if (Object.keys(this.context).length > 0) {
      const contextStr = Object.entries(this.context)
        .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
        .join(', ');
      result += ` [Context: ${contextStr}]`;
    }
    
    if (this.solution) {
      result += ` [Solution: ${this.solution}]`;
    }
    
    return result;
  }
}

/**
 * Error severity levels for monitoring and alerting.
 * 
 * Used to classify error importance and determine appropriate
 * response actions in monitoring and alerting systems.
 * 
 * @public
 */
export type ExecutionErrorSeverity = 
  | 'info'        // Informational, no action needed
  | 'warning'     // Warning condition, monitoring recommended
  | 'error'       // Error condition, immediate attention needed
  | 'critical';   // Critical error, system stability at risk

/**
 * Workflow validation errors.
 * 
 * Thrown when workflow definition validation fails due to structural
 * issues, invalid configurations, or missing dependencies.
 * 
 * @public
 */
export class WorkflowValidationError extends ExecutionError {
  constructor(
    message: string, 
    context: Record<string, any> = {},
    solution?: string
  ) {
    super(
      'WORKFLOW_VALIDATION_ERROR',
      message,
      context,
      solution || 'Review workflow definition and ensure all nodes and edges are properly configured',
      'error'
    );
  }
}

/**
 * Node execution errors.
 * 
 * Thrown when individual node execution fails due to agent errors,
 * timeouts, configuration issues, or resource constraints.
 * 
 * @public
 */
export class NodeExecutionError extends ExecutionError {
  /** Node that failed execution */
  public readonly nodeId: string;
  
  constructor(
    nodeId: string,
    message: string,
    context: Record<string, any> = {},
    solution?: string,
    cause?: Error
  ) {
    super(
      'NODE_EXECUTION_ERROR',
      message,
      { ...context, nodeId },
      solution || 'Check node configuration, agent availability, and resource limits',
      'error',
      cause
    );
    
    this.nodeId = nodeId;
  }
}

/**
 * Workflow execution timeout errors.
 * 
 * Thrown when workflow execution exceeds configured time limits
 * or individual nodes fail to complete within timeout periods.
 * 
 * @public
 */
export class ExecutionTimeoutError extends ExecutionError {
  constructor(
    executionId: string,
    timeout: number,
    elapsed: number,
    context: Record<string, any> = {}
  ) {
    super(
      'EXECUTION_TIMEOUT',
      `Execution timeout after ${elapsed}ms (limit: ${timeout}ms)`,
      { ...context, executionId, timeout, elapsed },
      'Increase timeout limits or optimize workflow performance',
      'warning'
    );
  }
}

/**
 * Human interaction errors.
 * 
 * Thrown when human-in-the-loop interactions fail due to timeouts,
 * invalid responses, or system configuration issues.
 * 
 * @public
 */
export class HumanInteractionError extends ExecutionError {
  constructor(
    message: string,
    context: Record<string, any> = {},
    solution?: string
  ) {
    super(
      'HUMAN_INTERACTION_ERROR',
      message,
      context,
      solution || 'Ensure human interaction timeouts and configurations are appropriate',
      'warning'
    );
  }
}

/**
 * State persistence errors.
 * 
 * Thrown when execution state cannot be saved or loaded from
 * persistence storage, affecting pause/resume functionality.
 * 
 * @public
 */
export class StatePersistenceError extends ExecutionError {
  constructor(
    operation: 'save' | 'load',
    message: string,
    context: Record<string, any> = {},
    cause?: Error
  ) {
    super(
      'STATE_PERSISTENCE_ERROR',
      `State ${operation} failed: ${message}`,
      { ...context, operation },
      'Check storage connectivity and permissions',
      'error',
      cause
    );
  }
}

/**
 * Dependency resolution errors.
 * 
 * Thrown when node dependencies cannot be resolved due to
 * circular dependencies, missing nodes, or invalid configurations.
 * 
 * @public
 */
export class DependencyResolutionError extends ExecutionError {
  constructor(
    message: string,
    context: Record<string, any> = {}
  ) {
    super(
      'DEPENDENCY_RESOLUTION_ERROR',
      message,
      context,
      'Review workflow structure and ensure no circular dependencies exist',
      'error'
    );
  }
}

/**
 * Agent availability errors.
 * 
 * Thrown when required agents are not available or cannot be
 * initialized for node execution.
 * 
 * @public
 */
export class AgentAvailabilityError extends ExecutionError {
  constructor(
    agentType: string,
    message: string,
    context: Record<string, any> = {}
  ) {
    super(
      'AGENT_AVAILABILITY_ERROR',
      `Agent '${agentType}' not available: ${message}`,
      { ...context, agentType },
      'Ensure agent is registered and properly configured in the system',
      'error'
    );
  }
}

/**
 * Resource constraint errors.
 * 
 * Thrown when system resource limits prevent execution continuation
 * due to memory, CPU, or concurrency constraints.
 * 
 * @public
 */
export class ResourceConstraintError extends ExecutionError {
  constructor(
    resource: string,
    limit: number,
    current: number,
    context: Record<string, any> = {}
  ) {
    super(
      'RESOURCE_CONSTRAINT_ERROR',
      `Resource limit exceeded: ${resource} (current: ${current}, limit: ${limit})`,
      { ...context, resource, limit, current },
      'Increase resource limits or reduce concurrent executions',
      'warning'
    );
  }
}

/**
 * Data transformation errors.
 * 
 * Thrown when edge data transformations fail due to invalid
 * transformation configurations or incompatible data formats.
 * 
 * @public
 */
export class DataTransformationError extends ExecutionError {
  constructor(
    edgeId: string,
    message: string,
    context: Record<string, any> = {},
    cause?: Error
  ) {
    super(
      'DATA_TRANSFORMATION_ERROR',
      `Data transformation failed on edge '${edgeId}': ${message}`,
      { ...context, edgeId },
      'Review data transformation configuration and input data format',
      'error',
      cause
    );
  }
}

/**
 * Condition evaluation errors.
 * 
 * Thrown when edge conditions cannot be evaluated due to
 * invalid expressions, missing data, or evaluation errors.
 * 
 * @public
 */
export class ConditionEvaluationError extends ExecutionError {
  constructor(
    edgeId: string,
    condition: string,
    message: string,
    context: Record<string, any> = {},
    cause?: Error
  ) {
    super(
      'CONDITION_EVALUATION_ERROR',
      `Condition evaluation failed on edge '${edgeId}' (${condition}): ${message}`,
      { ...context, edgeId, condition },
      'Review condition syntax and ensure required data is available',
      'error',
      cause
    );
  }
}

/**
 * Execution context errors.
 * 
 * Thrown when execution context is invalid, corrupted, or
 * incompatible with the current system version.
 * 
 * @public
 */
export class ExecutionContextError extends ExecutionError {
  constructor(
    message: string,
    context: Record<string, any> = {}
  ) {
    super(
      'EXECUTION_CONTEXT_ERROR',
      message,
      context,
      'Verify execution context integrity and compatibility',
      'error'
    );
  }
}

/**
 * Streaming errors.
 * 
 * Thrown when real-time streaming of execution progress fails
 * due to connectivity issues or streaming configuration problems.
 * 
 * @public
 */
export class StreamingError extends ExecutionError {
  constructor(
    message: string,
    context: Record<string, any> = {},
    cause?: Error
  ) {
    super(
      'STREAMING_ERROR',
      message,
      context,
      'Check streaming configuration and network connectivity',
      'warning',
      cause
    );
  }
}

/**
 * Type guard to check if an error is an ExecutionError.
 * 
 * @param error - Error to check
 * @returns True if error is an ExecutionError
 * 
 * @example
 * ```typescript
 * try {
 *   await executeWorkflow(workflow, input);
 * } catch (error) {
 *   if (isExecutionError(error)) {
 *     console.log('Execution error:', error.code, error.context);
 *   }
 * }
 * ```
 * 
 * @public
 */
export function isExecutionError(error: any): error is ExecutionError {
  return error instanceof ExecutionError;
}

/**
 * Creates error context with common execution information.
 * 
 * Helper function to create standardized error context objects
 * with common execution information for consistent error reporting.
 * 
 * @param executionId - Execution identifier
 * @param workflowId - Workflow identifier
 * @param additionalContext - Additional context information
 * @returns Standardized error context
 * 
 * @example
 * ```typescript
 * const context = createExecutionErrorContext(
 *   'exec-123',
 *   'workflow-456',
 *   { nodeId: 'node-789', duration: 5000 }
 * );
 * 
 * throw new NodeExecutionError(
 *   'node-789',
 *   'Node execution failed',
 *   context
 * );
 * ```
 * 
 * @public
 */
export function createExecutionErrorContext(
  executionId: string,
  workflowId: string,
  additionalContext: Record<string, any> = {}
): Record<string, any> {
  return {
    executionId,
    workflowId,
    timestamp: new Date().toISOString(),
    ...additionalContext
  };
}

/**
 * Gets the severity level of an execution error.
 * 
 * Determines the appropriate severity level for an error based on
 * its type and context for monitoring and alerting systems.
 * 
 * @param error - Error to evaluate
 * @returns Error severity level
 * 
 * @example
 * ```typescript
 * try {
 *   await executeWorkflow(workflow, input);
 * } catch (error) {
 *   const severity = getExecutionErrorSeverity(error);
 *   if (severity === 'critical') {
 *     alerting.triggerAlert('execution_critical_error', error);
 *   }
 * }
 * ```
 * 
 * @public
 */
export function getExecutionErrorSeverity(error: any): ExecutionErrorSeverity {
  if (isExecutionError(error)) {
    return error.severity;
  }
  
  // Default severity based on error type
  if (error instanceof Error) {
    // System errors are typically critical
    if (error.name.includes('System') || error.message.includes('ENOTFOUND')) {
      return 'critical';
    }
    
    // Timeout errors are warnings
    if (error.name.includes('Timeout') || error.message.includes('timeout')) {
      return 'warning';
    }
  }
  
  // Unknown errors default to error level
  return 'error';
}

/**
 * Maps execution errors to HTTP status codes for API responses.
 * 
 * Provides consistent HTTP status code mapping for different
 * execution error types in API endpoints.
 * 
 * @param error - Error to map
 * @returns Appropriate HTTP status code
 * 
 * @example
 * ```typescript
 * app.post('/api/execute', async (req, res) => {
 *   try {
 *     const result = await executeWorkflow(req.body.workflow, req.body.input);
 *     res.json(result);
 *   } catch (error) {
 *     const statusCode = mapExecutionErrorToHttpStatus(error);
 *     res.status(statusCode).json({ error: error.message });
 *   }
 * });
 * ```
 * 
 * @public
 */
export function mapExecutionErrorToHttpStatus(error: any): number {
  if (isExecutionError(error)) {
    switch (error.code) {
      case 'WORKFLOW_VALIDATION_ERROR':
        return 400; // Bad Request
      
      case 'NODE_EXECUTION_ERROR':
        return 422; // Unprocessable Entity
      
      case 'EXECUTION_TIMEOUT':
        return 408; // Request Timeout
      
      case 'HUMAN_INTERACTION_ERROR':
        return 202; // Accepted (waiting for human)
      
      case 'STATE_PERSISTENCE_ERROR':
        return 503; // Service Unavailable
      
      case 'DEPENDENCY_RESOLUTION_ERROR':
        return 400; // Bad Request
      
      case 'AGENT_AVAILABILITY_ERROR':
        return 503; // Service Unavailable
      
      case 'RESOURCE_CONSTRAINT_ERROR':
        return 429; // Too Many Requests
      
      case 'DATA_TRANSFORMATION_ERROR':
      case 'CONDITION_EVALUATION_ERROR':
        return 422; // Unprocessable Entity
      
      case 'EXECUTION_CONTEXT_ERROR':
        return 400; // Bad Request
      
      case 'STREAMING_ERROR':
        return 502; // Bad Gateway
      
      default:
        return 500; // Internal Server Error
    }
  }
  
  // Default for unknown errors
  return 500;
}

/**
 * Creates a sanitized error response for API clients.
 * 
 * Produces client-safe error responses that exclude sensitive
 * internal information while preserving useful debugging context.
 * 
 * @param error - Error to sanitize
 * @param includeContext - Whether to include context information
 * @returns Sanitized error response
 * 
 * @example
 * ```typescript
 * app.post('/api/execute', async (req, res) => {
 *   try {
 *     const result = await executeWorkflow(req.body.workflow, req.body.input);
 *     res.json(result);
 *   } catch (error) {
 *     const sanitizedError = sanitizeErrorForClient(error, true);
 *     res.status(400).json(sanitizedError);
 *   }
 * });
 * ```
 * 
 * @public
 */
export function sanitizeErrorForClient(
  error: any, 
  includeContext: boolean = false
): Record<string, any> {
  const baseResponse = {
    error: true,
    message: error.message || 'An error occurred',
    timestamp: new Date().toISOString()
  };
  
  if (isExecutionError(error)) {
    const response: Record<string, any> = {
      ...baseResponse,
      code: error.code,
      severity: error.severity
    };
    
    if (error.solution) {
      response.solution = error.solution;
    }
    
    if (includeContext && error.context) {
      // Filter out sensitive context information
      const sanitizedContext: Record<string, any> = {};
      for (const [key, value] of Object.entries(error.context)) {
        // Exclude potentially sensitive keys
        if (!key.toLowerCase().includes('password') && 
            !key.toLowerCase().includes('token') && 
            !key.toLowerCase().includes('secret')) {
          sanitizedContext[key] = value;
        }
      }
      response.context = sanitizedContext;
    }
    
    return response;
  }
  
  return baseResponse;
}

/**
 * Error recovery suggestions based on error types.
 * 
 * Provides automated recovery suggestions for common execution
 * errors to help with automatic retry and recovery mechanisms.
 * 
 * @public
 */
export const ERROR_RECOVERY_SUGGESTIONS = {
  WORKFLOW_VALIDATION_ERROR: [
    'Validate workflow structure before execution',
    'Check node and edge configurations',
    'Verify agent type availability'
  ],
  
  NODE_EXECUTION_ERROR: [
    'Retry with exponential backoff',
    'Check agent health and availability',
    'Verify node input data format',
    'Increase node timeout if needed'
  ],
  
  EXECUTION_TIMEOUT: [
    'Increase workflow timeout',
    'Optimize node execution performance',
    'Enable parallel execution where possible',
    'Break down complex workflows'
  ],
  
  HUMAN_INTERACTION_ERROR: [
    'Increase human interaction timeout',
    'Provide default responses for non-critical interactions',
    'Implement retry mechanisms for human prompts'
  ],
  
  STATE_PERSISTENCE_ERROR: [
    'Check storage system health',
    'Verify connectivity and permissions',
    'Implement fallback storage mechanisms',
    'Clean up corrupted state data'
  ],
  
  AGENT_AVAILABILITY_ERROR: [
    'Verify agent registration and configuration',
    'Check agent health status',
    'Implement agent failover mechanisms',
    'Scale agent instances if needed'
  ],
  
  RESOURCE_CONSTRAINT_ERROR: [
    'Increase resource limits',
    'Implement queue-based execution',
    'Scale system resources',
    'Optimize resource usage patterns'
  ]
} as const;