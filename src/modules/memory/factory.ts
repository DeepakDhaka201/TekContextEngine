/**
 * @fileoverview Factory function for creating Enhanced Memory Module instances
 * @module modules/memory/factory
 * @requires ./memory-module
 * @requires ./types
 * @requires ../registry/types
 * 
 * This file provides the factory function used by the Module Registry
 * to create Enhanced Memory Module instances with proper configuration and
 * environment-specific defaults.
 * 
 * Key concepts:
 * - Factory pattern for module instantiation
 * - Environment-specific configuration defaults
 * - Vector store selection and validation
 * - Configuration validation and error handling
 * - Development vs production optimizations
 * 
 * @example
 * ```typescript
 * import { createMemoryModule } from './factory';
 * 
 * const memory = createMemoryModule({
 *   workingMemory: {
 *     type: 'memory',
 *     bufferTypes: ['window', 'summary'],
 *     maxItems: 500
 *   },
 *   vectorStore: {
 *     type: 'memory',
 *     config: { maxVectors: 10000 }
 *   },
 *   embedding: {
 *     provider: 'openai',
 *     model: 'text-embedding-ada-002'
 *   }
 * });
 * 
 * await memory.initialize(config);
 * ```
 * 
 * @see memory-module.ts for the main implementation
 * @see ../registry/factory.ts for how this is used in the registry
 * @since 1.0.0
 */

import { MemoryModule } from './memory-module';
import { IMemoryModule, MemoryConfig } from './types';
import { MemoryError, MemoryValidationError } from './errors';

/**
 * Configuration interface for the Memory Module factory.
 * 
 * Extends the module configuration with factory-specific options
 * such as environment variable resolution and development settings.
 */
interface MemoryFactoryConfig extends Partial<MemoryConfig> {
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
    
    /** Use in-memory storage for development */
    useMemoryStorage?: boolean;
    
    /** Reduced limits for development */
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
    workingMemory: {
      type: 'memory' as const,
      maxItems: 100,
      ttl: 2 * 60 * 60 * 1000, // 2 hours
      compressionThreshold: 50,
      bufferTypes: ['window', 'summary'] as const,
      windowSize: 20,
      summaryThreshold: 15,
      conversationLimit: 50
    },
    longTermMemory: {
      type: 'postgres' as const,
      connectionString: process.env.DATABASE_URL
    },
    vectorStore: {
      type: 'memory' as const,
      config: { maxVectors: 1000 }
    },
    embedding: {
      provider: 'openai' as const,
      model: 'text-embedding-ada-002',
      dimensions: 1536,
      batchSize: 50
    },
    processing: {
      summarizationModel: 'gpt-3.5-turbo',
      summarizationThreshold: 50,
      consolidationInterval: 30 * 60 * 1000, // 30 minutes
      importanceScoring: true,
      runtimeStateEnabled: true,
      formDataEnabled: true,
      reasoningChains: true,
      humanInteractionHistory: true,
      variableResolution: true,
      consolidationThreshold: 20
    }
  },
  
  test: {
    workingMemory: {
      type: 'memory' as const,
      maxItems: 10,
      ttl: 5 * 60 * 1000, // 5 minutes
      compressionThreshold: 5,
      bufferTypes: ['window'] as const,
      windowSize: 5,
      summaryThreshold: 3,
      conversationLimit: 10
    },
    longTermMemory: {
      type: 'postgres' as const,
      connectionString: process.env.TEST_DATABASE_URL || 'memory'
    },
    vectorStore: {
      type: 'memory' as const,
      config: { maxVectors: 100 }
    },
    embedding: {
      provider: 'openai' as const,
      model: 'text-embedding-ada-002',
      dimensions: 1536,
      batchSize: 10
    },
    processing: {
      summarizationModel: 'gpt-3.5-turbo',
      summarizationThreshold: 5,
      consolidationInterval: 60 * 1000, // 1 minute
      importanceScoring: true,
      runtimeStateEnabled: true,
      formDataEnabled: true,
      reasoningChains: false,
      humanInteractionHistory: false,
      variableResolution: false,
      consolidationThreshold: 5
    }
  },
  
  production: {
    workingMemory: {
      type: 'memory' as const,
      maxItems: 1000,
      ttl: 24 * 60 * 60 * 1000, // 24 hours
      compressionThreshold: 500,
      bufferTypes: ['window', 'summary', 'conversation'] as const,
      windowSize: 100,
      summaryThreshold: 50,
      conversationLimit: 200
    },
    longTermMemory: {
      type: 'postgres' as const,
      connectionString: process.env.DATABASE_URL
    },
    vectorStore: {
      type: process.env.VECTOR_STORE_TYPE as any || 'memory' as const,
      config: {
        apiKey: process.env.VECTOR_STORE_API_KEY,
        environment: process.env.VECTOR_STORE_ENV,
        indexName: process.env.VECTOR_STORE_INDEX || 'memory-vectors',
        maxVectors: parseInt(process.env.MAX_VECTORS || '50000', 10)
      }
    },
    embedding: {
      provider: process.env.EMBEDDING_PROVIDER as any || 'openai' as const,
      model: process.env.EMBEDDING_MODEL || 'text-embedding-ada-002',
      dimensions: parseInt(process.env.EMBEDDING_DIMENSIONS || '1536', 10),
      batchSize: parseInt(process.env.EMBEDDING_BATCH_SIZE || '100', 10)
    },
    processing: {
      summarizationModel: process.env.SUMMARIZATION_MODEL || 'gpt-3.5-turbo',
      summarizationThreshold: parseInt(process.env.SUMMARIZATION_THRESHOLD || '200', 10),
      consolidationInterval: parseInt(process.env.CONSOLIDATION_INTERVAL || '3600000', 10), // 1 hour
      importanceScoring: true,
      runtimeStateEnabled: true,
      formDataEnabled: true,
      reasoningChains: true,
      humanInteractionHistory: true,
      variableResolution: true,
      consolidationThreshold: parseInt(process.env.CONSOLIDATION_THRESHOLD || '100', 10)
    }
  }
};

/**
 * Creates an Enhanced Memory Module instance with comprehensive configuration.
 * 
 * This factory function handles:
 * - Environment-specific configuration defaults
 * - Configuration loading from environment variables
 * - Vector store selection and validation
 * - Development vs production optimizations
 * - Configuration validation and error handling
 * 
 * Environment variable loading:
 * - VECTOR_STORE_TYPE -> vectorStore.type
 * - VECTOR_STORE_API_KEY -> vectorStore.config.apiKey
 * - VECTOR_STORE_ENV -> vectorStore.config.environment
 * - VECTOR_STORE_INDEX -> vectorStore.config.indexName
 * - EMBEDDING_PROVIDER -> embedding.provider
 * - EMBEDDING_MODEL -> embedding.model
 * - EMBEDDING_DIMENSIONS -> embedding.dimensions
 * - SUMMARIZATION_MODEL -> processing.summarizationModel
 * - Custom prefix via envPrefix option
 * 
 * @param userConfig - User-provided configuration (optional)
 * @param dependencies - Injected dependencies (unused for Memory Module)
 * @returns Configured Enhanced Memory Module instance
 * @throws {MemoryValidationError} If configuration is invalid
 * @throws {MemoryError} If module creation fails
 * 
 * @example
 * ```typescript
 * // Minimal configuration with environment variables
 * const memory = createMemoryModule();
 * 
 * // Explicit configuration
 * const memory = createMemoryModule({
 *   workingMemory: {
 *     type: 'memory',
 *     maxItems: 500,
 *     bufferTypes: ['window', 'summary']
 *   },
 *   vectorStore: {
 *     type: 'pinecone',
 *     config: {
 *       apiKey: 'your-api-key',
 *       environment: 'us-west1-gcp',
 *       indexName: 'memory-vectors'
 *     }
 *   },
 *   embedding: {
 *     provider: 'openai',
 *     model: 'text-embedding-ada-002'
 *   }
 * });
 * 
 * // Development configuration
 * const memory = createMemoryModule({
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
export function createMemoryModule(
  userConfig: MemoryFactoryConfig = {},
  dependencies?: Record<string, any>
): IMemoryModule {
  console.log('Creating Enhanced Memory Module with factory...');
  
  try {
    // Determine environment
    const env = getEnvironment(userConfig.environment);
    console.log(`Creating Enhanced Memory Module for environment: ${env}`);
    
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
    
    console.log('✓ Enhanced Memory Module created successfully for', env, 'environment');
    console.log('Configuration summary:', {
      workingMemoryType: moduleConfig.workingMemory?.type,
      vectorStoreType: moduleConfig.vectorStore?.type,
      embeddingProvider: moduleConfig.embedding?.provider,
      bufferTypes: moduleConfig.workingMemory?.bufferTypes
    });
    
    return new MemoryModule();
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Failed to create Enhanced Memory Module:', errorMessage);
    
    throw new MemoryError(
      'MEMORY_FACTORY_ERROR',
      `Enhanced Memory Module creation failed: ${errorMessage}`,
      {
        environment: getEnvironment(userConfig.environment),
        suggestion: 'Check configuration format and ensure all required services are properly configured'
      },
      undefined,
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
function loadConfigFromEnvironment(prefix: string = 'MEMORY_'): Partial<MemoryConfig> {
  const config: Partial<MemoryConfig> = {
    workingMemory: {
      type: 'memory'
    },
    vectorStore: { 
      type: 'memory',
      config: {} 
    },
    embedding: {
      provider: 'openai'
    },
    processing: {}
  };
  
  // Load vector store configuration
  const vectorStoreType = process.env.VECTOR_STORE_TYPE || process.env[`${prefix}VECTOR_STORE_TYPE`];
  if (vectorStoreType) {
    config.vectorStore!.type = vectorStoreType as any;
    console.log(`✓ Loaded vector store type from environment: ${vectorStoreType}`);
  }
  
  const vectorStoreApiKey = process.env.VECTOR_STORE_API_KEY || process.env[`${prefix}VECTOR_STORE_API_KEY`];
  if (vectorStoreApiKey) {
    config.vectorStore!.config!.apiKey = vectorStoreApiKey;
    console.log('✓ Loaded vector store API key from environment');
  }
  
  const vectorStoreEnv = process.env.VECTOR_STORE_ENV || process.env[`${prefix}VECTOR_STORE_ENV`];
  if (vectorStoreEnv) {
    config.vectorStore!.config!.environment = vectorStoreEnv;
    console.log(`✓ Loaded vector store environment from environment: ${vectorStoreEnv}`);
  }
  
  const vectorStoreIndex = process.env.VECTOR_STORE_INDEX || process.env[`${prefix}VECTOR_STORE_INDEX`];
  if (vectorStoreIndex) {
    config.vectorStore!.config!.indexName = vectorStoreIndex;
    console.log(`✓ Loaded vector store index name from environment: ${vectorStoreIndex}`);
  }
  
  // Load embedding configuration
  const embeddingProvider = process.env.EMBEDDING_PROVIDER || process.env[`${prefix}EMBEDDING_PROVIDER`];
  if (embeddingProvider) {
    config.embedding!.provider = embeddingProvider as any;
    console.log(`✓ Loaded embedding provider from environment: ${embeddingProvider}`);
  }
  
  const embeddingModel = process.env.EMBEDDING_MODEL || process.env[`${prefix}EMBEDDING_MODEL`];
  if (embeddingModel) {
    config.embedding!.model = embeddingModel;
    console.log(`✓ Loaded embedding model from environment: ${embeddingModel}`);
  }
  
  const embeddingDimensions = process.env.EMBEDDING_DIMENSIONS || process.env[`${prefix}EMBEDDING_DIMENSIONS`];
  if (embeddingDimensions) {
    const dimensions = parseInt(embeddingDimensions, 10);
    if (!isNaN(dimensions)) {
      config.embedding!.dimensions = dimensions;
      console.log(`✓ Loaded embedding dimensions from environment: ${dimensions}`);
    }
  }
  
  // Load processing configuration
  const summarizationModel = process.env.SUMMARIZATION_MODEL || process.env[`${prefix}SUMMARIZATION_MODEL`];
  if (summarizationModel) {
    config.processing!.summarizationModel = summarizationModel;
    console.log(`✓ Loaded summarization model from environment: ${summarizationModel}`);
  }
  
  const consolidationThreshold = process.env.CONSOLIDATION_THRESHOLD || process.env[`${prefix}CONSOLIDATION_THRESHOLD`];
  if (consolidationThreshold) {
    const threshold = parseInt(consolidationThreshold, 10);
    if (!isNaN(threshold)) {
      config.processing!.consolidationThreshold = threshold;
      console.log(`✓ Loaded consolidation threshold from environment: ${threshold}`);
    }
  }
  
  // Load working memory configuration
  const maxItems = process.env[`${prefix}MAX_ITEMS`];
  if (maxItems) {
    const max = parseInt(maxItems, 10);
    if (!isNaN(max)) {
      config.workingMemory!.maxItems = max;
      console.log(`✓ Loaded max items from environment: ${max}`);
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
function mergeConfigurations(configs: any[]): MemoryFactoryConfig {
  let merged: MemoryFactoryConfig = {};
  
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
 * @throws {MemoryValidationError} If configuration is invalid
 * @throws {MemoryError} If storage configuration is invalid
 * @private
 */
function validateFactoryConfiguration(config: Partial<MemoryConfig>): void {
  // Validate working memory configuration
  if (!config.workingMemory) {
    throw new MemoryValidationError(
      'factory',
      'Working memory configuration is required',
      'workingMemory',
      config.workingMemory
    );
  }
  
  if (!config.workingMemory.type) {
    throw new MemoryValidationError(
      'factory',
      'Working memory type is required',
      'workingMemory.type',
      config.workingMemory.type
    );
  }
  
  // Validate vector store configuration
  if (!config.vectorStore) {
    throw new MemoryValidationError(
      'factory',
      'Vector store configuration is required',
      'vectorStore',
      config.vectorStore
    );
  }
  
  if (!config.vectorStore.type) {
    throw new MemoryValidationError(
      'factory',
      'Vector store type is required',
      'vectorStore.type',
      config.vectorStore.type
    );
  }
  
  const validVectorStoreTypes = ['pinecone', 'weaviate', 'qdrant', 'chroma', 'memory'];
  if (!validVectorStoreTypes.includes(config.vectorStore.type)) {
    throw new MemoryValidationError(
      'factory',
      `Invalid vector store type. Must be one of: ${validVectorStoreTypes.join(', ')}`,
      'vectorStore.type',
      config.vectorStore.type,
      { validOptions: validVectorStoreTypes }
    );
  }
  
  // Validate embedding configuration
  if (!config.embedding) {
    throw new MemoryValidationError(
      'factory',
      'Embedding configuration is required',
      'embedding',
      config.embedding
    );
  }
  
  if (!config.embedding.provider) {
    throw new MemoryValidationError(
      'factory',
      'Embedding provider is required',
      'embedding.provider',
      config.embedding.provider
    );
  }
  
  const validEmbeddingProviders = ['openai', 'cohere', 'huggingface', 'litellm'];
  if (!validEmbeddingProviders.includes(config.embedding.provider)) {
    throw new MemoryValidationError(
      'factory',
      `Invalid embedding provider. Must be one of: ${validEmbeddingProviders.join(', ')}`,
      'embedding.provider',
      config.embedding.provider,
      { validOptions: validEmbeddingProviders }
    );
  }
  
  // Validate numeric constraints
  if (config.workingMemory.maxItems && config.workingMemory.maxItems < 1) {
    throw new MemoryValidationError(
      'factory',
      'Max items must be at least 1',
      'workingMemory.maxItems',
      config.workingMemory.maxItems
    );
  }
  
  if (config.embedding.dimensions && config.embedding.dimensions < 1) {
    throw new MemoryValidationError(
      'factory',
      'Embedding dimensions must be at least 1',
      'embedding.dimensions',
      config.embedding.dimensions
    );
  }
  
  if (config.processing?.consolidationThreshold && config.processing.consolidationThreshold < 1) {
    throw new MemoryValidationError(
      'factory',
      'Consolidation threshold must be at least 1',
      'processing.consolidationThreshold',
      config.processing.consolidationThreshold
    );
  }
}

/**
 * Creates an Enhanced Memory Module instance specifically for testing.
 * 
 * This is a convenience function that sets up a Memory Module
 * with test-friendly defaults and in-memory storage.
 * 
 * @param overrides - Optional configuration overrides
 * @returns Enhanced Memory Module configured for testing
 * 
 * @example
 * ```typescript
 * // In test files
 * import { createTestMemoryModule } from '../factory';
 * 
 * describe('Memory Management', () => {
 *   let memory: IMemoryModule;
 *   
 *   beforeEach(async () => {
 *     memory = createTestMemoryModule();
 *     await memory.initialize({
 *       workingMemory: { type: 'memory' },
 *       vectorStore: { type: 'memory', config: {} },
 *       embedding: { provider: 'openai' },
 *       processing: { consolidationThreshold: 5 }
 *     });
 *   });
 *   
 *   it('should store and retrieve working memory', async () => {
 *     await memory.addWorkingMemory({
 *       sessionId: 'test-session',
 *       timestamp: new Date(),
 *       type: 'user',
 *       content: 'Test message'
 *     });
 *     
 *     const items = await memory.getWorkingMemory({ sessionId: 'test-session' });
 *     expect(items).toHaveLength(1);
 *   });
 * });
 * ```
 * 
 * @public
 */
export function createTestMemoryModule(
  overrides: Partial<MemoryFactoryConfig> = {}
): IMemoryModule {
  const testConfig: MemoryFactoryConfig = {
    environment: 'test',
    workingMemory: {
      type: 'memory',
      maxItems: 10,
      ttl: 5 * 60 * 1000,
      compressionThreshold: 5,
      bufferTypes: ['window']
    },
    vectorStore: {
      type: 'memory',
      config: { 
        options: { maxVectors: 100 }
      }
    },
    embedding: {
      provider: 'openai',
      model: 'text-embedding-ada-002',
      dimensions: 1536
    },
    processing: {
      consolidationThreshold: 5,
      importanceScoring: false,
      runtimeStateEnabled: true,
      formDataEnabled: true
    },
    loadFromEnv: false,
    test: {
      enabled: true,
      mockStorage: true
    },
    ...overrides
  };
  
  console.log('Creating test Enhanced Memory Module with in-memory storage');
  
  return createMemoryModule(testConfig);
}