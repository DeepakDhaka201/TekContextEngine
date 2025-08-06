/**
 * @fileoverview Public API for the Module Registry system
 * @module modules/registry
 * @requires ./registry
 * @requires ./factory
 * @requires ./types
 * @requires ./errors
 * 
 * This file provides the main entry point for the Module Registry system,
 * exporting all public interfaces, classes, and functions needed by
 * other parts of the AgentHub application.
 * 
 * Key exports:
 * - ModuleRegistry: Core registry implementation
 * - Factory functions for creating registries
 * - Type definitions for modules and configurations
 * - Error classes for registry operations
 * 
 * @example
 * ```typescript
 * import { 
 *   createModuleRegistry, 
 *   getGlobalRegistry, 
 *   IModuleRegistry,
 *   ModuleRegistry 
 * } from '@/modules/registry';
 * 
 * // Use factory function (recommended)
 * const registry = createModuleRegistry();
 * 
 * // Or use global singleton
 * const global = getGlobalRegistry();
 * ```
 * 
 * @see registry.ts for the main implementation
 * @see factory.ts for creation patterns
 * @see types.ts for interface definitions
 * @since 1.0.0
 */

// Core implementation
export { ModuleRegistry } from './registry';

// Factory functions and singleton management
export {
  createModuleRegistry,
  getGlobalRegistry,
  setGlobalRegistry,
  resetGlobalRegistry,
  hasGlobalRegistry,
  createTestRegistry
} from './factory';

// Type definitions - all interfaces and types needed by consumers
export type {
  IModule,
  IModuleRegistry,
  ModuleFactory,
  ModuleRegistryConfig,
  ModuleConfig,
  ModuleMetadata,
  ModuleStatus,
  RegistryConfig,
  DevelopmentConfig,
  HealthStatus,
  RegistryHealth
} from './types';

// Error classes for proper error handling
export {
  ModuleRegistryError,
  ModuleAlreadyRegisteredError,
  ModuleNotFoundError,
  ModuleNotInitializedError,
  ModuleInErrorStateError,
  MissingDependencyError,
  CircularDependencyError,
  ModuleInitializationError,
  ModuleShutdownError,
  RegistryTimeoutError
} from './errors';

// Utility classes (advanced usage)
export { DependencyGraph } from './dependency-graph';
export { HealthChecker } from './health-checker';

/**
 * Version information for the Module Registry system.
 * 
 * Used for compatibility checking and debugging.
 */
export const VERSION = '1.0.0';

/**
 * Default configuration values for the Module Registry.
 * 
 * These are the fallback values used when no custom configuration
 * is provided. Consumers can use these as a reference or override
 * specific values.
 */
export const DEFAULT_CONFIG = {
  registry: {
    strict: true,
    lazyLoad: false,
    healthCheckInterval: 30000,
    shutdownTimeout: 30000
  },
  development: {
    hotReload: false,
    watchPaths: []
  }
} as const;

/**
 * Quick start function for common registry setup.
 * 
 * Creates and initializes a registry with sensible defaults
 * for most use cases. This is the fastest way to get started
 * with the Module Registry system.
 * 
 * @param moduleConfigs - Optional module-specific configurations
 * @returns Promise resolving to initialized registry
 * 
 * @example
 * ```typescript
 * const registry = await quickStart({
 *   sessionState: { enabled: true },
 *   memory: { enabled: true, config: { vectorStore: 'pinecone' } }
 * });
 * 
 * // Registry is now ready to use
 * const memory = registry.get('memory');
 * ```
 * 
 * @remarks
 * This is a convenience function that combines registry creation
 * and initialization in one step. For more control over the process,
 * use createModuleRegistry() and initialize() separately.
 */
export async function quickStart(
  moduleConfigs?: Record<string, ModuleConfig>
): Promise<IModuleRegistry> {
  const registry = createModuleRegistry({
    modules: moduleConfigs || {}
  });
  
  await registry.initialize({
    modules: moduleConfigs || {},
    registry: DEFAULT_CONFIG.registry
  });
  
  return registry;
}

/**
 * Creates a minimal registry for testing purposes.
 * 
 * This is a convenience function that creates a registry with
 * test-friendly defaults and initializes it immediately.
 * 
 * @param moduleConfigs - Test module configurations
 * @returns Promise resolving to initialized test registry
 * 
 * @example
 * ```typescript
 * // In test file
 * describe('MyFeature', () => {
 *   let registry: IModuleRegistry;
 *   
 *   beforeEach(async () => {
 *     registry = await createTestSetup({
 *       myModule: { enabled: true }
 *     });
 *   });
 *   
 *   afterEach(async () => {
 *     await registry.shutdown();
 *   });
 * });
 * ```
 */
export async function createTestSetup(
  moduleConfigs?: Record<string, ModuleConfig>
): Promise<IModuleRegistry> {
  const registry = createTestRegistry({
    modules: moduleConfigs || {}
  });
  
  await registry.initialize({
    modules: moduleConfigs || {},
    registry: {
      strict: true,
      lazyLoad: false,
      healthCheckInterval: 0, // No health checks in tests
      shutdownTimeout: 1000
    }
  });
  
  return registry;
}