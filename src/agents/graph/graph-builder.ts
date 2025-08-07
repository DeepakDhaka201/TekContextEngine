/**
 * @fileoverview Graph Builder for constructing and validating graph workflows
 * @module agents/graph/graph-builder
 * @requires ./types
 * @requires ./errors
 * 
 * This file implements a comprehensive graph construction and validation system
 * for Graph Agent workflows. The builder provides fluent APIs for creating
 * graphs programmatically, validates graph structure and semantics, and
 * compiles graphs into optimized executable representations.
 * 
 * Key responsibilities:
 * - Provide fluent builder API for graph construction
 * - Validate graph structure (DAG validation, connectivity)
 * - Validate semantic correctness (types, schemas, configs)
 * - Detect and report structural issues and anti-patterns
 * - Optimize graph structure for execution performance
 * - Compile graphs into executable representations
 * - Support graph composition and modularization
 * - Generate visual representations and documentation
 * 
 * Key concepts:
 * - Fluent builder pattern for intuitive graph construction
 * - Multi-level validation (structural, semantic, performance)
 * - Graph optimization and compilation strategies
 * - Modular graph composition and reuse
 * - Schema-based validation and type safety
 * - Performance analysis and optimization suggestions
 * - Integration with visualization tools
 * 
 * @example
 * ```typescript
 * import { GraphBuilder } from './graph-builder';
 * 
 * const graph = new GraphBuilder()
 *   .setMetadata({
 *     name: 'Content Processing Pipeline',
 *     version: '1.0.0'
 *   })
 *   .addInputNode('input', {
 *     schema: { text: 'string', format: 'string' }
 *   })
 *   .addAgentNode('analyze', 'content-analyzer', {
 *     model: 'gpt-4',
 *     temperature: 0.3
 *   })
 *   .addTransformNode('format', {
 *     transform: (data) => ({ formatted: data.analysis })
 *   })
 *   .addOutputNode('output')
 *   .connectNodes('input', 'analyze')
 *   .connectNodes('analyze', 'format')
 *   .connectNodes('format', 'output')
 *   .validate()
 *   .build();
 * ```
 * 
 * @since 1.0.0
 */

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
  GraphValidationWarning,
  GraphValidationSuggestion,
  GraphValidationMetadata,
  ExecutionPlan,
  ExecutionPhase,
  GraphRuntimeConfig,
  GraphMetadata,
  GraphGlobalConfig,
  GraphBuilder as IGraphBuilder,
  GraphPerformanceProfile
} from './types';

import {
  GraphValidationError as GraphValidationErrorClass,
  GraphConfigurationError,
  createGraphErrorContext
} from './errors';

/**
 * Comprehensive graph builder for constructing and validating workflows.
 * 
 * Provides a fluent API for building graph workflows with comprehensive
 * validation, optimization, and compilation capabilities.
 * 
 * @public
 */
export class GraphBuilder implements IGraphBuilder {
  private graphId: string;
  private graphName: string = '';
  private graphDescription: string = '';
  private graphVersion: string = '1.0.0';
  private graphMetadata: Partial<GraphMetadata> = {};
  private globalConfig: Partial<GraphGlobalConfig> = {};
  
  private nodes: GraphNode[] = [];
  private edges: GraphEdge[] = [];
  private inputSchema: Record<string, any> = {};
  private outputSchema: Record<string, any> = {};
  private tags: string[] = [];
  
  private validationResult?: GraphValidationResult;
  private optimizations: GraphOptimization[] = [];
  
  /**
   * Creates a new Graph Builder instance.
   * 
   * @param id - Optional graph identifier
   */
  constructor(id?: string) {
    this.graphId = id || `graph-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Sets graph metadata.
   * 
   * @param metadata - Graph metadata
   * @returns Builder instance for chaining
   */
  setMetadata(metadata: {
    name?: string;
    description?: string;
    version?: string;
    author?: string;
    tags?: string[];
  }): GraphBuilder {
    if (metadata.name) this.graphName = metadata.name;
    if (metadata.description) this.graphDescription = metadata.description;
    if (metadata.version) this.graphVersion = metadata.version;
    if (metadata.tags) this.tags = [...metadata.tags];
    
    this.graphMetadata = {
      ...this.graphMetadata,
      author: metadata.author || 'Unknown',
      created: this.graphMetadata.created || new Date(),
      updated: new Date()
    };
    
    return this;
  }
  
  /**
   * Sets global graph configuration.
   * 
   * @param config - Global configuration
   * @returns Builder instance for chaining
   */
  setConfig(config: Partial<GraphGlobalConfig>): GraphBuilder {
    this.globalConfig = { ...this.globalConfig, ...config };
    return this;
  }
  
  /**
   * Sets input schema for the graph.
   * 
   * @param schema - Input schema definition
   * @returns Builder instance for chaining
   */
  setInputSchema(schema: Record<string, any>): GraphBuilder {
    this.inputSchema = { ...schema };
    return this;
  }
  
  /**
   * Sets output schema for the graph.
   * 
   * @param schema - Output schema definition
   * @returns Builder instance for chaining
   */
  setOutputSchema(schema: Record<string, any>): GraphBuilder {
    this.outputSchema = { ...schema };
    return this;
  }
  
  /**
   * Adds a generic node to the graph.
   * 
   * @param node - Node definition
   * @returns Builder instance for chaining
   */
  addNode(node: Partial<GraphNode>): GraphBuilder {
    if (!node.id) {
      throw new GraphConfigurationError(
        'node',
        'Node ID is required',
        node
      );
    }
    
    if (!node.type) {
      throw new GraphConfigurationError(
        'node',
        'Node type is required',
        node
      );
    }
    
    // Check for duplicate node IDs
    if (this.nodes.find(n => n.id === node.id)) {
      throw new GraphConfigurationError(
        'node',
        `Node with ID '${node.id}' already exists`,
        node
      );
    }
    
    const fullNode: GraphNode = {
      id: node.id,
      type: node.type,
      name: node.name || node.id,
      description: node.description,
      config: node.config || {},
      inputSchema: node.inputSchema,
      outputSchema: node.outputSchema,
      position: node.position,
      metadata: node.metadata,
      retry: node.retry,
      timeout: node.timeout,
      priority: node.priority,
      parallel: node.parallel,
      conditions: node.conditions
    };
    
    this.nodes.push(fullNode);
    return this;
  }
  
  /**
   * Adds an input node to the graph.
   * 
   * @param id - Node identifier
   * @param config - Node configuration
   * @param options - Additional node options
   * @returns Builder instance for chaining
   */
  addInputNode(
    id: string,
    config: NodeConfig = {},
    options: Partial<GraphNode> = {}
  ): GraphBuilder {
    return this.addNode({
      id,
      type: 'input',
      name: options.name || `Input: ${id}`,
      config,
      ...options
    });
  }
  
  /**
   * Adds an output node to the graph.
   * 
   * @param id - Node identifier
   * @param config - Node configuration
   * @param options - Additional node options
   * @returns Builder instance for chaining
   */
  addOutputNode(
    id: string,
    config: NodeConfig = {},
    options: Partial<GraphNode> = {}
  ): GraphBuilder {
    return this.addNode({
      id,
      type: 'output',
      name: options.name || `Output: ${id}`,
      config,
      ...options
    });
  }
  
  /**
   * Adds an agent node to the graph.
   * 
   * @param id - Node identifier
   * @param agentId - Agent identifier to execute
   * @param config - Agent configuration
   * @param options - Additional node options
   * @returns Builder instance for chaining
   */
  addAgentNode(
    id: string,
    agentId: string,
    config: NodeConfig = {},
    options: Partial<GraphNode> = {}
  ): GraphBuilder {
    return this.addNode({
      id,
      type: 'agent',
      name: options.name || `Agent: ${agentId}`,
      config: {
        agentId,
        ...config
      },
      ...options
    });
  }
  
  /**
   * Adds a tool node to the graph.
   * 
   * @param id - Node identifier
   * @param toolName - Tool name to execute
   * @param config - Tool configuration
   * @param options - Additional node options
   * @returns Builder instance for chaining
   */
  addToolNode(
    id: string,
    toolName: string,
    config: NodeConfig = {},
    options: Partial<GraphNode> = {}
  ): GraphBuilder {
    return this.addNode({
      id,
      type: 'tool',
      name: options.name || `Tool: ${toolName}`,
      config: {
        toolName,
        ...config
      },
      ...options
    });
  }
  
  /**
   * Adds a transform node to the graph.
   * 
   * @param id - Node identifier
   * @param transform - Transform function or expression
   * @param config - Transform configuration
   * @param options - Additional node options
   * @returns Builder instance for chaining
   */
  addTransformNode(
    id: string,
    transform: string | Function,
    config: NodeConfig = {},
    options: Partial<GraphNode> = {}
  ): GraphBuilder {
    return this.addNode({
      id,
      type: 'transform',
      name: options.name || `Transform: ${id}`,
      config: {
        transform,
        ...config
      },
      ...options
    });
  }
  
  /**
   * Adds a condition node to the graph.
   * 
   * @param id - Node identifier
   * @param condition - Condition expression or function
   * @param config - Condition configuration
   * @param options - Additional node options
   * @returns Builder instance for chaining
   */
  addConditionNode(
    id: string,
    condition: string | Function,
    config: NodeConfig = {},
    options: Partial<GraphNode> = {}
  ): GraphBuilder {
    return this.addNode({
      id,
      type: 'condition',
      name: options.name || `Condition: ${id}`,
      config: {
        parameters: { condition },
        ...config
      },
      ...options
    });
  }
  
  /**
   * Adds a parallel execution node to the graph.
   * 
   * @param id - Node identifier
   * @param nodeIds - Node IDs to execute in parallel
   * @param config - Parallel configuration
   * @param options - Additional node options
   * @returns Builder instance for chaining
   */
  addParallelNode(
    id: string,
    nodeIds: string[],
    config: NodeConfig = {},
    options: Partial<GraphNode> = {}
  ): GraphBuilder {
    return this.addNode({
      id,
      type: 'parallel',
      name: options.name || `Parallel: ${nodeIds.join(', ')}`,
      config: {
        parameters: { nodeIds },
        ...config
      },
      ...options
    });
  }
  
  /**
   * Adds a delay node to the graph.
   * 
   * @param id - Node identifier
   * @param delay - Delay duration in milliseconds
   * @param config - Delay configuration
   * @param options - Additional node options
   * @returns Builder instance for chaining
   */
  addDelayNode(
    id: string,
    delay: number,
    config: NodeConfig = {},
    options: Partial<GraphNode> = {}
  ): GraphBuilder {
    return this.addNode({
      id,
      type: 'delay',
      name: options.name || `Delay: ${delay}ms`,
      config: {
        parameters: { delay },
        ...config
      },
      ...options
    });
  }
  
  /**
   * Adds an edge to connect two nodes.
   * 
   * @param edge - Edge definition
   * @returns Builder instance for chaining
   */
  addEdge(edge: Partial<GraphEdge>): GraphBuilder {
    if (!edge.from || !edge.to) {
      throw new GraphConfigurationError(
        'edge',
        'Edge must have both from and to node IDs',
        edge
      );
    }
    
    // Validate that nodes exist
    if (!this.nodes.find(n => n.id === edge.from)) {
      throw new GraphConfigurationError(
        'edge',
        `Source node '${edge.from}' does not exist`,
        edge
      );
    }
    
    if (!this.nodes.find(n => n.id === edge.to)) {
      throw new GraphConfigurationError(
        'edge',
        `Target node '${edge.to}' does not exist`,
        edge
      );
    }
    
    const edgeId = edge.id || `${edge.from}->${edge.to}`;
    
    // Check for duplicate edges
    if (this.edges.find(e => e.from === edge.from && e.to === edge.to)) {
      throw new GraphConfigurationError(
        'edge',
        `Edge from '${edge.from}' to '${edge.to}' already exists`,
        edge
      );
    }
    
    const fullEdge: GraphEdge = {
      id: edgeId,
      from: edge.from,
      to: edge.to,
      type: edge.type || 'data',
      label: edge.label,
      condition: edge.condition,
      transform: edge.transform,
      metadata: edge.metadata,
      priority: edge.priority,
      errorHandling: edge.errorHandling
    };
    
    this.edges.push(fullEdge);
    return this;
  }
  
  /**
   * Connects two nodes with a simple data edge.
   * 
   * @param fromId - Source node ID
   * @param toId - Target node ID
   * @param options - Edge options
   * @returns Builder instance for chaining
   */
  connectNodes(
    fromId: string,
    toId: string,
    options: Partial<GraphEdge> = {}
  ): GraphBuilder {
    return this.addEdge({
      from: fromId,
      to: toId,
      ...options
    });
  }
  
  /**
   * Connects nodes with a conditional edge.
   * 
   * @param fromId - Source node ID
   * @param toId - Target node ID
   * @param condition - Edge condition
   * @param options - Additional edge options
   * @returns Builder instance for chaining
   */
  connectConditional(
    fromId: string,
    toId: string,
    condition: EdgeCondition,
    options: Partial<GraphEdge> = {}
  ): GraphBuilder {
    return this.addEdge({
      from: fromId,
      to: toId,
      type: 'conditional',
      condition,
      ...options
    });
  }
  
  /**
   * Connects nodes with a data transformation edge.
   * 
   * @param fromId - Source node ID
   * @param toId - Target node ID
   * @param transform - Data transformation
   * @param options - Additional edge options
   * @returns Builder instance for chaining
   */
  connectTransform(
    fromId: string,
    toId: string,
    transform: EdgeTransform,
    options: Partial<GraphEdge> = {}
  ): GraphBuilder {
    return this.addEdge({
      from: fromId,
      to: toId,
      transform,
      ...options
    });
  }
  
  /**
   * Sets node position for visualization.
   * 
   * @param nodeId - Node identifier
   * @param position - Node position
   * @returns Builder instance for chaining
   */
  setNodePosition(nodeId: string, position: NodePosition): GraphBuilder {
    const node = this.nodes.find(n => n.id === nodeId);
    if (!node) {
      throw new GraphConfigurationError(
        'node',
        `Node '${nodeId}' does not exist`,
        { nodeId }
      );
    }
    
    node.position = position;
    return this;
  }
  
  /**
   * Sets node retry policy.
   * 
   * @param nodeId - Node identifier
   * @param retryPolicy - Retry policy configuration
   * @returns Builder instance for chaining
   */
  setNodeRetryPolicy(nodeId: string, retryPolicy: NodeRetryPolicy): GraphBuilder {
    const node = this.nodes.find(n => n.id === nodeId);
    if (!node) {
      throw new GraphConfigurationError(
        'node',
        `Node '${nodeId}' does not exist`,
        { nodeId }
      );
    }
    
    node.retry = retryPolicy;
    return this;
  }
  
  /**
   * Sets node execution conditions.
   * 
   * @param nodeId - Node identifier
   * @param conditions - Node conditions
   * @returns Builder instance for chaining
   */
  setNodeConditions(nodeId: string, conditions: NodeCondition[]): GraphBuilder {
    const node = this.nodes.find(n => n.id === nodeId);
    if (!node) {
      throw new GraphConfigurationError(
        'node',
        `Node '${nodeId}' does not exist`,
        { nodeId }
      );
    }
    
    node.conditions = conditions;
    return this;
  }
  
  /**
   * Removes a node from the graph.
   * 
   * @param nodeId - Node identifier to remove
   * @returns Builder instance for chaining
   */
  removeNode(nodeId: string): GraphBuilder {
    const nodeIndex = this.nodes.findIndex(n => n.id === nodeId);
    if (nodeIndex === -1) {
      throw new GraphConfigurationError(
        'node',
        `Node '${nodeId}' does not exist`,
        { nodeId }
      );
    }
    
    // Remove the node
    this.nodes.splice(nodeIndex, 1);
    
    // Remove all edges connected to this node
    this.edges = this.edges.filter(e => e.from !== nodeId && e.to !== nodeId);
    
    return this;
  }
  
  /**
   * Removes an edge from the graph.
   * 
   * @param fromId - Source node ID
   * @param toId - Target node ID
   * @returns Builder instance for chaining
   */
  removeEdge(fromId: string, toId: string): GraphBuilder {
    const edgeIndex = this.edges.findIndex(e => e.from === fromId && e.to === toId);
    if (edgeIndex === -1) {
      throw new GraphConfigurationError(
        'edge',
        `Edge from '${fromId}' to '${toId}' does not exist`,
        { fromId, toId }
      );
    }
    
    this.edges.splice(edgeIndex, 1);
    return this;
  }
  
  /**
   * Validates the graph structure and semantics.
   * 
   * @returns Builder instance for chaining
   * @throws {GraphValidationErrorClass} If validation fails
   */
  validate(): GraphValidationResult {
    this.validationResult = this.performValidation();
    
    if (!this.validationResult.valid) {
      const criticalErrors = this.validationResult.errors.filter(e => e.severity === 'error');
      if (criticalErrors.length > 0) {
        throw new GraphValidationErrorClass(
          'Graph validation failed',
          this.validationResult.errors,
          this.validationResult.warnings,
          createGraphErrorContext(undefined, this.graphId),
          this.getCurrentGraphDefinition()
        );
      }
    }
    
    return this.validationResult;
  }
  
  /**
   * Performs graph optimization.
   * 
   * @param strategies - Optimization strategies to apply
   * @returns Builder instance for chaining
   */
  optimize(strategies: GraphOptimizationStrategy[] = ['basic']): GraphBuilder {
    for (const strategy of strategies) {
      const optimizer = this.getOptimizer(strategy);
      const optimization = optimizer.optimize(this.nodes, this.edges);
      this.optimizations.push(optimization);
      
      if (optimization.applied) {
        this.nodes = optimization.optimizedNodes || this.nodes;
        this.edges = optimization.optimizedEdges || this.edges;
      }
    }
    
    return this;
  }
  
  /**
   * Builds the graph definition.
   * 
   * @returns Complete graph definition
   */
  build(): GraphDefinition {
    // Ensure graph has been validated
    if (!this.validationResult) {
      this.validate();
    }
    
    return this.getCurrentGraphDefinition();
  }
  
  /**
   * Builds an executable graph with compilation and optimization.
   * 
   * @param runtimeConfig - Runtime configuration
   * @returns Executable graph ready for execution
   */
  buildExecutable(runtimeConfig?: Partial<GraphRuntimeConfig>): ExecutableGraph {
    const definition = this.build();
    
    // Perform compilation
    const compiler = new GraphCompiler();
    const executableGraph = compiler.compile(definition, runtimeConfig);
    
    return executableGraph;
  }
  
  /**
   * Clones the builder for creating variations.
   * 
   * @returns New builder instance with copied state
   */
  clone(): GraphBuilder {
    const cloned = new GraphBuilder();
    cloned.graphId = `${this.graphId}-clone-${Date.now()}`;
    cloned.graphName = this.graphName;
    cloned.graphDescription = this.graphDescription;
    cloned.graphVersion = this.graphVersion;
    cloned.graphMetadata = { ...this.graphMetadata };
    cloned.globalConfig = { ...this.globalConfig };
    cloned.nodes = this.nodes.map(node => ({ ...node }));
    cloned.edges = this.edges.map(edge => ({ ...edge }));
    cloned.inputSchema = { ...this.inputSchema };
    cloned.outputSchema = { ...this.outputSchema };
    cloned.tags = [...this.tags];
    
    return cloned;
  }
  
  /**
   * Merges another graph into this builder.
   * 
   * @param other - Other graph definition to merge
   * @param prefix - Optional prefix for node IDs to avoid conflicts
   * @returns Builder instance for chaining
   */
  merge(other: GraphDefinition | GraphBuilder, prefix?: string): GraphBuilder {
    let otherNodes: GraphNode[];
    let otherEdges: GraphEdge[];
    
    if (other instanceof GraphBuilder) {
      otherNodes = other.nodes;
      otherEdges = other.edges;
    } else {
      otherNodes = other.nodes;
      otherEdges = other.edges;
    }
    
    // Add nodes with optional prefix
    for (const node of otherNodes) {
      const nodeId = prefix ? `${prefix}_${node.id}` : node.id;
      this.addNode({
        ...node,
        id: nodeId
      });
    }
    
    // Add edges with updated node references
    for (const edge of otherEdges) {
      const fromId = prefix ? `${prefix}_${edge.from}` : edge.from;
      const toId = prefix ? `${prefix}_${edge.to}` : edge.to;
      
      this.addEdge({
        ...edge,
        from: fromId,
        to: toId
      });
    }
    
    return this;
  }
  
  /**
   * Exports graph as JSON.
   * 
   * @param pretty - Whether to format JSON nicely
   * @returns JSON string representation
   */
  toJSON(pretty: boolean = false): string {
    const definition = this.getCurrentGraphDefinition();
    return JSON.stringify(definition, null, pretty ? 2 : 0);
  }
  
  /**
   * Imports graph from JSON.
   * 
   * @param json - JSON string representation
   * @returns Builder instance for chaining
   */
  fromJSON(json: string): GraphBuilder {
    const definition: GraphDefinition = JSON.parse(json);
    
    this.graphId = definition.id;
    this.graphName = definition.name;
    this.graphDescription = definition.description || '';
    this.graphVersion = definition.version;
    this.graphMetadata = definition.metadata;
    this.globalConfig = definition.config || {};
    this.inputSchema = definition.inputSchema || {};
    this.outputSchema = definition.outputSchema || {};
    this.tags = definition.tags;
    this.nodes = [...definition.nodes];
    this.edges = [...definition.edges];
    
    return this;
  }
  
  // ============================================================================
  // Private Helper Methods
  // ============================================================================
  
  /**
   * Gets current graph definition.
   * 
   * @returns Graph definition
   * @private
   */
  private getCurrentGraphDefinition(): GraphDefinition {
    return {
      id: this.graphId,
      name: this.graphName,
      description: this.graphDescription,
      version: this.graphVersion,
      metadata: {
        author: 'GraphBuilder',
        created: new Date(),
        updated: new Date(),
        tags: this.tags,
        category: 'general',
        complexity: this.calculateComplexity(),
        performance: this.estimatePerformance(),
        ...this.graphMetadata
      },
      nodes: [...this.nodes],
      edges: [...this.edges],
      config: this.globalConfig as GraphGlobalConfig,
      inputSchema: this.inputSchema,
      outputSchema: this.outputSchema,
      tags: this.tags
    };
  }
  
  /**
   * Performs comprehensive graph validation.
   * 
   * @returns Validation result
   * @private
   */
  private performValidation(): GraphValidationResult {
    const errors: GraphValidationError[] = [];
    const warnings: GraphValidationWarning[] = [];
    const suggestions: GraphValidationSuggestion[] = [];
    
    // Structural validation
    this.validateStructure(errors, warnings, suggestions);
    
    // Semantic validation
    this.validateSemantics(errors, warnings, suggestions);
    
    // Performance validation
    this.validatePerformance(errors, warnings, suggestions);
    
    const metadata: GraphValidationMetadata = {
      nodeCount: this.nodes.length,
      edgeCount: this.edges.length,
      maxDepth: this.calculateMaxDepth(),
      cyclicPaths: this.detectCycles(),
      unreachableNodes: this.findUnreachableNodes(),
      deadEndNodes: this.findDeadEndNodes()
    };
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions,
      metadata
    };
  }
  
  /**
   * Validates graph structure.
   * 
   * @param errors - Error accumulator
   * @param warnings - Warning accumulator
   * @param suggestions - Suggestion accumulator
   * @private
   */
  private validateStructure(
    errors: GraphValidationError[],
    warnings: GraphValidationWarning[],
    suggestions: GraphValidationSuggestion[]
  ): void {
    // Check for empty graph
    if (this.nodes.length === 0) {
      errors.push({
        code: 'EMPTY_GRAPH',
        message: 'Graph has no nodes',
        severity: 'error'
      });
      return;
    }
    
    // Check for cycles
    const cycles = this.detectCycles();
    if (cycles.length > 0) {
      for (const cycle of cycles) {
        errors.push({
          code: 'CYCLIC_DEPENDENCY',
          message: `Cyclic dependency detected: ${cycle.join(' -> ')}`,
          severity: 'error',
          details: { cycle }
        });
      }
    }
    
    // Check for disconnected components
    const components = this.findDisconnectedComponents();
    if (components.length > 1) {
      warnings.push({
        code: 'DISCONNECTED_COMPONENTS',
        message: `Graph has ${components.length} disconnected components`,
        details: { components }
      });
    }
    
    // Check for unreachable nodes
    const unreachableNodes = this.findUnreachableNodes();
    if (unreachableNodes.length > 0) {
      warnings.push({
        code: 'UNREACHABLE_NODES',
        message: `Found ${unreachableNodes.length} unreachable nodes`,
        details: { nodes: unreachableNodes }
      });
    }
    
    // Check for dead-end nodes
    const deadEndNodes = this.findDeadEndNodes();
    if (deadEndNodes.length > 0) {
      warnings.push({
        code: 'DEAD_END_NODES',
        message: `Found ${deadEndNodes.length} nodes with no outgoing edges`,
        details: { nodes: deadEndNodes }
      });
    }
    
    // Suggest input/output nodes
    const inputNodes = this.nodes.filter(n => n.type === 'input');
    const outputNodes = this.nodes.filter(n => n.type === 'output');
    
    if (inputNodes.length === 0) {
      suggestions.push({
        code: 'ADD_INPUT_NODE',
        message: 'Consider adding an input node to define graph inputs',
        suggestedFix: 'Add an input node using addInputNode()'
      });
    }
    
    if (outputNodes.length === 0) {
      suggestions.push({
        code: 'ADD_OUTPUT_NODE',
        message: 'Consider adding an output node to define graph outputs',
        suggestedFix: 'Add an output node using addOutputNode()'
      });
    }
  }
  
  /**
   * Validates graph semantics.
   * 
   * @param errors - Error accumulator
   * @param warnings - Warning accumulator
   * @param suggestions - Suggestion accumulator
   * @private
   */
  private validateSemantics(
    errors: GraphValidationError[],
    warnings: GraphValidationWarning[],
    suggestions: GraphValidationSuggestion[]
  ): void {
    // Validate node configurations
    for (const node of this.nodes) {
      this.validateNodeConfig(node, errors, warnings, suggestions);
    }
    
    // Validate edge configurations
    for (const edge of this.edges) {
      this.validateEdgeConfig(edge, errors, warnings, suggestions);
    }
    
    // Validate data flow compatibility
    this.validateDataFlow(errors, warnings, suggestions);
  }
  
  /**
   * Validates performance characteristics.
   * 
   * @param errors - Error accumulator
   * @param warnings - Warning accumulator
   * @param suggestions - Suggestion accumulator
   * @private
   */
  private validatePerformance(
    errors: GraphValidationError[],
    warnings: GraphValidationWarning[],
    suggestions: GraphValidationSuggestion[]
  ): void {
    const complexity = this.calculateComplexity();
    
    if (complexity === 'complex') {
      warnings.push({
        code: 'HIGH_COMPLEXITY',
        message: 'Graph has high complexity which may impact performance',
        details: { nodeCount: this.nodes.length, edgeCount: this.edges.length }
      });
      
      suggestions.push({
        code: 'OPTIMIZE_COMPLEXITY',
        message: 'Consider breaking down complex nodes or using subgraphs',
        suggestedFix: 'Split large nodes into smaller, focused nodes'
      });
    }
    
    // Check for potential bottlenecks
    const bottlenecks = this.findBottleneckNodes();
    if (bottlenecks.length > 0) {
      warnings.push({
        code: 'POTENTIAL_BOTTLENECKS',
        message: `Found ${bottlenecks.length} potential bottleneck nodes`,
        details: { nodes: bottlenecks }
      });
    }
  }
  
  /**
   * Validates individual node configuration.
   * 
   * @param node - Node to validate
   * @param errors - Error accumulator
   * @param warnings - Warning accumulator
   * @param suggestions - Suggestion accumulator
   * @private
   */
  private validateNodeConfig(
    node: GraphNode,
    errors: GraphValidationError[],
    warnings: GraphValidationWarning[],
    suggestions: GraphValidationSuggestion[]
  ): void {
    // Type-specific validation
    switch (node.type) {
      case 'agent':
        if (!node.config.agentId) {
          errors.push({
            code: 'MISSING_AGENT_ID',
            message: `Agent node '${node.id}' missing agentId configuration`,
            nodeId: node.id,
            severity: 'error'
          });
        }
        break;
        
      case 'tool':
        if (!node.config.toolName) {
          errors.push({
            code: 'MISSING_TOOL_NAME',
            message: `Tool node '${node.id}' missing toolName configuration`,
            nodeId: node.id,
            severity: 'error'
          });
        }
        break;
        
      case 'transform':
        if (!node.config.transform) {
          errors.push({
            code: 'MISSING_TRANSFORM',
            message: `Transform node '${node.id}' missing transform configuration`,
            nodeId: node.id,
            severity: 'error'
          });
        }
        break;
    }
    
    // Check for missing retry policies on critical nodes
    if (['agent', 'tool'].includes(node.type) && !node.retry) {
      suggestions.push({
        code: 'ADD_RETRY_POLICY',
        message: `Consider adding retry policy to ${node.type} node '${node.id}'`,
        nodeId: node.id,
        suggestedFix: 'Use setNodeRetryPolicy() to add retry configuration'
      });
    }
  }
  
  /**
   * Validates edge configuration.
   * 
   * @param edge - Edge to validate
   * @param errors - Error accumulator
   * @param warnings - Warning accumulator
   * @param suggestions - Suggestion accumulator
   * @private
   */
  private validateEdgeConfig(
    edge: GraphEdge,
    errors: GraphValidationError[],
    warnings: GraphValidationWarning[],
    suggestions: GraphValidationSuggestion[]
  ): void {
    // Validate conditional edges have conditions
    if (edge.type === 'conditional' && !edge.condition) {
      errors.push({
        code: 'MISSING_EDGE_CONDITION',
        message: `Conditional edge '${edge.id}' missing condition`,
        edgeId: edge.id,
        severity: 'error'
      });
    }
    
    // Validate transform edges have transform functions
    if (edge.transform && (!edge.transform.function)) {
      errors.push({
        code: 'MISSING_TRANSFORM_FUNCTION',
        message: `Transform edge '${edge.id}' missing transform function`,
        edgeId: edge.id,
        severity: 'error'
      });
    }
  }
  
  /**
   * Validates data flow compatibility.
   * 
   * @param errors - Error accumulator
   * @param warnings - Warning accumulator
   * @param suggestions - Suggestion accumulator
   * @private
   */
  private validateDataFlow(
    errors: GraphValidationError[],
    warnings: GraphValidationWarning[],
    suggestions: GraphValidationSuggestion[]
  ): void {
    // This would implement schema validation between connected nodes
    // For now, we'll add a basic check
    
    for (const edge of this.edges) {
      const fromNode = this.nodes.find(n => n.id === edge.from);
      const toNode = this.nodes.find(n => n.id === edge.to);
      
      if (fromNode && toNode) {
        // Check for schema compatibility
        if (fromNode.outputSchema && toNode.inputSchema) {
          const compatible = this.checkSchemaCompatibility(
            fromNode.outputSchema,
            toNode.inputSchema
          );
          
          if (!compatible) {
            warnings.push({
              code: 'SCHEMA_MISMATCH',
              message: `Potential schema mismatch between '${edge.from}' and '${edge.to}'`,
              edgeId: edge.id,
              details: {
                fromSchema: fromNode.outputSchema,
                toSchema: toNode.inputSchema
              }
            });
          }
        }
      }
    }
  }
  
  /**
   * Detects cycles in the graph.
   * 
   * @returns Array of cycles (each cycle is an array of node IDs)
   * @private
   */
  private detectCycles(): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const path: string[] = [];
    
    const dfs = (nodeId: string): boolean => {
      if (recursionStack.has(nodeId)) {
        // Found a cycle
        const cycleStart = path.indexOf(nodeId);
        if (cycleStart >= 0) {
          cycles.push([...path.slice(cycleStart), nodeId]);
        }
        return true;
      }
      
      if (visited.has(nodeId)) {
        return false;
      }
      
      visited.add(nodeId);
      recursionStack.add(nodeId);
      path.push(nodeId);
      
      // Visit all neighbors
      for (const edge of this.edges) {
        if (edge.from === nodeId) {
          if (dfs(edge.to)) {
            // Cycle found in subtree
            return true;
          }
        }
      }
      
      recursionStack.delete(nodeId);
      path.pop();
      return false;
    };
    
    // Start DFS from all unvisited nodes
    for (const node of this.nodes) {
      if (!visited.has(node.id)) {
        dfs(node.id);
      }
    }
    
    return cycles;
  }
  
  /**
   * Finds unreachable nodes in the graph.
   * 
   * @returns Array of unreachable node IDs
   * @private
   */
  private findUnreachableNodes(): string[] {
    // Find root nodes (nodes with no incoming edges)
    const hasIncoming = new Set(this.edges.map(e => e.to));
    const rootNodes = this.nodes.filter(n => !hasIncoming.has(n.id)).map(n => n.id);
    
    if (rootNodes.length === 0 && this.nodes.length > 0) {
      // If no root nodes, all nodes are potentially unreachable (or in cycles)
      return [];
    }
    
    // Perform BFS from all root nodes
    const reachable = new Set<string>();
    const queue = [...rootNodes];
    
    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      if (reachable.has(nodeId)) continue;
      
      reachable.add(nodeId);
      
      // Add all neighbors to queue
      for (const edge of this.edges) {
        if (edge.from === nodeId && !reachable.has(edge.to)) {
          queue.push(edge.to);
        }
      }
    }
    
    // Return nodes that are not reachable
    return this.nodes.filter(n => !reachable.has(n.id)).map(n => n.id);
  }
  
  /**
   * Finds dead-end nodes (nodes with no outgoing edges).
   * 
   * @returns Array of dead-end node IDs
   * @private
   */
  private findDeadEndNodes(): string[] {
    const hasOutgoing = new Set(this.edges.map(e => e.from));
    return this.nodes.filter(n => !hasOutgoing.has(n.id)).map(n => n.id);
  }
  
  /**
   * Finds disconnected components in the graph.
   * 
   * @returns Array of components (each component is an array of node IDs)
   * @private
   */
  private findDisconnectedComponents(): string[][] {
    const components: string[][] = [];
    const visited = new Set<string>();
    
    const dfs = (nodeId: string, component: string[]): void => {
      if (visited.has(nodeId)) return;
      
      visited.add(nodeId);
      component.push(nodeId);
      
      // Visit all connected nodes (both directions)
      for (const edge of this.edges) {
        if (edge.from === nodeId) {
          dfs(edge.to, component);
        } else if (edge.to === nodeId) {
          dfs(edge.from, component);
        }
      }
    };
    
    for (const node of this.nodes) {
      if (!visited.has(node.id)) {
        const component: string[] = [];
        dfs(node.id, component);
        components.push(component);
      }
    }
    
    return components;
  }
  
  /**
   * Finds potential bottleneck nodes.
   * 
   * @returns Array of bottleneck node IDs
   * @private
   */
  private findBottleneckNodes(): string[] {
    const bottlenecks: string[] = [];
    
    for (const node of this.nodes) {
      const incomingCount = this.edges.filter(e => e.to === node.id).length;
      const outgoingCount = this.edges.filter(e => e.from === node.id).length;
      
      // Node is a bottleneck if it has many incoming edges or many outgoing edges
      if (incomingCount > 5 || outgoingCount > 5) {
        bottlenecks.push(node.id);
      }
    }
    
    return bottlenecks;
  }
  
  /**
   * Calculates graph complexity.
   * 
   * @returns Complexity level
   * @private
   */
  private calculateComplexity(): 'simple' | 'moderate' | 'complex' {
    const nodeCount = this.nodes.length;
    const edgeCount = this.edges.length;
    const complexity = nodeCount + edgeCount;
    
    if (complexity < 10) return 'simple';
    if (complexity < 50) return 'moderate';
    return 'complex';
  }
  
  /**
   * Calculates maximum depth of the graph.
   * 
   * @returns Maximum depth
   * @private
   */
  private calculateMaxDepth(): number {
    let maxDepth = 0;
    const visited = new Set<string>();
    
    const dfs = (nodeId: string, depth: number): void => {
      if (visited.has(nodeId)) return;
      
      visited.add(nodeId);
      maxDepth = Math.max(maxDepth, depth);
      
      for (const edge of this.edges) {
        if (edge.from === nodeId) {
          dfs(edge.to, depth + 1);
        }
      }
      
      visited.delete(nodeId);
    };
    
    // Find root nodes and calculate depth from each
    const hasIncoming = new Set(this.edges.map(e => e.to));
    const rootNodes = this.nodes.filter(n => !hasIncoming.has(n.id));
    
    for (const root of rootNodes) {
      dfs(root.id, 1);
    }
    
    return maxDepth;
  }
  
  /**
   * Estimates performance profile.
   * 
   * @returns Performance profile
   * @private
   */
  private estimatePerformance(): GraphPerformanceProfile {
    const nodeCount = this.nodes.length;
    const agentNodes = this.nodes.filter(n => n.type === 'agent').length;
    const toolNodes = this.nodes.filter(n => n.type === 'tool').length;
    
    // Rough estimation based on node types and count
    const estimatedDuration = (agentNodes * 2000) + (toolNodes * 500) + (nodeCount * 100);
    
    return {
      estimatedDuration,
      resourceIntensity: (agentNodes > 5 ? 'high' : nodeCount > 20 ? 'medium' : 'low') as 'low' | 'medium' | 'high',
      scalability: 'linear' as 'linear' | 'logarithmic' | 'exponential',
      memoryConcerns: nodeCount > 50,
      cpuIntensive: agentNodes > 10
    };
  }
  
  /**
   * Checks schema compatibility between two schemas.
   * 
   * @param outputSchema - Output schema
   * @param inputSchema - Input schema
   * @returns Whether schemas are compatible
   * @private
   */
  private checkSchemaCompatibility(outputSchema: any, inputSchema: any): boolean {
    // Simplified compatibility check
    // In a real implementation, this would do proper schema validation
    return true;
  }
  
  /**
   * Gets optimizer for a strategy.
   * 
   * @param strategy - Optimization strategy
   * @returns Optimizer instance
   * @private
   */
  private getOptimizer(strategy: GraphOptimizationStrategy): GraphOptimizer {
    switch (strategy) {
      case 'basic':
        return new BasicGraphOptimizer();
      case 'performance':
        return new PerformanceGraphOptimizer();
      default:
        return new BasicGraphOptimizer();
    }
  }
}

// ============================================================================
// Supporting Types and Classes
// ============================================================================

type GraphOptimizationStrategy = 'basic' | 'performance';

interface GraphOptimization {
  strategy: GraphOptimizationStrategy;
  applied: boolean;
  optimizedNodes?: GraphNode[];
  optimizedEdges?: GraphEdge[];
  improvements: string[];
  metrics: {
    nodesRemoved: number;
    edgesRemoved: number;
    nodesModified: number;
    edgesModified: number;
  };
}

interface GraphOptimizer {
  optimize(nodes: GraphNode[], edges: GraphEdge[]): GraphOptimization;
}

class BasicGraphOptimizer implements GraphOptimizer {
  optimize(nodes: GraphNode[], edges: GraphEdge[]): GraphOptimization {
    return {
      strategy: 'basic',
      applied: false,
      improvements: [],
      metrics: {
        nodesRemoved: 0,
        edgesRemoved: 0,
        nodesModified: 0,
        edgesModified: 0
      }
    };
  }
}

class PerformanceGraphOptimizer implements GraphOptimizer {
  optimize(nodes: GraphNode[], edges: GraphEdge[]): GraphOptimization {
    return {
      strategy: 'performance',
      applied: false,
      improvements: [],
      metrics: {
        nodesRemoved: 0,
        edgesRemoved: 0,
        nodesModified: 0,
        edgesModified: 0
      }
    };
  }
}

/**
 * Graph compiler for creating executable representations.
 */
class GraphCompiler {
  /**
   * Compiles a graph definition into an executable graph.
   * 
   * @param definition - Graph definition
   * @param runtimeConfig - Runtime configuration
   * @returns Executable graph
   */
  compile(definition: GraphDefinition, runtimeConfig?: Partial<GraphRuntimeConfig>): ExecutableGraph {
    // Perform topological sort
    const sortedNodes = this.topologicalSort(definition);
    
    // Build dependency mapping
    const dependencies = this.buildDependencyMap(definition);
    
    // Create execution plan
    const executionPlan = this.createExecutionPlan(definition, sortedNodes, dependencies);
    
    // Validate the compiled graph
    const validation = this.validateCompiledGraph(definition, sortedNodes, dependencies);
    
    return {
      definition,
      executionPlan,
      dependencies,
      sortedNodes,
      strategy: 'parallel', // Default strategy
      runtimeConfig: {
        executionTimeout: runtimeConfig?.executionTimeout || 300000,
        nodePoolSize: runtimeConfig?.nodePoolSize || 4,
        memoryLimit: runtimeConfig?.memoryLimit || 1000000000, // 1GB
        cpuLimit: runtimeConfig?.cpuLimit || 100, // 100%
        diskLimit: runtimeConfig?.diskLimit || 10000000000, // 10GB
        networkLimit: runtimeConfig?.networkLimit || 1000000000 // 1GB
      },
      validation
    };
  }
  
  /**
   * Performs topological sort of graph nodes.
   * 
   * @param definition - Graph definition
   * @returns Topologically sorted node IDs
   * @private
   */
  private topologicalSort(definition: GraphDefinition): string[] {
    const indegree = new Map<string, number>();
    const adjacency = new Map<string, string[]>();
    
    // Initialize
    for (const node of definition.nodes) {
      indegree.set(node.id, 0);
      adjacency.set(node.id, []);
    }
    
    // Build adjacency list and calculate indegrees
    for (const edge of definition.edges) {
      indegree.set(edge.to, (indegree.get(edge.to) || 0) + 1);
      adjacency.get(edge.from)?.push(edge.to);
    }
    
    // Kahn's algorithm
    const queue: string[] = [];
    const result: string[] = [];
    
    // Find nodes with no incoming edges
    for (const [nodeId, degree] of indegree) {
      if (degree === 0) {
        queue.push(nodeId);
      }
    }
    
    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      result.push(nodeId);
      
      // Reduce indegree of neighbors
      for (const neighbor of adjacency.get(nodeId) || []) {
        const newIndegree = (indegree.get(neighbor) || 1) - 1;
        indegree.set(neighbor, newIndegree);
        
        if (newIndegree === 0) {
          queue.push(neighbor);
        }
      }
    }
    
    return result;
  }
  
  /**
   * Builds dependency mapping.
   * 
   * @param definition - Graph definition
   * @returns Dependency mapping
   * @private
   */
  private buildDependencyMap(definition: GraphDefinition): Record<string, string[]> {
    const dependencies: Record<string, string[]> = {};
    
    // Initialize
    for (const node of definition.nodes) {
      dependencies[node.id] = [];
    }
    
    // Build dependencies
    for (const edge of definition.edges) {
      dependencies[edge.to].push(edge.from);
    }
    
    return dependencies;
  }
  
  /**
   * Creates execution plan.
   * 
   * @param definition - Graph definition
   * @param sortedNodes - Topologically sorted nodes
   * @param dependencies - Dependency mapping
   * @returns Execution plan
   * @private
   */
  private createExecutionPlan(
    definition: GraphDefinition,
    sortedNodes: string[],
    dependencies: Record<string, string[]>
  ): ExecutionPlan {
    const phases: ExecutionPhase[] = [];
    const processed = new Set<string>();
    let phaseId = 0;
    
    while (processed.size < sortedNodes.length) {
      const readyNodes = sortedNodes.filter(nodeId => 
        !processed.has(nodeId) && 
        dependencies[nodeId].every(depId => processed.has(depId))
      );
      
      if (readyNodes.length === 0) {
        break; // Should not happen with valid DAG
      }
      
      phases.push({
        id: `phase-${phaseId++}`,
        nodes: readyNodes,
        type: readyNodes.length > 1 ? 'parallel' : 'sequential',
        dependencies: readyNodes.flatMap(nodeId => dependencies[nodeId]),
        estimatedDuration: readyNodes.length * 1000 // Simple estimation
      });
      
      readyNodes.forEach(nodeId => processed.add(nodeId));
    }
    
    return {
      phases,
      dependencies,
      parallelGroups: phases.filter(p => p.type === 'parallel').map(p => p.nodes),
      criticalPath: this.findCriticalPath(sortedNodes, dependencies),
      estimatedDuration: phases.reduce((total, phase) => total + phase.estimatedDuration, 0)
    };
  }
  
  /**
   * Finds critical path in the graph.
   * 
   * @param sortedNodes - Topologically sorted nodes
   * @param dependencies - Dependency mapping
   * @returns Critical path
   * @private
   */
  private findCriticalPath(sortedNodes: string[], dependencies: Record<string, string[]>): string[] {
    // Simplified critical path - just return the longest dependency chain
    let longestPath: string[] = [];
    
    for (const nodeId of sortedNodes) {
      const path = this.getLongestPathToNode(nodeId, dependencies);
      if (path.length > longestPath.length) {
        longestPath = path;
      }
    }
    
    return longestPath;
  }
  
  /**
   * Gets longest path to a node.
   * 
   * @param nodeId - Target node
   * @param dependencies - Dependency mapping
   * @returns Longest path
   * @private
   */
  private getLongestPathToNode(nodeId: string, dependencies: Record<string, string[]>): string[] {
    const deps = dependencies[nodeId];
    if (deps.length === 0) {
      return [nodeId];
    }
    
    let longestPath: string[] = [];
    for (const depId of deps) {
      const depPath = this.getLongestPathToNode(depId, dependencies);
      if (depPath.length > longestPath.length) {
        longestPath = depPath;
      }
    }
    
    return [...longestPath, nodeId];
  }
  
  /**
   * Validates compiled graph.
   * 
   * @param definition - Original definition
   * @param sortedNodes - Sorted nodes
   * @param dependencies - Dependencies
   * @returns Validation result
   * @private
   */
  private validateCompiledGraph(
    definition: GraphDefinition,
    sortedNodes: string[],
    dependencies: Record<string, string[]>
  ): GraphValidationResult {
    const errors: GraphValidationError[] = [];
    const warnings: GraphValidationWarning[] = [];
    
    // Check if all nodes are included in sort
    if (sortedNodes.length !== definition.nodes.length) {
      errors.push({
        code: 'INCOMPLETE_SORT',
        message: 'Topological sort is incomplete',
        severity: 'error'
      });
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions: [],
      metadata: {
        nodeCount: definition.nodes.length,
        edgeCount: definition.edges.length,
        maxDepth: 0,
        cyclicPaths: [],
        unreachableNodes: [],
        deadEndNodes: []
      }
    };
  }
}

/**
 * Static factory methods for common graph patterns.
 */
export class GraphPatterns {
  /**
   * Creates a linear pipeline graph.
   * 
   * @param nodeConfigs - Array of node configurations
   * @returns Graph builder with linear pipeline
   */
  static linearPipeline(nodeConfigs: Array<{id: string, type: NodeType, config?: NodeConfig}>): GraphBuilder {
    const builder = new GraphBuilder();
    
    // Add nodes
    for (const nodeConfig of nodeConfigs) {
      builder.addNode({
        id: nodeConfig.id,
        type: nodeConfig.type,
        name: nodeConfig.id,
        config: nodeConfig.config || {}
      });
    }
    
    // Connect nodes sequentially
    for (let i = 0; i < nodeConfigs.length - 1; i++) {
      builder.connectNodes(nodeConfigs[i].id, nodeConfigs[i + 1].id);
    }
    
    return builder;
  }
  
  /**
   * Creates a fan-out pattern.
   * 
   * @param inputNodeId - Input node ID
   * @param outputNodeIds - Output node IDs
   * @returns Graph builder with fan-out pattern
   */
  static fanOut(inputNodeId: string, outputNodeIds: string[]): GraphBuilder {
    const builder = new GraphBuilder();
    
    // Add input node
    builder.addInputNode(inputNodeId);
    
    // Add output nodes and connect them
    for (const outputId of outputNodeIds) {
      builder.addOutputNode(outputId);
      builder.connectNodes(inputNodeId, outputId);
    }
    
    return builder;
  }
  
  /**
   * Creates a fan-in pattern.
   * 
   * @param inputNodeIds - Input node IDs
   * @param outputNodeId - Output node ID
   * @returns Graph builder with fan-in pattern
   */
  static fanIn(inputNodeIds: string[], outputNodeId: string): GraphBuilder {
    const builder = new GraphBuilder();
    
    // Add input nodes
    for (const inputId of inputNodeIds) {
      builder.addInputNode(inputId);
    }
    
    // Add output node and connect inputs to it
    builder.addOutputNode(outputNodeId);
    for (const inputId of inputNodeIds) {
      builder.connectNodes(inputId, outputNodeId);
    }
    
    return builder;
  }
  
  /**
   * Creates a diamond pattern (fan-out then fan-in).
   * 
   * @param inputNodeId - Input node ID
   * @param middleNodeIds - Middle layer node IDs
   * @param outputNodeId - Output node ID
   * @returns Graph builder with diamond pattern
   */
  static diamond(inputNodeId: string, middleNodeIds: string[], outputNodeId: string): GraphBuilder {
    const builder = new GraphBuilder();
    
    // Add input node
    builder.addInputNode(inputNodeId);
    
    // Add middle nodes and connect from input
    for (const middleId of middleNodeIds) {
      builder.addTransformNode(middleId, (data) => data);
      builder.connectNodes(inputNodeId, middleId);
    }
    
    // Add output node and connect from middle nodes
    builder.addOutputNode(outputNodeId);
    for (const middleId of middleNodeIds) {
      builder.connectNodes(middleId, outputNodeId);
    }
    
    return builder;
  }
}