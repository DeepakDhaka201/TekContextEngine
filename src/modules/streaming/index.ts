/**
 * @fileoverview Streaming Manager Module - Main export file
 * @module modules/streaming
 * @requires ./streaming-manager
 * @requires ./factory
 * @requires ./types
 * @requires ./errors
 * @requires ./sse-client
 * @requires ./sse-streamer
 * 
 * This file serves as the main entry point for the Streaming Manager Module,
 * providing comprehensive exports for all streaming-related functionality
 * including the main manager, factory, types, and error handling.
 * 
 * Key concepts:
 * - Centralized exports for entire Streaming Manager Module
 * - Type definitions for Server-Sent Events streaming
 * - Factory patterns for StreamingManager creation
 * - Error handling classes for streaming operations
 * - Client and streamer implementations for real-time communication
 * 
 * @example
 * ```typescript
 * import { 
 *   StreamingManager, 
 *   streamingManagerFactory,
 *   IStreamingManager,
 *   StreamingManagerConfig 
 * } from '@/modules/streaming';
 * 
 * // Create streaming manager
 * const streamingManager = streamingManagerFactory.create({
 *   maxClients: 500,
 *   enableCompression: true,
 *   rateLimiting: { maxEventsPerSecond: 100, windowSize: 1000 }
 * });
 * 
 * await streamingManager.initialize();
 * ```
 * 
 * @see streaming-manager.ts for main StreamingManager implementation
 * @see factory.ts for factory patterns and environment presets
 * @see types.ts for comprehensive type definitions
 * @since 1.0.0
 */

// Factory exports first for default export
export { 
  StreamingManagerFactory, 
  streamingManagerFactory, 
  StreamingManagerPresets 
} from './factory';

// Core StreamingManager exports
export { StreamingManager } from './streaming-manager';

// SSE Client and Streamer implementations
export { SSEClient } from './sse-client';
export { ServerSentEventStreamer } from './sse-streamer';

// Comprehensive type definitions
export type {
  IStreamingManager,
  IStreamer,
  StreamEvent,
  StreamEventData,
  HumanPromptOptions,
  WorkflowProgress,
  UsedTool,
  StreamingManagerConfig,
  SSEClientInfo,
  StreamingStatistics
} from './types';

// Error handling system
export {
  StreamingError,
  ConnectionError,
  ClientLimitError,
  EventStreamingError,
  RateLimitError,
  SessionNotFoundError,
  EventSerializationError,
  ConnectionTimeoutError,
  HeartbeatError,
  StreamInitializationError,
  StreamingAuthenticationError,
  CORSError,
  BufferOverflowError,
  isStreamingError,
  createStreamingErrorContext,
  getStreamingErrorSeverity,
  mapStreamingErrorToHttpStatus,
  sanitizeErrorForClient,
  ERROR_RECOVERY_SUGGESTIONS
} from './errors';

export type {
  StreamingErrorSeverity
} from './errors';

/**
 * Module information for registry and version management.
 * 
 * @public
 */
export const STREAMING_MODULE_INFO = {
  name: 'StreamingManager',
  version: '1.0.0',
  description: 'Real-time Server-Sent Events streaming for AgentHub',
  author: 'AgentHub Team',
  dependencies: {
    express: '^4.18.0',
    events: 'builtin'
  },
  capabilities: [
    'real-time-streaming',
    'sse-protocol',
    'multi-client-management',
    'workflow-streaming',
    'tool-execution-streaming',
    'human-interaction-events',
    'flowise-compatibility',
    'rate-limiting',
    'compression-support',
    'metrics-collection'
  ]
} as const;

// Import the factory for default export
import { streamingManagerFactory } from './factory';

/**
 * Default export for convenient module usage.
 * 
 * Provides the factory for creating StreamingManager instances.
 */
export default streamingManagerFactory;