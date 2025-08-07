/**
 * @fileoverview Comprehensive unit tests for Graph Agent error handling system
 * @module agents/graph/__tests__/errors.test
 * 
 * This file provides exhaustive unit tests for all Graph Agent error classes,
 * utility functions, and recovery mechanisms. Tests cover error construction,
 * serialization, classification, recovery strategies, and error aggregation.
 * 
 * Test categories:
 * - Base GraphAgentError class functionality
 * - Specialized error classes (validation, execution, timeout, etc.)
 * - Error classification and categorization
 * - Recovery strategy recommendations
 * - Error aggregation and analysis
 * - Utility functions and type guards
 * - Error sanitization and reporting
 * - Error recovery suggestion system
 * 
 * @since 1.0.0
 */

import {
  GraphAgentError,
  GraphValidationError,
  GraphInitializationError,
  NodeExecutionError,
  GraphTimeoutError,
  GraphCancellationError,
  GraphResourceError,
  GraphMultipleNodeError,
  GraphStateError,
  GraphEdgeError,
  GraphConfigurationError,
  GraphErrorRecovery,
  isGraphAgentError,
  isRetryableError,
  getSeverityLevel,
  createGraphErrorContext,
  aggregateErrors,
  sanitizeGraphError,
  GRAPH_ERROR_RECOVERY_SUGGESTIONS,
  type GraphErrorContext,
  type GraphErrorClassification,
  type GraphRecoverySuggestion,
  type GraphErrorAggregation,
  type GraphErrorSeverity,
  type GraphErrorCategory,
  type GraphErrorType,
  type GraphRecoveryStrategy,
  type GraphInitializationStep,
  type GraphCancellationSource,
  type GraphResourceType,
  type GraphStateType,
  type NodeErrorCondition,
  type RecoveryCost
} from '../errors';
import {
  NodeType,
  EdgeType,
  GraphExecutionStatus,
  GraphExecutionStrategy,
  GraphValidationError as IGraphValidationError,
  GraphValidationWarning,
  ExecutionStep,
  GraphPerformanceMetrics,
  GraphResourceUtilization,
  GraphCheckpoint
} from '../types';

describe('Graph Agent Errors - Base Error Classes', () => {
  describe('GraphAgentError', () => {
    it('should create basic error with required parameters', () => {
      const error = new GraphAgentError('TEST_ERROR', 'Test message');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(GraphAgentError);
      expect(error.name).toBe('GraphAgentError');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.message).toBe('Test message');
      expect(error.timestamp).toBeInstanceOf(Date);
      expect(error.severity).toBe('error');
      expect(error.retryable).toBe(false);
      expect(error.cause).toBeUndefined();
    });

    it('should create error with complete context', () => {
      const context: GraphErrorContext = {
        executionId: 'exec-123',
        graphId: 'graph-456',
        nodeId: 'node-789',
        nodeType: 'agent',
        executionState: 'running',
        nodeCount: 10,
        completedNodes: 5,
        failedNodes: 1,
        executionStrategy: 'parallel',
        additionalInfo: { custom: 'data' }
      };

      const causeError = new Error('Root cause');
      const error = new GraphAgentError(
        'COMPLEX_ERROR',
        'Complex error message',
        context,
        'critical',
        true,
        causeError
      );

      expect(error.code).toBe('COMPLEX_ERROR');
      expect(error.executionId).toBe('exec-123');
      expect(error.graphId).toBe('graph-456');
      expect(error.context.nodeId).toBe('node-789');
      expect(error.context.nodeType).toBe('agent');
      expect(error.context.executionState).toBe('running');
      expect(error.context.additionalInfo?.custom).toBe('data');
      expect(error.severity).toBe('critical');
      expect(error.retryable).toBe(true);
      expect(error.cause).toBe(causeError);
    });

    it('should provide JSON serialization', () => {
      const context: Partial<GraphErrorContext> = {
        executionId: 'exec-123',
        graphId: 'graph-456'
      };
      
      const error = new GraphAgentError(
        'JSON_TEST',
        'JSON test message',
        context,
        'warning',
        true
      );

      const json = error.toJSON();

      expect(json.name).toBe('GraphAgentError');
      expect(json.code).toBe('JSON_TEST');
      expect(json.message).toBe('JSON test message');
      expect(json.executionId).toBe('exec-123');
      expect(json.graphId).toBe('graph-456');
      expect(json.severity).toBe('warning');
      expect(json.retryable).toBe(true);
      expect(json.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(json.stack).toBeDefined();
    });

    it('should provide error classification', () => {
      const error = new GraphAgentError('CLASSIFY_TEST', 'Classification test');
      const classification = error.getClassification();

      expect(classification.category).toBe('general');
      expect(classification.type).toBe('execution');
      expect(classification.severity).toBe('error');
      expect(classification.retryable).toBe(false);
      expect(classification.automated).toBe(false);
    });

    it('should suggest recovery strategies', () => {
      const retryableError = new GraphAgentError('RETRY_TEST', 'Retryable error', {}, 'error', true);
      const nonRetryableError = new GraphAgentError('NO_RETRY_TEST', 'Non-retryable error', {}, 'error', false);

      const retryableStrategies = retryableError.getRecoveryStrategies();
      const nonRetryableStrategies = nonRetryableError.getRecoveryStrategies();

      expect(retryableStrategies).toContain('retry');
      expect(retryableStrategies).toContain('skip');
      expect(nonRetryableStrategies).toContain('skip');
      expect(nonRetryableStrategies).toContain('compensate');
      expect(nonRetryableStrategies).not.toContain('retry');
    });
  });
});

describe('Graph Agent Errors - Specialized Error Classes', () => {
  describe('GraphValidationError', () => {
    it('should create validation error with validation details', () => {
      const validationErrors: IGraphValidationError[] = [
        {
          code: 'CYCLE_DETECTED',
          message: 'Graph contains cycle',
          nodeId: 'node-1',
          severity: 'error'
        },
        {
          code: 'MISSING_NODE',
          message: 'Referenced node not found',
          edgeId: 'edge-1',
          severity: 'error'
        }
      ];

      const warnings: GraphValidationWarning[] = [
        {
          code: 'UNUSED_NODE',
          message: 'Node has no connections',
          nodeId: 'node-2'
        }
      ];

      const graphDefinition = { id: 'test-graph', nodes: [], edges: [] };

      const error = new GraphValidationError(
        'Graph validation failed with 2 errors',
        validationErrors,
        warnings,
        { graphId: 'test-graph' },
        graphDefinition
      );

      expect(error.name).toBe('GraphValidationError');
      expect(error.code).toBe('GRAPH_VALIDATION_FAILED');
      expect(error.validationErrors).toHaveLength(2);
      expect(error.warnings).toHaveLength(1);
      expect(error.graphDefinition).toBe(graphDefinition);
      expect(error.retryable).toBe(false);
    });

    it('should get most critical validation error', () => {
      const validationErrors: IGraphValidationError[] = [
        {
          code: 'WARNING_ERROR',
          message: 'Warning level error',
          severity: 'warning'
        },
        {
          code: 'CRITICAL_ERROR',
          message: 'Critical error',
          severity: 'error'
        }
      ];

      const error = new GraphValidationError(
        'Multiple validation errors',
        validationErrors
      );

      const criticalError = error.getMostCriticalError();
      expect(criticalError?.code).toBe('CRITICAL_ERROR');
    });

    it('should provide validation-specific classification', () => {
      const error = new GraphValidationError('Validation failed', []);
      const classification = error.getClassification();

      expect(classification.category).toBe('validation');
      expect(classification.type).toBe('structural');
      expect(classification.retryable).toBe(false);
      expect(classification.automated).toBe(false);
    });
  });

  describe('GraphInitializationError', () => {
    it('should create initialization error with step details', () => {
      const resourceRequirements = {
        memory: 1024,
        cpu: 2,
        maxNodes: 100
      };

      const missingDependencies = ['redis', 'postgresql'];

      const error = new GraphInitializationError(
        'Failed to allocate resources',
        'resource_allocation',
        { executionId: 'exec-123' },
        resourceRequirements,
        missingDependencies
      );

      expect(error.name).toBe('GraphInitializationError');
      expect(error.code).toBe('GRAPH_INITIALIZATION_FAILED');
      expect(error.initializationStep).toBe('resource_allocation');
      expect(error.resourceRequirements).toBe(resourceRequirements);
      expect(error.missingDependencies).toEqual(missingDependencies);
      expect(error.retryable).toBe(true);
    });

    it('should suggest appropriate recovery strategies', () => {
      const errorWithDependencies = new GraphInitializationError(
        'Missing dependencies',
        'dependency_resolution',
        {},
        undefined,
        ['redis']
      );

      const errorWithResources = new GraphInitializationError(
        'Resource allocation failed',
        'resource_allocation',
        {},
        { memory: 1024 }
      );

      const errorGeneral = new GraphInitializationError(
        'General initialization error',
        'state_initialization'
      );

      expect(errorWithDependencies.getRecoveryStrategies()).toEqual(['retry']);
      expect(errorWithResources.getRecoveryStrategies()).toEqual(['retry', 'substitute']);
      expect(errorGeneral.getRecoveryStrategies()).toEqual(['retry', 'rollback']);
    });
  });

  describe('NodeExecutionError', () => {
    it('should create node execution error with complete context', () => {
      const executionStep: ExecutionStep = {
        id: 'step-1',
        type: 'node_start',
        nodeId: 'agent-node',
        timestamp: new Date(),
        status: 'failed',
        metadata: {}
      };

      const nodeInput = { text: 'input data' };
      const nodeOutput = { result: 'partial output' };
      const causeError = new Error('Agent execution failed');

      const error = new NodeExecutionError(
        'agent-node',
        'agent',
        'Agent execution timeout',
        { executionId: 'exec-123' },
        2,
        3,
        nodeInput,
        nodeOutput,
        executionStep,
        causeError
      );

      expect(error.name).toBe('NodeExecutionError');
      expect(error.nodeId).toBe('agent-node');
      expect(error.nodeType).toBe('agent');
      expect(error.retryCount).toBe(2);
      expect(error.maxRetries).toBe(3);
      expect(error.nodeInput).toBe(nodeInput);
      expect(error.nodeOutput).toBe(nodeOutput);
      expect(error.executionStep).toBe(executionStep);
      expect(error.retryable).toBe(true); // 2 < 3
      expect(error.lastRetryAt).toBeInstanceOf(Date);
    });

    it('should check error conditions correctly', () => {
      const timeoutError = new NodeExecutionError('node-1', 'agent', 'Operation timeout exceeded');
      const resourceError = new NodeExecutionError('node-2', 'tool', 'Insufficient memory available');
      const networkError = new NodeExecutionError('node-3', 'transform', 'Network connection failed');
      const permissionError = new NodeExecutionError('node-4', 'agent', 'Access permission denied');
      const validationError = new NodeExecutionError('node-5', 'tool', 'Invalid input data format');

      expect(timeoutError.isCondition('timeout')).toBe(true);
      expect(resourceError.isCondition('resource')).toBe(true);
      expect(networkError.isCondition('network')).toBe(true);
      expect(permissionError.isCondition('permission')).toBe(true);
      expect(validationError.isCondition('validation')).toBe(true);

      expect(timeoutError.isCondition('resource')).toBe(false);
      expect(resourceError.isCondition('network')).toBe(false);
    });

    it('should provide node-specific recovery strategies', () => {
      const agentError = new NodeExecutionError('agent-1', 'agent', 'Agent failed');
      const toolError = new NodeExecutionError('tool-1', 'tool', 'Tool failed');
      const transformError = new NodeExecutionError('transform-1', 'transform', 'Transform failed');
      const customError = new NodeExecutionError('custom-1', 'custom', 'Custom failed');

      expect(agentError.getRecoveryStrategies()).toContain('substitute');
      expect(agentError.getRecoveryStrategies()).toContain('compensate');

      expect(toolError.getRecoveryStrategies()).toContain('substitute');
      expect(toolError.getRecoveryStrategies()).toContain('skip');

      expect(transformError.getRecoveryStrategies()).toContain('skip');
      expect(transformError.getRecoveryStrategies()).toContain('substitute');

      expect(customError.getRecoveryStrategies()).toContain('skip');
    });
  });

  describe('GraphTimeoutError', () => {
    it('should create timeout error with execution state', () => {
      const activeNodes = ['node-1', 'node-2'];
      const completedNodes = ['node-3', 'node-4', 'node-5'];
      const pendingNodes = ['node-6', 'node-7'];

      const error = new GraphTimeoutError(
        30000, // 30 seconds
        activeNodes,
        completedNodes,
        pendingNodes,
        0.7, // 70% progress
        { executionId: 'exec-timeout' }
      );

      expect(error.name).toBe('GraphTimeoutError');
      expect(error.code).toBe('GRAPH_EXECUTION_TIMEOUT');
      expect(error.timeoutDuration).toBe(30000);
      expect(error.activeNodes).toEqual(activeNodes);
      expect(error.completedNodes).toEqual(completedNodes);
      expect(error.pendingNodes).toEqual(pendingNodes);
      expect(error.executionProgress).toBe(0.7);
      expect(error.retryable).toBe(true);
      expect(error.message).toContain('30000ms');
      expect(error.message).toContain('70%');
    });

    it('should provide timeout-specific recovery strategies', () => {
      const error = new GraphTimeoutError(10000, [], [], [], 0.5);
      const strategies = error.getRecoveryStrategies();

      expect(strategies).toContain('retry');
      expect(strategies).toContain('compensate');
    });
  });

  describe('GraphCancellationError', () => {
    it('should create cancellation error with source details', () => {
      const activeNodes = ['node-1'];
      const completedNodes = ['node-2', 'node-3'];

      const error = new GraphCancellationError(
        'user',
        'User requested cancellation',
        activeNodes,
        completedNodes,
        { executionId: 'exec-cancel' }
      );

      expect(error.name).toBe('GraphCancellationError');
      expect(error.code).toBe('GRAPH_EXECUTION_CANCELLED');
      expect(error.cancellationSource).toBe('user');
      expect(error.reason).toBe('User requested cancellation');
      expect(error.activeNodes).toEqual(activeNodes);
      expect(error.completedNodes).toEqual(completedNodes);
      expect(error.severity).toBe('warning');
      expect(error.retryable).toBe(false);
    });

    it('should provide no recovery strategies for cancellation', () => {
      const error = new GraphCancellationError('system', 'System shutdown', [], []);
      const strategies = error.getRecoveryStrategies();

      expect(strategies).toHaveLength(0);
    });
  });

  describe('GraphResourceError', () => {
    it('should create resource error with usage details', () => {
      const utilizationHistory: GraphResourceUtilization[] = [
        {
          cpu: 0.8,
          memory: 0.9,
          disk: 0.5,
          network: 0.3,
          concurrentNodes: 10
        }
      ];

      const error = new GraphResourceError(
        'memory',
        2048,
        1024,
        { executionId: 'exec-resource' },
        utilizationHistory
      );

      expect(error.name).toBe('GraphResourceError');
      expect(error.code).toBe('GRAPH_RESOURCE_EXCEEDED');
      expect(error.resourceType).toBe('memory');
      expect(error.currentUsage).toBe(2048);
      expect(error.limit).toBe(1024);
      expect(error.utilizationHistory).toBe(utilizationHistory);
      expect(error.retryable).toBe(true);
    });

    it('should calculate utilization percentage correctly', () => {
      const error = new GraphResourceError('cpu', 75, 100);
      expect(error.getUtilizationPercentage()).toBe(75);

      const overError = new GraphResourceError('memory', 150, 100);
      expect(overError.getUtilizationPercentage()).toBe(150);
    });
  });

  describe('GraphMultipleNodeError', () => {
    it('should aggregate multiple node errors', () => {
      const nodeErrors = [
        new NodeExecutionError('node-1', 'agent', 'Agent failed'),
        new NodeExecutionError('node-2', 'tool', 'Tool failed', {}, 0, 3),
        new NodeExecutionError('node-3', 'agent', 'Another agent failed')
      ];

      const error = new GraphMultipleNodeError(nodeErrors, { executionId: 'exec-multi' });

      expect(error.name).toBe('GraphMultipleNodeError');
      expect(error.code).toBe('GRAPH_MULTIPLE_NODE_FAILURES');
      expect(error.nodeErrors).toHaveLength(3);
      expect(error.failedNodeIds).toEqual(['node-1', 'node-2', 'node-3']);
      expect(error.errorSummary['NODE_EXECUTION_FAILED']).toBe(3);
      expect(error.retryable).toBe(true); // node-2 is retryable
    });

    it('should get most severe error', () => {
      const nodeErrors = [
        new NodeExecutionError('node-1', 'agent', 'Warning error', {}, 0, 3),
        new NodeExecutionError('node-2', 'tool', 'Critical error', {}, 0, 3)
      ];

      // Set different severities
      (nodeErrors[0] as any).severity = 'warning';
      (nodeErrors[1] as any).severity = 'critical';

      const error = new GraphMultipleNodeError(nodeErrors);
      const mostSevere = error.getMostSevereError();

      expect(mostSevere.nodeId).toBe('node-2');
    });

    it('should group errors by node type', () => {
      const nodeErrors = [
        new NodeExecutionError('node-1', 'agent', 'Agent error 1'),
        new NodeExecutionError('node-2', 'agent', 'Agent error 2'),
        new NodeExecutionError('node-3', 'tool', 'Tool error'),
        new NodeExecutionError('node-4', 'transform', 'Transform error')
      ];

      const error = new GraphMultipleNodeError(nodeErrors);
      const groupedErrors = error.getErrorsByNodeType();

      expect(groupedErrors.agent).toHaveLength(2);
      expect(groupedErrors.tool).toHaveLength(1);
      expect(groupedErrors.transform).toHaveLength(1);
      expect(groupedErrors.agent[0].nodeId).toBe('node-1');
      expect(groupedErrors.agent[1].nodeId).toBe('node-2');
    });
  });

  describe('GraphStateError', () => {
    it('should create state error with checkpoint', () => {
      const checkpoint: GraphCheckpoint = {
        id: 'checkpoint-1',
        timestamp: new Date(),
        executionState: {
          executionId: 'exec-123',
          status: 'running',
          completedNodes: new Set(['node-1']),
          executingNodes: new Set(['node-2']),
          pendingNodes: new Set(['node-3']),
          failedNodes: new Set(),
          nodeResults: new Map(),
          dataState: {},
          context: {} as any,
          startTime: new Date(),
          currentTime: new Date(),
          progress: {
            percentage: 0.5,
            completedNodes: 1,
            totalNodes: 3,
            currentPhase: 'execution',
            estimatedTimeRemaining: 5000,
            throughputNodes: 0.2
          }
        },
        dataSnapshot: { key: 'value' },
        metadata: {}
      };

      const error = new GraphStateError(
        'execution',
        'Execution state mismatch',
        { executionId: 'exec-123' },
        'expected_state',
        'actual_state',
        checkpoint
      );

      expect(error.name).toBe('GraphStateError');
      expect(error.code).toBe('GRAPH_STATE_INCONSISTENT');
      expect(error.stateType).toBe('execution');
      expect(error.expectedState).toBe('expected_state');
      expect(error.actualState).toBe('actual_state');
      expect(error.checkpoint).toBe(checkpoint);
      expect(error.retryable).toBe(true);
    });

    it('should provide checkpoint-based recovery strategies', () => {
      const withCheckpoint = new GraphStateError(
        'data',
        'Data corruption',
        {},
        undefined,
        undefined,
        {} as GraphCheckpoint
      );

      const withoutCheckpoint = new GraphStateError(
        'node',
        'Node state invalid'
      );

      expect(withCheckpoint.getRecoveryStrategies()).toEqual(['rollback', 'retry']);
      expect(withoutCheckpoint.getRecoveryStrategies()).toEqual(['compensate', 'retry']);
    });
  });

  describe('GraphEdgeError', () => {
    it('should create edge error with traversal details', () => {
      const error = new GraphEdgeError(
        'node-1',
        'node-2',
        'conditional',
        'Condition evaluation failed',
        { executionId: 'exec-edge' },
        'edge-123',
        'input.value > 10',
        'transform_function',
        { value: 5 }
      );

      expect(error.name).toBe('GraphEdgeError');
      expect(error.code).toBe('GRAPH_EDGE_TRAVERSAL_FAILED');
      expect(error.fromNodeId).toBe('node-1');
      expect(error.toNodeId).toBe('node-2');
      expect(error.edgeType).toBe('conditional');
      expect(error.edgeId).toBe('edge-123');
      expect(error.conditionExpression).toBe('input.value > 10');
      expect(error.transformFunction).toBe('transform_function');
      expect(error.inputData).toEqual({ value: 5 });
    });

    it('should provide context-specific recovery strategies', () => {
      const conditionError = new GraphEdgeError(
        'node-1',
        'node-2',
        'conditional',
        'Condition failed',
        {},
        undefined,
        'condition_expr'
      );

      const transformError = new GraphEdgeError(
        'node-1',
        'node-2',
        'data',
        'Transform failed',
        {},
        undefined,
        undefined,
        'transform_func'
      );

      const generalError = new GraphEdgeError(
        'node-1',
        'node-2',
        'data',
        'General edge error'
      );

      expect(conditionError.getRecoveryStrategies()).toEqual(['skip', 'retry']);
      expect(transformError.getRecoveryStrategies()).toEqual(['substitute', 'skip']);
      expect(generalError.getRecoveryStrategies()).toEqual(['retry', 'skip']);
    });
  });

  describe('GraphConfigurationError', () => {
    it('should create configuration error with validation details', () => {
      const validationRules = [
        'timeout must be positive',
        'maxConcurrency must be between 1 and 100'
      ];

      const error = new GraphConfigurationError(
        'execution.timeout',
        'Invalid timeout value',
        -1000,
        validationRules,
        { graphId: 'config-test' }
      );

      expect(error.name).toBe('GraphConfigurationError');
      expect(error.code).toBe('GRAPH_CONFIGURATION_INVALID');
      expect(error.configSection).toBe('execution.timeout');
      expect(error.configValue).toBe(-1000);
      expect(error.validationRules).toEqual(validationRules);
      expect(error.retryable).toBe(false);
    });

    it('should provide rollback recovery strategy', () => {
      const error = new GraphConfigurationError('test', 'Test config error');
      const strategies = error.getRecoveryStrategies();

      expect(strategies).toEqual(['rollback']);
    });
  });
});

describe('Graph Agent Errors - Utility Functions', () => {
  describe('Type Guards', () => {
    it('should correctly identify Graph Agent errors', () => {
      const graphError = new GraphAgentError('TEST', 'Test');
      const validationError = new GraphValidationError('Validation failed', []);
      const nodeError = new NodeExecutionError('node-1', 'agent', 'Node failed');
      const standardError = new Error('Standard error');
      const notError = { message: 'Not an error' };

      expect(isGraphAgentError(graphError)).toBe(true);
      expect(isGraphAgentError(validationError)).toBe(true);
      expect(isGraphAgentError(nodeError)).toBe(true);
      expect(isGraphAgentError(standardError)).toBe(false);
      expect(isGraphAgentError(notError)).toBe(false);
      expect(isGraphAgentError(null)).toBe(false);
      expect(isGraphAgentError(undefined)).toBe(false);
    });

    it('should correctly identify retryable errors', () => {
      const retryableError = new GraphAgentError('RETRY', 'Retryable', {}, 'error', true);
      const nonRetryableError = new GraphAgentError('NO_RETRY', 'Non-retryable', {}, 'error', false);
      const standardError = new Error('Standard');

      expect(isRetryableError(retryableError)).toBe(true);
      expect(isRetryableError(nonRetryableError)).toBe(false);
      expect(isRetryableError(standardError)).toBe(false);
    });
  });

  describe('Severity Levels', () => {
    it('should return correct numeric severity levels', () => {
      expect(getSeverityLevel('info')).toBe(1);
      expect(getSeverityLevel('warning')).toBe(2);
      expect(getSeverityLevel('error')).toBe(3);
      expect(getSeverityLevel('critical')).toBe(4);
      expect(getSeverityLevel('unknown' as GraphErrorSeverity)).toBe(0);
    });
  });

  describe('Error Context Creation', () => {
    it('should create basic error context', () => {
      const context = createGraphErrorContext();

      expect(context.executionId).toBeUndefined();
      expect(context.graphId).toBeUndefined();
      expect(context.nodeId).toBeUndefined();
      expect(context.executionState).toBe('unknown');
      expect(context.nodeCount).toBe(0);
      expect(context.completedNodes).toBe(0);
      expect(context.failedNodes).toBe(0);
    });

    it('should create context with provided parameters', () => {
      const additionalInfo = { custom: 'data' };
      const context = createGraphErrorContext(
        'exec-123',
        'graph-456',
        'node-789',
        additionalInfo
      );

      expect(context.executionId).toBe('exec-123');
      expect(context.graphId).toBe('graph-456');
      expect(context.nodeId).toBe('node-789');
      expect(context.additionalInfo).toBe(additionalInfo);
    });
  });

  describe('Error Aggregation', () => {
    it('should aggregate multiple errors correctly', () => {
      const errors = [
        new GraphValidationError('Validation failed', []), // validation/error
        new NodeExecutionError('node-1', 'agent', 'Node failed', {}, 0, 3), // execution/error, retryable
        new GraphResourceError('memory', 100, 50), // resource/error, retryable
        new GraphConfigurationError('test', 'Config error') // configuration/error
      ];

      // Set different severities for testing
      (errors[1] as any).severity = 'critical';
      (errors[2] as any).severity = 'warning';

      const aggregation = aggregateErrors(errors);

      expect(aggregation.totalErrors).toBe(4);
      expect(aggregation.categories.validation).toBe(1);
      expect(aggregation.categories.execution).toBe(1);
      expect(aggregation.categories.resource).toBe(1);
      expect(aggregation.categories.configuration).toBe(1);
      expect(aggregation.severities.error).toBe(2);
      expect(aggregation.severities.critical).toBe(1);
      expect(aggregation.severities.warning).toBe(1);
      expect(aggregation.retryableCount).toBe(2);
      expect(aggregation.automatedCount).toBe(2);
      expect(aggregation.mostSevereError).toBe(errors[1]); // Critical severity
      expect(aggregation.timeline).toHaveLength(4);
    });

    it('should handle empty error array', () => {
      expect(() => aggregateErrors([])).toThrow();
    });
  });

  describe('Error Sanitization', () => {
    it('should sanitize sensitive information', () => {
      const context: Partial<GraphErrorContext> = {
        executionId: 'exec-123',
        additionalInfo: {
          secrets: 'secret-key',
          credentials: 'user:pass',
          tokens: 'bearer-token',
          safeData: 'safe-value'
        }
      };

      const error = new GraphAgentError('SENSITIVE', 'Sensitive error', context);
      const sanitized = sanitizeGraphError(error);

      expect(sanitized.context.additionalInfo.safeData).toBe('safe-value');
      expect(sanitized.context.additionalInfo.secrets).toBeUndefined();
      expect(sanitized.context.additionalInfo.credentials).toBeUndefined();
      expect(sanitized.context.additionalInfo.tokens).toBeUndefined();
    });

    it('should truncate long stack traces', () => {
      const error = new GraphAgentError('LONG_STACK', 'Error with long stack');
      const longStack = 'a'.repeat(2000);
      (error as any).stack = longStack;

      const sanitized = sanitizeGraphError(error);

      expect(sanitized.stack).toHaveLength(1015); // 1000 + '... (truncated)'.length
      expect(sanitized.stack).toEndWith('... (truncated)');
    });
  });

  describe('Recovery Suggestions', () => {
    it('should contain predefined recovery suggestions', () => {
      expect(GRAPH_ERROR_RECOVERY_SUGGESTIONS.VALIDATION_FAILED).toContain('Check graph structure for cycles');
      expect(GRAPH_ERROR_RECOVERY_SUGGESTIONS.NODE_EXECUTION_FAILED).toContain('Check node input data format');
      expect(GRAPH_ERROR_RECOVERY_SUGGESTIONS.TIMEOUT).toContain('Increase execution timeout');
      expect(GRAPH_ERROR_RECOVERY_SUGGESTIONS.RESOURCE_EXCEEDED).toContain('Increase resource limits');
    });
  });
});

describe('Graph Agent Errors - Recovery System', () => {
  describe('GraphErrorRecovery', () => {
    it('should suggest recovery strategies for node execution error', () => {
      const nodeError = new NodeExecutionError('node-1', 'agent', 'Agent timeout', {}, 1, 3);
      const suggestions = GraphErrorRecovery.suggestRecovery(nodeError);

      expect(suggestions).toHaveLength(3); // retry, substitute, compensate
      expect(suggestions[0].strategy).toBe('retry'); // Should be highest confidence
      expect(suggestions[0].confidence).toBeGreaterThan(0.5);
      expect(suggestions[0].description).toContain('Retry the failed operation');
      expect(suggestions[0].requirements).toContain('Available retries');
      expect(suggestions[0].estimatedCost).toBe('low');
    });

    it('should suggest recovery strategies for timeout error', () => {
      const timeoutError = new GraphTimeoutError(30000, [], [], [], 0.5);
      const suggestions = GraphErrorRecovery.suggestRecovery(timeoutError);

      expect(suggestions).toHaveLength(2); // retry, compensate
      const retryStrategy = suggestions.find(s => s.strategy === 'retry');
      expect(retryStrategy?.confidence).toBe(0.7);
    });

    it('should suggest recovery strategies for resource error', () => {
      const resourceError = new GraphResourceError('memory', 150, 100);
      const suggestions = GraphErrorRecovery.suggestRecovery(resourceError);

      const compensateStrategy = suggestions.find(s => s.strategy === 'compensate');
      expect(compensateStrategy?.confidence).toBe(0.6);
      expect(compensateStrategy?.estimatedCost).toBe('high');
    });

    it('should sort suggestions by confidence', () => {
      const error = new NodeExecutionError('node-1', 'tool', 'Tool failed');
      const suggestions = GraphErrorRecovery.suggestRecovery(error);

      // Should be sorted by confidence descending
      for (let i = 1; i < suggestions.length; i++) {
        expect(suggestions[i-1].confidence).toBeGreaterThanOrEqual(suggestions[i].confidence);
      }
    });

    it('should handle different node types appropriately', () => {
      const agentError = new NodeExecutionError('node-1', 'agent', 'Agent failed');
      const toolError = new NodeExecutionError('node-2', 'tool', 'Tool failed');
      const transformError = new NodeExecutionError('node-3', 'transform', 'Transform failed');

      const agentSuggestions = GraphErrorRecovery.suggestRecovery(agentError);
      const toolSuggestions = GraphErrorRecovery.suggestRecovery(toolError);
      const transformSuggestions = GraphErrorRecovery.suggestRecovery(transformError);

      expect(agentSuggestions.some(s => s.strategy === 'substitute')).toBe(true);
      expect(toolSuggestions.some(s => s.strategy === 'substitute')).toBe(true);
      expect(transformSuggestions.some(s => s.strategy === 'skip')).toBe(true);
    });
  });

  describe('Recovery Cost Estimation', () => {
    it('should estimate costs correctly for different strategies', () => {
      const strategies: GraphRecoveryStrategy[] = ['retry', 'skip', 'substitute', 'compensate', 'rollback'];
      const error = new GraphAgentError('TEST', 'Test error');

      strategies.forEach(strategy => {
        const suggestions = GraphErrorRecovery.suggestRecovery(
          new (class extends GraphAgentError {
            getRecoveryStrategies(): GraphRecoveryStrategy[] {
              return [strategy];
            }
          })('TEST', 'Test')
        );

        const suggestion = suggestions.find(s => s.strategy === strategy);
        expect(suggestion).toBeDefined();
        expect(['very_low', 'low', 'medium', 'high', 'very_high']).toContain(suggestion!.estimatedCost);
      });
    });
  });

  describe('Recovery Requirements', () => {
    it('should specify appropriate requirements for each strategy', () => {
      const error = new NodeExecutionError('node-1', 'agent', 'Agent failed');
      const suggestions = GraphErrorRecovery.suggestRecovery(error);

      const retryStrategy = suggestions.find(s => s.strategy === 'retry');
      const substituteStrategy = suggestions.find(s => s.strategy === 'substitute');
      const rollbackStrategy = suggestions.find(s => s.strategy === 'rollback');

      expect(retryStrategy?.requirements).toContain('Available retries');
      expect(substituteStrategy?.requirements).toContain('Alternative node implementation');
      expect(rollbackStrategy?.requirements).toContain('Valid checkpoint available');
    });
  });
});

describe('Graph Agent Errors - Integration Tests', () => {
  it('should work together in complex error scenarios', () => {
    // Simulate a complex graph execution failure
    const nodeErrors = [
      new NodeExecutionError('agent-1', 'agent', 'Agent timeout', {}, 3, 3), // Max retries reached
      new NodeExecutionError('tool-1', 'tool', 'Tool resource error', {}, 1, 3), // Retryable
      new NodeExecutionError('transform-1', 'transform', 'Transform validation error') // Non-retryable
    ];

    const multipleError = new GraphMultipleNodeError(nodeErrors, {
      executionId: 'complex-exec',
      graphId: 'complex-graph',
      executionState: 'failed',
      nodeCount: 10,
      completedNodes: 6,
      failedNodes: 3
    });

    // Test error properties
    expect(multipleError.retryable).toBe(true); // Tool error is retryable
    expect(multipleError.failedNodeIds).toHaveLength(3);
    expect(multipleError.getClassification().category).toBe('execution');

    // Test recovery suggestions
    const suggestions = GraphErrorRecovery.suggestRecovery(multipleError);
    expect(suggestions.length).toBeGreaterThan(0);

    // Test error aggregation
    const allErrors = [multipleError, ...nodeErrors];
    const aggregation = aggregateErrors(allErrors);
    expect(aggregation.totalErrors).toBe(4);
    expect(aggregation.categories.execution).toBe(4);

    // Test error serialization
    const serialized = multipleError.toJSON();
    expect(serialized.code).toBe('GRAPH_MULTIPLE_NODE_FAILURES');
    expect(serialized.executionId).toBe('complex-exec');

    // Test sanitization
    const sanitized = sanitizeGraphError(multipleError);
    expect(sanitized.name).toBe('GraphMultipleNodeError');
  });

  it('should handle error chains and causality', () => {
    const rootCause = new Error('Database connection lost');
    const nodeError = new NodeExecutionError(
      'db-node',
      'tool',
      'Database query failed',
      { executionId: 'chain-test' },
      0,
      3,
      undefined,
      undefined,
      undefined,
      rootCause
    );

    const timeoutError = new GraphTimeoutError(
      30000,
      ['db-node'],
      [],
      ['dependent-node'],
      0.2,
      { executionId: 'chain-test' }
    );

    expect(nodeError.cause).toBe(rootCause);
    expect(nodeError.retryable).toBe(true);
    expect(timeoutError.activeNodes).toContain('db-node');

    const nodeJson = nodeError.toJSON();
    expect(nodeJson.cause?.message).toBe('Database connection lost');
  });

  it('should provide comprehensive error context', () => {
    const performanceMetrics: GraphPerformanceMetrics = {
      executionDuration: 45000,
      nodeExecutionTimes: { 'node-1': 15000, 'node-2': 30000 },
      parallelEfficiency: 0.75,
      resourceUtilization: {
        cpu: 0.8,
        memory: 0.9,
        disk: 0.3,
        network: 0.2,
        concurrentNodes: 5
      },
      throughput: 0.5,
      errorRate: 0.1,
      retryRate: 0.05
    };

    const checkpoint: GraphCheckpoint = {
      id: 'checkpoint-1',
      timestamp: new Date(),
      executionState: {} as any,
      dataSnapshot: { processed: 100 },
      metadata: { phase: 'main-execution' }
    };

    const context: GraphErrorContext = {
      executionId: 'comprehensive-test',
      graphId: 'test-graph',
      nodeId: 'failing-node',
      nodeType: 'agent',
      executionState: 'running',
      nodeCount: 20,
      completedNodes: 15,
      failedNodes: 1,
      executionStrategy: 'parallel',
      performance: performanceMetrics,
      checkpoint: checkpoint
    };

    const error = new GraphAgentError(
      'COMPREHENSIVE_ERROR',
      'Comprehensive error with full context',
      context,
      'error',
      true
    );

    expect(error.context.performance?.throughput).toBe(0.5);
    expect(error.context.checkpoint?.dataSnapshot.processed).toBe(100);
    expect(error.context.executionStrategy).toBe('parallel');

    const classification = error.getClassification();
    expect(classification.category).toBe('general');
    expect(classification.retryable).toBe(true);
  });
});

// Helper functions for tests
function createMockExecutionStep(): ExecutionStep {
  return {
    id: 'step-1',
    type: 'node_start',
    nodeId: 'test-node',
    timestamp: new Date(),
    status: 'started',
    metadata: {}
  };
}

function createMockPerformanceMetrics(): GraphPerformanceMetrics {
  return {
    executionDuration: 1000,
    nodeExecutionTimes: {},
    parallelEfficiency: 0.8,
    resourceUtilization: {
      cpu: 0.5,
      memory: 0.6,
      disk: 0.3,
      network: 0.2,
      concurrentNodes: 3
    },
    throughput: 1.0,
    errorRate: 0.0,
    retryRate: 0.0
  };
}

function createMockCheckpoint(): GraphCheckpoint {
  return {
    id: 'test-checkpoint',
    timestamp: new Date(),
    executionState: {} as any,
    dataSnapshot: {},
    metadata: {}
  };
}