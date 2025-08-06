# Human-in-the-Loop Module Implementation Prompt (Interactive Agent Workflows)

## Context
You are implementing the Human-in-the-Loop Module - a critical component that enables interactive agent workflows where human input, approval, and oversight are seamlessly integrated into agent execution. This module bridges automated AI processing with human intelligence, providing approval workflows, interactive data collection, and human oversight capabilities that integrate with the enhanced AgentHub architecture.

## Pre-Implementation Requirements

### 1. Documentation Review
You MUST read:
1. Enhanced Base Agent implementation: `/Users/sakshams/tekai/TekContextEngine/prompts/07-base-agent-implementation.md`
2. Execution Manager module: `/Users/sakshams/tekai/TekContextEngine/prompts/06a-execution-manager-implementation.md`
3. Streaming Manager implementation: `/Users/sakshams/tekai/TekContextEngine/prompts/06b-streaming-manager-implementation.md`
4. Module Registry implementation: `/Users/sakshams/tekai/TekContextEngine/prompts/06-module-registry-implementation.md`
5. Flowise human interaction patterns from analysis
6. Human-computer interaction design principles
7. Asynchronous workflow patterns

### 2. Understand Human-in-the-Loop Requirements
The Human-in-the-Loop Module must:
- Provide seamless human interaction points in agent workflows
- Support multiple interaction types (approval, input, choice, confirmation)
- Handle timeouts and fallback scenarios gracefully
- Integrate with streaming for real-time interaction prompts
- Support both synchronous and asynchronous interaction patterns
- Provide audit trails for all human interactions
- Enable conditional workflow branching based on human responses

## Implementation Steps

### Step 1: Human-in-the-Loop Types
Create `modules/human-loop/types.ts`:

```typescript
export interface IHumanLoopModule {
  name: string;
  version: string;
  
  // Lifecycle
  initialize(config: HumanLoopConfig): Promise<void>;
  health(): Promise<HealthStatus>;
  shutdown(): Promise<void>;
  
  // Interaction Management
  requestApproval(
    sessionId: string,
    prompt: string,
    options?: ApprovalOptions
  ): Promise<boolean>;
  
  requestInput(
    sessionId: string,
    prompt: string,
    options?: InputOptions
  ): Promise<any>;
  
  requestChoice(
    sessionId: string,
    prompt: string,
    choices: Choice[],
    options?: ChoiceOptions
  ): Promise<string>;
  
  requestConfirmation(
    sessionId: string,
    prompt: string,
    options?: ConfirmationOptions
  ): Promise<boolean>;
  
  // Custom interaction types
  requestCustomInteraction<T>(
    sessionId: string,
    interaction: CustomInteraction
  ): Promise<T>;
  
  // Interaction lifecycle
  cancelInteraction(interactionId: string): Promise<void>;
  getInteractionStatus(interactionId: string): Promise<InteractionStatus>;
  
  // Bulk operations
  requestMultiple(
    sessionId: string,
    interactions: InteractionRequest[]
  ): Promise<InteractionResponse[]>;
  
  // Audit and history
  getInteractionHistory(
    sessionId: string,
    limit?: number
  ): Promise<InteractionRecord[]>;
  
  exportInteractionData(
    filters: InteractionFilter
  ): Promise<InteractionExport>;
}

// Core interaction types
export interface InteractionRequest {
  id?: string;
  type: InteractionType;
  prompt: string;
  options?: InteractionOptions;
  metadata?: Record<string, any>;
}

export type InteractionType = 
  | 'approval'
  | 'input'
  | 'choice'
  | 'confirmation'
  | 'custom';

export interface InteractionOptions {
  timeout?: number;           // Timeout in milliseconds
  required?: boolean;         // Is response required
  retryOnTimeout?: boolean;   // Retry if timeout occurs
  fallbackValue?: any;        // Value to use if no response
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  metadata?: Record<string, any>;
}

// Specific interaction types
export interface ApprovalOptions extends InteractionOptions {
  context?: string;           // Additional context for approval
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  autoApprove?: {
    conditions: ApprovalCondition[];
    maxRisk: string;
  };
}

export interface InputOptions extends InteractionOptions {
  inputType?: 'text' | 'number' | 'email' | 'url' | 'json' | 'multiline';
  validation?: {
    pattern?: string;         // Regex pattern
    minLength?: number;
    maxLength?: number;
    required?: boolean;
    customValidator?: (input: string) => boolean;
  };
  placeholder?: string;
  defaultValue?: any;
}

export interface ChoiceOptions extends InteractionOptions {
  multiSelect?: boolean;      // Allow multiple selections
  minSelections?: number;
  maxSelections?: number;
  randomizeOrder?: boolean;   // Randomize choice order
}

export interface ConfirmationOptions extends InteractionOptions {
  dangerLevel?: 'safe' | 'caution' | 'danger' | 'critical';
  confirmText?: string;       // Required confirmation text
  doubleConfirm?: boolean;    // Require two confirmations
}

export interface Choice {
  id: string;
  label: string;
  description?: string;
  value: any;
  disabled?: boolean;
  metadata?: Record<string, any>;
}

// Interaction state and results
export interface InteractionState {
  id: string;
  sessionId: string;
  type: InteractionType;
  status: InteractionStatus;
  
  // Request details
  prompt: string;
  options: InteractionOptions;
  
  // Response details
  response?: any;
  responseTime?: Date;
  responseLatency?: number;   // Response time in ms
  
  // Metadata
  createdAt: Date;
  expiresAt?: Date;
  metadata: Record<string, any>;
  
  // Context
  executionId?: string;
  nodeId?: string;
  agentId?: string;
}

export type InteractionStatus = 
  | 'pending'
  | 'waiting'
  | 'responded'
  | 'timeout'
  | 'cancelled'
  | 'expired'
  | 'failed';

export interface InteractionResponse {
  id: string;
  success: boolean;
  response?: any;
  error?: string;
  metadata: {
    responseTime: number;
    attempts: number;
    finalStatus: InteractionStatus;
  };
}

// Custom interactions
export interface CustomInteraction {
  type: string;
  prompt: string;
  schema: any;                // JSON schema for response
  ui?: InteractionUI;         // UI configuration
  validator?: (response: any) => boolean;
  options?: InteractionOptions;
}

export interface InteractionUI {
  component: string;          // UI component type
  props?: Record<string, any>; // Component props
  layout?: 'modal' | 'inline' | 'sidebar' | 'fullscreen';
  theme?: 'light' | 'dark' | 'auto';
}

// Configuration
export interface HumanLoopConfig {
  // Timeout settings
  defaultTimeout?: number;    // Default timeout in ms
  maxTimeout?: number;        // Maximum allowed timeout
  
  // Retry configuration
  retryPolicy?: {
    maxRetries: number;
    retryDelay: number;
    backoffMultiplier: number;
  };
  
  // Persistence
  persistence?: {
    enabled: boolean;
    storage: 'memory' | 'database' | 'redis';
    retentionDays: number;
  };
  
  // Integration settings
  streaming?: {
    enabled: boolean;
    realTimeUpdates: boolean;
  };
  
  // Security
  security?: {
    encryption: boolean;
    auditLogging: boolean;
    ipWhitelist?: string[];
  };
  
  // Auto-approval
  autoApproval?: {
    enabled: boolean;
    rules: AutoApprovalRule[];
  };
  
  // Rate limiting
  rateLimiting?: {
    enabled: boolean;
    maxRequestsPerMinute: number;
    maxConcurrentInteractions: number;
  };
}

export interface AutoApprovalRule {
  id: string;
  description: string;
  conditions: ApprovalCondition[];
  action: 'approve' | 'reject' | 'escalate';
  metadata?: Record<string, any>;
}

export interface ApprovalCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'regex';
  value: any;
  type: 'metadata' | 'context' | 'user' | 'time' | 'risk';
}
```

### Step 2: Interaction State Manager
Create `modules/human-loop/interaction-state-manager.ts`:

```typescript
import { EventEmitter } from 'events';
import { generateId } from '../../utils';
import { IStreamingManager } from '../streaming/types';

export class InteractionStateManager extends EventEmitter {
  private interactions: Map<string, InteractionState> = new Map();
  private sessionInteractions: Map<string, Set<string>> = new Map();
  private config: HumanLoopConfig;
  private streamingManager?: IStreamingManager;
  
  constructor(config: HumanLoopConfig, streamingManager?: IStreamingManager) {
    super();
    this.config = config;
    this.streamingManager = streamingManager;
  }
  
  async createInteraction(
    sessionId: string,
    request: InteractionRequest
  ): Promise<string> {
    const interactionId = request.id || generateId('interaction');
    
    // Check rate limiting
    await this.checkRateLimit(sessionId);
    
    const interaction: InteractionState = {
      id: interactionId,
      sessionId,
      type: request.type,
      status: 'pending',
      prompt: request.prompt,
      options: request.options || {},
      createdAt: new Date(),
      expiresAt: this.calculateExpiration(request.options?.timeout),
      metadata: {
        ...request.metadata,
        userAgent: 'AgentHub',
        source: 'human-loop-module'
      }
    };
    
    // Store interaction
    this.interactions.set(interactionId, interaction);
    
    // Add to session tracking
    if (!this.sessionInteractions.has(sessionId)) {
      this.sessionInteractions.set(sessionId, new Set());
    }
    this.sessionInteractions.get(sessionId)!.add(interactionId);
    
    // Set up timeout
    if (interaction.expiresAt) {
      this.scheduleTimeout(interactionId, interaction.expiresAt);
    }
    
    // Stream interaction prompt
    if (this.streamingManager && this.config.streaming?.enabled) {
      await this.streamInteractionPrompt(interaction);
    }
    
    // Update status and emit event
    interaction.status = 'waiting';
    this.emit('interactionCreated', interaction);
    
    return interactionId;
  }
  
  async respondToInteraction(
    interactionId: string,
    response: any,
    metadata?: Record<string, any>
  ): Promise<boolean> {
    const interaction = this.interactions.get(interactionId);
    
    if (!interaction) {
      throw new Error(`Interaction not found: ${interactionId}`);
    }
    
    if (interaction.status !== 'waiting') {
      throw new Error(`Interaction ${interactionId} is not awaiting response (status: ${interaction.status})`);
    }
    
    // Validate response
    const validation = await this.validateResponse(interaction, response);
    if (!validation.isValid) {
      throw new Error(`Invalid response: ${validation.error}`);
    }
    
    // Update interaction
    interaction.response = response;
    interaction.responseTime = new Date();
    interaction.responseLatency = interaction.responseTime.getTime() - interaction.createdAt.getTime();
    interaction.status = 'responded';
    interaction.metadata = {
      ...interaction.metadata,
      ...metadata,
      responseValidation: validation
    };
    
    // Clear timeout
    this.clearTimeout(interactionId);
    
    // Stream response
    if (this.streamingManager && this.config.streaming?.enabled) {
      await this.streamInteractionResponse(interaction);
    }
    
    // Emit event
    this.emit('interactionResponded', interaction);
    
    return true;
  }
  
  async cancelInteraction(interactionId: string): Promise<boolean> {
    const interaction = this.interactions.get(interactionId);
    
    if (!interaction) {
      return false;
    }
    
    if (interaction.status === 'responded') {
      throw new Error(`Cannot cancel already responded interaction: ${interactionId}`);
    }
    
    // Update status
    interaction.status = 'cancelled';
    interaction.metadata.cancelledAt = new Date().toISOString();
    
    // Clear timeout
    this.clearTimeout(interactionId);
    
    // Emit event
    this.emit('interactionCancelled', interaction);
    
    return true;
  }
  
  getInteraction(interactionId: string): InteractionState | undefined {
    return this.interactions.get(interactionId);
  }
  
  getSessionInteractions(sessionId: string): InteractionState[] {
    const interactionIds = this.sessionInteractions.get(sessionId);
    if (!interactionIds) {
      return [];
    }
    
    return Array.from(interactionIds)
      .map(id => this.interactions.get(id))
      .filter(Boolean) as InteractionState[];
  }
  
  async waitForResponse(interactionId: string): Promise<any> {
    const interaction = this.interactions.get(interactionId);
    
    if (!interaction) {
      throw new Error(`Interaction not found: ${interactionId}`);
    }
    
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
          
          if (interaction.options.fallbackValue !== undefined) {
            resolve(interaction.options.fallbackValue);
          } else {
            reject(new Error(`Interaction timed out: ${interactionId}`));
          }
        }
      };
      
      const cancelHandler = (cancelledInteraction: InteractionState) => {
        if (cancelledInteraction.id === interactionId) {
          this.off('interactionResponded', responseHandler);
          this.off('interactionTimeout', timeoutHandler);
          this.off('interactionCancelled', cancelHandler);
          reject(new Error(`Interaction cancelled: ${interactionId}`));
        }
      };
      
      this.on('interactionResponded', responseHandler);
      this.on('interactionTimeout', timeoutHandler);
      this.on('interactionCancelled', cancelHandler);
    });
  }
  
  private calculateExpiration(timeout?: number): Date | undefined {
    if (!timeout) {
      timeout = this.config.defaultTimeout || 300000; // 5 minutes default
    }
    
    const maxTimeout = this.config.maxTimeout || 3600000; // 1 hour max
    timeout = Math.min(timeout, maxTimeout);
    
    return new Date(Date.now() + timeout);
  }
  
  private scheduleTimeout(interactionId: string, expiresAt: Date): void {
    const delay = expiresAt.getTime() - Date.now();
    
    setTimeout(() => {
      const interaction = this.interactions.get(interactionId);
      if (interaction && interaction.status === 'waiting') {
        interaction.status = 'timeout';
        interaction.metadata.timeoutAt = new Date().toISOString();
        
        this.emit('interactionTimeout', interaction);
        
        // Handle retry if configured
        if (interaction.options.retryOnTimeout && this.shouldRetry(interaction)) {
          this.retryInteraction(interaction);
        }
      }
    }, delay);
  }
  
  private clearTimeout(interactionId: string): void {
    // In a real implementation, we'd track timeout handles and clear them
    // For now, the timeout will just be a no-op if interaction is already responded
  }
  
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
      
      default:
        return { isValid: true };
    }
  }
  
  private validateApprovalResponse(response: any): { isValid: boolean; error?: string } {
    if (typeof response !== 'boolean') {
      return { isValid: false, error: 'Approval response must be boolean' };
    }
    return { isValid: true };
  }
  
  private validateInputResponse(
    interaction: InteractionState,
    response: any
  ): { isValid: boolean; error?: string } {
    const options = interaction.options as InputOptions;
    
    if (options.validation) {
      const validation = options.validation;
      
      if (validation.required && !response) {
        return { isValid: false, error: 'Response is required' };
      }
      
      if (typeof response === 'string') {
        if (validation.minLength && response.length < validation.minLength) {
          return { isValid: false, error: `Response must be at least ${validation.minLength} characters` };
        }
        
        if (validation.maxLength && response.length > validation.maxLength) {
          return { isValid: false, error: `Response must not exceed ${validation.maxLength} characters` };
        }
        
        if (validation.pattern && !new RegExp(validation.pattern).test(response)) {
          return { isValid: false, error: 'Response does not match required pattern' };
        }
      }
      
      if (validation.customValidator && !validation.customValidator(response)) {
        return { isValid: false, error: 'Response failed custom validation' };
      }
    }
    
    return { isValid: true };
  }
  
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
        return { isValid: false, error: `Must select at least ${options.minSelections} options` };
      }
      
      if (options.maxSelections && response.length > options.maxSelections) {
        return { isValid: false, error: `Must select at most ${options.maxSelections} options` };
      }
    }
    
    return { isValid: true };
  }
  
  private validateConfirmationResponse(response: any): { isValid: boolean; error?: string } {
    if (typeof response !== 'boolean') {
      return { isValid: false, error: 'Confirmation response must be boolean' };
    }
    return { isValid: true };
  }
  
  private async streamInteractionPrompt(interaction: InteractionState): Promise<void> {
    if (!this.streamingManager) return;
    
    this.streamingManager.streamHumanPrompt(
      interaction.sessionId,
      interaction.prompt,
      {
        type: interaction.type,
        timeout: interaction.options.timeout,
        metadata: interaction.metadata
      }
    );
  }
  
  private async streamInteractionResponse(interaction: InteractionState): Promise<void> {
    if (!this.streamingManager) return;
    
    this.streamingManager.streamHumanResponse(
      interaction.sessionId,
      interaction.response
    );
  }
  
  private async checkRateLimit(sessionId: string): Promise<void> {
    if (!this.config.rateLimiting?.enabled) return;
    
    const sessionInteractions = this.getSessionInteractions(sessionId);
    const recentInteractions = sessionInteractions.filter(
      i => Date.now() - i.createdAt.getTime() < 60000 // Last minute
    );
    
    if (recentInteractions.length >= (this.config.rateLimiting.maxRequestsPerMinute || 10)) {
      throw new Error('Rate limit exceeded for human interactions');
    }
  }
  
  private shouldRetry(interaction: InteractionState): boolean {
    const retryCount = interaction.metadata.retryCount || 0;
    const maxRetries = this.config.retryPolicy?.maxRetries || 0;
    
    return retryCount < maxRetries;
  }
  
  private async retryInteraction(interaction: InteractionState): Promise<void> {
    const retryCount = (interaction.metadata.retryCount || 0) + 1;
    interaction.metadata.retryCount = retryCount;
    interaction.status = 'waiting';
    
    // Schedule new timeout
    if (interaction.options.timeout) {
      interaction.expiresAt = this.calculateExpiration(interaction.options.timeout);
      if (interaction.expiresAt) {
        this.scheduleTimeout(interaction.id, interaction.expiresAt);
      }
    }
    
    // Stream retry prompt
    if (this.streamingManager && this.config.streaming?.enabled) {
      await this.streamInteractionPrompt(interaction);
    }
    
    this.emit('interactionRetry', interaction);
  }
}
```

### Step 3: Human-in-the-Loop Module Implementation
Create `modules/human-loop/human-loop-module.ts`:

```typescript
import { EventEmitter } from 'events';
import { InteractionStateManager } from './interaction-state-manager';
import { AutoApprovalEngine } from './auto-approval-engine';
import { InteractionPersistence } from './interaction-persistence';
import { IModule } from '../base/types';

export class HumanLoopModule extends EventEmitter implements IHumanLoopModule, IModule {
  readonly name = 'humanLoop';
  readonly version = '1.0.0';
  
  private stateManager: InteractionStateManager;
  private autoApprovalEngine?: AutoApprovalEngine;
  private persistence?: InteractionPersistence;
  private config: HumanLoopConfig;
  private initialized = false;
  
  async initialize(config: HumanLoopConfig): Promise<void> {
    this.config = {
      defaultTimeout: 300000, // 5 minutes
      maxTimeout: 3600000,    // 1 hour
      retryPolicy: {
        maxRetries: 2,
        retryDelay: 5000,
        backoffMultiplier: 1.5
      },
      persistence: {
        enabled: true,
        storage: 'memory',
        retentionDays: 30
      },
      streaming: {
        enabled: true,
        realTimeUpdates: true
      },
      rateLimiting: {
        enabled: true,
        maxRequestsPerMinute: 10,
        maxConcurrentInteractions: 5
      },
      ...config
    };
    
    // Initialize components
    const streamingManager = AgentHub.getInstance()?.getModule('streamingManager');
    this.stateManager = new InteractionStateManager(this.config, streamingManager);
    
    // Set up auto-approval engine
    if (this.config.autoApproval?.enabled) {
      this.autoApprovalEngine = new AutoApprovalEngine(this.config.autoApproval.rules);
    }
    
    // Set up persistence
    if (this.config.persistence?.enabled) {
      this.persistence = new InteractionPersistence(this.config.persistence);
      await this.persistence.initialize();
    }
    
    // Forward events
    this.stateManager.on('interactionCreated', (interaction) => {
      this.emit('interactionCreated', interaction);
    });
    
    this.stateManager.on('interactionResponded', (interaction) => {
      this.emit('interactionResponded', interaction);
      
      // Persist if enabled
      if (this.persistence) {
        this.persistence.saveInteraction(interaction).catch(console.error);
      }
    });
    
    this.initialized = true;
  }
  
  async requestApproval(
    sessionId: string,
    prompt: string,
    options?: ApprovalOptions
  ): Promise<boolean> {
    this.ensureInitialized();
    
    // Check auto-approval first
    if (this.autoApprovalEngine && options) {
      const autoResult = await this.autoApprovalEngine.checkAutoApproval(
        prompt,
        options,
        { sessionId }
      );
      
      if (autoResult.shouldAutoApprove) {
        // Log auto-approval
        this.emit('autoApproval', {
          sessionId,
          prompt,
          approved: autoResult.approved,
          reason: autoResult.reason
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
    return await this.stateManager.waitForResponse(interactionId);
  }
  
  async requestInput(
    sessionId: string,
    prompt: string,
    options?: InputOptions
  ): Promise<any> {
    this.ensureInitialized();
    
    const interactionId = await this.stateManager.createInteraction(sessionId, {
      type: 'input',
      prompt,
      options
    });
    
    return await this.stateManager.waitForResponse(interactionId);
  }
  
  async requestChoice(
    sessionId: string,
    prompt: string,
    choices: Choice[],
    options?: ChoiceOptions
  ): Promise<string> {
    this.ensureInitialized();
    
    const interactionId = await this.stateManager.createInteraction(sessionId, {
      type: 'choice',
      prompt,
      options: {
        ...options,
        choices
      } as any
    });
    
    return await this.stateManager.waitForResponse(interactionId);
  }
  
  async requestConfirmation(
    sessionId: string,
    prompt: string,
    options?: ConfirmationOptions
  ): Promise<boolean> {
    this.ensureInitialized();
    
    const interactionId = await this.stateManager.createInteraction(sessionId, {
      type: 'confirmation',
      prompt,
      options
    });
    
    return await this.stateManager.waitForResponse(interactionId);
  }
  
  async requestCustomInteraction<T>(
    sessionId: string,
    interaction: CustomInteraction
  ): Promise<T> {
    this.ensureInitialized();
    
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
    
    return await this.stateManager.waitForResponse(interactionId);
  }
  
  async cancelInteraction(interactionId: string): Promise<void> {
    this.ensureInitialized();
    await this.stateManager.cancelInteraction(interactionId);
  }
  
  async getInteractionStatus(interactionId: string): Promise<InteractionStatus> {
    this.ensureInitialized();
    
    const interaction = this.stateManager.getInteraction(interactionId);
    return interaction?.status || 'pending';
  }
  
  async requestMultiple(
    sessionId: string,
    interactions: InteractionRequest[]
  ): Promise<InteractionResponse[]> {
    this.ensureInitialized();
    
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
          error: error.message,
          metadata: {
            responseTime: Date.now(),
            attempts: 1,
            finalStatus: 'failed' as InteractionStatus
          }
        };
      }
    });
    
    return Promise.all(promises);
  }
  
  async getInteractionHistory(
    sessionId: string,
    limit?: number
  ): Promise<InteractionRecord[]> {
    this.ensureInitialized();
    
    if (this.persistence) {
      return await this.persistence.getInteractionHistory(sessionId, limit);
    }
    
    // Fallback to in-memory state
    const interactions = this.stateManager.getSessionInteractions(sessionId);
    const sorted = interactions
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    if (limit) {
      return sorted.slice(0, limit).map(this.convertToRecord);
    }
    
    return sorted.map(this.convertToRecord);
  }
  
  async exportInteractionData(
    filters: InteractionFilter
  ): Promise<InteractionExport> {
    this.ensureInitialized();
    
    if (this.persistence) {
      return await this.persistence.exportInteractionData(filters);
    }
    
    throw new Error('Persistence not enabled - cannot export interaction data');
  }
  
  // API for external systems to respond to interactions
  async respondToInteraction(
    interactionId: string,
    response: any,
    metadata?: Record<string, any>
  ): Promise<boolean> {
    this.ensureInitialized();
    
    return await this.stateManager.respondToInteraction(interactionId, response, metadata);
  }
  
  async health(): Promise<HealthStatus> {
    try {
      const interactions = Array.from(this.stateManager['interactions'].values());
      const pendingCount = interactions.filter(i => i.status === 'waiting').length;
      
      return {
        status: 'healthy',
        message: 'Human-in-the-loop module operational',
        details: {
          totalInteractions: interactions.length,
          pendingInteractions: pendingCount,
          autoApprovalEnabled: !!this.autoApprovalEngine,
          persistenceEnabled: !!this.persistence
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error.message,
        details: { error }
      };
    }
  }
  
  async shutdown(): Promise<void> {
    if (this.persistence) {
      await this.persistence.shutdown();
    }
    
    this.initialized = false;
  }
  
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('Human-in-the-loop module not initialized');
    }
  }
  
  private convertToRecord(interaction: InteractionState): InteractionRecord {
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
```

### Step 4: Auto-Approval Engine
Create `modules/human-loop/auto-approval-engine.ts`:

```typescript
export class AutoApprovalEngine {
  private rules: AutoApprovalRule[];
  
  constructor(rules: AutoApprovalRule[]) {
    this.rules = rules;
  }
  
  async checkAutoApproval(
    prompt: string,
    options: ApprovalOptions,
    context: { sessionId: string; [key: string]: any }
  ): Promise<{ shouldAutoApprove: boolean; approved: boolean; reason?: string }> {
    // Evaluate each rule
    for (const rule of this.rules) {
      const matches = await this.evaluateRule(rule, prompt, options, context);
      
      if (matches) {
        return {
          shouldAutoApprove: true,
          approved: rule.action === 'approve',
          reason: `Auto-${rule.action} based on rule: ${rule.description}`
        };
      }
    }
    
    return { shouldAutoApprove: false, approved: false };
  }
  
  private async evaluateRule(
    rule: AutoApprovalRule,
    prompt: string,
    options: ApprovalOptions,
    context: any
  ): Promise<boolean> {
    // All conditions must match
    for (const condition of rule.conditions) {
      const matches = await this.evaluateCondition(condition, prompt, options, context);
      if (!matches) {
        return false;
      }
    }
    
    return true;
  }
  
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
        value = options.riskLevel;
        break;
      default:
        return false;
    }
    
    // Evaluate condition
    return this.evaluateOperator(condition.operator, value, condition.value);
  }
  
  private evaluateOperator(operator: string, actual: any, expected: any): boolean {
    switch (operator) {
      case 'equals':
        return actual === expected;
      case 'not_equals':
        return actual !== expected;
      case 'greater_than':
        return actual > expected;
      case 'less_than':
        return actual < expected;
      case 'contains':
        return typeof actual === 'string' && actual.includes(expected);
      case 'regex':
        return typeof actual === 'string' && new RegExp(expected).test(actual);
      default:
        return false;
    }
  }
  
  private getTimeValue(field: string): any {
    const now = new Date();
    
    switch (field) {
      case 'hour':
        return now.getHours();
      case 'day_of_week':
        return now.getDay();
      case 'timestamp':
        return now.getTime();
      default:
        return null;
    }
  }
}
```

### Step 5: Human-in-the-Loop Module Factory
Create `modules/human-loop/factory.ts`:

```typescript
import { IModuleFactory } from '../base/factory';
import { HumanLoopModule } from './human-loop-module';
import { HumanLoopConfig } from './types';

export class HumanLoopModuleFactory implements IModuleFactory<HumanLoopModule> {
  create(config?: HumanLoopConfig): HumanLoopModule {
    return new HumanLoopModule();
  }
}

// Export for registration
export const humanLoopModuleFactory = new HumanLoopModuleFactory();
```

## Testing Requirements

### 1. Unit Tests
- Interaction state management
- Auto-approval rule evaluation
- Response validation
- Timeout handling
- Rate limiting

### 2. Integration Tests
- Full approval workflow
- Multi-interaction scenarios
- Streaming integration
- Persistence integration
- Error recovery

### 3. Performance Tests
- High-volume interaction handling
- Response latency measurement
- Memory usage monitoring
- Concurrent interaction limits

## Usage Examples

```typescript
// Initialize human-in-the-loop module
const humanLoop = new HumanLoopModule();
await humanLoop.initialize({
  defaultTimeout: 300000,
  autoApproval: {
    enabled: true,
    rules: [
      {
        id: 'low-risk-auto-approve',
        description: 'Auto-approve low risk actions during business hours',
        conditions: [
          { field: 'riskLevel', operator: 'equals', value: 'low', type: 'risk' },
          { field: 'hour', operator: 'greater_than', value: 8, type: 'time' },
          { field: 'hour', operator: 'less_than', value: 18, type: 'time' }
        ],
        action: 'approve'
      }
    ]
  }
});

// Request approval in agent workflow
const approved = await humanLoop.requestApproval(
  'session-123',
  'Approve deletion of 5 old files?',
  {
    riskLevel: 'medium',
    context: 'File cleanup operation',
    timeout: 600000 // 10 minutes
  }
);

// Request input with validation
const userEmail = await humanLoop.requestInput(
  'session-123',
  'Please enter your email address:',
  {
    inputType: 'email',
    validation: {
      pattern: '^[^@]+@[^@]+\\.[^@]+$',
      required: true
    },
    placeholder: 'user@example.com'
  }
);

// Request choice selection
const selectedOption = await humanLoop.requestChoice(
  'session-123',
  'Which deployment environment?',
  [
    { id: 'dev', label: 'Development', value: 'dev' },
    { id: 'staging', label: 'Staging', value: 'staging' },
    { id: 'prod', label: 'Production', value: 'production' }
  ],
  {
    timeout: 120000 // 2 minutes
  }
);

// Integration with Graph Agent
class InteractiveAgent extends GraphAgent {
  protected async executeCore(input: GraphAgentInput): Promise<GraphAgentOutput> {
    // Check if human approval is needed
    if (this.requiresApproval(input)) {
      const approved = await this.modules.humanLoop.requestApproval(
        input.sessionId,
        `Approve execution of ${this.config.name}?`,
        {
          riskLevel: this.assessRiskLevel(input),
          context: `Agent: ${this.config.name}, Input: ${JSON.stringify(input)}`
        }
      );
      
      if (!approved) {
        throw new Error('Human approval required but not granted');
      }
    }
    
    return super.executeCore(input);
  }
}
```

## Next Steps
After completing the Human-in-the-Loop module, update the session-state module (03-session-state-module-implementation.md) for enhanced runtime persistence integration.