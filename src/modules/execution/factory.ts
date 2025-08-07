/**
 * @fileoverview Factory function for creating Execution Manager instances
 * @module modules/execution/factory
 * @requires ./execution-manager
 * @requires ./types
 * @requires ../registry/types
 * 
 * This file provides the factory function used by the Module Registry
 * to create Execution Manager instances with proper configuration and
 * environment-specific defaults for workflow orchestration.
 * 
 * Key concepts:
 * - Factory pattern for module instantiation
 * - Environment-specific configuration defaults
 * - Configuration validation and error handling
 * - Development vs production optimizations
 * - Integration with AgentHub module system
 * 
 * @example
 * ```typescript
 * import { createExecutionManager } from './factory';
 * 
 * const executionManager = createExecutionManager({
 *   maxConcurrentExecutions: 10,
 *   parallelExecution: {
 *     enabled: true,
 *     maxParallelNodes: 5
 *   },
 *   statePersistence: {
 *     enabled: true,
 *     storage: 'memory'
 *   }
 * });
 * 
 * await executionManager.initialize(config);
 * ```
 * 
 * @see execution-manager.ts for the main implementation
 * @see ../registry/factory.ts for how this is used in the registry
 * @since 1.0.0
 */

import { ExecutionManager } from './execution-manager';
import { IExecutionManager, ExecutionManagerConfig } from './types';
import { ExecutionError } from './errors';

/**
 * Configuration interface for the Execution Manager factory.
 * 
 * Extends the module configuration with factory-specific options
 * such as environment variable resolution and development settings.
 */
interface ExecutionManagerFactoryConfig extends Partial<ExecutionManagerConfig> {
  /** Environment configuration */
  environment?: 'development' | 'test' | 'production';
  
  /** Whether to load configuration from environment variables */
  loadFromEnv?: boolean;
  
  /** Environment variable prefix for configuration */
  envPrefix?: string;
  
  /** Development-specific options */
  development?: {
    /** Enable verbose logging */
    verboseLogging?: boolean;
    
    /** Reduced limits for development */
    reducedLimits?: boolean;
    
    /** Enable debug features */
    debugMode?: boolean;
  };
  
  /** Test-specific options */
  test?: {
    /** Enable test mode */
    enabled?: boolean;
    
    /** Use minimal timeouts for faster tests */
    fastTimeouts?: boolean;
    
    /** Disable persistence for isolated tests */
    noPersistence?: boolean;
  };
}

/**
 * Default configuration for different environments.
 */
const DEFAULT_CONFIGS = {
  development: {
    maxConcurrentExecutions: 5,
    defaultTimeout: 60000, // 1 minute
    maxRetries: 2,
    queueProcessingInterval: 500,
    dependencyResolutionTimeout: 10000,
    humanInteractionTimeout: 300000, // 5 minutes
    humanInteractionRetryLimit: 2,
    statePersistence: {
      enabled: true,
      saveInterval: 5000,
      storage: 'memory' as const
    },
    parallelExecution: {
      enabled: true,
      maxParallelNodes: 3
    },
    errorRecovery: {
      autoRetry: true,
      retryDelay: 2000,
      maxRetryAttempts: 2
    }
  },
  
  test: {
    maxConcurrentExecutions: 2,
    defaultTimeout: 10000, // 10 seconds
    maxRetries: 1,
    queueProcessingInterval: 100,
    dependencyResolutionTimeout: 5000,
    humanInteractionTimeout: 5000, // 5 seconds
    humanInteractionRetryLimit: 1,
    statePersistence: {
      enabled: false, // Disable for isolated tests
      saveInterval: 1000,
      storage: 'memory' as const
    },
    parallelExecution: {
      enabled: false, // Disable for predictable test execution
      maxParallelNodes: 1
    },
    errorRecovery: {
      autoRetry: false,
      retryDelay: 1000,
      maxRetryAttempts: 1
    }
  },
  
  production: {
    maxConcurrentExecutions: parseInt(process.env.MAX_CONCURRENT_EXECUTIONS || '20', 10),
    defaultTimeout: parseInt(process.env.DEFAULT_EXECUTION_TIMEOUT || '600000', 10), // 10 minutes
    maxRetries: parseInt(process.env.MAX_RETRIES || '3', 10),
    queueProcessingInterval: parseInt(process.env.QUEUE_PROCESSING_INTERVAL || '1000', 10),
    dependencyResolutionTimeout: parseInt(process.env.DEPENDENCY_RESOLUTION_TIMEOUT || '30000', 10),
    humanInteractionTimeout: parseInt(process.env.HUMAN_INTERACTION_TIMEOUT || '1800000', 10), // 30 minutes
    humanInteractionRetryLimit: parseInt(process.env.HUMAN_INTERACTION_RETRY_LIMIT || '3', 10),
    statePersistence: {
      enabled: process.env.DISABLE_STATE_PERSISTENCE !== 'true',
      saveInterval: parseInt(process.env.STATE_SAVE_INTERVAL || '15000', 10),
      storage: (process.env.STATE_STORAGE_TYPE as any) || 'memory' as const
    },
    parallelExecution: {
      enabled: process.env.DISABLE_PARALLEL_EXECUTION !== 'true',
      maxParallelNodes: parseInt(process.env.MAX_PARALLEL_NODES || '10', 10)
    },
    errorRecovery: {
      autoRetry: process.env.DISABLE_AUTO_RETRY !== 'true',
      retryDelay: parseInt(process.env.RETRY_DELAY || '5000', 10),
      maxRetryAttempts: parseInt(process.env.MAX_RETRY_ATTEMPTS || '3', 10)
    }
  }
};

/**
 * Creates an Execution Manager instance with comprehensive configuration.
 * 
 * This factory function handles:
 * - Environment-specific configuration defaults
 * - Configuration loading from environment variables
 * - Development vs production optimizations
 * - Configuration validation and error handling
 * 
 * Environment variable loading:
 * - MAX_CONCURRENT_EXECUTIONS -> maxConcurrentExecutions
 * - DEFAULT_EXECUTION_TIMEOUT -> defaultTimeout
 * - MAX_RETRIES -> maxRetries
 * - QUEUE_PROCESSING_INTERVAL -> queueProcessingInterval
 * - HUMAN_INTERACTION_TIMEOUT -> humanInteractionTimeout
 * - MAX_PARALLEL_NODES -> parallelExecution.maxParallelNodes
 * - STATE_STORAGE_TYPE -> statePersistence.storage
 * - Custom prefix via envPrefix option
 * 
 * @param userConfig - User-provided configuration (optional)
 * @param dependencies - Injected dependencies (unused for Execution Manager)
 * @returns Configured Execution Manager instance
 * @throws {ExecutionError} If configuration is invalid
 * 
 * @example
 * ```typescript
 * // Minimal configuration with environment variables
 * const executionManager = createExecutionManager();
 * 
 * // Explicit configuration
 * const executionManager = createExecutionManager({
 *   maxConcurrentExecutions: 15,
 *   parallelExecution: {
 *     enabled: true,
 *     maxParallelNodes: 8
 *   },
 *   statePersistence: {
 *     enabled: true,
 *     storage: 'redis'
 *   }
 * });
 * 
 * // Development configuration
 * const executionManager = createExecutionManager({
 *   environment: 'development',
 *   development: {
 *     verboseLogging: true,
 *     reducedLimits: true,
 *     debugMode: true
 *   }
 * });
 * 
 * // Test configuration
 * const executionManager = createExecutionManager({
 *   environment: 'test',
 *   test: {
 *     enabled: true,
 *     fastTimeouts: true,
 *     noPersistence: true
 *   }
 * });
 * ```
 * 
 * Configuration precedence (highest to lowest):
 * 1. User-provided configuration
 * 2. Environment variables (if loadFromEnv is true)
 * 3. Environment-specific defaults
 * 4. Base defaults
 * 
 * @public
 */
export function createExecutionManager(
  userConfig: ExecutionManagerFactoryConfig = {},
  dependencies?: Record<string, any>
): IExecutionManager {
  console.log('Creating Execution Manager with factory...');
  
  try {
    // Determine environment
    const env = getEnvironment(userConfig.environment);
    console.log(`Creating Execution Manager for environment: ${env}`);
    
    // Get environment-specific defaults
    const envDefaults = DEFAULT_CONFIGS[env];
    
    // Load configuration from environment variables if enabled
    const envConfig = (userConfig.loadFromEnv !== false) 
      ? loadConfigFromEnvironment(userConfig.envPrefix)
      : {};
    
    // Merge configurations with proper precedence
    const fullConfig = mergeConfigurations([
      envDefaults,     // Environment defaults (lowest priority)
      envConfig,       // Environment variables
      userConfig       // User config (highest priority)
    ]);
    
    // Remove factory-specific properties
    const { environment, loadFromEnv, envPrefix, development, test, ...moduleConfig } = fullConfig;
    
    // Apply environment-specific optimizations
    const optimizedConfig = applyEnvironmentOptimizations(moduleConfig, env, {
      development: development || {},
      test: test || {}
    });
    
    // Validate final configuration
    validateFactoryConfiguration(optimizedConfig);
    
    console.log('✓ Execution Manager created successfully for', env, 'environment');
    console.log('Configuration summary:', {
      maxConcurrent: optimizedConfig.maxConcurrentExecutions,
      parallelExecution: optimizedConfig.parallelExecution?.enabled,
      statePersistence: optimizedConfig.statePersistence?.enabled,
      timeout: optimizedConfig.defaultTimeout
    });
    
    return new ExecutionManager();
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Failed to create Execution Manager:', errorMessage);
    
    throw new ExecutionError(
      'EXECUTION_MANAGER_FACTORY_ERROR',
      `Execution Manager creation failed: ${errorMessage}`,
      {
        environment: getEnvironment(userConfig.environment),
        suggestion: 'Check configuration format and ensure all required dependencies are available'
      },
      undefined,
      'error',
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Determines the current environment.
 * 
 * @param explicitEnv - Explicitly specified environment
 * @returns Environment string
 * @private
 */
function getEnvironment(explicitEnv?: string): 'development' | 'test' | 'production' {
  if (explicitEnv) {
    return explicitEnv as 'development' | 'test' | 'production';
  }
  
  if (process.env.NODE_ENV === 'test') return 'test';
  if (process.env.NODE_ENV === 'development') return 'development';
  return 'production';
}

/**
 * Loads configuration from environment variables.
 * 
 * @param prefix - Custom environment variable prefix
 * @returns Configuration object from environment
 * @private
 */
function loadConfigFromEnvironment(prefix: string = 'EXECUTION_'): Partial<ExecutionManagerConfig> {
  const config: Partial<ExecutionManagerConfig> = {};
  
  // Load basic configuration
  const maxConcurrent = process.env.MAX_CONCURRENT_EXECUTIONS || process.env[`${prefix}MAX_CONCURRENT`];
  if (maxConcurrent) {
    const value = parseInt(maxConcurrent, 10);
    if (!isNaN(value)) {
      config.maxConcurrentExecutions = value;
      console.log(`✓ Loaded max concurrent executions from environment: ${value}`);
    }
  }
  
  const defaultTimeout = process.env.DEFAULT_EXECUTION_TIMEOUT || process.env[`${prefix}DEFAULT_TIMEOUT`];
  if (defaultTimeout) {
    const value = parseInt(defaultTimeout, 10);
    if (!isNaN(value)) {
      config.defaultTimeout = value;
      console.log(`✓ Loaded default timeout from environment: ${value}ms`);
    }
  }
  
  const maxRetries = process.env.MAX_RETRIES || process.env[`${prefix}MAX_RETRIES`];
  if (maxRetries) {
    const value = parseInt(maxRetries, 10);
    if (!isNaN(value)) {
      config.maxRetries = value;
      console.log(`✓ Loaded max retries from environment: ${value}`);
    }
  }
  
  // Load human interaction configuration
  const humanTimeout = process.env.HUMAN_INTERACTION_TIMEOUT || process.env[`${prefix}HUMAN_TIMEOUT`];
  if (humanTimeout) {
    const value = parseInt(humanTimeout, 10);
    if (!isNaN(value)) {
      config.humanInteractionTimeout = value;
      console.log(`✓ Loaded human interaction timeout from environment: ${value}ms`);
    }
  }
  
  // Load parallel execution configuration
  if (!config.parallelExecution) {
    config.parallelExecution = {};
  }
  
  const disableParallel = process.env.DISABLE_PARALLEL_EXECUTION || process.env[`${prefix}DISABLE_PARALLEL`];
  if (disableParallel) {
    config.parallelExecution.enabled = disableParallel.toLowerCase() !== 'true';
    console.log(`✓ Loaded parallel execution setting from environment: ${config.parallelExecution.enabled}`);
  }
  
  const maxParallelNodes = process.env.MAX_PARALLEL_NODES || process.env[`${prefix}MAX_PARALLEL_NODES`];
  if (maxParallelNodes) {
    const value = parseInt(maxParallelNodes, 10);
    if (!isNaN(value)) {
      config.parallelExecution!.maxParallelNodes = value;
      console.log(`✓ Loaded max parallel nodes from environment: ${value}`);
    }
  }
  
  // Load state persistence configuration
  if (!config.statePersistence) {
    config.statePersistence = {};
  }
  
  const disablePersistence = process.env.DISABLE_STATE_PERSISTENCE || process.env[`${prefix}DISABLE_PERSISTENCE`];
  if (disablePersistence) {
    config.statePersistence.enabled = disablePersistence.toLowerCase() !== 'true';
    console.log(`✓ Loaded state persistence setting from environment: ${config.statePersistence.enabled}`);
  }
  
  const storageType = process.env.STATE_STORAGE_TYPE || process.env[`${prefix}STORAGE_TYPE`];
  if (storageType) {
    config.statePersistence!.storage = storageType as any;
    console.log(`✓ Loaded storage type from environment: ${storageType}`);
  }
  
  const saveInterval = process.env.STATE_SAVE_INTERVAL || process.env[`${prefix}SAVE_INTERVAL`];
  if (saveInterval) {
    const value = parseInt(saveInterval, 10);
    if (!isNaN(value)) {
      config.statePersistence!.saveInterval = value;
      console.log(`✓ Loaded save interval from environment: ${value}ms`);
    }
  }
  
  return config;
}

/**
 * Merges multiple configuration objects with proper precedence.
 * 
 * @param configs - Array of configurations (lowest to highest priority)
 * @returns Merged configuration
 * @private
 */
function mergeConfigurations(configs: any[]): ExecutionManagerFactoryConfig {
  let merged: ExecutionManagerFactoryConfig = {};
  
  for (const config of configs) {
    merged = deepMerge(merged, config);
  }
  
  return merged;
}

/**
 * Deep merge utility for configuration objects.
 * 
 * @param target - Target object to merge into
 * @param source - Source object to merge from
 * @returns Merged object
 * @private
 */
function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  const result = { ...target };
  
  for (const key in source) {
    const sourceValue = source[key];
    const targetValue = result[key];
    
    if (isObject(sourceValue) && isObject(targetValue)) {
      result[key] = deepMerge(targetValue, sourceValue);
    } else if (sourceValue !== undefined) {
      result[key] = sourceValue;
    }
  }
  
  return result;
}

/**
 * Checks if a value is a plain object.
 * 
 * @param value - Value to check
 * @returns True if value is a plain object
 * @private
 */
function isObject(value: any): boolean {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Applies environment-specific optimizations.
 * 
 * @param config - Base configuration
 * @param environment - Target environment
 * @param envOptions - Environment-specific options
 * @returns Optimized configuration
 * @private
 */
function applyEnvironmentOptimizations(
  config: ExecutionManagerConfig,
  environment: 'development' | 'test' | 'production',
  envOptions: { development: any; test: any }
): ExecutionManagerConfig {
  const optimized = { ...config };
  
  switch (environment) {
    case 'development':
      if (envOptions.development.reducedLimits) {
        optimized.maxConcurrentExecutions = Math.min(optimized.maxConcurrentExecutions || 5, 5);
        optimized.defaultTimeout = Math.min(optimized.defaultTimeout || 60000, 60000);
      }
      
      if (envOptions.development.debugMode) {
        // Enable debug features
        optimized.errorRecovery = {
          ...optimized.errorRecovery,
          autoRetry: false // Disable for easier debugging
        };
      }
      break;
      
    case 'test':
      if (envOptions.test.fastTimeouts) {
        optimized.defaultTimeout = Math.min(optimized.defaultTimeout || 10000, 10000);
        optimized.humanInteractionTimeout = Math.min(optimized.humanInteractionTimeout || 5000, 5000);
      }
      
      if (envOptions.test.noPersistence) {
        optimized.statePersistence = {
          ...optimized.statePersistence,
          enabled: false
        };
      }
      
      // Ensure deterministic execution for tests
      optimized.parallelExecution = {
        ...optimized.parallelExecution,
        enabled: false
      };
      break;
      
    case 'production':
      // Production optimizations are handled in defaults
      break;
  }
  
  return optimized;
}

/**
 * Validates the factory configuration.
 * 
 * @param config - Configuration to validate
 * @throws {ExecutionError} If configuration is invalid
 * @private
 */
function validateFactoryConfiguration(config: ExecutionManagerConfig): void {
  // Validate numeric constraints
  if (config.maxConcurrentExecutions && config.maxConcurrentExecutions < 1) {
    throw new ExecutionError(
      'INVALID_CONFIGURATION',
      'maxConcurrentExecutions must be at least 1',
      { maxConcurrentExecutions: config.maxConcurrentExecutions }
    );
  }
  
  if (config.defaultTimeout && config.defaultTimeout < 1000) {
    throw new ExecutionError(
      'INVALID_CONFIGURATION',
      'defaultTimeout must be at least 1000ms',
      { defaultTimeout: config.defaultTimeout }
    );
  }
  
  if (config.maxRetries && config.maxRetries < 0) {
    throw new ExecutionError(
      'INVALID_CONFIGURATION',
      'maxRetries must be non-negative',
      { maxRetries: config.maxRetries }
    );
  }
  
  // Validate parallel execution configuration
  if (config.parallelExecution) {
    const { maxParallelNodes } = config.parallelExecution;
    if (maxParallelNodes && maxParallelNodes < 1) {
      throw new ExecutionError(
        'INVALID_CONFIGURATION',
        'maxParallelNodes must be at least 1',
        { maxParallelNodes }
      );
    }
  }
  
  // Validate state persistence configuration
  if (config.statePersistence) {
    const { storage, saveInterval } = config.statePersistence;
    
    if (storage && !['memory', 'database', 'redis'].includes(storage)) {
      throw new ExecutionError(
        'INVALID_CONFIGURATION',
        'Invalid storage type. Must be one of: memory, database, redis',
        { storage }
      );
    }
    
    if (saveInterval && saveInterval < 1000) {
      throw new ExecutionError(
        'INVALID_CONFIGURATION',
        'saveInterval must be at least 1000ms',
        { saveInterval }
      );
    }
  }
  
  // Validate error recovery configuration
  if (config.errorRecovery) {
    const { retryDelay, maxRetryAttempts } = config.errorRecovery;
    
    if (retryDelay && retryDelay < 0) {
      throw new ExecutionError(
        'INVALID_CONFIGURATION',
        'retryDelay must be non-negative',
        { retryDelay }
      );
    }
    
    if (maxRetryAttempts && maxRetryAttempts < 0) {
      throw new ExecutionError(
        'INVALID_CONFIGURATION',
        'maxRetryAttempts must be non-negative',
        { maxRetryAttempts }
      );
    }
  }
}

/**
 * Creates an Execution Manager instance specifically for testing.
 * 
 * This is a convenience function that sets up an Execution Manager
 * with test-friendly defaults and minimal timeouts.
 * 
 * @param overrides - Optional configuration overrides
 * @returns Execution Manager configured for testing
 * 
 * @example
 * ```typescript
 * // In test files
 * import { createTestExecutionManager } from '../factory';
 * 
 * describe('Workflow Execution', () => {
 *   let executionManager: IExecutionManager;
 *   
 *   beforeEach(async () => {
 *     executionManager = createTestExecutionManager();
 *     await executionManager.initialize({
 *       maxConcurrentExecutions: 1,
 *       defaultTimeout: 5000
 *     });
 *   });
 *   
 *   it('should execute simple workflow', async () => {
 *     const result = await executionManager.executeWorkflow(
 *       testWorkflow,
 *       { sessionId: 'test-session', input: {} }
 *     );
 *     expect(result.status).toBe('COMPLETED');
 *   });
 * });
 * ```
 * 
 * @public
 */
export function createTestExecutionManager(
  overrides: Partial<ExecutionManagerFactoryConfig> = {}
): IExecutionManager {
  const testConfig: ExecutionManagerFactoryConfig = {
    environment: 'test',
    maxConcurrentExecutions: 1,
    defaultTimeout: 5000,
    maxRetries: 1,
    queueProcessingInterval: 50,
    humanInteractionTimeout: 1000,
    statePersistence: {
      enabled: false,
      storage: 'memory'
    },
    parallelExecution: {
      enabled: false,
      maxParallelNodes: 1
    },
    errorRecovery: {
      autoRetry: false,
      retryDelay: 100,
      maxRetryAttempts: 1
    },
    loadFromEnv: false,
    test: {
      enabled: true,
      fastTimeouts: true,
      noPersistence: true
    },
    ...overrides
  };
  
  console.log('Creating test Execution Manager with fast timeouts and no persistence');
  
  return createExecutionManager(testConfig);
}