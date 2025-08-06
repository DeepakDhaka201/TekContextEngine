/**
 * @fileoverview Factory function for creating Session State module instances
 * @module modules/session-state/factory
 * @requires ./session-state-module
 * @requires ./types
 * @requires ../registry/types
 * 
 * This file provides the factory function used by the Module Registry
 * to create Session State module instances with proper configuration and
 * environment-specific defaults.
 * 
 * Key concepts:
 * - Factory pattern for module instantiation
 * - Environment-specific configuration defaults
 * - Storage backend selection and validation
 * - Configuration validation and error handling
 * - Development vs production optimizations
 * 
 * @example
 * ```typescript
 * import { createSessionStateModule } from './factory';
 * 
 * const sessionState = createSessionStateModule({
 *   storage: {
 *     backend: 'redis',
 *     connection: { host: 'localhost', port: 6379 },
 *     compression: true
 *   },
 *   defaults: {
 *     maxHistoryLength: 1000,
 *     expiresIn: 24 * 60 * 60 * 1000
 *   }
 * });
 * 
 * await sessionState.initialize(config);
 * ```
 * 
 * @see session-state-module.ts for the main implementation
 * @see ../registry/factory.ts for how this is used in the registry
 * @since 1.0.0
 */

import { SessionStateModule, SessionStateConfig } from './session-state-module';
import { ISessionStateModule, SessionStorageConfig, SessionConfig } from './types';
import { SessionValidationError, SessionStorageError } from './errors';

/**
 * Configuration interface for the Session State factory.
 * 
 * Extends the module configuration with factory-specific options
 * such as environment variable resolution and development settings.
 */
interface SessionStateFactoryConfig extends Partial<SessionStateConfig> {
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
    
    /** Use memory storage for development */
    useMemoryStorage?: boolean;
    
    /** Reduced session limits for development */
    reducedLimits?: boolean;
  };
  
  /** Test-specific options */
  test?: {
    /** Enable test mode (in-memory storage) */
    enabled?: boolean;
    
    /** Use mock storage implementation */
    mockStorage?: boolean;
  };
}

/**
 * Default configuration for different environments.
 */
const DEFAULT_CONFIGS = {
  development: {
    storage: {
      backend: 'memory' as const,
      compression: false,
      encryption: false,
      options: {
        enableIndexing: false
      }
    },
    defaults: {
      maxHistoryLength: 100, // Reduced for development
      maxContextSize: 100 * 1024, // 100KB
      expiresIn: 2 * 60 * 60 * 1000, // 2 hours
      persistHistory: true,
      enableRecovery: true
    },
    options: {
      maxSessionsPerUser: 5, // Reduced for development
      cleanupInterval: 10 * 60 * 1000, // 10 minutes
      enableAnalytics: true,
      sessionCacheSize: 100 // Smaller cache
    },
    development: {
      verboseLogging: true,
      useMemoryStorage: true,
      reducedLimits: true
    }
  },
  
  test: {
    storage: {
      backend: 'memory' as const,
      compression: false,
      encryption: false,
      options: {
        enableIndexing: false
      }
    },
    defaults: {
      maxHistoryLength: 10, // Very small for tests
      maxContextSize: 10 * 1024, // 10KB
      expiresIn: 5 * 60 * 1000, // 5 minutes
      persistHistory: false, // Don't persist in tests
      enableRecovery: false
    },
    options: {
      maxSessionsPerUser: 3,
      cleanupInterval: undefined, // No automatic cleanup in tests
      enableAnalytics: false,
      sessionCacheSize: 10
    },
    test: {
      enabled: true,
      mockStorage: true
    }
  },
  
  production: {
    storage: {
      backend: 'redis' as const,
      compression: true,
      encryption: true,
      options: {
        enableIndexing: true,
        batchSize: 100,
        maxRetries: 3
      }
    },
    defaults: {
      maxHistoryLength: 1000,
      maxContextSize: 1024 * 1024, // 1MB
      expiresIn: 24 * 60 * 60 * 1000, // 24 hours
      persistHistory: true,
      enableRecovery: true
    },
    options: {
      maxSessionsPerUser: 50,
      cleanupInterval: 60 * 60 * 1000, // 1 hour
      enableAnalytics: true,
      sessionCacheSize: 1000
    }
  }
};

/**
 * Creates a Session State module instance with comprehensive configuration.
 * 
 * This factory function handles:
 * - Environment-specific configuration defaults
 * - Configuration loading from environment variables
 * - Storage backend selection and validation
 * - Development vs production optimizations
 * - Configuration validation and error handling
 * 
 * Environment variable loading:
 * - SESSION_STORAGE_BACKEND -> storage.backend
 * - REDIS_URL -> storage.connection.url
 * - REDIS_HOST -> storage.connection.host
 * - REDIS_PORT -> storage.connection.port
 * - REDIS_PASSWORD -> storage.connection.password
 * - SESSION_CACHE_SIZE -> options.sessionCacheSize
 * - Custom prefix via envPrefix option
 * 
 * @param userConfig - User-provided configuration (optional)
 * @param dependencies - Injected dependencies (unused for Session State)
 * @returns Configured Session State module instance
 * @throws {SessionValidationError} If configuration is invalid
 * @throws {SessionStorageError} If storage configuration is invalid
 * 
 * @example
 * ```typescript
 * // Minimal configuration with environment variables
 * const sessionState = createSessionStateModule();
 * 
 * // Explicit Redis configuration
 * const sessionState = createSessionStateModule({
 *   storage: {
 *     backend: 'redis',
 *     connection: {
 *       host: 'redis.example.com',
 *       port: 6379,
 *       password: 'secret'
 *     },
 *     compression: true
 *   },
 *   defaults: {
 *     maxHistoryLength: 2000,
 *     expiresIn: 48 * 60 * 60 * 1000
 *   }
 * });
 * 
 * // Development configuration
 * const sessionState = createSessionStateModule({
 *   environment: 'development',
 *   loadFromEnv: true,
 *   development: {
 *     verboseLogging: true,
 *     useMemoryStorage: true
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
export function createSessionStateModule(
  userConfig: SessionStateFactoryConfig = {},
  dependencies?: Record<string, any>
): ISessionStateModule {
  console.log('Creating Session State module with factory...');
  
  try {
    // Determine environment
    const env = getEnvironment(userConfig.environment);
    console.log(`Creating Session State module for environment: ${env}`);
    
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
    
    // Validate final configuration
    validateFactoryConfiguration(moduleConfig);
    
    console.log('✓ Session State module created successfully for', env, 'environment');
    console.log('Configuration summary:', {
      storageBackend: moduleConfig.storage?.backend,
      compression: moduleConfig.storage?.compression,
      maxSessions: moduleConfig.options?.maxSessionsPerUser,
      cacheSize: moduleConfig.options?.sessionCacheSize
    });
    
    return new SessionStateModule();
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Failed to create Session State module:', errorMessage);
    
    throw new SessionStorageError(
      'session-state',
      'factory',
      `Session State module creation failed: ${errorMessage}`,
      error instanceof Error ? error : undefined,
      {
        environment: getEnvironment(userConfig.environment),
        suggestion: 'Check configuration format and ensure storage backend is properly configured'
      }
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
function loadConfigFromEnvironment(prefix: string = 'SESSION_'): Partial<SessionStateConfig> {
  const config: Partial<SessionStateConfig> = {
    storage: {},
    defaults: {},
    options: {}
  };
  
  // Load storage backend
  const backend = process.env[`${prefix}STORAGE_BACKEND`] || process.env.SESSION_STORAGE_BACKEND;
  if (backend) {
    config.storage!.backend = backend as any;
    console.log(`✓ Loaded storage backend from environment: ${backend}`);
  }
  
  // Load Redis configuration
  const redisUrl = process.env.REDIS_URL || process.env[`${prefix}REDIS_URL`];
  if (redisUrl) {
    config.storage!.connection = { url: redisUrl };
    console.log('✓ Loaded Redis URL from environment');
  } else {
    // Load individual Redis settings
    const redisHost = process.env.REDIS_HOST || process.env[`${prefix}REDIS_HOST`];
    const redisPort = process.env.REDIS_PORT || process.env[`${prefix}REDIS_PORT`];
    const redisPassword = process.env.REDIS_PASSWORD || process.env[`${prefix}REDIS_PASSWORD`];
    const redisDb = process.env.REDIS_DB || process.env[`${prefix}REDIS_DB`];
    
    if (redisHost || redisPort || redisPassword || redisDb) {
      config.storage!.connection = {};
      
      if (redisHost) {
        config.storage!.connection.host = redisHost;
        console.log(`✓ Loaded Redis host from environment: ${redisHost}`);
      }
      
      if (redisPort) {
        config.storage!.connection.port = parseInt(redisPort, 10);
        console.log(`✓ Loaded Redis port from environment: ${redisPort}`);
      }
      
      if (redisPassword) {
        config.storage!.connection.password = redisPassword;
        console.log('✓ Loaded Redis password from environment');
      }
      
      if (redisDb) {
        config.storage!.connection.db = parseInt(redisDb, 10);
        console.log(`✓ Loaded Redis database from environment: ${redisDb}`);
      }
    }
  }
  
  // Load boolean flags
  const compression = process.env[`${prefix}COMPRESSION`];
  if (compression !== undefined) {
    config.storage!.compression = compression.toLowerCase() === 'true';
    console.log(`✓ Loaded compression setting from environment: ${config.storage!.compression}`);
  }
  
  const encryption = process.env[`${prefix}ENCRYPTION`];
  if (encryption !== undefined) {
    config.storage!.encryption = encryption.toLowerCase() === 'true';
    console.log(`✓ Loaded encryption setting from environment: ${config.storage!.encryption}`);
  }
  
  // Load numeric configuration
  const cacheSize = process.env[`${prefix}CACHE_SIZE`];
  if (cacheSize) {
    const size = parseInt(cacheSize, 10);
    if (!isNaN(size)) {
      config.options!.sessionCacheSize = size;
      console.log(`✓ Loaded cache size from environment: ${size}`);
    }
  }
  
  const maxSessions = process.env[`${prefix}MAX_SESSIONS_PER_USER`];
  if (maxSessions) {
    const max = parseInt(maxSessions, 10);
    if (!isNaN(max)) {
      config.options!.maxSessionsPerUser = max;
      console.log(`✓ Loaded max sessions per user from environment: ${max}`);
    }
  }
  
  const historyLength = process.env[`${prefix}MAX_HISTORY_LENGTH`];
  if (historyLength) {
    const length = parseInt(historyLength, 10);
    if (!isNaN(length)) {
      config.defaults!.maxHistoryLength = length;
      console.log(`✓ Loaded max history length from environment: ${length}`);
    }
  }
  
  const expiresIn = process.env[`${prefix}EXPIRES_IN`];
  if (expiresIn) {
    const expiry = parseInt(expiresIn, 10);
    if (!isNaN(expiry)) {
      config.defaults!.expiresIn = expiry;
      console.log(`✓ Loaded session expiration from environment: ${expiry}ms`);
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
function mergeConfigurations(configs: any[]): SessionStateFactoryConfig {
  let merged: SessionStateFactoryConfig = {};
  
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
 * Validates the factory configuration.
 * 
 * @param config - Configuration to validate
 * @throws {SessionValidationError} If configuration is invalid
 * @throws {SessionStorageError} If storage configuration is invalid
 * @private
 */
function validateFactoryConfiguration(config: Partial<SessionStateConfig>): void {
  // Validate storage configuration
  if (!config.storage) {
    throw new SessionValidationError(
      'factory',
      'Storage configuration is required',
      'storage',
      config.storage,
      {
        suggestion: 'Provide storage configuration with backend type and connection details'
      }
    );
  }
  
  if (!config.storage.backend) {
    throw new SessionValidationError(
      'factory',
      'Storage backend is required',
      'storage.backend',
      config.storage.backend,
      {
        suggestion: 'Specify storage backend: redis, database, file, or memory'
      }
    );
  }
  
  const validBackends = ['redis', 'database', 'file', 'memory'];
  if (!validBackends.includes(config.storage.backend)) {
    throw new SessionValidationError(
      'factory',
      `Invalid storage backend. Must be one of: ${validBackends.join(', ')}`,
      'storage.backend',
      config.storage.backend,
      {
        validOptions: validBackends,
        suggestion: 'Use a supported storage backend'
      }
    );
  }
  
  // Validate Redis-specific configuration
  if (config.storage.backend === 'redis' && config.storage.connection) {
    const conn = config.storage.connection;
    
    if (conn.port && (typeof conn.port !== 'number' || conn.port < 1 || conn.port > 65535)) {
      throw new SessionStorageError(
        'redis',
        'config',
        'Redis port must be a number between 1 and 65535',
        undefined,
        { port: conn.port }
      );
    }
    
    if (conn.db && (typeof conn.db !== 'number' || conn.db < 0 || conn.db > 15)) {
      throw new SessionStorageError(
        'redis',
        'config',
        'Redis database must be a number between 0 and 15',
        undefined,
        { db: conn.db }
      );
    }
  }
  
  // Validate defaults
  if (config.defaults) {
    if (config.defaults.maxHistoryLength && config.defaults.maxHistoryLength < 1) {
      throw new SessionValidationError(
        'factory',
        'Max history length must be at least 1',
        'defaults.maxHistoryLength',
        config.defaults.maxHistoryLength
      );
    }
    
    if (config.defaults.maxContextSize && config.defaults.maxContextSize < 1024) {
      throw new SessionValidationError(
        'factory',
        'Max context size must be at least 1024 bytes',
        'defaults.maxContextSize',
        config.defaults.maxContextSize
      );
    }
    
    if (config.defaults.expiresIn && config.defaults.expiresIn < 60000) {
      throw new SessionValidationError(
        'factory',
        'Session expiration must be at least 60 seconds',
        'defaults.expiresIn',
        config.defaults.expiresIn
      );
    }
  }
  
  // Validate options
  if (config.options) {
    if (config.options.maxSessionsPerUser && config.options.maxSessionsPerUser < 1) {
      throw new SessionValidationError(
        'factory',
        'Max sessions per user must be at least 1',
        'options.maxSessionsPerUser',
        config.options.maxSessionsPerUser
      );
    }
    
    if (config.options.sessionCacheSize && config.options.sessionCacheSize < 10) {
      throw new SessionValidationError(
        'factory',
        'Session cache size must be at least 10',
        'options.sessionCacheSize',
        config.options.sessionCacheSize
      );
    }
    
    if (config.options.cleanupInterval && config.options.cleanupInterval < 60000) {
      throw new SessionValidationError(
        'factory',
        'Cleanup interval must be at least 60 seconds',
        'options.cleanupInterval',
        config.options.cleanupInterval
      );
    }
  }
}

/**
 * Creates a Session State module instance specifically for testing.
 * 
 * This is a convenience function that sets up a Session State module
 * with test-friendly defaults and in-memory storage.
 * 
 * @param overrides - Optional configuration overrides
 * @returns Session State module configured for testing
 * 
 * @example
 * ```typescript
 * // In test files
 * import { createTestSessionStateModule } from '../factory';
 * 
 * describe('Session Management', () => {
 *   let sessionState: ISessionStateModule;
 *   
 *   beforeEach(async () => {
 *     sessionState = createTestSessionStateModule();
 *     await sessionState.initialize({
 *       storage: { backend: 'memory' },
 *       defaults: { maxHistoryLength: 10 }
 *     });
 *   });
 *   
 *   it('should create and retrieve sessions', async () => {
 *     const session = await sessionState.createSession({
 *       userId: 'test-user',
 *       title: 'Test Session'
 *     });
 *     
 *     const retrieved = await sessionState.getSession(session.id);
 *     expect(retrieved).toBeTruthy();
 *   });
 * });
 * ```
 * 
 * @public
 */
export function createTestSessionStateModule(
  overrides: Partial<SessionStateFactoryConfig> = {}
): ISessionStateModule {
  const testConfig: SessionStateFactoryConfig = {
    environment: 'test',
    storage: {
      backend: 'memory',
      compression: false,
      encryption: false
    },
    defaults: {
      maxHistoryLength: 10,
      maxContextSize: 10 * 1024, // 10KB
      expiresIn: 5 * 60 * 1000, // 5 minutes
      persistHistory: false,
      enableRecovery: false
    },
    options: {
      maxSessionsPerUser: 3,
      cleanupInterval: undefined,
      enableAnalytics: false,
      sessionCacheSize: 10
    },
    loadFromEnv: false,
    test: {
      enabled: true,
      mockStorage: true
    },
    ...overrides
  };
  
  console.log('Creating test Session State module with in-memory storage');
  
  return createSessionStateModule(testConfig);
}