/**
 * @fileoverview Dependency graph management for module initialization order
 * @module modules/registry/dependency-graph
 * @requires ./errors
 * 
 * This file implements a dependency graph for determining module initialization
 * order and detecting circular dependencies. It uses topological sorting to
 * ensure dependencies are initialized before dependents.
 * 
 * Key concepts:
 * - Directed Acyclic Graph (DAG) of module dependencies
 * - Topological sorting using Kahn's algorithm
 * - Circular dependency detection using DFS
 * - Bidirectional dependency tracking (dependencies and dependents)
 * 
 * @example
 * ```typescript
 * import { DependencyGraph } from './dependency-graph';
 * 
 * const graph = new DependencyGraph();
 * graph.addNode('moduleA', ['moduleB', 'moduleC']);
 * graph.addNode('moduleB', []);
 * graph.addNode('moduleC', ['moduleB']);
 * 
 * const initOrder = graph.getInitializationOrder(); // ['moduleB', 'moduleC', 'moduleA']
 * ```
 * 
 * @see types.ts for type definitions
 * @see https://en.wikipedia.org/wiki/Topological_sorting
 * @since 1.0.0
 */

import { CircularDependencyError } from './errors';

/**
 * Internal representation of a dependency graph node.
 * 
 * Each node represents a module and tracks its dependencies
 * (what it needs) and dependents (what needs it).
 * 
 * @internal
 */
interface DependencyNode {
  /** Unique identifier for this module */
  readonly id: string;
  
  /** Set of module IDs this module depends on */
  readonly dependencies: Set<string>;
  
  /** Set of module IDs that depend on this module */
  readonly dependents: Set<string>;
}

/**
 * Manages dependency relationships between modules and determines initialization order.
 * 
 * The DependencyGraph maintains a directed acyclic graph (DAG) of module dependencies
 * and provides methods to:
 * - Add and remove modules with their dependencies
 * - Detect circular dependencies
 * - Determine proper initialization order using topological sort
 * - Query dependency relationships
 * 
 * @remarks
 * This class is designed to be efficient with O(V+E) complexity for most operations
 * where V is the number of modules and E is the number of dependency edges.
 * 
 * @example
 * ```typescript
 * const graph = new DependencyGraph();
 * 
 * // Build dependency graph
 * graph.addNode('sessionState', []);
 * graph.addNode('memory', ['sessionState']);  
 * graph.addNode('llmAgent', ['memory', 'sessionState']);
 * 
 * // Get initialization order
 * const order = graph.getInitializationOrder();
 * // Result: ['sessionState', 'memory', 'llmAgent']
 * ```
 * 
 * @public
 */
export class DependencyGraph {
  /**
   * Internal storage for dependency nodes.
   * Maps module ID to its dependency information.
   */
  private readonly nodes = new Map<string, DependencyNode>();
  
  /**
   * Adds a module node to the dependency graph.
   * 
   * If the module already exists, its dependencies are updated.
   * This method automatically creates nodes for any referenced dependencies
   * and maintains bidirectional relationships.
   * 
   * @param moduleId - Unique identifier for the module
   * @param dependencies - Array of module IDs this module depends on
   * 
   * @throws {CircularDependencyError} If adding this node creates a circular dependency
   * 
   * @example
   * ```typescript
   * graph.addNode('llmAgent', ['memory', 'sessionState']);
   * // Creates nodes for 'memory' and 'sessionState' if they don't exist
   * ```
   * 
   * Implementation notes:
   * - Creates dependency nodes automatically if they don't exist
   * - Updates bidirectional relationships (dependencies and dependents)
   * - Validates that no circular dependencies are created
   * - O(D) complexity where D is the number of dependencies
   */
  addNode(moduleId: string, dependencies: string[] = []): void {
    // Create or get the main node
    if (!this.nodes.has(moduleId)) {
      this.nodes.set(moduleId, {
        id: moduleId,
        dependencies: new Set(),
        dependents: new Set()
      });
    }
    
    const node = this.nodes.get(moduleId)!;
    
    // Clear existing dependencies and rebuild
    // This is necessary when updating an existing node's dependencies
    for (const existingDep of node.dependencies) {
      const depNode = this.nodes.get(existingDep);
      if (depNode) {
        depNode.dependents.delete(moduleId);
      }
    }
    node.dependencies.clear();
    
    // Add new dependencies
    for (const dep of dependencies) {
      // Skip self-dependencies (a module can't depend on itself)
      if (dep === moduleId) {
        console.warn(`Module '${moduleId}' cannot depend on itself, skipping self-dependency`);
        continue;
      }
      
      node.dependencies.add(dep);
      
      // Create dependency node if it doesn't exist
      if (!this.nodes.has(dep)) {
        this.nodes.set(dep, {
          id: dep,
          dependencies: new Set(),
          dependents: new Set()
        });
      }
      
      // Add reverse dependency (bidirectional relationship)
      this.nodes.get(dep)!.dependents.add(moduleId);
    }
    
    // Check for circular dependencies after adding
    // This is done after all edges are added to ensure consistency
    const cycles = this.detectCircularDependencies();
    if (cycles.length > 0) {
      // Rollback the changes by removing the node
      this.removeNode(moduleId);
      throw new CircularDependencyError(cycles[0]);
    }
  }
  
  /**
   * Removes a module node and all its relationships from the graph.
   * 
   * This method cleans up both incoming and outgoing dependency relationships
   * to maintain graph consistency.
   * 
   * @param moduleId - The module to remove
   * 
   * @example
   * ```typescript
   * graph.removeNode('oldModule');
   * // All dependencies on 'oldModule' are also removed
   * ```
   * 
   * Implementation notes:
   * - Removes the module from all dependents' dependency lists
   * - Removes the module from all dependencies' dependent lists
   * - O(D) complexity where D is the total number of dependencies/dependents
   */
  removeNode(moduleId: string): void {
    const node = this.nodes.get(moduleId);
    if (!node) {
      return; // Node doesn't exist, nothing to remove
    }
    
    // Remove this module from all its dependencies' dependents lists
    for (const dep of node.dependencies) {
      const depNode = this.nodes.get(dep);
      if (depNode) {
        depNode.dependents.delete(moduleId);
      }
    }
    
    // Remove this module from all its dependents' dependency lists
    for (const dependent of node.dependents) {
      const depNode = this.nodes.get(dependent);
      if (depNode) {
        depNode.dependencies.delete(moduleId);
      }
    }
    
    // Remove the node itself
    this.nodes.delete(moduleId);
  }
  
  /**
   * Gets the direct dependencies of a module.
   * 
   * @param moduleId - The module to query
   * @returns Array of module IDs this module directly depends on
   * 
   * @example
   * ```typescript
   * const deps = graph.getDependencies('llmAgent');
   * // Returns: ['memory', 'sessionState']
   * ```
   */
  getDependencies(moduleId: string): string[] {
    const node = this.nodes.get(moduleId);
    return node ? Array.from(node.dependencies) : [];
  }
  
  /**
   * Gets the modules that directly depend on the given module.
   * 
   * @param moduleId - The module to query
   * @returns Array of module IDs that directly depend on this module
   * 
   * @example
   * ```typescript
   * const dependents = graph.getDependents('memory');
   * // Returns: ['llmAgent', 'graphAgent']
   * ```
   */
  getDependents(moduleId: string): string[] {
    const node = this.nodes.get(moduleId);
    return node ? Array.from(node.dependents) : [];
  }
  
  /**
   * Computes the correct initialization order for all modules.
   * 
   * Uses a depth-first search (DFS) based topological sort to ensure
   * that dependencies are always initialized before their dependents.
   * 
   * @returns Array of module IDs in dependency-resolved initialization order
   * @throws {CircularDependencyError} If circular dependencies exist
   * 
   * @example
   * ```typescript
   * const order = graph.getInitializationOrder();
   * // For modules: A->B, B->C, the result would be: ['C', 'B', 'A']
   * ```
   * 
   * Implementation notes:
   * - Uses DFS-based topological sorting algorithm
   * - Detects circular dependencies during traversal
   * - O(V + E) time complexity where V = vertices, E = edges
   * - Results in reverse dependency order (dependencies first)
   */
  getInitializationOrder(): string[] {
    const result: string[] = [];
    const visited = new Set<string>();
    const tempVisited = new Set<string>();
    
    /**
     * Recursive DFS visit function for topological sort.
     * 
     * @param nodeId - Current node being visited
     * @throws {CircularDependencyError} If cycle detected
     */
    const visit = (nodeId: string): void => {
      // Cycle detection: if we're currently visiting this node, we have a cycle
      if (tempVisited.has(nodeId)) {
        throw new CircularDependencyError(this.findCycleIncluding(nodeId));
      }
      
      // Skip if already processed
      if (visited.has(nodeId)) {
        return;
      }
      
      // Mark as currently being processed
      tempVisited.add(nodeId);
      
      // Visit all dependencies first (recursive DFS)
      const node = this.nodes.get(nodeId);
      if (node) {
        for (const dep of node.dependencies) {
          visit(dep);
        }
      }
      
      // Mark as fully processed
      tempVisited.delete(nodeId);
      visited.add(nodeId);
      
      // Add to result (dependencies added first due to recursion)
      result.push(nodeId);
    };
    
    // Visit all nodes to handle disconnected components
    for (const nodeId of this.nodes.keys()) {
      if (!visited.has(nodeId)) {
        visit(nodeId);
      }
    }
    
    return result;
  }
  
  /**
   * Detects all circular dependencies in the graph.
   * 
   * Uses depth-first search to find strongly connected components
   * that represent circular dependency chains.
   * 
   * @returns Array of circular dependency chains (each chain is an array of module IDs)
   * 
   * @example
   * ```typescript
   * const cycles = graph.detectCircularDependencies();
   * // Returns: [['moduleA', 'moduleB', 'moduleC']] if A->B->C->A
   * ```
   * 
   * Implementation notes:
   * - Returns all cycles found, not just the first one
   * - Each cycle is represented as an array of module IDs
   * - O(V + E) time complexity
   * - Used primarily for validation and error reporting
   */
  detectCircularDependencies(): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const path: string[] = [];
    
    /**
     * DFS function to detect cycles.
     * 
     * @param nodeId - Current node being explored
     * @returns True if a cycle was found from this path
     */
    const detectCycle = (nodeId: string): boolean => {
      // Check if we've encountered this node in the current path (cycle detected)
      const pathIndex = path.indexOf(nodeId);
      if (pathIndex !== -1) {
        // Extract the cycle from the path
        const cycle = path.slice(pathIndex);
        cycles.push([...cycle]);
        return true;
      }
      
      // Skip if already fully explored from another path
      if (visited.has(nodeId)) {
        return false;
      }
      
      // Add to current path and continue exploration
      path.push(nodeId);
      
      const node = this.nodes.get(nodeId);
      if (node) {
        // Explore all dependencies
        for (const dep of node.dependencies) {
          if (detectCycle(dep)) {
            // Cycle found, but continue to find all cycles
          }
        }
      }
      
      // Mark as fully explored and remove from path
      visited.add(nodeId);
      path.pop();
      
      return false;
    };
    
    // Check all nodes to find all cycles
    for (const nodeId of this.nodes.keys()) {
      if (!visited.has(nodeId)) {
        detectCycle(nodeId);
      }
    }
    
    return cycles;
  }
  
  /**
   * Finds a cycle that includes the specified node.
   * 
   * This is a helper method used for error reporting when a cycle
   * is detected during topological sort.
   * 
   * @param nodeId - Node that should be included in the cycle
   * @returns Array representing the cycle path
   * 
   * @internal
   */
  private findCycleIncluding(nodeId: string): string[] {
    const visited = new Set<string>();
    const path: string[] = [];
    
    const findCycle = (currentNode: string): string[] | null => {
      const pathIndex = path.indexOf(currentNode);
      if (pathIndex !== -1) {
        return path.slice(pathIndex);
      }
      
      if (visited.has(currentNode)) {
        return null;
      }
      
      path.push(currentNode);
      visited.add(currentNode);
      
      const node = this.nodes.get(currentNode);
      if (node) {
        for (const dep of node.dependencies) {
          const cycle = findCycle(dep);
          if (cycle && cycle.includes(nodeId)) {
            return cycle;
          }
        }
      }
      
      path.pop();
      return null;
    };
    
    return findCycle(nodeId) || [nodeId]; // Fallback to single node if no cycle found
  }
  
  /**
   * Gets all registered module IDs.
   * 
   * @returns Array of all module IDs in the graph
   * 
   * @example
   * ```typescript
   * const allModules = graph.getAllNodes();
   * console.log(`Total modules: ${allModules.length}`);
   * ```
   */
  getAllNodes(): string[] {
    return Array.from(this.nodes.keys());
  }
  
  /**
   * Checks if a module exists in the graph.
   * 
   * @param moduleId - The module ID to check
   * @returns True if the module exists in the graph
   */
  hasNode(moduleId: string): boolean {
    return this.nodes.has(moduleId);
  }
  
  /**
   * Gets the total number of modules in the graph.
   * 
   * @returns Number of modules
   */
  size(): number {
    return this.nodes.size;
  }
  
  /**
   * Clears all nodes and relationships from the graph.
   * 
   * @example
   * ```typescript
   * graph.clear();
   * console.log(graph.size()); // 0
   * ```
   */
  clear(): void {
    this.nodes.clear();
  }
  
  /**
   * Creates a visual representation of the dependency graph.
   * 
   * Useful for debugging and understanding complex dependency relationships.
   * 
   * @returns String representation of the graph
   * 
   * @example
   * ```typescript
   * console.log(graph.toString());
   * // Output:
   * // moduleA -> [moduleB, moduleC]
   * // moduleB -> []
   * // moduleC -> [moduleB]
   * ```
   */
  toString(): string {
    const lines: string[] = [];
    
    for (const [nodeId, node] of this.nodes.entries()) {
      const deps = Array.from(node.dependencies).sort().join(', ') || '(no dependencies)';
      lines.push(`${nodeId} -> [${deps}]`);
    }
    
    return lines.sort().join('\n');
  }
  
  /**
   * Validates the integrity of the dependency graph.
   * 
   * Checks for:
   * - Bidirectional relationship consistency
   * - No orphaned references
   * - No self-dependencies
   * 
   * @returns Object containing validation results and any issues found
   * 
   * @internal - Used primarily for testing and debugging
   */
  validate(): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    
    for (const [nodeId, node] of this.nodes.entries()) {
      // Check forward dependencies
      for (const dep of node.dependencies) {
        const depNode = this.nodes.get(dep);
        if (!depNode) {
          issues.push(`Node '${nodeId}' depends on non-existent node '${dep}'`);
        } else if (!depNode.dependents.has(nodeId)) {
          issues.push(`Bidirectional relationship broken: '${nodeId}' -> '${dep}' but '${dep}' doesn't list '${nodeId}' as dependent`);
        }
      }
      
      // Check backward dependencies (dependents)
      for (const dependent of node.dependents) {
        const depNode = this.nodes.get(dependent);
        if (!depNode) {
          issues.push(`Node '${nodeId}' lists non-existent node '${dependent}' as dependent`);
        } else if (!depNode.dependencies.has(nodeId)) {
          issues.push(`Bidirectional relationship broken: '${nodeId}' lists '${dependent}' as dependent but '${dependent}' doesn't depend on '${nodeId}'`);
        }
      }
      
      // Check for self-dependencies
      if (node.dependencies.has(nodeId)) {
        issues.push(`Node '${nodeId}' has illegal self-dependency`);
      }
    }
    
    return {
      valid: issues.length === 0,
      issues
    };
  }
}