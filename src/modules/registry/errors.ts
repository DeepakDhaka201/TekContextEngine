/**
 * @fileoverview Error classes for the Module Registry system
 * @module modules/registry/errors
 * @requires None - Pure error class definitions
 * 
 * This file defines custom error classes for the Module Registry system.
 * These errors provide specific context about registry operations and help
 * developers understand and resolve issues quickly.
 * 
 * Key concepts:
 * - All errors extend ModuleRegistryError for consistent handling
 * - Errors include actionable information for resolution
 * - Error codes enable programmatic error handling
 * - Context information helps with debugging
 * 
 * @example
 * ```typescript
 * import { ModuleNotFoundError, CircularDependencyError } from './errors';
 * 
 * try {
 *   registry.get('nonexistent');
 * } catch (error) {
 *   if (error instanceof ModuleNotFoundError) {
 *     console.log('Available modules:', error.availableModules);
 *   }
 * }
 * ```
 * 
 * @see types.ts for related type definitions
 * @since 1.0.0
 */

/**
 * Base error class for all Module Registry errors.
 * 
 * Provides common structure and context for all registry-related errors,
 * making them easier to handle consistently throughout the application.
 * 
 * @remarks
 * All registry errors should extend this class to maintain consistency
 * in error handling and to provide useful context for debugging.
 * 
 * @example
 * ```typescript
 * class CustomRegistryError extends ModuleRegistryError {
 *   constructor(message: string) {
 *     super(message, 'CUSTOM_ERROR', { timestamp: Date.now() });
 *   }
 * }
 * ```
 * 
 * @public
 */
export class ModuleRegistryError extends Error {
  /**
   * Creates a new Module Registry error.
   * 
   * @param message - Human-readable error message
   * @param code - Machine-readable error code for programmatic handling
   * @param context - Additional context information for debugging
   * @param solution - Suggested solution or next steps
   * 
   * Implementation notes:
   * - Error codes should be consistent and documented
   * - Context should include relevant state for debugging
   * - Solutions should be actionable for developers
   */
  constructor(
    message: string,
    public readonly code: string,
    public readonly context: Record<string, any> = {},
    public readonly solution?: string
  ) {
    super(message);
    this.name = 'ModuleRegistryError';
    
    // Ensure stack trace points to the actual error location
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ModuleRegistryError);
    }
  }
}

/**
 * Error thrown when attempting to register a module that already exists.
 * 
 * This prevents accidental overwrites of registered modules and helps
 * identify configuration issues where the same module is registered twice.
 * 
 * @example
 * ```typescript
 * // This will throw ModuleAlreadyRegisteredError
 * registry.register('memory', memoryModule1);
 * registry.register('memory', memoryModule2); // Error!
 * ```
 * 
 * @public
 */
export class ModuleAlreadyRegisteredError extends ModuleRegistryError {
  constructor(moduleId: string, existingModule: any) {
    super(
      `Module '${moduleId}' is already registered`,
      'MODULE_ALREADY_REGISTERED',
      { 
        moduleId, 
        existingModule: {
          name: existingModule.name,
          version: existingModule.version
        }
      },
      `Use a different module ID or unregister the existing module first`
    );
    this.name = 'ModuleAlreadyRegisteredError';
  }
}

/**
 * Error thrown when attempting to access a module that doesn't exist.
 * 
 * Provides helpful context about what modules are available to help
 * developers identify typos or missing registrations.
 * 
 * @example
 * ```typescript
 * try {
 *   const module = registry.get('nonexistent');
 * } catch (error) {
 *   if (error instanceof ModuleNotFoundError) {
 *     console.log('Did you mean:', error.similarModules);
 *   }
 * }
 * ```
 * 
 * @public
 */
export class ModuleNotFoundError extends ModuleRegistryError {
  constructor(moduleId: string, availableModules: string[]) {
    // Find similar module names to suggest
    const similarModules = availableModules
      .filter(id => id.toLowerCase().includes(moduleId.toLowerCase()) || 
                   moduleId.toLowerCase().includes(id.toLowerCase()))
      .slice(0, 3);

    super(
      `Module '${moduleId}' not found`,
      'MODULE_NOT_FOUND',
      { 
        moduleId,
        availableModules,
        similarModules 
      },
      similarModules.length > 0 
        ? `Did you mean: ${similarModules.join(', ')}?`
        : `Register the module first with registry.register('${moduleId}', module)`
    );
    this.name = 'ModuleNotFoundError';
  }
}

/**
 * Error thrown when accessing a module that hasn't been initialized.
 * 
 * This typically occurs when trying to use modules before calling
 * registry.initialize() or when lazy loading is enabled.
 * 
 * @example
 * ```typescript
 * registry.register('memory', memoryModule);
 * // This will throw - module not initialized yet
 * const module = registry.get('memory');
 * 
 * // Correct usage
 * await registry.initialize(config);
 * const module = registry.get('memory'); // Now works
 * ```
 * 
 * @public
 */
export class ModuleNotInitializedError extends ModuleRegistryError {
  constructor(moduleId: string, currentStatus: string) {
    super(
      `Module '${moduleId}' is not initialized (status: ${currentStatus})`,
      'MODULE_NOT_INITIALIZED',
      { moduleId, currentStatus },
      currentStatus === 'registered' 
        ? `Call registry.initialize() to initialize all modules`
        : `Wait for module to finish initializing or check for initialization errors`
    );
    this.name = 'ModuleNotInitializedError';
  }
}

/**
 * Error thrown when accessing a module that is in an error state.
 * 
 * Provides context about the original error that caused the module
 * to fail, helping with debugging and recovery.
 * 
 * @public
 */
export class ModuleInErrorStateError extends ModuleRegistryError {
  constructor(moduleId: string, originalError?: Error) {
    super(
      `Module '${moduleId}' is in error state`,
      'MODULE_IN_ERROR_STATE',
      { 
        moduleId, 
        originalError: originalError ? {
          message: originalError.message,
          stack: originalError.stack,
          name: originalError.name
        } : undefined
      },
      `Check module logs for initialization errors and fix the underlying issue`
    );
    this.name = 'ModuleInErrorStateError';
    
    // Chain the original error for better stack traces
    if (originalError) {
      (this as any).cause = originalError;
    }
  }
}

/**
 * Error thrown when circular dependencies are detected in the module graph.
 * 
 * Circular dependencies prevent proper initialization order and must be
 * resolved by refactoring module dependencies.
 * 
 * @example
 * ```typescript
 * // This creates a circular dependency: A -> B -> C -> A
 * moduleA.dependencies = ['moduleB'];
 * moduleB.dependencies = ['moduleC'];
 * moduleC.dependencies = ['moduleA']; // Creates cycle!
 * ```
 * 
 * @public
 */
export class CircularDependencyError extends ModuleRegistryError {
  constructor(cycle: string[]) {
    const cycleDescription = cycle.join(' → ') + ` → ${cycle[0]}`;
    
    super(
      `Circular dependency detected: ${cycleDescription}`,
      'CIRCULAR_DEPENDENCY',
      { cycle, cycleDescription },
      `Refactor module dependencies to break the cycle. Consider:\n` +
      `• Using optional dependencies\n` +
      `• Creating an abstraction layer\n` +
      `• Moving shared functionality to a separate module`
    );
    this.name = 'CircularDependencyError';
  }
}

/**
 * Error thrown when a required dependency is missing.
 * 
 * This occurs in strict mode when a module depends on another module
 * that hasn't been registered.
 * 
 * @public
 */
export class MissingDependencyError extends ModuleRegistryError {
  constructor(moduleId: string, missingDependency: string, availableModules: string[]) {
    super(
      `Module '${moduleId}' depends on '${missingDependency}' which is not registered`,
      'MISSING_DEPENDENCY',
      { moduleId, missingDependency, availableModules },
      `Register the '${missingDependency}' module before '${moduleId}' or ` +
      `remove it from ${moduleId}'s dependencies`
    );
    this.name = 'MissingDependencyError';
  }
}

/**
 * Error thrown when a module fails during initialization.
 * 
 * Wraps the original initialization error with additional context
 * about the module and initialization process.
 * 
 * @public
 */
export class ModuleInitializationError extends ModuleRegistryError {
  constructor(moduleId: string, originalError: Error, initContext: any = {}) {
    super(
      `Failed to initialize module '${moduleId}': ${originalError.message}`,
      'MODULE_INITIALIZATION_FAILED',
      { 
        moduleId,
        originalError: {
          message: originalError.message,
          stack: originalError.stack,
          name: originalError.name
        },
        initContext
      },
      `Check the module's initialize() method and configuration. ` +
      `Ensure all dependencies are properly initialized.`
    );
    this.name = 'ModuleInitializationError';
    (this as any).cause = originalError;
  }
}

/**
 * Error thrown when a module fails during shutdown.
 * 
 * Non-critical for application operation but important for proper
 * resource cleanup and graceful shutdown.
 * 
 * @public
 */
export class ModuleShutdownError extends ModuleRegistryError {
  constructor(moduleId: string, originalError: Error) {
    super(
      `Failed to shutdown module '${moduleId}': ${originalError.message}`,
      'MODULE_SHUTDOWN_FAILED',
      { 
        moduleId,
        originalError: {
          message: originalError.message,
          stack: originalError.stack,
          name: originalError.name
        }
      },
      `Check the module's shutdown() method for proper resource cleanup`
    );
    this.name = 'ModuleShutdownError';
    (this as any).cause = originalError;
  }
}

/**
 * Error thrown when registry operations time out.
 * 
 * This can occur during initialization, shutdown, or other long-running
 * operations. Provides context about what operation timed out.
 * 
 * @public
 */
export class RegistryTimeoutError extends ModuleRegistryError {
  constructor(operation: string, timeoutMs: number, context: any = {}) {
    super(
      `Registry operation '${operation}' timed out after ${timeoutMs}ms`,
      'REGISTRY_TIMEOUT',
      { operation, timeoutMs, ...context },
      `Increase timeout value or investigate why the operation is slow. ` +
      `Check for blocking operations or resource contention.`
    );
    this.name = 'RegistryTimeoutError';
  }
}

/**
 * Error thrown when attempting to reload a module fails.
 * 
 * Module reloading is primarily used in development for hot reload
 * functionality and can fail for various reasons.
 * 
 * @public
 */
export class ModuleReloadError extends ModuleRegistryError {
  constructor(moduleId: string, reason: string, originalError?: Error) {
    super(
      `Failed to reload module '${moduleId}': ${reason}`,
      'MODULE_RELOAD_FAILED',
      { 
        moduleId, 
        reason,
        originalError: originalError ? {
          message: originalError.message,
          stack: originalError.stack
        } : undefined
      },
      `Check if the module supports reloading and that all dependents can be safely restarted`
    );
    this.name = 'ModuleReloadError';
    
    if (originalError) {
      (this as any).cause = originalError;
    }
  }
}

/**
 * Utility function to check if an error is a registry-related error.
 * 
 * @param error - The error to check
 * @returns True if error is a ModuleRegistryError or subclass
 * 
 * @example
 * ```typescript
 * try {
 *   registry.get('module');
 * } catch (error) {
 *   if (isRegistryError(error)) {
 *     console.log('Registry error:', error.code);
 *   }
 * }
 * ```
 */
export function isRegistryError(error: any): error is ModuleRegistryError {
  return error instanceof ModuleRegistryError;
}

/**
 * Utility function to format registry errors for logging.
 * 
 * @param error - The registry error to format
 * @returns Formatted error string with code and context
 * 
 * @example
 * ```typescript
 * try {
 *   registry.get('module');
 * } catch (error) {
 *   if (isRegistryError(error)) {
 *     console.error(formatRegistryError(error));
 *   }
 * }
 * ```
 */
export function formatRegistryError(error: ModuleRegistryError): string {
  const parts = [
    `[${error.code}] ${error.message}`
  ];
  
  if (error.solution) {
    parts.push(`Solution: ${error.solution}`);
  }
  
  if (Object.keys(error.context).length > 0) {
    parts.push(`Context: ${JSON.stringify(error.context, null, 2)}`);
  }
  
  return parts.join('\n');
}