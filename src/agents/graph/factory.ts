/**
 * @fileoverview Graph Agent Factory with presets and configurations
 * @module agents/graph/factory
 * @requires ./graph-agent
 * @requires ./types
 * @requires ./graph-builder
 * 
 * This file implements the factory pattern for creating Graph Agent instances
 * with predefined configurations and presets. It provides convenient methods
 * for creating common graph agent configurations and building complex workflows.
 * 
 * Key responsibilities:
 * - Provide preset configurations for common use cases
 * - Create Graph Agent instances with validated configurations
 * - Support template-based graph creation
 * - Enable fluent API for graph agent construction
 * - Provide configuration validation and optimization
 * 
 * Key concepts:
 * - Factory pattern for graph agent creation
 * - Preset configurations for common workflows
 * - Template-based graph definitions
 * - Configuration validation and defaults
 * - Performance optimization profiles
 * 
 * @example
 * ```typescript
 * import { GraphAgentFactory } from './factory';
 * 
 * // Create agent with preset
 * const agent = GraphAgentFactory.createDataProcessingAgent({
 *   name: 'Data Pipeline',
 *   maxConcurrency: 8
 * });
 * 
 * // Create custom agent
 * const customAgent = GraphAgentFactory.createAgent({
 *   name: 'Custom Workflow',
 *   execution: {
 *     strategy: 'adaptive',
 *     maxConcurrency: 16
 *   }
 * });
 * ```
 * 
 * @since 1.0.0
 */

import { GraphAgent } from './graph-agent';
import { GraphBuilder } from './graph-builder';
import {
  GraphAgentConfig,
  GraphDefinition,
  GraphExecutionStrategy,
  GraphExecutionConfig,
  GraphStateConfig,
  GraphPerformanceConfig,
  GraphErrorConfig,
  GraphMonitoringConfig,
  NodeType,
  GraphPerformanceProfile
} from './types';

/**
 * Configuration for creating preset graph agents.
 */
export interface GraphAgentPresetConfig {
  /** Agent name */
  name: string;
  
  /** Agent description */
  description?: string;
  
  /** Agent version */
  version?: string;
  
  /** Override execution strategy */
  strategy?: GraphExecutionStrategy;
  
  /** Override max concurrency */
  maxConcurrency?: number;
  
  /** Override execution timeout */
  timeout?: number;
  
  /** Custom module registry */
  modules?: Record<string, any>;
}

/**
 * Template configuration for graph definitions.
 */
export interface GraphTemplate {
  /** Template identifier */
  id: string;
  
  /** Template name */
  name: string;
  
  /** Template description */
  description: string;
  
  /** Template category */
  category: 'data-processing' | 'workflow' | 'ai-pipeline' | 'custom';
  
  /** Graph definition */
  graph: GraphDefinition;
  
  /** Recommended configuration */
  config: Partial<GraphAgentConfig>;
  
  /** Template parameters */
  parameters?: Record<string, any>;
}

/**
 * Factory for creating Graph Agent instances with presets and configurations.
 * 
 * Provides convenient methods for creating graph agents with common configurations,
 * preset workflows, and template-based graph definitions.
 */
export class GraphAgentFactory {
  private static templates: Map<string, GraphTemplate> = new Map();
  private static presets: Map<string, Partial<GraphAgentConfig>> = new Map();
  
  /**
   * Creates a basic graph agent with minimal configuration.
   * 
   * @param config - Basic configuration
   * @returns Graph agent instance
   */
  static createBasicAgent(config: GraphAgentPresetConfig): GraphAgent {
    const fullConfig: GraphAgentConfig = {
      id: `graph-agent-${Date.now()}`,
      type: 'graph',
      name: config.name,
      description: config.description || 'Basic graph agent',
      version: config.version || '1.0.0',
      modules: config.modules || {},
      execution: {
        strategy: config.strategy || 'parallel',
        maxConcurrency: config.maxConcurrency || 4,
        timeout: config.timeout || 300000,
        errorHandling: 'fail_fast',
        retry: {
          maxAttempts: 3,
          backoffStrategy: 'exponential',
          initialDelay: 1000,
          maxDelay: 30000,
          retryableErrors: []
        },
        checkpointing: {
          enabled: true,
          frequency: 'node',
          interval: 60000,
          storage: 'memory',
          compression: 'none',
          retention: 10
        },
        optimization: {
          enabled: true,
          strategies: ['parallel_expansion'],
          threshold: 0.5,
          adaptive: true
        }
      },
      state: {
        persistence: 'memory',
        serialization: 'json',
        compression: 'none',
        cleanup: {
          enabled: true,
          retention: 10,
          compression: true,
          archive: false,
          conditions: []
        },
        maxSize: 100 * 1024 * 1024,
        versioning: true,
        checkpointing: {
          enabled: true,
          frequency: 'node',
          interval: 60000,
          storage: 'memory',
          compression: 'none',
          retention: 10
        }
      },
      performance: this.getPerformanceConfig('balanced'),
      errorHandling: this.getErrorHandlingConfig('default'),
      monitoring: this.getMonitoringConfig('basic')
    };
    
    return new GraphAgent(fullConfig);
  }
  
  /**
   * Creates a high-performance graph agent optimized for parallel processing.
   * 
   * @param config - Configuration with performance optimizations
   * @returns High-performance graph agent
   */
  static createHighPerformanceAgent(config: GraphAgentPresetConfig): GraphAgent {
    const fullConfig: GraphAgentConfig = {
      id: `graph-agent-hp-${Date.now()}`,
      type: 'graph',
      name: config.name,
      description: config.description || 'High-performance graph agent',
      version: config.version || '1.0.0',
      modules: config.modules || {},
      execution: {
        strategy: 'adaptive',
        maxConcurrency: config.maxConcurrency || 16,
        timeout: config.timeout || 600000,
        errorHandling: 'continue_on_error',
        retry: {
          maxAttempts: 5,
          backoffStrategy: 'exponential',
          initialDelay: 500,
          maxDelay: 10000,
          retryableErrors: ['NETWORK_ERROR', 'TIMEOUT', 'RESOURCE_BUSY']
        },
        checkpointing: {
          enabled: true,
          frequency: 'time',
          interval: 30000,
          storage: 'memory',
          compression: 'gzip',
          retention: 20
        },
        optimization: {
          enabled: true,
          strategies: ['parallel_expansion', 'node_coalescing', 'lazy_evaluation'],
          threshold: 0.7,
          adaptive: true
        }
      },
      state: {
        persistence: 'memory',
        serialization: 'json',
        compression: 'gzip',
        cleanup: {
          enabled: true,
          retention: 20,
          compression: true,
          archive: true,
          conditions: ['time_based', 'size_based']
        },
        maxSize: 500 * 1024 * 1024,
        versioning: true,
        checkpointing: {
          enabled: true,
          frequency: 'time',
          interval: 30000,
          storage: 'memory',
          compression: 'gzip',
          retention: 20
        }
      },
      performance: this.getPerformanceConfig('high_performance'),
      errorHandling: this.getErrorHandlingConfig('resilient'),
      monitoring: this.getMonitoringConfig('comprehensive')
    };
    
    return new GraphAgent(fullConfig);
  }
  
  /**
   * Creates a data processing graph agent optimized for ETL workflows.
   * 
   * @param config - Configuration for data processing
   * @returns Data processing graph agent
   */
  static createDataProcessingAgent(config: GraphAgentPresetConfig): GraphAgent {
    const fullConfig: GraphAgentConfig = {
      id: `graph-agent-data-${Date.now()}`,
      type: 'graph',
      name: config.name,
      description: config.description || 'Data processing graph agent',
      version: config.version || '1.0.0',
      modules: config.modules || {},
      execution: {
        strategy: 'hybrid',
        maxConcurrency: config.maxConcurrency || 8,
        timeout: config.timeout || 1800000, // 30 minutes
        errorHandling: 'compensate',
        retry: {
          maxAttempts: 3,
          backoffStrategy: 'linear',
          initialDelay: 2000,
          maxDelay: 60000,
          retryableErrors: ['NETWORK_ERROR', 'TIMEOUT', 'DATA_UNAVAILABLE']
        },
        checkpointing: {
          enabled: true,
          frequency: 'node',
          interval: 120000,
          storage: 'disk',
          compression: 'lz4',
          retention: 50
        },
        optimization: {
          enabled: true,
          strategies: ['parallel_expansion', 'data_locality'],
          threshold: 0.6,
          adaptive: false
        }
      },
      state: {
        persistence: 'disk',
        serialization: 'json',
        compression: 'lz4',
        cleanup: {
          enabled: true,
          retention: 50,
          compression: true,
          archive: true,
          conditions: ['success_based', 'time_based']
        },
        maxSize: 1024 * 1024 * 1024, // 1GB
        versioning: true,
        checkpointing: {
          enabled: true,
          frequency: 'node',
          interval: 120000,
          storage: 'disk',
          compression: 'lz4',
          retention: 50
        }
      },
      performance: this.getPerformanceConfig('data_intensive'),
      errorHandling: this.getErrorHandlingConfig('data_processing'),
      monitoring: this.getMonitoringConfig('data_pipeline')
    };
    
    return new GraphAgent(fullConfig);
  }
  
  /**
   * Creates an AI pipeline graph agent optimized for ML workflows.
   * 
   * @param config - Configuration for AI pipelines
   * @returns AI pipeline graph agent
   */
  static createAIPipelineAgent(config: GraphAgentPresetConfig): GraphAgent {
    const fullConfig: GraphAgentConfig = {
      id: `graph-agent-ai-${Date.now()}`,
      type: 'graph',
      name: config.name,
      description: config.description || 'AI pipeline graph agent',
      version: config.version || '1.0.0',
      modules: config.modules || {},
      execution: {
        strategy: 'sequential',
        maxConcurrency: config.maxConcurrency || 4,
        timeout: config.timeout || 3600000, // 1 hour
        errorHandling: 'fail_fast',
        retry: {
          maxAttempts: 2,
          backoffStrategy: 'exponential',
          initialDelay: 5000,
          maxDelay: 300000,
          retryableErrors: ['MODEL_UNAVAILABLE', 'RATE_LIMIT', 'TIMEOUT']
        },
        checkpointing: {
          enabled: true,
          frequency: 'node',
          interval: 300000,
          storage: 'disk',
          compression: 'gzip',
          retention: 10
        },
        optimization: {
          enabled: true,
          strategies: ['memoization', 'model_caching'],
          threshold: 0.8,
          adaptive: true
        }
      },
      state: {
        persistence: 'disk',
        serialization: 'json',
        compression: 'gzip',
        cleanup: {
          enabled: true,
          retention: 10,
          compression: true,
          archive: true,
          conditions: ['model_updated', 'time_based']
        },
        maxSize: 2048 * 1024 * 1024, // 2GB
        versioning: true,
        checkpointing: {
          enabled: true,
          frequency: 'node',
          interval: 300000,
          storage: 'disk',
          compression: 'gzip',
          retention: 10
        }
      },
      performance: this.getPerformanceConfig('ai_optimized'),
      errorHandling: this.getErrorHandlingConfig('ai_pipeline'),
      monitoring: this.getMonitoringConfig('ai_metrics')
    };
    
    return new GraphAgent(fullConfig);
  }
  
  /**
   * Creates a graph agent from a predefined template.
   * 
   * @param templateId - Template identifier
   * @param overrides - Configuration overrides
   * @returns Graph agent created from template
   */
  static createFromTemplate(
    templateId: string,
    overrides: Partial<GraphAgentConfig> = {}
  ): GraphAgent {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }
    
    const mergedConfig: GraphAgentConfig = {
      ...template.config,
      ...overrides,
      id: overrides.id || `graph-agent-${templateId}-${Date.now()}`,
      graph: template.graph,
      execution: {
        ...template.config.execution,
        ...overrides.execution
      },
      state: {
        ...template.config.state,
        ...overrides.state
      },
      performance: {
        ...template.config.performance,
        ...overrides.performance
      }
    } as GraphAgentConfig;
    
    return new GraphAgent(mergedConfig);
  }
  
  /**
   * Creates a custom graph agent with full configuration control.
   * 
   * @param config - Complete graph agent configuration
   * @returns Custom graph agent
   */
  static createAgent(config: GraphAgentConfig): GraphAgent {
    return new GraphAgent(config);
  }
  
  /**
   * Registers a new graph template for reuse.
   * 
   * @param template - Graph template definition
   */
  static registerTemplate(template: GraphTemplate): void {
    this.templates.set(template.id, template);
  }
  
  /**
   * Gets available template IDs.
   * 
   * @returns Array of template identifiers
   */
  static getAvailableTemplates(): string[] {
    return Array.from(this.templates.keys());
  }
  
  /**
   * Gets template details by ID.
   * 
   * @param templateId - Template identifier
   * @returns Template definition or undefined
   */
  static getTemplate(templateId: string): GraphTemplate | undefined {
    return this.templates.get(templateId);
  }
  
  /**
   * Creates a graph builder with preset configurations.
   * 
   * @param preset - Preset type
   * @returns Configured graph builder
   */
  static createGraphBuilder(preset?: 'simple' | 'parallel' | 'sequential' | 'ai-pipeline'): GraphBuilder {
    const builder = new GraphBuilder();
    
    switch (preset) {
      case 'simple':
        return builder.setConfig({
          metadata: {
            name: 'Simple Workflow',
            version: '1.0.0',
            tags: ['simple', 'basic']
          },
          performance: {
            estimatedDuration: 60000,
            resourceIntensity: 'low',
            scalability: 'linear',
            memoryConcerns: false,
            cpuIntensive: false
          }
        });
        
      case 'parallel':
        return builder.setConfig({
          metadata: {
            name: 'Parallel Workflow',
            version: '1.0.0',
            tags: ['parallel', 'high-throughput']
          },
          performance: {
            estimatedDuration: 30000,
            resourceIntensity: 'medium',
            scalability: 'parallel',
            memoryConcerns: false,
            cpuIntensive: true
          }
        });
        
      case 'sequential':
        return builder.setConfig({
          metadata: {
            name: 'Sequential Workflow',
            version: '1.0.0',
            tags: ['sequential', 'ordered']
          },
          performance: {
            estimatedDuration: 120000,
            resourceIntensity: 'low',
            scalability: 'linear',
            memoryConcerns: false,
            cpuIntensive: false
          }
        });
        
      case 'ai-pipeline':
        return builder.setConfig({
          metadata: {
            name: 'AI Pipeline',
            version: '1.0.0',
            tags: ['ai', 'ml', 'pipeline']
          },
          performance: {
            estimatedDuration: 300000,
            resourceIntensity: 'high',
            scalability: 'sequential',
            memoryConcerns: true,
            cpuIntensive: true
          }
        });
        
      default:
        return builder;
    }
  }
  
  // ============================================================================
  // Private Helper Methods
  // ============================================================================
  
  /**
   * Gets performance configuration by profile type.
   * 
   * @param profile - Performance profile
   * @returns Performance configuration
   * @private
   */
  private static getPerformanceConfig(profile: string): GraphPerformanceConfig {
    const profiles = {
      balanced: {
        nodePoolSize: 4,
        memory: {
          limit: 500000000,
          gc: true,
          monitoring: true,
          alertThreshold: 0.8
        },
        optimization: {
          enabled: true,
          parallelism: true,
          nodeCoalescing: false,
          lazyEvaluation: true,
          memoization: false
        },
        monitoring: {
          enabled: true,
          metrics: ['duration', 'memory'],
          sampling: 1.0,
          alerting: true,
          storage: 'memory'
        },
        limits: {
          maxMemory: 500000000,
          maxCpu: 80,
          maxDisk: 5000000000,
          maxNetwork: 500000000,
          maxDuration: 300000,
          maxNodes: 100
        }
      },
      high_performance: {
        nodePoolSize: 16,
        memory: {
          limit: 2000000000,
          gc: true,
          monitoring: true,
          alertThreshold: 0.9
        },
        optimization: {
          enabled: true,
          parallelism: true,
          nodeCoalescing: true,
          lazyEvaluation: true,
          memoization: true
        },
        monitoring: {
          enabled: true,
          metrics: ['duration', 'memory', 'cpu'],
          sampling: 1.0,
          alerting: true,
          storage: 'memory'
        },
        limits: {
          maxMemory: 2000000000,
          maxCpu: 95,
          maxDisk: 20000000000,
          maxNetwork: 2000000000,
          maxDuration: 600000,
          maxNodes: 1000
        }
      },
      data_intensive: {
        nodePoolSize: 8,
        memory: {
          limit: 4000000000,
          gc: true,
          monitoring: true,
          alertThreshold: 0.85
        },
        optimization: {
          enabled: true,
          parallelism: true,
          nodeCoalescing: false,
          lazyEvaluation: false,
          memoization: false
        },
        monitoring: {
          enabled: true,
          metrics: ['duration', 'memory', 'disk'],
          sampling: 0.1,
          alerting: true,
          storage: 'disk'
        },
        limits: {
          maxMemory: 4000000000,
          maxCpu: 70,
          maxDisk: 100000000000,
          maxNetwork: 5000000000,
          maxDuration: 1800000,
          maxNodes: 200
        }
      },
      ai_optimized: {
        nodePoolSize: 4,
        memory: {
          limit: 8000000000,
          gc: false,
          monitoring: true,
          alertThreshold: 0.9
        },
        optimization: {
          enabled: true,
          parallelism: false,
          nodeCoalescing: false,
          lazyEvaluation: true,
          memoization: true
        },
        monitoring: {
          enabled: true,
          metrics: ['duration', 'memory', 'cpu'],
          sampling: 1.0,
          alerting: true,
          storage: 'disk'
        },
        limits: {
          maxMemory: 8000000000,
          maxCpu: 100,
          maxDisk: 50000000000,
          maxNetwork: 1000000000,
          maxDuration: 3600000,
          maxNodes: 50
        }
      }
    };
    
    return profiles[profile as keyof typeof profiles] || profiles.balanced;
  }
  
  /**
   * Gets error handling configuration by profile type.
   * 
   * @param profile - Error handling profile
   * @returns Error handling configuration
   * @private
   */
  private static getErrorHandlingConfig(profile: string): GraphErrorConfig {
    const profiles = {
      default: {
        strategy: 'fail_fast' as const,
        propagation: {
          strategy: 'immediate' as const,
          timeout: 5000,
          retryLimit: 3
        },
        recovery: {
          enabled: true,
          strategies: ['retry', 'skip'],
          checkpoints: true,
          compensation: false
        },
        reporting: {
          enabled: true,
          destinations: ['console'],
          format: 'json' as const,
          includeStackTrace: true
        },
        circuitBreaker: {
          enabled: false,
          threshold: 5,
          timeout: 60000,
          recovery: 30000
        }
      },
      resilient: {
        strategy: 'continue_on_error' as const,
        propagation: {
          strategy: 'batched' as const,
          timeout: 10000,
          retryLimit: 5
        },
        recovery: {
          enabled: true,
          strategies: ['retry', 'compensate', 'substitute'],
          checkpoints: true,
          compensation: true
        },
        reporting: {
          enabled: true,
          destinations: ['console', 'file'],
          format: 'json' as const,
          includeStackTrace: true
        },
        circuitBreaker: {
          enabled: true,
          threshold: 10,
          timeout: 120000,
          recovery: 60000
        }
      },
      data_processing: {
        strategy: 'compensate' as const,
        propagation: {
          strategy: 'delayed' as const,
          timeout: 30000,
          retryLimit: 3
        },
        recovery: {
          enabled: true,
          strategies: ['compensate', 'rollback'],
          checkpoints: true,
          compensation: true
        },
        reporting: {
          enabled: true,
          destinations: ['file', 'remote'],
          format: 'structured' as const,
          includeStackTrace: false
        },
        circuitBreaker: {
          enabled: true,
          threshold: 3,
          timeout: 300000,
          recovery: 180000
        }
      },
      ai_pipeline: {
        strategy: 'fail_fast' as const,
        propagation: {
          strategy: 'immediate' as const,
          timeout: 15000,
          retryLimit: 2
        },
        recovery: {
          enabled: true,
          strategies: ['retry', 'fallback'],
          checkpoints: true,
          compensation: false
        },
        reporting: {
          enabled: true,
          destinations: ['console', 'remote'],
          format: 'json' as const,
          includeStackTrace: true
        },
        circuitBreaker: {
          enabled: true,
          threshold: 2,
          timeout: 600000,
          recovery: 300000
        }
      }
    };
    
    return profiles[profile as keyof typeof profiles] || profiles.default;
  }
  
  /**
   * Gets monitoring configuration by profile type.
   * 
   * @param profile - Monitoring profile
   * @returns Monitoring configuration
   * @private
   */
  private static getMonitoringConfig(profile: string): GraphMonitoringConfig {
    const profiles = {
      basic: {
        metrics: {
          enabled: true,
          collectors: ['default'],
          exporters: ['console'],
          sampling: 1.0,
          retention: 3600
        },
        tracing: {
          enabled: false,
          sampler: 'never' as const,
          probability: 0.0,
          exporters: []
        },
        logging: {
          level: 'info' as const,
          format: 'text' as const,
          destinations: ['console'],
          includeStack: false
        },
        alerting: {
          enabled: false,
          rules: [],
          destinations: [],
          throttling: 300000
        },
        healthCheck: {
          enabled: true,
          interval: 60000,
          timeout: 5000,
          checks: ['basic']
        }
      },
      comprehensive: {
        metrics: {
          enabled: true,
          collectors: ['default', 'performance', 'resource'],
          exporters: ['console', 'prometheus'],
          sampling: 1.0,
          retention: 86400
        },
        tracing: {
          enabled: true,
          sampler: 'always' as const,
          probability: 1.0,
          exporters: ['jaeger']
        },
        logging: {
          level: 'debug' as const,
          format: 'json' as const,
          destinations: ['console', 'file'],
          includeStack: true
        },
        alerting: {
          enabled: true,
          rules: ['error_rate', 'latency', 'resource_usage'],
          destinations: ['email', 'slack'],
          throttling: 60000
        },
        healthCheck: {
          enabled: true,
          interval: 30000,
          timeout: 10000,
          checks: ['basic', 'resource', 'connectivity']
        }
      },
      data_pipeline: {
        metrics: {
          enabled: true,
          collectors: ['default', 'data_flow'],
          exporters: ['prometheus', 'influxdb'],
          sampling: 0.1,
          retention: 604800
        },
        tracing: {
          enabled: true,
          sampler: 'probabilistic' as const,
          probability: 0.1,
          exporters: ['jaeger']
        },
        logging: {
          level: 'info' as const,
          format: 'structured' as const,
          destinations: ['file', 'elasticsearch'],
          includeStack: false
        },
        alerting: {
          enabled: true,
          rules: ['throughput', 'error_rate', 'data_quality'],
          destinations: ['pagerduty'],
          throttling: 300000
        },
        healthCheck: {
          enabled: true,
          interval: 120000,
          timeout: 30000,
          checks: ['data_source', 'pipeline_health']
        }
      },
      ai_metrics: {
        metrics: {
          enabled: true,
          collectors: ['default', 'model_performance'],
          exporters: ['prometheus', 'wandb'],
          sampling: 1.0,
          retention: 2592000
        },
        tracing: {
          enabled: true,
          sampler: 'always' as const,
          probability: 1.0,
          exporters: ['jaeger']
        },
        logging: {
          level: 'info' as const,
          format: 'json' as const,
          destinations: ['console', 'file'],
          includeStack: true
        },
        alerting: {
          enabled: true,
          rules: ['model_accuracy', 'inference_latency', 'resource_usage'],
          destinations: ['slack'],
          throttling: 180000
        },
        healthCheck: {
          enabled: true,
          interval: 300000,
          timeout: 60000,
          checks: ['model_availability', 'gpu_health']
        }
      }
    };
    
    return profiles[profile as keyof typeof profiles] || profiles.basic;
  }
}

// ============================================================================
// Predefined Templates
// ============================================================================

/**
 * Built-in graph templates for common use cases.
 */
export const BUILTIN_TEMPLATES: GraphTemplate[] = [
  {
    id: 'simple-sequential',
    name: 'Simple Sequential Workflow',
    description: 'Basic sequential processing workflow',
    category: 'workflow',
    graph: {
      id: 'simple-sequential',
      nodes: [
        {
          id: 'input',
          type: 'input' as NodeType,
          name: 'Input Node',
          config: {}
        },
        {
          id: 'process',
          type: 'transform' as NodeType,
          name: 'Process Node',
          config: {}
        },
        {
          id: 'output',
          type: 'output' as NodeType,
          name: 'Output Node',
          config: {}
        }
      ],
      edges: [
        {
          id: 'input-process',
          from: 'input',
          to: 'process',
          type: 'data'
        },
        {
          id: 'process-output',
          from: 'process',
          to: 'output',
          type: 'data'
        }
      ],
      metadata: {
        name: 'Simple Sequential Workflow',
        version: '1.0.0',
        tags: ['simple', 'sequential']
      }
    },
    config: {
      execution: {
        strategy: 'sequential',
        maxConcurrency: 1
      }
    }
  },
  {
    id: 'parallel-processing',
    name: 'Parallel Processing Pipeline',
    description: 'High-throughput parallel processing',
    category: 'data-processing',
    graph: {
      id: 'parallel-processing',
      nodes: [
        {
          id: 'input',
          type: 'input' as NodeType,
          name: 'Data Input',
          config: {}
        },
        {
          id: 'split',
          type: 'split' as NodeType,
          name: 'Data Splitter',
          config: {}
        },
        {
          id: 'process-1',
          type: 'transform' as NodeType,
          name: 'Processor 1',
          config: {}
        },
        {
          id: 'process-2',
          type: 'transform' as NodeType,
          name: 'Processor 2',
          config: {}
        },
        {
          id: 'process-3',
          type: 'transform' as NodeType,
          name: 'Processor 3',
          config: {}
        },
        {
          id: 'merge',
          type: 'merge' as NodeType,
          name: 'Data Merger',
          config: {}
        },
        {
          id: 'output',
          type: 'output' as NodeType,
          name: 'Final Output',
          config: {}
        }
      ],
      edges: [
        { id: 'input-split', from: 'input', to: 'split', type: 'data' },
        { id: 'split-p1', from: 'split', to: 'process-1', type: 'data' },
        { id: 'split-p2', from: 'split', to: 'process-2', type: 'data' },
        { id: 'split-p3', from: 'split', to: 'process-3', type: 'data' },
        { id: 'p1-merge', from: 'process-1', to: 'merge', type: 'data' },
        { id: 'p2-merge', from: 'process-2', to: 'merge', type: 'data' },
        { id: 'p3-merge', from: 'process-3', to: 'merge', type: 'data' },
        { id: 'merge-output', from: 'merge', to: 'output', type: 'data' }
      ],
      metadata: {
        name: 'Parallel Processing Pipeline',
        version: '1.0.0',
        tags: ['parallel', 'high-throughput']
      }
    },
    config: {
      execution: {
        strategy: 'parallel',
        maxConcurrency: 8
      }
    }
  }
];

// Register built-in templates
BUILTIN_TEMPLATES.forEach(template => {
  GraphAgentFactory.registerTemplate(template);
});

/**
 * Convenience function to create a basic graph agent.
 * 
 * @param name - Agent name
 * @param config - Optional configuration overrides
 * @returns Basic graph agent
 */
export function createBasicGraphAgent(
  name: string,
  config: Partial<GraphAgentPresetConfig> = {}
): GraphAgent {
  return GraphAgentFactory.createBasicAgent({ name, ...config });
}

/**
 * Convenience function to create a high-performance graph agent.
 * 
 * @param name - Agent name  
 * @param config - Optional configuration overrides
 * @returns High-performance graph agent
 */
export function createHighPerformanceGraphAgent(
  name: string,
  config: Partial<GraphAgentPresetConfig> = {}
): GraphAgent {
  return GraphAgentFactory.createHighPerformanceAgent({ name, ...config });
}

/**
 * Convenience function to create a data processing graph agent.
 * 
 * @param name - Agent name
 * @param config - Optional configuration overrides
 * @returns Data processing graph agent
 */
export function createDataProcessingGraphAgent(
  name: string,
  config: Partial<GraphAgentPresetConfig> = {}
): GraphAgent {
  return GraphAgentFactory.createDataProcessingAgent({ name, ...config });
}