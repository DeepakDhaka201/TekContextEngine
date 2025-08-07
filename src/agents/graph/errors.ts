/**
 * @fileoverview Comprehensive error handling system for Graph Agent
 * @module agents/graph/errors
 * @requires ../base/types
 * @requires ./types
 * 
 * This file implements a hierarchical error handling system specifically designed
 * for Graph Agent operations. It provides specialized error classes for different
 * types of graph execution failures, from individual node errors to complete
 * graph validation and execution failures.
 * 
 * The error system is designed to:
 * - Provide detailed context about graph execution state
 * - Support error recovery and retry mechanisms
 * - Enable comprehensive error reporting and analysis
 * - Facilitate debugging of complex graph workflows
 * - Support error aggregation from multiple node failures
 * 
 * Key concepts:
 * - Hierarchical error inheritance for specific error types
 * - Contextual error information for debugging
 * - Error categorization for automated handling
 * - Recovery strategy recommendations
 * - Integration with graph state management
 * 
 * @example
 * ```typescript
 * import { GraphValidationError, NodeExecutionError } from './errors';
 * 
 * try {
 *   await graphAgent.execute(input);
 * } catch (error) {
 *   if (error instanceof NodeExecutionError) {
 *     console.log(`Node ${error.nodeId} failed: ${error.message}`);
 *     if (error.retryable) {
 *       // Implement retry logic
 *     }
 *   } else if (error instanceof GraphValidationError) {
 *     console.log(`Graph validation failed: ${error.validationErrors}`);
 *   }
 * }
 * ```
 * 
 * @since 1.0.0
 */

import { AgentError } from '../base/types';
import {
  GraphExecutionStatus,
  NodeExecutionStatus,
  NodeType,
  EdgeType,
  GraphExecutionStrategy,
  GraphValidationError as IGraphValidationError,
  GraphValidationWarning,
  NodeExecutionResult,
  ExecutionStep,
  GraphPerformanceMetrics,
  GraphResourceUtilization,
  GraphCheckpoint
} from './types';

/**
 * Base error class for all Graph Agent related errors.
 * 
 * Provides common functionality and context information for graph-related
 * errors, including execution state, performance metrics, and recovery
 * suggestions.
 * 
 * @public
 */
export class GraphAgentError extends Error {
  public readonly name: string = 'GraphAgentError';
  public readonly code: string;
  public readonly timestamp: Date;
  public readonly executionId?: string;
  public readonly graphId?: string;
  public readonly context: GraphErrorContext;
  public readonly severity: GraphErrorSeverity;
  public readonly retryable: boolean;
  public readonly cause?: Error;
  
  constructor(
    code: string,
    message: string,
    context: Partial<GraphErrorContext> = {},
    severity: GraphErrorSeverity = 'error',
    retryable: boolean = false,
    cause?: Error
  ) {
    super(message);
    
    this.code = code;
    this.timestamp = new Date();
    this.context = {
      executionState: 'unknown',
      nodeCount: 0,
      completedNodes: 0,
      failedNodes: 0,
      ...context
    };
    this.severity = severity;
    this.retryable = retryable;
    this.cause = cause;
    this.executionId = context.executionId;
    this.graphId = context.graphId;
    
    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
  
  /**
   * Converts error to a serializable object.
   * 
   * @returns Serializable error representation
   */
  public toJSON(): Record<string, any> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      timestamp: this.timestamp.toISOString(),
      executionId: this.executionId,
      graphId: this.graphId,
      context: this.context,
      severity: this.severity,
      retryable: this.retryable,
      stack: this.stack,
      cause: this.cause ? {
        name: this.cause.name,
        message: this.cause.message,
        stack: this.cause.stack
      } : undefined
    };
  }
  
  /**
   * Gets error classification for automated handling.
   * 
   * @returns Error classification
   */
  public getClassification(): GraphErrorClassification {
    return {
      category: 'general',
      type: 'execution',
      severity: this.severity,
      retryable: this.retryable,
      automated: false
    };
  }
  
  /**
   * Gets suggested recovery strategies.
   * 
   * @returns Array of recovery strategies
   */
  public getRecoveryStrategies(): GraphRecoveryStrategy[] {
    if (this.retryable) {
      return ['retry', 'skip'];
    }
    return ['skip', 'compensate'];
  }
}

/**
 * Error thrown during graph validation.
 * 
 * Occurs when a graph definition contains structural problems like
 * cycles, missing nodes, invalid edges, or schema violations.
 */
export class GraphValidationError extends GraphAgentError {
  public readonly name = 'GraphValidationError';
  public readonly validationErrors: IGraphValidationError[];
  public readonly warnings: GraphValidationWarning[];
  public readonly graphDefinition?: any;
  
  constructor(
    message: string,
    validationErrors: IGraphValidationError[],
    warnings: GraphValidationWarning[] = [],
    context: Partial<GraphErrorContext> = {},
    graphDefinition?: any
  ) {
    super(
      'GRAPH_VALIDATION_FAILED',
      message,
      context,
      'error',
      false // Validation errors are typically not retryable
    );
    
    this.validationErrors = validationErrors;
    this.warnings = warnings;
    this.graphDefinition = graphDefinition;
  }
  
  public getClassification(): GraphErrorClassification {
    return {
      category: 'validation',
      type: 'structural',
      severity: this.severity,
      retryable: false,
      automated: false
    };
  }
  
  public getRecoveryStrategies(): GraphRecoveryStrategy[] {
    return ['rollback']; // Fix the graph definition
  }
  
  /**
   * Gets the most critical validation error.
   * 
   * @returns Most severe validation error
   */
  public getMostCriticalError(): IGraphValidationError | undefined {
    return this.validationErrors
      .filter(error => error.severity === 'error')
      .sort((a, b) => a.code.localeCompare(b.code))[0];
  }
}

/**
 * Error thrown during graph execution initialization.
 * 
 * Occurs when the graph cannot be prepared for execution due to
 * configuration issues, resource constraints, or dependency problems.
 */
export class GraphInitializationError extends GraphAgentError {
  public readonly name = 'GraphInitializationError';
  public readonly initializationStep: GraphInitializationStep;
  public readonly resourceRequirements?: GraphResourceRequirements;
  public readonly missingDependencies?: string[];
  
  constructor(
    message: string,
    step: GraphInitializationStep,
    context: Partial<GraphErrorContext> = {},
    resourceRequirements?: GraphResourceRequirements,
    missingDependencies?: string[]
  ) {
    super(
      'GRAPH_INITIALIZATION_FAILED',
      message,
      context,
      'error',
      true // May be retryable if resources become available
    );
    
    this.initializationStep = step;
    this.resourceRequirements = resourceRequirements;
    this.missingDependencies = missingDependencies;
  }
  
  public getClassification(): GraphErrorClassification {
    return {
      category: 'initialization',
      type: 'configuration',
      severity: this.severity,
      retryable: this.retryable,
      automated: true
    };
  }
  
  public getRecoveryStrategies(): GraphRecoveryStrategy[] {
    if (this.missingDependencies?.length) {
      return ['retry']; // Try again after dependencies are resolved
    }
    if (this.resourceRequirements) {
      return ['retry', 'substitute']; // Try with fewer resources or alternative
    }
    return ['retry', 'rollback'];
  }
}

/**
 * Error thrown during individual node execution.
 * 
 * Provides detailed information about node failures including
 * execution context, input/output state, and recovery options.
 */
export class NodeExecutionError extends GraphAgentError {
  public readonly name = 'NodeExecutionError';
  public readonly nodeId: string;
  public readonly nodeType: NodeType;
  public readonly nodeName?: string;
  public readonly nodeInput?: any;
  public readonly nodeOutput?: any;
  public readonly executionStep?: ExecutionStep;
  public readonly retryCount: number;
  public readonly maxRetries: number;
  public readonly lastRetryAt?: Date;
  
  constructor(
    nodeId: string,
    nodeType: NodeType,
    message: string,
    context: Partial<GraphErrorContext> = {},
    retryCount: number = 0,
    maxRetries: number = 3,
    nodeInput?: any,
    nodeOutput?: any,
    executionStep?: ExecutionStep,
    cause?: Error
  ) {
    super(
      'NODE_EXECUTION_FAILED',
      `Node '${nodeId}' (${nodeType}) execution failed: ${message}`,
      {
        ...context,
        nodeId,
        nodeType
      },
      'error',
      retryCount < maxRetries, // Retryable if under retry limit
      cause
    );
    
    this.nodeId = nodeId;
    this.nodeType = nodeType;
    this.nodeInput = nodeInput;
    this.nodeOutput = nodeOutput;
    this.executionStep = executionStep;
    this.retryCount = retryCount;
    this.maxRetries = maxRetries;
    
    if (retryCount > 0) {
      this.lastRetryAt = new Date();
    }
  }
  
  public getClassification(): GraphErrorClassification {
    return {
      category: 'execution',
      type: 'node',
      severity: this.severity,
      retryable: this.retryable,
      automated: this.retryCount < this.maxRetries
    };
  }
  
  public getRecoveryStrategies(): GraphRecoveryStrategy[] {
    const strategies: GraphRecoveryStrategy[] = [];
    
    if (this.retryable) {
      strategies.push('retry');
    }
    
    // Node-specific recovery strategies
    switch (this.nodeType) {
      case 'agent':
        strategies.push('substitute', 'compensate');
        break;
      case 'tool':
        strategies.push('substitute', 'skip');
        break;
      case 'transform':
        strategies.push('skip', 'substitute');
        break;
      default:
        strategies.push('skip');
    }
    
    return strategies;
  }
  
  /**
   * Checks if the error is caused by a specific condition.
   * 
   * @param condition - Condition to check
   * @returns Whether condition matches
   */
  public isCondition(condition: NodeErrorCondition): boolean {
    switch (condition) {
      case 'timeout':
        return this.message.toLowerCase().includes('timeout');
      case 'resource':
        return this.message.toLowerCase().includes('resource') || 
               this.message.toLowerCase().includes('memory') ||
               this.message.toLowerCase().includes('cpu');
      case 'network':
        return this.message.toLowerCase().includes('network') ||
               this.message.toLowerCase().includes('connection');
      case 'permission':
        return this.message.toLowerCase().includes('permission') ||
               this.message.toLowerCase().includes('access');
      case 'validation':
        return this.message.toLowerCase().includes('validation') ||
               this.message.toLowerCase().includes('invalid');
      default:
        return false;
    }
  }
}

/**
 * Error thrown when graph execution times out.
 * 
 * Provides information about which nodes were executing when
 * the timeout occurred and current execution state.
 */
export class GraphTimeoutError extends GraphAgentError {
  public readonly name = 'GraphTimeoutError';
  public readonly timeoutDuration: number;
  public readonly activeNodes: string[];
  public readonly completedNodes: string[];
  public readonly pendingNodes: string[];
  public readonly executionProgress: number;
  
  constructor(
    timeoutDuration: number,
    activeNodes: string[],
    completedNodes: string[],
    pendingNodes: string[],
    executionProgress: number,
    context: Partial<GraphErrorContext> = {}
  ) {
    super(
      'GRAPH_EXECUTION_TIMEOUT',
      `Graph execution timed out after ${timeoutDuration}ms. Progress: ${Math.round(executionProgress * 100)}%`,
      context,
      'error',
      true // Timeouts may be retryable with longer timeout
    );
    
    this.timeoutDuration = timeoutDuration;
    this.activeNodes = activeNodes;
    this.completedNodes = completedNodes;
    this.pendingNodes = pendingNodes;
    this.executionProgress = executionProgress;
  }
  
  public getClassification(): GraphErrorClassification {
    return {
      category: 'execution',
      type: 'timeout',
      severity: this.severity,
      retryable: this.retryable,
      automated: true
    };
  }
  
  public getRecoveryStrategies(): GraphRecoveryStrategy[] {
    return ['retry', 'compensate']; // Retry with longer timeout or partial completion
  }
}

/**
 * Error thrown when graph execution is cancelled.
 * 
 * Provides information about the cancellation source and
 * current execution state at time of cancellation.
 */
export class GraphCancellationError extends GraphAgentError {
  public readonly name = 'GraphCancellationError';
  public readonly cancellationSource: GraphCancellationSource;
  public readonly reason?: string;
  public readonly activeNodes: string[];
  public readonly completedNodes: string[];
  
  constructor(
    source: GraphCancellationSource,
    reason: string,
    activeNodes: string[],
    completedNodes: string[],
    context: Partial<GraphErrorContext> = {}
  ) {
    super(
      'GRAPH_EXECUTION_CANCELLED',
      `Graph execution cancelled by ${source}: ${reason}`,
      context,
      'warning', // Cancellation is typically not an error
      false // Cancellations are not retryable
    );
    
    this.cancellationSource = source;
    this.reason = reason;
    this.activeNodes = activeNodes;
    this.completedNodes = completedNodes;
  }
  
  public getClassification(): GraphErrorClassification {
    return {
      category: 'execution',
      type: 'cancellation',
      severity: this.severity,
      retryable: false,
      automated: false
    };
  }
  
  public getRecoveryStrategies(): GraphRecoveryStrategy[] {
    return []; // No recovery for cancellations
  }
}

/**
 * Error thrown when resource limits are exceeded.
 * 
 * Provides information about resource usage and limits
 * to help with capacity planning and optimization.
 */
export class GraphResourceError extends GraphAgentError {
  public readonly name = 'GraphResourceError';
  public readonly resourceType: GraphResourceType;
  public readonly currentUsage: number;
  public readonly limit: number;
  public readonly utilizationHistory?: GraphResourceUtilization[];
  
  constructor(
    resourceType: GraphResourceType,
    currentUsage: number,
    limit: number,
    context: Partial<GraphErrorContext> = {},
    utilizationHistory?: GraphResourceUtilization[]
  ) {
    super(
      'GRAPH_RESOURCE_EXCEEDED',
      `${resourceType} limit exceeded: ${currentUsage} > ${limit}`,
      context,
      'error',
      true // May be retryable with resource cleanup
    );
    
    this.resourceType = resourceType;
    this.currentUsage = currentUsage;
    this.limit = limit;
    this.utilizationHistory = utilizationHistory;
  }
  
  public getClassification(): GraphErrorClassification {
    return {
      category: 'resource',
      type: 'limit',
      severity: this.severity,
      retryable: this.retryable,
      automated: true
    };
  }
  
  public getRecoveryStrategies(): GraphRecoveryStrategy[] {
    return ['retry', 'compensate']; // Retry after cleanup or reduce resource usage
  }
  
  /**
   * Gets resource utilization percentage.
   * 
   * @returns Utilization as percentage (0-100)
   */
  public getUtilizationPercentage(): number {
    return Math.round((this.currentUsage / this.limit) * 100);
  }
}

/**
 * Error thrown when multiple nodes fail during execution.
 * 
 * Aggregates multiple node errors to provide a comprehensive
 * view of execution failures across the graph.
 */
export class GraphMultipleNodeError extends GraphAgentError {
  public readonly name = 'GraphMultipleNodeError';
  public readonly nodeErrors: NodeExecutionError[];
  public readonly failedNodeIds: string[];
  public readonly errorSummary: Record<string, number>;
  
  constructor(
    nodeErrors: NodeExecutionError[],
    context: Partial<GraphErrorContext> = {}
  ) {
    const failedNodeIds = nodeErrors.map(error => error.nodeId);
    const errorSummary = nodeErrors.reduce((summary, error) => {
      summary[error.code] = (summary[error.code] || 0) + 1;
      return summary;
    }, {} as Record<string, number>);
    
    super(
      'GRAPH_MULTIPLE_NODE_FAILURES',
      `Multiple node failures: ${failedNodeIds.join(', ')}`,
      {
        ...context,
        failedNodes: failedNodeIds.length
      },
      'error',
      nodeErrors.some(error => error.retryable) // Retryable if any node is retryable
    );
    
    this.nodeErrors = nodeErrors;
    this.failedNodeIds = failedNodeIds;
    this.errorSummary = errorSummary;
  }
  
  public getClassification(): GraphErrorClassification {
    return {
      category: 'execution',
      type: 'multiple',
      severity: this.severity,
      retryable: this.retryable,
      automated: this.nodeErrors.some(error => error.getClassification().automated)
    };
  }
  
  public getRecoveryStrategies(): GraphRecoveryStrategy[] {
    // Collect all unique recovery strategies from node errors
    const allStrategies = this.nodeErrors.flatMap(error => error.getRecoveryStrategies());
    return Array.from(new Set(allStrategies)) as GraphRecoveryStrategy[];
  }
  
  /**
   * Gets the most severe node error.
   * 
   * @returns Most severe node error
   */
  public getMostSevereError(): NodeExecutionError {
    return this.nodeErrors.reduce((mostSevere, current) => {
      const severityOrder = { 'critical': 4, 'error': 3, 'warning': 2, 'info': 1 };
      return severityOrder[current.severity] > severityOrder[mostSevere.severity] 
        ? current : mostSevere;
    });
  }
  
  /**
   * Groups errors by node type.
   * 
   * @returns Errors grouped by node type
   */
  public getErrorsByNodeType(): Record<NodeType, NodeExecutionError[]> {
    return this.nodeErrors.reduce((groups, error) => {
      if (!groups[error.nodeType]) {
        groups[error.nodeType] = [];
      }
      groups[error.nodeType].push(error);
      return groups;
    }, {} as Record<NodeType, NodeExecutionError[]>);
  }
}

/**
 * Error thrown when graph state becomes inconsistent.
 * 
 * Occurs when the execution state doesn't match expected
 * values or when state corruption is detected.
 */
export class GraphStateError extends GraphAgentError {
  public readonly name = 'GraphStateError';
  public readonly stateType: GraphStateType;
  public readonly expectedState?: any;
  public readonly actualState?: any;
  public readonly checkpoint?: GraphCheckpoint;
  
  constructor(
    stateType: GraphStateType,
    message: string,
    context: Partial<GraphErrorContext> = {},
    expectedState?: any,
    actualState?: any,
    checkpoint?: GraphCheckpoint
  ) {
    super(
      'GRAPH_STATE_INCONSISTENT',
      `Graph state error (${stateType}): ${message}`,
      context,
      'error',
      true // State errors may be recoverable from checkpoints
    );
    
    this.stateType = stateType;
    this.expectedState = expectedState;
    this.actualState = actualState;
    this.checkpoint = checkpoint;
  }
  
  public getClassification(): GraphErrorClassification {
    return {
      category: 'state',
      type: 'inconsistency',
      severity: this.severity,
      retryable: this.retryable,
      automated: !!this.checkpoint
    };
  }
  
  public getRecoveryStrategies(): GraphRecoveryStrategy[] {
    if (this.checkpoint) {
      return ['rollback', 'retry'];
    }
    return ['compensate', 'retry'];
  }
}

/**
 * Error thrown when edge traversal fails.
 * 
 * Occurs when edge conditions fail evaluation or when
 * data transformation during edge traversal fails.
 */
export class GraphEdgeError extends GraphAgentError {
  public readonly name = 'GraphEdgeError';
  public readonly edgeId?: string;
  public readonly fromNodeId: string;
  public readonly toNodeId: string;
  public readonly edgeType: EdgeType;
  public readonly conditionExpression?: string;
  public readonly transformFunction?: string;
  public readonly inputData?: any;
  
  constructor(
    fromNodeId: string,
    toNodeId: string,
    edgeType: EdgeType,
    message: string,
    context: Partial<GraphErrorContext> = {},
    edgeId?: string,
    conditionExpression?: string,
    transformFunction?: string,
    inputData?: any
  ) {
    super(
      'GRAPH_EDGE_TRAVERSAL_FAILED',
      `Edge traversal failed (${fromNodeId} -> ${toNodeId}): ${message}`,
      context,
      'error',
      true // Edge errors may be retryable
    );
    
    this.fromNodeId = fromNodeId;
    this.toNodeId = toNodeId;
    this.edgeType = edgeType;
    this.edgeId = edgeId;
    this.conditionExpression = conditionExpression;
    this.transformFunction = transformFunction;
    this.inputData = inputData;
  }
  
  public getClassification(): GraphErrorClassification {
    return {
      category: 'execution',
      type: 'edge',
      severity: this.severity,
      retryable: this.retryable,
      automated: true
    };
  }
  
  public getRecoveryStrategies(): GraphRecoveryStrategy[] {
    if (this.conditionExpression) {
      return ['skip', 'retry']; // Skip condition or retry evaluation
    }
    if (this.transformFunction) {
      return ['substitute', 'skip']; // Use alternative transform or skip
    }
    return ['retry', 'skip'];
  }
}

/**
 * Error thrown during graph configuration.
 * 
 * Occurs when graph configuration is invalid or when
 * configuration conflicts are detected.
 */
export class GraphConfigurationError extends GraphAgentError {
  public readonly name = 'GraphConfigurationError';
  public readonly configSection: string;
  public readonly configValue?: any;
  public readonly validationRules?: string[];
  
  constructor(
    configSection: string,
    message: string,
    configValue?: any,
    validationRules?: string[],
    context: Partial<GraphErrorContext> = {}
  ) {
    super(
      'GRAPH_CONFIGURATION_INVALID',
      `Invalid graph configuration (${configSection}): ${message}`,
      context,
      'error',
      false // Configuration errors are not retryable without fixing config
    );
    
    this.configSection = configSection;
    this.configValue = configValue;
    this.validationRules = validationRules;
  }
  
  public getClassification(): GraphErrorClassification {
    return {
      category: 'configuration',
      type: 'validation',
      severity: this.severity,
      retryable: false,
      automated: false
    };
  }
  
  public getRecoveryStrategies(): GraphRecoveryStrategy[] {
    return ['rollback']; // Fix configuration and retry
  }
}

// Type definitions for error context and classification

export interface GraphErrorContext {
  executionId?: string;
  graphId?: string;
  nodeId?: string;
  nodeType?: NodeType;
  edgeId?: string;
  executionState: GraphExecutionStatus | 'unknown';
  nodeCount: number;
  completedNodes: number;
  failedNodes: number;
  executionStrategy?: GraphExecutionStrategy;
  performance?: GraphPerformanceMetrics;
  checkpoint?: GraphCheckpoint;
  additionalInfo?: Record<string, any>;
}

export interface GraphErrorClassification {
  category: GraphErrorCategory;
  type: GraphErrorType;
  severity: GraphErrorSeverity;
  retryable: boolean;
  automated: boolean;
}

export type GraphErrorCategory = 
  | 'validation'
  | 'initialization'
  | 'execution'
  | 'resource'
  | 'state'
  | 'configuration'
  | 'general';

export type GraphErrorType = 
  | 'structural'
  | 'node'
  | 'edge'
  | 'timeout'
  | 'cancellation'
  | 'multiple'
  | 'inconsistency'
  | 'limit'
  | 'validation'
  | 'configuration'
  | 'execution';

export type GraphErrorSeverity = 
  | 'critical'
  | 'error'
  | 'warning'
  | 'info';

export type GraphRecoveryStrategy = 
  | 'retry'
  | 'skip'
  | 'substitute'
  | 'compensate'
  | 'rollback';

export type GraphInitializationStep = 
  | 'validation'
  | 'compilation'
  | 'resource_allocation'
  | 'dependency_resolution'
  | 'state_initialization'
  | 'executor_setup';

export type GraphCancellationSource = 
  | 'user'
  | 'system'
  | 'timeout'
  | 'resource'
  | 'error'
  | 'external';

export type GraphResourceType = 
  | 'memory'
  | 'cpu'
  | 'disk'
  | 'network'
  | 'time'
  | 'nodes'
  | 'concurrency';

export type GraphStateType = 
  | 'execution'
  | 'node'
  | 'data'
  | 'checkpoint'
  | 'configuration';

export type NodeErrorCondition = 
  | 'timeout'
  | 'resource'
  | 'network'
  | 'permission'
  | 'validation'
  | 'custom';

export interface GraphResourceRequirements {
  memory?: number;
  cpu?: number;
  disk?: number;
  network?: number;
  maxNodes?: number;
  maxConcurrency?: number;
  timeout?: number;
}

// Utility functions for error handling

/**
 * Checks if an error is a Graph Agent error.
 * 
 * @param error - Error to check
 * @returns Whether error is a Graph Agent error
 */
export function isGraphAgentError(error: any): error is GraphAgentError {
  return error instanceof GraphAgentError;
}

/**
 * Checks if an error is retryable.
 * 
 * @param error - Error to check
 * @returns Whether error is retryable
 */
export function isRetryableError(error: any): boolean {
  return isGraphAgentError(error) && error.retryable;
}

/**
 * Gets error severity level as number for comparison.
 * 
 * @param severity - Error severity
 * @returns Numeric severity level (higher = more severe)
 */
export function getSeverityLevel(severity: GraphErrorSeverity): number {
  const levels = {
    'info': 1,
    'warning': 2,
    'error': 3,
    'critical': 4
  };
  return levels[severity] || 0;
}

/**
 * Creates error context from execution state.
 * 
 * @param executionId - Execution identifier
 * @param graphId - Graph identifier
 * @param nodeId - Node identifier
 * @param additionalInfo - Additional context information
 * @returns Graph error context
 */
export function createGraphErrorContext(
  executionId?: string,
  graphId?: string,
  nodeId?: string,
  additionalInfo?: Record<string, any>
): GraphErrorContext {
  return {
    executionId,
    graphId,
    nodeId,
    executionState: 'unknown',
    nodeCount: 0,
    completedNodes: 0,
    failedNodes: 0,
    additionalInfo
  };
}

/**
 * Aggregates multiple errors into a summary.
 * 
 * @param errors - Array of errors to aggregate
 * @returns Error aggregation summary
 */
export function aggregateErrors(errors: GraphAgentError[]): GraphErrorAggregation {
  const categories: Record<GraphErrorCategory, number> = {
    validation: 0,
    initialization: 0,
    execution: 0,
    resource: 0,
    state: 0,
    configuration: 0,
    general: 0
  };
  
  const severities: Record<GraphErrorSeverity, number> = {
    critical: 0,
    error: 0,
    warning: 0,
    info: 0
  };
  
  let retryableCount = 0;
  let automatedCount = 0;
  
  for (const error of errors) {
    const classification = error.getClassification();
    categories[classification.category]++;
    severities[classification.severity]++;
    
    if (classification.retryable) retryableCount++;
    if (classification.automated) automatedCount++;
  }
  
  const mostSevere = errors.reduce((most, current) => 
    getSeverityLevel(current.severity) > getSeverityLevel(most.severity) ? current : most
  );
  
  return {
    totalErrors: errors.length,
    categories,
    severities,
    retryableCount,
    automatedCount,
    mostSevereError: mostSevere,
    timeline: errors.map(error => ({
      timestamp: error.timestamp,
      code: error.code,
      severity: error.severity
    }))
  };
}

export interface GraphErrorAggregation {
  totalErrors: number;
  categories: Record<GraphErrorCategory, number>;
  severities: Record<GraphErrorSeverity, number>;
  retryableCount: number;
  automatedCount: number;
  mostSevereError: GraphAgentError;
  timeline: Array<{
    timestamp: Date;
    code: string;
    severity: GraphErrorSeverity;
  }>;
}

/**
 * Error recovery suggestion system.
 */
export class GraphErrorRecovery {
  /**
   * Suggests recovery strategies for an error.
   * 
   * @param error - Error to analyze
   * @param context - Current execution context
   * @returns Recovery suggestions
   */
  static suggestRecovery(error: GraphAgentError, context?: any): GraphRecoverySuggestion[] {
    const strategies = error.getRecoveryStrategies();
    const suggestions: GraphRecoverySuggestion[] = [];
    
    for (const strategy of strategies) {
      suggestions.push({
        strategy,
        confidence: this.calculateConfidence(error, strategy, context),
        description: this.getStrategyDescription(strategy),
        requirements: this.getStrategyRequirements(strategy),
        estimatedCost: this.estimateCost(strategy, error)
      });
    }
    
    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }
  
  private static calculateConfidence(
    error: GraphAgentError, 
    strategy: GraphRecoveryStrategy, 
    context?: any
  ): number {
    let confidence = 0.5; // Base confidence
    
    if (error instanceof NodeExecutionError && strategy === 'retry') {
      confidence = error.retryCount < error.maxRetries ? 0.8 : 0.2;
    } else if (error instanceof GraphTimeoutError && strategy === 'retry') {
      confidence = 0.7;
    } else if (error instanceof GraphResourceError && strategy === 'compensate') {
      confidence = 0.6;
    }
    
    return Math.min(1.0, Math.max(0.0, confidence));
  }
  
  private static getStrategyDescription(strategy: GraphRecoveryStrategy): string {
    const descriptions = {
      retry: 'Retry the failed operation with the same parameters',
      skip: 'Skip the failed node and continue with dependent nodes',
      substitute: 'Replace the failed node with an alternative implementation',
      compensate: 'Execute compensating actions to handle the failure',
      rollback: 'Revert to a previous checkpoint and retry from there'
    };
    return descriptions[strategy];
  }
  
  private static getStrategyRequirements(strategy: GraphRecoveryStrategy): string[] {
    const requirements = {
      retry: ['Available retries', 'No permanent failure'],
      skip: ['Non-critical node', 'Alternative execution path'],
      substitute: ['Alternative node implementation', 'Compatible interface'],
      compensate: ['Compensation logic defined', 'Reversible operations'],
      rollback: ['Valid checkpoint available', 'Rollback capability']
    };
    return requirements[strategy] || [];
  }
  
  private static estimateCost(strategy: GraphRecoveryStrategy, error: GraphAgentError): RecoveryCost {
    // Simple cost estimation - can be made more sophisticated
    const baseCosts = {
      retry: 'low',
      skip: 'very_low',
      substitute: 'medium',
      compensate: 'high',
      rollback: 'medium'
    } as const;
    
    return baseCosts[strategy] || 'medium';
  }
}

export interface GraphRecoverySuggestion {
  strategy: GraphRecoveryStrategy;
  confidence: number;
  description: string;
  requirements: string[];
  estimatedCost: RecoveryCost;
}

export type RecoveryCost = 
  | 'very_low'
  | 'low'
  | 'medium'
  | 'high'
  | 'very_high';

/**
 * Error reporting and analysis utilities.
 */
export const GRAPH_ERROR_RECOVERY_SUGGESTIONS = {
  VALIDATION_FAILED: [
    'Check graph structure for cycles',
    'Verify all nodes have valid connections',
    'Validate node configurations against schemas',
    'Check for missing required properties'
  ],
  NODE_EXECUTION_FAILED: [
    'Check node input data format',
    'Verify node configuration is correct',
    'Ensure required resources are available',
    'Review node implementation for bugs'
  ],
  TIMEOUT: [
    'Increase execution timeout',
    'Optimize node execution performance',
    'Consider parallel execution strategy',
    'Split large nodes into smaller ones'
  ],
  RESOURCE_EXCEEDED: [
    'Increase resource limits',
    'Optimize resource usage in nodes',
    'Implement resource cleanup',
    'Use more efficient algorithms'
  ]
};

/**
 * Sanitizes error for logging or external reporting.
 * 
 * Removes sensitive information while preserving debugging context.
 */
export function sanitizeGraphError(error: GraphAgentError): Record<string, any> {
  const sanitized = error.toJSON();
  
  // Remove potentially sensitive data
  if (sanitized.context?.additionalInfo) {
    delete sanitized.context.additionalInfo.secrets;
    delete sanitized.context.additionalInfo.credentials;
    delete sanitized.context.additionalInfo.tokens;
  }
  
  // Limit stack trace length for external reporting
  if (sanitized.stack && sanitized.stack.length > 1000) {
    sanitized.stack = sanitized.stack.substring(0, 1000) + '... (truncated)';
  }
  
  return sanitized;
}