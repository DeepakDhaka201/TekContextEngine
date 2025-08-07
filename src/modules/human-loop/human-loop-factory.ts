/**
 * @fileoverview Factory for creating Human-in-the-Loop Module instances
 * @module modules/human-loop/human-loop-factory
 * @requires ./human-loop-module
 * @requires ./types
 * @requires ./errors
 * 
 * This file implements the factory pattern for creating and configuring
 * Human-in-the-Loop Module instances with environment-specific defaults
 * and validation.
 * 
 * Key concepts:
 * - Environment-aware configuration with intelligent defaults
 * - Configuration validation and error handling
 * - Module instance lifecycle management
 * - Integration with AgentHub module registry
 * - Performance optimization for different deployment scenarios
 * 
 * @example
 * ```typescript
 * import { HumanLoopFactory } from './human-loop-factory';
 * 
 * // Create module for development environment
 * const humanLoop = await HumanLoopFactory.create({
 *   environment: 'development',
 *   streaming: { enabled: true },
 *   autoApproval: {
 *     enabled: true,
 *     rules: [devAutoApprovalRules]
 *   }
 * });
 * 
 * // Create module for production environment
 * const prodHumanLoop = await HumanLoopFactory.createForProduction({
 *   persistence: { enabled: true, storage: 'database' },
 *   security: { encryption: true, auditLogging: true }
 * });
 * ```
 * 
 * @see human-loop-module.ts for the main module implementation
 * @see types.ts for configuration interfaces
 * @since 1.0.0
 */

import { HumanLoopModule } from './human-loop-module';
import { HumanLoopConfig, AutoApprovalRule } from './types';
import { ConfigurationError } from './errors';

/**
 * Environment-specific configuration profiles.
 * 
 * Provides intelligent defaults for different deployment environments
 * with appropriate security, performance, and feature configurations.
 */
const ENVIRONMENT_CONFIGS: Record<string, Partial<HumanLoopConfig>> = {
  development: {
    defaultTimeout: 300000, // 5 minutes
    maxTimeout: 1800000,    // 30 minutes
    retryPolicy: {
      maxRetries: 1,
      retryDelay: 2000,
      backoffMultiplier: 1.0
    },
    persistence: {
      enabled: false,
      storage: 'memory',
      retentionDays: 7
    },
    streaming: {
      enabled: true,
      realTimeUpdates: true
    },
    security: {
      encryption: false,
      auditLogging: true
    },
    autoApproval: {
      enabled: true,
      rules: []
    },
    rateLimiting: {
      enabled: false,
      maxRequestsPerMinute: 100,
      maxConcurrentInteractions: 10
    }
  },
  
  testing: {
    defaultTimeout: 30000,  // 30 seconds for faster tests
    maxTimeout: 120000,     // 2 minutes
    retryPolicy: {
      maxRetries: 0,
      retryDelay: 1000,
      backoffMultiplier: 1.0
    },
    persistence: {
      enabled: false,
      storage: 'memory',
      retentionDays: 1
    },
    streaming: {
      enabled: false,
      realTimeUpdates: false
    },
    security: {
      encryption: false,
      auditLogging: false
    },
    autoApproval: {
      enabled: true,
      rules: []
    },
    rateLimiting: {
      enabled: false,
      maxRequestsPerMinute: 1000,
      maxConcurrentInteractions: 100
    }
  },
  
  production: {
    defaultTimeout: 300000, // 5 minutes
    maxTimeout: 3600000,    // 1 hour
    retryPolicy: {
      maxRetries: 3,
      retryDelay: 5000,
      backoffMultiplier: 2.0
    },
    persistence: {
      enabled: true,
      storage: 'database',
      retentionDays: 90
    },
    streaming: {
      enabled: true,
      realTimeUpdates: true
    },
    security: {
      encryption: true,
      auditLogging: true
    },
    autoApproval: {
      enabled: true,
      rules: []
    },
    rateLimiting: {
      enabled: true,
      maxRequestsPerMinute: 60,
      maxConcurrentInteractions: 20
    }
  }
};

/**
 * Common auto-approval rules for different scenarios.
 * 
 * Provides pre-built rule sets for common use cases to reduce
 * configuration complexity and ensure consistent behavior.
 */
const COMMON_AUTO_APPROVAL_RULES: Record<string, AutoApprovalRule[]> = {
  // Low-risk operations during business hours
  lowRiskBusinessHours: [
    {
      id: 'low-risk-business-hours',
      description: 'Auto-approve low risk operations during business hours',
      conditions: [
        { field: 'riskLevel', operator: 'equals', value: 'low', type: 'risk' },
        { field: 'hour', operator: 'greater_than', value: 8, type: 'time' },
        { field: 'hour', operator: 'less_than', value: 18, type: 'time' },
        { field: 'day_of_week', operator: 'greater_than', value: 0, type: 'time' },
        { field: 'day_of_week', operator: 'less_than', value: 6, type: 'time' }
      ],
      action: 'approve',
      metadata: { category: 'business-hours-automation' }
    }
  ],
  
  // File operations with size limits
  fileOperations: [
    {
      id: 'safe-file-operations',
      description: 'Auto-approve file operations under size limits',
      conditions: [
        { field: 'operation', operator: 'contains', value: 'file', type: 'metadata' },
        { field: 'riskLevel', operator: 'not_equals', value: 'critical', type: 'risk' },
        { field: 'size', operator: 'less_than', value: 10485760, type: 'metadata' } // 10MB
      ],
      action: 'approve',
      metadata: { category: 'file-automation', maxSize: '10MB' }
    }
  ],
  
  // Trusted user operations
  trustedUsers: [
    {
      id: 'trusted-user-medium-risk',
      description: 'Auto-approve medium risk operations from trusted users',
      conditions: [
        { field: 'trusted', operator: 'equals', value: true, type: 'user' },
        { field: 'riskLevel', operator: 'not_equals', value: 'critical', type: 'risk' }
      ],
      action: 'approve',
      metadata: { category: 'trusted-user-automation' }
    }
  ],
  
  // Security-focused rules
  security: [
    {
      id: 'reject-critical-risk',
      description: 'Always reject critical risk operations',
      conditions: [
        { field: 'riskLevel', operator: 'equals', value: 'critical', type: 'risk' }
      ],
      action: 'reject',
      metadata: { category: 'security-enforcement' }
    },
    {
      id: 'reject-high-risk-off-hours',
      description: 'Reject high risk operations outside business hours',
      conditions: [
        { field: 'riskLevel', operator: 'equals', value: 'high', type: 'risk' },
        { field: 'hour', operator: 'less_than', value: 8, type: 'time' }
      ],
      action: 'reject',
      metadata: { category: 'off-hours-security' }
    }
  ]
};

/**
 * Factory interface for creating Human-in-the-Loop Module instances.
 * 
 * Defines the contract for factory methods that create and configure
 * module instances with environment-specific settings.
 */
export interface IHumanLoopFactory {
  /**
   * Creates a new Human-in-the-Loop Module instance with the given configuration.
   * 
   * @param config - Module configuration
   * @returns Configured and initialized module instance
   */
  create(config?: Partial<HumanLoopConfig>): Promise<HumanLoopModule>;
  
  /**
   * Creates a module instance optimized for the specified environment.
   * 
   * @param environment - Target environment
   * @param overrides - Configuration overrides
   * @returns Configured module instance
   */
  createForEnvironment(
    environment: 'development' | 'testing' | 'production',
    overrides?: Partial<HumanLoopConfig>
  ): Promise<HumanLoopModule>;
}

/**
 * Factory for creating Human-in-the-Loop Module instances.
 * 
 * The HumanLoopFactory provides intelligent module creation with
 * environment-aware defaults, configuration validation, and integration
 * with common deployment patterns.
 * 
 * Features:
 * - Environment-specific configuration profiles
 * - Pre-built auto-approval rule sets for common scenarios
 * - Configuration validation and error reporting
 * - Performance optimization based on deployment context
 * - Integration with module registry patterns
 * 
 * Architecture:
 * - Static factory methods for different creation patterns
 * - Environment detection and appropriate default selection
 * - Configuration merging with intelligent override handling
 * - Validation pipeline with detailed error reporting
 * 
 * @remarks
 * The factory pattern enables consistent module creation across different
 * parts of the application while ensuring appropriate defaults for the
 * deployment environment.
 * 
 * @example
 * ```typescript
 * // Create with environment detection
 * const humanLoop = await HumanLoopFactory.create();
 * 
 * // Create for specific environment
 * const devModule = await HumanLoopFactory.createForEnvironment('development', {
 *   autoApproval: {
 *     enabled: true,
 *     rules: HumanLoopFactory.getCommonRules('lowRiskBusinessHours')
 *   }
 * });
 * 
 * // Create for production with security rules
 * const prodModule = await HumanLoopFactory.createForProduction({
 *   autoApproval: {
 *     enabled: true,
 *     rules: [
 *       ...HumanLoopFactory.getCommonRules('security'),
 *       ...HumanLoopFactory.getCommonRules('trustedUsers')
 *     ]
 *   }
 * });
 * ```
 * 
 * @public
 */
export class HumanLoopFactory implements IHumanLoopFactory {
  /**
   * Creates a new Human-in-the-Loop Module instance with intelligent defaults.
   * 
   * Automatically detects the current environment and applies appropriate
   * configuration defaults while allowing for custom overrides.
   * 
   * @param config - Optional configuration overrides
   * @returns Configured and initialized module instance
   * @throws {ConfigurationError} If configuration is invalid
   * 
   * @example
   * ```typescript
   * // Create with auto-detected environment
   * const humanLoop = await HumanLoopFactory.create();
   * 
   * // Create with custom configuration
   * const customHumanLoop = await HumanLoopFactory.create({
   *   defaultTimeout: 600000, // 10 minutes
   *   autoApproval: {
   *     enabled: true,
   *     rules: [
   *       {
   *         id: 'custom-rule',
   *         description: 'Custom approval rule',
   *         conditions: [{ field: 'custom', operator: 'equals', value: true, type: 'metadata' }],
   *         action: 'approve'
   *       }
   *     ]
   *   }
   * });
   * ```
   */
  static async create(config?: Partial<HumanLoopConfig>): Promise<HumanLoopModule> {
    console.log('Creating Human-in-the-Loop module with factory...');
    
    // Detect environment
    const environment = this.detectEnvironment();
    console.log(`✓ Detected environment: ${environment}`);
    
    return this.createForEnvironment(environment, config);
  }
  
  /**
   * Creates a module instance optimized for the specified environment.
   * 
   * @param environment - Target environment
   * @param overrides - Optional configuration overrides
   * @returns Configured and initialized module instance
   * @throws {ConfigurationError} If environment or configuration is invalid
   */
  static async createForEnvironment(
    environment: 'development' | 'testing' | 'production',
    overrides?: Partial<HumanLoopConfig>
  ): Promise<HumanLoopModule> {
    console.log(`Creating Human-in-the-Loop module for ${environment} environment...`);
    
    try {
      // Get environment-specific defaults
      const environmentDefaults = ENVIRONMENT_CONFIGS[environment];
      if (!environmentDefaults) {
        throw new ConfigurationError(
          'environment',
          `Unknown environment: ${environment}`,
          { environment, supportedEnvironments: Object.keys(ENVIRONMENT_CONFIGS) }
        );
      }
      
      // Merge configuration with intelligent defaults
      const finalConfig = this.mergeConfigurations(environmentDefaults, overrides || {});
      
      // Validate final configuration
      this.validateConfiguration(finalConfig);
      
      // Create and initialize module
      const module = new HumanLoopModule();
      await module.initialize(finalConfig);
      
      console.log(`✓ Human-in-the-Loop module created for ${environment}`, {
        defaultTimeout: finalConfig.defaultTimeout,
        autoApprovalEnabled: finalConfig.autoApproval?.enabled,
        streamingEnabled: finalConfig.streaming?.enabled,
        persistenceEnabled: finalConfig.persistence?.enabled,
        autoApprovalRules: finalConfig.autoApproval?.rules?.length || 0
      });
      
      return module;
      
    } catch (error) {
      console.error(`Failed to create Human-in-the-Loop module for ${environment}:`, error);
      throw error;
    }
  }
  
  /**
   * Creates a module instance optimized for development.
   * 
   * @param overrides - Optional configuration overrides
   * @returns Development-configured module instance
   */
  static async createForDevelopment(overrides?: Partial<HumanLoopConfig>): Promise<HumanLoopModule> {
    return this.createForEnvironment('development', overrides);
  }
  
  /**
   * Creates a module instance optimized for testing.
   * 
   * @param overrides - Optional configuration overrides
   * @returns Test-configured module instance
   */
  static async createForTesting(overrides?: Partial<HumanLoopConfig>): Promise<HumanLoopModule> {
    return this.createForEnvironment('testing', overrides);
  }
  
  /**
   * Creates a module instance optimized for production.
   * 
   * @param overrides - Optional configuration overrides
   * @returns Production-configured module instance
   */
  static async createForProduction(overrides?: Partial<HumanLoopConfig>): Promise<HumanLoopModule> {
    return this.createForEnvironment('production', overrides);
  }
  
  /**
   * Gets pre-built auto-approval rules for common scenarios.
   * 
   * @param ruleset - Name of the rule set to retrieve
   * @returns Array of auto-approval rules
   * @throws {ConfigurationError} If rule set is not found
   * 
   * @example
   * ```typescript
   * // Get low-risk business hours rules
   * const businessHoursRules = HumanLoopFactory.getCommonRules('lowRiskBusinessHours');
   * 
   * // Get file operation rules
   * const fileRules = HumanLoopFactory.getCommonRules('fileOperations');
   * 
   * // Get security enforcement rules
   * const securityRules = HumanLoopFactory.getCommonRules('security');
   * ```
   */
  static getCommonRules(ruleset: keyof typeof COMMON_AUTO_APPROVAL_RULES): AutoApprovalRule[] {
    const rules = COMMON_AUTO_APPROVAL_RULES[ruleset];
    if (!rules) {
      throw new ConfigurationError(
        'autoApprovalRules',
        `Unknown rule set: ${ruleset}`,
        { ruleset, availableRulesets: Object.keys(COMMON_AUTO_APPROVAL_RULES) }
      );
    }
    
    return JSON.parse(JSON.stringify(rules)); // Deep clone to prevent mutation
  }
  
  /**
   * Gets all available common rule sets.
   * 
   * @returns Record of all available rule sets
   */
  static getAllCommonRules(): Record<string, AutoApprovalRule[]> {
    return JSON.parse(JSON.stringify(COMMON_AUTO_APPROVAL_RULES)); // Deep clone
  }
  
  /**
   * Creates a custom auto-approval rule with validation.
   * 
   * @param config - Rule configuration
   * @returns Validated auto-approval rule
   * @throws {ConfigurationError} If rule configuration is invalid
   */
  static createAutoApprovalRule(config: {
    id: string;
    description: string;
    conditions: Array<{
      field: string;
      operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'regex';
      value: any;
      type: 'metadata' | 'context' | 'user' | 'time' | 'risk';
    }>;
    action: 'approve' | 'reject' | 'escalate';
    metadata?: Record<string, any>;
  }): AutoApprovalRule {
    // Validate rule configuration
    if (!config.id || typeof config.id !== 'string') {
      throw new ConfigurationError('ruleId', 'Rule ID is required and must be a string', { config });
    }
    
    if (!config.description || typeof config.description !== 'string') {
      throw new ConfigurationError('ruleDescription', 'Rule description is required and must be a string', { config });
    }
    
    if (!Array.isArray(config.conditions) || config.conditions.length === 0) {
      throw new ConfigurationError('ruleConditions', 'Rule must have at least one condition', { config });
    }
    
    if (!['approve', 'reject', 'escalate'].includes(config.action)) {
      throw new ConfigurationError('ruleAction', 'Rule action must be approve, reject, or escalate', { config });
    }
    
    return {
      id: config.id,
      description: config.description,
      conditions: config.conditions,
      action: config.action,
      metadata: config.metadata
    };
  }
  
  // Instance methods for non-static usage
  async create(config?: Partial<HumanLoopConfig>): Promise<HumanLoopModule> {
    return HumanLoopFactory.create(config);
  }
  
  async createForEnvironment(
    environment: 'development' | 'testing' | 'production',
    overrides?: Partial<HumanLoopConfig>
  ): Promise<HumanLoopModule> {
    return HumanLoopFactory.createForEnvironment(environment, overrides);
  }
  
  // Private helper methods
  
  /**
   * Detects the current environment based on process variables.
   * 
   * @returns Detected environment name
   * @private
   */
  private static detectEnvironment(): 'development' | 'testing' | 'production' {
    const nodeEnv = process.env.NODE_ENV?.toLowerCase();
    
    if (nodeEnv === 'test' || nodeEnv === 'testing') {
      return 'testing';
    }
    
    if (nodeEnv === 'production' || nodeEnv === 'prod') {
      return 'production';
    }
    
    // Default to development
    return 'development';
  }
  
  /**
   * Merges configuration objects with intelligent defaults.
   * 
   * @param base - Base configuration
   * @param overrides - Configuration overrides
   * @returns Merged configuration
   * @private
   */
  private static mergeConfigurations(
    base: Partial<HumanLoopConfig>,
    overrides: Partial<HumanLoopConfig>
  ): HumanLoopConfig {
    const merged: any = { ...base };
    
    // Handle nested object merging
    for (const [key, value] of Object.entries(overrides)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        merged[key] = { ...merged[key], ...value };
      } else {
        merged[key] = value;
      }
    }
    
    return merged as HumanLoopConfig;
  }
  
  /**
   * Validates a complete configuration object.
   * 
   * @param config - Configuration to validate
   * @throws {ConfigurationError} If configuration is invalid
   * @private
   */
  private static validateConfiguration(config: HumanLoopConfig): void {
    // Validate timeout values
    if (config.defaultTimeout && config.defaultTimeout <= 0) {
      throw new ConfigurationError(
        'defaultTimeout',
        'Default timeout must be positive',
        { defaultTimeout: config.defaultTimeout }
      );
    }
    
    if (config.maxTimeout && config.defaultTimeout && config.maxTimeout < config.defaultTimeout) {
      throw new ConfigurationError(
        'maxTimeout',
        'Max timeout must be greater than or equal to default timeout',
        { maxTimeout: config.maxTimeout, defaultTimeout: config.defaultTimeout }
      );
    }
    
    // Validate retry policy
    if (config.retryPolicy) {
      if (config.retryPolicy.maxRetries < 0) {
        throw new ConfigurationError(
          'retryPolicy.maxRetries',
          'Max retries must be non-negative',
          { maxRetries: config.retryPolicy.maxRetries }
        );
      }
      
      if (config.retryPolicy.retryDelay <= 0) {
        throw new ConfigurationError(
          'retryPolicy.retryDelay',
          'Retry delay must be positive',
          { retryDelay: config.retryPolicy.retryDelay }
        );
      }
    }
    
    // Validate auto-approval rules
    if (config.autoApproval?.enabled && config.autoApproval.rules) {
      const ruleIds = new Set<string>();
      
      for (const rule of config.autoApproval.rules) {
        if (ruleIds.has(rule.id)) {
          throw new ConfigurationError(
            'autoApproval.rules',
            `Duplicate rule ID: ${rule.id}`,
            { duplicateId: rule.id }
          );
        }
        ruleIds.add(rule.id);
      }
    }
  }
}

/**
 * Default factory instance for convenience.
 * 
 * @public
 */
export const humanLoopFactory = new HumanLoopFactory();