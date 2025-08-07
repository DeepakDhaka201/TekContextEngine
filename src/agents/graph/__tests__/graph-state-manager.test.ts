/**
 * @fileoverview Comprehensive unit tests for Graph State Manager
 * @module agents/graph/__tests__/graph-state-manager.test
 * 
 * This file provides exhaustive unit tests for the Graph State Manager class,
 * covering all state management functionality including state tracking,
 * checkpointing, persistence, recovery, and performance metrics.
 * 
 * Test categories:
 * - State Manager initialization and configuration
 * - Execution state lifecycle management
 * - Node state transitions (pending -> executing -> completed/failed)
 * - Checkpoint creation and restoration
 * - Progress tracking and performance metrics
 * - Event emission and handling
 * - Persistence backend integration
 * - Error handling and recovery
 * - Concurrency and locking mechanisms
 * - Memory management and cleanup
 * 
 * @since 1.0.0
 */

import {
  GraphStateManager
} from '../graph-state-manager';
import {
  GraphExecutionState,
  GraphExecutionStatus,
  NodeExecutionStatus,
  NodeExecutionResult,
  GraphCheckpoint,
  GraphStateConfig,
  GraphDefinition,
  GraphNode,
  GraphEdge,
  GraphExecutionContext,
  GraphExecutionProgress,
  GraphPerformanceMetrics,
  NodeResourceUsage
} from '../types';
import {
  GraphStateError
} from '../errors';

describe('Graph State Manager - Initialization and Configuration', () => {
  let stateManager: GraphStateManager;
  let mockGraphDefinition: GraphDefinition;

  beforeEach(() => {
    mockGraphDefinition = createMockGraphDefinition();
  });

  afterEach(async () => {
    if (stateManager) {
      await stateManager.shutdown();
    }
  });

  describe('Constructor and Configuration', () => {
    it('should create state manager with default configuration', () => {
      const config: GraphStateConfig = {
        persistence: 'memory',
        serialization: 'json',
        compression: 'none',
        cleanup: {
          enabled: true,
          retention: 10,
          compression: false,
          archive: false,
          conditions: []
        },
        maxSize: 1024 * 1024,
        versioning: true,
        checkpointing: {
          enabled: true,
          frequency: 'node',
          interval: 60000,
          storage: 'memory',
          compression: 'none',
          retention: 10
        }
      };

      stateManager = new GraphStateManager(config);
      
      expect(stateManager).toBeInstanceOf(GraphStateManager);
      expect(stateManager['config'].persistence).toBe('memory');
      expect(stateManager['config'].checkpointing.enabled).toBe(true);
    });

    it('should apply default values to partial configuration', () => {
      const partialConfig: Partial<GraphStateConfig> = {
        persistence: 'disk'
      };

      stateManager = new GraphStateManager(partialConfig as GraphStateConfig);
      
      expect(stateManager['config'].persistence).toBe('disk');
      expect(stateManager['config'].serialization).toBe('json');
      expect(stateManager['config'].compression).toBe('none');
      expect(stateManager['config'].maxSize).toBe(100 * 1024 * 1024);
      expect(stateManager['config'].versioning).toBe(true);
    });

    it('should initialize engines based on configuration', () => {
      const config: GraphStateConfig = {
        persistence: 'database',
        serialization: 'binary',
        compression: 'gzip',
        cleanup: {
          enabled: true,
          retention: 5,
          compression: true,
          archive: true,
          conditions: ['completed']
        },
        maxSize: 500 * 1024 * 1024,
        versioning: false,
        checkpointing: {
          enabled: true,
          frequency: 'time',
          interval: 30000,
          storage: 'disk',
          compression: 'lz4',
          retention: 5
        }
      };

      stateManager = new GraphStateManager(config);
      
      expect(stateManager['persistenceBackend']).toBeDefined();
      expect(stateManager['compressionEngine']).toBeDefined();
      expect(stateManager['serializationEngine']).toBeDefined();
      expect(stateManager['validationEngine']).toBeDefined();
    });
  });

  describe('Initialization', () => {
    beforeEach(() => {
      const config: GraphStateConfig = {
        persistence: 'memory',
        serialization: 'json',
        compression: 'none',
        cleanup: {
          enabled: true,
          retention: 10,
          compression: false,
          archive: false,
          conditions: []
        },
        maxSize: 1024 * 1024,
        versioning: true,
        checkpointing: {
          enabled: true,
          frequency: 'node',
          interval: 60000,
          storage: 'memory',
          compression: 'none',
          retention: 10
        }
      };
      stateManager = new GraphStateManager(config);
    });

    it('should initialize state manager successfully', async () => {
      const executionId = 'test-execution-1';
      
      await stateManager.initialize(executionId, mockGraphDefinition);
      
      expect(stateManager['initialized']).toBe(true);
      expect(stateManager['executionStates'].has(executionId)).toBe(true);
      expect(stateManager['checkpoints'].has(executionId)).toBe(true);
    });

    it('should create initial execution state correctly', async () => {
      const executionId = 'test-execution-2';
      
      await stateManager.initialize(executionId, mockGraphDefinition);
      
      const state = stateManager.getCurrentState(executionId);
      expect(state).toBeDefined();
      expect(state!.executionId).toBe(executionId);
      expect(state!.status).toBe('pending');
      expect(state!.completedNodes.size).toBe(0);
      expect(state!.executingNodes.size).toBe(0);
      expect(state!.pendingNodes.size).toBe(mockGraphDefinition.nodes.length);
      expect(state!.failedNodes.size).toBe(0);
      expect(state!.progress.percentage).toBe(0);
      expect(state!.progress.totalNodes).toBe(mockGraphDefinition.nodes.length);
    });

    it('should prevent double initialization', async () => {
      const executionId = 'test-execution-3';
      
      await stateManager.initialize(executionId, mockGraphDefinition);
      
      await expect(stateManager.initialize(executionId, mockGraphDefinition))
        .rejects.toThrow(GraphStateError);
    });

    it('should emit initialization event', async () => {
      const executionId = 'test-execution-4';
      const eventHandler = jest.fn();
      
      stateManager.on('initialized', eventHandler);
      await stateManager.initialize(executionId, mockGraphDefinition);
      
      expect(eventHandler).toHaveBeenCalledWith({
        executionId,
        graphId: mockGraphDefinition.id
      });
    });

    it('should initialize with execution context', async () => {
      const executionId = 'test-execution-5';
      const context: Partial<GraphExecutionContext> = {
        sessionId: 'session-123',
        userId: 'user-456'
      };
      
      await stateManager.initialize(executionId, mockGraphDefinition, context);
      
      const state = stateManager.getCurrentState(executionId);
      expect(state!.context.sessionId).toBe('session-123');
      expect(state!.context.userId).toBe('user-456');
    });
  });
});

describe('Graph State Manager - State Lifecycle Management', () => {
  let stateManager: GraphStateManager;
  let mockGraphDefinition: GraphDefinition;
  const executionId = 'lifecycle-test';

  beforeEach(async () => {
    const config: GraphStateConfig = {
      persistence: 'memory',
      serialization: 'json',
      compression: 'none',
      cleanup: { enabled: true, retention: 10, compression: false, archive: false, conditions: [] },
      maxSize: 1024 * 1024,
      versioning: true,
      checkpointing: {
        enabled: true,
        frequency: 'node',
        interval: 60000,
        storage: 'memory',
        compression: 'none',
        retention: 10
      }
    };
    stateManager = new GraphStateManager(config);
    mockGraphDefinition = createMockGraphDefinition();
    await stateManager.initialize(executionId, mockGraphDefinition);
  });

  afterEach(async () => {
    await stateManager.shutdown();
  });

  describe('Execution Status Updates', () => {
    it('should update execution status successfully', async () => {
      await stateManager.updateExecutionStatus(executionId, 'running');
      
      const state = stateManager.getCurrentState(executionId);
      expect(state!.status).toBe('running');
      expect(state!.currentTime).toBeInstanceOf(Date);
    });

    it('should update progress on completion', async () => {
      await stateManager.updateExecutionStatus(executionId, 'completed');
      
      const state = stateManager.getCurrentState(executionId);
      expect(state!.status).toBe('completed');
      expect(state!.progress.percentage).toBe(100);
      expect(state!.progress.currentPhase).toBe('completed');
    });

    it('should update progress on failure', async () => {
      await stateManager.updateExecutionStatus(executionId, 'failed');
      
      const state = stateManager.getCurrentState(executionId);
      expect(state!.status).toBe('failed');
      expect(state!.progress.currentPhase).toBe('error');
    });

    it('should emit status change event', async () => {
      const eventHandler = jest.fn();
      stateManager.on('statusChanged', eventHandler);
      
      await stateManager.updateExecutionStatus(executionId, 'running');
      
      expect(eventHandler).toHaveBeenCalledWith({
        executionId,
        previousStatus: 'pending',
        newStatus: 'running',
        timestamp: expect.any(Date)
      });
    });

    it('should throw error for non-existent execution', async () => {
      await expect(stateManager.updateExecutionStatus('non-existent', 'running'))
        .rejects.toThrow(GraphStateError);
    });
  });

  describe('Node State Transitions', () => {
    const nodeId = 'input-node';

    describe('Starting Nodes', () => {
      it('should start node execution successfully', async () => {
        const input = { data: 'test-input' };
        
        await stateManager.startNode(executionId, nodeId, input);
        
        const state = stateManager.getCurrentState(executionId);
        expect(state!.pendingNodes.has(nodeId)).toBe(false);
        expect(state!.executingNodes.has(nodeId)).toBe(true);
        expect(state!.completedNodes.has(nodeId)).toBe(false);
      });

      it('should emit node started event', async () => {
        const eventHandler = jest.fn();
        stateManager.on('nodeStarted', eventHandler);
        
        await stateManager.startNode(executionId, nodeId);
        
        expect(eventHandler).toHaveBeenCalledWith({
          executionId,
          nodeId,
          step: expect.objectContaining({
            type: 'node_start',
            nodeId,
            status: 'started'
          }),
          input: undefined
        });
      });

      it('should prevent starting already executing node', async () => {
        await stateManager.startNode(executionId, nodeId);
        
        await expect(stateManager.startNode(executionId, nodeId))
          .rejects.toThrow(GraphStateError);
      });

      it('should prevent starting completed node', async () => {
        const result = createMockNodeExecutionResult(nodeId, 'completed');
        await stateManager.startNode(executionId, nodeId);
        await stateManager.completeNode(executionId, nodeId, result);
        
        await expect(stateManager.startNode(executionId, nodeId))
          .rejects.toThrow(GraphStateError);
      });
    });

    describe('Completing Nodes', () => {
      beforeEach(async () => {
        await stateManager.startNode(executionId, nodeId);
      });

      it('should complete node execution successfully', async () => {
        const result = createMockNodeExecutionResult(nodeId, 'completed');
        result.output = { processed: true };
        
        await stateManager.completeNode(executionId, nodeId, result);
        
        const state = stateManager.getCurrentState(executionId);
        expect(state!.executingNodes.has(nodeId)).toBe(false);
        expect(state!.completedNodes.has(nodeId)).toBe(true);
        expect(state!.nodeResults.has(nodeId)).toBe(true);
        expect(state!.dataState[nodeId]).toEqual({ processed: true });
      });

      it('should update progress after node completion', async () => {
        const result = createMockNodeExecutionResult(nodeId, 'completed');
        
        await stateManager.completeNode(executionId, nodeId, result);
        
        const state = stateManager.getCurrentState(executionId);
        expect(state!.progress.completedNodes).toBe(1);
        expect(state!.progress.percentage).toBeGreaterThan(0);
      });

      it('should emit node completed event', async () => {
        const eventHandler = jest.fn();
        stateManager.on('nodeCompleted', eventHandler);
        const result = createMockNodeExecutionResult(nodeId, 'completed');
        
        await stateManager.completeNode(executionId, nodeId, result);
        
        expect(eventHandler).toHaveBeenCalledWith({
          executionId,
          nodeId,
          result,
          step: expect.objectContaining({
            type: 'node_complete',
            nodeId,
            status: 'completed'
          })
        });
      });

      it('should create auto-checkpoint when configured', async () => {
        const result = createMockNodeExecutionResult(nodeId, 'completed');
        
        await stateManager.completeNode(executionId, nodeId, result);
        
        const checkpoints = stateManager.getCheckpoints(executionId);
        expect(checkpoints.length).toBeGreaterThan(0);
        expect(checkpoints[0].metadata.label).toContain(`after-${nodeId}`);
      });

      it('should prevent completing non-executing node', async () => {
        const result = createMockNodeExecutionResult(nodeId, 'completed');
        await stateManager.completeNode(executionId, nodeId, result);
        
        await expect(stateManager.completeNode(executionId, nodeId, result))
          .rejects.toThrow(GraphStateError);
      });
    });

    describe('Failing Nodes', () => {
      beforeEach(async () => {
        await stateManager.startNode(executionId, nodeId);
      });

      it('should fail node execution successfully', async () => {
        const error = new Error('Node execution failed');
        
        await stateManager.failNode(executionId, nodeId, error);
        
        const state = stateManager.getCurrentState(executionId);
        expect(state!.executingNodes.has(nodeId)).toBe(false);
        expect(state!.failedNodes.has(nodeId)).toBe(true);
        expect(state!.nodeResults.has(nodeId)).toBe(true);
        
        const result = state!.nodeResults.get(nodeId)!;
        expect(result.status).toBe('failed');
        expect(result.error?.message).toBe('Node execution failed');
      });

      it('should emit node failed event', async () => {
        const eventHandler = jest.fn();
        stateManager.on('nodeFailed', eventHandler);
        const error = new Error('Test error');
        
        await stateManager.failNode(executionId, nodeId, error);
        
        expect(eventHandler).toHaveBeenCalledWith({
          executionId,
          nodeId,
          error,
          step: expect.objectContaining({
            type: 'node_error',
            nodeId,
            status: 'failed'
          })
        });
      });

      it('should update progress after node failure', async () => {
        const error = new Error('Test error');
        
        await stateManager.failNode(executionId, nodeId, error);
        
        const state = stateManager.getCurrentState(executionId);
        expect(state!.progress.completedNodes).toBe(0);
        expect(state!.failedNodes.size).toBe(1);
      });
    });
  });
});

describe('Graph State Manager - Checkpointing and Recovery', () => {
  let stateManager: GraphStateManager;
  let mockGraphDefinition: GraphDefinition;
  const executionId = 'checkpoint-test';

  beforeEach(async () => {
    const config: GraphStateConfig = {
      persistence: 'memory',
      serialization: 'json',
      compression: 'none',
      cleanup: { enabled: true, retention: 5, compression: false, archive: false, conditions: [] },
      maxSize: 1024 * 1024,
      versioning: true,
      checkpointing: {
        enabled: true,
        frequency: 'manual',
        interval: 60000,
        storage: 'memory',
        compression: 'none',
        retention: 5
      }
    };
    stateManager = new GraphStateManager(config);
    mockGraphDefinition = createMockGraphDefinition();
    await stateManager.initialize(executionId, mockGraphDefinition);
  });

  afterEach(async () => {
    await stateManager.shutdown();
  });

  describe('Checkpoint Creation', () => {
    it('should create checkpoint successfully', async () => {
      const nodeId = 'input-node';
      await stateManager.startNode(executionId, nodeId);
      const result = createMockNodeExecutionResult(nodeId, 'completed');
      await stateManager.completeNode(executionId, nodeId, result);
      
      const checkpoint = await stateManager.createCheckpoint(executionId, 'test-checkpoint');
      
      expect(checkpoint.id).toBeDefined();
      expect(checkpoint.timestamp).toBeInstanceOf(Date);
      expect(checkpoint.executionState).toBeDefined();
      expect(checkpoint.dataSnapshot).toBeDefined();
      expect(checkpoint.metadata.label).toBe('test-checkpoint');
      expect(checkpoint.metadata.executionId).toBe(executionId);
      expect(checkpoint.metadata.completedNodes).toBe(1);
    });

    it('should create checkpoint with auto-generated label', async () => {
      const checkpoint = await stateManager.createCheckpoint(executionId);
      
      expect(checkpoint.metadata.label).toContain('Auto-checkpoint');
      expect(checkpoint.metadata.label).toMatch(/\d+/);
    });

    it('should emit checkpoint created event', async () => {
      const eventHandler = jest.fn();
      stateManager.on('checkpointCreated', eventHandler);
      
      const checkpoint = await stateManager.createCheckpoint(executionId, 'test');
      
      expect(eventHandler).toHaveBeenCalledWith({
        executionId,
        checkpointId: checkpoint.id,
        checkpoint
      });
    });

    it('should maintain checkpoint retention limit', async () => {
      // Create more checkpoints than retention limit (5)
      for (let i = 0; i < 8; i++) {
        await stateManager.createCheckpoint(executionId, `checkpoint-${i}`);
      }
      
      const checkpoints = stateManager.getCheckpoints(executionId);
      expect(checkpoints.length).toBe(5);
      expect(checkpoints[0].metadata.label).toBe('checkpoint-3');
      expect(checkpoints[4].metadata.label).toBe('checkpoint-7');
    });

    it('should throw error for non-existent execution', async () => {
      await expect(stateManager.createCheckpoint('non-existent'))
        .rejects.toThrow(GraphStateError);
    });
  });

  describe('State Restoration', () => {
    let checkpointId: string;

    beforeEach(async () => {
      // Set up initial state
      const nodeId = 'input-node';
      await stateManager.startNode(executionId, nodeId);
      const result = createMockNodeExecutionResult(nodeId, 'completed');
      result.output = { data: 'checkpoint-data' };
      await stateManager.completeNode(executionId, nodeId, result);
      
      // Create checkpoint
      const checkpoint = await stateManager.createCheckpoint(executionId, 'before-restore');
      checkpointId = checkpoint.id;
      
      // Modify state after checkpoint
      const secondNodeId = 'process-node';
      await stateManager.startNode(executionId, secondNodeId);
    });

    it('should restore state from checkpoint successfully', async () => {
      await stateManager.restoreFromCheckpoint(executionId, checkpointId);
      
      const state = stateManager.getCurrentState(executionId);
      expect(state!.completedNodes.has('input-node')).toBe(true);
      expect(state!.executingNodes.has('process-node')).toBe(false);
      expect(state!.dataState['input-node']).toEqual({ data: 'checkpoint-data' });
    });

    it('should emit state restored event', async () => {
      const eventHandler = jest.fn();
      stateManager.on('stateRestored', eventHandler);
      
      await stateManager.restoreFromCheckpoint(executionId, checkpointId);
      
      expect(eventHandler).toHaveBeenCalledWith({
        executionId,
        checkpointId,
        timestamp: expect.any(Date)
      });
    });

    it('should throw error for non-existent checkpoint', async () => {
      await expect(stateManager.restoreFromCheckpoint(executionId, 'non-existent'))
        .rejects.toThrow(GraphStateError);
    });

    it('should throw error for execution without checkpoints', async () => {
      const newExecutionId = 'no-checkpoints';
      await stateManager.initialize(newExecutionId, mockGraphDefinition);
      
      await expect(stateManager.restoreFromCheckpoint(newExecutionId, 'any-id'))
        .rejects.toThrow(GraphStateError);
    });
  });

  describe('Checkpoint Management', () => {
    it('should get all checkpoints for execution', async () => {
      await stateManager.createCheckpoint(executionId, 'checkpoint-1');
      await stateManager.createCheckpoint(executionId, 'checkpoint-2');
      await stateManager.createCheckpoint(executionId, 'checkpoint-3');
      
      const checkpoints = stateManager.getCheckpoints(executionId);
      expect(checkpoints).toHaveLength(3);
      expect(checkpoints[0].metadata.label).toBe('checkpoint-1');
      expect(checkpoints[1].metadata.label).toBe('checkpoint-2');
      expect(checkpoints[2].metadata.label).toBe('checkpoint-3');
    });

    it('should return empty array for execution without checkpoints', () => {
      const checkpoints = stateManager.getCheckpoints('non-existent');
      expect(checkpoints).toEqual([]);
    });
  });
});

describe('Graph State Manager - Data Management', () => {
  let stateManager: GraphStateManager;
  let mockGraphDefinition: GraphDefinition;
  const executionId = 'data-test';

  beforeEach(async () => {
    const config: GraphStateConfig = {
      persistence: 'memory',
      serialization: 'json',
      compression: 'none',
      cleanup: { enabled: true, retention: 10, compression: false, archive: false, conditions: [] },
      maxSize: 1024 * 1024,
      versioning: true,
      checkpointing: {
        enabled: false, // Disable for cleaner testing
        frequency: 'node',
        interval: 60000,
        storage: 'memory',
        compression: 'none',
        retention: 10
      }
    };
    stateManager = new GraphStateManager(config);
    mockGraphDefinition = createMockGraphDefinition();
    await stateManager.initialize(executionId, mockGraphDefinition);
  });

  afterEach(async () => {
    await stateManager.shutdown();
  });

  describe('Node Data Operations', () => {
    const nodeId = 'test-node';

    it('should set and get node input data', async () => {
      const inputData = { message: 'hello world', count: 42 };
      
      await stateManager.setNodeInput(executionId, nodeId, inputData);
      
      const state = stateManager.getCurrentState(executionId);
      expect(state!.dataState[`${nodeId}_input`]).toEqual(inputData);
    });

    it('should emit node input set event', async () => {
      const eventHandler = jest.fn();
      stateManager.on('nodeInputSet', eventHandler);
      const inputData = { test: 'data' };
      
      await stateManager.setNodeInput(executionId, nodeId, inputData);
      
      expect(eventHandler).toHaveBeenCalledWith({
        executionId,
        nodeId,
        data: inputData
      });
    });

    it('should get node output data after completion', async () => {
      await stateManager.startNode(executionId, nodeId);
      const result = createMockNodeExecutionResult(nodeId, 'completed');
      result.output = { result: 'success', value: 123 };
      await stateManager.completeNode(executionId, nodeId, result);
      
      const output = stateManager.getNodeOutput(executionId, nodeId);
      expect(output).toEqual({ result: 'success', value: 123 });
    });

    it('should return undefined for node without output', () => {
      const output = stateManager.getNodeOutput(executionId, 'non-existent');
      expect(output).toBeUndefined();
    });

    it('should validate input data when validation engine is available', async () => {
      // This tests the validation path exists, actual validation depends on implementation
      const inputData = { valid: true };
      
      await expect(stateManager.setNodeInput(executionId, nodeId, inputData))
        .resolves.not.toThrow();
    });
  });

  describe('Progress Tracking', () => {
    it('should track execution progress accurately', async () => {
      const nodes = ['node1', 'node2', 'node3', 'node4'];
      
      // Start and complete nodes progressively
      for (let i = 0; i < nodes.length; i++) {
        await stateManager.startNode(executionId, nodes[i]);
        const result = createMockNodeExecutionResult(nodes[i], 'completed');
        await stateManager.completeNode(executionId, nodes[i], result);
        
        const progress = stateManager.getProgress(executionId);
        expect(progress!.completedNodes).toBe(i + 1);
        expect(progress!.totalNodes).toBe(mockGraphDefinition.nodes.length);
        
        const expectedPercentage = Math.round(((i + 1) / mockGraphDefinition.nodes.length) * 100);
        expect(progress!.percentage).toBe(expectedPercentage);
      }
    });

    it('should return undefined for non-existent execution', () => {
      const progress = stateManager.getProgress('non-existent');
      expect(progress).toBeUndefined();
    });

    it('should track current phase correctly', async () => {
      let progress = stateManager.getProgress(executionId);
      expect(progress!.currentPhase).toBe('Preparing nodes');
      
      await stateManager.startNode(executionId, 'input-node');
      progress = stateManager.getProgress(executionId);
      expect(progress!.currentPhase).toContain('Executing 1 nodes');
      
      const result = createMockNodeExecutionResult('input-node', 'completed');
      await stateManager.completeNode(executionId, 'input-node', result);
      progress = stateManager.getProgress(executionId);
      expect(progress!.currentPhase).toBe('Preparing nodes');
    });

    it('should calculate throughput and time estimates', async () => {
      const nodeId = 'speed-test-node';
      
      // Wait a bit to ensure time difference
      await new Promise(resolve => setTimeout(resolve, 10));
      
      await stateManager.startNode(executionId, nodeId);
      const result = createMockNodeExecutionResult(nodeId, 'completed');
      await stateManager.completeNode(executionId, nodeId, result);
      
      const progress = stateManager.getProgress(executionId);
      expect(progress!.throughputNodes).toBeGreaterThan(0);
      expect(progress!.estimatedTimeRemaining).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('Graph State Manager - Performance Metrics', () => {
  let stateManager: GraphStateManager;
  let mockGraphDefinition: GraphDefinition;
  const executionId = 'metrics-test';

  beforeEach(async () => {
    const config: GraphStateConfig = {
      persistence: 'memory',
      serialization: 'json',
      compression: 'none',
      cleanup: { enabled: true, retention: 10, compression: false, archive: false, conditions: [] },
      maxSize: 1024 * 1024,
      versioning: true,
      checkpointing: {
        enabled: false,
        frequency: 'node',
        interval: 60000,
        storage: 'memory',
        compression: 'none',
        retention: 10
      }
    };
    stateManager = new GraphStateManager(config);
    mockGraphDefinition = createMockGraphDefinition();
    await stateManager.initialize(executionId, mockGraphDefinition);
  });

  afterEach(async () => {
    await stateManager.shutdown();
  });

  describe('Performance Metrics Calculation', () => {
    it('should calculate basic performance metrics', async () => {
      const nodeId = 'performance-node';
      
      await stateManager.startNode(executionId, nodeId);
      
      // Wait to ensure execution duration
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const result = createMockNodeExecutionResult(nodeId, 'completed');
      result.duration = 100; // 100ms
      result.resourceUsage = {
        memory: 50,
        cpu: 0.3,
        disk: 10,
        network: 5,
        duration: 100
      };
      
      await stateManager.completeNode(executionId, nodeId, result);
      
      const metrics = stateManager.getPerformanceMetrics(executionId);
      expect(metrics).toBeDefined();
      expect(metrics!.executionDuration).toBeGreaterThan(0);
      expect(metrics!.nodeExecutionTimes[nodeId]).toBe(100);
      expect(metrics!.resourceUtilization.memory).toBe(50);
      expect(metrics!.resourceUtilization.cpu).toBe(0.3);
      expect(metrics!.throughput).toBeGreaterThan(0);
      expect(metrics!.errorRate).toBe(0);
    });

    it('should calculate error rate correctly', async () => {
      const successNodeId = 'success-node';
      const failureNodeId = 'failure-node';
      
      // Complete one node successfully
      await stateManager.startNode(executionId, successNodeId);
      const successResult = createMockNodeExecutionResult(successNodeId, 'completed');
      await stateManager.completeNode(executionId, successNodeId, successResult);
      
      // Fail another node
      await stateManager.startNode(executionId, failureNodeId);
      await stateManager.failNode(executionId, failureNodeId, new Error('Test failure'));
      
      const metrics = stateManager.getPerformanceMetrics(executionId);
      expect(metrics!.errorRate).toBe(1 / mockGraphDefinition.nodes.length);
    });

    it('should calculate retry rate from node results', async () => {
      const nodeId = 'retry-node';
      
      await stateManager.startNode(executionId, nodeId);
      const result = createMockNodeExecutionResult(nodeId, 'completed');
      result.metadata.retryCount = 2; // Node was retried twice
      await stateManager.completeNode(executionId, nodeId, result);
      
      const metrics = stateManager.getPerformanceMetrics(executionId);
      expect(metrics!.retryRate).toBe(200); // 2 retries / 1 execution * 100
    });

    it('should return undefined for non-existent execution', () => {
      const metrics = stateManager.getPerformanceMetrics('non-existent');
      expect(metrics).toBeUndefined();
    });

    it('should aggregate resource usage across nodes', async () => {
      const node1Id = 'resource-node-1';
      const node2Id = 'resource-node-2';
      
      // Complete first node
      await stateManager.startNode(executionId, node1Id);
      const result1 = createMockNodeExecutionResult(node1Id, 'completed');
      result1.resourceUsage = { memory: 100, cpu: 0.5, disk: 20, network: 10, duration: 100 };
      await stateManager.completeNode(executionId, node1Id, result1);
      
      // Complete second node
      await stateManager.startNode(executionId, node2Id);
      const result2 = createMockNodeExecutionResult(node2Id, 'completed');
      result2.resourceUsage = { memory: 200, cpu: 0.3, disk: 30, network: 15, duration: 150 };
      await stateManager.completeNode(executionId, node2Id, result2);
      
      const metrics = stateManager.getPerformanceMetrics(executionId);
      expect(metrics!.resourceUtilization.memory).toBe(300);
      expect(metrics!.resourceUtilization.cpu).toBe(0.8);
      expect(metrics!.resourceUtilization.disk).toBe(50);
      expect(metrics!.resourceUtilization.network).toBe(25);
    });
  });
});

describe('Graph State Manager - Event System', () => {
  let stateManager: GraphStateManager;
  let mockGraphDefinition: GraphDefinition;

  beforeEach(() => {
    const config: GraphStateConfig = {
      persistence: 'memory',
      serialization: 'json',
      compression: 'none',
      cleanup: { enabled: true, retention: 10, compression: false, archive: false, conditions: [] },
      maxSize: 1024 * 1024,
      versioning: true,
      checkpointing: {
        enabled: false,
        frequency: 'node',
        interval: 60000,
        storage: 'memory',
        compression: 'none',
        retention: 10
      }
    };
    stateManager = new GraphStateManager(config);
    mockGraphDefinition = createMockGraphDefinition();
  });

  afterEach(async () => {
    await stateManager.shutdown();
  });

  describe('Event Registration and Handling', () => {
    it('should register and call event handlers', async () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      
      stateManager.on('test-event', handler1);
      stateManager.on('test-event', handler2);
      
      stateManager['emitEvent']('test-event', { data: 'test' });
      
      expect(handler1).toHaveBeenCalledWith({ data: 'test' });
      expect(handler2).toHaveBeenCalledWith({ data: 'test' });
    });

    it('should unregister event handlers', async () => {
      const handler = jest.fn();
      
      stateManager.on('test-event', handler);
      stateManager.off('test-event', handler);
      
      stateManager['emitEvent']('test-event', { data: 'test' });
      
      expect(handler).not.toHaveBeenCalled();
    });

    it('should handle errors in event handlers gracefully', async () => {
      const errorHandler = jest.fn(() => {
        throw new Error('Handler error');
      });
      const successHandler = jest.fn();
      
      stateManager.on('test-event', errorHandler);
      stateManager.on('test-event', successHandler);
      
      // Should not throw despite handler error
      expect(() => {
        stateManager['emitEvent']('test-event', { data: 'test' });
      }).not.toThrow();
      
      expect(errorHandler).toHaveBeenCalled();
      expect(successHandler).toHaveBeenCalled();
    });

    it('should not call handlers for unregistered events', async () => {
      const handler = jest.fn();
      
      stateManager.on('registered-event', handler);
      stateManager['emitEvent']('unregistered-event', { data: 'test' });
      
      expect(handler).not.toHaveBeenCalled();
    });
  });
});

describe('Graph State Manager - Concurrency and Locking', () => {
  let stateManager: GraphStateManager;
  let mockGraphDefinition: GraphDefinition;
  const executionId = 'concurrency-test';

  beforeEach(async () => {
    const config: GraphStateConfig = {
      persistence: 'memory',
      serialization: 'json',
      compression: 'none',
      cleanup: { enabled: true, retention: 10, compression: false, archive: false, conditions: [] },
      maxSize: 1024 * 1024,
      versioning: true,
      checkpointing: {
        enabled: false,
        frequency: 'node',
        interval: 60000,
        storage: 'memory',
        compression: 'none',
        retention: 10
      }
    };
    stateManager = new GraphStateManager(config);
    mockGraphDefinition = createMockGraphDefinition();
    await stateManager.initialize(executionId, mockGraphDefinition);
  });

  afterEach(async () => {
    await stateManager.shutdown();
  });

  describe('State Locking', () => {
    it('should handle concurrent state modifications safely', async () => {
      const nodeIds = ['concurrent-1', 'concurrent-2', 'concurrent-3'];
      
      // Start all operations concurrently
      const operations = nodeIds.map(async (nodeId) => {
        await stateManager.startNode(executionId, nodeId);
        const result = createMockNodeExecutionResult(nodeId, 'completed');
        await stateManager.completeNode(executionId, nodeId, result);
      });
      
      // Wait for all to complete
      await Promise.all(operations);
      
      const state = stateManager.getCurrentState(executionId);
      expect(state!.completedNodes.size).toBe(3);
      expect(state!.executingNodes.size).toBe(0);
      expect(state!.nodeResults.size).toBe(3);
      
      nodeIds.forEach(nodeId => {
        expect(state!.completedNodes.has(nodeId)).toBe(true);
        expect(state!.nodeResults.has(nodeId)).toBe(true);
      });
    });

    it('should prevent race conditions in checkpoint creation', async () => {
      // Create checkpoints concurrently
      const checkpointPromises = Array.from({ length: 5 }, (_, i) =>
        stateManager.createCheckpoint(executionId, `concurrent-checkpoint-${i}`)
      );
      
      const checkpoints = await Promise.all(checkpointPromises);
      
      expect(checkpoints).toHaveLength(5);
      checkpoints.forEach((checkpoint, i) => {
        expect(checkpoint.id).toBeDefined();
        expect(checkpoint.metadata.label).toBe(`concurrent-checkpoint-${i}`);
      });
      
      const allCheckpoints = stateManager.getCheckpoints(executionId);
      expect(allCheckpoints).toHaveLength(5);
    });

    it('should maintain state consistency during concurrent updates', async () => {
      const nodeId = 'consistency-test';
      
      // Start concurrent operations that modify same execution
      const statusUpdate = stateManager.updateExecutionStatus(executionId, 'running');
      const nodeStart = stateManager.startNode(executionId, nodeId);
      const checkpointCreation = stateManager.createCheckpoint(executionId, 'consistency-check');
      
      await Promise.all([statusUpdate, nodeStart, checkpointCreation]);
      
      const state = stateManager.getCurrentState(executionId);
      expect(state!.status).toBe('running');
      expect(state!.executingNodes.has(nodeId)).toBe(true);
      
      const checkpoints = stateManager.getCheckpoints(executionId);
      expect(checkpoints).toHaveLength(1);
    });
  });
});

describe('Graph State Manager - Cleanup and Shutdown', () => {
  let stateManager: GraphStateManager;
  let mockGraphDefinition: GraphDefinition;

  beforeEach(() => {
    const config: GraphStateConfig = {
      persistence: 'memory',
      serialization: 'json',
      compression: 'none',
      cleanup: { enabled: true, retention: 10, compression: false, archive: false, conditions: [] },
      maxSize: 1024 * 1024,
      versioning: true,
      checkpointing: {
        enabled: true,
        frequency: 'node',
        interval: 60000,
        storage: 'memory',
        compression: 'none',
        retention: 10
      }
    };
    stateManager = new GraphStateManager(config);
    mockGraphDefinition = createMockGraphDefinition();
  });

  describe('Cleanup Operations', () => {
    it('should clean up execution state completely', async () => {
      const executionId = 'cleanup-test';
      
      await stateManager.initialize(executionId, mockGraphDefinition);
      await stateManager.createCheckpoint(executionId, 'before-cleanup');
      
      expect(stateManager.getCurrentState(executionId)).toBeDefined();
      expect(stateManager.getCheckpoints(executionId)).toHaveLength(1);
      
      await stateManager.cleanup(executionId);
      
      expect(stateManager.getCurrentState(executionId)).toBeUndefined();
      expect(stateManager.getCheckpoints(executionId)).toHaveLength(0);
    });

    it('should emit cleanup completed event', async () => {
      const executionId = 'cleanup-event-test';
      const eventHandler = jest.fn();
      
      stateManager.on('cleanupCompleted', eventHandler);
      await stateManager.initialize(executionId, mockGraphDefinition);
      await stateManager.cleanup(executionId);
      
      expect(eventHandler).toHaveBeenCalledWith({ executionId });
    });
  });

  describe('Shutdown Operations', () => {
    it('should shutdown cleanly without errors', async () => {
      const executionId = 'shutdown-test';
      
      await stateManager.initialize(executionId, mockGraphDefinition);
      await stateManager.createCheckpoint(executionId, 'before-shutdown');
      
      await expect(stateManager.shutdown()).resolves.not.toThrow();
      
      expect(stateManager['initialized']).toBe(false);
      expect(stateManager['executionStates'].size).toBe(0);
      expect(stateManager['checkpoints'].size).toBe(0);
      expect(stateManager['eventHandlers'].size).toBe(0);
    });

    it('should handle shutdown when not initialized', async () => {
      await expect(stateManager.shutdown()).resolves.not.toThrow();
    });

    it('should clear cleanup intervals on shutdown', async () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      
      await stateManager.initialize('test', mockGraphDefinition);
      await stateManager.shutdown();
      
      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });
  });
});

describe('Graph State Manager - Error Handling', () => {
  let stateManager: GraphStateManager;
  let mockGraphDefinition: GraphDefinition;

  beforeEach(() => {
    const config: GraphStateConfig = {
      persistence: 'memory',
      serialization: 'json',
      compression: 'none',
      cleanup: { enabled: true, retention: 10, compression: false, archive: false, conditions: [] },
      maxSize: 1024 * 1024,
      versioning: true,
      checkpointing: {
        enabled: true,
        frequency: 'node',
        interval: 60000,
        storage: 'memory',
        compression: 'none',
        retention: 10
      }
    };
    stateManager = new GraphStateManager(config);
    mockGraphDefinition = createMockGraphDefinition();
  });

  afterEach(async () => {
    await stateManager.shutdown();
  });

  describe('Error Scenarios', () => {
    it('should throw GraphStateError for operations on non-existent execution', async () => {
      await expect(stateManager.updateExecutionStatus('non-existent', 'running'))
        .rejects.toThrow(GraphStateError);
      
      await expect(stateManager.startNode('non-existent', 'node'))
        .rejects.toThrow(GraphStateError);
      
      await expect(stateManager.completeNode('non-existent', 'node', createMockNodeExecutionResult('node', 'completed')))
        .rejects.toThrow(GraphStateError);
      
      await expect(stateManager.failNode('non-existent', 'node', new Error('test')))
        .rejects.toThrow(GraphStateError);
      
      await expect(stateManager.createCheckpoint('non-existent'))
        .rejects.toThrow(GraphStateError);
      
      await expect(stateManager.setNodeInput('non-existent', 'node', {}))
        .rejects.toThrow(GraphStateError);
    });

    it('should handle invalid node state transitions', async () => {
      const executionId = 'error-test';
      await stateManager.initialize(executionId, mockGraphDefinition);
      
      const nodeId = 'test-node';
      
      // Try to complete node that hasn't been started
      await expect(stateManager.completeNode(executionId, nodeId, createMockNodeExecutionResult(nodeId, 'completed')))
        .rejects.toThrow(GraphStateError);
      
      // Start and complete node, then try to start again
      await stateManager.startNode(executionId, nodeId);
      const result = createMockNodeExecutionResult(nodeId, 'completed');
      await stateManager.completeNode(executionId, nodeId, result);
      
      await expect(stateManager.startNode(executionId, nodeId))
        .rejects.toThrow(GraphStateError);
    });

    it('should provide meaningful error context', async () => {
      try {
        await stateManager.updateExecutionStatus('test-execution', 'running');
      } catch (error) {
        expect(error).toBeInstanceOf(GraphStateError);
        expect((error as GraphStateError).message).toContain('Execution state not found');
        expect((error as GraphStateError).context.executionId).toBe('test-execution');
      }
    });
  });
});

// ============================================================================
// Test Helper Functions
// ============================================================================

function createMockGraphDefinition(): GraphDefinition {
  return {
    id: 'test-graph',
    name: 'Test Graph',
    description: 'A test graph definition',
    version: '1.0.0',
    metadata: {
      author: 'Test Author',
      created: new Date(),
      updated: new Date(),
      tags: ['test'],
      category: 'testing',
      complexity: 'simple',
      performance: {
        estimatedDuration: 1000,
        resourceIntensity: 'low',
        scalability: 'linear',
        memoryConcerns: false,
        cpuIntensive: false
      }
    },
    nodes: [
      {
        id: 'input-node',
        type: 'input',
        name: 'Input Node',
        config: { schema: { type: 'string' } }
      },
      {
        id: 'process-node',
        type: 'transform',
        name: 'Process Node',
        config: { transform: 'uppercase' }
      },
      {
        id: 'output-node',
        type: 'output',
        name: 'Output Node',
        config: { format: 'json' }
      }
    ] as GraphNode[],
    edges: [
      {
        id: 'edge-1',
        from: 'input-node',
        to: 'process-node',
        type: 'data'
      },
      {
        id: 'edge-2',
        from: 'process-node',
        to: 'output-node',
        type: 'data'
      }
    ] as GraphEdge[],
    config: {
      timeout: 30000,
      retryPolicy: {
        maxAttempts: 3,
        backoffStrategy: 'exponential',
        initialDelay: 1000,
        maxDelay: 10000,
        retryConditions: ['timeout', 'network']
      },
      errorHandling: 'retry',
      monitoring: true,
      logging: true,
      checkpointing: true
    },
    tags: ['test', 'example']
  };
}

function createMockNodeExecutionResult(nodeId: string, status: NodeExecutionStatus): NodeExecutionResult {
  return {
    nodeId,
    status,
    metadata: {
      nodeId,
      startTime: new Date(),
      endTime: new Date(),
      duration: 100,
      retryCount: 0,
      memoryUsage: 50,
      cpuUsage: 0.1
    },
    toolsUsed: [],
    duration: 100,
    resourceUsage: {
      memory: 50,
      cpu: 0.1,
      disk: 10,
      network: 5,
      duration: 100
    }
  };
}

function createMockGraphExecutionContext(): GraphExecutionContext {
  return {
    executionId: 'mock-execution',
    sessionId: 'mock-session',
    userId: 'mock-user',
    environment: {
      agentHub: {},
      modules: {},
      services: {},
      config: {}
    },
    agents: {
      get: jest.fn(),
      list: jest.fn(),
      register: jest.fn()
    },
    tools: {
      get: jest.fn(),
      list: jest.fn(),
      execute: jest.fn()
    },
    stateManager: {} as any,
    eventEmitter: {
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn()
    },
    logger: {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    },
    metrics: {
      recordNodeExecution: jest.fn(),
      recordResourceUsage: jest.fn(),
      getMetrics: jest.fn(),
      reset: jest.fn()
    }
  };
}

function createMockResourceUsage(): NodeResourceUsage {
  return {
    memory: 100,
    cpu: 0.5,
    disk: 50,
    network: 25,
    duration: 1000
  };
}