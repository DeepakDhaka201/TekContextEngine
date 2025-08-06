/**
 * @fileoverview Module Registry factory and singleton management
 * @module modules/registry/factory
 * @requires ./registry
 * @requires ./types
 * 
 * This file provides factory functions for creating Module Registry instances
 * and manages the global singleton registry that is used throughout the
 * AgentHub application.
 * 
 * Key concepts:
 * - Factory pattern for registry creation with sensible defaults
 * - Singleton pattern for global registry access
 * - Pre-registration of core modules with factories
 * - Environment-specific configuration
 * - Safe singleton replacement for testing
 * 
 * @example
 * ```typescript
 * import { createModuleRegistry, getGlobalRegistry } from './factory';
 * 
 * // Create a custom registry
 * const registry = createModuleRegistry({
 *   modules: { sessionState: { enabled: true } }
 * });
 * 
 * // Get the global singleton
 * const global = getGlobalRegistry();
 * ```
 * 
 * @see registry.ts for the main implementation
 * @see types.ts for configuration interfaces
 * @since 1.0.0
 */

import { ModuleRegistry } from './registry';
import { IModuleRegistry, ModuleRegistryConfig } from './types';
import { isDevelopment, isTest } from '../../shared/utils';

/**
 * Creates a new Module Registry instance with sensible defaults.
 * 
 * This factory function creates a registry and pre-registers all core
 * AgentHub modules using factory functions. This enables lazy loading
 * and proper dependency injection.
 * 
 * @param config - Optional registry configuration (merged with defaults)
 * @returns A new Module Registry instance with core modules registered
 * 
 * @example
 * ```typescript
 * const registry = createModuleRegistry({
 *   modules: {
 *     sessionState: {
 *       enabled: true,
 *       config: { storage: 'redis', ttl: 3600 }
 *     },
 *     memory: {
 *       enabled: true,
 *       config: { vectorStore: 'pinecone' }
 *     }
 *   },
 *   registry: {
 *     strict: true,
 *     healthCheckInterval: 30000
 *   }
 * });
 * 
 * await registry.initialize(config);
 * ```
 * 
 * Implementation notes:
 * - Registers factories for all core modules
 * - Uses lazy loading to avoid circular dependencies
 * - Provides environment-specific defaults
 * - Factories handle dependency injection automatically
 */
export function createModuleRegistry(
  config?: Partial<ModuleRegistryConfig>
): IModuleRegistry {
  const registry = new ModuleRegistry();
  
  // Build complete configuration with defaults
  const fullConfig = buildDefaultConfig(config);
  
  // Pre-register all core module factories
  // These will be created lazily when first accessed or during initialization
  registerCoreModules(registry);
  
  return registry;
}

/**
 * Builds default configuration for the registry.
 * 
 * Provides sensible defaults based on the current environment
 * (development, test, or production).
 * 
 * @param userConfig - User-provided configuration
 * @returns Complete configuration with defaults applied
 * 
 * @private
 */
function buildDefaultConfig(
  userConfig?: Partial<ModuleRegistryConfig>
): ModuleRegistryConfig {
  // Environment-specific defaults
  const envDefaults = {
    development: {
      registry: {
        strict: false,                // More forgiving in development
        lazyLoad: true,              // Faster startup
        healthCheckInterval: 60000,   // Less frequent checks
        shutdownTimeout: 15000
      },
      development: {
        hotReload: true,
        watchPaths: [
          'src/modules/**/*.{ts,js}',
          'src/agents/**/*.{ts,js}'
        ]
      }
    },
    
    test: {
      registry: {
        strict: true,                 // Strict for test reliability
        lazyLoad: false,             // Predictable initialization
        healthCheckInterval: 0,       // Disable health checks in tests
        shutdownTimeout: 5000
      },
      development: {
        hotReload: false
      }
    },
    
    production: {
      registry: {
        strict: true,                 // Strict for production safety
        lazyLoad: false,             // Predictable initialization
        healthCheckInterval: 30000,   // Regular health monitoring
        shutdownTimeout: 30000
      },
      development: {
        hotReload: false
      }
    }
  };
  
  // Get environment-specific defaults
  let defaults: any = envDefaults.production; // Default to production
  if (isDevelopment()) {
    defaults = envDefaults.development;
  } else if (isTest()) {
    defaults = envDefaults.test;
  }
  
  // Merge user config with defaults
  const config: ModuleRegistryConfig = {
    modules: userConfig?.modules || {},
    registry: {
      ...defaults.registry,
      ...userConfig?.registry
    }
  };
  
  // Add development config if not production
  if (defaults.development) {
    config.development = {
      ...defaults.development,
      ...userConfig?.development
    };
  }
  
  return config;
}

/**
 * Registers all core AgentHub modules with the registry.
 * 
 * Uses factory functions to enable lazy loading and proper dependency
 * injection. Each factory receives the registry instance and can access
 * other modules as dependencies.
 * 
 * @param registry - The registry to register modules with
 * 
 * @private
 */
function registerCoreModules(registry: IModuleRegistry): void {
  console.log('Registering core module factories...');
  
  // LiteLLM Module - Transparent LLM routing
  registry.registerFactory('litellm', async (reg) => {
    console.log('Creating LiteLLM module...');
    
    // Dynamic import to avoid circular dependencies
    const { createLiteLLMModule } = await import('../litellm/factory');
    
    // Get configuration from registry config
    const registryConfig = (reg as any).config; // Access internal config
    const moduleConfig = registryConfig?.modules?.litellm?.config || {};
    
    return createLiteLLMModule(moduleConfig);
  });
  
  // Langfuse Module - Observability and tracing
  registry.registerFactory('langfuse', async (reg) => {
    console.log('Creating Langfuse module...');
    
    const { createLangfuseModule } = await import('../langfuse/factory');
    const registryConfig = (reg as any).config;
    const moduleConfig = registryConfig?.modules?.langfuse?.config || {};
    
    return createLangfuseModule(moduleConfig);
  });
  
  // Session State Module - State management and persistence
  registry.registerFactory('sessionState', async (reg) => {
    console.log('Creating Session State module...');
    
    const { createSessionStateModule } = await import('../session-state/factory');
    const registryConfig = (reg as any).config;
    const moduleConfig = registryConfig?.modules?.sessionState?.config || {};
    
    return createSessionStateModule(moduleConfig);
  });
  
  // Memory Module - Vector storage and conversation memory
  registry.registerFactory('memory', async (reg) => {
    console.log('Creating Memory module...');
    
    const { createMemoryModule } = await import('../memory/factory');
    const registryConfig = (reg as any).config;
    const moduleConfig = registryConfig?.modules?.memory?.config || {};
    
    // Memory module depends on session state
    const sessionState = reg.get('sessionState');
    
    return createMemoryModule(moduleConfig, { sessionState });
  });
  
  // Execution Manager - Workflow orchestration
  registry.registerFactory('executionManager', async (reg) => {
    console.log('Creating Execution Manager module...');
    
    const { createExecutionManagerModule } = await import('../execution/factory');
    const registryConfig = (reg as any).config;
    const moduleConfig = registryConfig?.modules?.executionManager?.config || {};
    
    // Execution manager depends on session state and memory
    const sessionState = reg.get('sessionState');
    const memory = reg.get('memory');
    
    return createExecutionManagerModule(moduleConfig, { sessionState, memory });
  });
  
  // Streaming Manager - Real-time SSE streaming
  registry.registerFactory('streamingManager', async (reg) => {
    console.log('Creating Streaming Manager module...');
    
    const { createStreamingManagerModule } = await import('../streaming/factory');
    const registryConfig = (reg as any).config;
    const moduleConfig = registryConfig?.modules?.streamingManager?.config || {};
    
    return createStreamingManagerModule(moduleConfig);
  });
  
  // Human-in-the-Loop Module - Interactive workflows
  registry.registerFactory('humanLoop', async (reg) => {
    console.log('Creating Human-in-the-Loop module...');
    
    const { createHumanLoopModule } = await import('../human-loop/factory');
    const registryConfig = (reg as any).config;
    const moduleConfig = registryConfig?.modules?.humanLoop?.config || {};
    
    // Human loop depends on session state and streaming
    const sessionState = reg.get('sessionState');
    const streamingManager = reg.get('streamingManager');
    
    return createHumanLoopModule(moduleConfig, { sessionState, streamingManager });
  });
  
  // Tools Module - Tool management and execution
  registry.registerFactory('tools', async (reg) => {
    console.log('Creating Tools module...');
    
    const { createToolsModule } = await import('../tools/factory');
    const registryConfig = (reg as any).config;
    const moduleConfig = registryConfig?.modules?.tools?.config || {};
    
    return createToolsModule(moduleConfig);
  });
  
  console.log('✓ Core module factories registered');
}

/**
 * Global singleton registry instance.
 * 
 * This is the default registry instance used throughout the AgentHub
 * application. It's created lazily on first access.
 */
let globalRegistry: IModuleRegistry | null = null;

/**
 * Gets the global singleton registry instance.
 * 
 * Creates the registry lazily on first access with default configuration.
 * This is the primary way to access modules throughout the application.
 * 
 * @returns The global Module Registry singleton
 * 
 * @example
 * ```typescript
 * import { getGlobalRegistry } from '@/modules/registry';
 * 
 * const registry = getGlobalRegistry();
 * const memory = registry.get('memory');
 * ```
 * 
 * Implementation notes:
 * - Creates registry with default configuration on first call
 * - Subsequent calls return the same instance
 * - Thread-safe through synchronous initialization
 * - Can be replaced with setGlobalRegistry() for testing
 */
export function getGlobalRegistry(): IModuleRegistry {
  if (!globalRegistry) {
    console.log('Creating global registry instance...');
    globalRegistry = createModuleRegistry();
    console.log('✓ Global registry created');
  }
  
  return globalRegistry;
}

/**
 * Sets the global registry instance.
 * 
 * This is primarily used for testing to inject custom registry instances
 * or to replace the global registry with a pre-configured one.
 * 
 * @param registry - The registry instance to use as global
 * 
 * @example
 * ```typescript
 * // In tests
 * const testRegistry = createModuleRegistry({ ... });
 * await testRegistry.initialize(testConfig);
 * setGlobalRegistry(testRegistry);
 * ```
 * 
 * @remarks
 * Use with caution in production code. This affects global state
 * and can cause issues if called after modules have been accessed.
 */
export function setGlobalRegistry(registry: IModuleRegistry): void {
  console.log('Setting global registry instance');
  globalRegistry = registry;
}

/**
 * Resets the global registry to null.
 * 
 * This forces creation of a new registry instance on the next call
 * to getGlobalRegistry(). Primarily used for testing cleanup.
 * 
 * @example
 * ```typescript
 * // In test teardown
 * await getGlobalRegistry().shutdown();
 * resetGlobalRegistry();
 * ```
 * 
 * @remarks
 * Should be paired with proper shutdown of the existing registry
 * to avoid resource leaks.
 */
export function resetGlobalRegistry(): void {
  console.log('Resetting global registry instance');
  globalRegistry = null;
}

/**
 * Checks if the global registry has been created.
 * 
 * @returns True if global registry exists, false otherwise
 * 
 * @example
 * ```typescript
 * if (hasGlobalRegistry()) {
 *   const registry = getGlobalRegistry();
 *   // Use registry
 * }
 * ```
 */
export function hasGlobalRegistry(): boolean {
  return globalRegistry !== null;
}

/**
 * Creates a registry instance for testing with minimal configuration.
 * 
 * This factory creates a registry suitable for unit tests with:
 * - Disabled health monitoring
 * - Strict mode enabled for predictable behavior
 * - No hot reload or development features
 * - Fast shutdown timeouts
 * 
 * @param config - Optional test-specific configuration
 * @returns Registry instance configured for testing
 * 
 * @example
 * ```typescript
 * describe('MyModule', () => {
 *   let registry: IModuleRegistry;
 *   
 *   beforeEach(async () => {
 *     registry = createTestRegistry({
 *       modules: {
 *         myModule: { enabled: true, config: { ... } }
 *       }
 *     });
 *     await registry.initialize();
 *   });
 *   
 *   afterEach(async () => {
 *     await registry.shutdown();
 *   });
 * });
 * ```
 */
export function createTestRegistry(
  config?: Partial<ModuleRegistryConfig>
): IModuleRegistry {
  const testConfig: Partial<ModuleRegistryConfig> = {
    registry: {
      strict: true,
      lazyLoad: false,
      healthCheckInterval: 0,    // Disable health checks in tests
      shutdownTimeout: 1000      // Fast shutdown for tests
    },
    development: {
      hotReload: false
    },
    ...config
  };
  
  return createModuleRegistry(testConfig);
}