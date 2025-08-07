/**
 * @fileoverview Interaction State Manager for human-in-the-loop interactions
 * @module modules/human-loop/interaction-state-manager
 * @requires events
 * @requires ./types
 * @requires ./errors
 * @requires ../streaming/types
 * 
 * This file implements the InteractionStateManager class that manages the complete
 * lifecycle of human interactions including creation, response handling, timeout
 * management, validation, and integration with streaming systems.
 * 
 * Key concepts:
 * - Complete interaction lifecycle management from creation to resolution
 * - Real-time streaming integration for immediate user notification
 * - Comprehensive timeout handling with retry mechanisms
 * - Input validation with type-specific rules and custom validators
 * - Rate limiting to prevent interaction spam and abuse
 * - Session-based interaction tracking and organization
 * - Event-driven architecture for integration with other systems
 * 
 * @example
 * ```typescript
 * import { InteractionStateManager } from './interaction-state-manager';
 * 
 * const stateManager = new InteractionStateManager(config, streamingManager);
 * 
 * // Create interaction
 * const interactionId = await stateManager.createInteraction('session-123', {
 *   type: 'approval',
 *   prompt: 'Approve this action?',
 *   options: { timeout: 300000, riskLevel: 'low' }
 * });
 * 
 * // Wait for response
 * const response = await stateManager.waitForResponse(interactionId);
 * ```
 * 
 * @see types.ts for InteractionState and related interfaces
 * @see errors.ts for interaction-specific error handling
 * @since 1.0.0
 */

import { EventEmitter } from 'events';
import { 
  InteractionRequest, 
  InteractionState, 
  InteractionStatus, 
  HumanLoopConfig,
  InputOptions,
  ChoiceOptions,
  ApprovalOptions,
  ConfirmationOptions
} from './types';
import { IStreamingManager } from '../streaming/types';
import {
  InteractionError,
  InteractionTimeoutError,
  InteractionNotFoundError,
  ValidationError,
  RateLimitError,
  ConcurrencyLimitError,
  createHumanLoopErrorContext
} from './errors';

/**
 * Manages the complete lifecycle of human-in-the-loop interactions.
 * 
 * The InteractionStateManager serves as the central coordinator for all
 * human interaction operations within AgentHub. It handles interaction
 * creation, state management, response processing, timeout handling,
 * validation, and integration with real-time streaming systems.
 * 
 * Architecture:
 * - Event-driven design for integration with other systems
 * - Map-based storage for fast interaction lookup and management
 * - Session-based organization for efficient interaction tracking
 * - Timeout management with automatic cleanup and retry mechanisms
 * - Comprehensive validation system for all interaction types
 * - Rate limiting to prevent abuse and ensure system stability
 * 
 * Integration Points:
 * - Streaming Manager: Real-time interaction prompts and responses
 * - Session State: Interaction history and context preservation
 * - Persistence Layer: Long-term interaction data storage
 * - Monitoring Systems: Performance metrics and error tracking
 * 
 * @remarks
 * The state manager is designed to handle high-volume interaction scenarios
 * with efficient memory usage and automatic cleanup of expired interactions.
 * All operations are designed to be non-blocking where possible.
 * 
 * @example
 * ```typescript
 * // Initialize with configuration and streaming
 * const stateManager = new InteractionStateManager({
 *   defaultTimeout: 300000,
 *   rateLimiting: {
 *     enabled: true,
 *     maxRequestsPerMinute: 10,
 *     maxConcurrentInteractions: 5
 *   }
 * }, streamingManager);
 * 
 * // Create complex interaction with validation
 * const interactionId = await stateManager.createInteraction('session-123', {
 *   type: 'input',
 *   prompt: 'Enter your email address:',
 *   options: {
 *     inputType: 'email',
 *     validation: {
 *       pattern: '^[^@]+@[^@]+\\.[^@]+$',
 *       required: true
 *     },
 *     timeout: 120000
 *   }
 * });
 * 
 * // Handle response with validation
 * await stateManager.respondToInteraction(interactionId, 'user@example.com');
 * ```
 * 
 * @public
 */
export class InteractionStateManager extends EventEmitter {
  /** Map of all active interactions by ID */
  private interactions: Map<string, InteractionState> = new Map();
  
  /** Map of session IDs to their interaction IDs */
  private sessionInteractions: Map<string, Set<string>> = new Map();
  
  /** Module configuration */
  private config: HumanLoopConfig;
  
  /** Optional streaming manager for real-time updates */
  private streamingManager?: IStreamingManager;
  
  /** Map of timeout handles for cleanup */
  private timeoutHandles: Map<string, NodeJS.Timeout> = new Map();
  
  /** Rate limiting tracking by session */
  private rateLimitTracking: Map<string, {
    requests: { timestamp: number }[];
    windowStart: number;
  }> = new Map();
  
  /**
   * Creates a new InteractionStateManager with configuration and streaming integration.
   * 
   * @param config - Human loop configuration options
   * @param streamingManager - Optional streaming manager for real-time updates
   * 
   * @example
   * ```typescript
   * const stateManager = new InteractionStateManager({
   *   defaultTimeout: 300000,
   *   maxTimeout: 1800000,
   *   retryPolicy: {
   *     maxRetries: 2,
   *     retryDelay: 5000,
   *     backoffMultiplier: 1.5
   *   },
   *   rateLimiting: {
   *     enabled: true,
   *     maxRequestsPerMinute: 10,
   *     maxConcurrentInteractions: 3
   *   }
   * }, streamingManager);
   * ```
   */
  constructor(config: HumanLoopConfig, streamingManager?: IStreamingManager) {
    super();
    this.config = config;
    this.streamingManager = streamingManager;
    
    // Start periodic cleanup of expired interactions
    setInterval(() => this.cleanupExpiredInteractions(), 60000); // Every minute
    
    console.log('✓ InteractionStateManager initialized');
  }
  
  /**
   * Creates a new human interaction with comprehensive configuration.
   * 
   * Handles the complete interaction creation process including validation,
   * rate limiting, timeout scheduling, and streaming integration.
   * 
   * @param sessionId - Session identifier for the interaction
   * @param request - Interaction request configuration
   * @returns Promise that resolves to the unique interaction ID
   * @throws {RateLimitError} If rate limits are exceeded
   * @throws {ConcurrencyLimitError} If concurrent interaction limits are exceeded
   * @throws {InteractionError} If interaction creation fails
   * 
   * @example
   * ```typescript
   * const interactionId = await stateManager.createInteraction('session-123', {
   *   type: 'choice',
   *   prompt: 'Select deployment environment:',
   *   options: {
   *     choices: [
   *       { id: 'dev', label: 'Development', value: 'dev' },
   *       { id: 'prod', label: 'Production', value: 'production' }
   *     ],
   *     timeout: 120000,
   *     required: true
   *   }
   * });
   * ```
   */
  async createInteraction(
    sessionId: string,
    request: InteractionRequest
  ): Promise<string> {
    console.log(`Creating interaction for session ${sessionId}:`, { type: request.type, prompt: request.prompt.substring(0, 50) });
    
    try {
      // Generate unique interaction ID
      const interactionId = request.id || this.generateInteractionId();
      
      // Check rate limiting
      await this.checkRateLimit(sessionId);
      
      // Check concurrency limits
      await this.checkConcurrencyLimit(sessionId);
      
      // Create interaction state
      const interaction: InteractionState = {
        id: interactionId,
        sessionId,
        type: request.type,
        status: 'pending',
        prompt: request.prompt,
        options: {
          timeout: request.options?.timeout || this.config.defaultTimeout || 300000,
          required: request.options?.required || false,
          retryOnTimeout: request.options?.retryOnTimeout || false,
          fallbackValue: request.options?.fallbackValue,
          priority: request.options?.priority || 'normal',
          metadata: request.options?.metadata || {},
          ...request.options
        },
        createdAt: new Date(),
        metadata: {
          ...request.metadata,
          userAgent: 'AgentHub',
          source: 'human-loop-module',
          sessionId,
          interactionType: request.type,
          createdBy: 'interaction-state-manager'
        }
      };
      
      // Calculate expiration time
      if (interaction.options.timeout) {
        const maxTimeout = this.config.maxTimeout || 3600000; // 1 hour default max
        const effectiveTimeout = Math.min(interaction.options.timeout, maxTimeout);
        interaction.expiresAt = new Date(Date.now() + effectiveTimeout);
      }
      
      // Store interaction
      this.interactions.set(interactionId, interaction);
      
      // Add to session tracking
      if (!this.sessionInteractions.has(sessionId)) {
        this.sessionInteractions.set(sessionId, new Set());
      }
      this.sessionInteractions.get(sessionId)!.add(interactionId);
      
      // Set up timeout handling
      if (interaction.expiresAt) {
        this.scheduleTimeout(interactionId, interaction.expiresAt);
      }
      
      // Update status to waiting
      interaction.status = 'waiting';
      
      // Stream interaction prompt if streaming is enabled
      if (this.streamingManager && this.config.streaming?.enabled) {
        await this.streamInteractionPrompt(interaction);
      }
      
      // Emit creation event
      this.emit('interactionCreated', interaction);
      
      console.log(`✓ Interaction created: ${interactionId} (expires: ${interaction.expiresAt?.toISOString() || 'never'})`);
      
      return interactionId;
      
    } catch (error) {
      const context = createHumanLoopErrorContext(undefined, sessionId, request.type, {
        prompt: request.prompt.substring(0, 100),
        options: request.options
      });
      
      if (error instanceof RateLimitError || error instanceof ConcurrencyLimitError) {
        throw error; // Re-throw rate limit and concurrency errors as-is
      }
      
      throw new InteractionError(
        'unknown',
        'creation',
        'Failed to create interaction',
        context,
        'Check interaction configuration and system resources'
      );
    }
  }
  
  /**
   * Processes a human response to a pending interaction.
   * 
   * Handles response validation, state updates, timeout cleanup,
   * and streaming notifications for completed interactions.
   * 
   * @param interactionId - ID of the interaction to respond to
   * @param response - The human-provided response
   * @param metadata - Optional response metadata
   * @returns Promise that resolves to success indicator
   * @throws {InteractionNotFoundError} If interaction doesn't exist
   * @throws {InteractionError} If interaction is not in waiting state
   * @throws {ValidationError} If response fails validation
   * 
   * @example
   * ```typescript
   * // Respond to approval interaction
   * await stateManager.respondToInteraction('interaction-123', true, {
   *   responseSource: 'web-interface',
   *   userAgent: 'Mozilla/5.0...'
   * });
   * 
   * // Respond to input interaction with validation
   * await stateManager.respondToInteraction('interaction-456', 'user@example.com');
   * ```
   */
  async respondToInteraction(
    interactionId: string,
    response: any,
    metadata?: Record<string, any>
  ): Promise<boolean> {
    console.log(`Processing response for interaction ${interactionId}:`, { response: JSON.stringify(response).substring(0, 100) });
    
    const interaction = this.interactions.get(interactionId);
    
    if (!interaction) {
      throw new InteractionNotFoundError(
        interactionId,
        createHumanLoopErrorContext(interactionId)
      );
    }
    
    if (interaction.status !== 'waiting') {
      throw new InteractionError(
        interactionId,
        'response',
        `Interaction is not awaiting response (current status: ${interaction.status})`,
        createHumanLoopErrorContext(interactionId, interaction.sessionId, interaction.type, {
          currentStatus: interaction.status
        }),
        'Ensure interaction is in waiting state before responding'
      );
    }
    
    try {
      // Validate response
      const validation = await this.validateResponse(interaction, response);
      if (!validation.isValid) {
        throw new ValidationError(
          'response',
          response,
          validation.error || 'Response validation failed',
          createHumanLoopErrorContext(interactionId, interaction.sessionId, interaction.type, {
            validationDetails: validation
          })
        );
      }
      
      // Update interaction state
      const now = new Date();
      interaction.response = response;
      interaction.responseTime = now;
      interaction.responseLatency = now.getTime() - interaction.createdAt.getTime();
      interaction.status = 'responded';
      interaction.metadata = {
        ...interaction.metadata,
        ...metadata,
        responseValidation: validation,
        responseProcessedAt: now.toISOString()
      };
      
      // Clear timeout
      this.clearTimeout(interactionId);
      
      // Stream response if enabled
      if (this.streamingManager && this.config.streaming?.enabled) {
        await this.streamInteractionResponse(interaction);
      }
      
      // Emit response event
      this.emit('interactionResponded', interaction);
      
      console.log(`✓ Interaction response processed: ${interactionId} (latency: ${interaction.responseLatency}ms)`);
      
      return true;
      
    } catch (error) {
      console.error(`Error processing response for interaction ${interactionId}:`, error);
      
      // Update interaction with error information
      interaction.metadata.responseError = {
        message: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      };
      
      throw error;
    }
  }
  
  /**
   * Cancels a pending interaction.
   * 
   * Handles interaction cancellation with proper cleanup and notification.
   * 
   * @param interactionId - ID of the interaction to cancel
   * @returns Promise that resolves to success indicator
   * @throws {InteractionNotFoundError} If interaction doesn't exist
   * @throws {InteractionError} If interaction cannot be cancelled
   */
  async cancelInteraction(interactionId: string): Promise<boolean> {
    console.log(`Cancelling interaction: ${interactionId}`);
    
    const interaction = this.interactions.get(interactionId);
    
    if (!interaction) {
      throw new InteractionNotFoundError(
        interactionId,
        createHumanLoopErrorContext(interactionId)
      );
    }
    
    if (interaction.status === 'responded') {
      throw new InteractionError(
        interactionId,
        'cancellation',
        'Cannot cancel already responded interaction',
        createHumanLoopErrorContext(interactionId, interaction.sessionId, interaction.type, {
          currentStatus: interaction.status
        }),
        'Check interaction status before attempting cancellation'
      );
    }
    
    // Update interaction state
    interaction.status = 'cancelled';
    interaction.metadata.cancelledAt = new Date().toISOString();
    
    // Clear timeout
    this.clearTimeout(interactionId);
    
    // Emit cancellation event
    this.emit('interactionCancelled', interaction);
    
    console.log(`✓ Interaction cancelled: ${interactionId}`);
    
    return true;
  }
  
  /**
   * Retrieves an interaction by ID.
   * 
   * @param interactionId - ID of the interaction to retrieve
   * @returns Interaction state or undefined if not found
   */
  getInteraction(interactionId: string): InteractionState | undefined {
    return this.interactions.get(interactionId);
  }
  
  /**
   * Retrieves all interactions for a session.
   * 
   * @param sessionId - Session identifier
   * @returns Array of interaction states for the session
   */
  getSessionInteractions(sessionId: string): InteractionState[] {
    const interactionIds = this.sessionInteractions.get(sessionId);
    if (!interactionIds) {
      return [];
    }
    
    return Array.from(interactionIds)
      .map(id => this.interactions.get(id))
      .filter(Boolean) as InteractionState[];
  }
  
  /**
   * Waits for a response to an interaction with timeout handling.
   * 
   * Returns a promise that resolves when the interaction receives a response,
   * times out, or is cancelled. Handles fallback values and retry logic.
   * 
   * @param interactionId - ID of the interaction to wait for
   * @returns Promise that resolves to the interaction response
   * @throws {InteractionNotFoundError} If interaction doesn't exist
   * @throws {InteractionTimeoutError} If interaction times out without fallback
   * @throws {InteractionError} If interaction is cancelled
   * 
   * @example
   * ```typescript
   * try {
   *   const response = await stateManager.waitForResponse('interaction-123');
   *   console.log('User responded:', response);
   * } catch (error) {
   *   if (error instanceof InteractionTimeoutError) {
   *     console.log('User did not respond in time');
   *   }
   * }
   * ```
   */
  async waitForResponse(interactionId: string): Promise<any> {
    const interaction = this.interactions.get(interactionId);
    
    if (!interaction) {
      throw new InteractionNotFoundError(
        interactionId,
        createHumanLoopErrorContext(interactionId)
      );
    }
    
    // If already responded, return the response
    if (interaction.status === 'responded') {
      return interaction.response;
    }
    
    // Return a promise that resolves when response is received
    return new Promise((resolve, reject) => {
      const responseHandler = (respondedInteraction: InteractionState) => {
        if (respondedInteraction.id === interactionId) {
          this.off('interactionResponded', responseHandler);
          this.off('interactionTimeout', timeoutHandler);
          this.off('interactionCancelled', cancelHandler);
          resolve(respondedInteraction.response);
        }
      };
      
      const timeoutHandler = (timedOutInteraction: InteractionState) => {
        if (timedOutInteraction.id === interactionId) {
          this.off('interactionResponded', responseHandler);
          this.off('interactionTimeout', timeoutHandler);
          this.off('interactionCancelled', cancelHandler);
          
          // Use fallback value if available
          if (interaction.options.fallbackValue !== undefined) {
            console.log(`Using fallback value for timed out interaction ${interactionId}:`, interaction.options.fallbackValue);
            resolve(interaction.options.fallbackValue);
          } else {
            reject(new InteractionTimeoutError(
              interactionId,
              interaction.options.timeout || 0,
              createHumanLoopErrorContext(interactionId, interaction.sessionId, interaction.type)
            ));
          }
        }
      };
      
      const cancelHandler = (cancelledInteraction: InteractionState) => {
        if (cancelledInteraction.id === interactionId) {
          this.off('interactionResponded', responseHandler);
          this.off('interactionTimeout', timeoutHandler);
          this.off('interactionCancelled', cancelHandler);
          reject(new InteractionError(
            interactionId,
            'wait',
            'Interaction was cancelled',
            createHumanLoopErrorContext(interactionId, interaction.sessionId, interaction.type),
            'Handle interaction cancellation gracefully'
          ));
        }
      };
      
      // Set up event listeners
      this.on('interactionResponded', responseHandler);
      this.on('interactionTimeout', timeoutHandler);
      this.on('interactionCancelled', cancelHandler);
    });
  }
  
  /**
   * Gets comprehensive statistics about interactions.
   * 
   * @returns Statistics object with counts and metrics
   */
  getStatistics(): {
    totalInteractions: number;
    byStatus: Record<InteractionStatus, number>;
    byType: Record<string, number>;
    averageResponseTime: number;
  } {
    const interactions = Array.from(this.interactions.values());
    const stats = {
      totalInteractions: interactions.length,
      byStatus: {} as Record<InteractionStatus, number>,
      byType: {} as Record<string, number>,
      averageResponseTime: 0
    };
    
    // Count by status
    const statusCounts: Record<InteractionStatus, number> = {
      'pending': 0, 'waiting': 0, 'responded': 0,
      'timeout': 0, 'cancelled': 0, 'expired': 0, 'failed': 0
    };
    
    // Count by type and calculate response times
    const typeCounts: Record<string, number> = {};
    let totalResponseTime = 0;
    let responseCount = 0;
    
    for (const interaction of interactions) {
      statusCounts[interaction.status]++;
      typeCounts[interaction.type] = (typeCounts[interaction.type] || 0) + 1;
      
      if (interaction.responseLatency) {
        totalResponseTime += interaction.responseLatency;
        responseCount++;
      }
    }
    
    stats.byStatus = statusCounts;
    stats.byType = typeCounts;
    stats.averageResponseTime = responseCount > 0 ? totalResponseTime / responseCount : 0;
    
    return stats;
  }
  
  // Private helper methods
  
  /**
   * Generates a unique interaction ID.
   * 
   * @returns Unique interaction identifier
   * @private
   */
  private generateInteractionId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `interaction_${timestamp}_${random}`;
  }
  
  /**
   * Validates response based on interaction type and configuration.
   * 
   * @param interaction - Interaction state
   * @param response - Response to validate
   * @returns Validation result with success indicator and error message
   * @private
   */
  private async validateResponse(
    interaction: InteractionState,
    response: any
  ): Promise<{ isValid: boolean; error?: string }> {
    // Type-specific validation
    switch (interaction.type) {
      case 'approval':
        return this.validateApprovalResponse(response);
      
      case 'input':
        return this.validateInputResponse(interaction, response);
      
      case 'choice':
        return this.validateChoiceResponse(interaction, response);
      
      case 'confirmation':
        return this.validateConfirmationResponse(response);
      
      case 'custom':
        return this.validateCustomResponse(interaction, response);
      
      default:
        return { isValid: true };
    }
  }
  
  /**
   * Validates approval response.
   * 
   * @param response - Response to validate
   * @returns Validation result
   * @private
   */
  private validateApprovalResponse(response: any): { isValid: boolean; error?: string } {
    if (typeof response !== 'boolean') {
      return { isValid: false, error: 'Approval response must be boolean (true/false)' };
    }
    return { isValid: true };
  }
  
  /**
   * Validates input response based on input options.
   * 
   * @param interaction - Interaction state
   * @param response - Response to validate
   * @returns Validation result
   * @private
   */
  private validateInputResponse(
    interaction: InteractionState,
    response: any
  ): { isValid: boolean; error?: string } {
    const options = interaction.options as InputOptions;
    
    if (options.validation) {
      const validation = options.validation;
      
      // Check required
      if (validation.required && (!response || response.toString().trim() === '')) {
        return { isValid: false, error: 'Response is required' };
      }
      
      if (response && typeof response === 'string') {
        // Check length constraints
        if (validation.minLength && response.length < validation.minLength) {
          return { 
            isValid: false, 
            error: `Response must be at least ${validation.minLength} characters` 
          };
        }
        
        if (validation.maxLength && response.length > validation.maxLength) {
          return { 
            isValid: false, 
            error: `Response must not exceed ${validation.maxLength} characters` 
          };
        }
        
        // Check pattern
        if (validation.pattern && !new RegExp(validation.pattern).test(response)) {
          return { 
            isValid: false, 
            error: 'Response does not match required format' 
          };
        }
      }
      
      // Custom validator
      if (validation.customValidator && !validation.customValidator(response)) {
        return { 
          isValid: false, 
          error: 'Response failed custom validation' 
        };
      }
    }
    
    return { isValid: true };
  }
  
  /**
   * Validates choice response based on choice options.
   * 
   * @param interaction - Interaction state
   * @param response - Response to validate
   * @returns Validation result
   * @private
   */
  private validateChoiceResponse(
    interaction: InteractionState,
    response: any
  ): { isValid: boolean; error?: string } {
    const options = interaction.options as ChoiceOptions;
    
    if (options.multiSelect) {
      if (!Array.isArray(response)) {
        return { isValid: false, error: 'Multi-select response must be an array' };
      }
      
      if (options.minSelections && response.length < options.minSelections) {
        return { 
          isValid: false, 
          error: `Must select at least ${options.minSelections} option(s)` 
        };
      }
      
      if (options.maxSelections && response.length > options.maxSelections) {
        return { 
          isValid: false, 
          error: `Must select at most ${options.maxSelections} option(s)` 
        };
      }
    } else {
      if (Array.isArray(response)) {
        return { isValid: false, error: 'Single-select choice cannot accept array response' };
      }
    }
    
    return { isValid: true };
  }
  
  /**
   * Validates confirmation response.
   * 
   * @param response - Response to validate
   * @returns Validation result
   * @private
   */
  private validateConfirmationResponse(response: any): { isValid: boolean; error?: string } {
    if (typeof response !== 'boolean') {
      return { isValid: false, error: 'Confirmation response must be boolean (true/false)' };
    }
    return { isValid: true };
  }
  
  /**
   * Validates custom interaction response.
   * 
   * @param interaction - Interaction state
   * @param response - Response to validate
   * @returns Validation result
   * @private
   */
  private validateCustomResponse(
    interaction: InteractionState,
    response: any
  ): { isValid: boolean; error?: string } {
    const customOptions = interaction.options as any;
    
    // Use custom validator if provided
    if (customOptions.validator && typeof customOptions.validator === 'function') {
      try {
        const isValid = customOptions.validator(response);
        if (!isValid) {
          return { isValid: false, error: 'Response failed custom validation' };
        }
      } catch (error) {
        return { 
          isValid: false, 
          error: `Custom validation error: ${error instanceof Error ? error.message : String(error)}` 
        };
      }
    }
    
    // TODO: Implement JSON schema validation if schema is provided
    // This would require a JSON schema validator library
    
    return { isValid: true };
  }
  
  /**
   * Streams interaction prompt to client.
   * 
   * @param interaction - Interaction state
   * @returns Promise that resolves when streaming completes
   * @private
   */
  private async streamInteractionPrompt(interaction: InteractionState): Promise<void> {
    if (!this.streamingManager) return;
    
    try {
      this.streamingManager.streamHumanPrompt(
        interaction.sessionId,
        interaction.prompt,
        {
          type: interaction.type as any,
          timeout: interaction.options.timeout,
          required: interaction.options.required,
          metadata: {
            interactionId: interaction.id,
            ...interaction.metadata
          }
        }
      );
    } catch (error) {
      console.warn(`Failed to stream interaction prompt for ${interaction.id}:`, error);
    }
  }
  
  /**
   * Streams interaction response to client.
   * 
   * @param interaction - Interaction state
   * @returns Promise that resolves when streaming completes
   * @private
   */
  private async streamInteractionResponse(interaction: InteractionState): Promise<void> {
    if (!this.streamingManager) return;
    
    try {
      this.streamingManager.streamHumanResponse(
        interaction.sessionId,
        {
          interactionId: interaction.id,
          response: interaction.response,
          responseTime: interaction.responseTime?.toISOString(),
          responseLatency: interaction.responseLatency
        }
      );
    } catch (error) {
      console.warn(`Failed to stream interaction response for ${interaction.id}:`, error);
    }
  }
  
  /**
   * Checks rate limiting for a session.
   * 
   * @param sessionId - Session to check rate limits for
   * @throws {RateLimitError} If rate limits are exceeded
   * @private
   */
  private async checkRateLimit(sessionId: string): Promise<void> {
    if (!this.config.rateLimiting?.enabled) return;
    
    const now = Date.now();
    const maxRequestsPerMinute = this.config.rateLimiting.maxRequestsPerMinute || 10;
    const windowSize = 60000; // 1 minute
    
    // Get or create rate limit tracking for session
    let tracking = this.rateLimitTracking.get(sessionId);
    if (!tracking) {
      tracking = { requests: [], windowStart: now };
      this.rateLimitTracking.set(sessionId, tracking);
    }
    
    // Clean up old requests outside the window
    tracking.requests = tracking.requests.filter(req => now - req.timestamp < windowSize);
    
    // Check if limit is exceeded
    if (tracking.requests.length >= maxRequestsPerMinute) {
      throw new RateLimitError(
        sessionId,
        tracking.requests.length,
        maxRequestsPerMinute,
        createHumanLoopErrorContext(undefined, sessionId, undefined, {
          windowSize,
          timeUntilReset: windowSize - (now - tracking.requests[0].timestamp)
        })
      );
    }
    
    // Add current request
    tracking.requests.push({ timestamp: now });
  }
  
  /**
   * Checks concurrency limits for a session.
   * 
   * @param sessionId - Session to check concurrency limits for
   * @throws {ConcurrencyLimitError} If concurrency limits are exceeded
   * @private
   */
  private async checkConcurrencyLimit(sessionId: string): Promise<void> {
    if (!this.config.rateLimiting?.enabled) return;
    
    const maxConcurrentInteractions = this.config.rateLimiting.maxConcurrentInteractions || 5;
    const sessionInteractions = this.getSessionInteractions(sessionId);
    const activeInteractions = sessionInteractions.filter(
      interaction => interaction.status === 'waiting' || interaction.status === 'pending'
    );
    
    if (activeInteractions.length >= maxConcurrentInteractions) {
      throw new ConcurrencyLimitError(
        sessionId,
        activeInteractions.length,
        maxConcurrentInteractions,
        createHumanLoopErrorContext(undefined, sessionId, undefined, {
          activeInteractionIds: activeInteractions.map(i => i.id)
        })
      );
    }
  }
  
  /**
   * Schedules timeout handling for an interaction.
   * 
   * @param interactionId - Interaction ID
   * @param expiresAt - Expiration timestamp
   * @private
   */
  private scheduleTimeout(interactionId: string, expiresAt: Date): void {
    const delay = expiresAt.getTime() - Date.now();
    
    if (delay <= 0) {
      // Already expired
      this.handleInteractionTimeout(interactionId);
      return;
    }
    
    const timeoutHandle = setTimeout(() => {
      this.handleInteractionTimeout(interactionId);
    }, delay);
    
    this.timeoutHandles.set(interactionId, timeoutHandle);
  }
  
  /**
   * Handles interaction timeout.
   * 
   * @param interactionId - Interaction ID that timed out
   * @private
   */
  private handleInteractionTimeout(interactionId: string): void {
    const interaction = this.interactions.get(interactionId);
    if (!interaction || interaction.status !== 'waiting') {
      return; // Already handled or not waiting
    }
    
    console.log(`Interaction timed out: ${interactionId}`);
    
    // Update interaction state
    interaction.status = 'timeout';
    interaction.metadata.timeoutAt = new Date().toISOString();
    
    // Clean up timeout handle
    this.timeoutHandles.delete(interactionId);
    
    // Emit timeout event
    this.emit('interactionTimeout', interaction);
    
    // Handle retry if configured
    if (interaction.options.retryOnTimeout && this.shouldRetry(interaction)) {
      setTimeout(() => {
        this.retryInteraction(interaction);
      }, this.calculateRetryDelay(interaction));
    }
  }
  
  /**
   * Clears timeout for an interaction.
   * 
   * @param interactionId - Interaction ID
   * @private
   */
  private clearTimeout(interactionId: string): void {
    const timeoutHandle = this.timeoutHandles.get(interactionId);
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
      this.timeoutHandles.delete(interactionId);
    }
  }
  
  /**
   * Determines if an interaction should be retried.
   * 
   * @param interaction - Interaction state
   * @returns True if interaction should be retried
   * @private
   */
  private shouldRetry(interaction: InteractionState): boolean {
    const retryCount = interaction.metadata.retryCount || 0;
    const maxRetries = this.config.retryPolicy?.maxRetries || 0;
    
    return retryCount < maxRetries;
  }
  
  /**
   * Calculates retry delay with exponential backoff.
   * 
   * @param interaction - Interaction state
   * @returns Delay in milliseconds
   * @private
   */
  private calculateRetryDelay(interaction: InteractionState): number {
    const retryCount = interaction.metadata.retryCount || 0;
    const baseDelay = this.config.retryPolicy?.retryDelay || 5000;
    const backoffMultiplier = this.config.retryPolicy?.backoffMultiplier || 1.5;
    
    return baseDelay * Math.pow(backoffMultiplier, retryCount);
  }
  
  /**
   * Retries a timed-out interaction.
   * 
   * @param interaction - Interaction state
   * @private
   */
  private async retryInteraction(interaction: InteractionState): Promise<void> {
    const retryCount = (interaction.metadata.retryCount || 0) + 1;
    interaction.metadata.retryCount = retryCount;
    interaction.status = 'waiting';
    
    console.log(`Retrying interaction ${interaction.id} (attempt ${retryCount})`);
    
    // Schedule new timeout
    if (interaction.options.timeout) {
      const maxTimeout = this.config.maxTimeout || 3600000;
      const effectiveTimeout = Math.min(interaction.options.timeout, maxTimeout);
      interaction.expiresAt = new Date(Date.now() + effectiveTimeout);
      this.scheduleTimeout(interaction.id, interaction.expiresAt);
    }
    
    // Stream retry prompt
    if (this.streamingManager && this.config.streaming?.enabled) {
      await this.streamInteractionPrompt(interaction);
    }
    
    // Emit retry event
    this.emit('interactionRetry', interaction);
  }
  
  /**
   * Cleans up expired interactions periodically.
   * 
   * @private
   */
  private cleanupExpiredInteractions(): void {
    const now = Date.now();
    const retentionTime = 24 * 60 * 60 * 1000; // 24 hours
    const expiredInteractions: string[] = [];
    
    this.interactions.forEach((interaction, id) => {
      // Remove interactions that are completed and old
      if ((interaction.status === 'responded' || 
           interaction.status === 'timeout' || 
           interaction.status === 'cancelled' || 
           interaction.status === 'expired' ||
           interaction.status === 'failed') &&
          (now - interaction.createdAt.getTime() > retentionTime)) {
        expiredInteractions.push(id);
      }
    });
    
    // Clean up expired interactions
    for (const id of expiredInteractions) {
      const interaction = this.interactions.get(id);
      if (interaction) {
        // Remove from session tracking
        const sessionInteractions = this.sessionInteractions.get(interaction.sessionId);
        if (sessionInteractions) {
          sessionInteractions.delete(id);
          if (sessionInteractions.size === 0) {
            this.sessionInteractions.delete(interaction.sessionId);
          }
        }
        
        // Remove from interactions
        this.interactions.delete(id);
        
        // Clean up timeout
        this.clearTimeout(id);
      }
    }
    
    if (expiredInteractions.length > 0) {
      console.log(`Cleaned up ${expiredInteractions.length} expired interactions`);
    }
  }
}