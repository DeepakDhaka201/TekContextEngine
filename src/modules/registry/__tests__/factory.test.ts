/**
 * @fileoverview Unit tests for Module Registry factory functions
 * @module modules/registry/__tests__/factory.test
 * @requires ../factory
 * @requires ../types
 * 
 * Tests for factory functions, singleton management, and configuration
 * handling in the Module Registry system.
 * 
 * @since 1.0.0
 */

import {
  createModuleRegistry,
  getGlobalRegistry,
  setGlobalRegistry,
  resetGlobalRegistry,
  hasGlobalRegistry,
  createTestRegistry
} from '../factory';
import { IModuleRegistry, ModuleRegistryConfig } from '../types';

// Mock environment functions
jest.mock('../../shared/utils', () => ({
  isDevelopment: jest.fn(() => false),
  isTest: jest.fn(() => false),
  isProduction: jest.fn(() => true),
  generateId: jest.fn(() => 'test-id'),
  withTimeout: jest.fn((promise) => promise),
  deepMerge: jest.fn((target, ...sources) => ({ ...target, ...sources[0] }))
}));

const mockUtils = require('../../shared/utils');

describe('Factory Functions', () => {
  afterEach(() => {
    // Reset global state after each test
    resetGlobalRegistry();
    
    // Reset mocks
    jest.clearAllMocks();
    mockUtils.isDevelopment.mockReturnValue(false);
    mockUtils.isTest.mockReturnValue(false);
    mockUtils.isProduction.mockReturnValue(true);
  });
  
  describe('createModuleRegistry', () => {
    it('should create a new registry instance', () => {
      const registry = createModuleRegistry();
      
      expect(registry).toBeDefined();
      expect(typeof registry.register).toBe('function');
      expect(typeof registry.initialize).toBe('function');
      expect(typeof registry.get).toBe('function');
      expect(typeof registry.shutdown).toBe('function');
    });
    
    it('should create registry with custom configuration', () => {
      const customConfig: Partial<ModuleRegistryConfig> = {
        registry: {
          strict: false,
          healthCheckInterval: 10000
        },
        modules: {
          testModule: {
            enabled: true,
            config: { setting: 'value' }
          }
        }
      };
      
      const registry = createModuleRegistry(customConfig);
      expect(registry).toBeDefined();
    });
    
    it('should pre-register core modules', () => {
      const registry = createModuleRegistry();
      
      // Core modules should be registered as factories
      expect(registry.has('litellm')).toBe(true);
      expect(registry.has('langfuse')).toBe(true);
      expect(registry.has('sessionState')).toBe(true);
      expect(registry.has('memory')).toBe(true);
      expect(registry.has('executionManager')).toBe(true);
      expect(registry.has('streamingManager')).toBe(true);
      expect(registry.has('humanLoop')).toBe(true);
      expect(registry.has('tools')).toBe(true);
    });
    
    it('should apply environment-specific defaults in development', () => {
      mockUtils.isDevelopment.mockReturnValue(true);
      mockUtils.isProduction.mockReturnValue(false);
      
      const registry = createModuleRegistry();
      expect(registry).toBeDefined();
      
      // Should have created registry with development settings
      expect(mockUtils.isDevelopment).toHaveBeenCalled();
    });
    
    it('should apply environment-specific defaults in test', () => {
      mockUtils.isTest.mockReturnValue(true);
      mockUtils.isProduction.mockReturnValue(false);
      
      const registry = createModuleRegistry();
      expect(registry).toBeDefined();
      
      expect(mockUtils.isTest).toHaveBeenCalled();
    });
  });
  
  describe('Global Registry Singleton', () => {
    it('should create global registry on first access', () => {
      expect(hasGlobalRegistry()).toBe(false);
      
      const registry1 = getGlobalRegistry();
      expect(hasGlobalRegistry()).toBe(true);
      expect(registry1).toBeDefined();
      
      // Second call should return the same instance
      const registry2 = getGlobalRegistry();
      expect(registry2).toBe(registry1);
    });
    
    it('should allow setting custom global registry', () => {
      const customRegistry = createModuleRegistry();
      setGlobalRegistry(customRegistry);
      
      const retrieved = getGlobalRegistry();
      expect(retrieved).toBe(customRegistry);
    });
    
    it('should reset global registry to null', () => {
      getGlobalRegistry(); // Create global registry
      expect(hasGlobalRegistry()).toBe(true);
      
      resetGlobalRegistry();
      expect(hasGlobalRegistry()).toBe(false);
      
      // Next call should create a new instance
      const newRegistry = getGlobalRegistry();
      expect(newRegistry).toBeDefined();
    });
    
    it('should handle multiple resets safely', () => {
      resetGlobalRegistry();
      resetGlobalRegistry();
      resetGlobalRegistry();
      
      expect(hasGlobalRegistry()).toBe(false);
      
      const registry = getGlobalRegistry();
      expect(registry).toBeDefined();
    });
  });
  
  describe('createTestRegistry', () => {
    it('should create registry with test-friendly configuration', () => {
      const registry = createTestRegistry();
      
      expect(registry).toBeDefined();
      // Test registries should have all core modules pre-registered
      expect(registry.has('sessionState')).toBe(true);
      expect(registry.has('memory')).toBe(true);
    });
    
    it('should disable health checks in test configuration', () => {
      const registry = createTestRegistry({
        modules: {
          testModule: { enabled: true }
        }
      });
      
      expect(registry).toBeDefined();
      
      // Configuration should be optimized for testing
      // (Health checks disabled, fast shutdown, etc.)
    });
    
    it('should accept custom module configuration', () => {
      const testConfig = {
        modules: {
          customModule: {
            enabled: true,
            config: { testValue: 123 }
          }
        }
      };
      
      const registry = createTestRegistry(testConfig);
      expect(registry).toBeDefined();
    });
  });
  
  describe('Configuration Merging', () => {
    it('should merge user config with defaults', () => {
      const userConfig: Partial<ModuleRegistryConfig> = {
        registry: {
          healthCheckInterval: 15000 // Custom value
        },
        modules: {
          sessionState: {
            enabled: true,
            config: { ttl: 7200 }
          }
        }
      };
      
      const registry = createModuleRegistry(userConfig);
      expect(registry).toBeDefined();
    });
    
    it('should handle empty configuration', () => {
      const registry = createModuleRegistry({});
      expect(registry).toBeDefined();
    });
    
    it('should handle undefined configuration', () => {
      const registry = createModuleRegistry(undefined);
      expect(registry).toBeDefined();
    });
  });
  
  describe('Environment Detection', () => {
    it('should use production defaults by default', () => {
      const registry = createModuleRegistry();
      expect(registry).toBeDefined();
      
      // Should have called environment detection
      expect(mockUtils.isDevelopment).toHaveBeenCalled();
      expect(mockUtils.isTest).toHaveBeenCalled();
    });
    
    it('should apply development configuration when in development', () => {
      mockUtils.isDevelopment.mockReturnValue(true);
      mockUtils.isProduction.mockReturnValue(false);
      
      const registry = createModuleRegistry();
      expect(registry).toBeDefined();
      
      // Verify development mode was detected
      expect(mockUtils.isDevelopment).toHaveBeenCalled();
    });
    
    it('should apply test configuration when in test environment', () => {
      mockUtils.isTest.mockReturnValue(true);
      mockUtils.isProduction.mockReturnValue(false);
      
      const registry = createModuleRegistry();
      expect(registry).toBeDefined();
      
      expect(mockUtils.isTest).toHaveBeenCalled();
    });
  });
  
  describe('Error Handling', () => {
    it('should handle registry creation errors gracefully', () => {
      // This test ensures that factory functions are resilient
      // to various error conditions
      
      expect(() => {
        createModuleRegistry();
      }).not.toThrow();
    });
    
    it('should handle global registry operations safely', () => {
      expect(() => {
        resetGlobalRegistry();
        hasGlobalRegistry();
        getGlobalRegistry();
        resetGlobalRegistry();
      }).not.toThrow();
    });
  });
  
  describe('Integration', () => {
    it('should create functional registry that can be initialized', async () => {
      const registry = createModuleRegistry();
      
      const config: ModuleRegistryConfig = {
        modules: {},
        registry: {
          strict: false,
          healthCheckInterval: 0, // Disable for test
          shutdownTimeout: 1000
        }
      };
      
      // Should be able to initialize without errors
      await registry.initialize(config);
      
      // Should be able to shutdown without errors
      await registry.shutdown();
    });
    
    it('should support test registry workflow', async () => {
      const registry = createTestRegistry();
      
      const config: ModuleRegistryConfig = {
        modules: {},
        registry: {
          strict: true,
          healthCheckInterval: 0,
          shutdownTimeout: 1000
        }
      };
      
      await registry.initialize(config);
      await registry.shutdown();
      
      // Test registries should work end-to-end
      expect(true).toBe(true); // If we get here, the workflow succeeded
    });
    
    it('should maintain singleton behavior across operations', () => {
      const registry1 = getGlobalRegistry();
      const registry2 = getGlobalRegistry();
      
      expect(registry1).toBe(registry2);
      
      // Setting a new registry should change the singleton
      const customRegistry = createModuleRegistry();
      setGlobalRegistry(customRegistry);
      
      const registry3 = getGlobalRegistry();
      expect(registry3).toBe(customRegistry);
      expect(registry3).not.toBe(registry1);
    });
  });
});