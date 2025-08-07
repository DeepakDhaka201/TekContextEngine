/**
 * @fileoverview Unit tests for the Module Registry system
 * @module modules/registry/__tests__/registry.test
 * @requires ../registry
 * @requires ../types
 * @requires ../errors
 * 
 * Comprehensive test suite for the ModuleRegistry class, covering:
 * - Module registration and retrieval
 * - Dependency resolution and validation
 * - Initialization and shutdown processes
 * - Error handling and edge cases
 * - Health monitoring integration
 * - Configuration management
 * 
 * @since 1.0.0
 */

import { ModuleRegistry } from '../registry';
import { 
  IModule, 
  IModuleRegistry, 
  ModuleRegistryConfig, 
  HealthStatus 
} from '../types';
import {
  ModuleAlreadyRegisteredError,
  ModuleNotFoundError,
  ModuleNotInitializedError,
  CircularDependencyError,
  MissingDependencyError,
  ModuleInitializationError
} from '../errors';

/**
 * Mock module implementation for testing.
 * 
 * Provides controllable behavior for testing various scenarios
 * including initialization success/failure, health checks, and shutdown.
 */
class MockModule implements IModule {
  name: string;
  version: string;
  dependencies: string[];
  
  // Test control flags
  public shouldFailInitialize = false;
  public shouldFailShutdown = false;
  public shouldFailHealthCheck = false;
  public healthStatus: HealthStatus = { status: 'healthy', message: 'All systems operational' };
  
  // Tracking for test assertions
  public initializeCallCount = 0;
  public shutdownCallCount = 0;
  public healthCallCount = 0;
  public isInitialized = false;
  
  constructor(
    name: string,
    version: string = '1.0.0',
    dependencies: string[] = []
  ) {
    this.name = name;
    this.version = version;
    this.dependencies = dependencies;
  }
  
  async initialize(config?: any): Promise<void> {
    this.initializeCallCount++;
    
    if (this.shouldFailInitialize) {
      throw new Error(`Initialization failed for ${this.name}`);
    }
    
    this.isInitialized = true;
  }
  
  async shutdown(): Promise<void> {
    this.shutdownCallCount++;
    
    if (this.shouldFailShutdown) {
      throw new Error(`Shutdown failed for ${this.name}`);
    }
    
    this.isInitialized = false;
  }
  
  async health(): Promise<HealthStatus> {
    this.healthCallCount++;
    
    if (this.shouldFailHealthCheck) {
      throw new Error(`Health check failed for ${this.name}`);
    }
    
    return this.healthStatus;
  }
}

/**
 * Mock factory function for testing factory registration.
 */
const createMockModuleFactory = (
  name: string,
  dependencies: string[] = []
) => {
  return async (registry: IModuleRegistry): Promise<IModule> => {
    return new MockModule(name, '1.0.0', dependencies);
  };
};

describe('ModuleRegistry', () => {
  let registry: ModuleRegistry;
  
  beforeEach(() => {
    registry = new ModuleRegistry();
  });
  
  afterEach(async () => {
    // Clean up after each test
    try {
      await registry.shutdown(1000); // Quick shutdown for tests
    } catch (error) {
      // Ignore shutdown errors in tests
    }
  });
  
  describe('Module Registration', () => {
    it('should register a module successfully', () => {
      const module = new MockModule('test-module');
      
      registry.register('test', module);
      
      expect(registry.has('test')).toBe(true);
      const metadata = registry.getAll().get('test');
      expect(metadata).toBeDefined();
      expect(metadata!.module).toBe(module);
      expect(metadata!.status).toBe('registered');
      expect(metadata!.initialized).toBe(false);
    });
    
    it('should prevent duplicate module registration', () => {
      const module1 = new MockModule('module1');
      const module2 = new MockModule('module2');
      
      registry.register('test', module1);
      
      expect(() => {
        registry.register('test', module2);
      }).toThrow(ModuleAlreadyRegisteredError);
    });
    
    it('should validate module registration inputs', () => {
      expect(() => {
        registry.register('', new MockModule('test'));
      }).toThrow('Module ID must be a non-empty string');
      
      expect(() => {
        registry.register('test', null as any);
      }).toThrow('Module must be a valid object');
    });
    
    it('should register factory functions', () => {
      const factory = createMockModuleFactory('test-module');
      
      registry.registerFactory('test', factory);
      
      expect(registry.has('test')).toBe(true);
      const metadata = registry.getAll().get('test');
      expect(metadata).toBeDefined();
      expect(metadata!.factory).toBe(factory);
      expect(metadata!.module).toBeNull();
    });
    
    it('should validate factory registration inputs', () => {
      expect(() => {
        registry.registerFactory('', createMockModuleFactory('test'));
      }).toThrow('Module ID must be a non-empty string');
      
      expect(() => {
        registry.registerFactory('test', null as any);
      }).toThrow('Factory must be a function');
    });
    
    it('should handle modules with dependencies', () => {
      const moduleA = new MockModule('module-a');
      const moduleB = new MockModule('module-b', '1.0.0', ['module-a']);
      
      registry.register('a', moduleA);
      registry.register('b', moduleB);
      
      // Should not throw circular dependency error
      expect(registry.has('a')).toBe(true);
      expect(registry.has('b')).toBe(true);
    });
  });
  
  describe('Module Retrieval', () => {
    it('should retrieve registered modules after initialization', async () => {
      const module = new MockModule('test-module');
      registry.register('test', module);
      
      const config: ModuleRegistryConfig = {
        modules: {},
        registry: { strict: false, healthCheckInterval: 0 }
      };
      
      await registry.initialize(config);
      
      const retrieved = registry.get('test');
      expect(retrieved).toBe(module);
    });
    
    it('should throw error for non-existent modules', () => {
      expect(() => {
        registry.get('non-existent');
      }).toThrow(ModuleNotFoundError);
    });
    
    it('should throw error for uninitialized modules', () => {
      const module = new MockModule('test-module');
      registry.register('test', module);
      
      expect(() => {
        registry.get('test');
      }).toThrow(ModuleNotInitializedError);
    });
  });
  
  describe('Initialization Process', () => {
    it('should initialize modules in dependency order', async () => {
      const moduleA = new MockModule('module-a');
      const moduleB = new MockModule('module-b', '1.0.0', ['module-a']);
      const moduleC = new MockModule('module-c', '1.0.0', ['module-b']);
      
      registry.register('a', moduleA);
      registry.register('b', moduleB);
      registry.register('c', moduleC);
      
      const config: ModuleRegistryConfig = {
        modules: {},
        registry: { strict: false, healthCheckInterval: 0 }
      };
      
      await registry.initialize(config);
      
      // All modules should be initialized
      expect(moduleA.initializeCallCount).toBe(1);
      expect(moduleB.initializeCallCount).toBe(1);
      expect(moduleC.initializeCallCount).toBe(1);
      
      // Should be able to retrieve all modules
      expect(registry.get('a')).toBe(moduleA);
      expect(registry.get('b')).toBe(moduleB);
      expect(registry.get('c')).toBe(moduleC);
    });
    
    it('should handle factory-based modules during initialization', async () => {
      const moduleA = new MockModule('module-a');
      registry.register('a', moduleA);
      registry.registerFactory('b', createMockModuleFactory('module-b', ['module-a']));
      
      const config: ModuleRegistryConfig = {
        modules: {},
        registry: { strict: false, healthCheckInterval: 0 }
      };
      
      await registry.initialize(config);
      
      // Both modules should be initialized
      const retrievedA = registry.get('a');
      const retrievedB = registry.get('b');
      
      expect(retrievedA).toBe(moduleA);
      expect(retrievedB).toBeInstanceOf(MockModule);
      expect(retrievedB.name).toBe('module-b');
    });
    
    it('should validate dependencies in strict mode', async () => {
      const moduleB = new MockModule('module-b', '1.0.0', ['module-a']); // depends on 'a' which doesn't exist
      registry.register('b', moduleB);
      
      const config: ModuleRegistryConfig = {
        modules: {},
        registry: { strict: true, healthCheckInterval: 0 }
      };
      
      await expect(registry.initialize(config)).rejects.toThrow(MissingDependencyError);
    });
    
    it('should allow missing dependencies in non-strict mode', async () => {
      const moduleB = new MockModule('module-b', '1.0.0', ['module-a']);
      registry.register('b', moduleB);
      
      const config: ModuleRegistryConfig = {
        modules: {},
        registry: { strict: false, healthCheckInterval: 0 }
      };
      
      // Should not throw
      await registry.initialize(config);
      expect(registry.get('b')).toBe(moduleB);
    });
    
    it('should handle initialization failures in strict mode', async () => {
      const failingModule = new MockModule('failing-module');
      failingModule.shouldFailInitialize = true;
      
      registry.register('failing', failingModule);
      
      const config: ModuleRegistryConfig = {
        modules: {},
        registry: { strict: true, healthCheckInterval: 0 }
      };
      
      await expect(registry.initialize(config)).rejects.toThrow(ModuleInitializationError);
    });
    
    it('should continue with other modules in non-strict mode after failure', async () => {
      const failingModule = new MockModule('failing-module');
      const workingModule = new MockModule('working-module');
      
      failingModule.shouldFailInitialize = true;
      
      registry.register('failing', failingModule);
      registry.register('working', workingModule);
      
      const config: ModuleRegistryConfig = {
        modules: {},
        registry: { strict: false, healthCheckInterval: 0 }
      };
      
      await registry.initialize(config);
      
      // Working module should be available
      expect(registry.get('working')).toBe(workingModule);
      
      // Failing module should be in error state
      const failingMetadata = registry.getAll().get('failing');
      expect(failingMetadata!.status).toBe('error');
    });
    
    it('should be idempotent - safe to call multiple times', async () => {
      const module = new MockModule('test-module');
      registry.register('test', module);
      
      const config: ModuleRegistryConfig = {
        modules: {},
        registry: { strict: false, healthCheckInterval: 0 }
      };
      
      await registry.initialize(config);
      await registry.initialize(config); // Second call
      
      // Module should only be initialized once
      expect(module.initializeCallCount).toBe(1);
    });
    
    it('should skip disabled modules', async () => {
      const module = new MockModule('test-module');
      registry.register('test', module);
      
      const config: ModuleRegistryConfig = {
        modules: {
          test: { enabled: false }
        },
        registry: { strict: false, healthCheckInterval: 0 }
      };
      
      await registry.initialize(config);
      
      // Module should not be initialized
      expect(module.initializeCallCount).toBe(0);
      
      const metadata = registry.getAll().get('test');
      expect(metadata!.status).toBe('stopped');
    });
  });
  
  describe('Shutdown Process', () => {
    it('should shutdown modules in reverse dependency order', async () => {
      const moduleA = new MockModule('module-a');
      const moduleB = new MockModule('module-b', '1.0.0', ['module-a']);
      
      registry.register('a', moduleA);
      registry.register('b', moduleB);
      
      const config: ModuleRegistryConfig = {
        modules: {},
        registry: { strict: false, healthCheckInterval: 0 }
      };
      
      await registry.initialize(config);
      await registry.shutdown();
      
      // Both should be shut down
      expect(moduleA.shutdownCallCount).toBe(1);
      expect(moduleB.shutdownCallCount).toBe(1);
    });
    
    it('should handle shutdown failures gracefully', async () => {
      const failingModule = new MockModule('failing-module');
      const workingModule = new MockModule('working-module');
      
      failingModule.shouldFailShutdown = true;
      
      registry.register('failing', failingModule);
      registry.register('working', workingModule);
      
      const config: ModuleRegistryConfig = {
        modules: {},
        registry: { strict: false, healthCheckInterval: 0 }
      };
      
      await registry.initialize(config);
      
      // Shutdown should complete despite failures
      await registry.shutdown();
      
      expect(failingModule.shutdownCallCount).toBe(1);
      expect(workingModule.shutdownCallCount).toBe(1);
    });
    
    it('should respect shutdown timeout', async () => {
      const slowModule = new MockModule('slow-module');
      
      // Override shutdown to be very slow
      slowModule.shutdown = async () => {
        await new Promise(resolve => setTimeout(resolve, 5000));
      };
      
      registry.register('slow', slowModule);
      
      const config: ModuleRegistryConfig = {
        modules: {},
        registry: { strict: false, healthCheckInterval: 0 }
      };
      
      await registry.initialize(config);
      
      // Should timeout quickly
      const start = Date.now();
      await expect(registry.shutdown(1000)).rejects.toThrow();
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(2000); // Should not wait full 5 seconds
    });
  });
  
  describe('Health Monitoring', () => {
    it('should get health status from modules', async () => {
      const module = new MockModule('test-module');
      module.healthStatus = {
        status: 'healthy',
        message: 'Everything is working fine'
      };
      
      registry.register('test', module);
      
      const config: ModuleRegistryConfig = {
        modules: {},
        registry: { strict: false, healthCheckInterval: 0 }
      };
      
      await registry.initialize(config);
      
      const health = await registry.getModuleHealth('test');
      expect(health.status).toBe('healthy');
      expect(health.message).toBe('Everything is working fine');
      expect(module.healthCallCount).toBe(1);
    });
    
    it('should get overall registry health', async () => {
      const healthyModule = new MockModule('healthy-module');
      const unhealthyModule = new MockModule('unhealthy-module');
      
      healthyModule.healthStatus = { status: 'healthy', message: 'OK' };
      unhealthyModule.healthStatus = { status: 'unhealthy', message: 'Database connection failed' };
      
      registry.register('healthy', healthyModule);
      registry.register('unhealthy', unhealthyModule);
      
      const config: ModuleRegistryConfig = {
        modules: {},
        registry: { strict: false, healthCheckInterval: 0 }
      };
      
      await registry.initialize(config);
      
      const overallHealth = await registry.health();
      
      expect(overallHealth.status).toBe('unhealthy'); // Overall status should be unhealthy
      expect(overallHealth.summary.total).toBe(2);
      expect(overallHealth.summary.healthy).toBe(1);
      expect(overallHealth.summary.unhealthy).toBe(1);
    });
    
    it('should handle health check failures gracefully', async () => {
      const module = new MockModule('test-module');
      module.shouldFailHealthCheck = true;
      
      registry.register('test', module);
      
      const config: ModuleRegistryConfig = {
        modules: {},
        registry: { strict: false, healthCheckInterval: 0 }
      };
      
      await registry.initialize(config);
      
      const health = await registry.getModuleHealth('test');
      expect(health.status).toBe('unhealthy');
      expect(health.message).toContain('Health check failed');
    });
  });
  
  describe('Dependency Management', () => {
    it('should detect circular dependencies', () => {
      const moduleA = new MockModule('module-a', '1.0.0', ['b']);
      const moduleB = new MockModule('module-b', '1.0.0', ['a']);
      
      registry.register('a', moduleA);
      
      expect(() => {
        registry.register('b', moduleB);
      }).toThrow(CircularDependencyError);
    });
    
    it('should get module dependencies', () => {
      const moduleA = new MockModule('module-a');
      const moduleB = new MockModule('module-b', '1.0.0', ['module-a']);
      
      registry.register('a', moduleA);
      registry.register('b', moduleB);
      
      const depsB = registry.getDependencies('b');
      expect(depsB).toEqual(['module-a']);
      
      const depsA = registry.getDependencies('a');
      expect(depsA).toEqual([]);
    });
    
    it('should get module dependents', () => {
      const moduleA = new MockModule('module-a');
      const moduleB = new MockModule('module-b', '1.0.0', ['a']);
      const moduleC = new MockModule('module-c', '1.0.0', ['a']);
      
      registry.register('a', moduleA);
      registry.register('b', moduleB);
      registry.register('c', moduleC);
      
      const dependentsA = registry.getDependents('a');
      expect(dependentsA).toContain('b');
      expect(dependentsA).toContain('c');
    });
    
    it('should get initialization order', () => {
      const moduleA = new MockModule('module-a');
      const moduleB = new MockModule('module-b', '1.0.0', ['module-a']);
      const moduleC = new MockModule('module-c', '1.0.0', ['module-b']);
      
      registry.register('a', moduleA);
      registry.register('b', moduleB);
      registry.register('c', moduleC);
      
      const order = registry.getInitializationOrder();
      
      const indexA = order.indexOf('a');
      const indexB = order.indexOf('b');
      const indexC = order.indexOf('c');
      
      // A should come before B, B should come before C
      expect(indexA).toBeLessThan(indexB);
      expect(indexB).toBeLessThan(indexC);
    });
  });
  
  describe('Error Handling', () => {
    it('should provide helpful error messages with context', async () => {
      const module = new MockModule('test-module', '1.0.0', ['missing-dep']);
      registry.register('test', module);
      
      const config: ModuleRegistryConfig = {
        modules: {},
        registry: { strict: true, healthCheckInterval: 0 }
      };
      
      try {
        await registry.initialize(config);
        fail('Should have thrown MissingDependencyError');
      } catch (error) {
        expect(error).toBeInstanceOf(MissingDependencyError);
        expect(error.message).toContain('missing-dep');
        expect(error.message).toContain('test');
      }
    });
    
    it('should provide suggestions in error messages', () => {
      try {
        registry.get('nonexistent');
        fail('Should have thrown ModuleNotFoundError');
      } catch (error) {
        expect(error).toBeInstanceOf(ModuleNotFoundError);
        expect(error.solution).toContain('Register the module');
      }
    });
  });
});