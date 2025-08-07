/**
 * @fileoverview Graph Agent module exports
 * @module agents/graph
 * @requires ./graph-agent
 * @requires ./graph-builder
 * @requires ./graph-state-manager
 * @requires ./graph-executor
 * @requires ./factory
 * @requires ./types
 * @requires ./errors
 * 
 * This file provides the main exports for the Graph Agent module, making
 * all core functionality available through a single import point. It exports
 * classes, interfaces, types, utilities, and factory functions for creating
 * and working with graph-based workflow agents.
 * 
 * Key exports:
 * - Main GraphAgent class and factory functions
 * - GraphBuilder for fluent graph construction
 * - Type definitions and interfaces
 * - Error classes for handling graph failures
 * - Utility functions and helpers
 * - Predefined templates and presets
 * 
 * @example
 * ```typescript
 * import { 
 *   GraphAgent, 
 *   GraphBuilder,
 *   GraphAgentFactory,
 *   createBasicGraphAgent
 * } from './agents/graph';
 * 
 * // Create agent using factory
 * const agent = createBasicGraphAgent('My Agent');
 * 
 * // Build a graph
 * const graph = new GraphBuilder()
 *   .addInputNode('start')
 *   .addAgentNode('process', 'text-processor')
 *   .addOutputNode('end')
 *   .connectNodes('start', 'process')
 *   .connectNodes('process', 'end')
 *   .build();
 * 
 * // Execute workflow
 * const result = await agent.execute({
 *   data: { text: 'Hello world' },
 *   sessionId: 'session-123',
 *   graph
 * });
 * ```
 * 
 * @since 1.0.0
 */

// ============================================================================
// Core Classes
// ============================================================================

export { GraphAgent } from './graph-agent';
export { GraphBuilder } from './graph-builder';
export { GraphStateManager } from './graph-state-manager';
export { GraphExecutor } from './graph-executor';

// ============================================================================
// Factory and Utilities
// ============================================================================

export { 
  GraphAgentFactory,
  createBasicGraphAgent,
  createHighPerformanceGraphAgent,
  createDataProcessingGraphAgent,
  BUILTIN_TEMPLATES
} from './factory';

// ============================================================================
// Type Definitions and Interfaces
// ============================================================================

export type {
  // Core Agent Types
  GraphAgentType,
  GraphAgentConfig,
  GraphAgentInput,
  GraphAgentOutput,
  GraphAgentStreamOutput,
  GraphAgentCapabilities,
  IGraphAgent,
  
  // Graph Structure Types
  GraphDefinition,
  GraphNode,
  GraphEdge,
  NodeType,
  EdgeType,
  NodeConfig,
  EdgeConfig,
  
  // Execution Types
  ExecutableGraph,
  GraphExecutionContext,
  GraphExecutionMetadata,
  GraphExecutionState,
  GraphExecutionStatus,
  GraphExecutionStrategy,
  GraphExecutionProgress,
  GraphExecutionHistory,
  ExecutionHistoryFilters,
  NodeExecutionResult,
  NodeExecutionStatus,
  ExecutionStep,
  ExecutionStepType,
  
  // Configuration Types
  GraphExecutionConfig,
  GraphStateConfig,
  GraphPerformanceConfig,
  GraphErrorConfig,
  GraphMonitoringConfig,
  GraphGlobalConfig,
  
  // Performance and Monitoring
  GraphPerformanceMetrics,
  GraphResourceUtilization,
  GraphPerformanceProfile,
  GraphCheckpoint,
  GraphWarning,
  
  // Builder Types
  GraphBuilder as IGraphBuilder,
  GraphValidationResult,
  GraphValidationError,
  GraphValidationWarning,
  
  // Registry Types
  NodeTypeRegistry,
  NodeFactory,
  NodeExecutor,
  
  // State Management Types
  GraphStatePersistence,
  GraphStateSerialization,
  GraphStateCompression,
  GraphStateCleanupPolicy,
  
  // Error Handling Types
  GraphErrorHandlingStrategy,
  GraphRetryConfig,
  GraphRecoveryStrategy,
  
  // Utility Types
  GraphMetadata,
  ValidationRule
} from './types';

// ============================================================================
// Error Classes
// ============================================================================

export {
  // Base Error Class
  GraphAgentError,
  
  // Specific Error Classes
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
  
  // Error Types
  type GraphErrorContext,
  type GraphErrorClassification,
  type GraphErrorCategory,
  type GraphErrorType,
  type GraphErrorSeverity,
  type GraphRecoveryStrategy as GraphErrorRecoveryStrategy,
  type GraphInitializationStep,
  type GraphCancellationSource,
  type GraphResourceType,
  type GraphStateType,
  type NodeErrorCondition,
  type GraphResourceRequirements,
  type GraphErrorAggregation,
  type GraphRecoverySuggestion,
  type RecoveryCost,
  
  // Error Utilities
  isGraphAgentError,
  isRetryableError,
  getSeverityLevel,
  createGraphErrorContext,
  aggregateErrors,
  sanitizeGraphError,
  GraphErrorRecovery,
  GRAPH_ERROR_RECOVERY_SUGGESTIONS
} from './errors';

// ============================================================================
// Constants and Enums
// ============================================================================

/**
 * Default node types supported by the graph agent.
 */
export const DEFAULT_NODE_TYPES: NodeType[] = [
  'input',
  'output',
  'agent',
  'tool',
  'transform',
  'condition',
  'parallel',
  'sequential',
  'merge',
  'split',
  'loop',
  'delay',
  'custom'
];

/**
 * Default edge types supported by the graph agent.
 */
export const DEFAULT_EDGE_TYPES: EdgeType[] = [
  'data',
  'control',
  'error',
  'conditional',
  'loop',
  'parallel',
  'dependency'
];

/**
 * Default execution strategies available.
 */
export const EXECUTION_STRATEGIES: GraphExecutionStrategy[] = [
  'sequential',
  'parallel',
  'hybrid',
  'adaptive'
];

/**
 * Default error handling strategies.
 */
export const ERROR_HANDLING_STRATEGIES: GraphErrorHandlingStrategy[] = [
  'fail_fast',
  'continue_on_error',
  'compensate',
  'retry'
];

/**
 * Performance optimization strategies.
 */
export const OPTIMIZATION_STRATEGIES = [
  'parallel_expansion',
  'node_coalescing',
  'lazy_evaluation',
  'memoization',
  'resource_pooling',
  'data_locality'
] as const;

/**
 * State persistence options.
 */
export const STATE_PERSISTENCE_OPTIONS: GraphStatePersistence[] = [
  'memory',
  'disk',
  'database',
  'remote'
];

/**
 * Monitoring and observability levels.
 */
export const MONITORING_LEVELS = [
  'none',
  'basic',
  'standard',
  'comprehensive',
  'debug'
] as const;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Creates a simple sequential graph with input, process, and output nodes.
 * 
 * @param processConfig - Configuration for the processing node
 * @returns Graph definition
 */
export function createSimpleSequentialGraph(processConfig: NodeConfig = {}): GraphDefinition {
  return {
    id: `simple-sequential-${Date.now()}`,
    nodes: [
      {
        id: 'input',
        type: 'input',
        name: 'Input',
        config: {}
      },
      {
        id: 'process',
        type: 'transform',
        name: 'Process',
        config: processConfig
      },
      {
        id: 'output',
        type: 'output',
        name: 'Output',
        config: {}
      }
    ],
    edges: [
      {
        id: 'input-process',
        from: 'input',
        to: 'process',
        type: 'data'
      },
      {
        id: 'process-output',
        from: 'process',
        to: 'output',
        type: 'data'
      }
    ],
    metadata: {
      name: 'Simple Sequential Graph',
      version: '1.0.0',
      tags: ['simple', 'sequential']
    }
  };
}

/**
 * Creates a parallel processing graph with split and merge nodes.
 * 
 * @param processorConfigs - Configurations for parallel processors
 * @returns Graph definition
 */
export function createParallelProcessingGraph(
  processorConfigs: NodeConfig[] = [{}, {}, {}]
): GraphDefinition {
  const processors = processorConfigs.map((config, index) => ({
    id: `process-${index + 1}`,
    type: 'transform' as NodeType,
    name: `Processor ${index + 1}`,
    config
  }));
  
  const edges: GraphEdge[] = [
    { id: 'input-split', from: 'input', to: 'split', type: 'data' as EdgeType }
  ];
  
  // Add split to processor edges
  processors.forEach(processor => {
    edges.push({
      id: `split-${processor.id}`,
      from: 'split',
      to: processor.id,
      type: 'data' as EdgeType
    });
  });
  
  // Add processor to merge edges
  processors.forEach(processor => {
    edges.push({
      id: `${processor.id}-merge`,
      from: processor.id,
      to: 'merge',
      type: 'data' as EdgeType
    });
  });
  
  edges.push({ id: 'merge-output', from: 'merge', to: 'output', type: 'data' as EdgeType });
  
  return {
    id: `parallel-processing-${Date.now()}`,
    nodes: [
      {
        id: 'input',
        type: 'input',
        name: 'Input',
        config: {}
      },
      {
        id: 'split',
        type: 'split',
        name: 'Split',
        config: {}
      },
      ...processors,
      {
        id: 'merge',
        type: 'merge',
        name: 'Merge',
        config: {}
      },
      {
        id: 'output',
        type: 'output',
        name: 'Output',
        config: {}
      }
    ],
    edges,
    metadata: {
      name: 'Parallel Processing Graph',
      version: '1.0.0',
      tags: ['parallel', 'high-throughput']
    }
  };
}

/**
 * Creates a conditional branching graph.
 * 
 * @param conditionConfig - Configuration for the condition node
 * @param trueBranchConfig - Configuration for the true branch
 * @param falseBranchConfig - Configuration for the false branch
 * @returns Graph definition
 */
export function createConditionalGraph(
  conditionConfig: NodeConfig = {},
  trueBranchConfig: NodeConfig = {},
  falseBranchConfig: NodeConfig = {}
): GraphDefinition {
  return {
    id: `conditional-${Date.now()}`,
    nodes: [
      {
        id: 'input',
        type: 'input',
        name: 'Input',
        config: {}
      },
      {
        id: 'condition',
        type: 'condition',
        name: 'Condition',
        config: conditionConfig
      },
      {
        id: 'true-branch',
        type: 'transform',
        name: 'True Branch',
        config: trueBranchConfig
      },
      {
        id: 'false-branch',
        type: 'transform',
        name: 'False Branch',
        config: falseBranchConfig
      },
      {
        id: 'merge',
        type: 'merge',
        name: 'Merge',
        config: {}
      },
      {
        id: 'output',
        type: 'output',
        name: 'Output',
        config: {}
      }
    ],
    edges: [
      {
        id: 'input-condition',
        from: 'input',
        to: 'condition',
        type: 'data'
      },
      {
        id: 'condition-true',
        from: 'condition',
        to: 'true-branch',
        type: 'conditional',
        config: { condition: 'true' }
      },
      {
        id: 'condition-false',
        from: 'condition',
        to: 'false-branch',
        type: 'conditional',
        config: { condition: 'false' }
      },
      {
        id: 'true-merge',
        from: 'true-branch',
        to: 'merge',
        type: 'data'
      },
      {
        id: 'false-merge',
        from: 'false-branch',
        to: 'merge',
        type: 'data'
      },
      {
        id: 'merge-output',
        from: 'merge',
        to: 'output',
        type: 'data'
      }
    ],
    metadata: {
      name: 'Conditional Graph',
      version: '1.0.0',
      tags: ['conditional', 'branching']
    }
  };
}

/**
 * Validates a graph definition for basic structural correctness.
 * 
 * @param graph - Graph to validate
 * @returns Validation result
 */
export function validateGraphStructure(graph: GraphDefinition): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check for required fields
  if (!graph.id) errors.push('Graph must have an ID');
  if (!graph.nodes || graph.nodes.length === 0) errors.push('Graph must have at least one node');
  if (!graph.edges || graph.edges.length === 0) warnings.push('Graph has no edges');
  
  // Check node validity
  const nodeIds = new Set<string>();
  for (const node of graph.nodes) {
    if (!node.id) errors.push('All nodes must have an ID');
    if (nodeIds.has(node.id)) errors.push(`Duplicate node ID: ${node.id}`);
    nodeIds.add(node.id);
    
    if (!node.type) errors.push(`Node ${node.id} must have a type`);
    if (!DEFAULT_NODE_TYPES.includes(node.type as NodeType)) {
      warnings.push(`Node ${node.id} has non-standard type: ${node.type}`);
    }
  }
  
  // Check edge validity
  const edgeIds = new Set<string>();
  for (const edge of graph.edges) {
    if (!edge.id) errors.push('All edges must have an ID');
    if (edgeIds.has(edge.id)) errors.push(`Duplicate edge ID: ${edge.id}`);
    edgeIds.add(edge.id);
    
    if (!nodeIds.has(edge.from)) errors.push(`Edge ${edge.id} references non-existent node: ${edge.from}`);
    if (!nodeIds.has(edge.to)) errors.push(`Edge ${edge.id} references non-existent node: ${edge.to}`);
    
    if (!edge.type) errors.push(`Edge ${edge.id} must have a type`);
    if (!DEFAULT_EDGE_TYPES.includes(edge.type as EdgeType)) {
      warnings.push(`Edge ${edge.id} has non-standard type: ${edge.type}`);
    }
  }
  
  // Check for cycles (basic check)
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  
  function hasCycle(nodeId: string): boolean {
    if (recursionStack.has(nodeId)) return true;
    if (visited.has(nodeId)) return false;
    
    visited.add(nodeId);
    recursionStack.add(nodeId);
    
    for (const edge of graph.edges) {
      if (edge.from === nodeId && edge.type !== 'dependency') {
        if (hasCycle(edge.to)) return true;
      }
    }
    
    recursionStack.delete(nodeId);
    return false;
  }
  
  // Check each node for cycles
  for (const node of graph.nodes) {
    if (!visited.has(node.id)) {
      if (hasCycle(node.id)) {
        errors.push('Graph contains cycles');
        break;
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Gets performance recommendations for a graph definition.
 * 
 * @param graph - Graph to analyze
 * @returns Performance recommendations
 */
export function getPerformanceRecommendations(graph: GraphDefinition): {
  recommendations: string[];
  estimatedParallelism: number;
  resourceIntensity: 'low' | 'medium' | 'high';
  suggestedStrategy: GraphExecutionStrategy;
} {
  const recommendations: string[] = [];
  let parallelPaths = 0;
  let maxDepth = 0;
  
  // Analyze graph structure
  const nodeMap = new Map<string, GraphNode>();
  graph.nodes.forEach(node => nodeMap.set(node.id, node));
  
  // Count parallel paths and depth
  function analyzeNode(nodeId: string, depth: number = 0, visited = new Set<string>()): void {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    
    maxDepth = Math.max(maxDepth, depth);
    
    const outgoingEdges = graph.edges.filter(edge => edge.from === nodeId);
    if (outgoingEdges.length > 1) {
      parallelPaths += outgoingEdges.length;
    }
    
    outgoingEdges.forEach(edge => {
      analyzeNode(edge.to, depth + 1, new Set(visited));
    });
  }
  
  // Find root nodes (nodes with no incoming edges)
  const rootNodes = graph.nodes.filter(node => 
    !graph.edges.some(edge => edge.to === node.id)
  );
  
  rootNodes.forEach(node => analyzeNode(node.id));
  
  // Generate recommendations
  if (parallelPaths > 2) {
    recommendations.push('Consider parallel execution strategy for better performance');
  }
  
  if (maxDepth > 10) {
    recommendations.push('Deep graph detected - consider breaking into smaller subgraphs');
  }
  
  if (graph.nodes.length > 100) {
    recommendations.push('Large graph detected - enable node coalescing optimization');
  }
  
  const transformNodes = graph.nodes.filter(node => node.type === 'transform').length;
  if (transformNodes > 5) {
    recommendations.push('Multiple transform nodes - consider resource pooling');
  }
  
  // Determine resource intensity
  let resourceIntensity: 'low' | 'medium' | 'high' = 'low';
  if (graph.nodes.length > 20 || parallelPaths > 4) resourceIntensity = 'medium';
  if (graph.nodes.length > 50 || parallelPaths > 8) resourceIntensity = 'high';
  
  // Suggest execution strategy
  let suggestedStrategy: GraphExecutionStrategy = 'sequential';
  if (parallelPaths > 2) suggestedStrategy = 'parallel';
  if (parallelPaths > 5 && maxDepth > 5) suggestedStrategy = 'hybrid';
  if (resourceIntensity === 'high') suggestedStrategy = 'adaptive';
  
  return {
    recommendations,
    estimatedParallelism: Math.max(1, parallelPaths),
    resourceIntensity,
    suggestedStrategy
  };
}

// ============================================================================
// Module Metadata
// ============================================================================

/**
 * Graph Agent module version and metadata.
 */
export const GRAPH_AGENT_MODULE = {
  name: 'Graph Agent',
  version: '1.0.0',
  description: 'Comprehensive graph-based workflow agent system',
  author: 'AgentHub Team',
  license: 'MIT',
  keywords: ['graph', 'workflow', 'agent', 'orchestration', 'parallel'],
  capabilities: [
    'graph-execution',
    'workflow-orchestration',
    'parallel-processing',
    'state-management',
    'error-recovery',
    'performance-monitoring',
    'checkpointing',
    'streaming-execution'
  ],
  nodeTypes: DEFAULT_NODE_TYPES,
  edgeTypes: DEFAULT_EDGE_TYPES,
  executionStrategies: EXECUTION_STRATEGIES,
  builtinTemplates: BUILTIN_TEMPLATES.map(t => ({
    id: t.id,
    name: t.name,
    description: t.description,
    category: t.category
  }))
} as const;