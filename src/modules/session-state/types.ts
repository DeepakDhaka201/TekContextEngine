/**
 * @fileoverview Type definitions for the Session State system
 * @module modules/session-state/types
 * @requires None - Pure type definitions
 * 
 * This file defines all interfaces, types, and enums used throughout the Session State
 * system. These types handle session management, conversation history, user state,
 * and persistent storage for the AgentHub system.
 * 
 * Key concepts:
 * - Session lifecycle and state management
 * - Conversation history and turn tracking
 * - User preferences and context
 * - Persistent storage abstraction
 * - Memory and caching strategies
 * 
 * @example
 * ```typescript
 * import { ISessionStateModule, SessionConfig, ConversationTurn } from './types';
 * 
 * const session = await sessionState.getSession('user-123');
 * await session.addTurn({
 *   role: 'user',
 *   content: 'Hello!',
 *   timestamp: new Date()
 * });
 * ```
 * 
 * @since 1.0.0
 */

import { IModule, HealthStatus } from '../registry/types';

/**
 * Core interface for the Session State module.
 * 
 * Manages user sessions, conversation history, and persistent state
 * across agent interactions. Provides a unified API for session
 * management with support for multiple storage backends.
 * 
 * Key responsibilities:
 * - Create and manage user sessions
 * - Persist conversation history
 * - Handle user preferences and context
 * - Manage session lifecycle and cleanup
 * - Provide efficient querying and filtering
 * 
 * @example
 * ```typescript
 * class SessionStateModule implements ISessionStateModule {
 *   async createSession(config: SessionConfig): Promise<ISession> {
 *     const session = new Session(config);
 *     await this.storage.save(session);
 *     return session;
 *   }
 * }
 * ```
 * 
 * @public
 */
export interface ISessionStateModule extends IModule {
  /**
   * Creates a new session with the provided configuration.
   * 
   * @param config - Session configuration
   * @returns Promise resolving to new session instance
   * @throws {SessionCreationError} If session creation fails
   */
  createSession(config: SessionConfig): Promise<ISession>;
  
  /**
   * Retrieves an existing session by ID.
   * 
   * @param sessionId - Session identifier
   * @param options - Optional retrieval options
   * @returns Promise resolving to session or null if not found
   * @throws {SessionRetrievalError} If retrieval fails
   */
  getSession(sessionId: string, options?: SessionRetrievalOptions): Promise<ISession | null>;
  
  /**
   * Lists sessions matching the provided criteria.
   * 
   * @param criteria - Search criteria
   * @param options - Optional query options
   * @returns Promise resolving to array of matching sessions
   */
  listSessions(criteria: SessionSearchCriteria, options?: SessionQueryOptions): Promise<ISession[]>;
  
  /**
   * Updates session configuration or metadata.
   * 
   * @param sessionId - Session identifier
   * @param updates - Configuration updates to apply
   * @returns Promise resolving to updated session
   * @throws {SessionUpdateError} If update fails
   */
  updateSession(sessionId: string, updates: Partial<SessionConfig>): Promise<ISession>;
  
  /**
   * Deletes a session and all associated data.
   * 
   * @param sessionId - Session identifier
   * @param options - Optional deletion options
   * @returns Promise that resolves when deletion is complete
   * @throws {SessionDeletionError} If deletion fails
   */
  deleteSession(sessionId: string, options?: SessionDeletionOptions): Promise<void>;
  
  /**
   * Archives old or inactive sessions.
   * 
   * @param criteria - Criteria for sessions to archive
   * @returns Promise resolving to number of sessions archived
   */
  archiveSessions(criteria: SessionArchiveCriteria): Promise<number>;
  
  /**
   * Performs cleanup operations on session storage.
   * 
   * @param options - Cleanup configuration
   * @returns Promise resolving to cleanup statistics
   */
  cleanup(options?: SessionCleanupOptions): Promise<SessionCleanupStats>;
  
  /**
   * Gets session statistics and metrics.
   * 
   * @param timeRange - Optional time range for statistics
   * @returns Promise resolving to session statistics
   */
  getStats(timeRange?: TimeRange): Promise<SessionStats>;
}

/**
 * Interface representing an individual user session.
 * 
 * Contains all session-related data including conversation history,
 * user preferences, context, and metadata. Provides methods for
 * manipulating session state and persisting changes.
 * 
 * @public
 */
export interface ISession {
  /** Unique session identifier */
  readonly id: string;
  
  /** User associated with this session */
  readonly userId?: string;
  
  /** Session creation timestamp */
  readonly createdAt: Date;
  
  /** Last activity timestamp */
  readonly updatedAt: Date;
  
  /** Session configuration */
  readonly config: SessionConfig;
  
  /** Session metadata */
  readonly metadata: SessionMetadata;
  
  /** Current session status */
  readonly status: SessionStatus;
  
  /**
   * Gets conversation history with optional filtering.
   * 
   * @param options - Optional filtering options
   * @returns Promise resolving to conversation turns
   */
  getHistory(options?: HistoryQueryOptions): Promise<ConversationTurn[]>;
  
  /**
   * Adds a new turn to the conversation history.
   * 
   * @param turn - Conversation turn to add
   * @returns Promise that resolves when turn is saved
   */
  addTurn(turn: Omit<ConversationTurn, 'id' | 'sessionId'>): Promise<ConversationTurn>;
  
  /**
   * Updates an existing conversation turn.
   * 
   * @param turnId - Turn identifier
   * @param updates - Updates to apply
   * @returns Promise resolving to updated turn
   */
  updateTurn(turnId: string, updates: Partial<ConversationTurn>): Promise<ConversationTurn>;
  
  /**
   * Deletes a conversation turn.
   * 
   * @param turnId - Turn identifier
   * @returns Promise that resolves when turn is deleted
   */
  deleteTurn(turnId: string): Promise<void>;
  
  /**
   * Gets a value from session context.
   * 
   * @param key - Context key
   * @returns Promise resolving to value or undefined
   */
  getContext(key: string): Promise<any>;
  
  /**
   * Sets a value in session context.
   * 
   * @param key - Context key
   * @param value - Value to store
   * @returns Promise that resolves when value is saved
   */
  setContext(key: string, value: any): Promise<void>;
  
  /**
   * Removes a value from session context.
   * 
   * @param key - Context key to remove
   * @returns Promise that resolves when key is removed
   */
  removeContext(key: string): Promise<void>;
  
  /**
   * Gets all context keys and values.
   * 
   * @returns Promise resolving to context object
   */
  getAllContext(): Promise<Record<string, any>>;
  
  /**
   * Clears all context data.
   * 
   * @returns Promise that resolves when context is cleared
   */
  clearContext(): Promise<void>;
  
  /**
   * Updates session metadata.
   * 
   * @param updates - Metadata updates
   * @returns Promise that resolves when metadata is updated
   */
  updateMetadata(updates: Partial<SessionMetadata>): Promise<void>;
  
  /**
   * Extends session expiration time.
   * 
   * @param additionalTime - Additional time in milliseconds
   * @returns Promise that resolves when expiration is updated
   */
  extendExpiration(additionalTime: number): Promise<void>;
  
  /**
   * Archives the session.
   * 
   * @param reason - Optional archival reason
   * @returns Promise that resolves when session is archived
   */
  archive(reason?: string): Promise<void>;
  
  /**
   * Saves current session state to storage.
   * 
   * @returns Promise that resolves when session is saved
   */
  save(): Promise<void>;
  
  /**
   * Refreshes session data from storage.
   * 
   * @returns Promise that resolves when session is refreshed
   */
  refresh(): Promise<void>;
}

/**
 * Configuration for creating or updating sessions.
 */
export interface SessionConfig {
  /** Session identifier */
  id?: string;
  
  /** User identifier */
  userId?: string;
  
  /** Session title or name */
  title?: string;
  
  /** Session description */
  description?: string;
  
  /** Session language preference */
  language?: string;
  
  /** User timezone */
  timezone?: string;
  
  /** Session expiration time in milliseconds */
  expiresIn?: number;
  
  /** Maximum conversation history length */
  maxHistoryLength?: number;
  
  /** Maximum context size in bytes */
  maxContextSize?: number;
  
  /** Whether to persist conversation history */
  persistHistory?: boolean;
  
  /** Whether to enable session recovery */
  enableRecovery?: boolean;
  
  /** Custom session tags */
  tags?: string[];
  
  /** User preferences */
  preferences?: SessionPreferences;
  
  /** Storage configuration */
  storage?: SessionStorageConfig;
}

/**
 * User preferences within a session.
 */
export interface SessionPreferences {
  /** Preferred response format */
  responseFormat?: 'text' | 'json' | 'markdown' | 'html';
  
  /** Preferred response length */
  responseLength?: 'short' | 'medium' | 'long' | 'detailed';
  
  /** Preferred communication style */
  communicationStyle?: 'formal' | 'casual' | 'technical' | 'friendly';
  
  /** Whether to include explanations */
  includeExplanations?: boolean;
  
  /** Whether to show intermediate steps */
  showThinking?: boolean;
  
  /** Custom user preferences */
  custom?: Record<string, any>;
}

/**
 * Storage configuration for sessions.
 */
export interface SessionStorageConfig {
  /** Storage backend type */
  backend?: 'memory' | 'redis' | 'database' | 'file';
  
  /** Storage connection configuration */
  connection?: Record<string, any>;
  
  /** Whether to use compression */
  compression?: boolean;
  
  /** Whether to encrypt sensitive data */
  encryption?: boolean;
  
  /** Custom storage options */
  options?: Record<string, any>;
}

/**
 * Session metadata and tracking information.
 */
export interface SessionMetadata {
  /** Session creation timestamp */
  createdAt: Date;
  
  /** Last update timestamp */
  updatedAt: Date;
  
  /** Last access timestamp */
  lastAccessedAt?: Date;
  
  /** Session expiration timestamp */
  expiresAt?: Date;
  
  /** User agent string */
  userAgent?: string;
  
  /** Client IP address */
  ipAddress?: string;
  
  /** Geographic location */
  location?: {
    country?: string;
    region?: string;
    city?: string;
  };
  
  /** Device information */
  device?: {
    type?: 'mobile' | 'tablet' | 'desktop';
    os?: string;
    browser?: string;
  };
  
  /** Session statistics */
  stats?: {
    turnCount: number;
    totalTokens: number;
    totalCost: number;
    averageResponseTime: number;
  };
  
  /** Custom metadata */
  custom?: Record<string, any>;
  
  /** Session tags */
  tags?: string[];
  
  /** Archival information */
  archived?: {
    archivedAt: Date;
    reason?: string;
  };
}

/**
 * Individual conversation turn.
 */
export interface ConversationTurn {
  /** Unique turn identifier */
  id: string;
  
  /** Session this turn belongs to */
  sessionId: string;
  
  /** Turn sequence number */
  sequence: number;
  
  /** Role of the message sender */
  role: 'user' | 'assistant' | 'system' | 'function';
  
  /** Message content */
  content: string;
  
  /** Content type/format */
  contentType?: string;
  
  /** Turn timestamp */
  timestamp: Date;
  
  /** Turn metadata */
  metadata?: TurnMetadata;
  
  /** Associated function calls */
  functionCalls?: FunctionCall[];
  
  /** Turn attachments */
  attachments?: TurnAttachment[];
  
  /** Turn annotations */
  annotations?: TurnAnnotation[];
}

/**
 * Metadata for conversation turns.
 */
export interface TurnMetadata {
  /** Model used for generation */
  model?: string;
  
  /** Generation parameters */
  parameters?: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    frequencyPenalty?: number;
  };
  
  /** Token usage information */
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  
  /** Cost information */
  cost?: {
    inputCost: number;
    outputCost: number;
    totalCost: number;
  };
  
  /** Performance metrics */
  performance?: {
    latency: number;
    processingTime: number;
    queueTime?: number;
  };
  
  /** Quality metrics */
  quality?: {
    confidence: number;
    coherence?: number;
    relevance?: number;
  };
  
  /** User feedback */
  feedback?: {
    rating?: number;
    helpful?: boolean;
    comment?: string;
  };
  
  /** Custom metadata */
  custom?: Record<string, any>;
}

/**
 * Function call information.
 */
export interface FunctionCall {
  /** Function name */
  name: string;
  
  /** Function arguments */
  arguments: Record<string, any>;
  
  /** Function result */
  result?: any;
  
  /** Execution status */
  status: 'pending' | 'success' | 'error';
  
  /** Error information */
  error?: string;
  
  /** Execution timestamp */
  timestamp: Date;
  
  /** Execution duration */
  duration?: number;
}

/**
 * Turn attachment information.
 */
export interface TurnAttachment {
  /** Attachment identifier */
  id: string;
  
  /** Attachment name */
  name: string;
  
  /** Attachment type/MIME type */
  type: string;
  
  /** Attachment size in bytes */
  size: number;
  
  /** Attachment URL or path */
  url?: string;
  
  /** Base64 encoded content */
  content?: string;
  
  /** Attachment metadata */
  metadata?: Record<string, any>;
}

/**
 * Turn annotation information.
 */
export interface TurnAnnotation {
  /** Annotation type */
  type: string;
  
  /** Annotation value */
  value: any;
  
  /** Annotation source */
  source?: string;
  
  /** Annotation confidence */
  confidence?: number;
  
  /** Annotation timestamp */
  timestamp: Date;
}

/**
 * Session status enumeration.
 */
export type SessionStatus = 
  | 'active'      // Session is currently active
  | 'idle'        // Session is idle but not expired
  | 'expired'     // Session has expired
  | 'archived'    // Session has been archived
  | 'deleted';    // Session has been deleted

/**
 * Options for retrieving sessions.
 */
export interface SessionRetrievalOptions {
  /** Whether to include conversation history */
  includeHistory?: boolean;
  
  /** Whether to include full context */
  includeContext?: boolean;
  
  /** Whether to include metadata */
  includeMetadata?: boolean;
  
  /** Maximum history items to include */
  maxHistoryItems?: number;
  
  /** Whether to refresh from storage */
  refresh?: boolean;
}

/**
 * Search criteria for finding sessions.
 */
export interface SessionSearchCriteria {
  /** User identifier filter */
  userId?: string;
  
  /** Session status filter */
  status?: SessionStatus[];
  
  /** Created date range */
  createdAfter?: Date;
  createdBefore?: Date;
  
  /** Updated date range */
  updatedAfter?: Date;
  updatedBefore?: Date;
  
  /** Tag filters */
  tags?: string[];
  
  /** Language filter */
  language?: string;
  
  /** Text search in title/description */
  search?: string;
  
  /** Custom filters */
  custom?: Record<string, any>;
}

/**
 * Options for querying sessions.
 */
export interface SessionQueryOptions {
  /** Number of results to return */
  limit?: number;
  
  /** Number of results to skip */
  offset?: number;
  
  /** Sort field and direction */
  sort?: {
    field: string;
    direction: 'asc' | 'desc';
  };
  
  /** Fields to include in results */
  fields?: string[];
  
  /** Whether to include counts */
  includeCounts?: boolean;
}

/**
 * Options for deleting sessions.
 */
export interface SessionDeletionOptions {
  /** Whether to perform hard delete */
  hardDelete?: boolean;
  
  /** Whether to delete associated data */
  deleteAssociatedData?: boolean;
  
  /** Deletion reason */
  reason?: string;
}

/**
 * Criteria for archiving sessions.
 */
export interface SessionArchiveCriteria {
  /** Archive sessions older than this date */
  olderThan?: Date;
  
  /** Archive sessions inactive for this duration (ms) */
  inactiveFor?: number;
  
  /** Archive sessions with these statuses */
  status?: SessionStatus[];
  
  /** Archive sessions with these tags */
  tags?: string[];
  
  /** Maximum number to archive */
  limit?: number;
}

/**
 * Session cleanup configuration.
 */
export interface SessionCleanupOptions {
  /** Delete expired sessions */
  deleteExpired?: boolean;
  
  /** Archive old sessions */
  archiveOld?: boolean;
  
  /** Compress old data */
  compressOld?: boolean;
  
  /** Clean up orphaned data */
  cleanupOrphans?: boolean;
  
  /** Maximum cleanup duration */
  maxDuration?: number;
  
  /** Batch size for operations */
  batchSize?: number;
}

/**
 * Session cleanup statistics.
 */
export interface SessionCleanupStats {
  /** Number of sessions deleted */
  deleted: number;
  
  /** Number of sessions archived */
  archived: number;
  
  /** Number of sessions compressed */
  compressed: number;
  
  /** Number of orphans cleaned */
  orphansCleaned: number;
  
  /** Space reclaimed in bytes */
  spaceReclaimed: number;
  
  /** Cleanup duration in milliseconds */
  duration: number;
  
  /** Any errors encountered */
  errors: string[];
}

/**
 * Session statistics and metrics.
 */
export interface SessionStats {
  /** Total number of sessions */
  totalSessions: number;
  
  /** Sessions by status */
  byStatus: Record<SessionStatus, number>;
  
  /** Active sessions count */
  activeSessions: number;
  
  /** New sessions in time range */
  newSessions: number;
  
  /** Average session duration */
  avgSessionDuration: number;
  
  /** Total conversation turns */
  totalTurns: number;
  
  /** Average turns per session */
  avgTurnsPerSession: number;
  
  /** Token usage statistics */
  tokenUsage: {
    total: number;
    average: number;
  };
  
  /** Cost statistics */
  cost: {
    total: number;
    average: number;
  };
  
  /** Storage usage */
  storageUsage: {
    sessions: number;
    history: number;
    context: number;
    total: number;
  };
}

/**
 * Time range for statistics.
 */
export interface TimeRange {
  /** Start date */
  from: Date;
  
  /** End date */
  to: Date;
}

/**
 * Options for querying conversation history.
 */
export interface HistoryQueryOptions {
  /** Maximum number of turns to return */
  limit?: number;
  
  /** Number of turns to skip */
  offset?: number;
  
  /** Filter by role */
  role?: ('user' | 'assistant' | 'system' | 'function')[];
  
  /** Filter by date range */
  after?: Date;
  before?: Date;
  
  /** Whether to include metadata */
  includeMetadata?: boolean;
  
  /** Whether to include attachments */
  includeAttachments?: boolean;
  
  /** Sort order */
  sort?: 'asc' | 'desc';
}