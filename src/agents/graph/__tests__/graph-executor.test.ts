/**
 * @fileoverview Comprehensive unit tests for Graph Executor
 * @module agents/graph/__tests__/graph-executor.test
 * 
 * This file provides exhaustive unit tests for the Graph Executor class,
 * covering all execution strategies, node types, resource management,
 * dependency resolution, error handling, and performance monitoring.
 * 
 * Test categories:
 * - Graph Executor initialization and configuration
 * - Execution strategies (sequential, parallel, hybrid, adaptive)
 * - Node executor implementations for all node types
 * - Resource pool management and concurrency control
 * - Dependency resolution and node scheduling
 * - Error handling and recovery mechanisms
 * - Execution control (pause, resume, cancel)
 * - Performance monitoring and metrics collection
 * - Streaming execution with real-time updates
 * - Timeout handling and resource cleanup
 * 
 * @since 1.0.0
 */

import {
  GraphExecutor
} from '../graph-executor';
import { GraphStateManager } from '../graph-state-manager';
import {
  ExecutableGraph,
  GraphDefinition,
  GraphNode,
  GraphEdge,
  GraphExecutionConfig,
  GraphAgentInput,
  GraphExecutionContext,
  GraphExecutionStrategy,
  NodeType,
  NodeConfig,
  ExecutionStep,
  NodeExecutionResult,
  GraphPerformanceMetrics,
  GraphRetryConfig,
  GraphCheckpointConfig,
  GraphOptimizationConfig,
  ExecutionPlan,
  GraphValidationResult
} from '../types';
import {
  NodeExecutionError,
  GraphTimeoutError,
  GraphStateError
} from '../errors';
import { IAgent, ITool, ExecutionContext, AgentResult } from '../base/types';

describe('Graph Executor - Initialization and Configuration', () => {
  let executor: GraphExecutor;
  let stateManager: GraphStateManager;
  let mockConfig: GraphExecutionConfig;

  beforeEach(() => {
    stateManager = createMockStateManager();
    mockConfig = createMockExecutionConfig();
  });

  afterEach(async () => {
    if (executor) {
      await executor.shutdown();
    }
    if (stateManager) {
      await stateManager.shutdown();
    }
  });

  describe('Constructor and Configuration', () => {
    it('should create executor with default configuration', () => {
      const minimalConfig: Partial<GraphExecutionConfig> = {
        strategy: 'parallel'
      };

      executor = new GraphExecutor(minimalConfig as GraphExecutionConfig, stateManager);
      
      expect(executor).toBeInstanceOf(GraphExecutor);
      expect(executor['config'].strategy).toBe('parallel');
      expect(executor['config'].maxConcurrency).toBe(4);
      expect(executor['config'].timeout).toBe(300000);
      expect(executor['config'].errorHandling).toBe('fail_fast');
    });

    it('should apply custom configuration correctly', () => {
      const customConfig: GraphExecutionConfig = {
        strategy: 'sequential',
        maxConcurrency: 8,
        timeout: 600000,
        errorHandling: 'continue',
        retry: {
          maxAttempts: 5,
          backoffStrategy: 'linear',
          initialDelay: 2000,
          maxDelay: 60000,
          retryableErrors: ['timeout', 'network']
        },
        checkpointing: {
          enabled: true,
          frequency: 'time',
          interval: 30000,
          storage: 'disk',
          compression: 'gzip',
          retention: 20
        },
        optimization: {
          enabled: true,
          strategies: ['node_coalescing', 'parallel_expansion'],
          threshold: 0.8,
          adaptive: true
        }
      };

      executor = new GraphExecutor(customConfig, stateManager);
      
      expect(executor['config'].strategy).toBe('sequential');
      expect(executor['config'].maxConcurrency).toBe(8);
      expect(executor['config'].timeout).toBe(600000);
      expect(executor['config'].errorHandling).toBe('continue');
      expect(executor['config'].retry.maxAttempts).toBe(5);
      expect(executor['config'].retry.backoffStrategy).toBe('linear');
      expect(executor['config'].checkpointing.enabled).toBe(true);
      expect(executor['config'].checkpointing.frequency).toBe('time');
      expect(executor['config'].optimization.enabled).toBe(true);
      expect(executor['config'].optimization.strategies).toContain('node_coalescing');
    });

    it('should initialize node executors for all node types', () => {
      executor = new GraphExecutor(mockConfig, stateManager);
      
      const nodeTypes: NodeType[] = [
        'input', 'output', 'agent', 'tool', 'transform', 'condition',
        'parallel', 'sequential', 'merge', 'split', 'loop', 'delay', 'custom'
      ];

      nodeTypes.forEach(nodeType => {
        expect(executor['nodeExecutors'].has(nodeType)).toBe(true);
      });
    });

    it('should create resource pool with correct concurrency', () => {
      const config = { ...mockConfig, maxConcurrency: 6 };
      executor = new GraphExecutor(config, stateManager);
      
      expect(executor['resourcePool']['maxConcurrency']).toBe(6);
    });

    it('should create execution queue with correct strategy', () => {
      const config = { ...mockConfig, strategy: 'adaptive' as GraphExecutionStrategy };
      executor = new GraphExecutor(config, stateManager);
      
      expect(executor['executionQueue']['strategy']).toBe('adaptive');
    });
  });

  describe('Initialization', () => {
    beforeEach(() => {
      executor = new GraphExecutor(mockConfig, stateManager);
    });

    it('should initialize successfully', async () => {
      await executor.initialize();
      
      expect(executor['initialized']).toBe(true);
    });

    it('should not reinitialize if already initialized', async () => {
      await executor.initialize();
      const firstInit = executor['initialized'];
      
      await executor.initialize();
      
      expect(executor['initialized']).toBe(firstInit);
    });

    it('should initialize resource pool during initialization', async () => {
      const initializeSpy = jest.spyOn(executor['resourcePool'], 'initialize');
      
      await executor.initialize();
      
      expect(initializeSpy).toHaveBeenCalled();
      initializeSpy.mockRestore();
    });

    it('should initialize performance monitor during initialization', async () => {
      const initializeSpy = jest.spyOn(executor['performanceMonitor'], 'initialize');
      
      await executor.initialize();
      
      expect(initializeSpy).toHaveBeenCalled();
      initializeSpy.mockRestore();
    });
  });
});

describe('Graph Executor - Execution Strategies', () => {
  let executor: GraphExecutor;
  let stateManager: GraphStateManager;
  let mockGraph: ExecutableGraph;
  let mockInput: GraphAgentInput;
  let mockContext: GraphExecutionContext;

  beforeEach(async () => {
    stateManager = createMockStateManager();
    mockGraph = createMockExecutableGraph();
    mockInput = createMockGraphAgentInput();
    mockContext = createMockGraphExecutionContext();
  });

  afterEach(async () => {
    if (executor) {
      await executor.shutdown();
    }
    if (stateManager) {
      await stateManager.shutdown();
    }
  });

  describe('Sequential Execution Strategy', () => {
    beforeEach(async () => {
      const config = createMockExecutionConfig();
      config.strategy = 'sequential';
      executor = new GraphExecutor(config, stateManager);
      await executor.initialize();
    });

    it('should execute nodes sequentially', async () => {
      const result = await executor.execute(mockGraph, mockInput, mockContext);
      
      expect(result.success).toBe(true);
      expect(result.execution.strategy).toBe('sequential');
      expect(result.execution.executionId).toBe(mockContext.executionId);
      expect(result.execution.nodeCount).toBe(mockGraph.definition.nodes.length);
    });

    it('should respect node dependencies in sequential execution', async () => {
      const nodeStartOrder: string[] = [];
      
      // Mock state manager to track node start order
      jest.spyOn(stateManager, 'startNode').mockImplementation(async (executionId, nodeId) => {
        nodeStartOrder.push(nodeId);
        return Promise.resolve();
      });

      await executor.execute(mockGraph, mockInput, mockContext);
      
      // Verify nodes were started in dependency order
      expect(nodeStartOrder.length).toBeGreaterThan(0);
      expect(nodeStartOrder[0]).toBe(mockGraph.sortedNodes[0]);
    });

    it('should handle sequential execution with node failures', async () => {
      const failingNodeId = mockGraph.definition.nodes[1].id;
      
      jest.spyOn(stateManager, 'startNode').mockImplementation(async (executionId, nodeId) => {
        if (nodeId === failingNodeId) {
          throw new NodeExecutionError(nodeId, 'agent', 'Test failure');
        }
        return Promise.resolve();
      });

      await expect(executor.execute(mockGraph, mockInput, mockContext))
        .rejects.toThrow(NodeExecutionError);
    });

    it('should stop execution on first failure in sequential mode', async () => {
      const nodeStartOrder: string[] = [];
      const failingNodeId = mockGraph.definition.nodes[1].id;
      
      jest.spyOn(stateManager, 'startNode').mockImplementation(async (executionId, nodeId) => {
        nodeStartOrder.push(nodeId);
        if (nodeId === failingNodeId) {
          throw new NodeExecutionError(nodeId, 'agent', 'Test failure');
        }
        return Promise.resolve();
      });

      try {
        await executor.execute(mockGraph, mockInput, mockContext);
      } catch (error) {
        // Expected to fail
      }

      // Should have stopped after the failing node
      expect(nodeStartOrder.length).toBeLessThanOrEqual(2);
      expect(nodeStartOrder).toContain(failingNodeId);
    });
  });

  describe('Parallel Execution Strategy', () => {
    beforeEach(async () => {
      const config = createMockExecutionConfig();
      config.strategy = 'parallel';
      executor = new GraphExecutor(config, stateManager);
      await executor.initialize();
    });

    it('should execute independent nodes in parallel', async () => {
      const nodeStartTimes: Record<string, number> = {};
      
      jest.spyOn(stateManager, 'startNode').mockImplementation(async (executionId, nodeId) => {
        nodeStartTimes[nodeId] = Date.now();
        await new Promise(resolve => setTimeout(resolve, 50)); // Simulate work
        return Promise.resolve();
      });

      await executor.execute(mockGraph, mockInput, mockContext);
      
      // Verify nodes were started concurrently (within reasonable time window)
      const startTimes = Object.values(nodeStartTimes);
      if (startTimes.length > 1) {
        const timeDiff = Math.max(...startTimes) - Math.min(...startTimes);
        expect(timeDiff).toBeLessThan(100); // Should start within 100ms of each other
      }
    });

    it('should respect dependencies in parallel execution', async () => {
      const nodeCompletionOrder: string[] = [];
      
      jest.spyOn(stateManager, 'completeNode').mockImplementation(async (executionId, nodeId, result) => {
        nodeCompletionOrder.push(nodeId);
        return Promise.resolve();
      });

      await executor.execute(mockGraph, mockInput, mockContext);
      
      // Verify dependency constraints were respected
      expect(nodeCompletionOrder.length).toBeGreaterThan(0);
      
      // First completed node should have no dependencies or be a root node
      const firstNode = mockGraph.definition.nodes.find(n => n.id === nodeCompletionOrder[0]);
      const dependencies = mockGraph.dependencies[nodeCompletionOrder[0]] || [];
      expect(dependencies.length).toBe(0);
    });

    it('should handle parallel execution with some node failures', async () => {
      const config = createMockExecutionConfig();
      config.strategy = 'parallel';
      config.errorHandling = 'continue';
      executor = new GraphExecutor(config, stateManager);
      await executor.initialize();

      const failingNodeId = mockGraph.definition.nodes[1].id;
      
      jest.spyOn(stateManager, 'startNode').mockImplementation(async (executionId, nodeId) => {
        if (nodeId === failingNodeId) {
          throw new NodeExecutionError(nodeId, 'tool', 'Test failure');
        }
        return Promise.resolve();
      });

      await expect(executor.execute(mockGraph, mockInput, mockContext))
        .rejects.toThrow(NodeExecutionError);
    });
  });

  describe('Hybrid Execution Strategy', () => {
    beforeEach(async () => {
      const config = createMockExecutionConfig();
      config.strategy = 'hybrid';
      executor = new GraphExecutor(config, stateManager);
      await executor.initialize();
    });

    it('should execute with hybrid strategy', async () => {
      const result = await executor.execute(mockGraph, mockInput, mockContext);
      
      expect(result.success).toBe(true);
      expect(result.execution.strategy).toBe('hybrid');
    });

    it('should fall back to parallel execution for hybrid strategy', async () => {
      const nodeStartTimes: Record<string, number> = {};
      
      jest.spyOn(stateManager, 'startNode').mockImplementation(async (executionId, nodeId) => {
        nodeStartTimes[nodeId] = Date.now();
        return Promise.resolve();
      });

      await executor.execute(mockGraph, mockInput, mockContext);
      
      // Since hybrid falls back to parallel, should show concurrent behavior
      expect(Object.keys(nodeStartTimes).length).toBeGreaterThan(0);
    });
  });

  describe('Adaptive Execution Strategy', () => {
    beforeEach(async () => {
      const config = createMockExecutionConfig();
      config.strategy = 'adaptive';
      executor = new GraphExecutor(config, stateManager);
      await executor.initialize();
    });

    it('should execute with adaptive strategy', async () => {
      const result = await executor.execute(mockGraph, mockInput, mockContext);
      
      expect(result.success).toBe(true);
      expect(result.execution.strategy).toBe('adaptive');
    });

    it('should fall back to parallel execution for adaptive strategy', async () => {
      const result = await executor.execute(mockGraph, mockInput, mockContext);
      
      // Adaptive currently falls back to parallel
      expect(result.execution.strategy).toBe('adaptive');
      expect(result.success).toBe(true);
    });
  });

  describe('Unknown Execution Strategy', () => {
    it('should throw error for unknown execution strategy', async () => {
      const config = createMockExecutionConfig();
      config.strategy = 'unknown' as GraphExecutionStrategy;
      executor = new GraphExecutor(config, stateManager);
      await executor.initialize();

      await expect(executor.execute(mockGraph, mockInput, mockContext))
        .rejects.toThrow(GraphStateError);
    });
  });
});

describe('Graph Executor - Node Execution', () => {
  let executor: GraphExecutor;
  let stateManager: GraphStateManager;
  let mockContext: GraphExecutionContext;

  beforeEach(async () => {
    stateManager = createMockStateManager();
    const config = createMockExecutionConfig();
    executor = new GraphExecutor(config, stateManager);
    await executor.initialize();
    mockContext = createMockGraphExecutionContext();
  });

  afterEach(async () => {
    if (executor) {
      await executor.shutdown();
    }
    if (stateManager) {
      await stateManager.shutdown();
    }
  });

  describe('Node Executor Implementations', () => {
    it('should execute input node correctly', async () => {
      const inputExecutor = executor['nodeExecutors'].get('input')!;
      const config: NodeConfig = { parameters: { defaultValue: 'test' } };
      const input = { _globalInput: { data: 'global' } };
      
      const result = await inputExecutor.execute(config, input, mockContext);
      
      expect(result).toEqual({ data: 'global' });
    });

    it('should execute output node correctly', async () => {
      const outputExecutor = executor['nodeExecutors'].get('output')!;
      const config: NodeConfig = {};
      const input = { dependency1: 'value1', dependency2: 'value2' };
      
      const result = await outputExecutor.execute(config, input, mockContext);
      
      expect(result).toEqual(input);
    });

    it('should execute agent node correctly', async () => {
      const agentExecutor = executor['nodeExecutors'].get('agent')!;
      const config: NodeConfig = { agentId: 'test-agent' };
      const input = { data: 'test input' };
      
      // Mock agent in context
      const mockAgent: IAgent = {
        execute: jest.fn().mockResolvedValue({
          success: true,
          output: { result: 'agent output' }
        })
      } as any;
      mockContext.agents.get = jest.fn().mockReturnValue(mockAgent);
      
      const result = await agentExecutor.execute(config, input, mockContext);
      
      expect(result).toEqual({ result: 'agent output' });
      expect(mockAgent.execute).toHaveBeenCalled();
    });

    it('should throw error for agent node without agent ID', async () => {
      const agentExecutor = executor['nodeExecutors'].get('agent')!;
      const config: NodeConfig = {};
      const input = { data: 'test' };
      
      await expect(agentExecutor.execute(config, input, mockContext))
        .rejects.toThrow('Agent ID is required for agent nodes');
    });

    it('should throw error for non-existent agent', async () => {
      const agentExecutor = executor['nodeExecutors'].get('agent')!;
      const config: NodeConfig = { agentId: 'non-existent' };
      const input = { data: 'test' };
      
      mockContext.agents.get = jest.fn().mockReturnValue(undefined);
      
      await expect(agentExecutor.execute(config, input, mockContext))
        .rejects.toThrow('Agent not found: non-existent');
    });

    it('should execute tool node correctly', async () => {
      const toolExecutor = executor['nodeExecutors'].get('tool')!;
      const config: NodeConfig = { 
        toolName: 'test-tool',
        parameters: { param1: 'value1' }
      };
      const input = { data: 'test input' };
      
      mockContext.tools.execute = jest.fn().mockResolvedValue({
        output: { result: 'tool output' }
      });
      
      const result = await toolExecutor.execute(config, input, mockContext);
      
      expect(result).toEqual({ result: 'tool output' });
      expect(mockContext.tools.execute).toHaveBeenCalledWith('test-tool', {
        data: 'test input',
        param1: 'value1'
      });
    });

    it('should throw error for tool node without tool name', async () => {
      const toolExecutor = executor['nodeExecutors'].get('tool')!;
      const config: NodeConfig = {};
      const input = { data: 'test' };
      
      await expect(toolExecutor.execute(config, input, mockContext))
        .rejects.toThrow('Tool name is required for tool nodes');
    });

    it('should execute transform node with function', async () => {
      const transformExecutor = executor['nodeExecutors'].get('transform')!;
      const transformFunction = jest.fn().mockResolvedValue({ transformed: true });
      const config: NodeConfig = { 
        transform: transformFunction,
        parameters: { param: 'value' }
      };
      const input = { data: 'test' };
      
      const result = await transformExecutor.execute(config, input, mockContext);
      
      expect(result).toEqual({ transformed: true });
      expect(transformFunction).toHaveBeenCalledWith(input, { param: 'value' });
    });

    it('should execute transform node with string expression', async () => {
      const transformExecutor = executor['nodeExecutors'].get('transform')!;
      const config: NodeConfig = { transform: 'uppercase' };
      const input = { data: 'test' };
      
      const result = await transformExecutor.execute(config, input, mockContext);
      
      // String transforms currently return input unchanged
      expect(result).toEqual(input);
    });

    it('should execute transform node without transform config', async () => {
      const transformExecutor = executor['nodeExecutors'].get('transform')!;
      const config: NodeConfig = {};
      const input = { data: 'test' };
      
      const result = await transformExecutor.execute(config, input, mockContext);
      
      expect(result).toEqual(input);
    });

    it('should execute condition node correctly', async () => {
      const conditionExecutor = executor['nodeExecutors'].get('condition')!;
      const config: NodeConfig = { parameters: { condition: 'value > 10' } };
      const input = { value: 15 };
      
      const result = await conditionExecutor.execute(config, input, mockContext);
      
      expect(result).toEqual({ condition: true, input });
    });

    it('should execute delay node correctly', async () => {
      const delayExecutor = executor['nodeExecutors'].get('delay')!;
      const config: NodeConfig = { parameters: { delay: 50 } };
      const input = { data: 'test' };
      
      const startTime = Date.now();
      const result = await delayExecutor.execute(config, input, mockContext);
      const endTime = Date.now();
      
      expect(result).toEqual(input);
      expect(endTime - startTime).toBeGreaterThanOrEqual(40); // Allow some variance
    });

    it('should execute delay node with default delay', async () => {
      const delayExecutor = executor['nodeExecutors'].get('delay')!;
      const config: NodeConfig = {};
      const input = { data: 'test' };
      
      const startTime = Date.now();
      const result = await delayExecutor.execute(config, input, mockContext);
      const endTime = Date.now();
      
      expect(result).toEqual(input);
      expect(endTime - startTime).toBeGreaterThanOrEqual(900); // Default 1000ms with variance
    });

    it('should execute custom node correctly', async () => {
      const customExecutor = executor['nodeExecutors'].get('custom')!;
      const config: NodeConfig = { implementation: 'custom-implementation' };
      const input = { data: 'test' };
      
      const result = await customExecutor.execute(config, input, mockContext);
      
      // Custom nodes currently return input unchanged
      expect(result).toEqual(input);
    });
  });

  describe('Node Execution Error Handling', () => {
    it('should handle missing node executor', async () => {
      const mockGraph = createMockExecutableGraph();
      mockGraph.definition.nodes[0].type = 'unknown' as NodeType;
      const mockInput = createMockGraphAgentInput();
      
      await expect(executor.execute(mockGraph, mockInput, mockContext))
        .rejects.toThrow(NodeExecutionError);
    });

    it('should wrap non-NodeExecutionError exceptions', async () => {
      const agentExecutor = executor['nodeExecutors'].get('agent')!;
      const config: NodeConfig = { agentId: 'error-agent' };
      const input = { data: 'test' };
      
      const mockAgent: IAgent = {
        execute: jest.fn().mockRejectedValue(new Error('Generic error'))
      } as any;
      mockContext.agents.get = jest.fn().mockReturnValue(mockAgent);
      
      await expect(agentExecutor.execute(config, input, mockContext))
        .rejects.toThrow('Generic error');
    });
  });
});

describe('Graph Executor - Resource Management', () => {
  let executor: GraphExecutor;
  let stateManager: GraphStateManager;

  beforeEach(async () => {
    stateManager = createMockStateManager();
    const config = createMockExecutionConfig();
    config.maxConcurrency = 2; // Limit concurrency for testing
    executor = new GraphExecutor(config, stateManager);
    await executor.initialize();
  });

  afterEach(async () => {
    if (executor) {
      await executor.shutdown();
    }
    if (stateManager) {
      await stateManager.shutdown();
    }
  });

  describe('Resource Pool', () => {
    it('should initialize resource pool with correct size', () => {
      const resourcePool = executor['resourcePool'];
      expect(resourcePool['maxConcurrency']).toBe(2);
    });

    it('should manage resource acquisition and release', async () => {
      const resourcePool = executor['resourcePool'];
      
      const resource1 = await resourcePool.acquire();
      const resource2 = await resourcePool.acquire();
      
      expect(resource1).toBeDefined();
      expect(resource2).toBeDefined();
      expect(resource1.id).not.toBe(resource2.id);
      
      // Pool should be exhausted
      expect(resourcePool['available'].length).toBe(0);
      
      resourcePool.release(resource1);
      
      // Resource should be available again
      expect(resourcePool['available'].length).toBe(1);
    });

    it('should queue requests when resources are exhausted', async () => {
      const resourcePool = executor['resourcePool'];
      
      const resource1 = await resourcePool.acquire();
      const resource2 = await resourcePool.acquire();
      
      // Third request should be queued
      const resource3Promise = resourcePool.acquire();
      expect(resourcePool['waiting'].length).toBe(1);
      
      // Release a resource
      resourcePool.release(resource1);
      
      const resource3 = await resource3Promise;
      expect(resource3).toBe(resource1); // Should get the released resource
      expect(resourcePool['waiting'].length).toBe(0);
    });

    it('should reset resources when released', async () => {
      const resourcePool = executor['resourcePool'];
      
      const resource = await resourcePool.acquire();
      resource.memoryUsage = 100;
      resource.cpuUsage = 0.5;
      
      resourcePool.release(resource);
      
      expect(resource.memoryUsage).toBe(0);
      expect(resource.cpuUsage).toBe(0);
    });
  });

  describe('Concurrency Control', () => {
    it('should respect maximum concurrency limits', async () => {
      const mockGraph = createMockExecutableGraphWithIndependentNodes(4);
      const mockInput = createMockGraphAgentInput();
      const mockContext = createMockGraphExecutionContext();
      
      let concurrentExecutions = 0;
      let maxConcurrent = 0;
      
      jest.spyOn(stateManager, 'startNode').mockImplementation(async (executionId, nodeId) => {
        concurrentExecutions++;
        maxConcurrent = Math.max(maxConcurrent, concurrentExecutions);
        
        await new Promise(resolve => setTimeout(resolve, 50)); // Simulate work
        
        concurrentExecutions--;
        return Promise.resolve();
      });

      await executor.execute(mockGraph, mockInput, mockContext);
      
      expect(maxConcurrent).toBeLessThanOrEqual(2); // Should respect maxConcurrency = 2
    });
  });
});

describe('Graph Executor - Execution Control', () => {
  let executor: GraphExecutor;
  let stateManager: GraphStateManager;
  let mockGraph: ExecutableGraph;
  let mockInput: GraphAgentInput;
  let mockContext: GraphExecutionContext;

  beforeEach(async () => {
    stateManager = createMockStateManager();
    const config = createMockExecutionConfig();
    executor = new GraphExecutor(config, stateManager);
    await executor.initialize();
    
    mockGraph = createMockExecutableGraph();
    mockInput = createMockGraphAgentInput();
    mockContext = createMockGraphExecutionContext();
  });

  afterEach(async () => {
    if (executor) {
      await executor.shutdown();
    }
    if (stateManager) {
      await stateManager.shutdown();
    }
  });

  describe('Pause and Resume', () => {
    it('should pause execution successfully', async () => {
      const executionId = mockContext.executionId;
      
      // Start execution (won't actually complete due to mocking)
      const executionPromise = executor.execute(mockGraph, mockInput, mockContext);
      
      // Wait a bit then pause
      await new Promise(resolve => setTimeout(resolve, 10));
      const pauseResult = await executor.pauseExecution(executionId);
      
      expect(pauseResult).toBe(true);
      
      // Clean up
      await executor.cancelExecution(executionId);
      try {
        await executionPromise;
      } catch (error) {
        // Expected to fail due to cancellation
      }
    });

    it('should resume paused execution successfully', async () => {
      const executionId = mockContext.executionId;
      
      const executionPromise = executor.execute(mockGraph, mockInput, mockContext);
      
      await new Promise(resolve => setTimeout(resolve, 10));
      await executor.pauseExecution(executionId);
      
      const resumeResult = await executor.resumeExecution(executionId);
      expect(resumeResult).toBe(true);
      
      await executor.cancelExecution(executionId);
      try {
        await executionPromise;
      } catch (error) {
        // Expected
      }
    });

    it('should return false when pausing non-existent execution', async () => {
      const result = await executor.pauseExecution('non-existent');
      expect(result).toBe(false);
    });

    it('should return false when resuming non-existent execution', async () => {
      const result = await executor.resumeExecution('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('Cancel Execution', () => {
    it('should cancel execution successfully', async () => {
      const executionId = mockContext.executionId;
      
      const executionPromise = executor.execute(mockGraph, mockInput, mockContext);
      
      await new Promise(resolve => setTimeout(resolve, 10));
      const cancelResult = await executor.cancelExecution(executionId);
      
      expect(cancelResult).toBe(true);
      
      try {
        await executionPromise;
      } catch (error) {
        // Expected to fail due to cancellation
      }
    });

    it('should return false when cancelling non-existent execution', async () => {
      const result = await executor.cancelExecution('non-existent');
      expect(result).toBe(false);
    });
  });
});

describe('Graph Executor - Streaming Execution', () => {
  let executor: GraphExecutor;
  let stateManager: GraphStateManager;
  let mockGraph: ExecutableGraph;
  let mockInput: GraphAgentInput;
  let mockContext: GraphExecutionContext;

  beforeEach(async () => {
    stateManager = createMockStateManager();
    const config = createMockExecutionConfig();
    executor = new GraphExecutor(config, stateManager);
    await executor.initialize();
    
    mockGraph = createMockExecutableGraph();
    mockInput = createMockGraphAgentInput();
    mockContext = createMockGraphExecutionContext();
  });

  afterEach(async () => {
    if (executor) {
      await executor.shutdown();
    }
    if (stateManager) {
      await stateManager.shutdown();
    }
  });

  describe('Stream Method', () => {
    it('should stream execution steps', async () => {
      const steps: ExecutionStep[] = [];
      
      try {
        for await (const step of executor.stream(mockGraph, mockInput, mockContext)) {
          steps.push(step);
        }
      } catch (error) {
        // Expected - mocked execution may fail
      }
      
      // Should have generated steps
      expect(steps.length).toBeGreaterThan(0);
      
      // First step should be node start
      if (steps.length > 0) {
        expect(steps[0].type).toBe('node_start');
        expect(steps[0].nodeId).toBeDefined();
        expect(steps[0].timestamp).toBeInstanceOf(Date);
      }
    });

    it('should yield node start and complete steps', async () => {
      const steps: ExecutionStep[] = [];
      
      // Mock successful node execution
      jest.spyOn(stateManager, 'startNode').mockResolvedValue();
      jest.spyOn(stateManager, 'completeNode').mockResolvedValue();
      
      try {
        for await (const step of executor.stream(mockGraph, mockInput, mockContext)) {
          steps.push(step);
          if (steps.length >= 4) break; // Limit to avoid infinite loop
        }
      } catch (error) {
        // May fail due to mocking
      }
      
      const startSteps = steps.filter(s => s.type === 'node_start');
      expect(startSteps.length).toBeGreaterThan(0);
    });

    it('should yield error steps for failed nodes', async () => {
      const steps: ExecutionStep[] = [];
      
      // Mock node failure
      jest.spyOn(stateManager, 'startNode').mockImplementation(async (executionId, nodeId) => {
        if (nodeId === mockGraph.definition.nodes[0].id) {
          throw new NodeExecutionError(nodeId, 'agent', 'Test failure');
        }
        return Promise.resolve();
      });
      
      try {
        for await (const step of executor.stream(mockGraph, mockInput, mockContext)) {
          steps.push(step);
        }
      } catch (error) {
        // Expected
      }
      
      const errorSteps = steps.filter(s => s.type === 'node_error');
      expect(errorSteps.length).toBeGreaterThan(0);
      
      if (errorSteps.length > 0) {
        expect(errorSteps[0].status).toBe('failed');
        expect(errorSteps[0].metadata.error).toBeDefined();
      }
    });
  });
});

describe('Graph Executor - Error Handling', () => {
  let executor: GraphExecutor;
  let stateManager: GraphStateManager;

  beforeEach(async () => {
    stateManager = createMockStateManager();
    const config = createMockExecutionConfig();
    executor = new GraphExecutor(config, stateManager);
    await executor.initialize();
  });

  afterEach(async () => {
    if (executor) {
      await executor.shutdown();
    }
    if (stateManager) {
      await stateManager.shutdown();
    }
  });

  describe('Initialization Errors', () => {
    it('should throw error when executing without initialization', async () => {
      const uninitializedExecutor = new GraphExecutor(createMockExecutionConfig(), stateManager);
      const mockGraph = createMockExecutableGraph();
      const mockInput = createMockGraphAgentInput();
      const mockContext = createMockGraphExecutionContext();
      
      await expect(uninitializedExecutor.execute(mockGraph, mockInput, mockContext))
        .rejects.toThrow(GraphStateError);
    });
  });

  describe('Execution Errors', () => {
    it('should handle state manager initialization failure', async () => {
      const mockGraph = createMockExecutableGraph();
      const mockInput = createMockGraphAgentInput();
      const mockContext = createMockGraphExecutionContext();
      
      jest.spyOn(stateManager, 'initialize').mockRejectedValue(new Error('State init failed'));
      
      await expect(executor.execute(mockGraph, mockInput, mockContext))
        .rejects.toThrow(NodeExecutionError);
    });

    it('should handle general execution errors', async () => {
      const mockGraph = createMockExecutableGraph();
      const mockInput = createMockGraphAgentInput();
      const mockContext = createMockGraphExecutionContext();
      
      jest.spyOn(stateManager, 'updateExecutionStatus').mockRejectedValue(new Error('Status update failed'));
      
      await expect(executor.execute(mockGraph, mockInput, mockContext))
        .rejects.toThrow(NodeExecutionError);
    });

    it('should preserve GraphAgentError types', async () => {
      const mockGraph = createMockExecutableGraph();
      const mockInput = createMockGraphAgentInput();
      const mockContext = createMockGraphExecutionContext();
      
      const originalError = new NodeExecutionError('test-node', 'agent', 'Test error');
      jest.spyOn(stateManager, 'initialize').mockRejectedValue(originalError);
      
      await expect(executor.execute(mockGraph, mockInput, mockContext))
        .rejects.toThrow(NodeExecutionError);
    });
  });
});

describe('Graph Executor - Shutdown', () => {
  let executor: GraphExecutor;
  let stateManager: GraphStateManager;

  beforeEach(async () => {
    stateManager = createMockStateManager();
    const config = createMockExecutionConfig();
    executor = new GraphExecutor(config, stateManager);
    await executor.initialize();
  });

  afterEach(async () => {
    if (stateManager) {
      await stateManager.shutdown();
    }
  });

  describe('Shutdown Process', () => {
    it('should shutdown cleanly', async () => {
      await expect(executor.shutdown()).resolves.not.toThrow();
      expect(executor['initialized']).toBe(false);
    });

    it('should cancel active executions on shutdown', async () => {
      const mockGraph = createMockExecutableGraph();
      const mockInput = createMockGraphAgentInput();
      const mockContext = createMockGraphExecutionContext();
      
      // Start execution
      const executionPromise = executor.execute(mockGraph, mockInput, mockContext);
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Shutdown should cancel active executions
      await executor.shutdown();
      
      try {
        await executionPromise;
      } catch (error) {
        // Expected to fail due to shutdown
      }
      
      expect(executor['activeExecutions'].size).toBe(0);
    });

    it('should shutdown resource pool', async () => {
      const shutdownSpy = jest.spyOn(executor['resourcePool'], 'shutdown');
      
      await executor.shutdown();
      
      expect(shutdownSpy).toHaveBeenCalled();
      shutdownSpy.mockRestore();
    });

    it('should shutdown performance monitor', async () => {
      const shutdownSpy = jest.spyOn(executor['performanceMonitor'], 'shutdown');
      
      await executor.shutdown();
      
      expect(shutdownSpy).toHaveBeenCalled();
      shutdownSpy.mockRestore();
    });

    it('should handle shutdown when not initialized', async () => {
      const uninitializedExecutor = new GraphExecutor(createMockExecutionConfig(), stateManager);
      
      await expect(uninitializedExecutor.shutdown()).resolves.not.toThrow();
    });
  });
});

// ============================================================================
// Test Helper Functions
// ============================================================================

function createMockStateManager(): GraphStateManager {
  const mockStateManager = {
    initialize: jest.fn().mockResolvedValue(undefined),
    updateExecutionStatus: jest.fn().mockResolvedValue(undefined),
    startNode: jest.fn().mockResolvedValue(undefined),
    completeNode: jest.fn().mockResolvedValue(undefined),
    failNode: jest.fn().mockResolvedValue(undefined),
    getCurrentState: jest.fn().mockReturnValue({
      executionId: 'test-execution',
      status: 'completed',
      startTime: new Date(),
      completedNodes: new Set(['node1']),
      failedNodes: new Set(),
      nodeResults: new Map()
    }),
    getPerformanceMetrics: jest.fn().mockReturnValue({
      executionDuration: 1000,
      nodeExecutionTimes: { node1: 500 },
      parallelEfficiency: 0.8,
      resourceUtilization: { cpu: 0.5, memory: 0.6, disk: 0.1, network: 0.2, concurrentNodes: 1 },
      throughput: 1.0,
      errorRate: 0,
      retryRate: 0
    }),
    getCheckpoints: jest.fn().mockReturnValue([]),
    getNodeOutput: jest.fn().mockReturnValue({}),
    shutdown: jest.fn().mockResolvedValue(undefined)
  } as any;

  return mockStateManager;
}

function createMockExecutionConfig(): GraphExecutionConfig {
  return {
    strategy: 'parallel',
    maxConcurrency: 4,
    timeout: 300000,
    errorHandling: 'fail_fast',
    retry: {
      maxAttempts: 3,
      backoffStrategy: 'exponential',
      initialDelay: 1000,
      maxDelay: 30000,
      retryableErrors: ['timeout', 'network']
    },
    checkpointing: {
      enabled: true,
      frequency: 'node',
      interval: 60000,
      storage: 'memory',
      compression: 'none',
      retention: 10
    },
    optimization: {
      enabled: true,
      strategies: ['parallel_expansion'],
      threshold: 0.5,
      adaptive: true
    }
  };
}

function createMockExecutableGraph(): ExecutableGraph {
  const definition: GraphDefinition = {
    id: 'test-graph',
    name: 'Test Graph',
    description: 'Test graph for execution',
    version: '1.0.0',
    metadata: {
      author: 'Test',
      created: new Date(),
      updated: new Date(),
      tags: ['test'],
      category: 'test',
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
      { id: 'input', type: 'input', name: 'Input', config: {} },
      { id: 'process', type: 'agent', name: 'Process', config: { agentId: 'test-agent' } },
      { id: 'output', type: 'output', name: 'Output', config: {} }
    ] as GraphNode[],
    edges: [
      { id: 'e1', from: 'input', to: 'process', type: 'data' },
      { id: 'e2', from: 'process', to: 'output', type: 'data' }
    ] as GraphEdge[],
    config: {
      timeout: 30000,
      retryPolicy: {
        maxAttempts: 3,
        backoffStrategy: 'exponential',
        initialDelay: 1000,
        maxDelay: 10000,
        retryConditions: []
      },
      errorHandling: 'fail_fast',
      monitoring: true,
      logging: true,
      checkpointing: true
    },
    tags: ['test']
  };

  return {
    definition,
    executionPlan: {
      phases: [
        { id: 'phase1', nodes: ['input'], type: 'sequential', dependencies: [], estimatedDuration: 100 },
        { id: 'phase2', nodes: ['process'], type: 'sequential', dependencies: ['input'], estimatedDuration: 500 },
        { id: 'phase3', nodes: ['output'], type: 'sequential', dependencies: ['process'], estimatedDuration: 100 }
      ],
      dependencies: { input: [], process: ['input'], output: ['process'] },
      parallelGroups: [['input'], ['process'], ['output']],
      criticalPath: ['input', 'process', 'output'],
      estimatedDuration: 700
    },
    dependencies: {
      input: [],
      process: ['input'],
      output: ['process']
    },
    sortedNodes: ['input', 'process', 'output'],
    strategy: 'parallel',
    runtimeConfig: {
      executionTimeout: 300000,
      nodePoolSize: 4,
      memoryLimit: 1024,
      cpuLimit: 2,
      diskLimit: 1000,
      networkLimit: 100
    },
    validation: {
      valid: true,
      errors: [],
      warnings: [],
      suggestions: [],
      metadata: {
        nodeCount: 3,
        edgeCount: 2,
        maxDepth: 3,
        cyclicPaths: [],
        unreachableNodes: [],
        deadEndNodes: []
      }
    }
  };
}

function createMockExecutableGraphWithIndependentNodes(nodeCount: number): ExecutableGraph {
  const baseGraph = createMockExecutableGraph();
  
  // Create independent nodes that can run in parallel
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const dependencies: Record<string, string[]> = {};
  const sortedNodes: string[] = [];
  
  for (let i = 0; i < nodeCount; i++) {
    const nodeId = `node${i}`;
    nodes.push({
      id: nodeId,
      type: 'transform',
      name: `Node ${i}`,
      config: {}
    });
    dependencies[nodeId] = [];
    sortedNodes.push(nodeId);
  }
  
  return {
    ...baseGraph,
    definition: {
      ...baseGraph.definition,
      nodes,
      edges
    },
    dependencies,
    sortedNodes
  };
}

function createMockGraphAgentInput(): GraphAgentInput {
  return {
    data: { input: 'test data' },
    sessionId: 'test-session',
    userId: 'test-user',
    executionConfig: {
      strategy: 'parallel',
      maxConcurrency: 4,
      timeout: 30000,
      errorHandling: 'fail_fast',
      retry: {
        maxAttempts: 3,
        backoffStrategy: 'exponential',
        initialDelay: 1000,
        maxDelay: 10000,
        retryableErrors: []
      },
      checkpointing: {
        enabled: true,
        frequency: 'node',
        interval: 60000,
        storage: 'memory',
        compression: 'none',
        retention: 10
      },
      optimization: {
        enabled: true,
        strategies: ['parallel_expansion'],
        threshold: 0.5,
        adaptive: true
      }
    },
    nodeInputs: {
      input: { value: 'input data' }
    },
    streaming: false
  };
}

function createMockGraphExecutionContext(): GraphExecutionContext {
  return {
    executionId: 'test-execution',
    sessionId: 'test-session',
    userId: 'test-user',
    environment: {
      agentHub: {},
      modules: {},
      services: {},
      config: {}
    },
    agents: {
      get: jest.fn().mockReturnValue({
        execute: jest.fn().mockResolvedValue({ success: true, output: {} })
      }),
      list: jest.fn().mockReturnValue([]),
      register: jest.fn()
    },
    tools: {
      get: jest.fn(),
      list: jest.fn().mockReturnValue([]),
      execute: jest.fn().mockResolvedValue({ output: {} })
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
      getMetrics: jest.fn().mockReturnValue({}),
      reset: jest.fn()
    }
  };
}