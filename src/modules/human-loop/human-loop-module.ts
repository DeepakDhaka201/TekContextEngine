/**
 * @fileoverview Main Human-in-the-Loop Module implementation
 * @module modules/human-loop/human-loop-module
 * @requires events
 * @requires ./types
 * @requires ./errors
 * @requires ./interaction-state-manager
 * @requires ./auto-approval-engine
 * @requires ../registry/types
 * 
 * This file implements the main HumanLoopModule class that provides comprehensive
 * support for integrating human intelligence and oversight into automated agent
 * workflows. It orchestrates interaction management, auto-approval, persistence,
 * and integration with other AgentHub modules.
 * 
 * Key concepts:
 * - Comprehensive human interaction management for agent workflows
 * - Integration with streaming for real-time interaction prompts
 * - Auto-approval engine for rule-based automatic decisions
 * - Persistence layer for interaction data retention and audit trails
 * - Rate limiting and concurrency control for system stability
 * - Timeout handling with fallback values and retry mechanisms
 * - Support for multiple interaction types with validation
 * 
 * @example
 * ```typescript
 * import { HumanLoopModule } from './human-loop-module';
 * 
 * const humanLoop = new HumanLoopModule();
 * await humanLoop.initialize({
 *   defaultTimeout: 300000,
 *   streaming: { enabled: true },
 *   autoApproval: {
 *     enabled: true,
 *     rules: [lowRiskAutoApprovalRule]
 *   },
 *   persistence: { enabled: true, storage: 'database' }
 * });
 * 
 * // Request approval with auto-approval
 * const approved = await humanLoop.requestApproval(
 *   'session-123',
 *   'Delete temporary files?',
 *   { riskLevel: 'low', timeout: 60000 }
 * );
 * ```
 * 
 * @see types.ts for IHumanLoopModule interface and configuration types
 * @see interaction-state-manager.ts for interaction lifecycle management
 * @see auto-approval-engine.ts for automatic approval logic
 * @since 1.0.0
 */

import { EventEmitter } from 'events';
import { 
  IHumanLoopModule, 
  HumanLoopConfig, 
  ApprovalOptions, 
  InputOptions, 
  ChoiceOptions, 
  ConfirmationOptions,
  Choice,
  InteractionRequest,
  InteractionResponse,
  InteractionRecord,
  InteractionFilter,
  InteractionExport,
  CustomInteraction,
  InteractionStatus
} from './types';
import { HealthStatus } from '../registry/types';
import { InteractionStateManager } from './interaction-state-manager';
import { AutoApprovalEngine } from './auto-approval-engine';
import {
  HumanLoopError,
  InteractionNotFoundError,
  ConfigurationError,
  createHumanLoopErrorContext
} from './errors';
import { IStreamingManager } from '../streaming/types';

/**
 * Main Human-in-the-Loop Module implementation.
 * 
 * The HumanLoopModule serves as the primary interface for all human interaction
 * capabilities within AgentHub. It orchestrates complex workflows involving
 * human input, approval, and oversight while maintaining high performance
 * and reliability through sophisticated state management and integration patterns.
 * 
 * Architecture:
 * - Event-driven design for seamless integration with other modules
 * - Pluggable auto-approval engine for rule-based automatic decisions
 * - Optional persistence layer for data retention and audit compliance
 * - Streaming integration for real-time user interaction prompts
 * - Comprehensive error handling with recovery mechanisms
 * - Performance monitoring and metrics collection
 * 
 * Core Capabilities:
 * - Approval workflows with risk assessment and context-aware automation
 * - Input collection with comprehensive validation and type safety
 * - Choice selection with single and multi-select support
 * - Confirmation dialogs with safety mechanisms for critical operations
 * - Custom interactions with flexible schema and UI integration
 * - Bulk operations for complex multi-step workflows
 * - Historical data access and export for audit and analysis
 * 
 * Integration Points:
 * - Streaming Manager: Real-time interaction prompts and status updates
 * - Module Registry: Service discovery and dependency injection
 * - Session State: Context preservation and workflow continuity
 * - Monitoring Systems: Performance metrics and error tracking
 * 
 * @remarks
 * The module is designed to be highly configurable with sensible defaults
 * for rapid deployment while supporting complex enterprise requirements
 * through comprehensive configuration options.
 * 
 * @example
 * ```typescript
 * // Initialize with comprehensive configuration
 * const humanLoop = new HumanLoopModule();
 * await humanLoop.initialize({
 *   defaultTimeout: 300000,
 *   maxTimeout: 1800000,
 *   retryPolicy: {
 *     maxRetries: 2,
 *     retryDelay: 5000,
 *     backoffMultiplier: 1.5
 *   },
 *   persistence: {
 *     enabled: true,
 *     storage: 'database',
 *     retentionDays: 90
 *   },
 *   streaming: {
 *     enabled: true,
 *     realTimeUpdates: true
 *   },
 *   autoApproval: {
 *     enabled: true,
 *     rules: [
 *       {
 *         id: 'low-risk-business-hours',
 *         description: 'Auto-approve low risk operations during business hours',
 *         conditions: [
 *           { field: 'riskLevel', operator: 'equals', value: 'low', type: 'risk' },
 *           { field: 'hour', operator: 'greater_than', value: 8, type: 'time' },
 *           { field: 'hour', operator: 'less_than', value: 18, type: 'time' }
 *         ],
 *         action: 'approve'
 *       }
 *     ]
 *   },
 *   rateLimiting: {
 *     enabled: true,
 *     maxRequestsPerMinute: 10,
 *     maxConcurrentInteractions: 5
 *   },
 *   security: {
 *     encryption: true,
 *     auditLogging: true
 *   }
 * });
 * 
 * // Use in agent workflow
 * class InteractiveDataProcessor extends BaseAgent {
 *   async processData(data: any[]): Promise<any> {
 *     // Request approval for data processing
 *     const approved = await this.humanLoop.requestApproval(
 *       this.sessionId,
 *       `Process ${data.length} records for analysis?`,
 *       {
 *         riskLevel: 'low',
 *         context: 'Data analysis workflow',
 *         metadata: { recordCount: data.length }
 *       }
 *     );
 *     
 *     if (!approved) {
 *       throw new Error('Data processing not approved');
 *     }
 *     
 *     // Request processing method selection
 *     const method = await this.humanLoop.requestChoice(
 *       this.sessionId,
 *       'Select processing method:',
 *       [
 *         { id: 'fast', label: 'Fast Processing', value: 'fast' },
 *         { id: 'thorough', label: 'Thorough Analysis', value: 'thorough' }
 *       ]
 *     );
 *     
 *     return this.processWithMethod(data, method);
 *   }
 * }
 * ```
 * 
 * @public
 */
export class HumanLoopModule extends EventEmitter implements IHumanLoopModule {
  /** Module name for registry identification */
  readonly name = 'humanLoop';
  
  /** Module version for compatibility tracking */
  readonly version = '1.0.0';
  
  /** Interaction state management */
  private stateManager!: InteractionStateManager;
  
  /** Optional auto-approval engine */
  private autoApprovalEngine?: AutoApprovalEngine;
  
  /** Optional persistence layer */
  private persistence?: any; // TODO: Implement InteractionPersistence
  
  /** Module configuration */
  private config!: Required<HumanLoopConfig>;
  
  /** Initialization state */
  private initialized = false;
  
  /** Reference to streaming manager */
  private streamingManager?: IStreamingManager;
  
  /** Module statistics */
  private statistics = {
    totalInteractions: 0,
    autoApprovals: 0,
    humanApprovals: 0,
    rejections: 0,
    timeouts: 0,
    averageResponseTime: 0,
    startTime: Date.now()
  };
  
  /**
   * Initializes the Human-in-the-Loop module with comprehensive configuration.
   * 
   * Sets up all internal components including state management, auto-approval engine,
   * persistence layer, and integration with other AgentHub modules.
   * 
   * @param config - Module configuration options
   * @throws {ConfigurationError} If configuration is invalid
   * @throws {HumanLoopError} If initialization fails
   * 
   * @example
   * ```typescript
   * await humanLoop.initialize({
   *   defaultTimeout: 300000,
   *   streaming: { enabled: true },
   *   autoApproval: {
   *     enabled: true,
   *     rules: [{
   *       id: 'low-risk-auto-approve',
   *       description: 'Auto-approve low risk operations',
   *       conditions: [{ field: 'riskLevel', operator: 'equals', value: 'low', type: 'risk' }],
   *       action: 'approve'
   *     }]
   *   },
   *   persistence: { enabled: true, storage: 'memory', retentionDays: 30 }
   * });
   * ```
   */
  async initialize(config: HumanLoopConfig): Promise<void> {
    console.log('Initializing Human-in-the-Loop module...');
    
    try {
      // Apply configuration with comprehensive defaults
      this.config = {
        defaultTimeout: config.defaultTimeout ?? 300000, // 5 minutes
        maxTimeout: config.maxTimeout ?? 3600000,        // 1 hour
        retryPolicy: {
          maxRetries: config.retryPolicy?.maxRetries ?? 2,
          retryDelay: config.retryPolicy?.retryDelay ?? 5000,
          backoffMultiplier: config.retryPolicy?.backoffMultiplier ?? 1.5
        },
        persistence: {
          enabled: config.persistence?.enabled ?? false,
          storage: config.persistence?.storage ?? 'memory',
          retentionDays: config.persistence?.retentionDays ?? 30
        },
        streaming: {
          enabled: config.streaming?.enabled ?? true,
          realTimeUpdates: config.streaming?.realTimeUpdates ?? true
        },
        security: {
          encryption: config.security?.encryption ?? false,
          auditLogging: config.security?.auditLogging ?? true,
          ipWhitelist: config.security?.ipWhitelist
        },
        autoApproval: {
          enabled: config.autoApproval?.enabled ?? false,
          rules: config.autoApproval?.rules ?? []
        },
        rateLimiting: {
          enabled: config.rateLimiting?.enabled ?? true,
          maxRequestsPerMinute: config.rateLimiting?.maxRequestsPerMinute ?? 10,
          maxConcurrentInteractions: config.rateLimiting?.maxConcurrentInteractions ?? 5
        }
      };
      
      // Validate configuration
      this.validateConfiguration();
      
      // Get streaming manager reference if available
      // In a real implementation, this would use dependency injection
      this.streamingManager = undefined; // TODO: Get from module registry
      
      // Initialize interaction state manager
      this.stateManager = new InteractionStateManager(this.config, this.streamingManager);
      
      // Set up auto-approval engine if enabled
      if (this.config.autoApproval.enabled && this.config.autoApproval.rules.length > 0) {
        this.autoApprovalEngine = new AutoApprovalEngine(this.config.autoApproval.rules);
        console.log(`✓ Auto-approval engine initialized with ${this.config.autoApproval.rules.length} rules`);
      }
      
      // Set up persistence layer if enabled
      if (this.config.persistence.enabled) {
        // TODO: Initialize persistence based on storage type
        console.log(`✓ Persistence enabled (${this.config.persistence.storage})`);
      }
      
      // Forward events from state manager
      this.setupEventForwarding();
      
      this.initialized = true;
      
      console.log('✓ Human-in-the-Loop module initialized successfully', {
        defaultTimeout: this.config.defaultTimeout,
        autoApprovalEnabled: this.config.autoApproval.enabled,
        streamingEnabled: this.config.streaming.enabled,
        persistenceEnabled: this.config.persistence.enabled
      });
      
      this.emit('initialized', { timestamp: new Date() });
      
    } catch (error) {
      console.error('Human-in-the-Loop module initialization failed:', error);
      
      if (error instanceof ConfigurationError) {
        throw error;
      }
      
      throw new HumanLoopError(
        'INITIALIZATION_ERROR',
        'Failed to initialize Human-in-the-Loop module',
        createHumanLoopErrorContext(undefined, undefined, undefined, {
          config,
          error: error instanceof Error ? error.message : String(error)
        }),
        'Check module configuration and dependencies',
        'critical',
        error instanceof Error ? error : undefined
      );
    }
  }
  
  /**
   * Returns comprehensive health status of the Human-in-the-Loop module.
   * 
   * @returns Health status with detailed metrics and component status
   */
  async health(): Promise<HealthStatus> {
    try {
      if (!this.initialized) {
        return {
          status: 'unhealthy',
          message: 'Human-in-the-Loop module not initialized',
          details: { initialized: false }
        };
      }
      
      // Get interaction statistics
      const stateStats = this.stateManager.getStatistics();
      const autoApprovalStats = this.autoApprovalEngine?.getMetrics();
      
      // Calculate uptime
      const uptime = Date.now() - this.statistics.startTime;
      
      // Determine health status
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      const issues: string[] = [];
      
      // Check for high timeout rate
      if (stateStats.byStatus.timeout > stateStats.totalInteractions * 0.1) {
        issues.push('High timeout rate detected');
        status = 'degraded';
      }
      
      // Check average response time
      if (stateStats.averageResponseTime > this.config.defaultTimeout * 0.8) {
        issues.push('High average response time');
        status = 'degraded';
      }
      
      return {
        status,
        message: issues.length > 0 ? issues.join(', ') : 'Human-in-the-Loop module operational',
        details: {
          uptime,
          initialized: this.initialized,
          configuration: {
            autoApprovalEnabled: !!this.autoApprovalEngine,
            streamingEnabled: this.config.streaming.enabled,
            persistenceEnabled: this.config.persistence.enabled,
            rateLimitingEnabled: this.config.rateLimiting.enabled
          },
          interactions: {
            total: stateStats.totalInteractions,
            byStatus: stateStats.byStatus,
            byType: stateStats.byType,
            averageResponseTime: stateStats.averageResponseTime
          },
          autoApproval: autoApprovalStats ? {
            totalEvaluations: autoApprovalStats.totalEvaluations,
            approvals: autoApprovalStats.autoApprovals,
            rejections: autoApprovalStats.autoRejections,
            averageEvaluationTime: autoApprovalStats.averageEvaluationTime
          } : undefined,
          performance: {
            memoryUsage: process.memoryUsage().heapUsed,
            issues
          }
        }
      };
      
    } catch (error) {
      console.error('Health check failed:', error);
      
      return {
        status: 'unhealthy',
        message: `Health check failed: ${error instanceof Error ? error.message : String(error)}`,
        details: { 
          error: error instanceof Error ? error.message : String(error),
          initialized: this.initialized
        }
      };
    }
  }
  
  /**
   * Gracefully shuts down the module and cleans up resources.
   */
  async shutdown(): Promise<void> {
    console.log('Shutting down Human-in-the-Loop module...');
    
    try {
      // Close persistence connection if enabled
      if (this.persistence) {
        await this.persistence.shutdown();
      }
      
      // Remove all event listeners
      this.removeAllListeners();
      
      this.initialized = false;
      
      console.log('✓ Human-in-the-Loop module shutdown completed');
      
    } catch (error) {
      console.error('Error during Human-in-the-Loop module shutdown:', error);
      throw error;
    }
  }
  
  // Core interaction methods
  
  /**
   * Requests human approval for an operation or decision.
   * 
   * Supports auto-approval based on configurable rules and risk assessment.
   * Integrates with streaming to provide real-time approval prompts.
   * 
   * @param sessionId - Session identifier for the interaction
   * @param prompt - Human-readable approval prompt
   * @param options - Approval-specific configuration options
   * @returns Promise that resolves to approval decision (true/false)
   * @throws {HumanLoopError} If approval request fails
   * 
   * @example
   * ```typescript
   * const approved = await humanLoop.requestApproval(
   *   'session-123',
   *   'Deploy changes to production environment?',
   *   {
   *     riskLevel: 'high',
   *     context: 'Critical bug fix deployment',
   *     timeout: 600000, // 10 minutes
   *     metadata: { changeCount: 5, testsPassed: true }
   *   }
   * );
   * 
   * if (approved) {
   *   await deployToProduction();
   * } else {
   *   console.log('Deployment cancelled by user');
   * }
   * ```
   */
  async requestApproval(
    sessionId: string,
    prompt: string,
    options?: ApprovalOptions
  ): Promise<boolean> {
    this.ensureInitialized();
    
    console.log(`Requesting approval for session ${sessionId}:`, { 
      prompt: prompt.substring(0, 100), 
      riskLevel: options?.riskLevel 
    });
    
    try {
      this.statistics.totalInteractions++;
      
      // Check auto-approval first if enabled
      if (this.autoApprovalEngine && options) {
        const autoResult = await this.autoApprovalEngine.checkAutoApproval(
          prompt,
          options,
          { sessionId }
        );
        
        if (autoResult.shouldAutoApprove) {
          console.log(`Auto-approval decision: ${autoResult.approved ? 'APPROVED' : 'REJECTED'}`, {
            reason: autoResult.reason,
            sessionId,
            ruleId: autoResult.matchedRule?.id
          });
          
          // Update statistics
          if (autoResult.approved) {
            this.statistics.autoApprovals++;
          } else {
            this.statistics.rejections++;
          }
          
          // Emit auto-approval event
          this.emit('autoApproval', {
            sessionId,
            prompt,
            approved: autoResult.approved,
            reason: autoResult.reason,
            matchedRule: autoResult.matchedRule
          });
          
          return autoResult.approved;
        }
      }
      
      // Create human interaction
      const interactionId = await this.stateManager.createInteraction(sessionId, {
        type: 'approval',
        prompt,
        options
      });
      
      // Wait for response
      const response = await this.stateManager.waitForResponse(interactionId);
      
      // Update statistics
      if (response) {
        this.statistics.humanApprovals++;
      } else {
        this.statistics.rejections++;
      }
      
      console.log(`✓ Approval ${response ? 'granted' : 'denied'} for session ${sessionId}`);
      
      return response;
      
    } catch (error) {
      console.error(`Approval request failed for session ${sessionId}:`, error);
      this.statistics.rejections++;
      throw error;
    }
  }
  
  /**
   * Requests human input with validation and type constraints.
   * 
   * @param sessionId - Session identifier for the interaction
   * @param prompt - Human-readable input prompt
   * @param options - Input-specific configuration and validation options
   * @returns Promise that resolves to the provided input value
   * @throws {HumanLoopError} If input request fails
   */
  async requestInput(
    sessionId: string,
    prompt: string,
    options?: InputOptions
  ): Promise<any> {
    this.ensureInitialized();
    
    console.log(`Requesting input for session ${sessionId}:`, { 
      prompt: prompt.substring(0, 100), 
      inputType: options?.inputType 
    });
    
    try {
      this.statistics.totalInteractions++;
      
      const interactionId = await this.stateManager.createInteraction(sessionId, {
        type: 'input',
        prompt,
        options
      });
      
      const response = await this.stateManager.waitForResponse(interactionId);
      
      console.log(`✓ Input received for session ${sessionId}`);
      
      return response;
      
    } catch (error) {
      console.error(`Input request failed for session ${sessionId}:`, error);
      throw error;
    }
  }
  
  /**
   * Requests human choice selection from predefined options.
   * 
   * @param sessionId - Session identifier for the interaction
   * @param prompt - Human-readable choice prompt
   * @param choices - Array of available choices
   * @param options - Choice-specific configuration options
   * @returns Promise that resolves to selected choice ID or array of IDs
   * @throws {HumanLoopError} If choice request fails
   */
  async requestChoice(
    sessionId: string,
    prompt: string,
    choices: Choice[],
    options?: ChoiceOptions
  ): Promise<string> {
    this.ensureInitialized();
    
    console.log(`Requesting choice for session ${sessionId}:`, { 
      prompt: prompt.substring(0, 100), 
      choiceCount: choices.length 
    });
    
    try {
      this.statistics.totalInteractions++;
      
      const interactionId = await this.stateManager.createInteraction(sessionId, {
        type: 'choice',
        prompt,
        options: {
          ...options,
          choices
        } as any
      });
      
      const response = await this.stateManager.waitForResponse(interactionId);
      
      console.log(`✓ Choice selected for session ${sessionId}:`, response);
      
      return response;
      
    } catch (error) {
      console.error(`Choice request failed for session ${sessionId}:`, error);
      throw error;
    }
  }
  
  /**
   * Requests human confirmation for critical operations.
   * 
   * @param sessionId - Session identifier for the interaction
   * @param prompt - Human-readable confirmation prompt
   * @param options - Confirmation-specific configuration options
   * @returns Promise that resolves to confirmation decision (true/false)
   * @throws {HumanLoopError} If confirmation request fails
   */
  async requestConfirmation(
    sessionId: string,
    prompt: string,
    options?: ConfirmationOptions
  ): Promise<boolean> {
    this.ensureInitialized();
    
    console.log(`Requesting confirmation for session ${sessionId}:`, { 
      prompt: prompt.substring(0, 100), 
      dangerLevel: options?.dangerLevel 
    });
    
    try {
      this.statistics.totalInteractions++;
      
      const interactionId = await this.stateManager.createInteraction(sessionId, {
        type: 'confirmation',
        prompt,
        options
      });
      
      const response = await this.stateManager.waitForResponse(interactionId);
      
      console.log(`✓ Confirmation ${response ? 'confirmed' : 'rejected'} for session ${sessionId}`);
      
      return response;
      
    } catch (error) {
      console.error(`Confirmation request failed for session ${sessionId}:`, error);
      throw error;
    }
  }
  
  /**
   * Requests custom human interaction with flexible schema and UI.
   * 
   * @param sessionId - Session identifier for the interaction
   * @param interaction - Custom interaction configuration
   * @returns Promise that resolves to the interaction response
   * @throws {HumanLoopError} If custom interaction fails
   */
  async requestCustomInteraction<T>(
    sessionId: string,
    interaction: CustomInteraction
  ): Promise<T> {
    this.ensureInitialized();
    
    console.log(`Requesting custom interaction for session ${sessionId}:`, { 
      type: interaction.type, 
      prompt: interaction.prompt.substring(0, 100) 
    });
    
    try {
      this.statistics.totalInteractions++;
      
      const interactionId = await this.stateManager.createInteraction(sessionId, {
        type: 'custom',
        prompt: interaction.prompt,
        options: {
          ...interaction.options,
          customType: interaction.type,
          schema: interaction.schema,
          ui: interaction.ui,
          validator: interaction.validator
        } as any
      });
      
      const response = await this.stateManager.waitForResponse(interactionId);
      
      console.log(`✓ Custom interaction completed for session ${sessionId}`);
      
      return response;
      
    } catch (error) {
      console.error(`Custom interaction failed for session ${sessionId}:`, error);
      throw error;
    }
  }
  
  // Interaction lifecycle management
  
  /**
   * Cancels a pending interaction.
   * 
   * @param interactionId - Interaction identifier to cancel
   * @throws {HumanLoopError} If interaction cannot be cancelled
   */
  async cancelInteraction(interactionId: string): Promise<void> {
    this.ensureInitialized();
    
    console.log(`Cancelling interaction: ${interactionId}`);
    
    try {
      await this.stateManager.cancelInteraction(interactionId);
      
      console.log(`✓ Interaction cancelled: ${interactionId}`);
      
    } catch (error) {
      console.error(`Failed to cancel interaction ${interactionId}:`, error);
      throw error;
    }
  }
  
  /**
   * Gets the current status of an interaction.
   * 
   * @param interactionId - Interaction identifier to check
   * @returns Current interaction status
   */
  async getInteractionStatus(interactionId: string): Promise<InteractionStatus> {
    this.ensureInitialized();
    
    const interaction = this.stateManager.getInteraction(interactionId);
    return interaction?.status || 'pending';
  }
  
  // Bulk operations
  
  /**
   * Requests multiple interactions simultaneously.
   * 
   * @param sessionId - Session identifier for all interactions
   * @param interactions - Array of interaction requests
   * @returns Array of interaction responses with success/failure status
   */
  async requestMultiple(
    sessionId: string,
    interactions: InteractionRequest[]
  ): Promise<InteractionResponse[]> {
    this.ensureInitialized();
    
    console.log(`Requesting ${interactions.length} interactions for session ${sessionId}`);
    
    try {
      const promises = interactions.map(async (request) => {
        try {
          const interactionId = await this.stateManager.createInteraction(sessionId, request);
          const response = await this.stateManager.waitForResponse(interactionId);
          
          return {
            id: interactionId,
            success: true,
            response,
            metadata: {
              responseTime: Date.now(),
              attempts: 1,
              finalStatus: 'responded' as InteractionStatus
            }
          };
        } catch (error) {
          return {
            id: request.id || 'unknown',
            success: false,
            error: error instanceof Error ? error.message : String(error),
            metadata: {
              responseTime: Date.now(),
              attempts: 1,
              finalStatus: 'failed' as InteractionStatus
            }
          };
        }
      });
      
      const responses = await Promise.all(promises);
      
      console.log(`✓ Bulk interaction completed for session ${sessionId}: ${responses.filter(r => r.success).length}/${responses.length} successful`);
      
      return responses;
      
    } catch (error) {
      console.error(`Bulk interaction failed for session ${sessionId}:`, error);
      throw error;
    }
  }
  
  // Audit and history
  
  /**
   * Retrieves interaction history for a session.
   * 
   * @param sessionId - Session identifier
   * @param limit - Optional limit on number of records
   * @returns Array of historical interaction records
   */
  async getInteractionHistory(
    sessionId: string,
    limit?: number
  ): Promise<InteractionRecord[]> {
    this.ensureInitialized();
    
    if (this.persistence) {
      // Use persistence layer if available
      return await this.persistence.getInteractionHistory(sessionId, limit);
    }
    
    // Fallback to in-memory state
    const interactions = this.stateManager.getSessionInteractions(sessionId);
    const sorted = interactions
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    const limitedResults = limit ? sorted.slice(0, limit) : sorted;
    
    return limitedResults.map(this.convertToRecord);
  }
  
  /**
   * Exports interaction data based on filters.
   * 
   * @param filters - Export filter criteria
   * @returns Exported interaction data
   */
  async exportInteractionData(
    filters: InteractionFilter
  ): Promise<InteractionExport> {
    this.ensureInitialized();
    
    if (this.persistence) {
      return await this.persistence.exportInteractionData(filters);
    }
    
    throw new HumanLoopError(
      'PERSISTENCE_ERROR',
      'Persistence not enabled - cannot export interaction data',
      createHumanLoopErrorContext(undefined, filters.sessionId, undefined, { filters }),
      'Enable persistence configuration to use export functionality'
    );
  }
  
  // External response API
  
  /**
   * Allows external systems to respond to interactions.
   * 
   * @param interactionId - Interaction identifier
   * @param response - Response data
   * @param metadata - Optional response metadata
   * @returns Success indicator
   */
  async respondToInteraction(
    interactionId: string,
    response: any,
    metadata?: Record<string, any>
  ): Promise<boolean> {
    this.ensureInitialized();
    
    try {
      return await this.stateManager.respondToInteraction(interactionId, response, metadata);
    } catch (error) {
      console.error(`Failed to respond to interaction ${interactionId}:`, error);
      throw error;
    }
  }
  
  /**
   * Gets comprehensive module statistics.
   * 
   * @returns Current module statistics and metrics
   */
  getStatistics(): typeof this.statistics & { autoApprovalMetrics?: any } {
    const stats = { ...this.statistics };
    
    if (this.autoApprovalEngine) {
      (stats as any).autoApprovalMetrics = this.autoApprovalEngine.getMetrics();
    }
    
    return stats;
  }
  
  // Private helper methods
  
  /**
   * Ensures the module is initialized before operations.
   * 
   * @throws {HumanLoopError} If module is not initialized
   * @private
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new HumanLoopError(
        'NOT_INITIALIZED',
        'Human-in-the-Loop module not initialized',
        {},
        'Call initialize() before using module methods',
        'error'
      );
    }
  }
  
  /**
   * Validates module configuration.
   * 
   * @throws {ConfigurationError} If configuration is invalid
   * @private
   */
  private validateConfiguration(): void {
    // Validate timeout values
    if (this.config.defaultTimeout <= 0) {
      throw new ConfigurationError(
        'defaultTimeout',
        'Default timeout must be positive',
        { defaultTimeout: this.config.defaultTimeout }
      );
    }
    
    if (this.config.maxTimeout < this.config.defaultTimeout) {
      throw new ConfigurationError(
        'maxTimeout',
        'Max timeout must be greater than or equal to default timeout',
        { maxTimeout: this.config.maxTimeout, defaultTimeout: this.config.defaultTimeout }
      );
    }
    
    // Validate retry policy
    if (this.config.retryPolicy.maxRetries < 0) {
      throw new ConfigurationError(
        'retryPolicy.maxRetries',
        'Max retries must be non-negative',
        { maxRetries: this.config.retryPolicy.maxRetries }
      );
    }
    
    if (this.config.retryPolicy.retryDelay <= 0) {
      throw new ConfigurationError(
        'retryPolicy.retryDelay',
        'Retry delay must be positive',
        { retryDelay: this.config.retryPolicy.retryDelay }
      );
    }
    
    // Validate rate limiting
    if (this.config.rateLimiting.maxRequestsPerMinute <= 0) {
      throw new ConfigurationError(
        'rateLimiting.maxRequestsPerMinute',
        'Max requests per minute must be positive',
        { maxRequestsPerMinute: this.config.rateLimiting.maxRequestsPerMinute }
      );
    }
    
    if (this.config.rateLimiting.maxConcurrentInteractions <= 0) {
      throw new ConfigurationError(
        'rateLimiting.maxConcurrentInteractions',
        'Max concurrent interactions must be positive',
        { maxConcurrentInteractions: this.config.rateLimiting.maxConcurrentInteractions }
      );
    }
  }
  
  /**
   * Sets up event forwarding from state manager.
   * 
   * @private
   */
  private setupEventForwarding(): void {
    // Forward state manager events
    this.stateManager.on('interactionCreated', (interaction) => {
      this.emit('interactionCreated', interaction);
    });
    
    this.stateManager.on('interactionResponded', (interaction) => {
      this.emit('interactionResponded', interaction);
      
      // Update response time statistics
      if (interaction.responseLatency) {
        const currentAvg = this.statistics.averageResponseTime;
        const totalResponded = this.statistics.humanApprovals + this.statistics.rejections;
        this.statistics.averageResponseTime = 
          ((currentAvg * (totalResponded - 1)) + interaction.responseLatency) / totalResponded;
      }
      
      // Persist if enabled
      if (this.persistence) {
        this.persistence.saveInteraction(interaction).catch((error: any) => {
          console.error('Failed to persist interaction:', error);
        });
      }
    });
    
    this.stateManager.on('interactionTimeout', (interaction) => {
      this.statistics.timeouts++;
      this.emit('interactionTimeout', interaction);
    });
    
    this.stateManager.on('interactionCancelled', (interaction) => {
      this.emit('interactionCancelled', interaction);
    });
  }
  
  /**
   * Converts interaction state to interaction record.
   * 
   * @param interaction - Interaction state
   * @returns Interaction record
   * @private
   */
  private convertToRecord(interaction: any): InteractionRecord {
    return {
      id: interaction.id,
      sessionId: interaction.sessionId,
      type: interaction.type,
      prompt: interaction.prompt,
      response: interaction.response,
      status: interaction.status,
      createdAt: interaction.createdAt,
      responseTime: interaction.responseTime,
      responseLatency: interaction.responseLatency,
      metadata: interaction.metadata
    };
  }
}