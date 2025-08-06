/**
 * @fileoverview Unit tests for the Dependency Graph system
 * @module modules/registry/__tests__/dependency-graph.test
 * @requires ../dependency-graph
 * @requires ../errors
 * 
 * Tests for dependency resolution, topological sorting, and circular
 * dependency detection in the Module Registry system.
 * 
 * @since 1.0.0
 */

import { DependencyGraph } from '../dependency-graph';
import { CircularDependencyError } from '../errors';

describe('DependencyGraph', () => {
  let graph: DependencyGraph;
  
  beforeEach(() => {
    graph = new DependencyGraph();
  });
  
  describe('Node Management', () => {
    it('should add nodes without dependencies', () => {
      graph.addNode('a');
      graph.addNode('b');
      
      expect(() => graph.getInitializationOrder()).not.toThrow();
      
      const order = graph.getInitializationOrder();
      expect(order).toContain('a');
      expect(order).toContain('b');
    });
    
    it('should add nodes with dependencies', () => {
      graph.addNode('a');
      graph.addNode('b', ['a']);
      
      const order = graph.getInitializationOrder();
      const indexA = order.indexOf('a');
      const indexB = order.indexOf('b');
      
      expect(indexA).toBeLessThan(indexB);
    });
    
    it('should handle multiple dependencies', () => {
      graph.addNode('a');
      graph.addNode('b');
      graph.addNode('c', ['a', 'b']);
      
      const order = graph.getInitializationOrder();
      const indexA = order.indexOf('a');
      const indexB = order.indexOf('b');
      const indexC = order.indexOf('c');
      
      expect(indexA).toBeLessThan(indexC);
      expect(indexB).toBeLessThan(indexC);
    });
    
    it('should allow removing nodes', () => {
      graph.addNode('a');
      graph.addNode('b', ['a']);
      
      graph.removeNode('b');
      
      const order = graph.getInitializationOrder();
      expect(order).toContain('a');
      expect(order).not.toContain('b');
    });
    
    it('should handle removing non-existent nodes gracefully', () => {
      expect(() => {
        graph.removeNode('non-existent');
      }).not.toThrow();
    });
    
    it('should update dependencies when removing nodes', () => {
      graph.addNode('a');
      graph.addNode('b', ['a']);
      graph.addNode('c', ['b']);
      
      // Remove middle node
      graph.removeNode('b');
      
      const order = graph.getInitializationOrder();
      expect(order).toContain('a');
      expect(order).toContain('c');
      expect(order).not.toContain('b');
    });
  });
  
  describe('Dependency Resolution', () => {
    it('should resolve simple dependency chain', () => {
      graph.addNode('a');
      graph.addNode('b', ['a']);
      graph.addNode('c', ['b']);
      
      const order = graph.getInitializationOrder();
      
      expect(order).toEqual(['a', 'b', 'c']);
    });
    
    it('should handle parallel dependencies', () => {
      graph.addNode('a');
      graph.addNode('b');
      graph.addNode('c', ['a', 'b']);
      
      const order = graph.getInitializationOrder();
      const indexA = order.indexOf('a');
      const indexB = order.indexOf('b');
      const indexC = order.indexOf('c');
      
      expect(indexA).toBeLessThan(indexC);
      expect(indexB).toBeLessThan(indexC);
      // A and B can be in any order relative to each other
    });
    
    it('should handle diamond dependency pattern', () => {
      /*
       * Graph structure:
       *     a
       *   /   \\
       *  b     c
       *   \\   /
       *     d
       */
      graph.addNode('a');
      graph.addNode('b', ['a']);
      graph.addNode('c', ['a']);
      graph.addNode('d', ['b', 'c']);
      
      const order = graph.getInitializationOrder();
      
      const indexA = order.indexOf('a');
      const indexB = order.indexOf('b');
      const indexC = order.indexOf('c');
      const indexD = order.indexOf('d');
      
      expect(indexA).toBeLessThan(indexB);
      expect(indexA).toBeLessThan(indexC);
      expect(indexB).toBeLessThan(indexD);
      expect(indexC).toBeLessThan(indexD);
    });
    
    it('should handle complex dependency patterns', () => {
      graph.addNode('logging');
      graph.addNode('config', ['logging']);
      graph.addNode('database', ['config']);
      graph.addNode('cache', ['config']);
      graph.addNode('session', ['database', 'cache']);
      graph.addNode('auth', ['session']);
      graph.addNode('api', ['auth', 'database']);
      
      const order = graph.getInitializationOrder();
      
      // Verify critical dependencies are respected
      expect(order.indexOf('logging')).toBeLessThan(order.indexOf('config'));
      expect(order.indexOf('config')).toBeLessThan(order.indexOf('database'));
      expect(order.indexOf('config')).toBeLessThan(order.indexOf('cache'));
      expect(order.indexOf('database')).toBeLessThan(order.indexOf('session'));
      expect(order.indexOf('cache')).toBeLessThan(order.indexOf('session'));
      expect(order.indexOf('session')).toBeLessThan(order.indexOf('auth'));
      expect(order.indexOf('auth')).toBeLessThan(order.indexOf('api'));
      expect(order.indexOf('database')).toBeLessThan(order.indexOf('api'));
    });
    
    it('should handle forward dependencies (dependencies not yet added)', () => {
      // Add B first, which depends on A (not yet added)
      graph.addNode('b', ['a']);
      graph.addNode('a'); // Add A later
      
      const order = graph.getInitializationOrder();
      const indexA = order.indexOf('a');
      const indexB = order.indexOf('b');
      
      expect(indexA).toBeLessThan(indexB);
    });
  });
  
  describe('Circular Dependency Detection', () => {
    it('should detect simple circular dependency', () => {
      graph.addNode('a', ['b']);
      
      expect(() => {
        graph.addNode('b', ['a']);
      }).toThrow(CircularDependencyError);
    });
    
    it('should detect longer circular dependency chain', () => {
      graph.addNode('a', ['b']);
      graph.addNode('b', ['c']);
      
      expect(() => {
        graph.addNode('c', ['a']);
      }).toThrow(CircularDependencyError);
    });
    
    it('should detect self-dependency', () => {
      expect(() => {
        graph.addNode('a', ['a']);
      }).toThrow(CircularDependencyError);
    });
    
    it('should detect complex circular dependencies', () => {
      /*
       * Create a valid part of the graph first:
       *   a -> b -> c
       *   
       * Then try to add a circular dependency:
       *   d -> e -> f -> d
       */
      graph.addNode('a');
      graph.addNode('b', ['a']);
      graph.addNode('c', ['b']);
      
      // Add first part of circular chain
      graph.addNode('d', ['e']);
      graph.addNode('e', ['f']);
      
      // This should detect the circular dependency
      expect(() => {
        graph.addNode('f', ['d']);
      }).toThrow(CircularDependencyError);
    });
    
    it('should allow valid complex graphs', () => {
      // This should NOT throw - it's a valid DAG
      graph.addNode('a');
      graph.addNode('b', ['a']);
      graph.addNode('c', ['a']);
      graph.addNode('d', ['b']);
      graph.addNode('e', ['c']);
      graph.addNode('f', ['d', 'e']);
      
      expect(() => graph.getInitializationOrder()).not.toThrow();
    });
    
    it('should provide detailed circular dependency information', () => {
      graph.addNode('a', ['b']);
      
      try {
        graph.addNode('b', ['a']);
        fail('Should have thrown CircularDependencyError');
      } catch (error) {
        expect(error).toBeInstanceOf(CircularDependencyError);
        expect(error.message).toContain('circular dependency');
        expect(error.cycle).toBeDefined();
        expect(error.cycle.length).toBeGreaterThan(0);
      }
    });
    
    it('should detect all circular dependencies', () => {
      graph.addNode('a', ['b']);
      graph.addNode('b', ['c']);
      graph.addNode('c', ['a']); // Should throw here
      
      // If we get here, detection failed
      const cycles = graph.detectCircularDependencies();
      expect(cycles.length).toBeGreaterThan(0);
    });
  });
  
  describe('Dependency Queries', () => {
    beforeEach(() => {
      // Set up a test graph:
      //   a -> b -> d
      //   a -> c -> d
      graph.addNode('a');
      graph.addNode('b', ['a']);
      graph.addNode('c', ['a']);
      graph.addNode('d', ['b', 'c']);
    });
    
    it('should get direct dependencies', () => {
      const depsD = graph.getDependencies('d');
      expect(depsD).toEqual(expect.arrayContaining(['b', 'c']));
      expect(depsD).toHaveLength(2);
      
      const depsB = graph.getDependencies('b');
      expect(depsB).toEqual(['a']);
      
      const depsA = graph.getDependencies('a');
      expect(depsA).toEqual([]);
    });
    
    it('should get direct dependents', () => {
      const dependentsA = graph.getDependents('a');
      expect(dependentsA).toEqual(expect.arrayContaining(['b', 'c']));
      expect(dependentsA).toHaveLength(2);
      
      const dependentsB = graph.getDependents('b');
      expect(dependentsB).toEqual(['d']);
      
      const dependentsD = graph.getDependents('d');
      expect(dependentsD).toEqual([]);
    });
    
    it('should handle queries for non-existent nodes', () => {
      expect(graph.getDependencies('non-existent')).toEqual([]);
      expect(graph.getDependents('non-existent')).toEqual([]);
    });
  });
  
  describe('Edge Cases', () => {
    it('should handle empty graph', () => {
      const order = graph.getInitializationOrder();
      expect(order).toEqual([]);
    });
    
    it('should handle single node', () => {
      graph.addNode('single');
      
      const order = graph.getInitializationOrder();
      expect(order).toEqual(['single']);
    });
    
    it('should handle nodes with empty dependency arrays', () => {
      graph.addNode('a', []);
      graph.addNode('b', []);
      
      const order = graph.getInitializationOrder();
      expect(order).toHaveLength(2);
      expect(order).toContain('a');
      expect(order).toContain('b');
    });
    
    it('should handle duplicate dependencies in array', () => {
      graph.addNode('a');
      graph.addNode('b', ['a', 'a', 'a']); // Duplicate dependencies
      
      const order = graph.getInitializationOrder();
      expect(order.indexOf('a')).toBeLessThan(order.indexOf('b'));
    });
    
    it('should handle updating node dependencies', () => {
      graph.addNode('a');
      graph.addNode('b', ['a']);
      
      // Update B to have no dependencies
      graph.addNode('b', []);
      
      const order = graph.getInitializationOrder();
      expect(order).toContain('a');
      expect(order).toContain('b');
      // A and B can now be in any order
    });
    
    it('should handle adding same node multiple times', () => {
      graph.addNode('a');
      graph.addNode('a'); // Should not cause issues
      graph.addNode('a', ['b']);
      graph.addNode('b');
      
      const order = graph.getInitializationOrder();
      expect(order.indexOf('b')).toBeLessThan(order.indexOf('a'));
    });
  });
  
  describe('Performance', () => {
    it('should handle large graphs efficiently', () => {
      const startTime = Date.now();
      
      // Create a large graph with 1000 nodes
      for (let i = 0; i < 1000; i++) {
        const dependencies = i > 0 ? [`node-${i - 1}`] : [];
        graph.addNode(`node-${i}`, dependencies);
      }
      
      const order = graph.getInitializationOrder();
      const duration = Date.now() - startTime;
      
      expect(order).toHaveLength(1000);
      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
    });
    
    it('should handle wide graphs efficiently', () => {
      const startTime = Date.now();
      
      // Create a root node
      graph.addNode('root');
      
      // Create 100 nodes that all depend on root
      for (let i = 0; i < 100; i++) {
        graph.addNode(`child-${i}`, ['root']);
      }
      
      // Create a final node that depends on all children
      const allChildren = Array.from({ length: 100 }, (_, i) => `child-${i}`);
      graph.addNode('final', allChildren);
      
      const order = graph.getInitializationOrder();
      const duration = Date.now() - startTime;
      
      expect(order).toHaveLength(102); // root + 100 children + final
      expect(order[0]).toBe('root');
      expect(order[order.length - 1]).toBe('final');
      expect(duration).toBeLessThan(500); // Should be fast
    });
  });
});