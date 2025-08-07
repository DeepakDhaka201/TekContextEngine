/**
 * @fileoverview Factory for Streaming Manager Module creation and configuration
 * @module modules/streaming/factory
 * @requires ./streaming-manager
 * @requires ./types
 * @requires ../registry/types
 * 
 * This file implements the StreamingManagerFactory class that provides standardized
 * creation and configuration of StreamingManager instances. The factory supports
 * different deployment configurations, performance optimizations, and integration
 * with the module registry system.
 * 
 * Key concepts:
 * - Standardized StreamingManager creation with validated configuration
 * - Environment-specific configuration templates for different deployment scenarios
 * - Integration with dependency injection and module registry patterns
 * - Configuration validation and optimization for production deployments
 * - Support for custom configuration overrides and extensions
 * 
 * @example
 * ```typescript
 * import { streamingManagerFactory } from './factory';
 * 
 * // Create with default configuration
 * const streamingManager = streamingManagerFactory.create();
 * 
 * // Create with custom configuration
 * const customManager = streamingManagerFactory.create({
 *   maxClients: 2000,
 *   enableCompression: true,
 *   rateLimiting: { maxEventsPerSecond: 200, windowSize: 1000 }
 * });
 * 
 * // Create for specific environment
 * const prodManager = streamingManagerFactory.createForProduction({
 *   corsOrigins: ['https://myapp.com']
 * });
 * ```
 * 
 * @see streaming-manager.ts for StreamingManager implementation
 * @see types.ts for configuration interfaces
 * @since 1.0.0
 */

import { ModuleFactory } from '../registry/types';
import { StreamingManager } from './streaming-manager';
import { StreamingManagerConfig } from './types';

/**
 * Factory for creating and configuring StreamingManager instances.
 * 
 * The StreamingManagerFactory provides a standardized way to create
 * StreamingManager instances with appropriate configuration for different
 * deployment environments and use cases. It includes configuration validation,
 * environment-specific templates, and integration with the module registry.
 * 
 * Features:
 * - Environment-specific configuration templates
 * - Configuration validation and optimization
 * - Integration with module registry and dependency injection
 * - Support for custom configuration overrides
 * - Performance optimization presets
 * - Security configuration templates
 * 
 * @remarks
 * The factory is designed to be used by the module registry system for
 * dependency injection and service locator patterns. It can also be used
 * directly for custom StreamingManager creation scenarios.
 * 
 * @example
 * ```typescript
 * // Register with module registry
 * moduleRegistry.registerFactory('streamingManager', streamingManagerFactory);
 * 
 * // Create directly with custom config
 * const streamingManager = streamingManagerFactory.create({
 *   maxClients: 500,
 *   heartbeatInterval: 30000,
 *   enableCompression: true,
 *   corsOrigins: ['http://localhost:3000', 'https://app.example.com']
 * });
 * 
 * await streamingManager.initialize();
 * ```
 * 
 * @public
 */
export class StreamingManagerFactory {
  /** Factory name for registry identification */
  readonly name = 'StreamingManagerFactory';
  
  /** Factory version for compatibility tracking */
  readonly version = '1.0.0';
  
  /**
   * Creates a StreamingManager instance with the specified configuration.
   * 
   * Validates and optimizes the configuration, applies security defaults,
   * and creates a properly configured StreamingManager instance.
   * 
   * @param config - Optional configuration overrides
   * @returns Configured StreamingManager instance
   * 
   * @example
   * ```typescript
   * const streamingManager = streamingManagerFactory.create({
   *   maxClients: 1000,
   *   connectionTimeout: 300000,
   *   heartbeatInterval: 30000,
   *   enableCompression: true,
   *   eventIdGeneration: true,
   *   rateLimiting: {
   *     maxEventsPerSecond: 100,
   *     windowSize: 1000
   *   },
   *   corsOrigins: ['https://trusted-domain.com'],
   *   enableMetrics: true,
   *   logEvents: false
   * });
   * ```
   */
  create(config?: StreamingManagerConfig): StreamingManager {
    console.log('Creating StreamingManager with factory');
    
    // Validate and optimize configuration
    const validatedConfig = this.validateAndOptimizeConfig(config);
    
    // Create StreamingManager instance
    const streamingManager = new StreamingManager(validatedConfig);
    
    console.log('✓ StreamingManager created by factory', {
      maxClients: validatedConfig.maxClients,
      enableCompression: validatedConfig.enableCompression,
      enableMetrics: validatedConfig.enableMetrics
    });
    
    return streamingManager;
  }
  
  /**
   * Creates a StreamingManager optimized for development environment.
   * 
   * Applies development-specific configurations including verbose logging,
   * relaxed CORS policies, and enhanced debugging features.
   * 
   * @param overrides - Optional configuration overrides
   * @returns Development-optimized StreamingManager
   * 
   * @example
   * ```typescript
   * const devStreamingManager = streamingManagerFactory.createForDevelopment({
   *   maxClients: 10, // Lower limit for development
   *   corsOrigins: ['http://localhost:3000', 'http://localhost:3001']
   * });
   * ```
   */
  createForDevelopment(overrides?: Partial<StreamingManagerConfig>): StreamingManager {
    const developmentConfig: StreamingManagerConfig = {
      maxClients: 50,
      connectionTimeout: 600000, // 10 minutes for debugging
      heartbeatInterval: 15000,   // More frequent heartbeats
      enableCompression: false,   // Disable for easier debugging
      eventIdGeneration: true,
      retrySettings: {
        maxRetries: 1,
        retryDelay: 500
      },
      corsOrigins: ['*'], // Permissive for development
      requireAuth: false,
      rateLimiting: {
        maxEventsPerSecond: 1000, // High limit for development
        windowSize: 1000
      },
      enableMetrics: true,
      logEvents: true, // Verbose logging for development
      ...overrides
    };
    
    console.log('Creating StreamingManager for development environment');
    return this.create(developmentConfig);
  }
  
  /**
   * Creates a StreamingManager optimized for production environment.
   * 
   * Applies production-specific configurations including security hardening,
   * performance optimization, and comprehensive monitoring.
   * 
   * @param overrides - Optional configuration overrides
   * @returns Production-optimized StreamingManager
   * 
   * @example
   * ```typescript
   * const prodStreamingManager = streamingManagerFactory.createForProduction({
   *   maxClients: 2000,
   *   corsOrigins: ['https://myapp.com', 'https://api.myapp.com'],
   *   requireAuth: true
   * });
   * ```
   */
  createForProduction(overrides?: Partial<StreamingManagerConfig>): StreamingManager {
    const productionConfig: StreamingManagerConfig = {
      maxClients: 1000,
      connectionTimeout: 300000,  // 5 minutes
      heartbeatInterval: 30000,   // 30 seconds
      enableCompression: true,    // Enable for bandwidth optimization
      eventIdGeneration: true,
      retrySettings: {
        maxRetries: 3,
        retryDelay: 1000
      },
      corsOrigins: [], // Must be explicitly configured
      requireAuth: true,
      rateLimiting: {
        maxEventsPerSecond: 50, // Conservative limit
        windowSize: 1000
      },
      enableMetrics: true,
      logEvents: false, // Disable verbose logging in production
      ...overrides
    };
    
    console.log('Creating StreamingManager for production environment');
    return this.create(productionConfig);
  }
  
  /**
   * Creates a StreamingManager optimized for high-performance scenarios.
   * 
   * Applies high-performance configurations including increased limits,
   * optimized timeouts, and minimal overhead settings.
   * 
   * @param overrides - Optional configuration overrides
   * @returns High-performance optimized StreamingManager
   * 
   * @example
   * ```typescript
   * const highPerfManager = streamingManagerFactory.createForHighPerformance({
   *   maxClients: 5000,
   *   rateLimiting: { maxEventsPerSecond: 500, windowSize: 1000 }
   * });
   * ```
   */
  createForHighPerformance(overrides?: Partial<StreamingManagerConfig>): StreamingManager {
    const highPerformanceConfig: StreamingManagerConfig = {
      maxClients: 2000,
      connectionTimeout: 180000,  // 3 minutes (shorter for efficiency)
      heartbeatInterval: 60000,   // 1 minute (less frequent)
      enableCompression: true,
      eventIdGeneration: false,   // Disable for performance
      retrySettings: {
        maxRetries: 1,            // Fewer retries
        retryDelay: 200
      },
      corsOrigins: [],
      requireAuth: true,
      rateLimiting: {
        maxEventsPerSecond: 200, // Higher throughput
        windowSize: 500          // Smaller window for faster processing
      },
      enableMetrics: true,
      logEvents: false,
      ...overrides
    };
    
    console.log('Creating StreamingManager for high-performance scenarios');
    return this.create(highPerformanceConfig);
  }
  
  /**
   * Creates a StreamingManager optimized for testing environments.
   * 
   * Applies test-specific configurations including minimal timeouts,
   * verbose logging, and predictable behavior settings.
   * 
   * @param overrides - Optional configuration overrides
   * @returns Test-optimized StreamingManager
   * 
   * @example
   * ```typescript
   * const testManager = streamingManagerFactory.createForTesting({
   *   maxClients: 5,
   *   connectionTimeout: 5000 // Short timeout for fast tests
   * });
   * ```
   */
  createForTesting(overrides?: Partial<StreamingManagerConfig>): StreamingManager {
    const testingConfig: StreamingManagerConfig = {
      maxClients: 10,
      connectionTimeout: 10000,   // 10 seconds for fast tests
      heartbeatInterval: 5000,    // 5 seconds
      enableCompression: false,   // Disable for predictability
      eventIdGeneration: true,    // Enable for testing event IDs
      retrySettings: {
        maxRetries: 0,            // No retries in tests
        retryDelay: 0
      },
      corsOrigins: ['*'],
      requireAuth: false,
      rateLimiting: {
        maxEventsPerSecond: 1000, // High limit for test speed
        windowSize: 1000
      },
      enableMetrics: false,       // Disable for test isolation
      logEvents: true,            // Enable for test debugging
      ...overrides
    };
    
    console.log('Creating StreamingManager for testing environment');
    return this.create(testingConfig);
  }
  
  /**
   * Gets the default configuration template for StreamingManager.
   * 
   * Provides the base configuration that serves as the foundation
   * for all environment-specific configurations.
   * 
   * @returns Default StreamingManager configuration
   */
  getDefaultConfig(): Required<StreamingManagerConfig> {
    return {
      maxClients: 1000,
      connectionTimeout: 300000,
      heartbeatInterval: 30000,
      enableCompression: true,
      eventIdGeneration: true,
      retrySettings: {
        maxRetries: 3,
        retryDelay: 1000
      },
      corsOrigins: ['*'],
      requireAuth: false,
      rateLimiting: {
        maxEventsPerSecond: 100,
        windowSize: 1000
      },
      enableMetrics: true,
      logEvents: false
    };
  }
  
  /**
   * Validates and optimizes configuration for StreamingManager.
   * 
   * Performs comprehensive validation of configuration parameters,
   * applies optimizations, and ensures security best practices.
   * 
   * @param config - Configuration to validate and optimize
   * @returns Validated and optimized configuration
   * @private
   */
  private validateAndOptimizeConfig(config?: StreamingManagerConfig): StreamingManagerConfig {
    const defaults = this.getDefaultConfig();
    const mergedConfig = { ...defaults, ...config };
    
    // Validate numeric constraints
    if (mergedConfig.maxClients && mergedConfig.maxClients < 1) {
      console.warn('maxClients must be at least 1, using default');
      mergedConfig.maxClients = defaults.maxClients;
    }
    
    if (mergedConfig.maxClients && mergedConfig.maxClients > 10000) {
      console.warn('maxClients > 10000 may cause performance issues');
    }
    
    if (mergedConfig.connectionTimeout && mergedConfig.connectionTimeout < 5000) {
      console.warn('connectionTimeout < 5s may cause frequent disconnections');
    }
    
    if (mergedConfig.heartbeatInterval && mergedConfig.heartbeatInterval < 5000) {
      console.warn('heartbeatInterval < 5s may cause high CPU usage');
    }
    
    // Validate rate limiting configuration
    if (mergedConfig.rateLimiting) {
      const { maxEventsPerSecond, windowSize } = mergedConfig.rateLimiting;
      
      if (maxEventsPerSecond < 1) {
        console.warn('maxEventsPerSecond must be at least 1, using default');
        mergedConfig.rateLimiting.maxEventsPerSecond = defaults.rateLimiting.maxEventsPerSecond;
      }
      
      if (windowSize < 100) {
        console.warn('windowSize should be at least 100ms for accurate rate limiting');
      }
    }
    
    // Validate retry settings
    if (mergedConfig.retrySettings) {
      const { maxRetries, retryDelay } = mergedConfig.retrySettings;
      
      if (maxRetries < 0) {
        console.warn('maxRetries cannot be negative, using 0');
        mergedConfig.retrySettings.maxRetries = 0;
      }
      
      if (maxRetries > 10) {
        console.warn('maxRetries > 10 may cause excessive delays');
      }
      
      if (retryDelay < 0) {
        console.warn('retryDelay cannot be negative, using 0');
        mergedConfig.retrySettings.retryDelay = 0;
      }
    }
    
    // Security validation
    if (mergedConfig.corsOrigins && mergedConfig.corsOrigins.includes('*') && mergedConfig.requireAuth) {
      console.warn('Using wildcard CORS with authentication may have security implications');
    }
    
    // Performance optimization recommendations
    if (mergedConfig.maxClients && mergedConfig.maxClients > 1000 && !mergedConfig.enableCompression) {
      console.info('Consider enabling compression for high client counts');
    }
    
    if (mergedConfig.enableMetrics && mergedConfig.maxClients && mergedConfig.maxClients > 2000) {
      console.info('Metrics collection may impact performance with high client counts');
    }
    
    return mergedConfig;
  }
}

/**
 * Pre-configured StreamingManagerFactory instance for immediate use.
 * 
 * This factory instance is ready to use and can be imported directly
 * for creating StreamingManager instances or registering with the module registry.
 * 
 * @example
 * ```typescript
 * // Direct usage
 * const streamingManager = streamingManagerFactory.create();
 * 
 * // Module registry registration
 * moduleRegistry.registerFactory('streamingManager', streamingManagerFactory);
 * ```
 * 
 * @public
 */
export const streamingManagerFactory = new StreamingManagerFactory();

/**
 * Environment-specific factory presets for common deployment scenarios.
 * 
 * Provides convenient access to pre-configured factory methods for
 * different environments without needing to instantiate the factory.
 * 
 * @public
 */
export const StreamingManagerPresets = {
  /**
   * Creates StreamingManager for development environment.
   */
  development: (overrides?: Partial<StreamingManagerConfig>) => 
    streamingManagerFactory.createForDevelopment(overrides),
  
  /**
   * Creates StreamingManager for production environment.
   */
  production: (overrides?: Partial<StreamingManagerConfig>) => 
    streamingManagerFactory.createForProduction(overrides),
  
  /**
   * Creates StreamingManager for high-performance scenarios.
   */
  highPerformance: (overrides?: Partial<StreamingManagerConfig>) => 
    streamingManagerFactory.createForHighPerformance(overrides),
  
  /**
   * Creates StreamingManager for testing environment.
   */
  testing: (overrides?: Partial<StreamingManagerConfig>) => 
    streamingManagerFactory.createForTesting(overrides)
};

// Export factory for module registry registration
export default streamingManagerFactory;