/**
 * @fileoverview Main Module Registry implementation
 * @module modules/registry/registry
 * @requires ./types
 * @requires ./errors
 * @requires ./dependency-graph
 * @requires ./health-checker
 * @requires ../../shared/utils
 * 
 * This file implements the core ModuleRegistry class that manages all modules
 * in the AgentHub system. It handles registration, initialization, health monitoring,
 * dependency resolution, and graceful shutdown.
 * 
 * Key concepts:
 * - Singleton pattern for global module access
 * - Dependency injection through factories
 * - Lifecycle management (init -> ready -> shutdown)
 * - Health monitoring with automatic status updates
 * - Hot reload support for development
 * 
 * @example
 * ```typescript
 * import { ModuleRegistry } from './registry';
 * 
 * const registry = new ModuleRegistry();
 * registry.register('memory', new MemoryModule());
 * await registry.initialize(config);
 * const memory = registry.get<IMemoryModule>('memory');
 * ```
 * 
 * @see types.ts for interface definitions
 * @see errors.ts for error classes
 * @since 1.0.0
 */

import {
  IModuleRegistry,
  IModule,
  ModuleRegistryConfig,
  ModuleFactory,
  ModuleMetadata,
  ModuleStatus,
  RegistryHealth,
  HealthStatus
} from './types';

import {
  ModuleAlreadyRegisteredError,
  ModuleNotFoundError,
  ModuleNotInitializedError,
  ModuleInErrorStateError,
  MissingDependencyError,
  ModuleInitializationError,
  ModuleShutdownError,
  RegistryTimeoutError
} from './errors';

import { DependencyGraph } from './dependency-graph';
import { HealthChecker } from './health-checker';
import { generateId, withTimeout, isProduction } from '../../shared/utils';

/**
 * Core implementation of the Module Registry system.
 * 
 * The ModuleRegistry serves as the central nervous system for all modules in AgentHub.
 * It provides:
 * - Module registration with dependency validation
 * - Automatic initialization in dependency order
 * - Health monitoring and status tracking
 * - Graceful shutdown with proper cleanup
 * - Development features like hot reload
 * 
 * @remarks
 * This class is typically used as a singleton, though it can be instantiated
 * multiple times for testing or specialized use cases.
 * 
 * Architecture decisions:
 * - Uses Map for O(1) module lookup performance
 * - Employs DependencyGraph for topological sorting
 * - Lazy initialization support for improved startup time
 * - Health checking runs on separate intervals to avoid blocking
 * 
 * @example
 * ```typescript
 * // Create and configure registry
 * const registry = new ModuleRegistry();
 * 
 * // Register modules
 * registry.register('sessionState', new SessionStateModule());
 * registry.registerFactory('memory', (reg) => {
 *   const sessionState = reg.get('sessionState');
 *   return new MemoryModule(sessionState);
 * });
 * 
 * // Initialize all modules
 * await registry.initialize({
 *   modules: {
 *     sessionState: { config: { ttl: 3600 } },
 *     memory: { config: { storage: 'redis' } }
 *   },
 *   registry: { strict: true, healthCheckInterval: 30000 }
 * });
 * 
 * // Use modules
 * const memory = registry.get<IMemoryModule>('memory');
 * await memory.store('key', 'value');
 * ```
 * 
 * @public
 */
export class ModuleRegistry implements IModuleRegistry {
  /**
   * Internal storage for module metadata.
   * Maps module ID to complete metadata including status and configuration.
   */
  private readonly modules = new Map<string, ModuleMetadata>();
  
  /**
   * Dependency graph for determining initialization order.
   * Handles dependency resolution and circular dependency detection.
   */
  private readonly dependencyGraph = new DependencyGraph();
  
  /**
   * Registry configuration provided during initialization.
   * Used for module-specific configs and registry behavior.
   */
  private config?: ModuleRegistryConfig;
  
  /**
   * Health monitoring system for all modules.
   * Runs periodic health checks and updates module status.
   */
  private healthChecker?: HealthChecker;
  
  /**
   * Promise that resolves when initialization is complete.
   * Prevents multiple concurrent initialization attempts.
   */
  private initializationPromise?: Promise<void>;
  
  /**
   * Flag indicating whether the registry is shutting down.
   * Prevents new operations during shutdown process.
   */
  private isShuttingDown = false;
  
  /**
   * Development mode file watchers for hot reload.
   * Only active when hot reload is enabled.
   */
  private fileWatchers: any[] = [];
  
  /**
   * Registers a module instance with the registry.
   * 
   * This method adds a module to the registry and validates its dependencies.
   * If the module has dependencies that don't exist, those dependency nodes
   * are created automatically to support forward references.
   * 
   * @param moduleId - Unique identifier for the module
   * @param module - The module instance to register
   * @throws {ModuleAlreadyRegisteredError} If a module with this ID already exists
   * @throws {CircularDependencyError} If adding this module creates a dependency cycle
   * 
   * @example
   * ```typescript
   * const memoryModule = new MemoryModule();
   * registry.register('memory', memoryModule);
   * ```
   * 
   * Implementation notes:
   * - Validates module ID uniqueness
   * - Adds module to dependency graph with validation
   * - Creates placeholder nodes for forward dependencies
   * - Performs immediate circular dependency check
   * - Thread-safe through synchronous operations
   */
  register(moduleId: string, module: IModule): void {
    // Validate inputs
    if (!moduleId || typeof moduleId !== 'string') {
      throw new Error('Module ID must be a non-empty string');
    }
    
    if (!module || typeof module !== 'object') {
      throw new Error('Module must be a valid object');
    }
    
    // Check for duplicate registration
    if (this.modules.has(moduleId)) {
      const existing = this.modules.get(moduleId)!;
      throw new ModuleAlreadyRegisteredError(moduleId, existing.module);
    }
    
    console.log(`Registering module: ${moduleId} (${module.name} v${module.version})`);
    
    try {
      // Add to dependency graph (this validates dependencies and detects cycles)
      this.dependencyGraph.addNode(moduleId, module.dependencies || []);
      
      // Store module metadata
      const metadata: ModuleMetadata = {
        id: moduleId,
        module,
        status: 'registered',
        initialized: false,
        config: this.config?.modules?.[moduleId] // Will be null until initialize() is called
      };
      
      this.modules.set(moduleId, metadata);
      
      console.log(`✓ Module ${moduleId} registered successfully`);
      
    } catch (error) {
      // Clean up on failure
      this.dependencyGraph.removeNode(moduleId);
      throw error; // Re-throw the original error (likely CircularDependencyError)
    }
  }
  
  /**
   * Registers a factory function for lazy module creation.
   * 
   * Factories are useful when modules need access to other modules during
   * construction (dependency injection) or when modules should only be
   * created if actually needed (lazy loading).
   * 
   * @param moduleId - Unique identifier for the module
   * @param factory - Function that creates the module when needed
   * @throws {ModuleAlreadyRegisteredError} If a module with this ID already exists
   * 
   * @example
   * ```typescript
   * registry.registerFactory('llmAgent', (registry) => {
   *   const memory = registry.get('memory');
   *   const sessionState = registry.get('sessionState');
   *   return new LLMAgent(memory, sessionState);
   * });
   * ```
   * 
   * Implementation notes:
   * - Module is not created until needed (lazy loading)
   * - Factory receives registry instance for dependency injection
   * - Dependencies are resolved at factory execution time
   * - Factory can be async for complex initialization
   */
  registerFactory(moduleId: string, factory: ModuleFactory): void {
    // Validate inputs
    if (!moduleId || typeof moduleId !== 'string') {
      throw new Error('Module ID must be a non-empty string');
    }
    
    if (!factory || typeof factory !== 'function') {
      throw new Error('Factory must be a function');
    }
    
    // Check for duplicate registration
    if (this.modules.has(moduleId)) {
      const existing = this.modules.get(moduleId)!;
      throw new ModuleAlreadyRegisteredError(moduleId, existing.module);
    }
    
    console.log(`Registering module factory: ${moduleId}`);
    
    // Store factory metadata (module will be created later)
    const metadata: ModuleMetadata = {
      id: moduleId,
      module: null, // Will be created by factory
      factory,
      status: 'registered',
      initialized: false,
      config: this.config?.modules?.[moduleId]
    };
    
    this.modules.set(moduleId, metadata);
    
    // Add to dependency graph (dependencies will be updated when factory creates the module)
    this.dependencyGraph.addNode(moduleId, []);
    
    console.log(`✓ Module factory ${moduleId} registered successfully`);
  }
  
  /**
   * Retrieves an initialized module by ID.
   * 
   * This is the primary method for accessing modules throughout the application.
   * It includes safety checks to ensure modules are in a usable state.
   * 
   * @param moduleId - The module identifier
   * @returns The initialized module instance
   * @throws {ModuleNotFoundError} If the module is not registered
   * @throws {ModuleNotInitializedError} If the module hasn't been initialized
   * @throws {ModuleInErrorStateError} If the module is in error state
   * 
   * @example
   * ```typescript
   * const memory = registry.get<IMemoryModule>('memory');
   * await memory.store('user:123', userData);
   * ```
   * 
   * Implementation notes:
   * - Type parameter T provides compile-time type safety
   * - Supports lazy initialization if configured
   * - Thread-safe through Map operations
   * - O(1) lookup performance
   */
  get<T extends IModule>(moduleId: string): T {
    const metadata = this.modules.get(moduleId);
    
    // Check if module exists
    if (!metadata) {
      throw new ModuleNotFoundError(
        moduleId,
        Array.from(this.modules.keys())
      );
    }
    
    // Handle lazy loading if enabled
    if (this.config?.registry?.lazyLoad && !metadata.initialized && metadata.status === 'registered') {
      console.log(`Lazy initializing module: ${moduleId}`);
      
      // Start lazy initialization (async, but don't wait for it)
      this.initializeModule(moduleId).catch(error => {
        console.error(`Lazy initialization failed for module ${moduleId}:`, error);
        metadata.status = 'error';
        metadata.error = error;
      });
      
      // For lazy loading, we throw if module is not ready yet
      // This forces callers to handle the async nature properly
      throw new ModuleNotInitializedError(moduleId, metadata.status);
    }
    
    // Check module state
    if (metadata.status === 'error') {
      throw new ModuleInErrorStateError(moduleId, metadata.error);
    }
    
    if (!metadata.initialized || !metadata.module) {
      throw new ModuleNotInitializedError(moduleId, metadata.status);
    }
    
    // Return the module with type safety
    return metadata.module as T;
  }
  
  /**
   * Returns all registered module metadata.
   * 
   * This is primarily used for debugging, health monitoring,
   * and administrative operations.
   * 
   * @returns Map of module IDs to their complete metadata
   * 
   * @remarks
   * The returned Map is a reference to internal state - do not modify it.
   * Use this method sparingly in production code.
   */
  getAll(): Map<string, ModuleMetadata> {
    return this.modules;
  }
  
  /**
   * Checks if a module is registered (but not necessarily initialized).
   * 
   * @param moduleId - The module identifier to check
   * @returns True if the module is registered
   * 
   * @example
   * ```typescript
   * if (registry.has('optionalModule')) {
   *   const module = registry.get('optionalModule');
   *   // Use module
   * }
   * ```
   */
  has(moduleId: string): boolean {
    return this.modules.has(moduleId);
  }
  
  /**
   * Initializes the registry and all registered modules.
   * 
   * This is the main initialization method that:
   * 1. Validates all dependencies are satisfied
   * 2. Determines initialization order using dependency graph
   * 3. Initializes modules in dependency order
   * 4. Starts health monitoring if configured
   * 5. Sets up development features if enabled
   * 
   * @param config - Complete registry and module configuration
   * @throws {MissingDependencyError} If required dependencies are missing in strict mode
   * @throws {ModuleInitializationError} If any module fails to initialize
   * @throws {CircularDependencyError} If circular dependencies are detected
   * 
   * @example
   * ```typescript
   * await registry.initialize({
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
   *     healthCheckInterval: 30000,
   *     shutdownTimeout: 10000
   *   }
   * });
   * ```
   * 
   * Implementation notes:
   * - Idempotent: safe to call multiple times
   * - Returns existing promise if already initializing
   * - Validates dependency satisfaction in strict mode
   * - Uses topological sort for initialization order
   * - Initializes modules concurrently where possible
   * - Sets up health monitoring and development features
   */
  async initialize(config: ModuleRegistryConfig): Promise<void> {
    // Return existing promise if already initializing
    if (this.initializationPromise) {
      console.log('Registry initialization already in progress, waiting...');
      return this.initializationPromise;
    }
    
    // Store configuration for module access
    this.config = config;
    
    // Update module metadata with configuration
    for (const [moduleId, metadata] of this.modules.entries()) {
      metadata.config = config.modules?.[moduleId];
    }
    
    console.log('Starting registry initialization...');
    
    // Create and store initialization promise
    this.initializationPromise = this.performInitialization(config);
    
    try {
      await this.initializationPromise;
      console.log('✓ Registry initialization completed successfully');
    } catch (error) {
      console.error('✗ Registry initialization failed:', error);
      throw error;
    }
  }
  
  /**
   * Performs the actual initialization process.
   * 
   * @param config - Registry configuration
   * @private
   */
  private async performInitialization(config: ModuleRegistryConfig): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Step 1: Validate dependencies if in strict mode
      if (config.registry?.strict !== false) {
        this.validateAllDependencies();
      }
      
      // Step 2: Get initialization order from dependency graph
      const initOrder = this.dependencyGraph.getInitializationOrder();
      console.log(`Module initialization order: ${initOrder.join(' -> ')}`);
      
      // Step 3: Initialize modules in dependency order
      let initializedCount = 0;
      for (const moduleId of initOrder) {
        if (this.modules.has(moduleId)) {
          await this.initializeModule(moduleId);
          initializedCount++;
        }
      }
      
      // Step 4: Start health monitoring if configured
      if (config.registry?.healthCheckInterval && config.registry.healthCheckInterval > 0) {
        console.log(`Starting health monitor with ${config.registry.healthCheckInterval}ms interval`);
        this.healthChecker = new HealthChecker(this, config.registry.healthCheckInterval);
        this.healthChecker.start();
      }
      
      // Step 5: Set up hot reload for development
      if (config.development?.hotReload && !isProduction()) {
        await this.setupHotReload(config.development);
      }
      
      const duration = Date.now() - startTime;
      console.log(`✓ Initialized ${initializedCount} modules in ${duration}ms`);
      
    } catch (error) {
      // Clean up on failure
      if (this.healthChecker) {
        this.healthChecker.stop();
        this.healthChecker = undefined;
      }
      throw error;
    }
  }
  
  /**
   * Initializes a single module.
   * 
   * @param moduleId - ID of module to initialize
   * @private
   */
  private async initializeModule(moduleId: string): Promise<void> {
    const metadata = this.modules.get(moduleId);
    if (!metadata) {
      throw new Error(`Module ${moduleId} not found`);
    }
    
    // Skip if already initialized
    if (metadata.initialized) {
      return;
    }
    
    // Skip if disabled
    if (metadata.config?.enabled === false) {
      console.log(`Skipping disabled module: ${moduleId}`);
      metadata.status = 'stopped';
      return;
    }
    
    console.log(`Initializing module: ${moduleId}`);
    metadata.status = 'initializing';
    const startTime = Date.now();
    
    try {
      // Create module from factory if needed
      if (metadata.factory && !metadata.module) {
        console.log(`Creating module ${moduleId} from factory...`);
        metadata.module = await metadata.factory(this);
        
        // Update dependency graph with actual module dependencies
        if (metadata.module.dependencies) {
          this.dependencyGraph.removeNode(moduleId);
          this.dependencyGraph.addNode(moduleId, metadata.module.dependencies);
        }
      }
      
      if (!metadata.module) {
        throw new Error(`Module ${moduleId} is null after factory creation`);
      }
      
      // Initialize the module with timeout
      if (metadata.module.initialize) {
        const timeout = metadata.config?.initTimeout || 30000;
        const moduleConfig = metadata.config?.config;
        
        console.log(`Calling initialize() on ${moduleId} with ${timeout}ms timeout...`);
        
        await withTimeout(
          metadata.module.initialize(moduleConfig),
          timeout,
          `Module ${moduleId} initialization timed out after ${timeout}ms`
        );
      }
      
      // Mark as initialized
      metadata.initialized = true;
      metadata.status = 'ready';
      metadata.initializeTime = Date.now() - startTime;
      
      console.log(`✓ Module ${moduleId} initialized in ${metadata.initializeTime}ms`);
      
    } catch (error) {
      metadata.status = 'error';
      metadata.error = error instanceof Error ? error : new Error(String(error));
      
      const initError = new ModuleInitializationError(
        moduleId, 
        metadata.error,
        {
          duration: Date.now() - startTime,
          config: metadata.config
        }
      );
      
      // In strict mode, initialization errors are fatal
      if (this.config?.registry?.strict !== false) {
        throw initError;
      }
      
      // In non-strict mode, log and continue
      console.error(`Module ${moduleId} initialization failed:`, initError);
    }
  }
  
  /**
   * Validates that all module dependencies are satisfied.
   * 
   * @throws {MissingDependencyError} If dependencies are missing
   * @private
   */
  private validateAllDependencies(): void {
    const missingDeps: Array<{moduleId: string, dependency: string}> = [];
    
    for (const [moduleId, metadata] of this.modules.entries()) {
      const dependencies = metadata.module?.dependencies || [];
      
      for (const dep of dependencies) {
        if (!this.modules.has(dep)) {
          missingDeps.push({ moduleId, dependency: dep });
        }
      }
    }
    
    if (missingDeps.length > 0) {
      const first = missingDeps[0];
      throw new MissingDependencyError(
        first.moduleId,
        first.dependency,
        Array.from(this.modules.keys())
      );
    }
  }
  
  /**
   * Sets up hot reload functionality for development.
   * 
   * @param devConfig - Development configuration
   * @private
   */
  private async setupHotReload(devConfig: any): Promise<void> {
    try {
      console.log('Setting up hot reload for development...');
      
      // This would typically use fs.watch or chokidar
      // For now, just log that it would be set up
      console.log('Hot reload would be configured with paths:', devConfig.watchPaths);
      
      // TODO: Implement actual file watching and module reloading
      
    } catch (error) {
      console.warn('Failed to set up hot reload:', error);
    }
  }
  
  /**
   * Gracefully shuts down all modules in reverse dependency order.
   * 
   * @param timeout - Maximum time to wait for shutdown (optional)
   * @throws {RegistryTimeoutError} If shutdown exceeds timeout
   * 
   * @example
   * ```typescript
   * process.on('SIGTERM', async () => {
   *   await registry.shutdown(10000); // 10 second timeout
   *   process.exit(0);
   * });
   * ```
   */
  async shutdown(timeout?: number): Promise<void> {
    if (this.isShuttingDown) {
      console.log('Registry is already shutting down');
      return;
    }
    
    this.isShuttingDown = true;
    const effectiveTimeout = timeout || this.config?.registry?.shutdownTimeout || 30000;
    
    console.log(`Starting registry shutdown with ${effectiveTimeout}ms timeout...`);
    
    try {
      // Stop health monitoring first
      if (this.healthChecker) {
        console.log('Stopping health checker...');
        this.healthChecker.stop();
        this.healthChecker = undefined;
      }
      
      // Stop file watchers
      for (const watcher of this.fileWatchers) {
        try {
          watcher.close();
        } catch (error) {
          console.warn('Error closing file watcher:', error);
        }
      }
      this.fileWatchers = [];
      
      // Get shutdown order (reverse of initialization order)
      const shutdownOrder = this.dependencyGraph
        .getInitializationOrder()
        .reverse();
      
      console.log(`Module shutdown order: ${shutdownOrder.join(' -> ')}`);
      
      // Shutdown modules with timeout
      await withTimeout(
        this.shutdownModules(shutdownOrder),
        effectiveTimeout,
        `Registry shutdown timed out after ${effectiveTimeout}ms`
      );
      
      console.log('✓ Registry shutdown completed successfully');
      
    } catch (error) {
      console.error('✗ Registry shutdown encountered errors:', error);
      throw error;
    } finally {
      this.isShuttingDown = false;
    }
  }
  
  /**
   * Shuts down modules in the specified order.
   * 
   * @param shutdownOrder - Array of module IDs in shutdown order
   * @private
   */
  private async shutdownModules(shutdownOrder: string[]): Promise<void> {
    const shutdownPromises: Promise<void>[] = [];
    
    for (const moduleId of shutdownOrder) {
      const metadata = this.modules.get(moduleId);
      
      if (metadata?.initialized && metadata.module?.shutdown) {
        console.log(`Shutting down module: ${moduleId}`);
        metadata.status = 'stopping';
        
        const shutdownPromise = this.shutdownSingleModule(metadata)
          .then(() => {
            metadata.status = 'stopped';
            metadata.initialized = false;
            console.log(`✓ Module ${moduleId} shut down successfully`);
          })
          .catch(error => {
            console.error(`✗ Module ${moduleId} shutdown failed:`, error);
            metadata.status = 'error';
            metadata.error = new ModuleShutdownError(moduleId, error);
            // Don't re-throw - allow other modules to shut down
          });
        
        shutdownPromises.push(shutdownPromise);
      }
    }
    
    // Wait for all shutdown operations to complete
    await Promise.all(shutdownPromises);
  }
  
  /**
   * Shuts down a single module.
   * 
   * @param metadata - Module metadata
   * @private
   */
  private async shutdownSingleModule(metadata: ModuleMetadata): Promise<void> {
    if (!metadata.module?.shutdown) {
      return;
    }
    
    try {
      await metadata.module.shutdown();
    } catch (error) {
      throw new ModuleShutdownError(
        metadata.id, 
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }
  
  /**
   * Reloads a module and all its dependents.
   * 
   * This is primarily used for development hot reload functionality.
   * 
   * @param moduleId - The module to reload
   * @throws {ModuleNotFoundError} If module doesn't exist
   * @throws {ModuleReloadError} If reload fails
   */
  async reload(moduleId: string): Promise<void> {
    console.log(`Reloading module: ${moduleId}`);
    
    const metadata = this.modules.get(moduleId);
    if (!metadata) {
      throw new ModuleNotFoundError(moduleId, Array.from(this.modules.keys()));
    }
    
    try {
      // Get all dependent modules
      const dependents = this.dependencyGraph.getDependents(moduleId);
      
      // Shutdown in reverse dependency order
      const shutdownOrder = [moduleId, ...dependents].reverse();
      for (const id of shutdownOrder) {
        const meta = this.modules.get(id);
        if (meta?.module?.shutdown && meta.initialized) {
          console.log(`Shutting down dependent module: ${id}`);
          await meta.module.shutdown();
          meta.initialized = false;
          meta.status = 'registered';
        }
      }
      
      // Reinitialize in dependency order
      const initOrder = [moduleId, ...dependents];
      for (const id of initOrder) {
        if (this.modules.has(id)) {
          await this.initializeModule(id);
        }
      }
      
      console.log(`✓ Module ${moduleId} reloaded successfully`);
      
    } catch (error) {
      console.error(`✗ Module ${moduleId} reload failed:`, error);
      throw error;
    }
  }
  
  /**
   * Gets comprehensive health information for the registry.
   * 
   * @returns Complete health status including all modules
   */
  async health(): Promise<RegistryHealth> {
    const moduleHealths: Record<string, any> = {};
    
    // Check health of each module
    for (const [moduleId, metadata] of this.modules.entries()) {
      const healthInfo: any = {
        status: metadata.status,
        lastCheck: metadata.lastHealthCheck,
        uptime: metadata.initializeTime ? Date.now() - metadata.initializeTime : undefined
      };
      
      // Get module's self-reported health if available
      if (metadata.initialized && metadata.module?.health) {
        try {
          const health = await metadata.module.health();
          healthInfo.health = health;
          metadata.healthStatus = health;
          metadata.lastHealthCheck = new Date();
        } catch (error) {
          healthInfo.health = {
            status: 'unhealthy',
            message: `Health check failed: ${error.message}`,
            details: { error }
          };
        }
      }
      
      moduleHealths[moduleId] = healthInfo;
    }
    
    // Calculate summary statistics
    const summary = {
      total: this.modules.size,
      healthy: 0,
      degraded: 0,
      unhealthy: 0
    };
    
    for (const health of Object.values(moduleHealths)) {
      if (health.health?.status === 'healthy') {
        summary.healthy++;
      } else if (health.health?.status === 'degraded') {
        summary.degraded++;
      } else {
        summary.unhealthy++;
      }
    }
    
    // Determine overall status
    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (summary.unhealthy > 0) {
      status = 'unhealthy';
    } else if (summary.degraded > 0) {
      status = 'degraded';
    } else {
      status = 'healthy';
    }
    
    return {
      status,
      modules: moduleHealths,
      summary
    };
  }
  
  /**
   * Gets health information for a specific module.
   * 
   * @param moduleId - The module to check
   * @returns Health status of the module
   * @throws {ModuleNotFoundError} If module doesn't exist
   */
  async getModuleHealth(moduleId: string): Promise<HealthStatus> {
    const metadata = this.modules.get(moduleId);
    if (!metadata) {
      throw new ModuleNotFoundError(moduleId, Array.from(this.modules.keys()));
    }
    
    // Return cached health status if available
    if (metadata.healthStatus) {
      return metadata.healthStatus;
    }
    
    // Try to get fresh health status
    if (metadata.initialized && metadata.module?.health) {
      try {
        const health = await metadata.module.health();
        metadata.healthStatus = health;
        metadata.lastHealthCheck = new Date();
        return health;
      } catch (error) {
        return {
          status: 'unhealthy',
          message: `Health check failed: ${error.message}`,
          details: { error }
        };
      }
    }
    
    // Return status based on module state
    return {
      status: metadata.status === 'ready' ? 'healthy' : 'unhealthy',
      message: `Module status: ${metadata.status}`,
      details: {
        initialized: metadata.initialized,
        status: metadata.status
      }
    };
  }
  
  /**
   * Gets direct dependencies of a module.
   * 
   * @param moduleId - The module to query
   * @returns Array of dependency module IDs
   */
  getDependencies(moduleId: string): string[] {
    return this.dependencyGraph.getDependencies(moduleId);
  }
  
  /**
   * Gets modules that depend on the given module.
   * 
   * @param moduleId - The module to query
   * @returns Array of dependent module IDs
   */
  getDependents(moduleId: string): string[] {
    return this.dependencyGraph.getDependents(moduleId);
  }
  
  /**
   * Gets the initialization order for all modules.
   * 
   * @returns Array of module IDs in initialization order
   * @throws {CircularDependencyError} If circular dependencies exist
   */
  getInitializationOrder(): string[] {
    return this.dependencyGraph.getInitializationOrder();
  }
}