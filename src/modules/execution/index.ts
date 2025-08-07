/**
 * @fileoverview Public API exports for the Execution Manager Module
 * @module modules/execution
 * @requires ./types
 * @requires ./errors
 * @requires ./execution-manager
 * @requires ./factory
 * @requires ./workflow-engine
 * @requires ./execution-context
 * 
 * This file provides the main public API for the Execution Manager Module, exporting
 * all interfaces, types, classes, and factory functions needed by consumers.
 * 
 * The Execution Manager Module provides comprehensive workflow orchestration for AI agent
 * applications including graph-based execution, dependency resolution, human-in-the-loop
 * workflows, state persistence, and real-time streaming capabilities.
 * 
 * @example
 * ```typescript
 * import { createExecutionManager, ExecutionManagerConfig } from '@/modules/execution';
 * 
 * // Create and initialize module
 * const executionManager = createExecutionManager({
 *   maxConcurrentExecutions: 10,
 *   parallelExecution: {
 *     enabled: true,
 *     maxParallelNodes: 5
 *   },
 *   statePersistence: {
 *     enabled: true,
 *     storage: 'memory'
 *   },
 *   humanInteractionTimeout: 300000
 * });
 * 
 * await executionManager.initialize(config);
 * 
 * // Execute workflow
 * const result = await executionManager.executeWorkflow(workflow, {
 *   sessionId: 'sess-123',
 *   input: { data: 'Process this workflow' }
 * });
 * 
 * // Execute with streaming
 * const streamer = streamingManager.getStreamer('sess-123');
 * const streamResult = await executionManager.executeWorkflowStreaming(
 *   workflow,
 *   { sessionId: 'sess-123', input: data },
 *   streamer
 * );
 * ```
 * 
 * @since 1.0.0
 */

// Core interfaces and types
export type {
  IExecutionManager,
  ExecutionManagerConfig,
  AgentWorkflow,
  WorkflowNode,
  WorkflowEdge,
  NodeData,
  ExecutionState,
  ExecutionStatus,
  WaitingNode,
  WorkflowInput,
  ExecutionOptions,
  ExecutionResult,
  HumanInteraction,
  HumanPromptOptions,
  ExecutionError as ExecutionErrorType,
  ValidationResult,
  ExecutionSummary,
  ExecutionDetails,
  WorkflowProgress,
  IStreamer,
  RetryPolicy,
  EdgeCondition,
  DataTransform,
  Variable,
  WorkflowSettings,
  ExecutionContext
} from './types';

// Error classes
export {
  ExecutionError,
  WorkflowValidationError,
  NodeExecutionError,
  ExecutionTimeoutError,
  HumanInteractionError,
  StatePersistenceError,
  DependencyResolutionError,
  AgentAvailabilityError,
  ResourceConstraintError,
  DataTransformationError,
  ConditionEvaluationError,
  ExecutionContextError,
  StreamingError,
  isExecutionError,
  createExecutionErrorContext,
  ExecutionErrorSeverity,
  getExecutionErrorSeverity,
  mapExecutionErrorToHttpStatus,
  sanitizeErrorForClient,
  ERROR_RECOVERY_SUGGESTIONS
} from './errors';

// Main module implementation
export { ExecutionManager } from './execution-manager';

// Factory functions
export {
  createExecutionManager,
  createTestExecutionManager
} from './factory';

// Advanced components (for specialized use cases)
export { WorkflowExecutionEngine } from './workflow-engine';
export { 
  ExecutionContextManager, 
  type ExecutionContextManagerConfig,
  type ContextStatistics
} from './execution-context';

// Re-export commonly used types from registry for convenience
export type { HealthStatus } from '../registry/types';

/**
 * Module metadata and version information.
 */
export const MODULE_INFO = {
  name: 'Execution Manager',
  version: '1.0.0',
  description: 'Comprehensive workflow orchestration with graph-based execution and human-in-the-loop support',
  author: 'AgentHub Team',
  dependencies: ['memory-module', 'streaming-manager (optional)', 'agent-registry'],
  capabilities: [
    'workflow_orchestration',
    'graph_based_execution',
    'dependency_resolution',
    'parallel_execution',
    'human_in_the_loop',
    'state_persistence',
    'pause_resume_functionality',
    'real_time_streaming',
    'error_recovery',
    'workflow_validation',
    'execution_history',
    'resource_management',
    'concurrent_execution_limits',
    'timeout_handling',
    'retry_policies'
  ]
} as const;

/**
 * Supported workflow execution statuses.
 */
export const EXECUTION_STATUSES = {
  PENDING: 'PENDING',
  RUNNING: 'RUNNING',
  PAUSED: 'PAUSED',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  TERMINATED: 'TERMINATED',
  TIMEOUT: 'TIMEOUT',
  WAITING_FOR_HUMAN: 'WAITING_FOR_HUMAN'
} as const;

/**
 * Human interaction types for workflow approvals.
 */
export const HUMAN_INTERACTION_TYPES = {
  APPROVAL: 'approval',
  INPUT: 'input',
  CHOICE: 'choice',
  CONFIRMATION: 'confirmation'
} as const;

/**
 * Supported storage types for state persistence.
 */
export const STORAGE_TYPES = {
  MEMORY: 'memory',
  DATABASE: 'database',
  REDIS: 'redis'
} as const;

/**
 * Default configuration templates for common use cases.
 * 
 * These templates provide pre-configured setups for typical
 * execution management scenarios.
 */
export const DEFAULT_CONFIGS = {
  /** Minimal configuration for development */
  DEVELOPMENT: {
    maxConcurrentExecutions: 5,
    defaultTimeout: 60000,
    parallelExecution: {
      enabled: true,
      maxParallelNodes: 3
    },
    statePersistence: {
      enabled: true,
      saveInterval: 5000,
      storage: 'memory' as const
    },
    errorRecovery: {
      autoRetry: true,
      retryDelay: 2000,
      maxRetryAttempts: 2
    }
  },
  
  /** Production configuration with high performance settings */
  PRODUCTION: {
    maxConcurrentExecutions: 20,
    defaultTimeout: 600000,
    parallelExecution: {
      enabled: true,
      maxParallelNodes: 10
    },
    statePersistence: {
      enabled: true,
      saveInterval: 15000,
      storage: 'database' as const
    },
    errorRecovery: {
      autoRetry: true,
      retryDelay: 5000,
      maxRetryAttempts: 3
    },
    humanInteractionTimeout: 1800000
  },
  
  /** Test configuration with minimal settings */
  TEST: {
    maxConcurrentExecutions: 1,
    defaultTimeout: 5000,
    parallelExecution: {
      enabled: false,
      maxParallelNodes: 1
    },
    statePersistence: {
      enabled: false,
      storage: 'memory' as const
    },
    errorRecovery: {
      autoRetry: false,
      retryDelay: 100,
      maxRetryAttempts: 1
    },
    humanInteractionTimeout: 1000
  }
} as const;

/**
 * Utility functions for common execution operations.
 */
export const EXECUTION_UTILS = {
  /**
   * Generates a unique execution ID.
   * 
   * @param prefix - Optional prefix for the ID
   * @returns Unique execution identifier
   */
  generateExecutionId(prefix: string = 'exec'): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  },
  
  /**
   * Generates a unique workflow ID.
   * 
   * @param prefix - Optional prefix for the ID
   * @returns Unique workflow identifier
   */
  generateWorkflowId(prefix: string = 'workflow'): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  },
  
  /**
   * Validates workflow node structure.
   * 
   * @param node - Workflow node to validate
   * @returns True if valid, throws error if invalid
   */
  validateWorkflowNode(node: any): boolean {
    if (!node.id || typeof node.id !== 'string') {
      throw new Error('Workflow node must have a valid string ID');
    }
    
    if (!node.type || typeof node.type !== 'string') {
      throw new Error('Workflow node must have a valid string type');
    }
    
    if (!node.name || typeof node.name !== 'string') {
      throw new Error('Workflow node must have a valid string name');
    }
    
    if (!node.position || typeof node.position.x !== 'number' || typeof node.position.y !== 'number') {
      throw new Error('Workflow node must have valid numeric position coordinates');
    }
    
    return true;
  },
  
  /**
   * Validates workflow edge structure.
   * 
   * @param edge - Workflow edge to validate
   * @returns True if valid, throws error if invalid
   */
  validateWorkflowEdge(edge: any): boolean {
    if (!edge.id || typeof edge.id !== 'string') {
      throw new Error('Workflow edge must have a valid string ID');
    }
    
    if (!edge.source || typeof edge.source !== 'string') {
      throw new Error('Workflow edge must have a valid string source');
    }
    
    if (!edge.target || typeof edge.target !== 'string') {
      throw new Error('Workflow edge must have a valid string target');
    }
    
    return true;
  },
  
  /**
   * Calculates execution progress percentage.
   * 
   * @param completedNodes - Number of completed nodes
   * @param totalNodes - Total number of nodes
   * @returns Progress percentage (0-100)
   */
  calculateProgress(completedNodes: number, totalNodes: number): number {
    if (totalNodes === 0) return 0;
    return Math.round((completedNodes / totalNodes) * 100 * 100) / 100; // Round to 2 decimal places
  },
  
  /**
   * Estimates execution time remaining.
   * 
   * @param startTime - Execution start time
   * @param completedNodes - Number of completed nodes
   * @param totalNodes - Total number of nodes
   * @returns Estimated time remaining in milliseconds
   */
  estimateTimeRemaining(startTime: Date, completedNodes: number, totalNodes: number): number | undefined {
    if (completedNodes === 0 || totalNodes === 0) return undefined;
    
    const elapsedTime = Date.now() - startTime.getTime();
    const avgTimePerNode = elapsedTime / completedNodes;
    const remainingNodes = totalNodes - completedNodes;
    
    return Math.round(avgTimePerNode * remainingNodes);
  },
  
  /**
   * Formats execution duration for display.
   * 
   * @param durationMs - Duration in milliseconds
   * @returns Formatted duration string
   */
  formatDuration(durationMs: number): string {
    const seconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }
} as const;

/**
 * Best practice recommendations for using the Execution Manager.
 */
export const BEST_PRACTICES = {
  WORKFLOW_DESIGN: [
    'Design workflows as directed acyclic graphs (DAGs) to avoid infinite loops',
    'Use meaningful node names and descriptions for better debugging',
    'Implement proper error handling and retry policies for critical nodes',
    'Consider breaking large workflows into smaller, reusable components',
    'Use conditional edges to implement complex business logic flows'
  ],
  
  EXECUTION_MANAGEMENT: [
    'Set appropriate timeouts based on expected node execution times',
    'Configure concurrent execution limits based on available resources',
    'Enable state persistence for long-running workflows',
    'Monitor execution progress and implement proper logging',
    'Use human-in-the-loop interactions for critical decision points'
  ],
  
  PERFORMANCE: [
    'Enable parallel execution for independent nodes to improve performance',
    'Set reasonable save intervals for state persistence to balance performance and recovery',
    'Monitor memory usage and implement proper cleanup for completed executions',
    'Use streaming for real-time progress updates in user interfaces',
    'Implement proper error recovery and retry mechanisms'
  ],
  
  HUMAN_INTERACTION: [
    'Set appropriate timeouts for human interactions to prevent indefinite waits',
    'Provide clear and actionable prompts for human input requirements',
    'Implement fallback mechanisms for timed-out human interactions',
    'Use choice-based interactions when possible to reduce input errors',
    'Log all human interactions for audit and debugging purposes'
  ],
  
  ERROR_HANDLING: [
    'Implement comprehensive error handling at both node and workflow levels',
    'Use typed error classes for better error categorization and handling',
    'Configure automatic retry policies for transient failures',
    'Implement proper error logging and monitoring for production environments',
    'Provide meaningful error messages and recovery suggestions'
  ],
  
  SECURITY: [
    'Validate all workflow definitions before execution',
    'Implement proper access controls for workflow execution permissions',
    'Sanitize user inputs and node outputs to prevent injection attacks',
    'Use secure storage for sensitive workflow data and state information',
    'Implement audit logging for all execution activities'
  ]
} as const;

/**
 * Common workflow patterns and templates.
 */
export const WORKFLOW_PATTERNS = {
  /**
   * Simple sequential workflow pattern.
   */
  SEQUENTIAL: {
    description: 'Executes nodes in a linear sequence',
    useCase: 'Data processing pipelines, step-by-step procedures',
    example: 'Extract → Transform → Load'
  },
  
  /**
   * Parallel execution pattern.
   */
  PARALLEL: {
    description: 'Executes multiple nodes concurrently',
    useCase: 'Independent data processing, parallel analysis',
    example: 'Multiple data sources processed simultaneously'
  },
  
  /**
   * Conditional branching pattern.
   */
  CONDITIONAL: {
    description: 'Branches execution based on conditions',
    useCase: 'Decision trees, conditional logic flows',
    example: 'Different processing paths based on data type'
  },
  
  /**
   * Human-in-the-loop pattern.
   */
  HUMAN_APPROVAL: {
    description: 'Requires human approval at specific points',
    useCase: 'Critical decisions, quality control, compliance',
    example: 'Manual review before data publication'
  },
  
  /**
   * Map-reduce pattern.
   */
  MAP_REDUCE: {
    description: 'Processes data in parallel then aggregates results',
    useCase: 'Large-scale data processing, distributed computation',
    example: 'Process multiple files then combine results'
  },
  
  /**
   * Error recovery pattern.
   */
  ERROR_RECOVERY: {
    description: 'Implements fallback and recovery mechanisms',
    useCase: 'Robust workflows with multiple fallback options',
    example: 'Primary service failure triggers backup processing'
  }
} as const;