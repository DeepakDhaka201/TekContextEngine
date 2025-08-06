/**
 * @fileoverview Type definitions for the Module Registry system
 * @module modules/registry/types
 * @requires None - Pure type definitions
 * 
 * This file defines the interfaces and types for AgentHub's module registry system.
 * The module registry is the central nervous system that manages module lifecycles,
 * dependency resolution, initialization order, and health monitoring.
 * 
 * Key concepts:
 * - IModuleRegistry: The main interface for module management
 * - IModule: Base interface all modules must implement
 * - Dependency Graph: Manages module dependencies and initialization order
 * - Health Monitoring: Tracks module status and health
 * 
 * @example
 * ```typescript
 * import { IModuleRegistry, IModule } from './types';
 * 
 * const registry: IModuleRegistry = createModuleRegistry();
 * const myModule: IModule = { name: 'test', version: '1.0.0' };
 * registry.register('test', myModule);
 * ```
 * 
 * @see ModuleRegistry implementation
 * @since 1.0.0
 */

/**
 * Core interface for the Module Registry system.
 * 
 * The Module Registry is responsible for:
 * - Managing module registration and lifecycle
 * - Resolving dependencies and initialization order
 * - Health monitoring and status tracking
 * - Graceful shutdown and resource cleanup
 * 
 * All modules in the AgentHub system are managed through this registry
 * to ensure proper initialization order, dependency satisfaction, and
 * coordinated lifecycle management.
 * 
 * @remarks
 * This interface is implemented as a singleton to provide global access
 * to modules throughout the application. Use with caution in tests.
 * 
 * @example
 * ```typescript
 * const registry = createModuleRegistry();
 * 
 * // Register a module
 * registry.register('sessionState', sessionStateModule);
 * 
 * // Get a module (throws if not found or not initialized)
 * const sessionState = registry.get<ISessionStateModule>('sessionState');
 * ```
 * 
 * @public
 */
export interface IModuleRegistry {
  // Registration Methods
  /**
   * Registers a module instance with the registry.
   * 
   * @param moduleId - Unique identifier for the module
   * @param module - The module instance to register
   * @throws {ModuleRegistrationError} If module is already registered or has invalid dependencies
   * 
   * @example
   * ```typescript
   * registry.register('memory', new MemoryModule());
   * ```
   */
  register(moduleId: string, module: IModule): void;
  
  /**
   * Registers a module factory for lazy initialization.
   * 
   * The factory will be called when the module is first accessed or during
   * registry initialization, allowing for dependency injection and configuration.
   * 
   * @param moduleId - Unique identifier for the module
   * @param factory - Factory function that creates the module
   * @throws {ModuleRegistrationError} If module ID is already registered
   * 
   * @example
   * ```typescript
   * registry.registerFactory('llm', (reg) => {
   *   const liteLLM = reg.get('litellm');
   *   return new LLMModule(liteLLM);
   * });
   * ```
   */
  registerFactory(moduleId: string, factory: ModuleFactory): void;
  
  // Access Methods
  /**
   * Retrieves a registered module by ID.
   * 
   * @param moduleId - The module identifier
   * @returns The initialized module instance
   * @throws {ModuleNotFoundError} If module is not registered
   * @throws {ModuleNotInitializedError} If module is not yet initialized
   * @throws {ModuleErrorError} If module is in error state
   * 
   * @example
   * ```typescript
   * const memory = registry.get<IMemoryModule>('memory');
   * await memory.store('key', 'value');
   * ```
   */
  get<T extends IModule>(moduleId: string): T;
  
  /**
   * Returns all registered modules with their metadata.
   * 
   * @returns Map of module IDs to their metadata
   * 
   * @remarks
   * This is primarily used for debugging and health monitoring.
   * Regular application code should use get() to access specific modules.
   */
  getAll(): Map<string, ModuleMetadata>;
  
  /**
   * Checks if a module is registered.
   * 
   * @param moduleId - The module identifier to check
   * @returns True if module is registered, false otherwise
   */
  has(moduleId: string): boolean;
  
  // Lifecycle Methods
  /**
   * Initializes the module registry and all registered modules.
   * 
   * This method:
   * 1. Validates all dependencies are satisfied
   * 2. Determines proper initialization order using dependency graph
   * 3. Initializes modules in dependency order
   * 4. Starts health monitoring if configured
   * 5. Sets up hot reload for development if enabled
   * 
   * @param config - Registry configuration
   * @throws {CircularDependencyError} If circular dependencies detected
   * @throws {MissingDependencyError} If dependencies are not satisfied
   * @throws {ModuleInitializationError} If any module fails to initialize
   * 
   * @example
   * ```typescript
   * await registry.initialize({
   *   modules: {
   *     memory: { config: { storage: 'redis' } },
   *     sessionState: { config: { ttl: 3600 } }
   *   },
   *   registry: {
   *     strict: true,
   *     healthCheckInterval: 30000
   *   }
   * });
   * ```
   */
  initialize(config: ModuleRegistryConfig): Promise<void>;
  
  /**
   * Gracefully shuts down all modules.
   * 
   * Modules are shutdown in reverse dependency order to ensure
   * dependents are cleaned up before their dependencies.
   * 
   * @param timeout - Maximum time to wait for shutdown (default: 30s)
   * @throws {ShutdownTimeoutError} If modules don't shut down within timeout
   * 
   * @example
   * ```typescript
   * process.on('SIGTERM', async () => {
   *   await registry.shutdown();
   *   process.exit(0);
   * });
   * ```
   */
  shutdown(timeout?: number): Promise<void>;
  
  /**
   * Reloads a module and its dependents.
   * 
   * This is useful for development hot-reload or when a module
   * needs to be restarted due to configuration changes.
   * 
   * @param moduleId - The module to reload
   * @throws {ModuleNotFoundError} If module is not registered
   * @throws {ReloadError} If reload fails
   * 
   * @remarks
   * This will shutdown the module and all its dependents, then
   * reinitialize them. Use with caution in production.
   */
  reload(moduleId: string): Promise<void>;
  
  // Health and Monitoring
  /**
   * Gets the overall health of the registry and all modules.
   * 
   * @returns Comprehensive health information including per-module status
   * 
   * @example
   * ```typescript
   * const health = await registry.health();
   * if (health.status === 'unhealthy') {
   *   console.error('Registry health issues:', health.modules);
   * }
   * ```
   */
  health(): Promise<RegistryHealth>;
  
  /**
   * Gets health information for a specific module.
   * 
   * @param moduleId - The module to check
   * @returns Health status of the specified module
   * @throws {ModuleNotFoundError} If module is not registered
   */
  getModuleHealth(moduleId: string): Promise<HealthStatus>;
  
  // Dependency Graph Methods
  /**
   * Gets the direct dependencies of a module.
   * 
   * @param moduleId - The module to check
   * @returns Array of module IDs this module depends on
   */
  getDependencies(moduleId: string): string[];
  
  /**
   * Gets the modules that depend on a given module.
   * 
   * @param moduleId - The module to check
   * @returns Array of module IDs that depend on this module
   */
  getDependents(moduleId: string): string[];
  
  /**
   * Gets the initialization order for all registered modules.
   * 
   * @returns Array of module IDs in dependency-resolved initialization order
   * @throws {CircularDependencyError} If circular dependencies exist
   */
  getInitializationOrder(): string[];
}

/**
 * Base interface that all AgentHub modules must implement.
 * 
 * This interface defines the minimal contract for modules to participate
 * in the registry's lifecycle management, health monitoring, and dependency
 * resolution system.
 * 
 * @remarks
 * All lifecycle methods (initialize, shutdown, health) are optional but
 * highly recommended for proper resource management.
 * 
 * @example
 * ```typescript
 * class MyModule implements IModule {
 *   readonly name = 'my-module';
 *   readonly version = '1.0.0';
 *   readonly dependencies = ['sessionState', 'memory'];
 *   
 *   async initialize(config: any): Promise<void> {
 *     // Module initialization logic
 *   }
 *   
 *   async health(): Promise<HealthStatus> {
 *     return { status: 'healthy' };
 *   }
 * }
 * ```
 * 
 * @public
 */
export interface IModule {
  /**
   * Unique name identifier for this module.
   * Should be consistent across versions and match the registry ID.
   */
  readonly name: string;
  
  /**
   * Semantic version string for this module.
   * Used for compatibility checking and debugging.
   */
  readonly version: string;
  
  // Optional Lifecycle Methods
  /**
   * Initializes the module with provided configuration.
   * 
   * Called by the registry during initialization phase.
   * All dependencies are guaranteed to be initialized before this is called.
   * 
   * @param config - Module-specific configuration object
   * @throws {ModuleInitializationError} If initialization fails
   * 
   * Implementation notes:
   * - Should be idempotent (safe to call multiple times)
   * - Should validate configuration
   * - Should establish connections/resources
   * - Should fail fast on critical errors
   */
  initialize?(config: any): Promise<void>;
  
  /**
   * Gracefully shuts down the module.
   * 
   * Called by the registry during shutdown phase.
   * All dependents are guaranteed to be shut down before this is called.
   * 
   * @throws {ModuleShutdownError} If shutdown fails
   * 
   * Implementation notes:
   * - Should clean up all resources (connections, timers, etc.)
   * - Should be idempotent (safe to call multiple times)
   * - Should not throw unless critical cleanup fails
   * - Should complete within reasonable time
   */
  shutdown?(): Promise<void>;
  
  /**
   * Returns current health status of the module.
   * 
   * Called periodically by the registry's health checker.
   * Should be fast and non-blocking.
   * 
   * @returns Current health status with optional details
   * 
   * Implementation notes:
   * - Should complete quickly (< 100ms)
   * - Should check critical functionality only
   * - Should return 'degraded' for non-critical issues
   * - Should include helpful diagnostic information
   */
  health?(): Promise<HealthStatus>;
  
  // Dependency Declaration
  /**
   * Array of module IDs this module depends on.
   * These modules will be initialized before this module.
   * 
   * @remarks
   * Dependencies must be satisfied or registry initialization will fail
   * (in strict mode).
   */
  readonly dependencies?: string[];
  
  /**
   * Array of module IDs this module can use if available.
   * Missing optional dependencies will not cause initialization to fail.
   * 
   * @remarks
   * Modules should check if optional dependencies are available before using them.
   */
  readonly optionalDependencies?: string[];
}

/**
 * Configuration for the Module Registry system.
 * 
 * This configuration controls how the registry behaves during initialization,
 * runtime operation, health monitoring, and development features.
 * 
 * @example
 * ```typescript
 * const config: ModuleRegistryConfig = {
 *   modules: {
 *     memory: {
 *       enabled: true,
 *       config: { storage: 'redis', ttl: 3600 }
 *     }
 *   },
 *   registry: {
 *     strict: true,
 *     healthCheckInterval: 30000
 *   }
 * };
 * ```
 * 
 * @public
 */
export interface ModuleRegistryConfig {
  /**
   * Per-module configuration settings.
   * Key is the module ID, value is the module configuration.
   */
  modules: Record<string, ModuleConfig>;
  
  /**
   * Registry-level configuration settings.
   */
  registry: {
    /**
     * If true, missing dependencies cause initialization failure.
     * If false, modules with missing dependencies are skipped.
     * 
     * @default true
     * @remarks Use false only for development/testing
     */
    strict?: boolean;
    
    /**
     * If true, modules are initialized only when first accessed.
     * If false, all modules are initialized during registry.initialize().
     * 
     * @default false
     * @remarks Lazy loading can improve startup time but complicates error handling
     */
    lazyLoad?: boolean;
    
    /**
     * Interval for periodic health checks in milliseconds.
     * Set to 0 to disable health monitoring.
     * 
     * @default 30000 (30 seconds)
     */
    healthCheckInterval?: number;
    
    /**
     * Maximum time to wait for graceful shutdown in milliseconds.
     * 
     * @default 30000 (30 seconds)
     */
    shutdownTimeout?: number;
  };
  
  /**
   * Development-specific features.
   * These settings are typically enabled only in development mode.
   */
  development?: {
    /**
     * Enable hot module reloading.
     * Watches for file changes and reloads affected modules.
     * 
     * @default false
     * @remarks Only use in development environments
     */
    hotReload?: boolean;
    
    /**
     * File paths to watch for hot reload triggers.
     * 
     * @default ['src/modules/**/*.{ts,js}']
     */
    watchPaths?: string[];
  };
}

/**
 * Configuration for individual modules.
 * 
 * This allows per-module customization of behavior, configuration,
 * and registry integration settings.
 * 
 * @public
 */
export interface ModuleConfig {
  /**
   * Whether this module should be initialized.
   * 
   * @default true
   */
  enabled?: boolean;
  
  /**
   * Module-specific configuration passed to initialize().
   * Structure depends on the specific module.
   */
  config?: any;
  
  /**
   * Override module properties.
   * Useful for testing or customization.
   */
  override?: Partial<IModule>;
  
  /**
   * Whether to retry initialization if it fails.
   * 
   * @default false
   */
  retryOnFailure?: boolean;
  
  /**
   * Maximum time to wait for module initialization in milliseconds.
   * 
   * @default 30000 (30 seconds)
   */
  initTimeout?: number;
}

/**
 * Factory function for creating modules with dependency injection.
 * 
 * This allows modules to be created with access to the registry
 * and other already-initialized modules, enabling dependency injection.
 * 
 * @param registry - The module registry instance
 * @returns A module instance or promise that resolves to one
 * 
 * @example
 * ```typescript
 * const llmAgentFactory: ModuleFactory = (registry) => {
 *   const liteLLM = registry.get('litellm');
 *   const memory = registry.get('memory');
 *   return new LLMAgent(liteLLM, memory);
 * };
 * ```
 * 
 * @public
 */
export type ModuleFactory = (registry: IModuleRegistry) => IModule | Promise<IModule>;

/**
 * Internal metadata for tracking module state in the registry.
 * 
 * This contains all the information the registry needs to manage
 * a module's lifecycle, health, and status.
 * 
 * @internal
 */
export interface ModuleMetadata {
  /** Module identifier */
  readonly id: string;
  
  /** The module instance (may be null for factories until created) */
  module: IModule | null;
  
  /** Factory function for lazy creation */
  factory?: ModuleFactory;
  
  /** Module configuration from registry config */
  config?: ModuleConfig;
  
  /** Current module status */
  status: ModuleStatus;
  
  /** Whether module has been successfully initialized */
  initialized: boolean;
  
  /** Time taken to initialize in milliseconds */
  initializeTime?: number;
  
  /** Timestamp of last health check */
  lastHealthCheck?: Date;
  
  /** Last known health status */
  healthStatus?: HealthStatus;
  
  /** Last error that occurred */
  error?: Error;
}

/**
 * Possible states for a module in the registry.
 * 
 * This tracks the lifecycle state of modules for proper
 * orchestration and error handling.
 * 
 * @public
 */
export type ModuleStatus = 
  /** Module is registered but not initialized */
  | 'registered'
  /** Module is currently initializing */  
  | 'initializing'
  /** Module is initialized and healthy */
  | 'ready'
  /** Module initialization failed or runtime error occurred */
  | 'error'
  /** Module is currently shutting down */
  | 'stopping'
  /** Module has been shut down */
  | 'stopped';

/**
 * Overall health information for the registry.
 * 
 * Provides both summary and detailed health information
 * for monitoring and alerting purposes.
 * 
 * @public
 */
export interface RegistryHealth {
  /** Overall registry health status */
  status: 'healthy' | 'degraded' | 'unhealthy';
  
  /** Per-module health information */
  modules: Record<string, ModuleHealthInfo>;
  
  /** Summary statistics */
  summary: {
    /** Total number of registered modules */
    total: number;
    /** Number of healthy modules */
    healthy: number;
    /** Number of degraded modules */
    degraded: number;
    /** Number of unhealthy modules */
    unhealthy: number;
  };
}

/**
 * Health information for a specific module.
 * 
 * Contains both registry-level status (lifecycle state)
 * and module-reported health status.
 * 
 * @public
 */
export interface ModuleHealthInfo {
  /** Module's current lifecycle status */
  status: ModuleStatus;
  
  /** Module's self-reported health (if available) */
  health?: HealthStatus;
  
  /** Timestamp of last health check */
  lastCheck?: Date;
  
  /** Module uptime in milliseconds */
  uptime?: number;
}

/**
 * Health status information reported by modules.
 * 
 * Modules can provide detailed health information including
 * status level, descriptive message, and diagnostic details.
 * 
 * @public
 */
export interface HealthStatus {
  /** Health status level */
  status: 'healthy' | 'degraded' | 'unhealthy';
  
  /** Human-readable status message */
  message?: string;
  
  /** Additional diagnostic details (e.g., metrics, timestamps, error info) */
  details?: any;
}