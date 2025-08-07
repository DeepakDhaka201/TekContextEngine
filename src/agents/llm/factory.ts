/**
 * @fileoverview Factory for creating LLM Agent instances
 * @module agents/llm/factory
 * @requires ./llm-agent
 * @requires ./types
 * @requires ../base/factory
 * 
 * This file implements the factory pattern for creating and configuring
 * LLM Agent instances with environment-specific defaults and validation.
 * 
 * Key concepts:
 * - Environment-aware configuration with intelligent defaults
 * - Preset configurations for common use cases
 * - Validation and error handling during agent creation
 * - Integration with the global agent registry
 * - Performance optimization for different deployment scenarios
 * 
 * @example
 * ```typescript
 * import { LLMAgentFactory, createLLMAgent } from './factory';
 * 
 * // Create agent with factory
 * const agent = await createLLMAgent({
 *   name: 'Assistant',
 *   model: {
 *     primary: 'gpt-4',
 *     routing: 'quality'
 *   },
 *   prompting: {
 *     systemPrompt: 'You are a helpful AI assistant.'
 *   }
 * });
 * 
 * // Create agent with preset
 * const codeAgent = await createLLMAgent({
 *   ...LLMAgentPresets.codeAssistant,
 *   name: 'Code Helper'
 * });
 * ```
 * 
 * @see llm-agent.ts for the main agent implementation
 * @see ../base/factory.ts for base factory patterns
 * @since 1.0.0
 */

import { LLMAgent } from './llm-agent';
import { LLMAgentConfig, LLMAgentType, ModelRouting, ResponseFormat } from './types';
import { LLMAgentError } from './errors';
import { AgentFactory } from '../base/factory';

/**
 * Preset configurations for common LLM agent use cases.
 * 
 * Provides pre-built configurations for typical agent scenarios
 * to reduce setup complexity and ensure best practices.
 * 
 * @public
 */
export const LLMAgentPresets = {
  /**
   * Simple conversational chatbot configuration.
   * 
   * Optimized for casual conversation with balanced parameters
   * and conversation memory enabled.
   */
  chatbot: {
    name: 'Chatbot',
    description: 'Simple conversational AI assistant',
    type: 'llm' as LLMAgentType,
    model: {
      primary: 'gpt-3.5-turbo',
      routing: 'balanced' as ModelRouting
    },
    prompting: {
      systemPrompt: 'You are a helpful AI assistant. Be conversational, friendly, and concise.',
      format: 'text' as ResponseFormat
    },
    memory: {
      enabled: true,
      maxMessages: 20,
      summarizeAfter: 30
    },
    behavior: {
      temperature: 0.7,
      maxTokens: 1000
    },
    tools: {
      autoExecute: false
    }
  },
  
  /**
   * Code assistant configuration.
   * 
   * Optimized for programming help with high-quality models,
   * structured output, and development tools.
   */
  codeAssistant: {
    name: 'Code Assistant',
    description: 'AI assistant for programming and software development',
    type: 'llm' as LLMAgentType,
    model: {
      primary: 'gpt-4',
      fallback: ['gpt-3.5-turbo'],
      routing: 'quality' as ModelRouting
    },
    prompting: {
      systemPrompt: 'You are an expert programmer. Provide clear, well-commented code with explanations. Focus on best practices, security, and maintainability.',
      format: 'code' as ResponseFormat,
      instructions: 'Always include comments and explain your reasoning'
    },
    memory: {
      enabled: true,
      maxMessages: 15,
      summarizeAfter: 25
    },
    behavior: {
      temperature: 0.3,
      maxTokens: 2000
    },
    tools: {
      autoExecute: true,
      maxIterations: 5
    }
  },
  
  /**
   * Research assistant configuration.
   * 
   * Optimized for in-depth analysis with high-quality models,
   * structured markdown output, and research tools.
   */
  researcher: {
    name: 'Research Assistant',
    description: 'AI assistant for research and in-depth analysis',
    type: 'llm' as LLMAgentType,
    model: {
      primary: 'gpt-4',
      fallback: ['claude-3-sonnet'],
      routing: 'quality' as ModelRouting
    },
    prompting: {
      systemPrompt: 'You are a thorough research assistant. Provide comprehensive, well-sourced analysis with proper citations. Structure your responses clearly with headings and bullet points.',
      format: 'markdown' as ResponseFormat,
      instructions: 'Always provide sources and structure information clearly'
    },
    memory: {
      enabled: true,
      maxMessages: 10,
      summarizeAfter: 15
    },
    behavior: {
      temperature: 0.4,
      maxTokens: 3000
    },
    tools: {
      autoExecute: true,
      maxIterations: 3
    }
  },
  
  /**
   * Data analyst configuration.
   * 
   * Optimized for data analysis with structured JSON output,
   * analytical tools, and precise reasoning.
   */
  dataAnalyst: {
    name: 'Data Analyst',
    description: 'AI assistant for data analysis and insights',
    type: 'llm' as LLMAgentType,
    model: {
      primary: 'gpt-4',
      routing: 'quality' as ModelRouting
    },
    prompting: {
      systemPrompt: 'You are a data analyst. Provide precise, data-driven insights with statistical reasoning. Always support conclusions with evidence.',
      format: 'json' as ResponseFormat,
      instructions: 'Structure responses as JSON with clear data and insights sections'
    },
    memory: {
      enabled: true,
      maxMessages: 12,
      summarizeAfter: 20
    },
    behavior: {
      temperature: 0.2,
      maxTokens: 2500
    },
    tools: {
      autoExecute: true,
      maxIterations: 4
    }
  },
  
  /**
   * Creative writer configuration.
   * 
   * Optimized for creative content with higher temperature,
   * markdown formatting, and creative tools.
   */
  creativeWriter: {
    name: 'Creative Writer',
    description: 'AI assistant for creative writing and content creation',
    type: 'llm' as LLMAgentType,
    model: {
      primary: 'gpt-4',
      fallback: ['claude-3-sonnet'],
      routing: 'balanced' as ModelRouting
    },
    prompting: {
      systemPrompt: 'You are a creative writer. Generate engaging, original content with vivid descriptions and compelling narratives. Adapt your style to the requested genre or format.',
      format: 'markdown' as ResponseFormat
    },
    memory: {
      enabled: true,
      maxMessages: 25,
      summarizeAfter: 40
    },
    behavior: {
      temperature: 0.9,
      maxTokens: 2500
    },
    tools: {
      autoExecute: false
    }
  },
  
  /**
   * Customer support configuration.
   * 
   * Optimized for customer service with helpful, professional tone,
   * and support-specific tools.
   */
  customerSupport: {
    name: 'Customer Support',
    description: 'AI assistant for customer service and support',
    type: 'llm' as LLMAgentType,
    model: {
      primary: 'gpt-3.5-turbo',
      routing: 'balanced' as ModelRouting
    },
    prompting: {
      systemPrompt: 'You are a helpful customer support representative. Be patient, empathetic, and solution-focused. Always aim to resolve issues efficiently while maintaining a professional tone.',
      format: 'text' as ResponseFormat
    },
    memory: {
      enabled: true,
      maxMessages: 30,
      summarizeAfter: 50
    },
    behavior: {
      temperature: 0.5,
      maxTokens: 1500
    },
    tools: {
      autoExecute: true,
      maxIterations: 2
    }
  }
} as const;

/**
 * Factory class for creating LLM Agent instances.
 * 
 * Provides standardized creation patterns with validation,
 * defaults, and error handling for LLM agents.
 * 
 * @public
 */
export class LLMAgentFactory extends AgentFactory<LLMAgent> {
  /**
   * Creates a new LLM agent instance.
   * 
   * @param config - Agent configuration
   * @returns Configured LLM agent instance
   * @throws {LLMAgentError} If configuration is invalid
   * 
   * @example
   * ```typescript
   * const factory = new LLMAgentFactory();
   * const agent = factory.createAgent({
   *   name: 'My Assistant',
   *   model: { primary: 'gpt-4' },
   *   prompting: { systemPrompt: 'You are helpful.' }
   * });
   * ```
   */
  createAgent(config: LLMAgentConfig): LLMAgent {
    console.log(`Creating LLM Agent: ${config.name}`);
    
    try {
      // Validate required fields
      this.validateConfig(config);
      
      // Create agent instance
      const agent = new LLMAgent(config);
      
      console.log(`✓ LLM Agent created: ${config.name}`, {
        model: config.model?.primary,
        memoryEnabled: config.memory?.enabled,
        toolsEnabled: config.tools?.autoExecute
      });
      
      return agent;
      
    } catch (error) {
      console.error(`Failed to create LLM Agent: ${config.name}`, error);
      
      if (error instanceof LLMAgentError) {
        throw error;
      }
      
      throw new LLMAgentError(
        'AGENT_CREATION_FAILED',
        `Failed to create LLM agent: ${error instanceof Error ? error.message : String(error)}`,
        { config },
        undefined,
        undefined,
        undefined,
        error instanceof Error ? error : undefined
      );
    }
  }
  
  /**
   * Creates an LLM agent with a preset configuration.
   * 
   * @param presetName - Name of the preset to use
   * @param overrides - Configuration overrides
   * @returns Configured LLM agent instance
   * @throws {LLMAgentError} If preset is invalid
   * 
   * @example
   * ```typescript
   * const factory = new LLMAgentFactory();
   * const agent = factory.createWithPreset('codeAssistant', {
   *   name: 'My Code Helper',
   *   model: { primary: 'gpt-4-32k' }
   * });
   * ```
   */
  createWithPreset(
    presetName: keyof typeof LLMAgentPresets,
    overrides: Partial<LLMAgentConfig> = {}
  ): LLMAgent {
    const preset = LLMAgentPresets[presetName];
    if (!preset) {
      throw new LLMAgentError(
        'INVALID_PRESET',
        `Unknown preset: ${presetName}`,
        { presetName, availablePresets: Object.keys(LLMAgentPresets) }
      );
    }
    
    // Merge preset with overrides
    const config = this.mergeConfigurations(preset, overrides);
    
    return this.createAgent(config);
  }
  
  /**
   * Creates multiple LLM agents from configurations.
   * 
   * @param configs - Array of agent configurations
   * @returns Array of created agents
   * 
   * @example
   * ```typescript
   * const factory = new LLMAgentFactory();
   * const agents = factory.createMultiple([
   *   { name: 'Assistant 1', model: { primary: 'gpt-3.5-turbo' } },
   *   { name: 'Assistant 2', model: { primary: 'gpt-4' } }
   * ]);
   * ```
   */
  createMultiple(configs: LLMAgentConfig[]): LLMAgent[] {
    return configs.map(config => this.createAgent(config));
  }
  
  /**
   * Gets available preset configurations.
   * 
   * @returns Object containing all available presets
   * 
   * @example
   * ```typescript
   * const factory = new LLMAgentFactory();
   * const presets = factory.getPresets();
   * console.log(Object.keys(presets)); // ['chatbot', 'codeAssistant', ...]
   * ```
   */
  getPresets(): typeof LLMAgentPresets {
    return LLMAgentPresets;
  }
  
  /**
   * Gets preset names.
   * 
   * @returns Array of available preset names
   */
  getPresetNames(): (keyof typeof LLMAgentPresets)[] {
    return Object.keys(LLMAgentPresets) as (keyof typeof LLMAgentPresets)[];
  }
  
  /**
   * Validates agent configuration.
   * 
   * @param config - Configuration to validate
   * @throws {LLMAgentError} If configuration is invalid
   * @private
   */
  private validateConfig(config: LLMAgentConfig): void {
    if (!config.name || typeof config.name !== 'string') {
      throw new LLMAgentError(
        'INVALID_CONFIGURATION',
        'Agent name is required and must be a string',
        { config }
      );
    }
    
    if (config.behavior?.temperature !== undefined) {
      if (typeof config.behavior.temperature !== 'number' ||
          config.behavior.temperature < 0 ||
          config.behavior.temperature > 2) {
        throw new LLMAgentError(
          'INVALID_CONFIGURATION',
          'Temperature must be a number between 0 and 2',
          { temperature: config.behavior.temperature }
        );
      }
    }
    
    if (config.behavior?.maxTokens !== undefined) {
      if (typeof config.behavior.maxTokens !== 'number' ||
          config.behavior.maxTokens <= 0) {
        throw new LLMAgentError(
          'INVALID_CONFIGURATION',
          'Max tokens must be a positive number',
          { maxTokens: config.behavior.maxTokens }
        );
      }
    }
    
    if (config.memory?.maxMessages !== undefined) {
      if (typeof config.memory.maxMessages !== 'number' ||
          config.memory.maxMessages <= 0) {
        throw new LLMAgentError(
          'INVALID_CONFIGURATION',
          'Max messages must be a positive number',
          { maxMessages: config.memory.maxMessages }
        );
      }
    }
  }
  
  /**
   * Merges configurations with intelligent defaults.
   * 
   * @param base - Base configuration
   * @param overrides - Configuration overrides
   * @returns Merged configuration
   * @private
   */
  private mergeConfigurations(
    base: Partial<LLMAgentConfig>,
    overrides: Partial<LLMAgentConfig>
  ): LLMAgentConfig {
    const merged: any = { ...base };
    
    // Handle nested object merging
    for (const [key, value] of Object.entries(overrides)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        merged[key] = { ...merged[key], ...value };
      } else {
        merged[key] = value;
      }
    }
    
    return merged as LLMAgentConfig;
  }
}

/**
 * Convenience function for creating LLM agents.
 * 
 * @param config - Agent configuration
 * @returns Promise resolving to initialized LLM agent
 * @throws {LLMAgentError} If creation or initialization fails
 * 
 * @example
 * ```typescript
 * // Basic usage
 * const agent = await createLLMAgent({
 *   name: 'Assistant',
 *   model: { primary: 'gpt-4' },
 *   prompting: { systemPrompt: 'You are helpful.' }
 * });
 * 
 * // With preset
 * const codeAgent = await createLLMAgent({
 *   ...LLMAgentPresets.codeAssistant,
 *   name: 'My Code Helper'
 * });
 * 
 * // Use the agent
 * const response = await agent.execute({
 *   prompt: 'Hello, how are you?',
 *   sessionId: 'session-123'
 * });
 * ```
 * 
 * @public
 */
export async function createLLMAgent(config: LLMAgentConfig): Promise<LLMAgent> {
  const factory = new LLMAgentFactory();
  const agent = factory.createAgent(config);
  await agent.initialize();
  return agent;
}

/**
 * Creates an LLM agent with a preset configuration.
 * 
 * @param presetName - Name of the preset to use
 * @param overrides - Configuration overrides
 * @returns Promise resolving to initialized LLM agent
 * @throws {LLMAgentError} If creation fails
 * 
 * @example
 * ```typescript
 * const agent = await createLLMAgentWithPreset('codeAssistant', {
 *   name: 'My Code Helper',
 *   behavior: { temperature: 0.2 }
 * });
 * ```
 * 
 * @public
 */
export async function createLLMAgentWithPreset(
  presetName: keyof typeof LLMAgentPresets,
  overrides: Partial<LLMAgentConfig> = {}
): Promise<LLMAgent> {
  const factory = new LLMAgentFactory();
  const agent = factory.createWithPreset(presetName, overrides);
  await agent.initialize();
  return agent;
}

/**
 * Creates multiple LLM agents from configurations.
 * 
 * @param configs - Array of agent configurations
 * @returns Promise resolving to array of initialized agents
 * 
 * @example
 * ```typescript
 * const agents = await createMultipleLLMAgents([
 *   { name: 'Assistant 1', model: { primary: 'gpt-3.5-turbo' } },
 *   { name: 'Assistant 2', model: { primary: 'gpt-4' } }
 * ]);
 * ```
 * 
 * @public
 */
export async function createMultipleLLMAgents(configs: LLMAgentConfig[]): Promise<LLMAgent[]> {
  const factory = new LLMAgentFactory();
  const agents = factory.createMultiple(configs);
  
  // Initialize all agents in parallel
  await Promise.all(agents.map(agent => agent.initialize()));
  
  return agents;
}

/**
 * Global LLM agent factory instance.
 * 
 * @public
 */
export const llmAgentFactory = new LLMAgentFactory();

/**
 * Default export for convenient access.
 * 
 * @public
 */
export default {
  LLMAgentFactory,
  LLMAgentPresets,
  createLLMAgent,
  createLLMAgentWithPreset,
  createMultipleLLMAgents,
  llmAgentFactory
};