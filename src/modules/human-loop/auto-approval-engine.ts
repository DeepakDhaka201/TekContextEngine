/**
 * @fileoverview Auto-approval engine for rule-based automatic approval decisions
 * @module modules/human-loop/auto-approval-engine
 * @requires ./types
 * @requires ./errors
 * 
 * This file implements the AutoApprovalEngine class that evaluates approval
 * requests against configurable rules to automatically approve or reject
 * operations based on risk assessment, context, timing, and other criteria.
 * 
 * Key concepts:
 * - Rule-based automatic approval for low-risk operations
 * - Multi-condition rule evaluation with logical operators
 * - Context-aware decision making using metadata and environmental factors
 * - Time-based conditions for business hours and scheduling
 * - Risk assessment integration for security-aware approvals
 * - Comprehensive logging and audit trails for all decisions
 * 
 * @example
 * ```typescript
 * import { AutoApprovalEngine } from './auto-approval-engine';
 * 
 * const engine = new AutoApprovalEngine([
 *   {
 *     id: 'low-risk-business-hours',
 *     description: 'Auto-approve low risk operations during business hours',
 *     conditions: [
 *       { field: 'riskLevel', operator: 'equals', value: 'low', type: 'risk' },
 *       { field: 'hour', operator: 'greater_than', value: 8, type: 'time' },
 *       { field: 'hour', operator: 'less_than', value: 18, type: 'time' }
 *     ],
 *     action: 'approve'
 *   }
 * ]);
 * 
 * const result = await engine.checkAutoApproval(
 *   'Delete temporary files?',
 *   { riskLevel: 'low' },
 *   { sessionId: 'session-123' }
 * );
 * ```
 * 
 * @see types.ts for AutoApprovalRule and ApprovalCondition interfaces
 * @see errors.ts for auto-approval error handling
 * @since 1.0.0
 */

import { 
  AutoApprovalRule, 
  ApprovalCondition, 
  ApprovalOptions 
} from './types';
import { 
  AutoApprovalError, 
  createHumanLoopErrorContext 
} from './errors';

/**
 * Engine for automatic approval based on configurable rules.
 * 
 * The AutoApprovalEngine evaluates approval requests against a set of
 * configurable rules to determine if operations can be automatically
 * approved or rejected without human intervention. This enables efficient
 * handling of low-risk operations while ensuring high-risk operations
 * always require human oversight.
 * 
 * Features:
 * - Multi-condition rule evaluation with AND logic
 * - Support for various data types: metadata, context, user, time, risk
 * - Flexible comparison operators: equals, not_equals, greater_than, less_than, contains, regex
 * - Time-based conditions for business hours and scheduling constraints
 * - Risk level integration for security-aware automatic decisions
 * - Comprehensive audit logging for compliance and debugging
 * - Rule priority and conflict resolution
 * - Performance optimization for high-volume approval scenarios
 * 
 * Rule Evaluation Process:
 * 1. Iterate through rules in priority order
 * 2. Evaluate all conditions for each rule (AND logic)
 * 3. Return action for first matching rule
 * 4. Log decision with detailed context for audit trails
 * 
 * @remarks
 * Rules are evaluated in the order they are provided, so more specific
 * rules should be placed before general rules. All conditions within a
 * rule must match for the rule to apply (AND logic).
 * 
 * @example
 * ```typescript
 * // Initialize with comprehensive rule set
 * const engine = new AutoApprovalEngine([
 *   // High priority: Always reject critical operations
 *   {
 *     id: 'reject-critical',
 *     description: 'Always reject critical risk operations',
 *     conditions: [
 *       { field: 'riskLevel', operator: 'equals', value: 'critical', type: 'risk' }
 *     ],
 *     action: 'reject'
 *   },
 *   
 *   // Medium priority: Auto-approve low risk during business hours
 *   {
 *     id: 'approve-low-risk-business-hours',
 *     description: 'Auto-approve low risk operations during business hours',
 *     conditions: [
 *       { field: 'riskLevel', operator: 'equals', value: 'low', type: 'risk' },
 *       { field: 'hour', operator: 'greater_than', value: 8, type: 'time' },
 *       { field: 'hour', operator: 'less_than', value: 18, type: 'time' },
 *       { field: 'day_of_week', operator: 'greater_than', value: 0, type: 'time' },
 *       { field: 'day_of_week', operator: 'less_than', value: 6, type: 'time' }
 *     ],
 *     action: 'approve'
 *   },
 *   
 *   // Low priority: Auto-approve trusted users
 *   {
 *     id: 'approve-trusted-users',
 *     description: 'Auto-approve operations from trusted users',
 *     conditions: [
 *       { field: 'trusted', operator: 'equals', value: true, type: 'user' },
 *       { field: 'riskLevel', operator: 'not_equals', value: 'critical', type: 'risk' }
 *     ],
 *     action: 'approve'
 *   }
 * ]);
 * 
 * // Evaluate approval request
 * const result = await engine.checkAutoApproval(
 *   'Delete 5 temporary files from /tmp directory?',
 *   { 
 *     riskLevel: 'low', 
 *     context: 'System cleanup',
 *     metadata: { fileCount: 5, directory: '/tmp' }
 *   },
 *   { 
 *     sessionId: 'session-123',
 *     user: { trusted: true, role: 'admin' }
 *   }
 * );
 * 
 * if (result.shouldAutoApprove) {
 *   console.log(`Auto-${result.approved ? 'approved' : 'rejected'}: ${result.reason}`);
 * }
 * ```
 * 
 * @public
 */
export class AutoApprovalEngine {
  /** Array of auto-approval rules in evaluation order */
  private rules: AutoApprovalRule[];
  
  /** Performance metrics for rule evaluation */
  private metrics = {
    totalEvaluations: 0,
    autoApprovals: 0,
    autoRejections: 0,
    averageEvaluationTime: 0,
    ruleHitCounts: new Map<string, number>()
  };
  
  /**
   * Creates a new AutoApprovalEngine with the specified rules.
   * 
   * Rules are evaluated in the order provided, so more specific
   * rules should be placed before general rules.
   * 
   * @param rules - Array of auto-approval rules
   * 
   * @example
   * ```typescript
   * const rules: AutoApprovalRule[] = [
   *   {
   *     id: 'low-risk-auto-approve',
   *     description: 'Auto-approve low risk file operations',
   *     conditions: [
   *       { field: 'riskLevel', operator: 'equals', value: 'low', type: 'risk' },
   *       { field: 'operation', operator: 'contains', value: 'file', type: 'metadata' }
   *     ],
   *     action: 'approve',
   *     metadata: { category: 'file-operations' }
   *   }
   * ];
   * 
   * const engine = new AutoApprovalEngine(rules);
   * ```
   */
  constructor(rules: AutoApprovalRule[]) {
    this.rules = rules;
    
    // Validate rules on initialization
    this.validateRules();
    
    // Initialize rule hit count tracking
    for (const rule of rules) {
      this.metrics.ruleHitCounts.set(rule.id, 0);
    }
    
    console.log(`✓ AutoApprovalEngine initialized with ${rules.length} rules`);
  }
  
  /**
   * Evaluates approval request against configured rules.
   * 
   * Processes the approval request through all configured rules to determine
   * if automatic approval or rejection is appropriate. Returns detailed
   * information about the decision including the reason and matching rule.
   * 
   * @param prompt - Human-readable approval prompt
   * @param options - Approval options with risk assessment and metadata
   * @param context - Additional context including session and user information
   * @returns Auto-approval decision with detailed reasoning
   * @throws {AutoApprovalError} If rule evaluation fails
   * 
   * @example
   * ```typescript
   * const result = await engine.checkAutoApproval(
   *   'Delete user uploaded files older than 30 days?',
   *   {
   *     riskLevel: 'medium',
   *     context: 'Storage cleanup',
   *     metadata: {
   *       fileCount: 150,
   *       ageThreshold: 30,
   *       storageFreed: '2.5GB'
   *     }
   *   },
   *   {
   *     sessionId: 'session-456',
   *     user: { id: 'admin-1', role: 'administrator', trusted: true },
   *     timestamp: Date.now()
   *   }
   * );
   * 
   * if (result.shouldAutoApprove) {
   *   console.log(`Decision: ${result.approved ? 'APPROVED' : 'REJECTED'}`);
   *   console.log(`Reason: ${result.reason}`);
   *   console.log(`Rule: ${result.matchedRule?.id}`);
   * } else {
   *   console.log('Requires human approval');
   * }
   * ```
   */
  async checkAutoApproval(
    prompt: string,
    options: ApprovalOptions,
    context: { sessionId: string; [key: string]: any }
  ): Promise<{
    shouldAutoApprove: boolean;
    approved: boolean;
    reason?: string;
    matchedRule?: AutoApprovalRule;
    evaluationTime?: number;
  }> {
    const startTime = Date.now();
    this.metrics.totalEvaluations++;
    
    console.log(`Evaluating auto-approval for session ${context.sessionId}:`, {
      prompt: prompt.substring(0, 100),
      riskLevel: options.riskLevel,
      rulesCount: this.rules.length
    });
    
    try {
      // Evaluate each rule in order
      for (const rule of this.rules) {
        const matches = await this.evaluateRule(rule, prompt, options, context);
        
        if (matches) {
          const evaluationTime = Date.now() - startTime;
          
          // Update metrics
          this.metrics.ruleHitCounts.set(rule.id, (this.metrics.ruleHitCounts.get(rule.id) || 0) + 1);
          this.updateAverageEvaluationTime(evaluationTime);
          
          const approved = rule.action === 'approve';
          if (approved) {
            this.metrics.autoApprovals++;
          } else if (rule.action === 'reject') {
            this.metrics.autoRejections++;
          }
          
          const result = {
            shouldAutoApprove: true,
            approved,
            reason: `Auto-${rule.action} based on rule: ${rule.description}`,
            matchedRule: rule,
            evaluationTime
          };
          
          console.log(`✓ Auto-approval decision made:`, {
            ruleId: rule.id,
            action: rule.action,
            approved,
            evaluationTime,
            sessionId: context.sessionId
          });
          
          // Emit event for audit logging
          this.emitDecisionEvent(rule, approved, prompt, options, context, evaluationTime);
          
          return result;
        }
      }
      
      // No matching rules found
      const evaluationTime = Date.now() - startTime;
      this.updateAverageEvaluationTime(evaluationTime);
      
      console.log(`No auto-approval rules matched for session ${context.sessionId} (evaluation time: ${evaluationTime}ms)`);
      
      return { 
        shouldAutoApprove: false, 
        approved: false,
        evaluationTime
      };
      
    } catch (error) {
      const evaluationTime = Date.now() - startTime;
      
      console.error(`Auto-approval evaluation failed for session ${context.sessionId}:`, error);
      
      throw new AutoApprovalError(
        'evaluation',
        'Rule evaluation failed',
        createHumanLoopErrorContext(undefined, context.sessionId, 'approval', {
          prompt: prompt.substring(0, 100),
          options,
          evaluationTime,
          rulesEvaluated: this.rules.length
        }),
        error instanceof Error ? error : undefined
      );
    }
  }
  
  /**
   * Gets comprehensive auto-approval engine statistics.
   * 
   * @returns Performance and usage metrics
   */
  getMetrics(): {
    totalEvaluations: number;
    autoApprovals: number;
    autoRejections: number;
    averageEvaluationTime: number;
    ruleHitCounts: Record<string, number>;
    approvalRate: number;
    rejectionRate: number;
  } {
    const totalDecisions = this.metrics.autoApprovals + this.metrics.autoRejections;
    
    return {
      totalEvaluations: this.metrics.totalEvaluations,
      autoApprovals: this.metrics.autoApprovals,
      autoRejections: this.metrics.autoRejections,
      averageEvaluationTime: this.metrics.averageEvaluationTime,
      ruleHitCounts: Object.fromEntries(this.metrics.ruleHitCounts),
      approvalRate: totalDecisions > 0 ? this.metrics.autoApprovals / totalDecisions : 0,
      rejectionRate: totalDecisions > 0 ? this.metrics.autoRejections / totalDecisions : 0
    };
  }
  
  /**
   * Adds a new auto-approval rule.
   * 
   * @param rule - Auto-approval rule to add
   * @throws {AutoApprovalError} If rule validation fails
   */
  addRule(rule: AutoApprovalRule): void {
    try {
      this.validateRule(rule);
      this.rules.push(rule);
      this.metrics.ruleHitCounts.set(rule.id, 0);
      
      console.log(`✓ Auto-approval rule added: ${rule.id}`);
    } catch (error) {
      throw new AutoApprovalError(
        rule.id,
        'Failed to add rule',
        { rule },
        error instanceof Error ? error : undefined
      );
    }
  }
  
  /**
   * Removes an auto-approval rule by ID.
   * 
   * @param ruleId - ID of the rule to remove
   * @returns True if rule was found and removed
   */
  removeRule(ruleId: string): boolean {
    const initialLength = this.rules.length;
    this.rules = this.rules.filter(rule => rule.id !== ruleId);
    this.metrics.ruleHitCounts.delete(ruleId);
    
    const removed = this.rules.length < initialLength;
    if (removed) {
      console.log(`✓ Auto-approval rule removed: ${ruleId}`);
    }
    
    return removed;
  }
  
  /**
   * Updates an existing auto-approval rule.
   * 
   * @param ruleId - ID of the rule to update
   * @param updatedRule - Updated rule configuration
   * @throws {AutoApprovalError} If rule not found or validation fails
   */
  updateRule(ruleId: string, updatedRule: AutoApprovalRule): void {
    const ruleIndex = this.rules.findIndex(rule => rule.id === ruleId);
    
    if (ruleIndex === -1) {
      throw new AutoApprovalError(
        ruleId,
        'Rule not found for update',
        { ruleId }
      );
    }
    
    try {
      this.validateRule(updatedRule);
      this.rules[ruleIndex] = updatedRule;
      
      console.log(`✓ Auto-approval rule updated: ${ruleId}`);
    } catch (error) {
      throw new AutoApprovalError(
        ruleId,
        'Failed to update rule',
        { ruleId, updatedRule },
        error instanceof Error ? error : undefined
      );
    }
  }
  
  // Private helper methods
  
  /**
   * Evaluates a single auto-approval rule against the request context.
   * 
   * @param rule - Rule to evaluate
   * @param prompt - Approval prompt
   * @param options - Approval options
   * @param context - Request context
   * @returns True if rule matches and should be applied
   * @private
   */
  private async evaluateRule(
    rule: AutoApprovalRule,
    prompt: string,
    options: ApprovalOptions,
    context: any
  ): Promise<boolean> {
    try {
      // All conditions must match for rule to apply (AND logic)
      for (const condition of rule.conditions) {
        const matches = await this.evaluateCondition(condition, prompt, options, context);
        if (!matches) {
          return false; // Short circuit on first non-match
        }
      }
      
      return true; // All conditions matched
      
    } catch (error) {
      console.error(`Error evaluating rule ${rule.id}:`, error);
      
      // Fail safely - if we can't evaluate a rule, don't match it
      return false;
    }
  }
  
  /**
   * Evaluates a single condition within a rule.
   * 
   * @param condition - Condition to evaluate
   * @param prompt - Approval prompt
   * @param options - Approval options
   * @param context - Request context
   * @returns True if condition matches
   * @private
   */
  private async evaluateCondition(
    condition: ApprovalCondition,
    prompt: string,
    options: ApprovalOptions,
    context: any
  ): Promise<boolean> {
    let value: any;
    
    // Get value based on condition type
    switch (condition.type) {
      case 'metadata':
        value = options.metadata?.[condition.field];
        break;
        
      case 'context':
        value = context[condition.field];
        break;
        
      case 'user':
        value = context.user?.[condition.field];
        break;
        
      case 'time':
        value = this.getTimeValue(condition.field);
        break;
        
      case 'risk':
        if (condition.field === 'riskLevel') {
          value = options.riskLevel;
        } else {
          value = options[condition.field as keyof ApprovalOptions];
        }
        break;
        
      default:
        console.warn(`Unknown condition type: ${condition.type}`);
        return false;
    }
    
    // Evaluate condition using operator
    return this.evaluateOperator(condition.operator, value, condition.value);
  }
  
  /**
   * Evaluates a comparison operator between actual and expected values.
   * 
   * @param operator - Comparison operator
   * @param actual - Actual value from context
   * @param expected - Expected value from rule
   * @returns True if comparison passes
   * @private
   */
  private evaluateOperator(operator: string, actual: any, expected: any): boolean {
    switch (operator) {
      case 'equals':
        return actual === expected;
        
      case 'not_equals':
        return actual !== expected;
        
      case 'greater_than':
        return typeof actual === 'number' && typeof expected === 'number' && actual > expected;
        
      case 'less_than':
        return typeof actual === 'number' && typeof expected === 'number' && actual < expected;
        
      case 'contains':
        return typeof actual === 'string' && typeof expected === 'string' && actual.includes(expected);
        
      case 'regex':
        if (typeof actual === 'string' && typeof expected === 'string') {
          try {
            return new RegExp(expected).test(actual);
          } catch (error) {
            console.error(`Invalid regex pattern: ${expected}`, error);
            return false;
          }
        }
        return false;
        
      default:
        console.warn(`Unknown operator: ${operator}`);
        return false;
    }
  }
  
  /**
   * Gets time-based values for condition evaluation.
   * 
   * @param field - Time field to retrieve
   * @returns Time value or null if field is unknown
   * @private
   */
  private getTimeValue(field: string): any {
    const now = new Date();
    
    switch (field) {
      case 'hour':
        return now.getHours();
        
      case 'minute':
        return now.getMinutes();
        
      case 'day_of_week':
        return now.getDay(); // 0 = Sunday, 1 = Monday, etc.
        
      case 'day_of_month':
        return now.getDate();
        
      case 'month':
        return now.getMonth() + 1; // 1-12
        
      case 'year':
        return now.getFullYear();
        
      case 'timestamp':
        return now.getTime();
        
      case 'iso_date':
        return now.toISOString().split('T')[0]; // YYYY-MM-DD
        
      default:
        console.warn(`Unknown time field: ${field}`);
        return null;
    }
  }
  
  /**
   * Validates all rules during initialization.
   * 
   * @private
   */
  private validateRules(): void {
    const ruleIds = new Set<string>();
    
    for (const rule of this.rules) {
      this.validateRule(rule);
      
      // Check for duplicate IDs
      if (ruleIds.has(rule.id)) {
        throw new AutoApprovalError(
          rule.id,
          'Duplicate rule ID found',
          { duplicateId: rule.id }
        );
      }
      ruleIds.add(rule.id);
    }
  }
  
  /**
   * Validates a single auto-approval rule.
   * 
   * @param rule - Rule to validate
   * @throws {AutoApprovalError} If rule is invalid
   * @private
   */
  private validateRule(rule: AutoApprovalRule): void {
    // Validate required fields
    if (!rule.id || typeof rule.id !== 'string') {
      throw new AutoApprovalError(
        rule.id || 'unknown',
        'Rule must have a valid string ID',
        { rule }
      );
    }
    
    if (!rule.description || typeof rule.description !== 'string') {
      throw new AutoApprovalError(
        rule.id,
        'Rule must have a valid description',
        { rule }
      );
    }
    
    if (!Array.isArray(rule.conditions) || rule.conditions.length === 0) {
      throw new AutoApprovalError(
        rule.id,
        'Rule must have at least one condition',
        { rule }
      );
    }
    
    if (!['approve', 'reject', 'escalate'].includes(rule.action)) {
      throw new AutoApprovalError(
        rule.id,
        'Rule action must be approve, reject, or escalate',
        { rule }
      );
    }
    
    // Validate conditions
    for (const condition of rule.conditions) {
      this.validateCondition(rule.id, condition);
    }
  }
  
  /**
   * Validates a single condition within a rule.
   * 
   * @param ruleId - ID of the rule containing the condition
   * @param condition - Condition to validate
   * @throws {AutoApprovalError} If condition is invalid
   * @private
   */
  private validateCondition(ruleId: string, condition: ApprovalCondition): void {
    const validOperators = ['equals', 'not_equals', 'greater_than', 'less_than', 'contains', 'regex'];
    const validTypes = ['metadata', 'context', 'user', 'time', 'risk'];
    
    if (!condition.field || typeof condition.field !== 'string') {
      throw new AutoApprovalError(
        ruleId,
        'Condition must have a valid field name',
        { condition }
      );
    }
    
    if (!validOperators.includes(condition.operator)) {
      throw new AutoApprovalError(
        ruleId,
        `Invalid condition operator: ${condition.operator}`,
        { condition, validOperators }
      );
    }
    
    if (!validTypes.includes(condition.type)) {
      throw new AutoApprovalError(
        ruleId,
        `Invalid condition type: ${condition.type}`,
        { condition, validTypes }
      );
    }
    
    if (condition.value === undefined || condition.value === null) {
      throw new AutoApprovalError(
        ruleId,
        'Condition must have a value',
        { condition }
      );
    }
  }
  
  /**
   * Updates the average evaluation time metric.
   * 
   * @param evaluationTime - Time taken for current evaluation
   * @private
   */
  private updateAverageEvaluationTime(evaluationTime: number): void {
    const currentAverage = this.metrics.averageEvaluationTime;
    const totalEvaluations = this.metrics.totalEvaluations;
    
    // Calculate running average
    this.metrics.averageEvaluationTime = 
      ((currentAverage * (totalEvaluations - 1)) + evaluationTime) / totalEvaluations;
  }
  
  /**
   * Emits decision event for audit logging and monitoring.
   * 
   * @param rule - Matching rule
   * @param approved - Whether request was approved
   * @param prompt - Original approval prompt
   * @param options - Approval options
   * @param context - Request context
   * @param evaluationTime - Time taken for evaluation
   * @private
   */
  private emitDecisionEvent(
    rule: AutoApprovalRule,
    approved: boolean,
    prompt: string,
    options: ApprovalOptions,
    context: any,
    evaluationTime: number
  ): void {
    // In a real implementation, this would emit to an event system
    // for audit logging, monitoring, and alerting
    console.log('Auto-approval decision:', {
      ruleId: rule.id,
      ruleDescription: rule.description,
      action: rule.action,
      approved,
      sessionId: context.sessionId,
      riskLevel: options.riskLevel,
      evaluationTime,
      timestamp: new Date().toISOString(),
      prompt: prompt.substring(0, 200) // Truncate for logging
    });
  }
}