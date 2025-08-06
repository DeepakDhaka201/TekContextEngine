/**
 * @fileoverview Factory function for creating Langfuse module instances
 * @module modules/langfuse/factory
 * @requires ./langfuse-module
 * @requires ./types
 * @requires ../registry/types
 * 
 * This file provides the factory function used by the Module Registry
 * to create Langfuse module instances with proper configuration and
 * environment-specific defaults.
 * 
 * Key concepts:
 * - Factory pattern for module instantiation
 * - Environment-specific configuration defaults
 * - Configuration validation and error handling
 * - Development vs production configuration
 * - Test-friendly module creation
 * 
 * @example
 * ```typescript
 * import { createLangfuseModule } from './factory';
 * 
 * const langfuse = createLangfuseModule({
 *   publicKey: process.env.LANGFUSE_PUBLIC_KEY!,
 *   secretKey: process.env.LANGFUSE_SECRET_KEY!,
 *   enabled: true
 * });
 * 
 * await langfuse.initialize(config);
 * ```
 * 
 * @see langfuse-module.ts for the main implementation
 * @see ../registry/factory.ts for how this is used in the registry
 * @since 1.0.0
 */

import { LangfuseModule } from './langfuse-module';
import { ILangfuseModule, LangfuseConfig } from './types';
import { LangfuseConfigurationError } from './errors';

/**
 * Configuration interface for the Langfuse factory.
 * 
 * Extends the module configuration with factory-specific options
 * such as environment variable resolution and development settings.
 */
interface LangfuseFactoryConfig extends Partial<LangfuseConfig> {
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
    
    /** Use reduced sampling for development */
    developmentSampling?: boolean;
  };
  
  /** Test-specific options */
  test?: {
    /** Enable test mode (no-op implementation) */
    enabled?: boolean;
    
    /** Mock prompt responses */
    mockPrompts?: boolean;
  };
}

/**
 * Default configuration for different environments.
 */
const DEFAULT_CONFIGS = {
  development: {
    enabled: true,
    maskSensitiveData: true,
    samplingRate: 0.1, // Lower sampling in development
    flushInterval: 5000, // Faster flushing for immediate feedback
    flushAt: 5, // Smaller batches
    timeout: 10000,
    redactPatterns: [
      // Common development patterns
      /localhost:\d+/g,
      /127\.0\.0\.1:\d+/g,
      /dev-[a-zA-Z0-9-]+/g
    ],
    development: {
      verboseLogging: true,
      developmentSampling: true
    }
  },
  
  test: {
    enabled: false, // Disabled by default for tests unless explicitly enabled
    maskSensitiveData: true,
    samplingRate: 0, // No sampling in tests for predictability
    flushInterval: 1000, // Fast flushing for tests
    flushAt: 1, // Immediate flushing
    timeout: 5000, // Shorter timeout for tests
    test: {
      enabled: false,
      mockPrompts: true
    }
  },
  
  production: {
    enabled: true,
    maskSensitiveData: true,
    samplingRate: 1.0, // Full sampling in production
    flushInterval: 10000, // Standard flushing
    flushAt: 15, // Standard batch size
    timeout: 30000, // Generous timeout
    redactPatterns: [
      // Production-specific patterns
      /prod-[a-zA-Z0-9-]+/g,
      /[a-zA-Z0-9-]+\.production\./g
    ]
  }
};

/**
 * Creates a Langfuse module instance with comprehensive configuration.
 * 
 * This factory function handles:
 * - Environment-specific configuration defaults
 * - Configuration loading from environment variables
 * - Configuration validation and error handling
 * - Development vs production optimizations
 * - Test-friendly configuration
 * 
 * Environment variable loading:
 * - LANGFUSE_PUBLIC_KEY -> publicKey
 * - LANGFUSE_SECRET_KEY -> secretKey
 * - LANGFUSE_BASE_URL -> baseUrl
 * - LANGFUSE_ENABLED -> enabled (boolean)
 * - Custom prefix via envPrefix option
 * 
 * @param userConfig - User-provided configuration (optional)
 * @param dependencies - Injected dependencies (unused for Langfuse)
 * @returns Configured Langfuse module instance
 * @throws {LangfuseConfigurationError} If configuration is invalid
 * 
 * @example
 * ```typescript
 * // Minimal configuration with environment variables
 * const langfuse = createLangfuseModule();
 * 
 * // Explicit configuration
 * const langfuse = createLangfuseModule({
 *   publicKey: 'pk_...',
 *   secretKey: 'sk_...',
 *   enabled: true,
 *   maskSensitiveData: true,
 *   samplingRate: 0.5
 * });
 * 
 * // Development configuration
 * const langfuse = createLangfuseModule({
 *   environment: 'development',
 *   loadFromEnv: true,
 *   development: {
 *     verboseLogging: true,
 *     developmentSampling: true
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
export function createLangfuseModule(
  userConfig: LangfuseFactoryConfig = {},
  dependencies?: Record<string, any>
): ILangfuseModule {
  console.log('Creating Langfuse module with factory...');
  
  try {
    // Determine environment
    const env = getEnvironment(userConfig.environment);
    console.log(`Creating Langfuse module for environment: ${env}`);
    
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
    
    console.log(`✓ Langfuse module created successfully for ${env} environment`);
    console.log('Configuration summary:', {
      enabled: moduleConfig.enabled,
      maskSensitiveData: moduleConfig.maskSensitiveData,
      samplingRate: moduleConfig.samplingRate,
      baseUrl: moduleConfig.baseUrl || 'https://cloud.langfuse.com'
    });
    
    return new LangfuseModule();
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Failed to create Langfuse module:', errorMessage);
    
    throw new LangfuseConfigurationError(
      `Langfuse module creation failed: ${errorMessage}`,
      'factory',
      userConfig,
      {
        environment: getEnvironment(userConfig.environment),
        suggestion: 'Check configuration format and ensure required environment variables are set'
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
function loadConfigFromEnvironment(prefix: string = 'LANGFUSE_'): Partial<LangfuseConfig> {
  const config: Partial<LangfuseConfig> = {};
  
  // Load required keys
  const publicKey = process.env[`${prefix}PUBLIC_KEY`] || process.env.LANGFUSE_PUBLIC_KEY;
  const secretKey = process.env[`${prefix}SECRET_KEY`] || process.env.LANGFUSE_SECRET_KEY;
  
  if (publicKey) {
    config.publicKey = publicKey;
    console.log('✓ Loaded Langfuse public key from environment');
  }
  
  if (secretKey) {
    config.secretKey = secretKey;
    console.log('✓ Loaded Langfuse secret key from environment');
  }
  
  // Load optional configuration
  const baseUrl = process.env[`${prefix}BASE_URL`] || process.env.LANGFUSE_BASE_URL;
  if (baseUrl) {
    config.baseUrl = baseUrl;
    console.log(`✓ Loaded Langfuse base URL from environment: ${baseUrl}`);
  }
  
  // Load boolean flags
  const enabled = process.env[`${prefix}ENABLED`] || process.env.LANGFUSE_ENABLED;
  if (enabled !== undefined) {
    config.enabled = enabled.toLowerCase() === 'true';
    console.log(`✓ Loaded Langfuse enabled flag from environment: ${config.enabled}`);
  }
  
  const maskSensitive = process.env[`${prefix}MASK_SENSITIVE`];
  if (maskSensitive !== undefined) {
    config.maskSensitiveData = maskSensitive.toLowerCase() === 'true';
  }
  
  // Load numeric configuration
  const samplingRate = process.env[`${prefix}SAMPLING_RATE`];
  if (samplingRate) {
    const rate = parseFloat(samplingRate);
    if (!isNaN(rate)) {
      config.samplingRate = rate;
      console.log(`✓ Loaded sampling rate from environment: ${rate}`);
    }
  }
  
  const flushInterval = process.env[`${prefix}FLUSH_INTERVAL`];
  if (flushInterval) {
    const interval = parseInt(flushInterval, 10);
    if (!isNaN(interval)) {
      config.flushInterval = interval;
    }
  }
  
  const flushAt = process.env[`${prefix}FLUSH_AT`];
  if (flushAt) {
    const batchSize = parseInt(flushAt, 10);
    if (!isNaN(batchSize)) {
      config.flushAt = batchSize;
    }
  }
  
  const timeout = process.env[`${prefix}TIMEOUT`];
  if (timeout) {
    const timeoutMs = parseInt(timeout, 10);
    if (!isNaN(timeoutMs)) {
      config.timeout = timeoutMs;
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
function mergeConfigurations(configs: any[]): LangfuseFactoryConfig {
  let merged: LangfuseFactoryConfig = {};
  
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
 * @throws {LangfuseConfigurationError} If configuration is invalid
 * @private
 */
function validateFactoryConfiguration(config: Partial<LangfuseConfig>): void {
  // Only validate if enabled
  if (config.enabled === false) {
    console.log('Langfuse disabled, skipping configuration validation');
    return;
  }
  
  // Check for required keys only if we expect to use Langfuse
  if (config.enabled !== false) {
    if (!config.publicKey) {
      throw new LangfuseConfigurationError(
        'Langfuse public key is required when enabled. Set LANGFUSE_PUBLIC_KEY environment variable or provide publicKey in configuration.',
        'publicKey',
        config.publicKey,
        {
          suggestion: 'Set LANGFUSE_PUBLIC_KEY environment variable or set enabled: false to disable tracing'
        }
      );
    }
    
    if (!config.secretKey) {
      throw new LangfuseConfigurationError(
        'Langfuse secret key is required when enabled. Set LANGFUSE_SECRET_KEY environment variable or provide secretKey in configuration.',
        'secretKey',
        config.secretKey,
        {
          suggestion: 'Set LANGFUSE_SECRET_KEY environment variable or set enabled: false to disable tracing'
        }
      );
    }
  }
  
  // Validate optional fields if present
  if (config.samplingRate !== undefined) {
    if (config.samplingRate < 0 || config.samplingRate > 1) {
      throw new LangfuseConfigurationError(
        'Sampling rate must be between 0 and 1',
        'samplingRate',
        config.samplingRate
      );
    }
  }
  
  if (config.flushInterval !== undefined) {
    if (config.flushInterval < 1000) {
      throw new LangfuseConfigurationError(
        'Flush interval must be at least 1000ms',
        'flushInterval',
        config.flushInterval
      );
    }
  }
  
  if (config.flushAt !== undefined) {
    if (config.flushAt < 1) {
      throw new LangfuseConfigurationError(
        'Flush batch size must be at least 1',
        'flushAt',
        config.flushAt
      );
    }
  }
  
  if (config.timeout !== undefined) {
    if (config.timeout < 1000) {
      throw new LangfuseConfigurationError(
        'Timeout must be at least 1000ms',
        'timeout',
        config.timeout
      );
    }
  }
}

/**
 * Creates a Langfuse module instance specifically for testing.
 * 
 * This is a convenience function that sets up a Langfuse module
 * with test-friendly defaults and no-op behavior.
 * 
 * @param overrides - Optional configuration overrides
 * @returns Langfuse module configured for testing
 * 
 * @example
 * ```typescript
 * // In test files
 * import { createTestLangfuseModule } from '../factory';
 * 
 * describe('Agent Tracing', () => {
 *   let langfuse: ILangfuseModule;
 *   
 *   beforeEach(async () => {
 *     langfuse = createTestLangfuseModule();
 *     await langfuse.initialize({
 *       publicKey: 'pk_test',
 *       secretKey: 'sk_test',
 *       enabled: false // No-op for tests
 *     });
 *   });
 *   
 *   it('should handle tracing without errors', async () => {
 *     const trace = langfuse.startTrace({ name: 'test-trace' });
 *     const span = trace.span({ name: 'test-span' });
 *     span.end();
 *   });
 * });
 * ```
 * 
 * @public
 */
export function createTestLangfuseModule(
  overrides: Partial<LangfuseFactoryConfig> = {}
): ILangfuseModule {
  const testConfig: LangfuseFactoryConfig = {
    environment: 'test',
    enabled: false, // Disabled by default for tests
    maskSensitiveData: true,
    samplingRate: 0,
    flushInterval: 1000,
    flushAt: 1,
    timeout: 5000,
    loadFromEnv: false,
    test: {
      enabled: false,
      mockPrompts: true
    },
    ...overrides
  };
  
  console.log('Creating test Langfuse module with no-op behavior');
  
  return createLangfuseModule(testConfig);
}