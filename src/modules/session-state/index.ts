/**
 * @fileoverview Public API exports for the Session State module
 * @module modules/session-state
 * @requires ./types
 * @requires ./errors
 * @requires ./session-state-module
 * @requires ./factory
 * @requires ./session
 * @requires ./storage/base-storage
 * @requires ./storage/redis-storage
 * 
 * This file provides the main public API for the Session State module, exporting
 * all interfaces, types, classes, and factory functions needed by consumers.
 * 
 * The Session State module provides comprehensive session management for AI agent
 * applications including conversation history, context storage, and multi-backend
 * persistence.
 * 
 * @example
 * ```typescript
 * import { createSessionStateModule, SessionConfig } from '@/modules/session-state';
 * 
 * // Create and initialize module
 * const sessionState = createSessionStateModule({
 *   storage: {
 *     backend: 'redis',
 *     connection: { host: 'localhost', port: 6379 },
 *     compression: true
 *   },
 *   defaults: {
 *     maxHistoryLength: 1000,
 *     expiresIn: 24 * 60 * 60 * 1000
 *   }
 * });
 * await sessionState.initialize(config);
 * 
 * // Create and manage sessions
 * const session = await sessionState.createSession({
 *   userId: 'user-123',
 *   title: 'Chat Session'
 * });
 * 
 * // Add conversation turns
 * await session.addTurn({
 *   role: 'user',
 *   content: 'Hello!',
 *   timestamp: new Date()
 * });
 * 
 * // Query sessions
 * const userSessions = await sessionState.listSessions({
 *   userId: 'user-123',
 *   status: ['active']
 * });
 * ```
 * 
 * @since 1.0.0
 */

// Core interfaces and types
export type {
  ISessionStateModule,
  ISession,
  SessionConfig,
  SessionPreferences,
  SessionStorageConfig,
  SessionMetadata,
  ConversationTurn,
  TurnMetadata,
  FunctionCall,
  TurnAttachment,
  TurnAnnotation,
  SessionStatus,
  SessionRetrievalOptions,
  SessionSearchCriteria,
  SessionQueryOptions,
  SessionDeletionOptions,
  SessionArchiveCriteria,
  SessionCleanupOptions,
  SessionCleanupStats,
  SessionStats,
  TimeRange,
  HistoryQueryOptions
} from './types';

// Error classes
export {
  SessionStateError,
  SessionCreationError,
  SessionRetrievalError,
  SessionUpdateError,
  SessionDeletionError,
  ConversationHistoryError,
  SessionContextError,
  SessionValidationError,
  SessionStorageError,
  SessionExpirationError,
  SessionCapacityError,
  SessionArchivalError,
  isSessionStateError,
  createSessionErrorContext,
  SessionErrorSeverity,
  getSessionErrorSeverity
} from './errors';

// Main module implementation
export { SessionStateModule } from './session-state-module';
export type { SessionStateConfig } from './session-state-module';

// Factory functions
export {
  createSessionStateModule,
  createTestSessionStateModule
} from './factory';

// Session implementation (for advanced use cases)
export { Session } from './session';

// Storage implementations (for advanced use cases)
export { BaseStorage } from './storage/base-storage';
export { RedisStorage } from './storage/redis-storage';

// Re-export commonly used types from registry for convenience
export type { HealthStatus } from '../registry/types';

/**
 * Module metadata and version information.
 */
export const MODULE_INFO = {
  name: 'Session State',
  version: '1.0.0',
  description: 'Comprehensive session management with multi-backend storage',
  author: 'AgentHub Team',
  dependencies: ['redis (optional)'],
  capabilities: [
    'session_lifecycle_management',
    'conversation_history_storage',
    'context_persistence',
    'multi_backend_storage',
    'automatic_expiration',
    'session_analytics',
    'performance_caching',
    'data_compression',
    'session_recovery'
  ]
} as const;

/**
 * Supported storage backends.
 */
export const STORAGE_BACKENDS = {
  REDIS: 'redis',
  DATABASE: 'database',
  FILE: 'file',
  MEMORY: 'memory'
} as const;

/**
 * Common session status values.
 */
export const SESSION_STATUS = {
  ACTIVE: 'active',
  IDLE: 'idle',
  EXPIRED: 'expired',
  ARCHIVED: 'archived',
  DELETED: 'deleted'
} as const;

/**
 * Common conversation turn roles.
 */
export const TURN_ROLES = {
  USER: 'user',
  ASSISTANT: 'assistant',
  SYSTEM: 'system',
  FUNCTION: 'function'
} as const;

/**
 * Default configuration templates for common use cases.
 * 
 * These templates provide pre-configured setups for typical
 * session management scenarios.
 */
export const DEFAULT_CONFIGS = {
  /** Minimal configuration for development */
  DEVELOPMENT: {
    storage: {
      backend: 'memory' as const,
      compression: false,
      encryption: false
    },
    defaults: {
      maxHistoryLength: 100,
      maxContextSize: 100 * 1024, // 100KB
      expiresIn: 2 * 60 * 60 * 1000, // 2 hours
      persistHistory: true
    },
    options: {
      maxSessionsPerUser: 5,
      sessionCacheSize: 100,
      enableAnalytics: true
    }
  },
  
  /** Production configuration with Redis storage */
  PRODUCTION: {
    storage: {
      backend: 'redis' as const,
      compression: true,
      encryption: true,
      options: {
        enableIndexing: true,
        batchSize: 100
      }
    },
    defaults: {
      maxHistoryLength: 1000,
      maxContextSize: 1024 * 1024, // 1MB
      expiresIn: 24 * 60 * 60 * 1000, // 24 hours
      persistHistory: true,
      enableRecovery: true
    },
    options: {
      maxSessionsPerUser: 50,
      cleanupInterval: 60 * 60 * 1000, // 1 hour
      enableAnalytics: true,
      sessionCacheSize: 1000
    }
  },
  
  /** Test configuration with minimal settings */
  TEST: {
    storage: {
      backend: 'memory' as const,
      compression: false,
      encryption: false
    },
    defaults: {
      maxHistoryLength: 10,
      maxContextSize: 10 * 1024, // 10KB
      expiresIn: 5 * 60 * 1000, // 5 minutes
      persistHistory: false,
      enableRecovery: false
    },
    options: {
      maxSessionsPerUser: 3,
      sessionCacheSize: 10,
      enableAnalytics: false
    }
  },
  
  /** High-performance configuration with optimizations */
  HIGH_PERFORMANCE: {
    storage: {
      backend: 'redis' as const,
      compression: true,
      encryption: false, // Disabled for performance
      options: {
        enableIndexing: true,
        batchSize: 200, // Larger batches
        compressionAlgorithm: 'brotli' // Better compression
      }
    },
    defaults: {
      maxHistoryLength: 2000, // More history
      maxContextSize: 2048 * 1024, // 2MB
      expiresIn: 48 * 60 * 60 * 1000, // 48 hours
      persistHistory: true,
      enableRecovery: true
    },
    options: {
      maxSessionsPerUser: 100,
      cleanupInterval: 30 * 60 * 1000, // 30 minutes
      enableAnalytics: true,
      sessionCacheSize: 2000 // Larger cache
    }
  },
  
  /** Privacy-focused configuration with enhanced security */
  PRIVACY_FOCUSED: {
    storage: {
      backend: 'redis' as const,
      compression: true,
      encryption: true, // Always encrypt
      options: {
        enableIndexing: false, // Disable indexing for privacy
        batchSize: 50 // Smaller batches for control
      }
    },
    defaults: {
      maxHistoryLength: 500, // Limited history
      maxContextSize: 512 * 1024, // 512KB
      expiresIn: 12 * 60 * 60 * 1000, // 12 hours
      persistHistory: true,
      enableRecovery: false // No recovery for privacy
    },
    options: {
      maxSessionsPerUser: 10,
      cleanupInterval: 15 * 60 * 1000, // 15 minutes - frequent cleanup
      enableAnalytics: false, // No analytics for privacy
      sessionCacheSize: 100
    }
  }
} as const;

/**
 * Utility functions for common operations.
 */
export const SESSION_UTILS = {
  /**
   * Generates a unique session ID.
   * 
   * @returns Unique session identifier
   */
  generateSessionId(): string {
    return `sess-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  },
  
  /**
   * Generates a unique turn ID.
   * 
   * @returns Unique turn identifier
   */
  generateTurnId(): string {
    return `turn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  },
  
  /**
   * Creates a standardized session title.
   * 
   * @param userId - User identifier
   * @param purpose - Optional session purpose
   * @returns Formatted session title
   */
  createSessionTitle(userId: string, purpose?: string): string {
    const timestamp = new Date().toISOString().split('T')[0];
    return purpose 
      ? `${purpose} - ${userId} - ${timestamp}`
      : `Session - ${userId} - ${timestamp}`;
  },
  
  /**
   * Calculates session age in milliseconds.
   * 
   * @param createdAt - Session creation date
   * @returns Session age in milliseconds
   */
  calculateSessionAge(createdAt: Date): number {
    return Date.now() - createdAt.getTime();
  },
  
  /**
   * Checks if a session is expired.
   * 
   * @param expiresAt - Session expiration date
   * @returns True if session is expired
   */
  isSessionExpired(expiresAt?: Date): boolean {
    if (!expiresAt) return false;
    return expiresAt.getTime() <= Date.now();
  },
  
  /**
   * Calculates conversation statistics.
   * 
   * @param turns - Array of conversation turns
   * @returns Conversation statistics
   */
  calculateConversationStats(turns: ConversationTurn[]): {
    totalTurns: number;
    userTurns: number;
    assistantTurns: number;
    systemTurns: number;
    totalTokens: number;
    totalCost: number;
    averageResponseTime: number;
  } {
    let userTurns = 0;
    let assistantTurns = 0;
    let systemTurns = 0;
    let totalTokens = 0;
    let totalCost = 0;
    let totalResponseTime = 0;
    let responseTimeCount = 0;
    
    for (const turn of turns) {
      switch (turn.role) {
        case 'user':
          userTurns++;
          break;
        case 'assistant':
          assistantTurns++;
          break;
        case 'system':
          systemTurns++;
          break;
      }
      
      if (turn.metadata?.tokenUsage?.totalTokens) {
        totalTokens += turn.metadata.tokenUsage.totalTokens;
      }
      
      if (turn.metadata?.cost?.totalCost) {
        totalCost += turn.metadata.cost.totalCost;
      }
      
      if (turn.metadata?.performance?.latency) {
        totalResponseTime += turn.metadata.performance.latency;
        responseTimeCount++;
      }
    }
    
    return {
      totalTurns: turns.length,
      userTurns,
      assistantTurns,
      systemTurns,
      totalTokens,
      totalCost,
      averageResponseTime: responseTimeCount > 0 ? totalResponseTime / responseTimeCount : 0
    };
  }
} as const;

/**
 * Common patterns for different types of sessions.
 * 
 * These patterns can be used as templates for consistent session
 * configuration across different use cases.
 */
export const SESSION_PATTERNS = {
  /** Chat/conversation sessions */
  CHAT: {
    title: 'Chat Session',
    preferences: {
      responseFormat: 'text' as const,
      responseLength: 'medium' as const,
      communicationStyle: 'friendly' as const,
      includeExplanations: false,
      showThinking: false
    },
    tags: ['chat', 'conversation']
  },
  
  /** Support/help sessions */
  SUPPORT: {
    title: 'Support Session',
    preferences: {
      responseFormat: 'markdown' as const,
      responseLength: 'detailed' as const,
      communicationStyle: 'formal' as const,
      includeExplanations: true,
      showThinking: false
    },
    tags: ['support', 'help']
  },
  
  /** Development/coding sessions */
  DEVELOPMENT: {
    title: 'Development Session',
    preferences: {
      responseFormat: 'markdown' as const,
      responseLength: 'detailed' as const,
      communicationStyle: 'technical' as const,
      includeExplanations: true,
      showThinking: true
    },
    tags: ['development', 'coding', 'technical']
  },
  
  /** Learning/educational sessions */
  LEARNING: {
    title: 'Learning Session',
    preferences: {
      responseFormat: 'markdown' as const,
      responseLength: 'detailed' as const,
      communicationStyle: 'friendly' as const,
      includeExplanations: true,
      showThinking: true
    },
    tags: ['learning', 'education', 'tutorial']
  },
  
  /** Research/analysis sessions */
  RESEARCH: {
    title: 'Research Session',
    preferences: {
      responseFormat: 'markdown' as const,
      responseLength: 'detailed' as const,
      communicationStyle: 'formal' as const,
      includeExplanations: true,
      showThinking: true
    },
    tags: ['research', 'analysis', 'investigation']
  }
} as const;

/**
 * Best practice recommendations for using Session State.
 */
export const BEST_PRACTICES = {
  SESSION_MANAGEMENT: [
    'Set appropriate expiration times based on use case',
    'Use meaningful session titles and tags for organization',
    'Implement proper error handling for all session operations',
    'Monitor session statistics for performance optimization',
    'Clean up expired sessions regularly to save storage'
  ],
  
  CONVERSATION_HISTORY: [
    'Set reasonable history limits based on available storage',
    'Include relevant metadata for analytics and debugging',
    'Use pagination when retrieving large conversation histories',
    'Consider archiving old conversations for storage efficiency',
    'Implement proper turn validation to maintain data quality'
  ],
  
  CONTEXT_MANAGEMENT: [
    'Use structured context keys for better organization',
    'Set appropriate context size limits to prevent memory issues',
    'Validate context data before storing to prevent corruption',
    'Clear unused context regularly to optimize storage',
    'Use namespaced keys for different types of context data'
  ],
  
  PERFORMANCE: [
    'Use appropriate cache sizes based on usage patterns',
    'Enable compression for large session data',
    'Use batch operations when working with multiple sessions',
    'Monitor storage backend health and performance',
    'Implement proper indexing for efficient queries'
  ],
  
  SECURITY: [
    'Enable encryption for sensitive session data',
    'Validate all session input data',
    'Implement proper access controls for session operations',
    'Use secure storage backends in production',
    'Regularly audit session data for compliance'
  ]
} as const;