/**
 * @fileoverview Comprehensive unit tests for Graph Builder
 * @module agents/graph/__tests__/graph-builder.test
 * 
 * This file provides exhaustive unit tests for the Graph Builder class,
 * covering all fluent API methods, validation logic, optimization,
 * compilation, graph patterns, and error handling scenarios.
 * 
 * Test categories:
 * - Graph Builder construction and metadata management
 * - Fluent API methods for node and edge creation
 * - Node type-specific builder methods
 * - Graph validation (structural, semantic, performance)
 * - Edge creation and connection methods
 * - Node and edge removal operations
 * - Position and configuration management
 * - Graph optimization and compilation
 * - Import/export functionality
 * - Graph merging and cloning
 * - Graph patterns and templates
 * - Error handling and edge cases
 * 
 * @since 1.0.0
 */

import {
  GraphBuilder,
  GraphPatterns
} from '../graph-builder';
import {
  GraphDefinition,
  GraphNode,
  GraphEdge,
  NodeType,
  EdgeType,
  NodeConfig,
  NodePosition,
  EdgeCondition,
  EdgeTransform,
  NodeCondition,
  NodeRetryPolicy,
  ExecutableGraph,
  GraphValidationResult,
  GraphValidationError,
  GraphGlobalConfig,
  GraphMetadata
} from '../types';
import {
  GraphValidationError as GraphValidationErrorClass,
  GraphConfigurationError
} from '../errors';

describe('Graph Builder - Construction and Metadata', () => {
  let builder: GraphBuilder;

  beforeEach(() => {
    builder = new GraphBuilder();
  });

  describe('Constructor', () => {
    it('should create builder with auto-generated ID', () => {
      const builder1 = new GraphBuilder();
      const builder2 = new GraphBuilder();
      
      expect(builder1['graphId']).toBeDefined();
      expect(builder2['graphId']).toBeDefined();
      expect(builder1['graphId']).not.toBe(builder2['graphId']);
    });

    it('should create builder with provided ID', () => {
      const customId = 'my-custom-graph';
      const builder = new GraphBuilder(customId);
      
      expect(builder['graphId']).toBe(customId);
    });

    it('should initialize with default values', () => {
      expect(builder['graphName']).toBe('');
      expect(builder['graphDescription']).toBe('');
      expect(builder['graphVersion']).toBe('1.0.0');
      expect(builder['nodes']).toHaveLength(0);
      expect(builder['edges']).toHaveLength(0);
      expect(builder['tags']).toHaveLength(0);
    });
  });

  describe('Metadata Management', () => {
    it('should set basic metadata', () => {
      const metadata = {
        name: 'Test Graph',
        description: 'A test graph for validation',
        version: '2.0.0',
        author: 'Test Author',
        tags: ['test', 'validation']
      };

      const result = builder.setMetadata(metadata);

      expect(result).toBe(builder); // Fluent API
      expect(builder['graphName']).toBe('Test Graph');
      expect(builder['graphDescription']).toBe('A test graph for validation');
      expect(builder['graphVersion']).toBe('2.0.0');
      expect(builder['tags']).toEqual(['test', 'validation']);
      expect(builder['graphMetadata'].author).toBe('Test Author');
    });

    it('should set partial metadata', () => {
      builder.setMetadata({ name: 'Partial Graph' });

      expect(builder['graphName']).toBe('Partial Graph');
      expect(builder['graphVersion']).toBe('1.0.0'); // Default preserved
    });

    it('should update timestamp on metadata changes', () => {
      const before = Date.now();
      builder.setMetadata({ name: 'Time Test' });
      const after = Date.now();

      const updated = builder['graphMetadata'].updated;
      expect(updated).toBeInstanceOf(Date);
      expect(updated!.getTime()).toBeGreaterThanOrEqual(before);
      expect(updated!.getTime()).toBeLessThanOrEqual(after);
    });

    it('should preserve existing metadata when updating', () => {
      builder.setMetadata({ author: 'First Author' });
      builder.setMetadata({ name: 'Updated Name' });

      expect(builder['graphMetadata'].author).toBe('First Author');
      expect(builder['graphName']).toBe('Updated Name');
    });
  });

  describe('Global Configuration', () => {
    it('should set global configuration', () => {
      const config: Partial<GraphGlobalConfig> = {
        timeout: 60000,
        monitoring: true,
        logging: false,
        checkpointing: true
      };

      const result = builder.setConfig(config);

      expect(result).toBe(builder); // Fluent API
      expect(builder['globalConfig'].timeout).toBe(60000);
      expect(builder['globalConfig'].monitoring).toBe(true);
      expect(builder['globalConfig'].logging).toBe(false);
    });

    it('should merge with existing configuration', () => {
      builder.setConfig({ timeout: 30000, monitoring: true });
      builder.setConfig({ logging: true });

      expect(builder['globalConfig'].timeout).toBe(30000);
      expect(builder['globalConfig'].monitoring).toBe(true);
      expect(builder['globalConfig'].logging).toBe(true);
    });
  });

  describe('Schema Management', () => {
    it('should set input schema', () => {
      const schema = {
        type: 'object',
        properties: {
          text: { type: 'string' },
          count: { type: 'number' }
        }
      };

      const result = builder.setInputSchema(schema);

      expect(result).toBe(builder); // Fluent API
      expect(builder['inputSchema']).toEqual(schema);
    });

    it('should set output schema', () => {
      const schema = {
        type: 'object',
        properties: {
          result: { type: 'string' },
          confidence: { type: 'number' }
        }
      };

      const result = builder.setOutputSchema(schema);

      expect(result).toBe(builder); // Fluent API
      expect(builder['outputSchema']).toEqual(schema);
    });
  });
});

describe('Graph Builder - Node Management', () => {
  let builder: GraphBuilder;

  beforeEach(() => {
    builder = new GraphBuilder();
  });

  describe('Generic Node Addition', () => {
    it('should add a basic node', () => {
      const node: Partial<GraphNode> = {
        id: 'test-node',
        type: 'input',
        name: 'Test Node',
        config: { parameters: { param: 'value' } }
      };

      const result = builder.addNode(node);

      expect(result).toBe(builder); // Fluent API
      expect(builder['nodes']).toHaveLength(1);
      
      const addedNode = builder['nodes'][0];
      expect(addedNode.id).toBe('test-node');
      expect(addedNode.type).toBe('input');
      expect(addedNode.name).toBe('Test Node');
      expect(addedNode.config).toEqual({ param: 'value' });
    });

    it('should throw error for node without ID', () => {
      const node: Partial<GraphNode> = {
        type: 'input'
      };

      expect(() => builder.addNode(node)).toThrow(GraphConfigurationError);
    });

    it('should throw error for node without type', () => {
      const node: Partial<GraphNode> = {
        id: 'test-node'
      };

      expect(() => builder.addNode(node)).toThrow(GraphConfigurationError);
    });

    it('should throw error for duplicate node ID', () => {
      const node1: Partial<GraphNode> = { id: 'duplicate', type: 'input' };
      const node2: Partial<GraphNode> = { id: 'duplicate', type: 'output' };

      builder.addNode(node1);
      expect(() => builder.addNode(node2)).toThrow(GraphConfigurationError);
    });

    it('should set default name when not provided', () => {
      const node: Partial<GraphNode> = { id: 'unnamed', type: 'transform' };

      builder.addNode(node);

      expect(builder['nodes'][0].name).toBe('unnamed');
    });

    it('should handle all optional properties', () => {
      const node: Partial<GraphNode> = {
        id: 'full-node',
        type: 'agent',
        name: 'Full Node',
        description: 'A fully specified node',
        config: { agentId: 'test-agent' },
        inputSchema: { type: 'string' },
        outputSchema: { type: 'object' },
        position: { x: 100, y: 200 },
        metadata: { custom: 'data' },
        timeout: 5000,
        priority: 1,
        parallel: true
      };

      builder.addNode(node);

      const addedNode = builder['nodes'][0];
      expect(addedNode.description).toBe('A fully specified node');
      expect(addedNode.position).toEqual({ x: 100, y: 200 });
      expect(addedNode.metadata).toEqual({ custom: 'data' });
      expect(addedNode.timeout).toBe(5000);
      expect(addedNode.priority).toBe(1);
      expect(addedNode.parallel).toBe(true);
    });
  });

  describe('Input Node Creation', () => {
    it('should add input node with minimal config', () => {
      const result = builder.addInputNode('input1');

      expect(result).toBe(builder); // Fluent API
      expect(builder['nodes']).toHaveLength(1);
      
      const node = builder['nodes'][0];
      expect(node.id).toBe('input1');
      expect(node.type).toBe('input');
      expect(node.name).toBe('Input: input1');
    });

    it('should add input node with custom config and options', () => {
      const config: NodeConfig = { schema: { type: 'string' } };
      const options: Partial<GraphNode> = { 
        name: 'Custom Input',
        description: 'Custom input node',
        priority: 5
      };

      builder.addInputNode('custom-input', config, options);

      const node = builder['nodes'][0];
      expect(node.id).toBe('custom-input');
      expect(node.type).toBe('input');
      expect(node.name).toBe('Custom Input');
      expect(node.description).toBe('Custom input node');
      expect(node.config).toEqual({ schema: { type: 'string' } });
      expect(node.priority).toBe(5);
    });
  });

  describe('Output Node Creation', () => {
    it('should add output node with minimal config', () => {
      builder.addOutputNode('output1');

      const node = builder['nodes'][0];
      expect(node.id).toBe('output1');
      expect(node.type).toBe('output');
      expect(node.name).toBe('Output: output1');
    });

    it('should add output node with custom config', () => {
      const config: NodeConfig = { format: 'json' };
      const options: Partial<GraphNode> = { name: 'JSON Output' };

      builder.addOutputNode('json-out', config, options);

      const node = builder['nodes'][0];
      expect(node.name).toBe('JSON Output');
      expect(node.config).toEqual({ format: 'json' });
    });
  });

  describe('Agent Node Creation', () => {
    it('should add agent node with agent ID', () => {
      builder.addAgentNode('agent1', 'test-agent');

      const node = builder['nodes'][0];
      expect(node.id).toBe('agent1');
      expect(node.type).toBe('agent');
      expect(node.name).toBe('Agent: test-agent');
      expect(node.config.agentId).toBe('test-agent');
    });

    it('should add agent node with custom config', () => {
      const config: NodeConfig = { model: 'gpt-4', temperature: 0.7 };
      const options: Partial<GraphNode> = { name: 'GPT-4 Agent' };

      builder.addAgentNode('gpt4-agent', 'gpt4', config, options);

      const node = builder['nodes'][0];
      expect(node.name).toBe('GPT-4 Agent');
      expect(node.config.agentId).toBe('gpt4');
      expect(node.config.model).toBe('gpt-4');
      expect(node.config.temperature).toBe(0.7);
    });
  });

  describe('Tool Node Creation', () => {
    it('should add tool node with tool name', () => {
      builder.addToolNode('tool1', 'file-reader');

      const node = builder['nodes'][0];
      expect(node.id).toBe('tool1');
      expect(node.type).toBe('tool');
      expect(node.name).toBe('Tool: file-reader');
      expect(node.config.toolName).toBe('file-reader');
    });

    it('should add tool node with custom config', () => {
      const config: NodeConfig = { path: '/tmp/file.txt', encoding: 'utf8' };

      builder.addToolNode('reader', 'file-reader', config);

      const node = builder['nodes'][0];
      expect(node.config.toolName).toBe('file-reader');
      expect(node.config.path).toBe('/tmp/file.txt');
      expect(node.config.encoding).toBe('utf8');
    });
  });

  describe('Transform Node Creation', () => {
    it('should add transform node with function', () => {
      const transform = (data: any) => ({ transformed: data });

      builder.addTransformNode('transform1', transform);

      const node = builder['nodes'][0];
      expect(node.id).toBe('transform1');
      expect(node.type).toBe('transform');
      expect(node.name).toBe('Transform: transform1');
      expect(node.config.transform).toBe(transform);
    });

    it('should add transform node with string expression', () => {
      builder.addTransformNode('transform2', 'toUpperCase');

      const node = builder['nodes'][0];
      expect(node.config.transform).toBe('toUpperCase');
    });

    it('should add transform node with custom config', () => {
      const config: NodeConfig = { parameters: { multiplier: 2 } };

      builder.addTransformNode('multiply', 'x => x * multiplier', config);

      const node = builder['nodes'][0];
      expect(node.config.transform).toBe('x => x * multiplier');
      expect(node.config.parameters).toEqual({ multiplier: 2 });
    });
  });

  describe('Condition Node Creation', () => {
    it('should add condition node with string condition', () => {
      builder.addConditionNode('cond1', 'value > 10');

      const node = builder['nodes'][0];
      expect(node.id).toBe('cond1');
      expect(node.type).toBe('condition');
      expect(node.name).toBe('Condition: cond1');
      expect(node.config.parameters.condition).toBe('value > 10');
    });

    it('should add condition node with function', () => {
      const condition = (data: any) => data.value > 10;

      builder.addConditionNode('func-cond', condition);

      const node = builder['nodes'][0];
      expect(node.config.parameters.condition).toBe(condition);
    });
  });

  describe('Parallel Node Creation', () => {
    it('should add parallel node with node IDs', () => {
      const nodeIds = ['node1', 'node2', 'node3'];

      builder.addParallelNode('parallel1', nodeIds);

      const node = builder['nodes'][0];
      expect(node.id).toBe('parallel1');
      expect(node.type).toBe('parallel');
      expect(node.name).toBe('Parallel: node1, node2, node3');
      expect(node.config.parameters.nodeIds).toEqual(nodeIds);
    });
  });

  describe('Delay Node Creation', () => {
    it('should add delay node with duration', () => {
      builder.addDelayNode('delay1', 5000);

      const node = builder['nodes'][0];
      expect(node.id).toBe('delay1');
      expect(node.type).toBe('delay');
      expect(node.name).toBe('Delay: 5000ms');
      expect(node.config.parameters.delay).toBe(5000);
    });

    it('should add delay node with custom config', () => {
      const config: NodeConfig = { unit: 'seconds' };

      builder.addDelayNode('wait', 10, config);

      const node = builder['nodes'][0];
      expect(node.config.parameters.delay).toBe(10);
      expect(node.config.unit).toBe('seconds');
    });
  });
});

describe('Graph Builder - Edge Management', () => {
  let builder: GraphBuilder;

  beforeEach(() => {
    builder = new GraphBuilder();
    builder.addInputNode('input');
    builder.addOutputNode('output');
    builder.addTransformNode('transform', 'identity');
  });

  describe('Generic Edge Addition', () => {
    it('should add basic edge', () => {
      const edge: Partial<GraphEdge> = {
        from: 'input',
        to: 'output'
      };

      const result = builder.addEdge(edge);

      expect(result).toBe(builder); // Fluent API
      expect(builder['edges']).toHaveLength(1);
      
      const addedEdge = builder['edges'][0];
      expect(addedEdge.from).toBe('input');
      expect(addedEdge.to).toBe('output');
      expect(addedEdge.type).toBe('data'); // Default type
      expect(addedEdge.id).toBe('input->output');
    });

    it('should throw error for edge without from node', () => {
      const edge: Partial<GraphEdge> = { to: 'output' };

      expect(() => builder.addEdge(edge)).toThrow(GraphConfigurationError);
    });

    it('should throw error for edge without to node', () => {
      const edge: Partial<GraphEdge> = { from: 'input' };

      expect(() => builder.addEdge(edge)).toThrow(GraphConfigurationError);
    });

    it('should throw error for non-existent source node', () => {
      const edge: Partial<GraphEdge> = { from: 'nonexistent', to: 'output' };

      expect(() => builder.addEdge(edge)).toThrow(GraphConfigurationError);
    });

    it('should throw error for non-existent target node', () => {
      const edge: Partial<GraphEdge> = { from: 'input', to: 'nonexistent' };

      expect(() => builder.addEdge(edge)).toThrow(GraphConfigurationError);
    });

    it('should throw error for duplicate edge', () => {
      const edge: Partial<GraphEdge> = { from: 'input', to: 'output' };

      builder.addEdge(edge);
      expect(() => builder.addEdge(edge)).toThrow(GraphConfigurationError);
    });

    it('should handle full edge specification', () => {
      const edge: Partial<GraphEdge> = {
        id: 'custom-edge',
        from: 'input',
        to: 'transform',
        type: 'control',
        label: 'Control Flow',
        condition: { type: 'success' },
        transform: { type: 'map', function: 'identity' },
        metadata: { weight: 1 },
        priority: 5,
        errorHandling: true
      };

      builder.addEdge(edge);

      const addedEdge = builder['edges'][0];
      expect(addedEdge.id).toBe('custom-edge');
      expect(addedEdge.type).toBe('control');
      expect(addedEdge.label).toBe('Control Flow');
      expect(addedEdge.condition).toEqual({ type: 'success' });
      expect(addedEdge.transform).toEqual({ type: 'map', function: 'identity' });
      expect(addedEdge.metadata).toEqual({ weight: 1 });
      expect(addedEdge.priority).toBe(5);
      expect(addedEdge.errorHandling).toBe(true);
    });
  });

  describe('Node Connection Methods', () => {
    it('should connect nodes with simple edge', () => {
      builder.connectNodes('input', 'transform');

      expect(builder['edges']).toHaveLength(1);
      const edge = builder['edges'][0];
      expect(edge.from).toBe('input');
      expect(edge.to).toBe('transform');
      expect(edge.type).toBe('data');
    });

    it('should connect nodes with options', () => {
      const options: Partial<GraphEdge> = {
        type: 'control',
        label: 'Control Edge',
        priority: 3
      };

      builder.connectNodes('input', 'transform', options);

      const edge = builder['edges'][0];
      expect(edge.type).toBe('control');
      expect(edge.label).toBe('Control Edge');
      expect(edge.priority).toBe(3);
    });

    it('should connect with conditional edge', () => {
      const condition: EdgeCondition = {
        type: 'custom',
        expression: 'data.value > 0'
      };

      builder.connectConditional('input', 'transform', condition);

      const edge = builder['edges'][0];
      expect(edge.type).toBe('conditional');
      expect(edge.condition).toEqual(condition);
    });

    it('should connect with transform edge', () => {
      const transform: EdgeTransform = {
        type: 'map',
        function: 'toUpperCase'
      };

      builder.connectTransform('input', 'transform', transform);

      const edge = builder['edges'][0];
      expect(edge.transform).toEqual(transform);
    });
  });
});

describe('Graph Builder - Node Configuration', () => {
  let builder: GraphBuilder;

  beforeEach(() => {
    builder = new GraphBuilder();
    builder.addInputNode('test-node');
  });

  describe('Node Position Management', () => {
    it('should set node position', () => {
      const position: NodePosition = { x: 100, y: 200, z: 5 };

      const result = builder.setNodePosition('test-node', position);

      expect(result).toBe(builder); // Fluent API
      
      const node = builder['nodes'].find(n => n.id === 'test-node')!;
      expect(node.position).toEqual(position);
    });

    it('should throw error for non-existent node', () => {
      const position: NodePosition = { x: 100, y: 200 };

      expect(() => builder.setNodePosition('nonexistent', position))
        .toThrow(GraphConfigurationError);
    });
  });

  describe('Node Retry Policy Management', () => {
    it('should set node retry policy', () => {
      const retryPolicy: NodeRetryPolicy = {
        maxAttempts: 5,
        backoffStrategy: 'exponential',
        initialDelay: 2000,
        maxDelay: 30000,
        retryConditions: ['timeout', 'network']
      };

      const result = builder.setNodeRetryPolicy('test-node', retryPolicy);

      expect(result).toBe(builder); // Fluent API
      
      const node = builder['nodes'].find(n => n.id === 'test-node')!;
      expect(node.retry).toEqual(retryPolicy);
    });

    it('should throw error for non-existent node', () => {
      const retryPolicy: NodeRetryPolicy = {
        maxAttempts: 3,
        backoffStrategy: 'linear',
        initialDelay: 1000,
        maxDelay: 10000,
        retryConditions: []
      };

      expect(() => builder.setNodeRetryPolicy('nonexistent', retryPolicy))
        .toThrow(GraphConfigurationError);
    });
  });

  describe('Node Conditions Management', () => {
    it('should set node conditions', () => {
      const conditions: NodeCondition[] = [
        { type: 'input', expression: 'data.valid === true' },
        { type: 'state', expression: 'context.ready' }
      ];

      const result = builder.setNodeConditions('test-node', conditions);

      expect(result).toBe(builder); // Fluent API
      
      const node = builder['nodes'].find(n => n.id === 'test-node')!;
      expect(node.conditions).toEqual(conditions);
    });

    it('should throw error for non-existent node', () => {
      const conditions: NodeCondition[] = [
        { type: 'custom', expression: 'always true' }
      ];

      expect(() => builder.setNodeConditions('nonexistent', conditions))
        .toThrow(GraphConfigurationError);
    });
  });
});

describe('Graph Builder - Removal Operations', () => {
  let builder: GraphBuilder;

  beforeEach(() => {
    builder = new GraphBuilder();
    builder.addInputNode('input');
    builder.addTransformNode('transform', 'identity');
    builder.addOutputNode('output');
    builder.connectNodes('input', 'transform');
    builder.connectNodes('transform', 'output');
  });

  describe('Node Removal', () => {
    it('should remove node and its edges', () => {
      const result = builder.removeNode('transform');

      expect(result).toBe(builder); // Fluent API
      expect(builder['nodes']).toHaveLength(2);
      expect(builder['edges']).toHaveLength(0); // All edges removed
      
      const nodeIds = builder['nodes'].map(n => n.id);
      expect(nodeIds).not.toContain('transform');
      expect(nodeIds).toContain('input');
      expect(nodeIds).toContain('output');
    });

    it('should throw error for non-existent node', () => {
      expect(() => builder.removeNode('nonexistent'))
        .toThrow(GraphConfigurationError);
    });

    it('should only remove connected edges', () => {
      builder.addInputNode('isolated');

      builder.removeNode('transform');

      expect(builder['nodes']).toHaveLength(3);
      expect(builder['edges']).toHaveLength(0);
    });
  });

  describe('Edge Removal', () => {
    it('should remove specific edge', () => {
      const result = builder.removeEdge('input', 'transform');

      expect(result).toBe(builder); // Fluent API
      expect(builder['edges']).toHaveLength(1);
      
      const remainingEdge = builder['edges'][0];
      expect(remainingEdge.from).toBe('transform');
      expect(remainingEdge.to).toBe('output');
    });

    it('should throw error for non-existent edge', () => {
      expect(() => builder.removeEdge('input', 'output'))
        .toThrow(GraphConfigurationError);
    });
  });
});

describe('Graph Builder - Validation', () => {
  let builder: GraphBuilder;

  beforeEach(() => {
    builder = new GraphBuilder();
  });

  describe('Structural Validation', () => {
    it('should pass validation for valid simple graph', () => {
      builder.addInputNode('input');
      builder.addOutputNode('output');
      builder.connectNodes('input', 'output');

      const result = builder.validate();

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.metadata.nodeCount).toBe(2);
      expect(result.metadata.edgeCount).toBe(1);
      expect(result.metadata.cyclicPaths).toHaveLength(0);
    });

    it('should fail validation for empty graph', () => {
      expect(() => builder.validate()).toThrow(GraphValidationErrorClass);
    });

    it('should detect cycles', () => {
      builder.addInputNode('a');
      builder.addTransformNode('b', 'identity');
      builder.addTransformNode('c', 'identity');
      builder.connectNodes('a', 'b');
      builder.connectNodes('b', 'c');
      builder.connectNodes('c', 'b'); // Creates cycle

      expect(() => builder.validate()).toThrow(GraphValidationErrorClass);
    });

    it('should warn about disconnected components', () => {
      builder.addInputNode('input1');
      builder.addOutputNode('output1');
      builder.addInputNode('input2');
      builder.addOutputNode('output2');
      builder.connectNodes('input1', 'output1');
      builder.connectNodes('input2', 'output2');

      const result = builder.validate();

      expect(result.warnings.some(w => w.code === 'DISCONNECTED_COMPONENTS')).toBe(true);
    });

    it('should warn about unreachable nodes', () => {
      builder.addInputNode('input');
      builder.addOutputNode('output');
      builder.addTransformNode('unreachable', 'identity');
      builder.connectNodes('input', 'output');

      const result = builder.validate();

      expect(result.warnings.some(w => w.code === 'UNREACHABLE_NODES')).toBe(true);
    });

    it('should warn about dead-end nodes', () => {
      builder.addInputNode('input');
      builder.addTransformNode('deadend', 'identity');
      builder.addOutputNode('output');
      builder.connectNodes('input', 'deadend');
      builder.connectNodes('input', 'output');

      const result = builder.validate();

      expect(result.warnings.some(w => w.code === 'DEAD_END_NODES')).toBe(true);
    });

    it('should suggest adding input/output nodes', () => {
      builder.addTransformNode('transform', 'identity');

      const result = builder.validate();

      expect(result.suggestions.some(s => s.code === 'ADD_INPUT_NODE')).toBe(true);
      expect(result.suggestions.some(s => s.code === 'ADD_OUTPUT_NODE')).toBe(true);
    });
  });

  describe('Semantic Validation', () => {
    it('should validate agent node configuration', () => {
      builder.addNode({ id: 'agent', type: 'agent', config: {} }); // Missing agentId

      expect(() => builder.validate()).toThrow(GraphValidationErrorClass);
    });

    it('should validate tool node configuration', () => {
      builder.addNode({ id: 'tool', type: 'tool', config: {} }); // Missing toolName

      expect(() => builder.validate()).toThrow(GraphValidationErrorClass);
    });

    it('should validate transform node configuration', () => {
      builder.addNode({ id: 'transform', type: 'transform', config: {} }); // Missing transform

      expect(() => builder.validate()).toThrow(GraphValidationErrorClass);
    });

    it('should suggest retry policies for critical nodes', () => {
      builder.addAgentNode('agent', 'test-agent');

      const result = builder.validate();

      expect(result.suggestions.some(s => s.code === 'ADD_RETRY_POLICY')).toBe(true);
    });

    it('should validate conditional edges have conditions', () => {
      builder.addInputNode('input');
      builder.addOutputNode('output');
      builder.addEdge({
        from: 'input',
        to: 'output',
        type: 'conditional'
        // Missing condition
      });

      expect(() => builder.validate()).toThrow(GraphValidationErrorClass);
    });

    it('should validate transform edges have functions', () => {
      builder.addInputNode('input');
      builder.addOutputNode('output');
      builder.addEdge({
        from: 'input',
        to: 'output',
        transform: { type: 'map' }
        // Missing function
      });

      expect(() => builder.validate()).toThrow(GraphValidationErrorClass);
    });
  });

  describe('Performance Validation', () => {
    it('should warn about high complexity graphs', () => {
      // Create a complex graph (>50 nodes + edges)
      for (let i = 0; i < 30; i++) {
        builder.addTransformNode(`node${i}`, 'identity');
      }
      for (let i = 0; i < 25; i++) {
        builder.connectNodes(`node${i}`, `node${i + 1}`);
      }

      const result = builder.validate();

      expect(result.warnings.some(w => w.code === 'HIGH_COMPLEXITY')).toBe(true);
      expect(result.suggestions.some(s => s.code === 'OPTIMIZE_COMPLEXITY')).toBe(true);
    });

    it('should detect potential bottlenecks', () => {
      builder.addInputNode('input');
      builder.addTransformNode('bottleneck', 'identity');
      
      // Create many connections to create a bottleneck
      for (let i = 0; i < 8; i++) {
        builder.addOutputNode(`output${i}`);
        builder.connectNodes('bottleneck', `output${i}`);
      }
      builder.connectNodes('input', 'bottleneck');

      const result = builder.validate();

      expect(result.warnings.some(w => w.code === 'POTENTIAL_BOTTLENECKS')).toBe(true);
    });
  });
});

describe('Graph Builder - Build Operations', () => {
  let builder: GraphBuilder;

  beforeEach(() => {
    builder = new GraphBuilder('test-build');
    builder.setMetadata({
      name: 'Test Build Graph',
      version: '1.5.0',
      author: 'Test Author'
    });
    builder.addInputNode('input');
    builder.addOutputNode('output');
    builder.connectNodes('input', 'output');
  });

  describe('Graph Definition Building', () => {
    it('should build complete graph definition', () => {
      const definition = builder.build();

      expect(definition.id).toBe('test-build');
      expect(definition.name).toBe('Test Build Graph');
      expect(definition.version).toBe('1.5.0');
      expect(definition.metadata.author).toBe('Test Author');
      expect(definition.nodes).toHaveLength(2);
      expect(definition.edges).toHaveLength(1);
      expect(definition.metadata.complexity).toBe('simple');
    });

    it('should auto-validate before building', () => {
      // Create invalid graph
      const invalidBuilder = new GraphBuilder();

      expect(() => invalidBuilder.build()).toThrow(GraphValidationErrorClass);
    });

    it('should preserve validation result', () => {
      builder.validate();
      const definition = builder.build();

      expect(definition).toBeDefined();
      expect(builder['validationResult']?.valid).toBe(true);
    });
  });

  describe('Executable Graph Building', () => {
    it('should build executable graph', () => {
      const runtimeConfig = {
        executionTimeout: 60000,
        nodePoolSize: 8,
        memoryLimit: 2000000000
      };

      const executable = builder.buildExecutable(runtimeConfig);

      expect(executable.definition).toBeDefined();
      expect(executable.executionPlan).toBeDefined();
      expect(executable.dependencies).toBeDefined();
      expect(executable.sortedNodes).toBeDefined();
      expect(executable.runtimeConfig.executionTimeout).toBe(60000);
      expect(executable.runtimeConfig.nodePoolSize).toBe(8);
      expect(executable.runtimeConfig.memoryLimit).toBe(2000000000);
    });

    it('should use default runtime config when not provided', () => {
      const executable = builder.buildExecutable();

      expect(executable.runtimeConfig.executionTimeout).toBe(300000);
      expect(executable.runtimeConfig.nodePoolSize).toBe(4);
      expect(executable.runtimeConfig.memoryLimit).toBe(1000000000);
    });
  });
});

describe('Graph Builder - Optimization', () => {
  let builder: GraphBuilder;

  beforeEach(() => {
    builder = new GraphBuilder();
    builder.addInputNode('input');
    builder.addTransformNode('transform', 'identity');
    builder.addOutputNode('output');
    builder.connectNodes('input', 'transform');
    builder.connectNodes('transform', 'output');
  });

  describe('Optimization Methods', () => {
    it('should perform basic optimization', () => {
      const result = builder.optimize(['basic']);

      expect(result).toBe(builder); // Fluent API
      expect(builder['optimizations']).toHaveLength(1);
      expect(builder['optimizations'][0].strategy).toBe('basic');
    });

    it('should perform multiple optimizations', () => {
      builder.optimize(['basic', 'performance']);

      expect(builder['optimizations']).toHaveLength(2);
      expect(builder['optimizations'][0].strategy).toBe('basic');
      expect(builder['optimizations'][1].strategy).toBe('performance');
    });

    it('should use default strategy when none provided', () => {
      builder.optimize();

      expect(builder['optimizations']).toHaveLength(1);
      expect(builder['optimizations'][0].strategy).toBe('basic');
    });

    it('should apply optimizations when enabled', () => {
      // This would be implementation-dependent
      // For now, just verify the optimization process runs
      expect(() => builder.optimize(['basic'])).not.toThrow();
    });
  });
});

describe('Graph Builder - Import/Export', () => {
  let builder: GraphBuilder;

  beforeEach(() => {
    builder = new GraphBuilder('export-test');
    builder.setMetadata({ name: 'Export Test', version: '1.0.0' });
    builder.addInputNode('input');
    builder.addOutputNode('output');
    builder.connectNodes('input', 'output');
  });

  describe('JSON Export', () => {
    it('should export to JSON string', () => {
      const json = builder.toJSON();

      expect(typeof json).toBe('string');
      const parsed = JSON.parse(json);
      expect(parsed.id).toBe('export-test');
      expect(parsed.name).toBe('Export Test');
      expect(parsed.nodes).toHaveLength(2);
      expect(parsed.edges).toHaveLength(1);
    });

    it('should export prettified JSON', () => {
      const json = builder.toJSON(true);

      expect(json).toContain('\n');
      expect(json).toContain('  '); // Indentation
    });

    it('should export compact JSON', () => {
      const json = builder.toJSON(false);

      expect(json).not.toContain('\n');
    });
  });

  describe('JSON Import', () => {
    it('should import from JSON string', () => {
      const originalJson = builder.toJSON();
      const newBuilder = new GraphBuilder();

      const result = newBuilder.fromJSON(originalJson);

      expect(result).toBe(newBuilder); // Fluent API
      expect(newBuilder['graphId']).toBe('export-test');
      expect(newBuilder['graphName']).toBe('Export Test');
      expect(newBuilder['nodes']).toHaveLength(2);
      expect(newBuilder['edges']).toHaveLength(1);
    });

    it('should handle complete graph definition', () => {
      const definition: GraphDefinition = {
        id: 'import-test',
        name: 'Import Test',
        description: 'Test import functionality',
        version: '2.0.0',
        metadata: {
          author: 'Import Author',
          created: new Date(),
          updated: new Date(),
          tags: ['import', 'test'],
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
          { id: 'n1', type: 'input', name: 'Node 1', config: {} },
          { id: 'n2', type: 'output', name: 'Node 2', config: {} }
        ],
        edges: [
          { id: 'e1', from: 'n1', to: 'n2', type: 'data' }
        ],
        config: { timeout: 30000 },
        inputSchema: { type: 'string' },
        outputSchema: { type: 'object' },
        tags: ['import', 'test']
      };

      const newBuilder = new GraphBuilder();
      newBuilder.fromJSON(JSON.stringify(definition));

      expect(newBuilder['graphId']).toBe('import-test');
      expect(newBuilder['graphDescription']).toBe('Test import functionality');
      expect(newBuilder['inputSchema']).toEqual({ type: 'string' });
      expect(newBuilder['outputSchema']).toEqual({ type: 'object' });
      expect(newBuilder['globalConfig']).toEqual({ timeout: 30000 });
    });
  });
});

describe('Graph Builder - Graph Operations', () => {
  let builder: GraphBuilder;

  beforeEach(() => {
    builder = new GraphBuilder('original');
    builder.setMetadata({ name: 'Original Graph' });
    builder.addInputNode('input');
    builder.addTransformNode('transform', 'identity');
    builder.connectNodes('input', 'transform');
  });

  describe('Cloning', () => {
    it('should create independent clone', () => {
      const clone = builder.clone();

      expect(clone).not.toBe(builder);
      expect(clone['graphId']).toContain('original-clone');
      expect(clone['graphName']).toBe('Original Graph');
      expect(clone['nodes']).toHaveLength(2);
      expect(clone['edges']).toHaveLength(1);
    });

    it('should create deep copy of nodes and edges', () => {
      const clone = builder.clone();

      // Modify original
      builder.addOutputNode('output');

      expect(builder['nodes']).toHaveLength(3);
      expect(clone['nodes']).toHaveLength(2); // Should not be affected
    });

    it('should copy all metadata', () => {
      builder.setInputSchema({ type: 'string' });
      builder.setOutputSchema({ type: 'object' });
      builder.setConfig({ timeout: 5000 });

      const clone = builder.clone();

      expect(clone['inputSchema']).toEqual({ type: 'string' });
      expect(clone['outputSchema']).toEqual({ type: 'object' });
      expect(clone['globalConfig']).toEqual({ timeout: 5000 });
    });
  });

  describe('Merging', () => {
    it('should merge another builder', () => {
      const other = new GraphBuilder();
      other.addOutputNode('output');
      other.addTransformNode('other-transform', 'uppercase');
      other.connectNodes('output', 'other-transform');

      const result = builder.merge(other);

      expect(result).toBe(builder); // Fluent API
      expect(builder['nodes']).toHaveLength(4);
      expect(builder['edges']).toHaveLength(2);
      
      const nodeIds = builder['nodes'].map(n => n.id);
      expect(nodeIds).toContain('output');
      expect(nodeIds).toContain('other-transform');
    });

    it('should merge with prefix', () => {
      const other = new GraphBuilder();
      other.addInputNode('input');
      other.addOutputNode('output');
      other.connectNodes('input', 'output');

      builder.merge(other, 'other');

      const nodeIds = builder['nodes'].map(n => n.id);
      expect(nodeIds).toContain('other_input');
      expect(nodeIds).toContain('other_output');
      
      const edge = builder['edges'].find(e => e.from === 'other_input');
      expect(edge?.to).toBe('other_output');
    });

    it('should merge graph definition', () => {
      const definition: GraphDefinition = {
        id: 'other-graph',
        name: 'Other Graph',
        version: '1.0.0',
        metadata: {
          author: 'Other Author',
          created: new Date(),
          updated: new Date(),
          tags: [],
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
          { id: 'other-node', type: 'tool', name: 'Other Node', config: { toolName: 'test' } }
        ],
        edges: [],
        tags: []
      };

      builder.merge(definition, 'merged');

      const nodeIds = builder['nodes'].map(n => n.id);
      expect(nodeIds).toContain('merged_other-node');
    });

    it('should handle merge conflicts gracefully', () => {
      const other = new GraphBuilder();
      other.addInputNode('input'); // Same ID as existing node

      // Should not throw, but handle the conflict
      expect(() => builder.merge(other, 'conflict')).not.toThrow();
      
      const nodeIds = builder['nodes'].map(n => n.id);
      expect(nodeIds).toContain('input');
      expect(nodeIds).toContain('conflict_input');
    });
  });
});

describe('Graph Builder - Graph Patterns', () => {
  describe('Linear Pipeline Pattern', () => {
    it('should create linear pipeline', () => {
      const nodeConfigs = [
        { id: 'input', type: 'input' as NodeType },
        { id: 'process1', type: 'transform' as NodeType, config: { transform: 'step1' } },
        { id: 'process2', type: 'transform' as NodeType, config: { transform: 'step2' } },
        { id: 'output', type: 'output' as NodeType }
      ];

      const builder = GraphPatterns.linearPipeline(nodeConfigs);

      expect(builder['nodes']).toHaveLength(4);
      expect(builder['edges']).toHaveLength(3);
      
      // Verify connections
      const edges = builder['edges'];
      expect(edges.some(e => e.from === 'input' && e.to === 'process1')).toBe(true);
      expect(edges.some(e => e.from === 'process1' && e.to === 'process2')).toBe(true);
      expect(edges.some(e => e.from === 'process2' && e.to === 'output')).toBe(true);
    });

    it('should handle single node pipeline', () => {
      const builder = GraphPatterns.linearPipeline([
        { id: 'solo', type: 'transform' }
      ]);

      expect(builder['nodes']).toHaveLength(1);
      expect(builder['edges']).toHaveLength(0);
    });
  });

  describe('Fan-Out Pattern', () => {
    it('should create fan-out pattern', () => {
      const builder = GraphPatterns.fanOut('input', ['out1', 'out2', 'out3']);

      expect(builder['nodes']).toHaveLength(4);
      expect(builder['edges']).toHaveLength(3);
      
      const edges = builder['edges'];
      expect(edges.every(e => e.from === 'input')).toBe(true);
      expect(edges.map(e => e.to)).toEqual(expect.arrayContaining(['out1', 'out2', 'out3']));
    });
  });

  describe('Fan-In Pattern', () => {
    it('should create fan-in pattern', () => {
      const builder = GraphPatterns.fanIn(['in1', 'in2', 'in3'], 'output');

      expect(builder['nodes']).toHaveLength(4);
      expect(builder['edges']).toHaveLength(3);
      
      const edges = builder['edges'];
      expect(edges.every(e => e.to === 'output')).toBe(true);
      expect(edges.map(e => e.from)).toEqual(expect.arrayContaining(['in1', 'in2', 'in3']));
    });
  });

  describe('Diamond Pattern', () => {
    it('should create diamond pattern', () => {
      const builder = GraphPatterns.diamond('input', ['mid1', 'mid2'], 'output');

      expect(builder['nodes']).toHaveLength(4);
      expect(builder['edges']).toHaveLength(4);
      
      const edges = builder['edges'];
      // Fan-out from input
      expect(edges.some(e => e.from === 'input' && e.to === 'mid1')).toBe(true);
      expect(edges.some(e => e.from === 'input' && e.to === 'mid2')).toBe(true);
      // Fan-in to output
      expect(edges.some(e => e.from === 'mid1' && e.to === 'output')).toBe(true);
      expect(edges.some(e => e.from === 'mid2' && e.to === 'output')).toBe(true);
    });
  });
});

describe('Graph Builder - Error Handling', () => {
  let builder: GraphBuilder;

  beforeEach(() => {
    builder = new GraphBuilder();
  });

  describe('Configuration Errors', () => {
    it('should throw GraphConfigurationError for invalid configurations', () => {
      expect(() => builder.addNode({ type: 'input' } as any))
        .toThrow(GraphConfigurationError);
      
      expect(() => builder.addNode({ id: 'test' } as any))
        .toThrow(GraphConfigurationError);
    });

    it('should throw GraphConfigurationError for duplicate IDs', () => {
      builder.addInputNode('duplicate');
      
      expect(() => builder.addInputNode('duplicate'))
        .toThrow(GraphConfigurationError);
    });

    it('should throw GraphConfigurationError for invalid edges', () => {
      expect(() => builder.addEdge({ from: 'nonexistent', to: 'also-nonexistent' }))
        .toThrow(GraphConfigurationError);
    });
  });

  describe('Validation Errors', () => {
    it('should throw GraphValidationErrorClass for invalid graphs', () => {
      // Empty graph
      expect(() => builder.validate()).toThrow(GraphValidationErrorClass);
      
      // Cyclic graph
      builder.addInputNode('a');
      builder.addTransformNode('b', 'identity');
      builder.connectNodes('a', 'b');
      builder.connectNodes('b', 'a');
      
      expect(() => builder.validate()).toThrow(GraphValidationErrorClass);
    });

    it('should provide detailed error information', () => {
      builder.addNode({ id: 'agent', type: 'agent', config: {} }); // Missing agentId

      try {
        builder.validate();
        fail('Expected validation to throw');
      } catch (error) {
        expect(error).toBeInstanceOf(GraphValidationErrorClass);
        const validationError = error as GraphValidationErrorClass;
        expect(validationError.validationErrors.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Operation Errors', () => {
    it('should handle malformed JSON in import', () => {
      expect(() => builder.fromJSON('invalid json'))
        .toThrow();
    });

    it('should handle missing nodes in operations', () => {
      expect(() => builder.setNodePosition('nonexistent', { x: 0, y: 0 }))
        .toThrow(GraphConfigurationError);
      
      expect(() => builder.removeNode('nonexistent'))
        .toThrow(GraphConfigurationError);
      
      expect(() => builder.removeEdge('from', 'to'))
        .toThrow(GraphConfigurationError);
    });
  });
});

describe('Graph Builder - Edge Cases', () => {
  let builder: GraphBuilder;

  beforeEach(() => {
    builder = new GraphBuilder();
  });

  describe('Empty Operations', () => {
    it('should handle empty metadata updates', () => {
      expect(() => builder.setMetadata({})).not.toThrow();
    });

    it('should handle empty config updates', () => {
      expect(() => builder.setConfig({})).not.toThrow();
    });

    it('should handle empty schema updates', () => {
      expect(() => builder.setInputSchema({})).not.toThrow();
      expect(() => builder.setOutputSchema({})).not.toThrow();
    });
  });

  describe('Complex Graph Scenarios', () => {
    it('should handle large graphs', () => {
      // Create a graph with many nodes
      for (let i = 0; i < 100; i++) {
        builder.addTransformNode(`node${i}`, 'identity');
      }

      expect(builder['nodes']).toHaveLength(100);
      expect(() => builder.validate()).not.toThrow();
    });

    it('should handle deeply nested dependencies', () => {
      const depth = 20;
      
      for (let i = 0; i < depth; i++) {
        builder.addTransformNode(`level${i}`, 'identity');
        if (i > 0) {
          builder.connectNodes(`level${i-1}`, `level${i}`);
        }
      }

      const result = builder.validate();
      expect(result.metadata.maxDepth).toBe(depth);
    });

    it('should handle complex branching patterns', () => {
      builder.addInputNode('root');
      
      // Create multiple levels of fan-out
      for (let level = 1; level <= 3; level++) {
        for (let i = 0; i < Math.pow(2, level); i++) {
          const nodeId = `l${level}n${i}`;
          builder.addTransformNode(nodeId, 'identity');
          
          if (level === 1) {
            builder.connectNodes('root', nodeId);
          } else {
            const parentId = `l${level-1}n${Math.floor(i/2)}`;
            builder.connectNodes(parentId, nodeId);
          }
        }
      }

      expect(builder['nodes']).toHaveLength(15); // 1 + 2 + 4 + 8
      expect(builder['edges']).toHaveLength(14);
      
      const result = builder.validate();
      expect(result.valid).toBe(true);
    });
  });
});

// ============================================================================
// Test Helper Functions
// ============================================================================

function createSimpleGraph(): GraphBuilder {
  const builder = new GraphBuilder('simple-test');
  builder.setMetadata({ name: 'Simple Test Graph' });
  builder.addInputNode('input');
  builder.addTransformNode('process', 'identity');
  builder.addOutputNode('output');
  builder.connectNodes('input', 'process');
  builder.connectNodes('process', 'output');
  return builder;
}

function createComplexGraph(): GraphBuilder {
  const builder = new GraphBuilder('complex-test');
  
  // Input layer
  builder.addInputNode('input1');
  builder.addInputNode('input2');
  
  // Processing layer
  builder.addAgentNode('agent1', 'test-agent');
  builder.addAgentNode('agent2', 'test-agent');
  builder.addToolNode('tool1', 'test-tool');
  
  // Transform layer
  builder.addTransformNode('merge', 'merge');
  builder.addTransformNode('filter', 'filter');
  
  // Output layer
  builder.addOutputNode('output');
  
  // Connections
  builder.connectNodes('input1', 'agent1');
  builder.connectNodes('input2', 'agent2');
  builder.connectNodes('agent1', 'tool1');
  builder.connectNodes('agent2', 'merge');
  builder.connectNodes('tool1', 'merge');
  builder.connectNodes('merge', 'filter');
  builder.connectNodes('filter', 'output');
  
  return builder;
}

function createInvalidGraph(): GraphBuilder {
  const builder = new GraphBuilder('invalid-test');
  
  // Create cycle
  builder.addTransformNode('a', 'identity');
  builder.addTransformNode('b', 'identity');
  builder.addTransformNode('c', 'identity');
  
  builder.connectNodes('a', 'b');
  builder.connectNodes('b', 'c');
  builder.connectNodes('c', 'a'); // Creates cycle
  
  return builder;
}

function expectValidationError(builder: GraphBuilder, errorCode: string): void {
  try {
    builder.validate();
    fail(`Expected validation to fail with error code: ${errorCode}`);
  } catch (error) {
    expect(error).toBeInstanceOf(GraphValidationErrorClass);
    const validationError = error as GraphValidationErrorClass;
    expect(validationError.validationErrors.some(e => e.code === errorCode)).toBe(true);
  }
}