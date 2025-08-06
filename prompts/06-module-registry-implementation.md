# Module Registry Implementation Prompt

## Context
You are implementing the Module Registry - the central system that manages the lifecycle of all modules in AgentHub. This registry is responsible for module registration, dependency management, initialization order, health monitoring, and providing controlled access to modules. It ensures modules are initialized in the correct order, handles circular dependencies, and provides a unified interface for module discovery and access.

## Pre-Implementation Requirements

### 1. Documentation Review
You MUST read:
1. Dependency injection patterns in TypeScript
2. Module lifecycle management patterns
3. Service locator vs dependency injection
4. Review architecture: `/Users/sakshams/tekai/TekContextEngine/agenthub-architecture-revised.md`
5. Review all module interfaces from previous prompts

### 2. Understand Module Requirements
This module must:
- Manage module registration and lifecycle
- Handle dependency resolution
- Ensure correct initialization order
- Provide health monitoring for all modules
- Enable module hot-reloading (development)
- Support module versioning and compatibility

## Implementation Steps

### Step 1: Module Registry Interface and Types
Create `modules/registry/types.ts`:

```typescript
export interface IModuleRegistry {
  // Registration
  register(moduleId: string, module: IModule): void;
  registerFactory(moduleId: string, factory: ModuleFactory): void;
  
  // Access
  get<T extends IModule>(moduleId: string): T;
  getAll(): Map<string, IModule>;
  has(moduleId: string): boolean;
  
  // Lifecycle
  initialize(config: ModuleRegistryConfig): Promise<void>;
  shutdown(): Promise<void>;
  reload(moduleId: string): Promise<void>;
  
  // Health
  health(): Promise<RegistryHealth>;
  getModuleHealth(moduleId: string): Promise<HealthStatus>;
  
  // Dependencies
  getDependencies(moduleId: string): string[];
  getDependents(moduleId: string): string[];
  getInitializationOrder(): string[];
}

export interface IModule {
  name: string;
  version: string;
  
  // Lifecycle
  initialize?(config: any): Promise<void>;
  shutdown?(): Promise<void>;
  health?(): Promise<HealthStatus>;
  
  // Dependencies
  dependencies?: string[];
  optionalDependencies?: string[];
}

export interface ModuleRegistryConfig {
  // Module configurations
  modules: Record<string, ModuleConfig>;
  
  // Registry settings
  registry: {
    strict?: boolean;              // Fail on missing dependencies
    lazyLoad?: boolean;           // Initialize modules on first use
    healthCheckInterval?: number;  // Health check interval in ms
    shutdownTimeout?: number;      // Graceful shutdown timeout
  };
  
  // Development settings
  development?: {
    hotReload?: boolean;          // Enable hot module reloading
    watchPaths?: string[];        // Paths to watch for changes
  };
}

export interface ModuleConfig {
  enabled?: boolean;
  config?: any;
  override?: Partial<IModule>;
  retryOnFailure?: boolean;
  initTimeout?: number;
}

export type ModuleFactory = (registry: IModuleRegistry) => IModule | Promise<IModule>;

export interface ModuleMetadata {
  id: string;
  module: IModule;
  factory?: ModuleFactory;
  config?: ModuleConfig;
  status: ModuleStatus;
  initialized: boolean;
  initializeTime?: number;
  lastHealthCheck?: Date;
  healthStatus?: HealthStatus;
  error?: Error;
}

export type ModuleStatus = 
  | 'registered'     // Module registered but not initialized
  | 'initializing'   // Currently initializing
  | 'ready'         // Initialized and healthy
  | 'error'         // Initialization or runtime error
  | 'stopping'      // Currently shutting down
  | 'stopped';      // Shut down

export interface RegistryHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  modules: Record<string, ModuleHealthInfo>;
  summary: {
    total: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
  };
}

export interface ModuleHealthInfo {
  status: ModuleStatus;
  health?: HealthStatus;
  lastCheck?: Date;
  uptime?: number;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  message?: string;
  details?: any;
}
```

### Step 2: Dependency Graph
Create `modules/registry/dependency-graph.ts`:

```typescript
export class DependencyGraph {
  private nodes = new Map<string, DependencyNode>();
  
  addNode(moduleId: string, dependencies: string[] = []): void {
    if (!this.nodes.has(moduleId)) {
      this.nodes.set(moduleId, {
        id: moduleId,
        dependencies: new Set(),
        dependents: new Set()
      });
    }
    
    const node = this.nodes.get(moduleId)!;
    
    // Add dependencies
    for (const dep of dependencies) {
      node.dependencies.add(dep);
      
      // Create dependency node if doesn't exist
      if (!this.nodes.has(dep)) {
        this.nodes.set(dep, {
          id: dep,
          dependencies: new Set(),
          dependents: new Set()
        });
      }
      
      // Add reverse dependency
      this.nodes.get(dep)!.dependents.add(moduleId);
    }
  }
  
  removeNode(moduleId: string): void {
    const node = this.nodes.get(moduleId);
    if (!node) return;
    
    // Remove from dependents
    for (const dep of node.dependencies) {
      const depNode = this.nodes.get(dep);
      if (depNode) {
        depNode.dependents.delete(moduleId);
      }
    }
    
    // Remove from dependencies
    for (const dependent of node.dependents) {
      const depNode = this.nodes.get(dependent);
      if (depNode) {
        depNode.dependencies.delete(moduleId);
      }
    }
    
    this.nodes.delete(moduleId);
  }
  
  getDependencies(moduleId: string): string[] {
    const node = this.nodes.get(moduleId);
    return node ? Array.from(node.dependencies) : [];
  }
  
  getDependents(moduleId: string): string[] {
    const node = this.nodes.get(moduleId);
    return node ? Array.from(node.dependents) : [];
  }
  
  getInitializationOrder(): string[] {
    // Topological sort using Kahn's algorithm
    const result: string[] = [];
    const visited = new Set<string>();
    const tempVisited = new Set<string>();
    
    const visit = (nodeId: string) => {
      if (tempVisited.has(nodeId)) {
        throw new Error(`Circular dependency detected involving: ${nodeId}`);
      }
      
      if (visited.has(nodeId)) {
        return;
      }
      
      tempVisited.add(nodeId);
      
      const node = this.nodes.get(nodeId);
      if (node) {
        for (const dep of node.dependencies) {
          visit(dep);
        }
      }
      
      tempVisited.delete(nodeId);
      visited.add(nodeId);
      result.push(nodeId);
    };
    
    // Visit all nodes
    for (const nodeId of this.nodes.keys()) {
      if (!visited.has(nodeId)) {
        visit(nodeId);
      }
    }
    
    return result;
  }
  
  detectCircularDependencies(): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const stack: string[] = [];
    
    const detectCycle = (nodeId: string): boolean => {
      if (stack.includes(nodeId)) {
        const cycleStart = stack.indexOf(nodeId);
        cycles.push(stack.slice(cycleStart).concat(nodeId));
        return true;
      }
      
      if (visited.has(nodeId)) {
        return false;
      }
      
      visited.add(nodeId);
      stack.push(nodeId);
      
      const node = this.nodes.get(nodeId);
      if (node) {
        for (const dep of node.dependencies) {
          detectCycle(dep);
        }
      }
      
      stack.pop();
      return false;
    };
    
    for (const nodeId of this.nodes.keys()) {
      if (!visited.has(nodeId)) {
        detectCycle(nodeId);
      }
    }
    
    return cycles;
  }
}

interface DependencyNode {
  id: string;
  dependencies: Set<string>;
  dependents: Set<string>;
}
```

### Step 3: Module Wrapper
Create `modules/registry/wrapper.ts`:

```typescript
export function wrapModule(
  module: IModule,
  options: WrapperOptions
): IModule {
  return new Proxy(module, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      
      // Wrap methods for monitoring
      if (typeof value === 'function' && options.monitoring?.trackMethodCalls?.includes(prop as string)) {
        return wrapMethod(value, target, prop as string, options);
      }
      
      return value;
    }
  });
}

function wrapMethod(
  method: Function,
  module: IModule,
  methodName: string,
  options: WrapperOptions
): Function {
  return async function(...args: any[]) {
    const startTime = Date.now();
    const correlationId = generateId('corr');
    
    // Pre-execution hooks
    if (options.monitoring?.onMethodCall) {
      options.monitoring.onMethodCall({
        module: module.name,
        method: methodName,
        args,
        correlationId,
        timestamp: new Date()
      });
    }
    
    try {
      // Check access control
      if (options.access?.validator) {
        const allowed = await options.access.validator({
          module: module.name,
          method: methodName,
          args
        });
        
        if (!allowed) {
          throw new Error(`Access denied to ${module.name}.${methodName}`);
        }
      }
      
      // Apply rate limiting
      if (options.access?.rateLimit) {
        const limiter = getRateLimiter(module.name, methodName, options.access.rateLimit);
        await limiter.check();
      }
      
      // Execute method
      const result = await method.apply(module, args);
      
      // Track success
      if (options.monitoring?.trackLatency) {
        trackLatency(module.name, methodName, Date.now() - startTime);
      }
      
      return result;
      
    } catch (error) {
      // Track error
      if (options.monitoring?.trackErrors) {
        trackError(module.name, methodName, error);
      }
      
      // Error handling
      if (options.errorHandling?.transform) {
        throw options.errorHandling.transform(error);
      }
      
      if (options.errorHandling?.swallowErrors) {
        console.error(`Error in ${module.name}.${methodName}:`, error);
        return null;
      }
      
      throw error;
      
    } finally {
      // Post-execution hooks
      if (options.monitoring?.onMethodComplete) {
        options.monitoring.onMethodComplete({
          module: module.name,
          method: methodName,
          duration: Date.now() - startTime,
          correlationId
        });
      }
    }
  };
}

export interface WrapperOptions {
  name: string;
  
  monitoring?: {
    trackLatency?: boolean;
    trackErrors?: boolean;
    trackMethodCalls?: string[];
    onMethodCall?: (info: MethodCallInfo) => void;
    onMethodComplete?: (info: MethodCompleteInfo) => void;
  };
  
  access?: {
    validator?: (context: AccessContext) => boolean | Promise<boolean>;
    rateLimit?: RateLimitConfig;
  };
  
  errorHandling?: {
    transform?: (error: Error) => Error;
    swallowErrors?: boolean;
    logErrors?: boolean;
  };
  
  caching?: {
    methods?: string[];
    ttl?: number;
    keyGenerator?: (args: any[]) => string;
  };
}
```

### Step 4: Module Registry Implementation
Create `modules/registry/index.ts`:

```typescript
export class ModuleRegistry implements IModuleRegistry {
  private modules = new Map<string, ModuleMetadata>();
  private dependencyGraph = new DependencyGraph();
  private config: ModuleRegistryConfig;
  private healthChecker?: HealthChecker;
  private initializationPromise?: Promise<void>;
  
  register(moduleId: string, module: IModule): void {
    if (this.modules.has(moduleId)) {
      throw new Error(`Module ${moduleId} already registered`);
    }
    
    // Add to dependency graph
    this.dependencyGraph.addNode(
      moduleId,
      module.dependencies || []
    );
    
    // Check for circular dependencies
    const cycles = this.dependencyGraph.detectCircularDependencies();
    if (cycles.length > 0) {
      this.dependencyGraph.removeNode(moduleId);
      throw new Error(
        `Circular dependency detected: ${cycles[0].join(' -> ')}`
      );
    }
    
    // Store module metadata
    this.modules.set(moduleId, {
      id: moduleId,
      module,
      status: 'registered',
      initialized: false
    });
  }
  
  registerFactory(moduleId: string, factory: ModuleFactory): void {
    if (this.modules.has(moduleId)) {
      throw new Error(`Module ${moduleId} already registered`);
    }
    
    // Store factory for lazy initialization
    this.modules.set(moduleId, {
      id: moduleId,
      module: null as any, // Will be created by factory
      factory,
      status: 'registered',
      initialized: false
    });
  }
  
  get<T extends IModule>(moduleId: string): T {
    const metadata = this.modules.get(moduleId);
    
    if (!metadata) {
      throw new Error(`Module ${moduleId} not found`);
    }
    
    // Lazy initialization if configured
    if (this.config?.registry?.lazyLoad && !metadata.initialized) {
      this.initializeModule(moduleId).catch(error => {
        console.error(`Failed to lazy-initialize module ${moduleId}:`, error);
        throw error;
      });
    }
    
    if (metadata.status === 'error') {
      throw new Error(
        `Module ${moduleId} is in error state: ${metadata.error?.message}`
      );
    }
    
    if (!metadata.initialized) {
      throw new Error(`Module ${moduleId} not initialized`);
    }
    
    return metadata.module as T;
  }
  
  async initialize(config: ModuleRegistryConfig): Promise<void> {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }
    
    this.config = config;
    
    this.initializationPromise = this.doInitialize();
    return this.initializationPromise;
  }
  
  private async doInitialize(): Promise<void> {
    // Validate all dependencies exist
    if (this.config.registry?.strict) {
      this.validateDependencies();
    }
    
    // Get initialization order
    const initOrder = this.dependencyGraph.getInitializationOrder();
    
    // Initialize modules in order
    for (const moduleId of initOrder) {
      if (this.modules.has(moduleId)) {
        await this.initializeModule(moduleId);
      }
    }
    
    // Start health monitoring
    if (this.config.registry?.healthCheckInterval) {
      this.healthChecker = new HealthChecker(
        this,
        this.config.registry.healthCheckInterval
      );
      this.healthChecker.start();
    }
    
    // Setup hot reload in development
    if (this.config.development?.hotReload) {
      this.setupHotReload();
    }
  }
  
  private async initializeModule(moduleId: string): Promise<void> {
    const metadata = this.modules.get(moduleId)!;
    
    if (metadata.initialized) {
      return;
    }
    
    metadata.status = 'initializing';
    const startTime = Date.now();
    
    try {
      // Create module from factory if needed
      if (metadata.factory && !metadata.module) {
        metadata.module = await metadata.factory(this);
        
        // Update dependency graph with actual dependencies
        this.dependencyGraph.removeNode(moduleId);
        this.dependencyGraph.addNode(
          moduleId,
          metadata.module.dependencies || []
        );
      }
      
      // Get module config
      const moduleConfig = this.config.modules?.[moduleId];
      
      // Skip if disabled
      if (moduleConfig?.enabled === false) {
        metadata.status = 'stopped';
        return;
      }
      
      // Initialize with timeout
      if (metadata.module.initialize) {
        const timeout = moduleConfig?.initTimeout || 30000;
        
        await this.withTimeout(
          metadata.module.initialize(moduleConfig?.config),
          timeout,
          `Module ${moduleId} initialization timed out`
        );
      }
      
      metadata.initialized = true;
      metadata.status = 'ready';
      metadata.initializeTime = Date.now() - startTime;
      
      console.log(
        `Module ${moduleId} initialized in ${metadata.initializeTime}ms`
      );
      
    } catch (error) {
      metadata.status = 'error';
      metadata.error = error;
      
      if (this.config.registry?.strict) {
        throw new Error(
          `Failed to initialize module ${moduleId}: ${error.message}`
        );
      }
      
      console.error(`Failed to initialize module ${moduleId}:`, error);
    }
  }
  
  async shutdown(): Promise<void> {
    // Stop health checker
    if (this.healthChecker) {
      this.healthChecker.stop();
    }
    
    // Get shutdown order (reverse of initialization)
    const shutdownOrder = this.dependencyGraph
      .getInitializationOrder()
      .reverse();
    
    // Shutdown modules in order
    const timeout = this.config.registry?.shutdownTimeout || 30000;
    const shutdownPromises = [];
    
    for (const moduleId of shutdownOrder) {
      const metadata = this.modules.get(moduleId);
      
      if (metadata?.initialized && metadata.module.shutdown) {
        metadata.status = 'stopping';
        
        const shutdownPromise = this.withTimeout(
          metadata.module.shutdown(),
          timeout,
          `Module ${moduleId} shutdown timed out`
        ).then(() => {
          metadata.status = 'stopped';
          metadata.initialized = false;
        }).catch(error => {
          console.error(`Error shutting down module ${moduleId}:`, error);
          metadata.status = 'error';
          metadata.error = error;
        });
        
        shutdownPromises.push(shutdownPromise);
      }
    }
    
    await Promise.all(shutdownPromises);
  }
  
  async reload(moduleId: string): Promise<void> {
    const metadata = this.modules.get(moduleId);
    if (!metadata) {
      throw new Error(`Module ${moduleId} not found`);
    }
    
    // Get dependent modules
    const dependents = this.dependencyGraph.getDependents(moduleId);
    
    // Shutdown module and dependents
    const shutdownOrder = [moduleId, ...dependents].reverse();
    for (const id of shutdownOrder) {
      const meta = this.modules.get(id);
      if (meta?.module.shutdown) {
        await meta.module.shutdown();
      }
    }
    
    // Reinitialize module and dependents
    await this.initializeModule(moduleId);
    for (const dependentId of dependents) {
      await this.initializeModule(dependentId);
    }
  }
  
  async health(): Promise<RegistryHealth> {
    const moduleHealths: Record<string, ModuleHealthInfo> = {};
    
    for (const [moduleId, metadata] of this.modules.entries()) {
      const healthInfo: ModuleHealthInfo = {
        status: metadata.status,
        lastCheck: metadata.lastHealthCheck
      };
      
      if (metadata.initialized && metadata.module.health) {
        try {
          const health = await metadata.module.health();
          healthInfo.health = health;
          metadata.healthStatus = health;
        } catch (error) {
          healthInfo.health = {
            status: 'unhealthy',
            message: error.message
          };
        }
      }
      
      if (metadata.initializeTime) {
        healthInfo.uptime = Date.now() - metadata.initializeTime;
      }
      
      moduleHealths[moduleId] = healthInfo;
    }
    
    // Calculate summary
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
  
  private validateDependencies(): void {
    for (const [moduleId, metadata] of this.modules.entries()) {
      const dependencies = metadata.module?.dependencies || [];
      
      for (const dep of dependencies) {
        if (!this.modules.has(dep)) {
          throw new Error(
            `Module ${moduleId} depends on ${dep} which is not registered`
          );
        }
      }
    }
  }
  
  private async withTimeout<T>(
    promise: Promise<T>,
    timeout: number,
    errorMessage: string
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(errorMessage)), timeout);
    });
    
    return Promise.race([promise, timeoutPromise]);
  }
}
```

### Step 5: Health Monitoring
Create `modules/registry/health-checker.ts`:

```typescript
export class HealthChecker {
  private interval?: NodeJS.Timer;
  private checking = false;
  
  constructor(
    private registry: ModuleRegistry,
    private checkInterval: number
  ) {}
  
  start(): void {
    if (this.interval) {
      return;
    }
    
    this.interval = setInterval(async () => {
      if (this.checking) {
        return; // Skip if previous check still running
      }
      
      this.checking = true;
      
      try {
        await this.checkHealth();
      } catch (error) {
        console.error('Health check error:', error);
      } finally {
        this.checking = false;
      }
    }, this.checkInterval);
    
    // Run initial check
    this.checkHealth().catch(console.error);
  }
  
  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }
  }
  
  private async checkHealth(): Promise<void> {
    const modules = this.registry.getAll();
    
    for (const [moduleId, metadata] of modules.entries()) {
      if (metadata.initialized && metadata.module.health) {
        try {
          const health = await metadata.module.health();
          
          metadata.healthStatus = health;
          metadata.lastHealthCheck = new Date();
          
          // Update status based on health
          if (health.status === 'unhealthy') {
            metadata.status = 'error';
          } else if (metadata.status === 'error' && health.status === 'healthy') {
            metadata.status = 'ready';
          }
          
        } catch (error) {
          metadata.healthStatus = {
            status: 'unhealthy',
            message: `Health check failed: ${error.message}`,
            details: { error }
          };
          
          console.error(`Health check failed for ${moduleId}:`, error);
        }
      }
    }
    
    // Emit health status event
    const overallHealth = await this.registry.health();
    
    if (overallHealth.status !== 'healthy') {
      console.warn('Registry health degraded:', overallHealth);
    }
  }
}
```

### Step 6: Module Registry Factory
Create `modules/registry/factory.ts`:

```typescript
export function createModuleRegistry(
  config?: Partial<ModuleRegistryConfig>
): IModuleRegistry {
  const registry = new ModuleRegistry();
  
  // Register core modules with factories
  registry.registerFactory('litellm', async (reg) => {
    const { createLiteLLMModule } = await import('../litellm/factory');
    return createLiteLLMModule(config?.modules?.litellm?.config || {});
  });
  
  registry.registerFactory('langfuse', async (reg) => {
    const { createLangfuseModule } = await import('../langfuse/factory');
    return createLangfuseModule(config?.modules?.langfuse?.config || {});
  });
  
  registry.registerFactory('sessionState', async (reg) => {
    const { createSessionStateModule } = await import('../session-state/factory');
    return createSessionStateModule(config?.modules?.sessionState?.config || {});
  });
  
  registry.registerFactory('memory', async (reg) => {
    const { createMemoryModule } = await import('../memory/factory');
    return createMemoryModule(config?.modules?.memory?.config || {});
  });
  
  registry.registerFactory('tools', async (reg) => {
    const { createToolsModule } = await import('../tools/factory');
    return createToolsModule(config?.modules?.tools?.config || {});
  });
  
  return registry;
}

// Singleton instance for global access
let globalRegistry: IModuleRegistry | null = null;

export function getGlobalRegistry(): IModuleRegistry {
  if (!globalRegistry) {
    globalRegistry = createModuleRegistry();
  }
  return globalRegistry;
}

export function setGlobalRegistry(registry: IModuleRegistry): void {
  globalRegistry = registry;
}
```

## Testing Requirements

### 1. Unit Tests
- Module registration and retrieval
- Dependency resolution
- Circular dependency detection
- Initialization order
- Health monitoring

### 2. Integration Tests
- Full module lifecycle
- Module reloading
- Error recovery
- Graceful shutdown
- Health aggregation

### 3. Performance Tests
- Module initialization time
- Registry lookup performance
- Health check overhead
- Memory usage with many modules

## Post-Implementation Validation

### 1. Functionality Checklist
- [ ] Modules register correctly
- [ ] Dependencies are resolved
- [ ] Circular dependencies detected
- [ ] Initialization order is correct
- [ ] Health monitoring works
- [ ] Hot reload functions (dev)

### 2. Reliability Requirements
- [ ] Graceful error handling
- [ ] Proper shutdown sequence
- [ ] No resource leaks
- [ ] Recovery from failures

### 3. Performance Requirements
- [ ] Fast module lookup (<1ms)
- [ ] Efficient dependency resolution
- [ ] Minimal health check overhead
- [ ] Scales to 100+ modules

## Common Pitfalls to Avoid

1. **Don't ignore initialization order** - Dependencies must initialize first
2. **Don't allow circular dependencies** - Detect and prevent
3. **Don't block on health checks** - Run asynchronously
4. **Don't leak resources** - Proper cleanup on shutdown
5. **Don't hardcode module list** - Use factories for flexibility
6. **Don't skip error boundaries** - Isolate module failures

## Final Validation Questions

1. Are all dependencies properly resolved?
2. Is the initialization order deterministic?
3. Does health monitoring provide useful insights?
4. Can modules be reloaded without affecting others?
5. Is the registry performant with many modules?
6. Are module failures properly isolated?

## Next Steps
After completing the Module Registry, update the base agent implementation (07-base-agent-implementation.md) to use the modular architecture.