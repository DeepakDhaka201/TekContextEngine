/**
 * @fileoverview Base Agent Factory Implementation
 * @module agents/base/factory
 * @requires ./types
 * 
 * This file provides base factory functionality for creating agent instances
 * with consistent configuration validation and error handling.
 * 
 * Key concepts:
 * - Abstract base factory pattern
 * - Configuration validation
 * - Error handling with detailed context
 * - Extensible factory pattern for specialized agents
 * 
 * @example
 * ```typescript
 * import { BaseAgentFactory } from './factory';
 * 
 * class MyAgentFactory extends BaseAgentFactory<MyConfig, MyAgent> {
 *   protected async createAgent(config: MyConfig): Promise<MyAgent> {
 *     return new MyAgent(config);
 *   }
 * }
 * ```
 * 
 * @since 1.0.0
 */

import { AgentFactory, AgentConfig, IAgent } from './types';
import { AgentError } from './errors';

/**
 * Abstract base implementation of the AgentFactory interface.
 * 
 * Provides common functionality for agent factories including
 * configuration validation, error handling, and lifecycle management.
 * 
 * @template TConfig - The configuration type for the agent
 * @template TAgent - The agent instance type
 * @public
 */
export abstract class BaseAgentFactory<TConfig extends AgentConfig, TAgent extends IAgent> 
  implements AgentFactory<TConfig, TAgent> {
  
  /**
   * Creates an agent instance with the provided configuration.
   * 
   * Validates the configuration, applies defaults, and creates the agent
   * instance using the abstract createAgent method.
   * 
   * @param config - Agent configuration object
   * @returns Promise resolving to the configured agent instance
   * @throws AgentError if configuration is invalid or creation fails
   */
  async create(config: TConfig): Promise<TAgent> {
    try {
      // Validate configuration
      this.validateConfig(config);
      
      // Apply defaults
      const finalConfig = this.applyDefaults(config);
      
      // Create agent instance
      const agent = await this.createAgent(finalConfig);
      
      // Initialize agent if needed
      await this.initializeAgent(agent, finalConfig);
      
      return agent;
    } catch (error) {
      throw new AgentError(
        'AGENT_CREATION_FAILED',
        'Failed to create agent instance',
        { 
          agentType: this.getAgentType(),
          config: config,
          error: error instanceof Error ? error.message : String(error)
        },
        'Check configuration validity and ensure all required dependencies are available',
        error instanceof Error ? error : undefined
      );
    }
  }
  
  /**
   * Validates the provided configuration.
   * 
   * @param config - Configuration object to validate
   * @returns True if configuration is valid
   * @throws AgentError with validation details if invalid
   */
  validateConfig(config: TConfig): boolean {
    if (!config) {
      throw new AgentError(
        'INVALID_CONFIG',
        'Configuration object is required',
        { config }
      );
    }
    
    if (!config.id || typeof config.id !== 'string') {
      throw new AgentError(
        'INVALID_CONFIG',
        'Agent ID is required and must be a string',
        { config }
      );
    }
    
    if (!config.type || typeof config.type !== 'string') {
      throw new AgentError(
        'INVALID_CONFIG',
        'Agent type is required and must be a string',
        { config }
      );
    }
    
    // Allow subclasses to add additional validation
    this.validateSpecificConfig(config);
    
    return true;
  }
  
  /**
   * Gets the default configuration for this agent type.
   * 
   * Provides sensible defaults that can be overridden by specific
   * configuration values. Subclasses should override this method
   * to provide type-specific defaults.
   * 
   * @returns Default configuration object
   */
  getDefaultConfig(): Partial<TConfig> {
    return {
      // Base defaults - subclasses should extend this
    } as Partial<TConfig>;
  }
  
  /**
   * Abstract method to create the agent instance.
   * 
   * Subclasses must implement this method to create their specific
   * agent type with the provided configuration.
   * 
   * @param config - Validated and processed configuration
   * @returns Promise resolving to the agent instance
   * @protected
   * @abstract
   */
  protected abstract createAgent(config: TConfig): Promise<TAgent>;
  
  /**
   * Gets the agent type string for error reporting.
   * 
   * Subclasses should override this to provide their specific type.
   * 
   * @returns Agent type identifier
   * @protected
   */
  protected getAgentType(): string {
    return 'base';
  }
  
  /**
   * Validates configuration specific to the agent type.
   * 
   * Subclasses can override this method to add type-specific
   * validation logic beyond the base validation.
   * 
   * @param config - Configuration to validate
   * @throws AgentError if validation fails
   * @protected
   */
  protected validateSpecificConfig(config: TConfig): void {
    // Default implementation does nothing
    // Subclasses can override to add specific validation
  }
  
  /**
   * Applies default configuration values to the provided config.
   * 
   * Merges the provided configuration with default values,
   * with provided values taking precedence.
   * 
   * @param config - User-provided configuration
   * @returns Configuration with defaults applied
   * @protected
   */
  protected applyDefaults(config: TConfig): TConfig {
    const defaults = this.getDefaultConfig();
    return {
      ...defaults,
      ...config,
      // Ensure nested objects are properly merged
      ...(defaults.config && config.config ? {
        config: { ...defaults.config, ...config.config }
      } : {})
    } as TConfig;
  }
  
  /**
   * Initializes the agent after creation.
   * 
   * Performs any necessary initialization steps for the agent
   * instance. Subclasses can override this for custom initialization.
   * 
   * @param agent - The created agent instance
   * @param config - The final configuration used
   * @returns Promise that resolves when initialization is complete
   * @protected
   */
  protected async initializeAgent(agent: TAgent, config: TConfig): Promise<void> {
    // Default implementation does nothing
    // Subclasses can override to add initialization logic
  }
}

/**
 * Type guard to check if an object implements the AgentFactory interface.
 * 
 * @param obj - Object to check
 * @returns True if object implements AgentFactory interface
 */
export function isAgentFactory(obj: any): obj is AgentFactory<any, any> {
  return obj && 
         typeof obj === 'object' &&
         typeof obj.create === 'function' &&
         typeof obj.validateConfig === 'function' &&
         typeof obj.getDefaultConfig === 'function';
}