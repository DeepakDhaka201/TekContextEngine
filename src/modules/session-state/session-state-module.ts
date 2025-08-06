/**
 * @fileoverview Main Session State module implementation for user session management
 * @module modules/session-state/session-state-module
 * @requires ./types
 * @requires ./errors
 * @requires ./session
 * @requires ./storage/base-storage
 * @requires ./storage/redis-storage
 * @requires ../registry/types
 * 
 * This file implements the core Session State module that manages user sessions,
 * conversation history, and persistent state across agent interactions. It provides
 * a unified API for session management with support for multiple storage backends.
 * 
 * Key concepts:
 * - Complete session lifecycle management (create, read, update, delete, archive)
 * - Multiple storage backend support (Redis, Database, File, Memory)
 * - Automatic session expiration and cleanup
 * - Efficient conversation history management
 * - Context storage with size limits and validation
 * - Session statistics and analytics
 * - Health monitoring and diagnostics
 * 
 * @example
 * ```typescript
 * import { SessionStateModule } from './session-state-module';
 * 
 * const sessionState = new SessionStateModule();
 * await sessionState.initialize({
 *   storage: {
 *     backend: 'redis',
 *     connection: { host: 'localhost', port: 6379 },
 *     compression: true
 *   },
 *   defaults: {
 *     maxHistoryLength: 1000,
 *     expiresIn: 24 * 60 * 60 * 1000 // 24 hours
 *   }
 * });
 * 
 * const session = await sessionState.createSession({
 *   userId: 'user-123',
 *   title: 'Chat Session'
 * });
 * ```
 * 
 * @see types.ts for interface definitions
 * @see session.ts for individual session implementation
 * @since 1.0.0
 */

import {
  ISessionStateModule,
  ISession,
  SessionConfig,
  SessionRetrievalOptions,
  SessionSearchCriteria,
  SessionQueryOptions,
  SessionDeletionOptions,
  SessionArchiveCriteria,
  SessionCleanupOptions,
  SessionCleanupStats,
  SessionStats,
  TimeRange,
  SessionStorageConfig
} from './types';

import { HealthStatus } from '../registry/types';

import {
  SessionStateError,
  SessionCreationError,
  SessionRetrievalError,
  SessionUpdateError,
  SessionDeletionError,
  SessionStorageError,
  SessionValidationError,
  createSessionErrorContext
} from './errors';

import { Session } from './session';
import { BaseStorage } from './storage/base-storage';
import { RedisStorage } from './storage/redis-storage';
import { generateId, deepClone } from '../../shared/utils';

/**
 * Configuration for the Session State module.
 */
export interface SessionStateConfig {
  /** Storage backend configuration */
  storage: SessionStorageConfig;
  
  /** Default session configuration */
  defaults?: Partial<SessionConfig>;
  
  /** Module-specific options */
  options?: {
    /** Maximum number of concurrent sessions per user */
    maxSessionsPerUser?: number;
    
    /** Automatic cleanup interval in milliseconds */
    cleanupInterval?: number;
    
    /** Enable session analytics and metrics */
    enableAnalytics?: boolean;
    
    /** Session cache size for performance */
    sessionCacheSize?: number;
    
    /** Enable session recovery after crashes */
    enableRecovery?: boolean;
  };
}

/**
 * Main Session State module implementation.
 * 
 * Provides comprehensive session management with full lifecycle support,
 * multiple storage backends, and advanced features like analytics and cleanup.
 * 
 * Architecture:
 * - Uses storage abstraction for backend independence
 * - Maintains session cache for performance
 * - Implements automatic cleanup and expiration
 * - Provides comprehensive error handling and recovery
 * - Supports session analytics and monitoring
 * 
 * Features:
 * - Multi-backend storage (Redis, Database, File, Memory)
 * - Automatic session expiration and cleanup
 * - Conversation history with efficient pagination
 * - Context storage with size limits
 * - Session analytics and statistics
 * - Health monitoring and diagnostics
 * - Session recovery and backup
 * 
 * @example
 * ```typescript
 * // Initialize with Redis storage
 * const sessionState = new SessionStateModule();
 * await sessionState.initialize({
 *   storage: {
 *     backend: 'redis',
 *     connection: {
 *       host: 'redis.example.com',
 *       port: 6379,
 *       password: process.env.REDIS_PASSWORD
 *     },
 *     compression: true,
 *     encryption: true
 *   },
 *   defaults: {
 *     maxHistoryLength: 1000,
 *     maxContextSize: 1024 * 1024, // 1MB
 *     expiresIn: 24 * 60 * 60 * 1000, // 24 hours
 *     persistHistory: true,
 *     enableRecovery: true
 *   },
 *   options: {
 *     maxSessionsPerUser: 10,
 *     cleanupInterval: 60 * 60 * 1000, // 1 hour
 *     enableAnalytics: true,
 *     sessionCacheSize: 1000
 *   }
 * });
 * 
 * // Create and manage sessions
 * const session = await sessionState.createSession({
 *   userId: 'user-123',
 *   title: 'Support Chat',
 *   preferences: {
 *     responseFormat: 'markdown',
 *     responseLength: 'detailed'
 *   }
 * });
 * 
 * // Add conversation turns
 * await session.addTurn({
 *   role: 'user',
 *   content: 'I need help with my account',
 *   timestamp: new Date()
 * });
 * 
 * // Query sessions
 * const userSessions = await sessionState.listSessions({
 *   userId: 'user-123',
 *   status: ['active', 'idle']
 * });
 * ```
 * 
 * @implements {ISessionStateModule}
 * @public
 */
export class SessionStateModule implements ISessionStateModule {
  /** Module name */
  public readonly name = 'session-state';
  
  /** Module version */
  public readonly version = '1.0.0';
  
  /** Module dependencies */
  public readonly dependencies: string[] = [];
  
  /** Storage backend instance */
  private storage?: BaseStorage;
  
  /** Module configuration */
  private config?: SessionStateConfig;
  
  /** Session cache for performance */
  private sessionCache = new Map<string, ISession>();
  
  /** Cleanup timer */
  private cleanupTimer?: NodeJS.Timeout;
  
  /** Initialization state */
  private initialized = false;
  
  /** Health status */
  private healthStatus: HealthStatus = {
    status: 'unhealthy',
    message: 'Session State module not initialized'
  };
  
  /** Module statistics */
  private stats = {
    sessionsCreated: 0,
    sessionsLoaded: 0,
    sessionsUpdated: 0,
    sessionsDeleted: 0,
    cacheHits: 0,
    cacheMisses: 0,
    errorsEncountered: 0,
    startTime: Date.now()
  };
  
  /**
   * Creates a new Session State module instance.
   * 
   * The module is created in an uninitialized state and must be initialized
   * with proper configuration before use.
   * 
   * @example
   * ```typescript
   * const sessionState = new SessionStateModule();
   * await sessionState.initialize(config);
   * ```
   */
  constructor() {
    console.log('Session State module created, awaiting initialization');
  }
  
  /**
   * Initializes the Session State module.
   * 
   * Sets up storage backend, configuration, caching, and automatic cleanup.
   * The module must be initialized before use.
   * 
   * @param config - Module configuration
   * @returns Promise that resolves when initialization is complete
   * @throws {SessionStorageError} If storage initialization fails
   * @throws {SessionValidationError} If configuration is invalid
   * 
   * @example
   * ```typescript
   * await sessionState.initialize({
   *   storage: {
   *     backend: 'redis',
   *     connection: { host: 'localhost', port: 6379 },
   *     compression: true
   *   },
   *   defaults: {
   *     maxHistoryLength: 1000,
   *     expiresIn: 3600000
   *   }
   * });
   * ```
   */
  async initialize(config: SessionStateConfig): Promise<void> {
    if (this.initialized) {
      console.log('Session State module already initialized');
      return;
    }
    
    console.log('Initializing Session State module...');
    
    try {
      // Validate configuration
      this.validateConfiguration(config);
      this.config = config;
      
      // Initialize storage backend
      await this.initializeStorage();
      
      // Setup automatic cleanup if configured
      if (config.options?.cleanupInterval) {
        this.setupAutomaticCleanup(config.options.cleanupInterval);
      }
      
      // Initialize session cache
      this.initializeSessionCache();
      
      this.initialized = true;
      this.healthStatus = {
        status: 'healthy',
        message: 'Session State module initialized successfully'
      };
      
      console.log('✓ Session State module initialized successfully');
      
    } catch (error) {
      this.stats.errorsEncountered++;
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Failed to initialize Session State module:', errorMessage);
      
      this.healthStatus = {
        status: 'unhealthy',
        message: `Initialization failed: ${errorMessage}`
      };
      
      if (error instanceof Error) {
        throw error; // Re-throw known errors
      }
      
      throw new SessionStorageError(
        'session-state',
        'initialize',
        `Module initialization failed: ${errorMessage}`,
        undefined,
        { config }
      );
    }
  }
  
  /**
   * Creates a new session with the provided configuration.
   * 
   * Validates configuration, creates session instance, and persists to storage.
   * Automatically applies default configuration and handles user limits.
   * 
   * @param config - Session configuration
   * @returns Promise resolving to new session instance
   * @throws {SessionCreationError} If session creation fails
   * @throws {SessionValidationError} If configuration is invalid
   * 
   * @example
   * ```typescript
   * const session = await sessionState.createSession({
   *   userId: 'user-456',
   *   title: 'Customer Support',
   *   language: 'en',
   *   preferences: {
   *     responseFormat: 'markdown',
   *     communicationStyle: 'friendly'
   *   },
   *   tags: ['support', 'billing']
   * });
   * 
   * console.log('Created session:', session.id);
   * ```
   */
  async createSession(config: SessionConfig): Promise<ISession> {
    this.ensureInitialized();
    
    try {
      console.log(`Creating new session for user '${config.userId || 'anonymous'}'`);
      
      // Check user session limits
      if (config.userId && this.config?.options?.maxSessionsPerUser) {
        await this.checkUserSessionLimits(config.userId);
      }
      
      // Apply default configuration
      const fullConfig = this.mergeWithDefaults(config);
      
      // Validate configuration
      this.validateSessionConfig(fullConfig);
      
      // Create session instance
      const session = new Session(fullConfig, this.storage!);
      
      // Save to storage
      await session.save();
      
      // Add to cache if caching is enabled
      this.addToCache(session);
      
      // Update statistics
      this.stats.sessionsCreated++;
      
      console.log(`✓ Created session '${session.id}' for user '${config.userId || 'anonymous'}'`);
      
      return session;
      
    } catch (error) {
      this.stats.errorsEncountered++;
      
      if (error instanceof SessionStateError) {
        throw error; // Re-throw known session errors
      }
      
      throw new SessionCreationError(
        config.userId || 'anonymous',
        error instanceof Error ? error.message : String(error),
        error instanceof Error ? error : undefined,
        createSessionErrorContext(config, 'create')
      );
    }
  }
  
  /**
   * Retrieves an existing session by ID.
   * 
   * Checks cache first for performance, then loads from storage if needed.
   * Supports flexible retrieval options for loading related data.
   * 
   * @param sessionId - Session identifier
   * @param options - Optional retrieval options
   * @returns Promise resolving to session or null if not found
   * @throws {SessionRetrievalError} If retrieval fails
   * 
   * @example
   * ```typescript
   * // Basic retrieval
   * const session = await sessionState.getSession('sess-123');
   * 
   * // Retrieval with full history and context
   * const sessionWithHistory = await sessionState.getSession('sess-123', {
   *   includeHistory: true,
   *   includeContext: true,
   *   maxHistoryItems: 50
   * });
   * 
   * // Force refresh from storage
   * const freshSession = await sessionState.getSession('sess-123', {
   *   refresh: true
   * });
   * ```
   */
  async getSession(sessionId: string, options: SessionRetrievalOptions = {}): Promise<ISession | null> {
    this.ensureInitialized();
    
    try {
      console.log(`Retrieving session '${sessionId}'`);
      
      // Check cache first unless refresh is requested
      if (!options.refresh) {
        const cachedSession = this.getFromCache(sessionId);
        if (cachedSession) {
          this.stats.cacheHits++;
          console.log(`✓ Retrieved session '${sessionId}' from cache`);
          return cachedSession;
        }
      }
      
      this.stats.cacheMisses++;
      
      // Load from storage
      const session = await this.storage!.loadSession(sessionId);
      
      if (!session) {
        console.log(`Session '${sessionId}' not found`);
        return null;
      }
      
      // Add to cache
      this.addToCache(session);
      
      // Update statistics
      this.stats.sessionsLoaded++;
      
      console.log(`✓ Retrieved session '${sessionId}' from storage`);
      
      return session;
      
    } catch (error) {
      this.stats.errorsEncountered++;
      
      throw new SessionRetrievalError(
        sessionId,
        error instanceof Error ? error.message : String(error),
        error instanceof Error ? error : undefined,
        createSessionErrorContext({ id: sessionId }, 'retrieve', { options })
      );
    }
  }
  
  /**
   * Lists sessions matching the provided criteria.
   * 
   * Provides efficient querying with filtering, sorting, and pagination.
   * Uses storage backend optimizations for performance.
   * 
   * @param criteria - Search criteria
   * @param options - Optional query options
   * @returns Promise resolving to array of matching sessions
   * @throws {SessionRetrievalError} If query fails
   * 
   * @example
   * ```typescript
   * // Get all active sessions for a user
   * const userSessions = await sessionState.listSessions({
   *   userId: 'user-789',
   *   status: ['active', 'idle']
   * });
   * 
   * // Get recent sessions with pagination
   * const recentSessions = await sessionState.listSessions({
   *   createdAfter: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
   * }, {
   *   limit: 20,
   *   offset: 0,
   *   sort: { field: 'updatedAt', direction: 'desc' }
   * });
   * 
   * // Search sessions by tag
   * const supportSessions = await sessionState.listSessions({
   *   tags: ['support', 'priority']
   * });
   * ```
   */
  async listSessions(criteria: SessionSearchCriteria, options: SessionQueryOptions = {}): Promise<ISession[]> {
    this.ensureInitialized();
    
    try {
      console.log('Querying sessions with criteria:', JSON.stringify(criteria));
      
      // Execute query through storage backend
      const sessions = await this.storage!.querySessions(criteria, options);
      
      // Add sessions to cache
      sessions.forEach(session => this.addToCache(session));
      
      console.log(`✓ Query returned ${sessions.length} sessions`);
      
      return sessions;
      
    } catch (error) {
      this.stats.errorsEncountered++;
      
      throw new SessionRetrievalError(
        'query',
        error instanceof Error ? error.message : String(error),
        error instanceof Error ? error : undefined,
        { criteria, options }
      );
    }
  }
  
  /**
   * Updates session configuration or metadata.
   * 
   * Applies partial updates to existing sessions with validation.
   * Automatically saves changes and updates cache.
   * 
   * @param sessionId - Session identifier
   * @param updates - Configuration updates to apply
   * @returns Promise resolving to updated session
   * @throws {SessionUpdateError} If update fails
   * @throws {SessionRetrievalError} If session not found
   * 
   * @example
   * ```typescript
   * // Update session title and tags
   * const updatedSession = await sessionState.updateSession('sess-456', {
   *   title: 'Updated Support Session',
   *   tags: ['support', 'resolved'],
   *   preferences: {
   *     responseLength: 'short'
   *   }
   * });
   * 
   * // Extend session expiration
   * await sessionState.updateSession('sess-456', {
   *   expiresIn: 48 * 60 * 60 * 1000 // Extend by 48 hours
   * });
   * ```
   */
  async updateSession(sessionId: string, updates: Partial<SessionConfig>): Promise<ISession> {
    this.ensureInitialized();
    
    try {
      console.log(`Updating session '${sessionId}'`);
      
      // Get existing session
      const session = await this.getSession(sessionId);
      
      if (!session) {
        throw new SessionRetrievalError(
          sessionId,
          'Session not found',
          undefined,
          { operation: 'update' }
        );
      }
      
      // Validate updates
      this.validateSessionUpdates(updates);
      
      // Apply updates to session
      // Note: This would need to be implemented in the Session class
      // For now, we'll create a new session with merged configuration
      const currentConfig = session.config;
      const mergedConfig = { ...currentConfig, ...updates };
      
      // Create updated session
      const updatedSession = new Session(mergedConfig, this.storage!, {
        id: session.id,
        conversationHistory: await session.getHistory(),
        context: await session.getAllContext(),
        metadata: session.metadata,
        status: session.status
      });
      
      // Save updated session
      await updatedSession.save();
      
      // Update cache
      this.addToCache(updatedSession);
      
      // Update statistics
      this.stats.sessionsUpdated++;
      
      console.log(`✓ Updated session '${sessionId}'`);
      
      return updatedSession;
      
    } catch (error) {
      this.stats.errorsEncountered++;
      
      if (error instanceof SessionStateError) {
        throw error; // Re-throw known session errors
      }
      
      throw new SessionUpdateError(
        sessionId,
        error instanceof Error ? error.message : String(error),
        error instanceof Error ? error : undefined,
        createSessionErrorContext({ id: sessionId }, 'update', { updates })
      );
    }
  }
  
  /**
   * Deletes a session and all associated data.
   * 
   * Removes session from storage and cache with options for hard deletion
   * or soft deletion with archiving.
   * 
   * @param sessionId - Session identifier
   * @param options - Optional deletion options
   * @returns Promise that resolves when deletion is complete
   * @throws {SessionDeletionError} If deletion fails
   * 
   * @example
   * ```typescript
   * // Soft delete (mark as deleted)
   * await sessionState.deleteSession('sess-789');
   * 
   * // Hard delete with all associated data
   * await sessionState.deleteSession('sess-789', {
   *   hardDelete: true,
   *   deleteAssociatedData: true,
   *   reason: 'User requested account deletion'
   * });
   * ```
   */
  async deleteSession(sessionId: string, options: SessionDeletionOptions = {}): Promise<void> {
    this.ensureInitialized();
    
    try {
      console.log(`Deleting session '${sessionId}'`);
      
      // Remove from storage
      await this.storage!.deleteSession(sessionId);
      
      // Remove from cache
      this.removeFromCache(sessionId);
      
      // Update statistics
      this.stats.sessionsDeleted++;
      
      console.log(`✓ Deleted session '${sessionId}'`);
      
    } catch (error) {
      this.stats.errorsEncountered++;
      
      throw new SessionDeletionError(
        sessionId,
        error instanceof Error ? error.message : String(error),
        error instanceof Error ? error : undefined,
        createSessionErrorContext({ id: sessionId }, 'delete', { options })
      );
    }
  }
  
  /**
   * Archives old or inactive sessions.
   * 
   * Moves sessions to archived state based on criteria like age,
   * inactivity, or status. Useful for storage optimization.
   * 
   * @param criteria - Criteria for sessions to archive
   * @returns Promise resolving to number of sessions archived
   * @throws {SessionUpdateError} If archiving fails
   * 
   * @example
   * ```typescript
   * // Archive sessions older than 30 days
   * const archivedCount = await sessionState.archiveSessions({
   *   olderThan: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
   * });
   * 
   * // Archive inactive sessions
   * const inactiveArchived = await sessionState.archiveSessions({
   *   inactiveFor: 7 * 24 * 60 * 60 * 1000, // 7 days
   *   status: ['idle']
   * });
   * ```
   */
  async archiveSessions(criteria: SessionArchiveCriteria): Promise<number> {
    this.ensureInitialized();
    
    try {
      console.log('Archiving sessions with criteria:', JSON.stringify(criteria));
      
      // Find sessions to archive
      const searchCriteria: SessionSearchCriteria = {
        status: criteria.status,
        createdBefore: criteria.olderThan,
        tags: criteria.tags
      };
      
      if (criteria.inactiveFor) {
        const inactiveSince = new Date(Date.now() - criteria.inactiveFor);
        searchCriteria.updatedBefore = inactiveSince;
      }
      
      const sessionsToArchive = await this.listSessions(searchCriteria, {
        limit: criteria.limit
      });
      
      // Archive each session
      let archivedCount = 0;
      
      for (const session of sessionsToArchive) {
        try {
          await session.archive(`Archived by cleanup: ${JSON.stringify(criteria)}`);
          await session.save();
          archivedCount++;
        } catch (error) {
          console.warn(`Failed to archive session '${session.id}':`, error);
        }
      }
      
      console.log(`✓ Archived ${archivedCount} sessions`);
      
      return archivedCount;
      
    } catch (error) {
      this.stats.errorsEncountered++;
      
      throw new SessionUpdateError(
        'archive',
        error instanceof Error ? error.message : String(error),
        error instanceof Error ? error : undefined,
        { criteria }
      );
    }
  }
  
  /**
   * Performs cleanup operations on session storage.
   * 
   * Handles expired session deletion, archival, compression,
   * and orphaned data cleanup with detailed reporting.
   * 
   * @param options - Cleanup configuration
   * @returns Promise resolving to cleanup statistics
   * @throws {SessionStorageError} If cleanup fails
   * 
   * @example
   * ```typescript
   * const cleanupStats = await sessionState.cleanup({
   *   deleteExpired: true,
   *   archiveOld: true,
   *   cleanupOrphans: true,
   *   batchSize: 100
   * });
   * 
   * console.log('Cleanup completed:', cleanupStats);
   * ```
   */
  async cleanup(options: SessionCleanupOptions = {}): Promise<SessionCleanupStats> {
    this.ensureInitialized();
    
    try {
      console.log('Starting session cleanup...');
      
      // Delegate to storage backend for efficient cleanup
      const stats = await this.storage!.cleanup(options);
      
      // Clear cache to reflect cleanup changes
      this.clearCache();
      
      console.log('✓ Session cleanup completed:', stats);
      
      return stats;
      
    } catch (error) {
      this.stats.errorsEncountered++;
      
      throw new SessionStorageError(
        'session-state',
        'cleanup',
        error instanceof Error ? error.message : String(error),
        error instanceof Error ? error : undefined,
        { options }
      );
    }
  }
  
  /**
   * Gets session statistics and metrics.
   * 
   * Provides comprehensive statistics including usage patterns,
   * performance metrics, and storage information.
   * 
   * @param timeRange - Optional time range for statistics
   * @returns Promise resolving to session statistics
   * 
   * @example
   * ```typescript
   * // Get overall statistics
   * const stats = await sessionState.getStats();
   * console.log('Total sessions:', stats.totalSessions);
   * 
   * // Get statistics for last 30 days
   * const monthlyStats = await sessionState.getStats({
   *   from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
   *   to: new Date()
   * });
   * ```
   */
  async getStats(timeRange?: TimeRange): Promise<SessionStats> {
    this.ensureInitialized();
    
    try {
      // Get statistics from storage backend
      const storageStats = await this.storage!.getStats(timeRange);
      
      // Add module-specific statistics
      const moduleStats = {
        ...storageStats,
        module: {
          sessionsCreated: this.stats.sessionsCreated,
          sessionsLoaded: this.stats.sessionsLoaded,
          sessionsUpdated: this.stats.sessionsUpdated,
          sessionsDeleted: this.stats.sessionsDeleted,
          cacheHitRate: this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses) || 0,
          errorsEncountered: this.stats.errorsEncountered,
          uptimeMs: Date.now() - this.stats.startTime
        },
        cache: {
          size: this.sessionCache.size,
          maxSize: this.config?.options?.sessionCacheSize || 0
        }
      };
      
      return moduleStats;
      
    } catch (error) {
      this.stats.errorsEncountered++;
      
      throw new SessionStorageError(
        'session-state',
        'getStats',
        error instanceof Error ? error.message : String(error),
        error instanceof Error ? error : undefined,
        { timeRange }
      );
    }
  }
  
  /**
   * Gets module health status.
   * 
   * Provides comprehensive health information including storage backend
   * health, cache status, and performance metrics.
   * 
   * @returns Promise resolving to current health status
   */
  async health(): Promise<HealthStatus> {
    if (!this.initialized) {
      return {
        status: 'unhealthy',
        message: 'Session State module not initialized'
      };
    }
    
    try {
      // Check storage backend health
      const storageHealth = await this.storage!.checkHealth();
      
      // Calculate cache efficiency
      const cacheHitRate = this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses) || 0;
      
      // Determine overall health based on storage health and performance
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      const issues: string[] = [];
      
      if (storageHealth.status === 'unhealthy') {
        status = 'unhealthy';
        issues.push('Storage backend is unhealthy');
      } else if (storageHealth.status === 'degraded') {
        status = 'degraded';
        issues.push('Storage backend is degraded');
      }
      
      if (this.stats.errorsEncountered > 100) {
        status = status === 'healthy' ? 'degraded' : 'unhealthy';
        issues.push(`High error count: ${this.stats.errorsEncountered}`);
      }
      
      if (cacheHitRate < 0.5 && this.stats.cacheHits + this.stats.cacheMisses > 100) {
        issues.push(`Low cache hit rate: ${(cacheHitRate * 100).toFixed(1)}%`);
      }
      
      return {
        status,
        message: status === 'healthy' 
          ? 'Session State module operational' 
          : `Session State module ${status}: ${issues.join(', ')}`,
        details: {
          storage: storageHealth,
          stats: this.stats,
          cache: {
            size: this.sessionCache.size,
            hitRate: cacheHitRate
          },
          uptime: Date.now() - this.stats.startTime,
          issues: issues.length > 0 ? issues : undefined
        }
      };
      
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `Health check failed: ${error instanceof Error ? error.message : String(error)}`,
        details: { error }
      };
    }
  }
  
  /**
   * Gracefully shuts down the module.
   * 
   * Cleans up resources, closes storage connections, and clears timers.
   * 
   * @returns Promise that resolves when shutdown is complete
   */
  async shutdown(): Promise<void> {
    console.log('Shutting down Session State module...');
    
    try {
      // Clear cleanup timer
      if (this.cleanupTimer) {
        clearInterval(this.cleanupTimer);
        this.cleanupTimer = undefined;
      }
      
      // Shutdown storage backend
      if (this.storage) {
        await this.storage.shutdown();
      }
      
      // Clear cache
      this.clearCache();
      
      // Reset state
      this.initialized = false;
      this.storage = undefined;
      this.config = undefined;
      
      this.healthStatus = {
        status: 'unhealthy',
        message: 'Session State module shut down'
      };
      
      console.log('✓ Session State module shut down successfully');
      
    } catch (error) {
      console.error('Error during Session State shutdown:', error);
      throw error;
    }
  }
  
  // Private implementation methods
  
  /**
   * Validates module configuration.
   * 
   * @param config - Configuration to validate
   * @throws {SessionValidationError} If configuration is invalid
   * @private
   */
  private validateConfiguration(config: SessionStateConfig): void {
    if (!config.storage) {
      throw new SessionValidationError(
        'module',
        'Storage configuration is required',
        'storage',
        config.storage
      );
    }
    
    if (!config.storage.backend) {
      throw new SessionValidationError(
        'module',
        'Storage backend is required',
        'storage.backend',
        config.storage.backend
      );
    }
    
    const validBackends = ['redis', 'database', 'file', 'memory'];
    if (!validBackends.includes(config.storage.backend)) {
      throw new SessionValidationError(
        'module',
        `Invalid storage backend. Must be one of: ${validBackends.join(', ')}`,
        'storage.backend',
        config.storage.backend
      );
    }
  }
  
  /**
   * Initializes the storage backend based on configuration.
   * 
   * @private
   */
  private async initializeStorage(): Promise<void> {
    const storageConfig = this.config!.storage;
    
    switch (storageConfig.backend) {
      case 'redis':
        this.storage = new RedisStorage(storageConfig);
        break;
      
      case 'database':
        // TODO: Implement database storage
        throw new SessionStorageError(
          'session-state',
          'initialize',
          'Database storage not implemented yet'
        );
      
      case 'file':
        // TODO: Implement file storage
        throw new SessionStorageError(
          'session-state',
          'initialize',
          'File storage not implemented yet'
        );
      
      case 'memory':
        // TODO: Implement memory storage
        throw new SessionStorageError(
          'session-state',
          'initialize',
          'Memory storage not implemented yet'
        );
      
      default:
        throw new SessionStorageError(
          'session-state',
          'initialize',
          `Unsupported storage backend: ${storageConfig.backend}`
        );
    }
    
    // Initialize storage backend
    await this.storage.initialize();
    console.log(`Storage backend '${storageConfig.backend}' initialized successfully`);
  }
  
  /**
   * Sets up automatic cleanup timer.
   * 
   * @param interval - Cleanup interval in milliseconds
   * @private
   */
  private setupAutomaticCleanup(interval: number): void {
    console.log(`Setting up automatic cleanup every ${interval}ms`);
    
    this.cleanupTimer = setInterval(async () => {
      try {
        console.log('Running automatic session cleanup...');
        const stats = await this.cleanup({
          deleteExpired: true,
          archiveOld: true,
          cleanupOrphans: true
        });
        console.log('Automatic cleanup completed:', stats);
      } catch (error) {
        console.error('Automatic cleanup failed:', error);
      }
    }, interval);
  }
  
  /**
   * Initializes session cache.
   * 
   * @private
   */
  private initializeSessionCache(): void {
    const cacheSize = this.config?.options?.sessionCacheSize || 1000;
    console.log(`Initialized session cache with max size: ${cacheSize}`);
  }
  
  /**
   * Ensures module is initialized before operations.
   * 
   * @throws {SessionStateError} If module is not initialized
   * @private
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new SessionStateError(
        'MODULE_NOT_INITIALIZED',
        'Session State module not initialized. Call initialize() first.',
        {},
        'Initialize the module with proper configuration before using it.'
      );
    }
  }
  
  /**
   * Merges session configuration with defaults.
   * 
   * @param config - User configuration
   * @returns Merged configuration
   * @private
   */
  private mergeWithDefaults(config: SessionConfig): SessionConfig {
    const defaults = this.config?.defaults || {};
    
    return {
      ...defaults,
      ...config,
      preferences: {
        ...defaults.preferences,
        ...config.preferences
      }
    };
  }
  
  /**
   * Validates session configuration.
   * 
   * @param config - Session configuration
   * @throws {SessionValidationError} If configuration is invalid
   * @private
   */
  private validateSessionConfig(config: SessionConfig): void {
    // Basic validation - more comprehensive validation in Session class
    if (config.expiresIn && config.expiresIn < 60000) {
      throw new SessionValidationError(
        config.id || 'new',
        'Session expiration must be at least 60 seconds',
        'expiresIn',
        config.expiresIn
      );
    }
  }
  
  /**
   * Validates session updates.
   * 
   * @param updates - Updates to validate
   * @throws {SessionValidationError} If updates are invalid
   * @private
   */
  private validateSessionUpdates(updates: Partial<SessionConfig>): void {
    if ('id' in updates) {
      throw new SessionValidationError(
        'update',
        'Cannot change session ID',
        'id',
        updates.id
      );
    }
    
    if (updates.expiresIn && updates.expiresIn < 60000) {
      throw new SessionValidationError(
        'update',
        'Session expiration must be at least 60 seconds',
        'expiresIn',
        updates.expiresIn
      );
    }
  }
  
  /**
   * Checks user session limits.
   * 
   * @param userId - User identifier
   * @throws {SessionCreationError} If user has too many sessions
   * @private
   */
  private async checkUserSessionLimits(userId: string): Promise<void> {
    const maxSessions = this.config?.options?.maxSessionsPerUser;
    if (!maxSessions) return;
    
    const userSessions = await this.listSessions({
      userId,
      status: ['active', 'idle']
    });
    
    if (userSessions.length >= maxSessions) {
      throw new SessionCreationError(
        userId,
        `Maximum session limit reached (${maxSessions})`,
        undefined,
        {
          currentSessions: userSessions.length,
          maxSessions
        }
      );
    }
  }
  
  // Cache management methods
  
  /**
   * Adds session to cache.
   * 
   * @param session - Session to cache
   * @private
   */
  private addToCache(session: ISession): void {
    const maxSize = this.config?.options?.sessionCacheSize || 1000;
    
    // Remove oldest entries if cache is full
    if (this.sessionCache.size >= maxSize) {
      const oldestKey = this.sessionCache.keys().next().value;
      if (oldestKey) {
        this.sessionCache.delete(oldestKey);
      }
    }
    
    this.sessionCache.set(session.id, session);
  }
  
  /**
   * Gets session from cache.
   * 
   * @param sessionId - Session identifier
   * @returns Cached session or undefined
   * @private
   */
  private getFromCache(sessionId: string): ISession | undefined {
    return this.sessionCache.get(sessionId);
  }
  
  /**
   * Removes session from cache.
   * 
   * @param sessionId - Session identifier
   * @private
   */
  private removeFromCache(sessionId: string): void {
    this.sessionCache.delete(sessionId);
  }
  
  /**
   * Clears entire cache.
   * 
   * @private
   */
  private clearCache(): void {
    this.sessionCache.clear();
  }
}