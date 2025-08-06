/**
 * @fileoverview Factory function for creating LiteLLM module instances
 * @module modules/litellm/factory
 * @requires ./litellm-module
 * @requires ./types
 * @requires ../registry/types
 * 
 * This file provides the factory function used by the Module Registry
 * to create LiteLLM module instances with proper configuration and
 * dependency injection.
 * 
 * Key concepts:
 * - Factory pattern for module instantiation
 * - Configuration merging with environment variables
 * - Dependency injection support
 * - Error handling during creation
 * - Development vs production configuration
 * 
 * @example
 * ```typescript
 * import { createLiteLLMModule } from './factory';
 * 
 * const litellm = createLiteLLMModule({
 *   providers: {
 *     openai: { api_key: process.env.OPENAI_API_KEY! }
 *   }
 * });
 * 
 * await litellm.initialize();
 * ```
 * 
 * @see litellm-module.ts for the main implementation
 * @see ../registry/factory.ts for how this is used in the registry
 * @since 1.0.0
 */

import { LiteLLMModule } from './litellm-module';
import { ILiteLLMModule, ProviderConfig } from './types';
import { LLMConfigurationError } from './errors';

/**
 * Configuration interface for the LiteLLM factory.
 * 
 * Extends the module configuration with factory-specific options
 * such as environment variable resolution and development settings.
 */
interface LiteLLMFactoryConfig {
  /** Provider configurations */
  providers?: Record<string, Partial<ProviderConfig>>;
  
  /** Routing and fallback configuration */
  routing?: {
    fallback_models?: string[];
    load_balancing?: boolean;
    preferred_providers?: string[];
    model_routing?: Record<string, string[]>;
  };
  
  /** Budget and cost management */
  budget?: {
    daily_limit?: number;
    monthly_limit?: number;
    user_limit?: number;
    model_limits?: Record<string, number>;
    alert_thresholds?: number[];
    alert_webhook?: string;
    hard_limit?: boolean;
    grace_period?: number;
  };
  
  /** Rate limiting configuration */
  rate_limits?: {
    requests_per_minute?: number;
    tokens_per_minute?: number;
    concurrent_requests?: number;
  };
  
  /** Caching configuration */
  cache?: {
    enabled?: boolean;
    ttl?: number;
    max_entries?: number;
    storage?: 'memory' | 'redis';
  };
  
  /** Monitoring and analytics */
  monitoring?: {
    enabled?: boolean;
    track_costs?: boolean;
    track_performance?: boolean;
    webhook_url?: string;
  };
  
  /** Default request options */
  defaults?: {
    timeout?: number;
    max_retries?: number;
    temperature?: number;
    max_tokens?: number;
  };
  
  /** Environment variable configuration */
  env?: {
    /** Whether to load API keys from environment variables */
    load_from_env?: boolean;
    /** Custom environment variable prefix */
    env_prefix?: string;
  };
  
  /** Development configuration */
  development?: {
    /** Enable mock providers for development */
    use_mocks?: boolean;
    /** Mock response delay (ms) */
    mock_delay?: number;
    /** Enable verbose logging */
    verbose_logging?: boolean;
  };
}

/**
 * Default configuration for different environments.
 */
const DEFAULT_CONFIGS = {
  development: {
    cache: {
      enabled: false,    // Disable cache in development for fresh responses
      ttl: 60000        // Short TTL if enabled
    },
    monitoring: {
      enabled: true,
      track_costs: true,
      track_performance: true
    },
    rate_limits: {
      requests_per_minute: 100,  // Lower limits for development
      concurrent_requests: 5
    },
    defaults: {
      timeout: 15000,    // Shorter timeout for faster feedback
      max_retries: 2,    // Fewer retries in development
      temperature: 0.7
    },
    development: {
      use_mocks: false,  // Use real providers by default
      mock_delay: 100,   // Fast mock responses
      verbose_logging: true
    },
    env: {
      load_from_env: true,
      env_prefix: 'LITELLM_'
    }
  },
  
  test: {
    cache: {
      enabled: false     // Never cache in tests
    },
    monitoring: {
      enabled: false     // Disable monitoring in tests
    },
    rate_limits: {
      requests_per_minute: 1000,  // High limits for tests
      concurrent_requests: 20
    },
    defaults: {
      timeout: 5000,     // Fast timeout for tests
      max_retries: 1,    // Single retry in tests
      temperature: 0.0   // Deterministic responses in tests
    },
    development: {
      use_mocks: true,   // Always use mocks in tests
      mock_delay: 0,     // Instant mock responses
      verbose_logging: false
    },
    env: {
      load_from_env: false  // Don't load from env in tests
    }
  },
  
  production: {
    cache: {
      enabled: true,
      ttl: 300000,       // 5 minute cache
      max_entries: 10000,
      storage: 'redis'
    },
    monitoring: {
      enabled: true,
      track_costs: true,
      track_performance: true
    },
    rate_limits: {
      requests_per_minute: 3000,  // Production limits
      tokens_per_minute: 150000,
      concurrent_requests: 50
    },
    defaults: {
      timeout: 30000,    // Generous timeout for production
      max_retries: 3,    // Standard retries
      temperature: 1.0
    },
    development: {
      use_mocks: false,  // Never use mocks in production
      verbose_logging: false
    },
    env: {
      load_from_env: true,
      env_prefix: 'LITELLM_'
    }
  }
};

/**
 * Creates a LiteLLM module instance with comprehensive configuration.
 * 
 * This factory function handles:
 * - Environment-specific configuration defaults
 * - API key resolution from environment variables
 * - Provider discovery and validation
 * - Mock provider setup for development/testing
 * - Configuration validation and error handling
 * 
 * Environment variable loading:
 * - OPENAI_API_KEY -> providers.openai.api_key
 * - ANTHROPIC_API_KEY -> providers.anthropic.api_key
 * - GOOGLE_API_KEY -> providers.google.api_key
 * - COHERE_API_KEY -> providers.cohere.api_key
 * - Custom prefix via env.env_prefix
 * 
 * @param userConfig - User-provided configuration (optional)
 * @param dependencies - Injected dependencies (unused for LiteLLM)
 * @returns Configured LiteLLM module instance
 * @throws {LLMConfigurationError} If configuration is invalid
 * 
 * @example
 * ```typescript
 * // Minimal configuration with environment variables
 * const litellm = createLiteLLMModule();
 * 
 * // Explicit provider configuration
 * const litellm = createLiteLLMModule({
 *   providers: {
 *     openai: {
 *       api_key: 'sk-...',
 *       organization: 'org-...'
 *     },
 *     anthropic: {
 *       api_key: 'sk-ant-...'
 *     }
 *   },
 *   routing: {
 *     fallback_models: ['gpt-4', 'claude-3-opus'],
 *     load_balancing: true
 *   },
 *   budget: {
 *     daily_limit: 100,
 *     alert_thresholds: [75, 90]
 *   }
 * });
 * 
 * // Development configuration with mocks
 * const litellm = createLiteLLMModule({
 *   development: {
 *     use_mocks: true,
 *     verbose_logging: true
 *   }
 * });
 * ```
 * 
 * Configuration precedence (highest to lowest):
 * 1. User-provided configuration
 * 2. Environment variables (if env.load_from_env is true)
 * 3. Environment-specific defaults
 * 4. Base defaults
 * 
 * @public
 */
export function createLiteLLMModule(
  userConfig: LiteLLMFactoryConfig = {},
  dependencies?: Record<string, any>
): ILiteLLMModule {
  console.log('Creating LiteLLM module with factory...');
  
  try {
    // Determine environment
    const env = getEnvironment();
    console.log(`Creating LiteLLM module for environment: ${env}`);
    
    // Get environment-specific defaults
    const envDefaults = DEFAULT_CONFIGS[env];
    
    // Load configuration from environment variables if enabled
    const envConfig = (userConfig.env?.load_from_env !== false) 
      ? loadConfigFromEnvironment(userConfig.env?.env_prefix)
      : {};
    
    // Merge configurations with proper precedence
    const fullConfig = mergeConfigurations([
      envDefaults,     // Environment defaults (lowest priority)
      envConfig,       // Environment variables
      userConfig       // User config (highest priority)
    ]);
    
    // Validate final configuration
    validateConfiguration(fullConfig);
    
    // Create providers configuration
    const providersConfig = buildProvidersConfig(fullConfig, env);
    
    // Create the module instance
    const moduleConfig = {
      providers: providersConfig,
      routing: fullConfig.routing,
      budget: fullConfig.budget,
      rate_limits: fullConfig.rate_limits,
      cache: fullConfig.cache,
      monitoring: fullConfig.monitoring,
      defaults: fullConfig.defaults
    };
    
    const module = new LiteLLMModule(moduleConfig);
    
    console.log(`✓ LiteLLM module created successfully with ${Object.keys(providersConfig).length} providers`);
    
    return module;
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Failed to create LiteLLM module:', errorMessage);
    
    throw new LLMConfigurationError(
      `LiteLLM module creation failed: ${errorMessage}`,
      'factory',
      userConfig,
      {
        environment: getEnvironment(),
        suggestion: 'Check configuration format and ensure required environment variables are set'
      }
    );
  }
}

/**
 * Determines the current environment.
 * 
 * @returns Environment string ('development', 'test', or 'production')
 * @private
 */
function getEnvironment(): 'development' | 'test' | 'production' {
  if (process.env.NODE_ENV === 'test') return 'test';
  if (process.env.NODE_ENV === 'development') return 'development';
  return 'production';
}

/**
 * Loads configuration from environment variables.
 * 
 * Looks for common LLM provider API keys and other configuration
 * in environment variables.
 * 
 * @param prefix - Custom environment variable prefix
 * @returns Configuration object from environment
 * @private
 */
function loadConfigFromEnvironment(prefix: string = 'LITELLM_'): LiteLLMFactoryConfig {
  const config: LiteLLMFactoryConfig = {
    providers: {}
  };
  
  // Load common provider API keys
  const providerMappings = [
    { env: 'OPENAI_API_KEY', provider: 'openai' },
    { env: 'ANTHROPIC_API_KEY', provider: 'anthropic' },
    { env: 'GOOGLE_API_KEY', provider: 'google' },
    { env: 'COHERE_API_KEY', provider: 'cohere' },
    { env: 'HUGGINGFACE_API_TOKEN', provider: 'huggingface' },
    { env: 'REPLICATE_API_TOKEN', provider: 'replicate' },
    { env: 'AZURE_API_KEY', provider: 'azure' }
  ];
  
  for (const { env, provider } of providerMappings) {
    const apiKey = process.env[env];
    if (apiKey) {
      config.providers![provider] = {
        name: provider,
        api_key: apiKey,
        enabled: true
      };
      console.log(`✓ Loaded ${provider} configuration from ${env}`);
    }
  }
  
  // Load budget configuration from environment
  const dailyLimit = process.env[`${prefix}DAILY_BUDGET`];
  if (dailyLimit) {
    config.budget = {
      daily_limit: parseFloat(dailyLimit)
    };
  }
  
  const monthlyLimit = process.env[`${prefix}MONTHLY_BUDGET`];
  if (monthlyLimit) {
    config.budget = {
      ...config.budget,
      monthly_limit: parseFloat(monthlyLimit)
    };
  }
  
  // Load rate limiting from environment
  const requestsPerMinute = process.env[`${prefix}REQUESTS_PER_MINUTE`];
  if (requestsPerMinute) {
    config.rate_limits = {
      requests_per_minute: parseInt(requestsPerMinute, 10)
    };
  }
  
  // Load monitoring configuration
  const webhookUrl = process.env[`${prefix}WEBHOOK_URL`];
  if (webhookUrl) {
    config.monitoring = {
      enabled: true,
      webhook_url: webhookUrl
    };
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
function mergeConfigurations(configs: LiteLLMFactoryConfig[]): LiteLLMFactoryConfig {
  let merged: LiteLLMFactoryConfig = {};
  
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
 * Validates the final configuration before creating the module.
 * 
 * @param config - Configuration to validate
 * @throws {LLMConfigurationError} If configuration is invalid
 * @private
 */
function validateConfiguration(config: LiteLLMFactoryConfig): void {
  // Check if we have at least one provider configured
  if (!config.providers || Object.keys(config.providers).length === 0) {
    throw new LLMConfigurationError(
      'At least one LLM provider must be configured',
      'providers',
      config.providers,
      {
        suggestion: 'Set environment variables like OPENAI_API_KEY or configure providers explicitly',
        availableProviders: ['openai', 'anthropic', 'google', 'cohere', 'huggingface']
      }
    );
  }
  
  // Validate provider configurations
  for (const [name, provider] of Object.entries(config.providers)) {
    if (!provider?.api_key && !config.development?.use_mocks) {
      throw new LLMConfigurationError(
        `API key required for provider '${name}'`,
        'api_key',
        provider?.api_key,
        {
          provider: name,
          suggestion: `Set ${name.toUpperCase()}_API_KEY environment variable or configure explicitly`
        }
      );
    }
  }
  
  // Validate budget configuration if present
  if (config.budget) {
    const { daily_limit, monthly_limit } = config.budget;
    
    if (daily_limit !== undefined && daily_limit <= 0) {
      throw new LLMConfigurationError(
        'Daily budget limit must be positive',
        'daily_limit',
        daily_limit
      );
    }
    
    if (monthly_limit !== undefined && monthly_limit <= 0) {
      throw new LLMConfigurationError(
        'Monthly budget limit must be positive',
        'monthly_limit',
        monthly_limit
      );
    }
    
    if (daily_limit && monthly_limit && daily_limit * 31 > monthly_limit) {
      console.warn('Daily budget limit seems high compared to monthly limit');
    }
  }
  
  // Validate rate limits
  if (config.rate_limits) {
    const { requests_per_minute, tokens_per_minute } = config.rate_limits;
    
    if (requests_per_minute !== undefined && requests_per_minute <= 0) {
      throw new LLMConfigurationError(
        'Requests per minute must be positive',
        'requests_per_minute',
        requests_per_minute
      );
    }
    
    if (tokens_per_minute !== undefined && tokens_per_minute <= 0) {
      throw new LLMConfigurationError(
        'Tokens per minute must be positive',
        'tokens_per_minute',
        tokens_per_minute
      );
    }
  }
}

/**
 * Builds the final providers configuration for the module.
 * 
 * Handles provider-specific configuration, mock setup for development,
 * and provider priority ordering.
 * 
 * @param config - Full configuration
 * @param environment - Current environment
 * @returns Providers configuration
 * @private
 */
function buildProvidersConfig(
  config: LiteLLMFactoryConfig,
  environment: string
): Record<string, ProviderConfig> {
  const providers: Record<string, ProviderConfig> = {};
  
  if (config.development?.use_mocks) {
    console.log('Setting up mock providers for development/testing');
    
    // Create mock providers for common LLM services
    const mockProviders = ['openai', 'anthropic', 'google'];
    
    for (const providerName of mockProviders) {
      providers[providerName] = {
        name: providerName,
        api_key: 'mock-key',
        enabled: true,
        priority: 1,
        retry_config: {
          max_attempts: 1,
          backoff_factor: 1.0,
          max_delay: 1000
        },
        health_check: {
          enabled: false  // Disable health checks for mocks
        }
      };
    }
    
  } else {
    // Build real provider configurations
    for (const [name, providerConfig] of Object.entries(config.providers || {})) {
      if (!providerConfig?.api_key) {
        console.warn(`Skipping provider '${name}' - no API key provided`);
        continue;
      }
      
      providers[name] = {
        name,
        api_key: providerConfig.api_key,
        base_url: providerConfig.base_url,
        api_version: providerConfig.api_version,
        organization: providerConfig.organization,
        enabled: providerConfig.enabled !== false,
        priority: providerConfig.priority || 1,
        rate_limits: {
          requests_per_minute: providerConfig.rate_limits?.requests_per_minute || 1000,
          tokens_per_minute: providerConfig.rate_limits?.tokens_per_minute || 50000,
          ...providerConfig.rate_limits
        },
        retry_config: {
          max_attempts: environment === 'production' ? 3 : 2,
          backoff_factor: 2.0,
          max_delay: 30000,
          ...providerConfig.retry_config
        },
        health_check: {
          enabled: environment === 'production',
          interval: 60000, // 1 minute
          timeout: 10000,  // 10 seconds
          ...providerConfig.health_check
        }
      };
    }
  }
  
  // Sort providers by priority (higher priority first)
  const sortedProviders: Record<string, ProviderConfig> = {};
  const providerEntries = Object.entries(providers)
    .sort(([, a], [, b]) => (b.priority || 0) - (a.priority || 0));
  
  for (const [name, provider] of providerEntries) {
    sortedProviders[name] = provider;
  }
  
  console.log(`Built configuration for ${Object.keys(sortedProviders).length} providers`);
  
  return sortedProviders;
}

/**
 * Creates a LiteLLM module instance specifically for testing.
 * 
 * This is a convenience function that sets up a LiteLLM module
 * with test-friendly defaults and mock providers.
 * 
 * @param overrides - Optional configuration overrides
 * @returns LiteLLM module configured for testing
 * 
 * @example
 * ```typescript
 * // In test files
 * import { createTestLiteLLMModule } from '../factory';
 * 
 * describe('LLM Integration', () => {
 *   let litellm: ILiteLLMModule;
 *   
 *   beforeEach(async () => {
 *     litellm = createTestLiteLLMModule();
 *     await litellm.initialize();
 *   });
 *   
 *   it('should complete chat requests', async () => {
 *     const response = await litellm.complete({
 *       model: 'gpt-4',
 *       messages: [{ role: 'user', content: 'Hello' }]
 *     });
 *     expect(response.choices[0].message.content).toBeDefined();
 *   });
 * });
 * ```
 * 
 * @public
 */
export function createTestLiteLLMModule(
  overrides: Partial<LiteLLMFactoryConfig> = {}
): ILiteLLMModule {
  const testConfig: LiteLLMFactoryConfig = {
    development: {
      use_mocks: true,
      mock_delay: 0,
      verbose_logging: false
    },
    cache: {
      enabled: false
    },
    monitoring: {
      enabled: false
    },
    rate_limits: {
      requests_per_minute: 10000,
      concurrent_requests: 100
    },
    defaults: {
      timeout: 5000,
      max_retries: 0,
      temperature: 0.0
    },
    env: {
      load_from_env: false
    },
    ...overrides
  };
  
  return createLiteLLMModule(testConfig);
}