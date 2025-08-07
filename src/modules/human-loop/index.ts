/**
 * @fileoverview Human-in-the-Loop Module exports
 * @module modules/human-loop
 * 
 * This file serves as the central export point for the Human-in-the-Loop Module,
 * providing access to all public interfaces, classes, and utilities needed for
 * integrating human intelligence into automated agent workflows.
 * 
 * The Human-in-the-Loop Module enables seamless integration of human oversight,
 * approval, input collection, and decision-making into AI agent workflows with
 * comprehensive state management, auto-approval capabilities, and real-time streaming.
 * 
 * Key exports:
 * - IHumanLoopModule: Primary interface for human interaction management
 * - HumanLoopModule: Main module implementation
 * - HumanLoopFactory: Factory for creating configured module instances
 * - Type definitions: Comprehensive types for all interaction patterns
 * - Error classes: Specialized error handling for human interaction scenarios
 * 
 * @example
 * ```typescript
 * import { 
 *   HumanLoopModule,
 *   HumanLoopFactory,
 *   HumanLoopConfig,
 *   ApprovalOptions,
 *   InteractionType
 * } from '@/modules/human-loop';
 * 
 * // Create module using factory
 * const humanLoop = await HumanLoopFactory.createForProduction({
 *   autoApproval: {
 *     enabled: true,
 *     rules: HumanLoopFactory.getCommonRules('security')
 *   }
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
 * @public
 * @since 1.0.0
 */

// Core module interface and implementation
export type { IHumanLoopModule } from './types';
export { HumanLoopModule } from './human-loop-module';

// Factory for module creation
export { HumanLoopFactory, type IHumanLoopFactory, humanLoopFactory } from './human-loop-factory';

// State management components
export { InteractionStateManager } from './interaction-state-manager';
export { AutoApprovalEngine } from './auto-approval-engine';

// Comprehensive type definitions
export type {
  // Core interaction types
  InteractionRequest,
  InteractionResponse,
  InteractionState,
  InteractionRecord,
  InteractionType,
  InteractionStatus,
  InteractionOptions,
  
  // Specific interaction option types
  ApprovalOptions,
  InputOptions,
  ChoiceOptions,
  ConfirmationOptions,
  
  // Choice and custom interaction types
  Choice,
  CustomInteraction,
  InteractionUI,
  
  // Configuration types
  HumanLoopConfig,
  AutoApprovalRule,
  ApprovalCondition,
  
  // Export and filtering types
  InteractionFilter,
  InteractionExport
} from './types';

// Error handling system
export {
  // Base error class
  HumanLoopError,
  
  // Specific error classes
  InteractionError,
  InteractionTimeoutError,
  InteractionCancellationError,
  InteractionNotFoundError,
  ValidationError,
  RateLimitError,
  AutoApprovalError,
  ConfigurationError,
  PersistenceError,
  IntegrationError,
  CustomInteractionError,
  ConcurrencyLimitError,
  AuthenticationError,
  
  // Error utilities
  isHumanLoopError,
  createHumanLoopErrorContext,
  getHumanLoopErrorSeverity,
  mapHumanLoopErrorToHttpStatus,
  sanitizeErrorForClient,
  ERROR_RECOVERY_SUGGESTIONS
} from './errors';

// Export error severity type
export type { HumanLoopErrorSeverity } from './errors';

/**
 * Module metadata for registry integration.
 * 
 * Provides information about the Human-in-the-Loop Module for
 * module registry systems and dependency management.
 * 
 * @public
 */
export const HUMAN_LOOP_MODULE_METADATA = {
  name: 'humanLoop',
  version: '1.0.0',
  description: 'Human-in-the-Loop Module for AI agent workflows',
  author: 'AgentHub Team',
  license: 'MIT',
  keywords: [
    'human-in-the-loop',
    'approval-workflow',
    'human-oversight',
    'agent-interaction',
    'auto-approval',
    'streaming-integration'
  ],
  dependencies: [
    'streaming',
    'session-state'
  ],
  optionalDependencies: [
    'persistence',
    'monitoring'
  ],
  capabilities: [
    'approval-requests',
    'input-collection',
    'choice-selection',
    'confirmations',
    'custom-interactions',
    'auto-approval',
    'bulk-operations',
    'audit-trails',
    'real-time-streaming'
  ],
  configurationSchema: {
    type: 'object',
    properties: {
      defaultTimeout: { type: 'number', minimum: 1000 },
      maxTimeout: { type: 'number', minimum: 1000 },
      retryPolicy: {
        type: 'object',
        properties: {
          maxRetries: { type: 'number', minimum: 0 },
          retryDelay: { type: 'number', minimum: 100 },
          backoffMultiplier: { type: 'number', minimum: 1.0 }
        }
      },
      persistence: {
        type: 'object',
        properties: {
          enabled: { type: 'boolean' },
          storage: { type: 'string', enum: ['memory', 'database', 'redis'] },
          retentionDays: { type: 'number', minimum: 1 }
        }
      },
      streaming: {
        type: 'object',
        properties: {
          enabled: { type: 'boolean' },
          realTimeUpdates: { type: 'boolean' }
        }
      },
      autoApproval: {
        type: 'object',
        properties: {
          enabled: { type: 'boolean' },
          rules: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                description: { type: 'string' },
                conditions: { type: 'array' },
                action: { type: 'string', enum: ['approve', 'reject', 'escalate'] }
              },
              required: ['id', 'description', 'conditions', 'action']
            }
          }
        }
      }
    }
  }
} as const;

/**
 * Common interaction patterns and utilities.
 * 
 * Provides helper functions and patterns for common human interaction
 * scenarios to reduce boilerplate and ensure consistent behavior.
 * 
 * @public
 */
export const HumanLoopPatterns = {
  /**
   * Creates a standard approval request configuration.
   * 
   * @param options - Approval configuration options
   * @returns Configured approval options
   */
  createApprovalRequest: (options: any = {}): any => ({
    timeout: 300000, // 5 minutes default
    riskLevel: 'medium',
    required: true,
    priority: 'normal',
    ...options
  }),
  
  /**
   * Creates a standard input request configuration.
   * 
   * @param inputType - Type of input expected
   * @param options - Input configuration options
   * @returns Configured input options
   */
  createInputRequest: (
    inputType: 'text' | 'number' | 'email' | 'url' | 'json' | 'multiline' = 'text',
    options: any = {}
  ): any => ({
    inputType,
    timeout: 300000,
    required: true,
    priority: 'normal',
    validation: {
      required: true
    },
    ...options
  }),
  
  /**
   * Creates a standard choice request configuration.
   * 
   * @param choices - Available choices
   * @param options - Choice configuration options
   * @returns Configured choice options
   */
  createChoiceRequest: (
    choices: any[],
    options: any = {}
  ): { choices: any[]; options: any } => ({
    choices,
    options: {
      timeout: 300000,
      required: true,
      priority: 'normal',
      multiSelect: false,
      ...options
    }
  }),
  
  /**
   * Creates a standard confirmation request configuration.
   * 
   * @param dangerLevel - Danger level of the operation
   * @param options - Confirmation configuration options
   * @returns Configured confirmation options
   */
  createConfirmationRequest: (
    dangerLevel: 'safe' | 'caution' | 'danger' | 'critical' = 'caution',
    options: any = {}
  ): any => ({
    dangerLevel,
    timeout: 300000,
    required: true,
    priority: dangerLevel === 'critical' ? 'urgent' : 'high',
    doubleConfirm: dangerLevel === 'critical',
    ...options
  })
} as const;

/**
 * Version information for the Human-in-the-Loop Module.
 * 
 * @public
 */
export const VERSION = '1.0.0';

// Import classes for default export
import { HumanLoopModule } from './human-loop-module';
import { HumanLoopFactory, humanLoopFactory } from './human-loop-factory';

/**
 * Default export for convenient module access.
 * 
 * @public
 */
const defaultExport = {
  HumanLoopModule,
  HumanLoopFactory,
  humanLoopFactory,
  HumanLoopPatterns,
  VERSION,
  metadata: HUMAN_LOOP_MODULE_METADATA
};

export default defaultExport;

/**
 * Re-export commonly used types for convenience.
 * 
 * This allows for more concise imports in common usage scenarios.
 * 
 * @example
 * ```typescript
 * // Instead of importing each type individually
 * import { HumanLoopConfig, ApprovalOptions, InteractionType } from '@/modules/human-loop';
 * 
 * // You can use the grouped exports
 * import { Types } from '@/modules/human-loop';
 * type Config = Types.HumanLoopConfig;
 * type ApprovalOpts = Types.ApprovalOptions;
 * ```
 * 
 * @public
 */
export namespace Types {
  export type Config = import('./types').HumanLoopConfig;
  export type ApprovalOpts = import('./types').ApprovalOptions;
  export type InputOpts = import('./types').InputOptions;
  export type ChoiceOpts = import('./types').ChoiceOptions;
  export type ConfirmationOpts = import('./types').ConfirmationOptions;
  export type State = import('./types').InteractionState;
  export type Request = import('./types').InteractionRequest;
  export type Response = import('./types').InteractionResponse;
  export type Record = import('./types').InteractionRecord;
  export type Status = import('./types').InteractionStatus;
  export type Type = import('./types').InteractionType;
  export type Rule = import('./types').AutoApprovalRule;
  export type Condition = import('./types').ApprovalCondition;
  export type Filter = import('./types').InteractionFilter;
  export type Export = import('./types').InteractionExport;
}

/**
 * Utility functions namespace.
 * 
 * @public
 */
export namespace Utils {
  /**
   * Checks if a module instance is a Human-in-the-Loop Module.
   */
  export function isHumanLoopModule(module: any): module is import('./human-loop-module').HumanLoopModule {
    return module && 
           typeof module === 'object' && 
           module.name === 'humanLoop' &&
           typeof module.requestApproval === 'function' &&
           typeof module.requestInput === 'function';
  }
  
  /**
   * Creates a simple approval rule for common scenarios.
   */
  export function createSimpleRule(
    id: string,
    description: string,
    field: string,
    operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than',
    value: any,
    type: 'metadata' | 'context' | 'user' | 'time' | 'risk',
    action: 'approve' | 'reject' = 'approve'
  ): import('./types').AutoApprovalRule {
    return {
      id,
      description,
      conditions: [{ field, operator, value, type }],
      action
    };
  }
  
  /**
   * Validates interaction response format.
   */
  export function validateInteractionResponse(response: any): boolean {
    return response &&
           typeof response === 'object' &&
           typeof response.id === 'string' &&
           typeof response.success === 'boolean';
  }
}