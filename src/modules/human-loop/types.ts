/**
 * @fileoverview Type definitions for the Human-in-the-Loop Module
 * @module modules/human-loop/types
 * @requires ../registry/types
 * 
 * This file defines comprehensive types for the Human-in-the-Loop Module,
 * supporting interactive agent workflows, human approval systems, input collection,
 * choice selection, confirmations, and custom interaction types. The module enables
 * seamless integration of human intelligence with automated AI processing.
 * 
 * Key concepts:
 * - IHumanLoopModule: Primary interface for human interaction management
 * - Interaction types: Approval, input, choice, confirmation, and custom interactions
 * - State management: Complete interaction lifecycle tracking and persistence
 * - Auto-approval engine: Rule-based automatic approval for low-risk operations
 * - Integration patterns: Streaming, persistence, and audit trail capabilities
 * - Workflow branching: Conditional logic based on human responses
 * 
 * @example
 * ```typescript
 * import { IHumanLoopModule, HumanLoopConfig } from './types';
 * 
 * const config: HumanLoopConfig = {
 *   defaultTimeout: 300000,
 *   autoApproval: {
 *     enabled: true,
 *     rules: [{
 *       id: 'low-risk-auto-approve',
 *       description: 'Auto-approve low risk operations',
 *       conditions: [{ field: 'riskLevel', operator: 'equals', value: 'low', type: 'risk' }],
 *       action: 'approve'
 *     }]
 *   }
 * };
 * 
 * const approved = await humanLoop.requestApproval('session-123', 'Delete temp files?', {
 *   riskLevel: 'low',
 *   timeout: 60000
 * });
 * ```
 * 
 * @see ../streaming/types.ts for streaming integration patterns
 * @see ../registry/types.ts for base module interfaces
 * @since 1.0.0
 */

import { HealthStatus } from '../registry/types';

/**
 * Primary interface for the Human-in-the-Loop Module.
 * 
 * The Human-in-the-Loop Module provides comprehensive support for integrating
 * human intelligence and oversight into automated agent workflows. It handles
 * various interaction types including approvals, input collection, choice selection,
 * confirmations, and custom interaction patterns.
 * 
 * Features:
 * - Multiple interaction types with comprehensive configuration options
 * - Auto-approval engine with rule-based decision making
 * - Timeout handling with fallback values and retry mechanisms
 * - Integration with streaming for real-time interaction prompts
 * - Audit trails and interaction history for compliance
 * - Bulk operations for complex multi-step approval workflows
 * - Persistence layer for interaction data retention
 * - Rate limiting to prevent interaction spam
 * 
 * @remarks
 * The module is designed to be non-blocking where possible, with asynchronous
 * patterns and timeout handling to ensure agent workflows can continue even
 * when human input is delayed or unavailable.
 * 
 * @example
 * ```typescript
 * // Initialize module
 * const humanLoop = new HumanLoopModule();
 * await humanLoop.initialize({
 *   defaultTimeout: 300000,
 *   streaming: { enabled: true },
 *   autoApproval: {
 *     enabled: true,
 *     rules: [lowRiskAutoApprovalRule]
 *   }
 * });
 * 
 * // Request approval with context
 * const approved = await humanLoop.requestApproval(
 *   'session-123',
 *   'Delete 15 temporary files?',
 *   {
 *     riskLevel: 'low',
 *     context: 'Cleanup operation after data processing',
 *     timeout: 120000
 *   }
 * );
 * 
 * // Request validated input
 * const email = await humanLoop.requestInput(
 *   'session-123',
 *   'Enter notification email:',
 *   {
 *     inputType: 'email',
 *     validation: { pattern: '^[^@]+@[^@]+\\.[^@]+$', required: true }
 *   }
 * );
 * ```
 * 
 * @public
 */
export interface IHumanLoopModule {
  /** Module identification */
  readonly name: string;
  readonly version: string;
  
  // Lifecycle management
  /**
   * Initializes the Human-in-the-Loop module with configuration.
   * 
   * @param config - Human-in-the-loop configuration options
   * @throws {HumanLoopError} If initialization fails
   */
  initialize(config: HumanLoopConfig): Promise<void>;
  
  /**
   * Returns the health status of the Human-in-the-Loop module.
   * 
   * @returns Health status with interaction metrics
   */
  health(): Promise<HealthStatus>;
  
  /**
   * Gracefully shuts down the module and cleans up resources.
   */
  shutdown(): Promise<void>;
  
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
   *     autoApprove: {
   *       conditions: [{ field: 'hour', operator: 'greater_than', value: 9, type: 'time' }],
   *       maxRisk: 'medium'
   *     }
   *   }
   * );
   * ```
   */
  requestApproval(
    sessionId: string,
    prompt: string,
    options?: ApprovalOptions
  ): Promise<boolean>;
  
  /**
   * Requests human input with validation and type constraints.
   * 
   * Supports various input types including text, numbers, email, URLs,
   * and JSON with comprehensive validation rules.
   * 
   * @param sessionId - Session identifier for the interaction
   * @param prompt - Human-readable input prompt
   * @param options - Input-specific configuration and validation options
   * @returns Promise that resolves to the provided input value
   * @throws {HumanLoopError} If input request fails or validation fails
   * 
   * @example
   * ```typescript
   * const apiKey = await humanLoop.requestInput(
   *   'session-123',
   *   'Enter API key for external service:',
   *   {
   *     inputType: 'text',
   *     validation: {
   *       pattern: '^[A-Za-z0-9]{32}$',
   *       required: true,
   *       minLength: 32,
   *       maxLength: 32
   *     },
   *     placeholder: 'sk-...',
   *     timeout: 300000
   *   }
   * );
   * ```
   */
  requestInput(
    sessionId: string,
    prompt: string,
    options?: InputOptions
  ): Promise<any>;
  
  /**
   * Requests human choice selection from predefined options.
   * 
   * Supports single and multi-select modes with option metadata,
   * randomization, and selection constraints.
   * 
   * @param sessionId - Session identifier for the interaction
   * @param prompt - Human-readable choice prompt
   * @param choices - Array of available choices
   * @param options - Choice-specific configuration options
   * @returns Promise that resolves to selected choice ID or array of IDs
   * @throws {HumanLoopError} If choice request fails
   * 
   * @example
   * ```typescript
   * const environment = await humanLoop.requestChoice(
   *   'session-123',
   *   'Select deployment environment:',
   *   [
   *     { id: 'dev', label: 'Development', value: 'dev', description: 'Development environment' },
   *     { id: 'staging', label: 'Staging', value: 'staging', description: 'Pre-production testing' },
   *     { id: 'prod', label: 'Production', value: 'production', description: 'Live production environment' }
   *   ],
   *   {
   *     timeout: 120000,
   *     randomizeOrder: false
   *   }
   * );
   * ```
   */
  requestChoice(
    sessionId: string,
    prompt: string,
    choices: Choice[],
    options?: ChoiceOptions
  ): Promise<string>;
  
  /**
   * Requests human confirmation for critical operations.
   * 
   * Supports danger level indication, double confirmation requirements,
   * and custom confirmation text validation.
   * 
   * @param sessionId - Session identifier for the interaction
   * @param prompt - Human-readable confirmation prompt
   * @param options - Confirmation-specific configuration options
   * @returns Promise that resolves to confirmation decision (true/false)
   * @throws {HumanLoopError} If confirmation request fails
   * 
   * @example
   * ```typescript
   * const confirmed = await humanLoop.requestConfirmation(
   *   'session-123',
   *   'This will permanently delete all user data. Type "DELETE" to confirm:',
   *   {
   *     dangerLevel: 'critical',
   *     confirmText: 'DELETE',
   *     doubleConfirm: true,
   *     timeout: 300000
   *   }
   * );
   * ```
   */
  requestConfirmation(
    sessionId: string,
    prompt: string,
    options?: ConfirmationOptions
  ): Promise<boolean>;
  
  /**
   * Requests custom human interaction with flexible schema and UI.
   * 
   * Allows for complex custom interaction types with JSON schema validation,
   * custom UI components, and flexible response handling.
   * 
   * @param sessionId - Session identifier for the interaction
   * @param interaction - Custom interaction configuration
   * @returns Promise that resolves to the interaction response
   * @throws {HumanLoopError} If custom interaction fails
   * 
   * @example
   * ```typescript
   * const config = await humanLoop.requestCustomInteraction<DatabaseConfig>(
   *   'session-123',
   *   {
   *     type: 'database_config',
   *     prompt: 'Configure database connection:',
   *     schema: {
   *       type: 'object',
   *       properties: {
   *         host: { type: 'string' },
   *         port: { type: 'number', minimum: 1, maximum: 65535 },
   *         database: { type: 'string' }
   *       },
   *       required: ['host', 'port', 'database']
   *     },
   *     ui: { component: 'DatabaseConfigForm', layout: 'modal' },
   *     options: { timeout: 600000 }
   *   }
   * );
   * ```
   */
  requestCustomInteraction<T>(
    sessionId: string,
    interaction: CustomInteraction
  ): Promise<T>;
  
  // Interaction lifecycle management
  /**
   * Cancels a pending interaction.
   * 
   * @param interactionId - Interaction identifier to cancel
   * @throws {HumanLoopError} If interaction cannot be cancelled
   */
  cancelInteraction(interactionId: string): Promise<void>;
  
  /**
   * Gets the current status of an interaction.
   * 
   * @param interactionId - Interaction identifier to check
   * @returns Current interaction status
   */
  getInteractionStatus(interactionId: string): Promise<InteractionStatus>;
  
  // Bulk operations
  /**
   * Requests multiple interactions simultaneously.
   * 
   * Useful for complex approval workflows or multi-step input collection.
   * Handles partial failures gracefully and provides detailed response metadata.
   * 
   * @param sessionId - Session identifier for all interactions
   * @param interactions - Array of interaction requests
   * @returns Array of interaction responses with success/failure status
   * 
   * @example
   * ```typescript
   * const responses = await humanLoop.requestMultiple('session-123', [
   *   { type: 'approval', prompt: 'Approve step 1?', options: { timeout: 60000 } },
   *   { type: 'input', prompt: 'Enter configuration:', options: { inputType: 'json' } },
   *   { type: 'choice', prompt: 'Select method:', choices: methodChoices }
   * ]);
   * ```
   */
  requestMultiple(
    sessionId: string,
    interactions: InteractionRequest[]
  ): Promise<InteractionResponse[]>;
  
  // Audit and history
  /**
   * Retrieves interaction history for a session.
   * 
   * @param sessionId - Session identifier
   * @param limit - Optional limit on number of records
   * @returns Array of historical interaction records
   */
  getInteractionHistory(
    sessionId: string,
    limit?: number
  ): Promise<InteractionRecord[]>;
  
  /**
   * Exports interaction data based on filters.
   * 
   * @param filters - Export filter criteria
   * @returns Exported interaction data
   */
  exportInteractionData(
    filters: InteractionFilter
  ): Promise<InteractionExport>;
  
  // External response API
  /**
   * Allows external systems to respond to interactions.
   * 
   * This method is typically called by web interfaces or external
   * systems to provide responses to pending interactions.
   * 
   * @param interactionId - Interaction identifier
   * @param response - Response data
   * @param metadata - Optional response metadata
   * @returns Success indicator
   */
  respondToInteraction(
    interactionId: string,
    response: any,
    metadata?: Record<string, any>
  ): Promise<boolean>;
}

/**
 * Core interaction request structure.
 * 
 * Defines the standard format for requesting human interactions
 * across all interaction types.
 * 
 * @public
 */
export interface InteractionRequest {
  /** Optional unique identifier for the interaction */
  id?: string;
  
  /** Type of interaction requested */
  type: InteractionType;
  
  /** Human-readable prompt or question */
  prompt: string;
  
  /** Type-specific configuration options */
  options?: InteractionOptions;
  
  /** Additional metadata for context and tracking */
  metadata?: Record<string, any>;
}

/**
 * Supported interaction types.
 * 
 * Each type has specific behavior patterns and configuration options
 * suited to different human interaction scenarios.
 * 
 * @public
 */
export type InteractionType = 
  | 'approval'      // Binary approval/rejection decision
  | 'input'         // Text or structured input collection
  | 'choice'        // Selection from predefined options
  | 'confirmation'  // Critical operation confirmation
  | 'custom';       // Custom interaction with flexible schema

/**
 * Base configuration options for all interaction types.
 * 
 * Provides common configuration patterns that apply across
 * different interaction types with type-specific extensions.
 * 
 * @public
 */
export interface InteractionOptions {
  /** Timeout for human response in milliseconds */
  timeout?: number;
  
  /** Whether response is required to continue workflow */
  required?: boolean;
  
  /** Whether to retry interaction if timeout occurs */
  retryOnTimeout?: boolean;
  
  /** Default value to use if no response or timeout */
  fallbackValue?: any;
  
  /** Priority level for interaction display and ordering */
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  
  /** Additional metadata for interaction context */
  metadata?: Record<string, any>;
}

/**
 * Approval-specific interaction options.
 * 
 * Extends base options with approval-specific features including
 * risk assessment, context information, and auto-approval rules.
 * 
 * @public
 */
export interface ApprovalOptions extends InteractionOptions {
  /** Additional context for the approval decision */
  context?: string;
  
  /** Risk level assessment for the operation */
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  
  /** Auto-approval configuration */
  autoApprove?: {
    /** Conditions that must be met for auto-approval */
    conditions: ApprovalCondition[];
    
    /** Maximum risk level for auto-approval */
    maxRisk: string;
  };
}

/**
 * Input-specific interaction options.
 * 
 * Supports various input types with comprehensive validation rules
 * and user experience enhancements.
 * 
 * @public
 */
export interface InputOptions extends InteractionOptions {
  /** Type of input expected */
  inputType?: 'text' | 'number' | 'email' | 'url' | 'json' | 'multiline';
  
  /** Input validation rules */
  validation?: {
    /** Regular expression pattern for validation */
    pattern?: string;
    
    /** Minimum input length */
    minLength?: number;
    
    /** Maximum input length */
    maxLength?: number;
    
    /** Whether input is required */
    required?: boolean;
    
    /** Custom validation function */
    customValidator?: (input: string) => boolean;
  };
  
  /** Placeholder text for input field */
  placeholder?: string;
  
  /** Default value for input field */
  defaultValue?: any;
}

/**
 * Choice-specific interaction options.
 * 
 * Configures choice selection behavior including multi-select support,
 * selection constraints, and presentation options.
 * 
 * @public
 */
export interface ChoiceOptions extends InteractionOptions {
  /** Allow multiple choice selections */
  multiSelect?: boolean;
  
  /** Minimum number of selections required */
  minSelections?: number;
  
  /** Maximum number of selections allowed */
  maxSelections?: number;
  
  /** Randomize the order of choices presented */
  randomizeOrder?: boolean;
}

/**
 * Confirmation-specific interaction options.
 * 
 * Provides safety mechanisms for critical operations including
 * danger level indication and double confirmation requirements.
 * 
 * @public
 */
export interface ConfirmationOptions extends InteractionOptions {
  /** Danger level of the operation being confirmed */
  dangerLevel?: 'safe' | 'caution' | 'danger' | 'critical';
  
  /** Required confirmation text that user must type */
  confirmText?: string;
  
  /** Whether to require two separate confirmations */
  doubleConfirm?: boolean;
}

/**
 * Choice option definition.
 * 
 * Defines individual choices available in choice-type interactions
 * with support for rich metadata and state management.
 * 
 * @public
 */
export interface Choice {
  /** Unique identifier for the choice */
  id: string;
  
  /** Human-readable label for display */
  label: string;
  
  /** Optional description providing more detail */
  description?: string;
  
  /** The actual value returned when this choice is selected */
  value: any;
  
  /** Whether this choice is currently disabled */
  disabled?: boolean;
  
  /** Additional metadata for the choice */
  metadata?: Record<string, any>;
}

/**
 * Complete interaction state representation.
 * 
 * Tracks the full lifecycle of an interaction from creation
 * through response or timeout with comprehensive metadata.
 * 
 * @public
 */
export interface InteractionState {
  /** Unique interaction identifier */
  id: string;
  
  /** Session identifier this interaction belongs to */
  sessionId: string;
  
  /** Type of interaction */
  type: InteractionType;
  
  /** Current status of the interaction */
  status: InteractionStatus;
  
  // Request details
  /** The prompt presented to the human */
  prompt: string;
  
  /** Configuration options for the interaction */
  options: InteractionOptions;
  
  // Response details
  /** Human-provided response (if any) */
  response?: any;
  
  /** Timestamp when response was received */
  responseTime?: Date;
  
  /** Time taken to respond in milliseconds */
  responseLatency?: number;
  
  // Lifecycle timestamps
  /** When the interaction was created */
  createdAt: Date;
  
  /** When the interaction expires (if timeout is set) */
  expiresAt?: Date;
  
  /** Additional metadata and context */
  metadata: Record<string, any>;
  
  // Integration context
  /** Execution context identifier */
  executionId?: string;
  
  /** Workflow node identifier */
  nodeId?: string;
  
  /** Agent identifier that created the interaction */
  agentId?: string;
}

/**
 * Interaction status enumeration.
 * 
 * Tracks the current state of an interaction through its lifecycle
 * from initial creation to final resolution.
 * 
 * @public
 */
export type InteractionStatus = 
  | 'pending'    // Interaction created but not yet presented
  | 'waiting'    // Waiting for human response
  | 'responded'  // Human has provided a response
  | 'timeout'    // Interaction timed out without response
  | 'cancelled'  // Interaction was cancelled
  | 'expired'    // Interaction expired due to system limits
  | 'failed';    // Interaction failed due to error

/**
 * Interaction response for bulk operations.
 * 
 * Provides detailed response information including success status,
 * response data, error information, and execution metadata.
 * 
 * @public
 */
export interface InteractionResponse {
  /** Interaction identifier */
  id: string;
  
  /** Whether the interaction succeeded */
  success: boolean;
  
  /** Response data (if successful) */
  response?: any;
  
  /** Error message (if failed) */
  error?: string;
  
  /** Response metadata and metrics */
  metadata: {
    /** Time taken to complete the interaction */
    responseTime: number;
    
    /** Number of retry attempts */
    attempts: number;
    
    /** Final status of the interaction */
    finalStatus: InteractionStatus;
  };
}

/**
 * Custom interaction definition.
 * 
 * Enables flexible custom interaction types with JSON schema validation,
 * custom UI components, and application-specific behavior.
 * 
 * @public
 */
export interface CustomInteraction {
  /** Custom interaction type identifier */
  type: string;
  
  /** Human-readable prompt */
  prompt: string;
  
  /** JSON schema for response validation */
  schema: any;
  
  /** UI configuration for custom presentation */
  ui?: InteractionUI;
  
  /** Custom response validator function */
  validator?: (response: any) => boolean;
  
  /** Base interaction options */
  options?: InteractionOptions;
}

/**
 * UI configuration for custom interactions.
 * 
 * Defines how custom interactions should be presented to users
 * including component type, layout, and theming options.
 * 
 * @public
 */
export interface InteractionUI {
  /** UI component type to render */
  component: string;
  
  /** Properties to pass to the UI component */
  props?: Record<string, any>;
  
  /** Layout style for the interaction */
  layout?: 'modal' | 'inline' | 'sidebar' | 'fullscreen';
  
  /** Theme preference for the UI */
  theme?: 'light' | 'dark' | 'auto';
}

/**
 * Configuration for the Human-in-the-Loop Module.
 * 
 * Provides comprehensive configuration options for all aspects of
 * human interaction management including timeouts, persistence,
 * auto-approval, and integration settings.
 * 
 * @public
 */
export interface HumanLoopConfig {
  // Timeout configuration
  /** Default timeout for interactions in milliseconds */
  defaultTimeout?: number;
  
  /** Maximum allowed timeout value */
  maxTimeout?: number;
  
  // Retry configuration
  /** Retry policy for failed or timed-out interactions */
  retryPolicy?: {
    /** Maximum number of retry attempts */
    maxRetries: number;
    
    /** Base delay between retries in milliseconds */
    retryDelay: number;
    
    /** Multiplier for exponential backoff */
    backoffMultiplier: number;
  };
  
  // Persistence configuration
  /** Data persistence settings */
  persistence?: {
    /** Whether to enable persistent storage */
    enabled: boolean;
    
    /** Storage backend to use */
    storage: 'memory' | 'database' | 'redis';
    
    /** How long to retain interaction data */
    retentionDays: number;
  };
  
  // Integration settings
  /** Streaming integration configuration */
  streaming?: {
    /** Whether to enable streaming integration */
    enabled: boolean;
    
    /** Whether to send real-time updates */
    realTimeUpdates: boolean;
  };
  
  // Security settings
  /** Security and audit configuration */
  security?: {
    /** Whether to encrypt interaction data */
    encryption: boolean;
    
    /** Whether to enable comprehensive audit logging */
    auditLogging: boolean;
    
    /** IP whitelist for interaction responses */
    ipWhitelist?: string[];
  };
  
  // Auto-approval configuration
  /** Auto-approval engine settings */
  autoApproval?: {
    /** Whether to enable auto-approval */
    enabled: boolean;
    
    /** Rules for automatic approval decisions */
    rules: AutoApprovalRule[];
  };
  
  // Rate limiting
  /** Rate limiting configuration */
  rateLimiting?: {
    /** Whether to enable rate limiting */
    enabled: boolean;
    
    /** Maximum interactions per minute per session */
    maxRequestsPerMinute: number;
    
    /** Maximum concurrent interactions per session */
    maxConcurrentInteractions: number;
  };
}

/**
 * Auto-approval rule definition.
 * 
 * Defines conditions and actions for automatic approval of interactions
 * based on configurable criteria and risk assessment.
 * 
 * @public
 */
export interface AutoApprovalRule {
  /** Unique rule identifier */
  id: string;
  
  /** Human-readable rule description */
  description: string;
  
  /** Conditions that must be met for this rule to apply */
  conditions: ApprovalCondition[];
  
  /** Action to take when conditions are met */
  action: 'approve' | 'reject' | 'escalate';
  
  /** Additional rule metadata */
  metadata?: Record<string, any>;
}

/**
 * Auto-approval condition specification.
 * 
 * Defines individual conditions for auto-approval rules including
 * field references, comparison operators, and expected values.
 * 
 * @public
 */
export interface ApprovalCondition {
  /** Field name to evaluate */
  field: string;
  
  /** Comparison operator to apply */
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'regex';
  
  /** Expected value for comparison */
  value: any;
  
  /** Type of data being evaluated */
  type: 'metadata' | 'context' | 'user' | 'time' | 'risk';
}

/**
 * Interaction record for historical tracking.
 * 
 * Simplified representation of interactions for audit trails,
 * reporting, and historical analysis.
 * 
 * @public
 */
export interface InteractionRecord {
  /** Interaction identifier */
  id: string;
  
  /** Session identifier */
  sessionId: string;
  
  /** Interaction type */
  type: InteractionType;
  
  /** The prompt that was presented */
  prompt: string;
  
  /** The response that was provided */
  response?: any;
  
  /** Final status of the interaction */
  status: InteractionStatus;
  
  /** When the interaction was created */
  createdAt: Date;
  
  /** When the response was received */
  responseTime?: Date;
  
  /** Response latency in milliseconds */
  responseLatency?: number;
  
  /** Associated metadata */
  metadata: Record<string, any>;
}

/**
 * Filter criteria for interaction data export.
 * 
 * Defines filtering and selection criteria for exporting
 * interaction data for analysis or compliance purposes.
 * 
 * @public
 */
export interface InteractionFilter {
  /** Filter by session ID */
  sessionId?: string;
  
  /** Filter by interaction type */
  type?: InteractionType;
  
  /** Filter by interaction status */
  status?: InteractionStatus;
  
  /** Filter by date range */
  dateRange?: {
    /** Start date for filtering */
    from: Date;
    
    /** End date for filtering */
    to: Date;
  };
  
  /** Filter by metadata fields */
  metadata?: Record<string, any>;
  
  /** Maximum number of records to export */
  limit?: number;
}

/**
 * Export data structure for interaction analysis.
 * 
 * Provides structured export data with summary statistics
 * and detailed interaction records.
 * 
 * @public
 */
export interface InteractionExport {
  /** Export metadata */
  metadata: {
    /** When the export was generated */
    exportedAt: Date;
    
    /** Filters applied to the export */
    filters: InteractionFilter;
    
    /** Total records matching filters */
    totalRecords: number;
    
    /** Summary statistics */
    statistics: {
      /** Count by interaction type */
      byType: Record<InteractionType, number>;
      
      /** Count by status */
      byStatus: Record<InteractionStatus, number>;
      
      /** Average response time */
      averageResponseTime: number;
    };
  };
  
  /** Array of interaction records */
  records: InteractionRecord[];
}